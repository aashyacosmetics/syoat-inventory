import test from "node:test";
import assert from "node:assert/strict";
import { readProjectFile } from "../scripts/source-analysis.mjs";

test("active frontend uses runtime API configuration", () => {
  const app = readProjectFile("syoat-app.js");
  const html = readProjectFile("index.html");
  const ignored = readProjectFile(".gitignore");
  assert.match(app, /window\.SYOAT_CONFIG/);
  assert.doesNotMatch(app, /script\.google\.com\/macros\/s\//);
  assert.ok(html.indexOf("runtime-config.js") < html.indexOf("syoat-app.js"));
  assert.match(ignored, /^runtime-config\.js$/m);
});

test("staff picker has no offline identity cache or fallback account", () => {
  const app = readProjectFile("syoat-app.js");
  assert.doesNotMatch(app, /STAFF_DB_FALLBACK|syoat_staff_cache/);
  assert.doesNotMatch(app, /localStorage\.getItem\([^)]*staff/i);
  assert.doesNotMatch(app, /localStorage\.setItem\([^)]*staff/i);
});

test("frontend navigation and compatibility flags use server capabilities", () => {
  const app = readProjectFile("syoat-app.js");
  assert.match(app, /function hasCapability/);
  assert.match(app, /function decorateSessionUser/);
  assert.match(app, /amazon\.reconciliation\.view/);
  assert.match(app, /support\.tickets\.view/);
  assert.match(app, /purchasing\.orders\.view/);
  assert.doesNotMatch(app, /const rolePerms/);
});

test("expired sessions are handled centrally and PIN confirmation fails closed", () => {
  const app = readProjectFile("syoat-app.js");
  assert.match(app, /registerSessionExpiredHandler/);
  assert.match(app, /handleSessionExpired/);
  assert.match(app, /PIN confirmation is unavailable/);
  assert.doesNotMatch(app, /if \(!_pinConfirmSetState\) return Promise\.resolve\(true\)/);
});
