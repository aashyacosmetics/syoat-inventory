import test from "node:test";
import assert from "node:assert/strict";
import { readProjectFile } from "../scripts/source-analysis.mjs";

test("historical Phase 1 release hashes remain consistent with its completion record", () => {
  const manifest = readProjectFile("docs/RELEASE_MANIFEST.md");
  const completion = readProjectFile("docs/PHASE_1_COMPLETION.md");
  for (const file of ["Code.gs", "index.html", "syoat-app.js"]) {
    const row = manifest.split("\n").find(line => line.includes(`| \`${file}\` |`));
    assert.ok(row, `manifest row missing: ${file}`);
    const match = row.match(/`([A-F0-9]{64})`/);
    assert.ok(match, `manifest hash missing: ${file}`);
    const expected = "- `" + file + "` SHA-256: `" + match[1] + "`";
    assert.ok(completion.includes(expected), `completion hash mismatch: ${file}`);
  }
});

test("owner handoff contains the coordinated release and rollback gates", () => {
  const handoff = readProjectFile("docs/OWNER_DEPLOYMENT_HANDOFF.md");
  for (const required of [
    "Absolute no-go conditions",
    "SYOAT_DRIVE_ROOT_FOLDER_ID",
    "Staging procedure",
    "Exact production deployment sequence",
    "Production smoke tests",
    "Rollback",
    "NO-GO",
  ]) assert.match(handoff, new RegExp(required));
  assert.match(handoff, /Never publish the redesign-named artifacts/);
});

test("unexecuted staging record blocks production instead of claiming approval", () => {
  const record = readProjectFile("docs/STAGING_UAT_RECORD.md");
  assert.match(record, /Status: \*\*NOT RUN — PRODUCTION DEPLOYMENT IS BLOCKED\*\*/);
  assert.match(record, /Founder approval for production: Pending/);
  assert.doesNotMatch(record, /Founder approval for production: (?:Pass|Approved)/i);
});
