import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createAppsScriptHarness } from "../tests/helpers/apps-script-harness.mjs";
import {
  historicalFbaSheets,
  loginHistoricalFounder,
  post,
} from "../tests/helpers/historical-fba-fixture.mjs";

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function dryRun(harness, sessionToken) {
  return post(harness, { action: "getHistoricalFbaLinkingDryRun", sessionToken }).data;
}

const harness = createAppsScriptHarness(historicalFbaSheets());
const founder = loginHistoricalFounder(harness);
const movementLinesBefore = harness.call("sheetToObjects", "Movement_Lines");
const movementEvidenceBefore = harness.call("sheetToObjects", "Movement_Headers").map(row => ({
  movementID: row.MovementID,
  referenceNumber: row.ReferenceNumber,
  status: row.Status,
}));
const currentShipmentsBefore = harness.call("sheetToObjects", "FBA_Shipments").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID));
const currentShipmentLinesBefore = harness.call("sheetToObjects", "FBA_Shipment_Lines").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID));
const firstDryRun = dryRun(harness, founder.sessionToken);
const repeatedDryRun = dryRun(harness, founder.sessionToken);
assert.deepEqual(repeatedDryRun, firstDryRun);
assert.equal(firstDryRun.ready, true, firstDryRun.conflicts.join(" | "));

const enableProperty = harness.evaluate("HISTORICAL_FBA_LINKING_CONFIG.ENABLE_PROPERTY");
harness.properties.set(enableProperty, firstDryRun.manifestFingerprint);
const batchResults = [];
let start = 1;
while (start) {
  const response = post(harness, {
    action: "applyHistoricalFbaShipmentLinks",
    sessionToken: founder.sessionToken,
    requestId: "rehearsal-fba-history-" + String(start).padStart(4, "0"),
    manifestFingerprint: firstDryRun.manifestFingerprint,
    confirmation: "APPLY:" + firstDryRun.manifestFingerprint,
    batchStartSequence: start,
    batchSize: 5,
  });
  assert.equal(response.success, true, JSON.stringify(response));
  batchResults.push(response.data);
  start = response.data.nextSequence;
}

const afterDryRun = dryRun(harness, founder.sessionToken);
const noOpSecondPass = post(harness, {
  action: "applyHistoricalFbaShipmentLinks",
  sessionToken: founder.sessionToken,
  requestId: "rehearsal-fba-history-second-pass",
  manifestFingerprint: firstDryRun.manifestFingerprint,
  confirmation: "APPLY:" + firstDryRun.manifestFingerprint,
  batchStartSequence: 1,
  batchSize: 5,
});
assert.equal(noOpSecondPass.success, true, JSON.stringify(noOpSecondPass));
assert.equal(afterDryRun.summary.businessMutations, 0);
assert.deepEqual(noOpSecondPass.data.applied, { insertedHeaders: 0, insertedLines: 0, updatedLinks: 0, updatedControlReferences: 0 });
assert.equal(hash(harness.call("sheetToObjects", "Movement_Lines")), hash(movementLinesBefore));
assert.deepEqual(harness.call("sheetToObjects", "Movement_Headers").map(row => ({
  movementID: row.MovementID,
  referenceNumber: row.ReferenceNumber,
  status: row.Status,
})), movementEvidenceBefore);
assert.deepEqual(harness.call("sheetToObjects", "FBA_Shipments").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID)), currentShipmentsBefore);
assert.deepEqual(harness.call("sheetToObjects", "FBA_Shipment_Lines").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID)), currentShipmentLinesBefore);

const totals = batchResults.reduce((sum, batch) => {
  Object.keys(sum).forEach(key => { sum[key] += batch.applied[key]; });
  return sum;
}, { insertedHeaders: 0, insertedLines: 0, updatedLinks: 0, updatedControlReferences: 0 });

const report = {
  generatedAt: new Date().toISOString(),
  environment: "local in-memory sanitized fixture",
  manifestID: firstDryRun.manifestID,
  manifestFingerprint: firstDryRun.manifestFingerprint,
  initialDryRun: firstDryRun.summary,
  repeatDryRunIdentical: true,
  simulatedApplyBatches: batchResults.map(batch => ({
    batchStartSequence: batch.batchStartSequence,
    batchEndSequence: batch.batchEndSequence,
    applied: batch.applied,
    nextSequence: batch.nextSequence,
  })),
  simulatedApplyTotals: totals,
  postApplyDryRun: afterDryRun.summary,
  secondPassApplied: noOpSecondPass.data.applied,
  movementLinesHashUnchanged: true,
  approvedReferenceNumbersUnchanged: true,
  movementStatusesUnchanged: true,
  currentShipments002To004Unchanged: true,
  currentShipmentLines002To004Unchanged: true,
  productionContacted: false,
  productionMutated: false,
};

console.log(JSON.stringify(report, null, 2));
