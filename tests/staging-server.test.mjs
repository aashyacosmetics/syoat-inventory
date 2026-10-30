import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStagingServer } from "../scripts/serve-staging.mjs";

function isolatedConfig() {
  return {
    schemaVersion: 1,
    environments: {
      development: { dataClass: "synthetic-fixtures" },
      staging: {
        apiUrl: "https://script.google.com/macros/s/STAGING_TEST/exec",
        spreadsheetId: "staging-sheet",
        driveRootFolderId: "staging-drive",
        dataClass: "staging-copy",
        ownerDeploymentOnly: true
      },
      production: {
        apiUrl: "https://script.google.com/macros/s/PRODUCTION_TEST/exec",
        spreadsheetId: "production-sheet",
        driveRootFolderId: "production-drive",
        dataClass: "live-business-data",
        ownerDeploymentOnly: true
      }
    }
  };
}

test("localhost staging server injects only the staging API and blocks arbitrary files", async () => {
  const root = mkdtempSync(join(tmpdir(), "syoat-staging-"));
  const configPath = join(root, "environments.json");
  writeFileSync(join(root, "index.html"), "<!doctype html><title>staging</title>");
  writeFileSync(join(root, "private.txt"), "must not be served");
  writeFileSync(configPath, JSON.stringify(isolatedConfig()));

  const server = createStagingServer({ root, configPath });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const runtime = await fetch(base + "/runtime-config.js");
    const source = await runtime.text();
    assert.equal(runtime.status, 200);
    assert.match(source, /STAGING_TEST/);
    assert.doesNotMatch(source, /PRODUCTION_TEST|spreadsheetId|driveRootFolderId/);

    const blocked = await fetch(base + "/private.txt");
    assert.equal(blocked.status, 404);
    const traversal = await fetch(base + "/..%2Fconfig%2Fenvironments.local.json");
    assert.equal(traversal.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("active frontend visibly distinguishes staging from production", () => {
  const source = readFileSync("syoat-app.js", "utf8");
  assert.match(source, /const APP_ENVIRONMENT/);
  assert.match(source, /const IS_STAGING/);
  assert.match(source, /PRIVATE TEST ENVIRONMENT/);
  assert.match(source, /IS_STAGING \? "Staging" : "Live"/);
});
