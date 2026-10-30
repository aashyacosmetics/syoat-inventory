import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectEnvironmentIsolation } from "../scripts/check-environment-isolation.mjs";
import { readProjectFile } from "../scripts/source-analysis.mjs";

const example = JSON.parse(readFileSync("config/environments.example.json", "utf8"));

function readyConfig() {
  return {
    schemaVersion: 1,
    defaultEnvironment: "development",
    environments: {
      development: {
        apiUrl: "http://127.0.0.1:8787/mock-api",
        dataClass: "synthetic-fixtures",
        ownerDeploymentOnly: true
      },
      staging: {
        apiUrl: "https://script.google.com/macros/s/STAGING/exec",
        spreadsheetId: "staging-sheet-id",
        driveRootFolderId: "staging-drive-id",
        dataClass: "staging-copy",
        ownerDeploymentOnly: true
      },
      production: {
        apiUrl: "https://script.google.com/macros/s/PRODUCTION/exec",
        spreadsheetId: "production-sheet-id",
        driveRootFolderId: "production-drive-id",
        dataClass: "live-business-data",
        ownerDeploymentOnly: true
      }
    }
  };
}

test("committed environment template is safe but cannot claim staging readiness", () => {
  const templateResult = inspectEnvironmentIsolation(example);
  assert.deepEqual(templateResult.errors, []);
  assert.ok(templateResult.warnings.length >= 6);

  const strictResult = inspectEnvironmentIsolation(example, { requireReady: true });
  assert.equal(strictResult.ready, false);
  assert.ok(strictResult.errors.some(error => error.includes("staging.spreadsheetId")));
});

test("strict staging gate accepts isolated owner configuration", () => {
  const result = inspectEnvironmentIsolation(readyConfig(), { requireReady: true });
  assert.deepEqual(result, { ready: true, errors: [], warnings: [] });
});

test("strict staging gate rejects production resource reuse and credential fields", () => {
  const config = readyConfig();
  config.environments.staging.spreadsheetId = config.environments.production.spreadsheetId;
  config.environments.staging.driveRootFolderId = config.environments.production.driveRootFolderId;
  config.environments.staging.pin = "must-never-be-stored";

  const result = inspectEnvironmentIsolation(config, { requireReady: true });
  assert.equal(result.ready, false);
  assert.ok(result.errors.some(error => error.includes("spreadsheetId must differ")));
  assert.ok(result.errors.some(error => error.includes("driveRootFolderId must differ")));
  assert.ok(result.errors.some(error => error.includes("credential-like key")));
});

test("Phase 2 staging exclusion preserves the owner-controlled no-live-write gate", () => {
  const record = readProjectFile("docs/PHASE_2_WP1_STABILIZATION.md");
  const staging = readProjectFile("docs/PHASE_2_STAGING_RECORD.md");

  assert.match(record, /Production inspection mode: read-only/);
  assert.match(record, /America\/Los_Angeles/);
  assert.match(record, /Asia\/Kolkata/);
  assert.match(record, /No live Sheet, Drive, Apps Script or GitHub write was performed/);
  assert.match(record, /D-022 excludes further staging setup and rollback rehearsal/);
  assert.match(staging, /Status: \*\*CLOSED BY OWNER DECISION/);
  assert.match(staging, /not permission for Codex to change live resources/i);
  assert.match(staging, /production migration still requires explicit owner approval/i);
  assert.match(staging, /npm run check:staging/);
  assert.match(staging, /must differ from production/);
});
