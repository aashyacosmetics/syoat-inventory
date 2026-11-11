import test from "node:test";
import assert from "node:assert/strict";
import { createAppsScriptHarness } from "./helpers/apps-script-harness.mjs";
import {
  historicalFbaSheets,
  loginHistoricalCoFounder,
  loginHistoricalFounder,
  post,
} from "./helpers/historical-fba-fixture.mjs";

function businessSnapshot(harness) {
  return JSON.stringify({
    movementHeaders: harness.call("sheetToObjects", "Movement_Headers"),
    movementLines: harness.call("sheetToObjects", "Movement_Lines"),
    shipments: harness.call("sheetToObjects", "FBA_Shipments"),
    shipmentLines: harness.call("sheetToObjects", "FBA_Shipment_Lines"),
  });
}

function dryRun(harness, sessionToken) {
  return post(harness, {
    action: "getHistoricalFbaLinkingDryRun",
    sessionToken,
  });
}

test("historical FBA dry run is Founder-only, exact, and read-only", () => {
  const harness = createAppsScriptHarness(historicalFbaSheets());
  const founder = loginHistoricalFounder(harness);
  const before = businessSnapshot(harness);
  const first = dryRun(harness, founder.sessionToken);
  const second = dryRun(harness, founder.sessionToken);

  assert.equal(first.success, true, JSON.stringify(first));
  assert.equal(first.data.ready, true, JSON.stringify(first.data.conflicts));
  assert.deepEqual(first.data.summary, {
    insertHeaders: 23,
    insertLines: 74,
    updateLinks: 23,
    updateControlReferences: 1,
    referenceCorrections: 3,
    closedShipmentVariances: 3,
    businessMutations: 121,
    stockDelta: 0,
    referenceNumberEdits: 0,
    movementStatusEdits: 0,
    receiptMovementsCreated: 0,
    adjustmentMovementsCreated: 0,
  });
  assert.equal(first.data.control.verified, true);
  assert.equal(first.data.control.referenceBackfillRequired, true);
  assert.equal(first.data.applyEnabled, false);
  assert.deepEqual(second.data, first.data);
  assert.equal(businessSnapshot(harness), before);

  const coFounder = loginHistoricalCoFounder(harness);
  const denied = dryRun(harness, coFounder.sessionToken);
  assert.equal(denied.success, false);
  assert.match(denied.error, /Forbidden|not permitted/i);
  assert.equal(businessSnapshot(harness), before);
});
test("historical FBA apply fails closed until the exact manifest is separately enabled", () => {
  const harness = createAppsScriptHarness(historicalFbaSheets());
  const founder = loginHistoricalFounder(harness);
  const preview = dryRun(harness, founder.sessionToken).data;
  const before = businessSnapshot(harness);
  const denied = post(harness, {
    action: "applyHistoricalFbaShipmentLinks",
    sessionToken: founder.sessionToken,
    requestId: "local-fba-history-disabled-0001",
    manifestFingerprint: preview.manifestFingerprint,
    confirmation: "APPLY:" + preview.manifestFingerprint,
    batchStartSequence: 1,
    batchSize: 5,
  });

  assert.equal(denied.success, false);
  assert.match(denied.error, /could not be completed safely/i);
  assert.equal(businessSnapshot(harness), before);
  assert.equal(harness.call("listWriteRecoveryRecords").length, 0);
});

test("sanitized local apply rehearsal is bounded, idempotent, and has zero stock delta", () => {
  const harness = createAppsScriptHarness(historicalFbaSheets());
  const founder = loginHistoricalFounder(harness);
  const preview = dryRun(harness, founder.sessionToken).data;
  const enableProperty = harness.evaluate("HISTORICAL_FBA_LINKING_CONFIG.ENABLE_PROPERTY");
  harness.properties.set(enableProperty, preview.manifestFingerprint);

  const movementLinesBefore = JSON.stringify(harness.call("sheetToObjects", "Movement_Lines"));
  const preservedBefore = harness.call("sheetToObjects", "Movement_Headers").map(row => ({
    movementID: row.MovementID,
    referenceNumber: row.ReferenceNumber,
    status: row.Status,
  }));
  const currentShipmentRowsBefore = JSON.stringify(harness.call("sheetToObjects", "FBA_Shipments").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID)));
  const currentShipmentLinesBefore = JSON.stringify(harness.call("sheetToObjects", "FBA_Shipment_Lines").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID)));
  const applied = { insertedHeaders: 0, insertedLines: 0, updatedLinks: 0, updatedControlReferences: 0 };
  let start = 1;
  let firstRequest = null;
  let firstResponse = null;
  while (start) {
    const request = {
      action: "applyHistoricalFbaShipmentLinks",
      sessionToken: founder.sessionToken,
      requestId: "local-fba-history-batch-" + String(start).padStart(4, "0"),
      manifestFingerprint: preview.manifestFingerprint,
      confirmation: "APPLY:" + preview.manifestFingerprint,
      batchStartSequence: start,
      batchSize: 5,
    };
    const response = post(harness, request);
    assert.equal(response.success, true, JSON.stringify(response));
    Object.keys(applied).forEach(key => { applied[key] += response.data.applied[key]; });
    if (!firstRequest) { firstRequest = request; firstResponse = response; }
    start = response.data.nextSequence;
  }

  assert.deepEqual(applied, { insertedHeaders: 23, insertedLines: 74, updatedLinks: 23, updatedControlReferences: 1 });
  assert.equal(JSON.stringify(harness.call("sheetToObjects", "Movement_Lines")), movementLinesBefore);
  assert.deepEqual(harness.call("sheetToObjects", "Movement_Headers").map(row => ({
    movementID: row.MovementID,
    referenceNumber: row.ReferenceNumber,
    status: row.Status,
  })), preservedBefore);
  assert.equal(harness.call("sheetToObjects", "FBA_Shipments").filter(row => row.ShipmentID.startsWith("HSHIP-")).every(row => row.Status === "In Transit"), true);
  assert.equal(harness.call("sheetToObjects", "FBA_Shipments").find(row => row.ShipmentID === "SHIP-001").AmazonReferenceID, "FBA15MRFBLH8");
  assert.equal(harness.call("sheetToObjects", "FBA_Shipments").find(row => row.ShipmentID === "HSHIP-009").AmazonReferenceID, "FBA15M322TH0");
  assert.equal(harness.call("sheetToObjects", "FBA_Shipments").find(row => row.ShipmentID === "HSHIP-015").AmazonReferenceID, "FBA15M7J3P19");
  assert.equal(harness.call("sheetToObjects", "FBA_Shipments").find(row => row.ShipmentID === "HSHIP-017").AmazonReferenceID, "FBA15M8SZT0N");
  assert.equal(JSON.stringify(harness.call("sheetToObjects", "FBA_Shipments").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID))), currentShipmentRowsBefore);
  assert.equal(JSON.stringify(harness.call("sheetToObjects", "FBA_Shipment_Lines").filter(row => /^SHIP-00[2-4]$/.test(row.ShipmentID))), currentShipmentLinesBefore);

  const after = dryRun(harness, founder.sessionToken).data;
  assert.equal(after.ready, true, JSON.stringify(after.conflicts));
  assert.equal(after.summary.businessMutations, 0);
  assert.equal(after.control.referenceBackfillRequired, false);
  assert.equal(after.summary.stockDelta, 0);

  const replay = post(harness, firstRequest);
  assert.equal(replay.success, true, JSON.stringify(replay));
  assert.equal(replay.data.idempotentReplay, true);
  assert.deepEqual({ ...replay.data, idempotentReplay: undefined }, { ...firstResponse.data, idempotentReplay: undefined });

  const noOp = post(harness, {
    ...firstRequest,
    requestId: "local-fba-history-noop-0001",
  });
  assert.equal(noOp.success, true, JSON.stringify(noOp));
  assert.deepEqual(noOp.data.applied, { insertedHeaders: 0, insertedLines: 0, updatedLinks: 0, updatedControlReferences: 0 });
  assert.equal(noOp.data.remainingBusinessMutations, 0);
});

test("historical FBA preflight refuses to overwrite a different control reference", () => {
  const sheets = historicalFbaSheets();
  const referenceColumn = sheets.FBA_Shipments[0].indexOf("AmazonReferenceID");
  const shipmentIDColumn = sheets.FBA_Shipments[0].indexOf("ShipmentID");
  const control = sheets.FBA_Shipments.find(row => row[shipmentIDColumn] === "SHIP-001");
  control[referenceColumn] = "FBA15DIFFERENT";
  const harness = createAppsScriptHarness(sheets);
  const founder = loginHistoricalFounder(harness);
  const response = dryRun(harness, founder.sessionToken);

  assert.equal(response.success, true);
  assert.equal(response.data.ready, false);
  assert.match(response.data.conflicts.join(" | "), /SHIP-001.*different value/i);
});

test("historical FBA preflight stops on a changed approved movement", () => {
  const sheets = historicalFbaSheets();
  const referenceColumn = sheets.Movement_Headers[0].indexOf("ReferenceNumber");
  const movementIDColumn = sheets.Movement_Headers[0].indexOf("MovementID");
  const target = sheets.Movement_Headers.find(row => row[movementIDColumn] === "MOV-125");
  target[referenceColumn] = "CHANGED-SOURCE";
  const harness = createAppsScriptHarness(sheets);
  const founder = loginHistoricalFounder(harness);
  const response = dryRun(harness, founder.sessionToken);

  assert.equal(response.success, true);
  assert.equal(response.data.ready, false);
  assert.match(response.data.conflicts.join(" | "), /MOV-125.*ReferenceNumber/i);
});
