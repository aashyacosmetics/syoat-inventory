import test from "node:test";
import assert from "node:assert/strict";
import { functionBody, readProjectFile } from "../scripts/source-analysis.mjs";
import { createAppsScriptHarness } from "./helpers/apps-script-harness.mjs";

test("post-login inventory load reuses Product and Stock results for alerts", () => {
  const app = readProjectFile("syoat-app.js");
  const appBody = app.slice(app.indexOf("function App()"));
  const loginStart = appBody.indexOf("onLogin: u =>");
  const loginEnd = appBody.indexOf("\n    }\n  });", loginStart);
  const loginHandler = appBody.slice(loginStart, loginEnd);

  assert.ok(loginStart >= 0 && loginEnd > loginStart, "login handler not found");
  assert.doesNotMatch(loginHandler, /api\("getProducts"\)|api\("getStock"\)/);
  assert.match(appBody, /const lowStockAlerts = buildLowStockAlerts\(p, s\)/);
  assert.match(appBody, /api\("getInventoryBootstrap"/);
});

test("login defers secondary modules until their UI is opened", () => {
  const frontend = readProjectFile("syoat-app.js");
  const appBody = frontend.slice(frontend.indexOf("function App()"));
  const loginEffect = appBody.match(/React\.useEffect\(\(\) => \{\s*if \(!user\) return;\s*load\(\);\s*\}, \[user\]\);/);

  assert.ok(loginEffect, "primary login effect should only load the inventory bootstrap");
  assert.match(appBody, /tab !== "counts"[\s\S]{0,100}loadCounts\(\)/);
  assert.match(appBody, /!showPurchasingModal[\s\S]{0,140}loadPurchaseOrders\(\)[\s\S]{0,80}loadSuppliers\(\)/);
  assert.match(appBody, /!showSupportModal[\s\S]{0,140}loadTickets\(\)[\s\S]{0,80}loadReturnMovements\(\)/);
  assert.match(appBody, /if \(loading\) return;[\s\S]{0,160}api\("getSystemHealth"/);
});

test("inventory bootstrap preserves the canonical product, stock and movement results", () => {
  const sheets = {
    Products: [
      ["ProductID", "ProductName", "Status"],
      ["P-1", "Active product", "Active"],
      ["P-2", "Inactive product", "Inactive"],
    ],
    Movement_Headers: [
      ["MovementID", "MovementType", "SourceLocationID", "DestinationLocationID", "Status", "EnteredByEmail"],
      ["MOV-001", "Opening Balance", "", "MAIN_WH", "Approved", "founder@example.invalid"],
      ["MOV-002", "Transfer", "MAIN_WH", "AMAZON_FBA", "Draft", "founder@example.invalid"],
    ],
    Movement_Lines: [
      ["MovementID", "ProductID", "Quantity"],
      ["MOV-001", "P-1", 10],
      ["MOV-002", "P-1", 3],
    ],
  };
  const harness = createAppsScriptHarness(sheets);
  const staff = { Email: "founder@example.invalid", Role: "Founder" };
  const bootstrap = JSON.parse(JSON.stringify(harness.call("getInventoryBootstrap", { limit: "50" }, staff)));

  assert.deepEqual(bootstrap.products, JSON.parse(JSON.stringify(harness.call("getProducts", {}))));
  assert.deepEqual(bootstrap.stock, JSON.parse(JSON.stringify(harness.call("getStock", {}))));
  assert.deepEqual(bootstrap.movements, JSON.parse(JSON.stringify(harness.call("getMovements", { includeLines: "true", limit: "50" }, staff))));
});

test("one request reuses Sheet object reads and invalidates rows after a write", () => {
  const harness = createAppsScriptHarness({
    Movement_Headers: [
      ["MovementID", "Status"],
      ["MOV-001", "Draft"],
    ],
  });
  const sheet = harness.spreadsheet.getSheetByName("Movement_Headers");

  const result = JSON.parse(JSON.stringify(harness.evaluate(`withRequestSheetReadCache(function () {
    var first = sheetToObjects("Movement_Headers");
    var second = sheetToObjects("Movement_Headers");
    appendRow("Movement_Headers", { MovementID: "MOV-002", Status: "Draft" });
    var afterWrite = sheetToObjects("Movement_Headers");
    return { first: first.length, second: second.length, afterWrite: afterWrite.length };
  })`)));

  assert.deepEqual(result, { first: 1, second: 1, afterWrite: 2 });
  assert.equal(sheet.dataRangeReads, 2, "duplicate pre-write read should be served from the request cache");
  assert.equal(harness.evaluate("REQUEST_SHEET_READ_CACHE"), null, "request cache must be discarded after completion");
});

test("safe staff picker reuses a short server cache without exposing authentication fields", () => {
  const sheets = {
    Staff: [
      ["StaffID", "Name", "Email", "Role", "Status"],
      ["STF001", "Founder", "founder@example.invalid", "Founder", "Active"],
    ],
    App_Logins: [
      ["Name", "Email", "Role", "Status", "PINHash", "PINSalt"],
      ["Founder", "founder@example.invalid", "Founder", "Active", "private-hash", "private-salt"],
    ],
  };
  const harness = createAppsScriptHarness(sheets);

  const first = harness.callJson("doGet", { parameter: { action: "getAppLogins" } });
  const second = harness.callJson("doGet", { parameter: { action: "getAppLogins" } });

  assert.deepEqual(second.data, first.data);
  assert.equal(harness.spreadsheet.getSheetByName("Staff").dataRangeReads, 1);
  assert.equal(harness.spreadsheet.getSheetByName("App_Logins").dataRangeReads, 1);
  assert.deepEqual(Object.keys(second.data[0]).sort(), ["email", "name", "role"]);
  assert.doesNotMatch(JSON.stringify(second), /PINHash|PINSalt|private-hash|private-salt/);
});

test("login still checks live Staff and App Login rows after the safe picker cache is warm", () => {
  const pin = "2468";
  const salt = "test-salt";
  const harness = createAppsScriptHarness({
    Staff: [
      ["StaffID", "Name", "Email", "Role", "Status"],
      ["STF001", "Founder", "founder@example.invalid", "Founder", "Active"],
    ],
    App_Logins: [
      ["Name", "Email", "Role", "Status", "PINHash", "PINSalt"],
      ["Founder", "founder@example.invalid", "Founder", "Active", "", salt],
    ],
    Login_Log: [["LoginID", "Timestamp", "Email", "Success", "Reason", "UserAgent"]],
  });
  const hash = harness.call("pinHash", pin, salt);
  harness.spreadsheet.getSheetByName("App_Logins").getRange(2, 5).setValue(hash);
  harness.callJson("doGet", { parameter: { action: "getAppLogins" } });
  harness.spreadsheet.getSheetByName("Staff").getRange(2, 5).setValue("Inactive");

  const response = harness.callJson("doPost", {
    postData: { contents: JSON.stringify({
      action: "login",
      email: "founder@example.invalid",
      pin,
      userAgent: "local-test",
    }) },
  });

  assert.equal(response.data.ok, false);
  assert.match(response.data.reason, /Invalid PIN or inactive account/);
  assert.equal(harness.spreadsheet.getSheetByName("Staff").dataRangeReads, 2);
  assert.equal(harness.spreadsheet.getSheetByName("App_Logins").dataRangeReads, 2);
});

test("session cleanup uses its session-key index after the first login", () => {
  const pin = "2468";
  const salt = "test-salt";
  const harness = createAppsScriptHarness({
    Staff: [
      ["StaffID", "Name", "Email", "Role", "Status"],
      ["STF001", "Founder", "founder@example.invalid", "Founder", "Active"],
    ],
    App_Logins: [
      ["Name", "Email", "Role", "Status", "PINHash", "PINSalt"],
      ["Founder", "founder@example.invalid", "Founder", "Active", "", salt],
    ],
    Login_Log: [["LoginID", "Timestamp", "Email", "Success", "Reason", "UserAgent"]],
  });
  const hash = harness.call("pinHash", pin, salt);
  harness.spreadsheet.getSheetByName("App_Logins").getRange(2, 5).setValue(hash);
  const loginBody = {
    postData: { contents: JSON.stringify({
      action: "login",
      email: "founder@example.invalid",
      pin,
      userAgent: "local-test",
    }) },
  };

  assert.equal(harness.callJson("doPost", loginBody).data.ok, true);
  assert.equal(harness.propertyStats.getPropertiesCalls, 1);
  assert.equal(harness.callJson("doPost", loginBody).data.ok, true);
  assert.equal(harness.propertyStats.getPropertiesCalls, 1, "later logins should not scan unrelated Script Properties");
  assert.ok(harness.properties.has("SYOAT_AUTH_SESSION_INDEX"));
});

test("movement entry shows availability for the actual source location only", () => {
  const frontend = readProjectFile("syoat-app.js");
  const modalStart = frontend.indexOf("function MovModal(");
  const modalEnd = frontend.indexOf("function MovListModal", modalStart);
  const modal = frontend.slice(modalStart, modalEnd);

  assert.ok(modalStart >= 0 && modalEnd > modalStart, "movement modal not found");
  assert.match(modal, /const sourceTracksStock = STOCK_LOCATIONS\.includes\(sd\.src\) && sd\.src !== sd\.dst/);
  assert.match(modal, /s\.ProductID === line\.pid && s\.LocationID === sd\.src/);
  assert.doesNotMatch(modal, /s\.ProductID === line\.pid && STOCK_LOCATIONS\.includes\(s\.LocationID\)/);
  assert.match(modal, /"Available"/);
  assert.match(modal, /exceeds available at ", sourceLabel/);
});

test("performance requirements retain PIN controls and prohibit credential telemetry", () => {
  const plan = readProjectFile("docs/PHASE_2_PLAN.md");
  const decisions = readProjectFile("docs/DECISIONS.md");
  const backend = readProjectFile("Code.gs");
  const frontend = readProjectFile("syoat-app.js");

  assert.match(plan, /PIN login and server PIN reconfirmation before writes remain mandatory/);
  assert.match(plan, /must never record a PIN, PIN hash\/salt, session token/);
  assert.match(decisions, /D-016 — Performance improvements preserve PIN controls/);
  assert.match(frontend, /await requestPinConfirm/);
  assert.match(frontend, /apiConfirmPin/);
  assert.match(backend, /confirmPin/);
});

test("FBA variance UI uses dedicated review and newest report batch analytics", () => {
  const frontend = readProjectFile("syoat-app.js");

  assert.match(frontend, /function FbaVarianceReviewModal/);
  assert.match(frontend, /hasCapability\(user, "amazon\.reconciliation\.review"\)/);
  assert.match(frontend, /user\.canApprove && !isFbaVariance/);
  assert.match(frontend, /var batch = fbaVarianceBatch\(c\)/);
  assert.match(frontend, /var latestBatch = null/);
  assert.match(frontend, /Latest report variance/);
  assert.match(frontend, /sale_timing/);
  assert.match(frontend, /removal/);
});

test("API responses expose safe server duration metadata", () => {
  const harness = createAppsScriptHarness({});
  const response = harness.callJson("doGet", { parameter: { action: "ping" } });

  assert.equal(response.success, true);
  assert.equal(response.data.version, "3.2-phase2-access-policy.1");
  assert.equal(Number.isFinite(response.serverDurationMs), true);
  assert.ok(response.serverDurationMs >= 0);
  assert.equal(Object.hasOwn(response, "pin"), false);
  assert.equal(Object.hasOwn(response, "sessionToken"), false);
});

test("client timing records only action, duration and outcome aggregates", () => {
  const frontend = readProjectFile("syoat-app.js");
  const recorder = functionBody(frontend, "recordClientPerformance");
  const summary = functionBody(frontend, "getClientPerformanceSummary");
  const slowest = functionBody(frontend, "slowestPerformanceActions");

  assert.match(recorder, /safeAction/);
  assert.match(recorder, /successCount/);
  assert.match(summary, /averageMs/);
  assert.match(slowest, /\.slice\(0, 3\)/);
  assert.doesNotMatch(recorder + summary + slowest, /PIN|sessionToken|email|requestId|payload|body|fileUrl/i);
  assert.doesNotMatch(frontend, /recordClientPerformance\([^\n]*(?:pin|sessionToken|email|payload|body)/i);
});

test("performance summary remains behind Founder system-health capability", () => {
  const frontend = readProjectFile("syoat-app.js");
  const appBody = frontend.slice(frontend.indexOf("function App()"));

  assert.match(appBody, /hasCapability\(user, "system\.health\.view"\)/);
  assert.match(appBody, /api\("getSystemHealth"/);
  assert.match(appBody, /performance: getClientPerformanceSummary\(\)/);
  assert.match(appBody, /Timing contains no PIN or session data/);
  assert.match(appBody, /Slowest:/);
});

test("staging notifications fail closed and use explicit test recipients", () => {
  const harness = createAppsScriptHarness({
    App_Logins: [
      ["Name", "Email", "Role", "PIN", "Status", "PINHash", "PINSalt"],
      ["Founder", "founder@example.invalid", "Founder", "", "Active", "hash", "salt"]
    ]
  });

  assert.equal(harness.call("operationalEnvironment"), "development");
  assert.deepEqual(JSON.parse(JSON.stringify(harness.call("operationalNotificationRecipients"))), []);
  harness.properties.set("SYOAT_ENVIRONMENT", "staging");
  harness.properties.set("SYOAT_NOTIFICATION_RECIPIENTS", "tester@example.invalid; tester@example.invalid");
  assert.deepEqual(JSON.parse(JSON.stringify(harness.call("operationalNotificationRecipients"))), ["tester@example.invalid"]);
  assert.equal(harness.call("operationalNotificationSubject", "Syoat alert"), "[STAGING] Syoat alert");
});
