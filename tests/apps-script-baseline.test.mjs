import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readProjectFile } from "../scripts/source-analysis.mjs";
import { createAppsScriptHarness, objectsToRows } from "./helpers/apps-script-harness.mjs";

const fixture = JSON.parse(readProjectFile("tests/fixtures/erp-fixture.json"));

function fixtureSheets() {
  const headers = fixture.movements.map(movement => movement.header);
  const lines = fixture.movements.flatMap(movement => movement.lines);
  return {
    Products: objectsToRows(fixture.products),
    Locations: objectsToRows(fixture.locations),
    Staff: objectsToRows(fixture.staff),
    App_Logins: objectsToRows(fixture.staff),
    Movement_Headers: objectsToRows(headers, [
      "MovementID", "MovementDateTime", "MovementType", "SourceLocationID",
      "DestinationLocationID", "ReferenceType", "ReferenceNumber",
      "AmazonShipmentID", "AmazonDestinationFC", "CarrierTrackingNumber",
      "DocumentFile", "Status", "EnteredByEmail", "ApprovedByEmail",
      "ApprovedAt", "ReversalOfMovementID", "PurchaseOrderID", "Notes",
    ]),
    Movement_Lines: objectsToRows(lines),
    FBA_Shipments: objectsToRows(fixture.fbaShipments.map(({ lines: ignored, ...shipment }) => shipment)),
    FBA_Shipment_Lines: objectsToRows(fixture.fbaShipments.flatMap(shipment =>
      shipment.lines.map(line => ({ ...line, ShipmentID: shipment.ShipmentID }))
    )),
  };
}

const TEST_PIN = [2, 4, 6, 8].join("");
const TEST_SALT = "synthetic-test-salt";

function testPinHash(pin = TEST_PIN, salt = TEST_SALT) {
  return crypto.createHash("sha256").update(salt + ":" + pin, "utf8").digest("base64url");
}

function authenticatedSheets() {
  const sheets = fixtureSheets();
  sheets.App_Logins = objectsToRows(fixture.staff.map(staff => ({
    ...staff,
    PINHash: testPinHash(),
    PINSalt: TEST_SALT,
  })));
  return sheets;
}

function writeReadySheets() {
  const sheets = authenticatedSheets();
  sheets.Feature_Settings = objectsToRows([], ["FeatureKey", "Enabled", "AllowedRoles"]);
  return sheets;
}

function post(harness, body) {
  return harness.callJson("doPost", { postData: { contents: JSON.stringify(body) } });
}

function login(harness, pin = TEST_PIN) {
  return post(harness, {
    action: "login",
    email: "founder@example.invalid",
    pin,
    userAgent: "local-test",
  });
}

test("local Apps Script harness executes the health route", () => {
  const harness = createAppsScriptHarness(fixtureSheets());
  const response = harness.callJson("doGet", { parameter: { action: "ping" } });
  assert.equal(response.success, true);
  assert.equal(response.data.service, "Syoat ERP");
  assert.equal(response.data.status, "ok");
  assert.equal(response.data.version, "3.2-phase2-access-policy.1");
});

test("public staff picker exposes only name, email, and role", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const response = harness.callJson("doGet", { parameter: { action: "getAppLogins" } });
  assert.equal(response.success, true);
  assert.ok(response.data.length > 0);
  for (const staff of response.data) {
    assert.deepEqual(Object.keys(staff).sort(), ["email", "name", "role"]);
  }
});

test("public staff picker returns only the active Staff and App_Logins intersection", () => {
  const founder = { StaffID: "STF001", Email: "founder@example.invalid", FullName: "Authoritative Founder", Role: "Founder", Status: "Active" };
  const missingLogin = { StaffID: "STF002", Email: "missing-login@example.invalid", FullName: "Missing Login", Role: "Accounts", Status: "Active" };
  const archived = { StaffID: "STF003", Email: "archived@example.invalid", FullName: "Archived Staff", Role: "Operations Manager", Status: "Archived" };
  const roleMismatch = { StaffID: "STF004", Email: "role-mismatch@example.invalid", FullName: "Staff Role Wins", Role: "Warehouse Manager", Status: "Active" };
  const sheets = authenticatedSheets();
  sheets.Staff = objectsToRows([founder, missingLogin, archived, roleMismatch]);
  sheets.App_Logins = objectsToRows([
    { ...founder, Name: "Old Login Name", Role: "Warehouse", PINHash: testPinHash(), PINSalt: TEST_SALT },
    { ...archived, PINHash: testPinHash(), PINSalt: TEST_SALT },
    { Email: "login-only@example.invalid", Name: "Login Only", Role: "Warehouse", Status: "Active", PINHash: testPinHash(), PINSalt: TEST_SALT },
    { ...roleMismatch, Role: "Warehouse Operator", PINHash: testPinHash(), PINSalt: TEST_SALT },
  ]);
  const harness = createAppsScriptHarness(sheets);
  const picker = harness.callJson("doGet", { parameter: { action: "getAppLogins" } });

  assert.deepEqual(JSON.parse(JSON.stringify(picker.data)), [
    { name: "Authoritative Founder", email: founder.Email, role: "Founder" },
    { name: "Staff Role Wins", email: roleMismatch.Email, role: "Warehouse Manager" },
  ]);
});

test("Founder health reports safe Staff and App_Logins mismatches", () => {
  const sheets = authenticatedSheets();
  sheets.Staff = objectsToRows([
    ...fixture.staff,
    { StaffID: "STF-MISSING", Email: "missing-login@example.invalid", FullName: "Missing Login", Role: "Accounts", Status: "Active" },
    { StaffID: "STF-DENIED", Email: "denied-login@example.invalid", FullName: "Intentional No Access", Role: "Accounts", Status: "Active" },
    { StaffID: "STF-ARCHIVED", Email: "archived@example.invalid", FullName: "Archived Staff", Role: "Operations Manager", Status: "Archived" },
  ]);
  sheets.App_Logins = objectsToRows([
    ...fixture.staff.map(staff => ({ ...staff, PINHash: testPinHash(), PINSalt: TEST_SALT })),
    { Email: "denied-login@example.invalid", Name: "Intentional No Access", Role: "Accounts", Status: "Inactive", PINHash: "", PINSalt: "" },
    { Email: "archived@example.invalid", Name: "Archived Staff", Role: "Operations Manager", Status: "Active", PINHash: testPinHash(), PINSalt: TEST_SALT },
    { Email: "login-only@example.invalid", Name: "Login Only", Role: "Warehouse", Status: "Active", PINHash: testPinHash(), PINSalt: TEST_SALT },
  ]);
  const harness = createAppsScriptHarness(sheets);
  const signedIn = login(harness).data;
  const health = post(harness, { action: "getSystemHealth", sessionToken: signedIn.sessionToken });

  assert.equal(health.success, true);
  assert.equal(health.data.status, "attention");
  assert.deepEqual(
    health.data.staffAccessMismatches.map(item => item.issue).sort(),
    ["LOGIN_MISSING_OR_INACTIVE", "STAFF_INACTIVE", "STAFF_MISSING"]
  );
  assert.equal(
    health.data.staffAccessMismatches.find(item => item.staffId === "STF-MISSING").name,
    "Missing Login"
  );
  assert.equal(health.data.staffAccessMismatches.some(item => item.staffId === "STF-DENIED"), false);
  assert.equal(health.data.staffAccessMismatches.some(item => Object.hasOwn(item, "email")), false);
});

test("Opening Balance is Founder-only in issued capabilities and write enforcement", () => {
  const coFounder = { Email: "cofounder@example.invalid", Name: "Test Co-Founder", Role: "Co-Founder", Status: "Active" };
  const sheets = writeReadySheets();
  sheets.Staff = objectsToRows([coFounder]);
  sheets.App_Logins = objectsToRows([{ ...coFounder, PINHash: testPinHash(), PINSalt: TEST_SALT }]);
  const harness = createAppsScriptHarness(sheets);
  const signedIn = post(harness, { action: "login", email: coFounder.Email, pin: TEST_PIN, userAgent: "local-test" }).data;

  assert.equal(signedIn.ok, true);
  assert.equal(signedIn.user.capabilities.includes("inventory.openingBalance.create"), false);
  const denied = post(harness, {
    action: "createMovement",
    sessionToken: signedIn.sessionToken,
    requestId: "req-opening-cofounder-0001",
    movementType: "Opening Balance – WH",
    sourceLocationID: "SUPPLIER",
    destinationLocationID: "MAIN_WH",
    lines: [{ productID: "TEST-P001", quantity: 1 }],
  });
  assert.equal(denied.success, false);
  assert.match(denied.error, /Opening Balance can only be entered by the Founder/);
});

test("retired Owner role is excluded from the picker and cannot log in", () => {
  const retired = {
    Email: "retired-role@example.invalid",
    Name: "Retired Role Test",
    Role: "Owner",
    Status: "Active",
  };
  const sheets = fixtureSheets();
  sheets.Staff = objectsToRows([retired]);
  sheets.App_Logins = objectsToRows([{
    ...retired,
    PINHash: testPinHash(),
    PINSalt: TEST_SALT,
  }]);
  const harness = createAppsScriptHarness(sheets);

  const picker = harness.callJson("doGet", { parameter: { action: "getAppLogins" } });
  assert.deepEqual(picker.data, []);

  const signedIn = post(harness, {
    action: "login",
    email: retired.Email,
    pin: TEST_PIN,
    userAgent: "local-test",
  });
  assert.equal(signedIn.data.ok, false);
  assert.equal(signedIn.data.reason, "Invalid PIN or inactive account");
});

test("business products are not readable through public GET", () => {
  const harness = createAppsScriptHarness(fixtureSheets());
  const response = harness.callJson("doGet", { parameter: { action: "getProducts" } });
  assert.equal(response.success, false);
  assert.match(response.error, /GET is allowed only/);
});

test("authenticated product read and stock calculation work through POST", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const signedIn = login(harness).data;
  const products = post(harness, { action: "getProducts", sessionToken: signedIn.sessionToken });
  assert.equal(products.success, true);
  assert.deepEqual(products.data.map(product => product.ProductID), ["TEST-P001", "TEST-C001"]);

  const response = post(harness, { action: "getStock", sessionToken: signedIn.sessionToken });
  assert.equal(response.success, true);
  const warehouse = response.data.find(row => row.ProductID === "TEST-P001" && row.LocationID === "MAIN_WH");
  assert.equal(warehouse.Quantity, 20);
});

test("movement visibility scope is enforced by the backend capability", () => {
  const sheets = authenticatedSheets();
  const headers = sheets.Movement_Headers;
  headers.push([
    "MOV-TEST-002", "Stock In", "SUPPLIER", "MAIN_WH", "Approved",
    "founder@example.invalid", "founder@example.invalid",
  ]);
  const harness = createAppsScriptHarness(sheets);
  const signedIn = post(harness, {
    action: "login",
    email: "warehouse@example.invalid",
    pin: TEST_PIN,
    userAgent: "local-test",
  }).data;
  const movements = post(harness, {
    action: "getMovements",
    sessionToken: signedIn.sessionToken,
    includeLines: "false",
  });
  assert.equal(movements.success, true);
  assert.deepEqual(movements.data.map(row => row.MovementID), ["MOV-TEST-001"]);
});

test("write routing rejects a request without an authorized staff identity", () => {
  const harness = createAppsScriptHarness(fixtureSheets());
  const response = harness.callJson("doPost", {
    postData: { contents: JSON.stringify({ action: "createMovement", email: "", lines: [] }) },
  });
  assert.equal(response.success, false);
  assert.match(response.error, /Unauthorised/);
});

test("GET cannot reach a state-changing action", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const response = harness.callJson("doGet", {
    parameter: { action: "createMovement", payload: "{}" },
  });
  assert.equal(response.success, false);
  assert.match(response.error, /GET is allowed only/);
});

test("hashed PIN login issues a memory-safe opaque session usable by verifySession", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const signedIn = login(harness);
  assert.equal(signedIn.success, true);
  assert.equal(signedIn.data.ok, true);
  assert.ok(signedIn.data.sessionToken.length >= 32);
  assert.equal(signedIn.data.user.email, "founder@example.invalid");

  const verified = post(harness, { action: "verifySession", sessionToken: signedIn.data.sessionToken });
  assert.equal(verified.success, true);
  assert.equal(verified.data.ok, true);
  assert.equal(verified.data.user.role, "Founder");

  const stored = [...harness.properties.values()].join("\n");
  assert.doesNotMatch(stored, new RegExp(signedIn.data.sessionToken));
  assert.doesNotMatch(stored, new RegExp(TEST_PIN));
});

test("five failed PIN attempts lock login temporarily", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  let response;
  for (let attempt = 1; attempt <= 5; attempt += 1) response = login(harness, [0, 0, 0, 0].join(""));
  assert.equal(response.data.ok, false);
  assert.equal(response.data.reason, "Temporarily locked");
  assert.ok(response.data.lockedUntil);

  const correctWhileLocked = login(harness);
  assert.equal(correctWhileLocked.data.ok, false);
  assert.equal(correctWhileLocked.data.reason, "Temporarily locked");
});

test("PIN confirmation uses the active session without replacing its token", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const signedIn = login(harness).data;
  const confirmed = post(harness, {
    action: "confirmPin",
    sessionToken: signedIn.sessionToken,
    pin: TEST_PIN,
  });
  assert.equal(confirmed.success, true);
  assert.equal(confirmed.data.ok, true);
  assert.equal(confirmed.data.sessionToken, undefined);
});

test("logout revokes the server session", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const signedIn = login(harness).data;
  assert.equal(post(harness, { action: "logout", sessionToken: signedIn.sessionToken }).data.ok, true);
  const afterLogout = post(harness, { action: "verifySession", sessionToken: signedIn.sessionToken });
  assert.equal(afterLogout.success, false);
  assert.match(afterLogout.error, /session invalid or expired/);
});

test("expired and deactivated sessions fail closed", () => {
  const expiredHarness = createAppsScriptHarness(authenticatedSheets());
  const expiredLogin = login(expiredHarness).data;
  const sessionEntry = [...expiredHarness.properties.entries()].find(([key]) => key.startsWith("SYOAT_SESSION_"));
  const expiredRecord = JSON.parse(sessionEntry[1]);
  expiredRecord.expiresAt = 0;
  expiredHarness.properties.set(sessionEntry[0], JSON.stringify(expiredRecord));
  const expired = post(expiredHarness, { action: "verifySession", sessionToken: expiredLogin.sessionToken });
  assert.equal(expired.success, false);
  assert.match(expired.error, /session invalid or expired/);

  const inactiveHarness = createAppsScriptHarness(authenticatedSheets());
  const inactiveLogin = login(inactiveHarness).data;
  const staffSheet = inactiveHarness.spreadsheet.getSheetByName("Staff");
  const values = staffSheet.getDataRange().getValues();
  const statusColumn = values[0].indexOf("Status") + 1;
  staffSheet.getRange(2, statusColumn).setValue("Inactive");
  const inactive = post(inactiveHarness, { action: "verifySession", sessionToken: inactiveLogin.sessionToken });
  assert.equal(inactive.success, false);
  assert.match(inactive.error, /session invalid or expired/);
});

test("new login removes expired session records", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  login(harness);
  const oldEntry = [...harness.properties.entries()].find(([key]) => key.startsWith("SYOAT_SESSION_"));
  const oldRecord = JSON.parse(oldEntry[1]);
  oldRecord.expiresAt = 0;
  harness.properties.set(oldEntry[0], JSON.stringify(oldRecord));

  const secondLogin = login(harness);
  assert.equal(secondLogin.data.ok, true);
  const sessionKeys = [...harness.properties.keys()].filter(key => key.startsWith("SYOAT_SESSION_"));
  assert.equal(sessionKeys.length, 1);
  assert.notEqual(sessionKeys[0], oldEntry[0]);
});

test("central capability policy denies staff data to Warehouse role", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const warehouseLogin = post(harness, {
    action: "login",
    email: "warehouse@example.invalid",
    pin: TEST_PIN,
  }).data;
  assert.equal(warehouseLogin.ok, true);

  const denied = post(harness, {
    action: "getStaff",
    sessionToken: warehouseLogin.sessionToken,
  });
  assert.equal(denied.success, false);
  assert.equal(denied.error, "Forbidden: action not permitted.");

  const allowed = post(harness, {
    action: "getStock",
    sessionToken: warehouseLogin.sessionToken,
  });
  assert.equal(allowed.success, true);
});

test("protected operational files fail closed before Drive access when movement scope is denied", () => {
  const sheets = authenticatedSheets();
  const fileId = "TEST_PRIVATE_FILE_123456789";
  const headers = fixture.movements.map(movement => ({ ...movement.header, DocumentFile: JSON.stringify([{ fileId, name: "private.jpg", mimeType: "image/jpeg" }]) }));
  sheets.Movement_Headers = objectsToRows(headers);
  const otherHeaders = [{ ...headers[0], EnteredByEmail: "founder@example.invalid" }];
  sheets.Movement_Headers = objectsToRows(otherHeaders);
  const deniedHarness = createAppsScriptHarness(sheets);
  const warehouse = post(deniedHarness, { action: "login", email: "warehouse@example.invalid", pin: TEST_PIN, userAgent: "local-test" }).data;
  const denied = post(deniedHarness, {
    action: "getOperationalFile",
    sessionToken: warehouse.sessionToken,
    requestId: "req-file-denied-0002",
    movementID: "MOV-TEST-001",
    fileId,
  });
  assert.equal(denied.success, false);
  assert.match(denied.error, /^Forbidden/);
});

test("unexpected backend errors return safe references and appear in Founder health", () => {
  const sheets = authenticatedSheets();
  const fileId = "TEST_PRIVATE_FILE_987654321";
  sheets.Movement_Headers = objectsToRows(fixture.movements.map(movement => ({
    ...movement.header,
    DocumentFile: JSON.stringify([{ fileId, name: "private.jpg", mimeType: "image/jpeg" }]),
  })));
  const harness = createAppsScriptHarness(sheets);
  const signedIn = login(harness).data;
  const failed = post(harness, {
    action: "getOperationalFile",
    sessionToken: signedIn.sessionToken,
    requestId: "req-file-error-0001",
    movementID: "MOV-TEST-001",
    fileId,
  });
  assert.equal(failed.success, false);
  assert.equal(failed.requestId, "req-file-error-0001");
  assert.ok(failed.errorId.startsWith("ERR-"));
  assert.equal(failed.error, "The request could not be completed safely.");
  assert.doesNotMatch(JSON.stringify(failed), /DriveApp|Code\.gs|stack/i);

  const health = post(harness, { action: "getSystemHealth", sessionToken: signedIn.sessionToken });
  assert.equal(health.success, true);
  assert.equal(health.data.status, "attention");
  assert.equal(health.data.unresolvedErrors.some(item => item.errorId === failed.errorId), true);
  assert.equal(Object.hasOwn(health.data.unresolvedErrors[0], "message"), false);
});

test("Phase 2 system health audit safely correlates recovery and operational errors", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const recoveryRecord = {
    requestId: "req-phase2-audit-0001",
    action: "createMovement",
    email: "founder@example.invalid",
    payloadFingerprint: "private-fingerprint",
    status: "FAILED_REVIEW_REQUIRED",
    targetReference: "MOV-999",
    startedAt: 1000,
    updatedAt: 2000,
    checkpoints: [{ recordType: "MOV", recordId: "MOV-999", phase: "ID_ALLOCATED", at: 1500 }],
    error: "Operational Drive root is not configured. https://private.example.invalid/folder/secret",
  };
  const operationalError = {
    errorId: "ERR-phase2-audit-0001",
    requestId: recoveryRecord.requestId,
    action: "createMovement",
    at: 2001,
    message: recoveryRecord.error,
    stack: "private stack with founder@example.invalid and a file URL",
    resolvedAt: 0,
    resolutionNotes: "",
  };
  harness.properties.set("SYOAT_WRITE_REQUEST_test", JSON.stringify(recoveryRecord));
  harness.properties.set("SYOAT_OPERATIONAL_ERROR_ERR-phase2-audit-0001", JSON.stringify(operationalError));

  const result = JSON.parse(JSON.stringify(harness.call("auditPhase2SystemHealth")));
  assert.equal(result.recoveryRequired.length, 1);
  assert.equal(result.unresolvedErrors.length, 1);
  assert.equal(result.recoveryRequired[0].errorCategory, "DRIVE_CONFIGURATION");
  assert.equal(result.unresolvedErrors[0].category, "DRIVE_CONFIGURATION");
  assert.equal(result.unresolvedErrors[0].linkedToRecovery, true);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /founder@example|private-fingerprint|private stack|private\.example|Operational Drive root/i);
});

test("arbitrary unexpected error messages are never returned to the browser", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const response = JSON.parse(harness.call("operationalErrorResponse", new Error("sensitive implementation detail"), "local-test").getContent());
  assert.equal(response.success, false);
  assert.equal(response.error, "The request could not be completed safely.");
  assert.ok(response.errorId.startsWith("ERR-"));
  assert.doesNotMatch(JSON.stringify(response), /sensitive implementation detail/);
});

test("machine-readable action capabilities match the backend central policy", () => {
  const harness = createAppsScriptHarness(authenticatedSheets());
  const serverPolicy = JSON.parse(JSON.stringify(harness.evaluate("ACTION_CAPABILITIES")));
  const catalog = JSON.parse(readProjectFile("config/api-catalog.json"));
  const special = new Set(["ping", "getAppLogins", "login", "logout", "confirmPin", "verifySession"]);
  const catalogPolicy = Object.fromEntries(catalog.actions
    .filter(item => !special.has(item.action))
    .map(item => [item.action, item.targetCapability]));
  assert.deepEqual(serverPolicy, catalogPolicy);
});

test("serialized writes allocate distinct identifiers under the business lock", () => {
  const harness = createAppsScriptHarness(writeReadySheets());
  const signedIn = login(harness).data;
  const beforeLocks = harness.lockStats.waitCalls;
  const base = {
    action: "createMovement",
    sessionToken: signedIn.sessionToken,
    movementType: "Stock In",
    sourceLocationID: "SUPPLIER",
    destinationLocationID: "MAIN_WH",
    lines: [{ productID: "TEST-P001", quantity: 1 }],
  };
  const first = post(harness, { ...base, requestId: "req-create-0001" });
  const second = post(harness, { ...base, requestId: "req-create-0002" });
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.notEqual(first.data.movementID, second.data.movementID);
  assert.equal(harness.lockStats.waitCalls - beforeLocks, 2);
  assert.equal(harness.lockStats.releaseCalls, harness.lockStats.waitCalls);
});

test("Warehouse receives only minimal open FBA shipment options", () => {
  const harness = createAppsScriptHarness(writeReadySheets());
  const signedIn = post(harness, {
    action: "login",
    email: "warehouse@example.invalid",
    pin: TEST_PIN,
    userAgent: "local-test",
  }).data;
  const response = post(harness, {
    action: "getFbaDispatchShipmentOptions",
    sessionToken: signedIn.sessionToken,
  });

  assert.equal(response.success, true, JSON.stringify(response));
  assert.equal(response.data.length, 1);
  assert.deepEqual(Object.keys(response.data[0]).sort(), ["destinationFC", "lines", "shipmentID", "status"]);
  assert.deepEqual(Object.keys(response.data[0].lines[0]).sort(), ["dispatchedQty", "expectedQty", "productID", "remainingQty"]);
  assert.equal(response.data[0].shipmentID, "SHIP-TEST-001");
  assert.equal(response.data[0].lines[0].remainingQty, 5);
  assert.doesNotMatch(JSON.stringify(response.data), /CreatedBy|Notes|Email|file/i);
});

test("FBA Dispatch requires an open shipment, Amazon reference, and planned remaining quantity", () => {
  const harness = createAppsScriptHarness(writeReadySheets());
  const signedIn = login(harness).data;
  const base = {
    action: "createMovement",
    sessionToken: signedIn.sessionToken,
    movementType: "FBA Dispatch",
    sourceLocationID: "MAIN_WH",
    destinationLocationID: "FBA_TRANSIT",
    referenceNumber: "AMZ-SHIP-TEST-001",
    amazonShipmentID: "SHIP-TEST-001",
    amazonDestinationFC: "TEST_FC",
    lines: [{ productID: "TEST-P001", quantity: 4 }],
  };

  const missingShipment = post(harness, {
    ...base,
    requestId: "req-fba-dispatch-missing-0001",
    amazonShipmentID: "",
  });
  assert.equal(missingShipment.success, false);
  assert.match(missingShipment.error, /select an open FBA shipment/i);

  const missingReference = post(harness, {
    ...base,
    requestId: "req-fba-dispatch-reference-0001",
    referenceNumber: "",
  });
  assert.equal(missingReference.success, false);
  assert.match(missingReference.error, /Amazon Shipment ID/i);

  const first = post(harness, { ...base, requestId: "req-fba-dispatch-first-0001" });
  const competing = post(harness, { ...base, requestId: "req-fba-dispatch-second-0001" });
  assert.equal(first.success, true, JSON.stringify(first));
  assert.equal(competing.success, true, JSON.stringify(competing));

  const headers = harness.call("sheetToObjects", "Movement_Headers");
  const created = headers.find(row => row.MovementID === first.data.movementID);
  assert.equal(created.AmazonShipmentID, "SHIP-TEST-001");
  assert.equal(created.AmazonDestinationFC, "TEST_FC");

  const approved = post(harness, {
    action: "approveMovement",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-dispatch-approve-0001",
    movementID: first.data.movementID,
  });
  assert.equal(approved.success, true, JSON.stringify(approved));

  const staleApproval = post(harness, {
    action: "approveMovement",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-dispatch-approve-0002",
    movementID: competing.data.movementID,
  });
  assert.equal(staleApproval.success, false);
  assert.match(staleApproval.error, /exceeds the selected shipment plan/);

  const options = post(harness, {
    action: "getFbaDispatchShipmentOptions",
    sessionToken: signedIn.sessionToken,
  });
  assert.equal(options.data[0].lines[0].remainingQty, 1);
});

test("FBA report import saves evidence for review without changing stock", () => {
  const sheets = writeReadySheets();
  sheets.Stock_Counts = objectsToRows([], [
    "CountID", "CountDateTime", "LocationID", "ProductID", "SystemQty",
    "PhysicalQty", "Difference", "CountedByEmail", "ApprovedByEmail",
    "Status", "Reason", "AdjustmentMovementID", "Notes",
  ]);
  sheets.FBA_Ledger_Snapshots = objectsToRows([], [
    "SnapshotID", "ReportDate", "ProductID", "FC", "Qty", "Sold",
    "UploadedByEmail", "UploadedAt",
  ]);
  const harness = createAppsScriptHarness(sheets);
  const signedIn = login(harness).data;
  const movementRowsBefore = harness.spreadsheet.getSheetByName("Movement_Headers").values.length;
  const payload = {
    action: "createFbaReconciliation",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-report-0001",
    reportDate: "2026-10-27",
    fileText: "date,asin,disposition,ending warehouse balance\n2026-10-27,TEST-ASIN,SELLABLE,3",
    fileName: "synthetic-fba-report.csv",
    fileMime: "text/csv",
    items: [{ productID: "TEST-P001", ledgerQty: 3 }],
    fcSnapshot: [{ productID: "TEST-P001", fc: "TEST_FC", qty: 3, sold: 1 }],
  };

  const imported = post(harness, payload);
  assert.equal(imported.success, true, JSON.stringify(imported));
  assert.equal(imported.data.pendingReviewCount, 1);
  assert.equal(imported.data.snapshotSaved, 1);
  assert.equal(harness.spreadsheet.getSheetByName("Movement_Headers").values.length, movementRowsBefore);

  const counts = harness.call("sheetToObjects", "Stock_Counts");
  assert.equal(counts.length, 1);
  assert.equal(counts[0].Status, "Pending");
  assert.equal(counts[0].Reason, "FBA Report Variance Review");
  assert.equal(counts[0].AdjustmentMovementID, "");

  const classified = post(harness, {
    action: "reviewFbaVariance",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-report-review-0001",
    countID: counts[0].CountID,
    classification: "receipt",
    reviewNote: "Matched to synthetic shipment evidence.",
  });
  assert.equal(classified.success, true, JSON.stringify(classified));
  assert.equal(classified.data.classification, "receipt");
  const reviewedCount = harness.call("sheetToObjects", "Stock_Counts")[0];
  assert.equal(reviewedCount.Status, "Pending");
  assert.match(reviewedCount.Notes, /FBA_REVIEW:/);
  assert.match(reviewedCount.Notes, /"classification":"receipt"/);
  assert.equal(harness.spreadsheet.getSheetByName("Movement_Headers").values.length, movementRowsBefore);

  const unsafeEdit = post(harness, {
    action: "editStockCount",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-report-edit-0001",
    countID: counts[0].CountID,
    physicalQty: 4,
  });
  assert.equal(unsafeEdit.success, false);
  assert.match(unsafeEdit.error, /Review FBA Variance/i);

  const unsafeReject = post(harness, {
    action: "rejectStockCount",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-report-reject-0001",
    countID: counts[0].CountID,
  });
  assert.equal(unsafeReject.success, false);
  assert.match(unsafeReject.error, /Review FBA Variance/i);

  const unsafeApproval = post(harness, {
    action: "approveStockCount",
    sessionToken: signedIn.sessionToken,
    requestId: "req-fba-report-approve-0001",
    countID: counts[0].CountID,
  });
  assert.equal(unsafeApproval.success, false);
  assert.match(unsafeApproval.error, /cannot be approved as a normal stock count/i);

  const duplicate = post(harness, { ...payload, requestId: "req-fba-report-0002" });
  assert.equal(duplicate.success, false);
  assert.match(duplicate.error, /already imported/i);
});

test("retrying a completed request returns its result without another business event", () => {
  const harness = createAppsScriptHarness(writeReadySheets());
  const signedIn = login(harness).data;
  const command = {
    action: "createMovement",
    sessionToken: signedIn.sessionToken,
    requestId: "req-replay-0001",
    movementType: "Stock In",
    sourceLocationID: "SUPPLIER",
    destinationLocationID: "MAIN_WH",
    lines: [{ productID: "TEST-P001", quantity: 2 }],
  };
  const first = post(harness, command);
  const replay = post(harness, command);
  assert.equal(first.success, true);
  assert.equal(replay.success, true);
  assert.equal(replay.data.movementID, first.data.movementID);
  assert.equal(replay.data.idempotentReplay, true);
  const headers = harness.spreadsheet.getSheetByName("Movement_Headers").values;
  assert.equal(headers.filter(row => row[0] === first.data.movementID).length, 1);

  const changedPayload = post(harness, { ...command, lines: [{ productID: "TEST-P001", quantity: 9 }] });
  assert.equal(changedPayload.success, false);
  assert.match(changedPayload.error, /Request ID collision/);
});

test("movement approval revalidates latest stock while holding the write lock", () => {
  const sheets = writeReadySheets();
  const baseHeader = fixture.movements[0].header;
  sheets.Movement_Headers = objectsToRows([
    baseHeader,
    { ...baseHeader, MovementID: "MOV-TEST-002", MovementType: "Website – WH Ship", SourceLocationID: "MAIN_WH", DestinationLocationID: "CUSTOMER", Status: "Draft", EnteredByEmail: "founder@example.invalid", ApprovedByEmail: "", ApprovedAt: "" },
    { ...baseHeader, MovementID: "MOV-TEST-003", MovementType: "Website – WH Ship", SourceLocationID: "MAIN_WH", DestinationLocationID: "CUSTOMER", Status: "Draft", EnteredByEmail: "founder@example.invalid", ApprovedByEmail: "", ApprovedAt: "" },
  ]);
  sheets.Movement_Lines = objectsToRows([
    ...fixture.movements.flatMap(movement => movement.lines),
    { MovementLineID: "MOV-TEST-002-L001", MovementID: "MOV-TEST-002", ProductID: "TEST-P001", Quantity: 15 },
    { MovementLineID: "MOV-TEST-003-L001", MovementID: "MOV-TEST-003", ProductID: "TEST-P001", Quantity: 15 },
  ]);
  const harness = createAppsScriptHarness(sheets);
  const signedIn = login(harness).data;

  const first = post(harness, { action: "approveMovement", sessionToken: signedIn.sessionToken, requestId: "req-approve-0001", movementID: "MOV-TEST-002" });
  const second = post(harness, { action: "approveMovement", sessionToken: signedIn.sessionToken, requestId: "req-approve-0002", movementID: "MOV-TEST-003" });
  assert.equal(first.success, true, JSON.stringify(first));
  assert.equal(second.success, false);
  assert.match(second.error, /negative stock/);
  const rows = harness.call("sheetToObjects", "Movement_Headers");
  assert.equal(rows.find(row => row.MovementID === "MOV-TEST-003").Status, "Draft");
});

test("stock count approval rejects a stale calculated balance", () => {
  const sheets = writeReadySheets();
  sheets.Stock_Counts = objectsToRows([{
    CountID: "CNT-TEST-001",
    CountDateTime: "2026-08-19 09:00:00",
    LocationID: "MAIN_WH",
    ProductID: "TEST-P001",
    SystemQty: 10,
    PhysicalQty: 12,
    Difference: 2,
    CountedByEmail: "founder@example.invalid",
    ApprovedByEmail: "",
    Status: "Pending",
    Reason: "Test",
    AdjustmentMovementID: "",
    Notes: "",
  }]);
  const harness = createAppsScriptHarness(sheets);
  const signedIn = login(harness).data;
  const response = post(harness, {
    action: "approveStockCount",
    sessionToken: signedIn.sessionToken,
    requestId: "req-count-0001",
    countID: "CNT-TEST-001",
  });
  assert.equal(response.success, false);
  assert.match(response.error, /Stock changed after this count/);
  const counts = harness.call("sheetToObjects", "Stock_Counts");
  assert.equal(counts[0].Status, "Pending");
});

test("partial aggregate failure is hidden and recorded for manual recovery", () => {
  const harness = createAppsScriptHarness(writeReadySheets());
  const signedIn = login(harness).data;
  const lineSheet = harness.spreadsheet.getSheetByName("Movement_Lines");
  lineSheet.failAppendAfter(1, "simulated second-line failure");
  const command = {
    action: "createMovement",
    sessionToken: signedIn.sessionToken,
    requestId: "req-partial-0001",
    movementType: "Stock In",
    sourceLocationID: "SUPPLIER",
    destinationLocationID: "MAIN_WH",
    lines: [
      { productID: "TEST-P001", quantity: 1 },
      { productID: "TEST-C001", quantity: 1 },
    ],
  };
  const failed = post(harness, command);
  assert.equal(failed.success, false);
  assert.equal(failed.error, "The request could not be completed safely.");
  assert.ok(failed.errorId.startsWith("ERR-"));
  const headers = harness.call("sheetToObjects", "Movement_Headers");
  assert.equal(headers.some(row => row.MovementID === "MOV-002"), false);
  const recovery = JSON.parse(JSON.stringify(harness.call("listWriteRecoveryRecords")));
  const record = recovery.find(item => item.requestId === command.requestId);
  assert.equal(record.status, "FAILED_REVIEW_REQUIRED");
  assert.equal(record.checkpoints.some(checkpoint => checkpoint.recordType === "MOV" && checkpoint.recordId === "MOV-002"), true);

  const retry = post(harness, command);
  assert.equal(retry.success, false);
  assert.match(retry.error, /Recovery required/);
});

test("PIN migration hashes unique plaintext PINs and clears the readable cells", () => {
  const sheets = fixtureSheets();
  sheets.App_Logins = objectsToRows([
    { ...fixture.staff[0], PIN: TEST_PIN },
    { ...fixture.staff[1], PIN: [1, 3, 5, 7].join("") },
  ]);
  const harness = createAppsScriptHarness(sheets);
  const result = harness.call("migratePinsToHashes");
  assert.equal(result.migrated, 2);

  const values = harness.spreadsheet.getSheetByName("App_Logins").getDataRange().getValues();
  const headers = values[0];
  const pinColumn = headers.indexOf("PIN");
  const hashColumn = headers.indexOf("PINHash");
  const saltColumn = headers.indexOf("PINSalt");
  for (const row of values.slice(1)) {
    assert.equal(row[pinColumn], "");
    assert.ok(row[hashColumn]);
    assert.ok(row[saltColumn]);
  }
});

test("PIN migration refuses duplicate active PINs before clearing them", () => {
  const sheets = fixtureSheets();
  sheets.App_Logins = objectsToRows([
    { ...fixture.staff[0], PIN: TEST_PIN },
    { ...fixture.staff[1], PIN: TEST_PIN },
  ]);
  const harness = createAppsScriptHarness(sheets);
  assert.throws(() => harness.call("migratePinsToHashes"), /Duplicate active PINs/);
});
