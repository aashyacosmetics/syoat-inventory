import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractBackendContract,
  extractFrontendCalls,
  functionBody,
  loadCatalog,
  readProjectFile,
  repoRoot,
  uniqueActions,
} from "../scripts/source-analysis.mjs";

const backend = extractBackendContract();
const catalog = loadCatalog();
const catalogActions = catalog.actions.map(item => item.action).sort();
const backendActions = backend.actions.map(item => item.action).sort();

test("catalog covers every backend action exactly once", () => {
  assert.equal(new Set(catalogActions).size, catalogActions.length);
  assert.deepEqual(catalogActions, backendActions);
});

test("catalog route declarations match the source routers", () => {
  const actual = new Map(backend.actions.map(item => [item.action, [...item.routes].sort()]));
  for (const item of catalog.actions) {
    assert.deepEqual([...item.routes].sort(), actual.get(item.action), item.action);
  }
});

test("active frontend calls only known backend actions", () => {
  const unknown = uniqueActions(extractFrontendCalls("syoat-app.js")).filter(action => !backendActions.includes(action));
  assert.deepEqual(unknown, []);
});

test("active frontend backend-only actions remain explicitly visible", () => {
  const called = new Set(uniqueActions(extractFrontendCalls("syoat-app.js")));
  const backendOnly = backendActions.filter(action => !called.has(action));
  assert.deepEqual(backendOnly, [
    "createSalesOrder",
    "dispatchSalesOrder",
    "editStockCount",
    "getFeatureSettings",
    "getLists",
    "getLocations",
    "getProducts",
    "getSalesOrders",
    "getStaff",
    "getStock",
    "logChange",
    "ping",
    "verifySession"
  ]);
});

test("API catalogue document names every configured action", () => {
  const doc = readProjectFile("docs/API_CATALOG.md");
  for (const action of catalogActions) {
    assert.ok(doc.includes("| `" + action + "` |"), action);
  }
});

test("test fixtures contain no credential fields or real email domains", () => {
  const fixtureDir = path.join(repoRoot, "tests", "fixtures");
  for (const file of fs.readdirSync(fixtureDir)) {
    const text = fs.readFileSync(path.join(fixtureDir, file), "utf8");
    assert.doesNotMatch(text, /"(?:pin|password|token|secret)"\s*:/i, file);
    const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    assert.ok(emails.every(email => email.endsWith("@example.invalid")), `${file}: ${emails.join(", ")}`);
  }
});

test("environment template separates development, staging, and production without live IDs", () => {
  const template = JSON.parse(readProjectFile("config/environments.example.json"));
  assert.equal(template.defaultEnvironment, "development");
  assert.deepEqual(Object.keys(template.environments).sort(), ["development", "production", "staging"]);
  assert.equal(template.environments.development.dataClass, "synthetic-fixtures");
  assert.equal(template.environments.staging.dataClass, "staging-copy");
  assert.equal(template.environments.production.dataClass, "live-business-data");
  assert.ok(Object.values(template.environments).every(environment => environment.ownerDeploymentOnly === true));
  assert.match(template.environments.staging.apiUrl, /^REPLACE_WITH_/);
  assert.match(template.environments.production.apiUrl, /^REPLACE_WITH_/);
  assert.match(template.environments.staging.spreadsheetId, /^REPLACE_WITH_/);
  assert.match(template.environments.production.spreadsheetId, /^REPLACE_WITH_/);
  assert.match(template.environments.staging.driveRootFolderId, /^REPLACE_WITH_STAGING_/);
  assert.match(template.environments.production.driveRootFolderId, /^REPLACE_WITH_PRODUCTION_/);
  assert.notEqual(template.environments.staging.driveRootFolderId, template.environments.production.driveRootFolderId);
});

test("only health and safe staff picker remain reachable through GET", () => {
  assert.deepEqual(backend.getActions.sort(), ["getAppLogins", "ping"]);
});

test("every business write is POST-only", () => {
  assert.equal(backend.writeActions.length, 25);
  assert.ok(backend.writeActions.every(action =>
    JSON.stringify(catalog.actions.find(item => item.action === action).routes) === JSON.stringify(["POST"])
  ));
});

test("frontend session credentials and PIN confirmations use POST bodies, never URLs", () => {
  const frontend = readProjectFile("syoat-app.js");
  for (const helper of ["api", "apiWrite", "apiLogin", "apiConfirmPin", "apiLogout"]) {
    const body = functionBody(frontend, helper);
    assert.doesNotMatch(body, /URLSearchParams/);
    assert.match(body, /method:\s*["']POST["']/);
  }
  assert.doesNotMatch(frontend, /CURRENT_PIN/);
  assert.doesNotMatch(frontend, /sessionStorage\.setItem/);
  assert.doesNotMatch(frontend, /localStorage\.setItem\([^)]*(?:pin|sessionToken)/i);
});

test("public frontend API helper is restricted to health and staff picker", () => {
  const body = functionBody(readProjectFile("syoat-app.js"), "apiPublic");
  assert.match(body, /getAppLogins/);
  assert.match(body, /ping/);
  assert.match(body, /Public action not allowed/);
});

test("authenticated router checks session and capability before dispatch", () => {
  const body = functionBody(readProjectFile("Code.gs"), "handleAuthenticatedAction");
  const sessionIndex = body.indexOf("requireSession");
  const capabilityIndex = body.indexOf("requireCapability");
  const firstDispatchIndex = body.indexOf('action === "getProducts"');
  assert.ok(sessionIndex >= 0);
  assert.ok(capabilityIndex > sessionIndex);
  assert.ok(firstDispatchIndex > capabilityIndex);
});
