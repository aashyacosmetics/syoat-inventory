import crypto from "node:crypto";
import { createAppsScriptHarness, objectsToRows } from "./apps-script-harness.mjs";

export const HISTORICAL_TEST_PIN = "2468";
const HISTORICAL_TEST_SALT = "historical-fba-test-salt";

export function historicalManifest() {
  const sourceHarness = createAppsScriptHarness({});
  return JSON.parse(sourceHarness.evaluate("JSON.stringify(HISTORICAL_FBA_LINKING_MANIFEST)"));
}
function testPinHash() {
  return crypto.createHash("sha256")
    .update(HISTORICAL_TEST_SALT + ":" + HISTORICAL_TEST_PIN, "utf8")
    .digest("base64url");
}

export function historicalFbaSheets() {
  const manifest = historicalManifest();
  const sourceFcFormatting = {
    "MOV-144": "PNQ-3",
    "MOV-200": "HYD- 3",
    "MOV-350": "DEL-5",
  };
  const founder = {
    StaffID: "STF001",
    FullName: "Local Founder",
    Email: "founder@example.invalid",
    Role: "Founder",
    Status: "Active",
  };
  const coFounder = {
    StaffID: "STF002",
    FullName: "Local Co-Founder",
    Email: "cofounder@example.invalid",
    Role: "Co-Founder",
    Status: "Active",
  };
  const movementHeaders = manifest.map(entry => ({
    MovementID: entry.movementID,
    MovementDateTime: entry.shipmentDateTime,
    MovementType: "FBA Dispatch",
    SourceLocationID: "MAIN_WH",
    DestinationLocationID: "FBA_TRANSIT",
    ReferenceType: "Amazon Shipment",
    ReferenceNumber: entry.sourceReference,
    AmazonShipmentID: "",
    AmazonDestinationFC: sourceFcFormatting[entry.movementID] || entry.destinationFC,
    CarrierTrackingNumber: "",
    DocumentFile: "",
    Status: "Approved",
    EnteredByEmail: "warehouse@example.invalid",
    ApprovedByEmail: founder.Email,
    ApprovedAt: entry.shipmentDateTime,
    ReversalOfMovementID: "",
    PurchaseOrderID: "",
    Notes: "Sanitized historical fixture",
  }));
  movementHeaders.push({
    MovementID: "MOV-379",
    MovementDateTime: "2026-10-23 00:00:00",
    MovementType: "FBA Dispatch",
    SourceLocationID: "MAIN_WH",
    DestinationLocationID: "FBA_TRANSIT",
    ReferenceType: "Amazon Shipment",
    ReferenceNumber: "FBA15MRFBLH8",
    AmazonShipmentID: "SHIP-001",
    AmazonDestinationFC: "BOM5",
    CarrierTrackingNumber: "",
    DocumentFile: "",
    Status: "Approved",
    EnteredByEmail: "warehouse@example.invalid",
    ApprovedByEmail: founder.Email,
    ApprovedAt: "2026-10-23 00:00:00",
    ReversalOfMovementID: "",
    PurchaseOrderID: "",
    Notes: "Existing verified control",
  });

  const movementLines = [];
  manifest.forEach(entry => {
    entry.lines.forEach((line, index) => movementLines.push({
      MovementLineID: entry.movementID + "-L" + String(index + 1).padStart(3, "0"),
      MovementID: entry.movementID,
      ProductID: line[0],
      Quantity: line[1],
      UnitCost: 0,
      BatchLot: "",
      ExpiryDate: "",
      Notes: "",
    }));
    if (entry.freebieComponentUnits) movementLines.push({
      MovementLineID: entry.movementID + "-FREEBIE",
      MovementID: entry.movementID,
      ProductID: "PRD-FREEBIE",
      Quantity: entry.freebieComponentUnits,
      UnitCost: 0,
      BatchLot: "",
      ExpiryDate: "",
      Notes: "Excluded freebie components",
    });
  });
  movementLines.push(
    { MovementLineID: "MOV-379-L001", MovementID: "MOV-379", ProductID: "PRD-P001", Quantity: 98, UnitCost: 0, BatchLot: "", ExpiryDate: "", Notes: "" },
    { MovementLineID: "MOV-379-L002", MovementID: "MOV-379", ProductID: "PRD-P005", Quantity: 140, UnitCost: 0, BatchLot: "", ExpiryDate: "", Notes: "" },
  );

  return {
    Products: objectsToRows([...new Set(manifest.flatMap(entry => entry.lines.map(line => line[0])).concat("PRD-FREEBIE"))]
      .map(productID => ({ ProductID: productID, ProductName: productID, Status: "Active" }))),
    Locations: objectsToRows([
      { LocationID: "MAIN_WH", LocationName: "Main Warehouse", Status: "Active" },
      { LocationID: "FBA_TRANSIT", LocationName: "FBA Transit", Status: "Active" },
    ]),
    Staff: objectsToRows([founder, coFounder]),
    App_Logins: objectsToRows([founder, coFounder].map(staff => ({
      ...staff,
      PINHash: testPinHash(),
      PINSalt: HISTORICAL_TEST_SALT,
    }))),
    Movement_Headers: objectsToRows(movementHeaders, [
      "MovementID", "MovementDateTime", "MovementType", "SourceLocationID",
      "DestinationLocationID", "ReferenceType", "ReferenceNumber",
      "AmazonShipmentID", "AmazonDestinationFC", "CarrierTrackingNumber",
      "DocumentFile", "Status", "EnteredByEmail", "ApprovedByEmail",
      "ApprovedAt", "ReversalOfMovementID", "PurchaseOrderID", "Notes",
    ]),
    Movement_Lines: objectsToRows(movementLines, [
      "MovementLineID", "MovementID", "ProductID", "Quantity", "UnitCost",
      "BatchLot", "ExpiryDate", "Notes",
    ]),
    FBA_Shipments: objectsToRows([
      {
        ShipmentID: "SHIP-001",
        AmazonReferenceID: "",
        ShipmentDateTime: "2026-10-23 00:00:00",
        DestinationFC: "BOM5",
        Status: "In Transit",
        CarrierTrackingNumber: "",
        ExpectedDeliveryDate: "",
        CreatedByEmail: founder.Email,
        ClosedAt: "",
        Notes: "Existing verified control with reference pending backfill",
      },
      {
        ShipmentID: "SHIP-002", AmazonReferenceID: "FBA15MV3JWHZ",
        ShipmentDateTime: "2026-11-10 00:00:00", DestinationFC: "DEL4", Status: "Working",
        CarrierTrackingNumber: "", ExpectedDeliveryDate: "", CreatedByEmail: founder.Email, ClosedAt: "", Notes: "Current live shipment",
      },
      {
        ShipmentID: "SHIP-003", AmazonReferenceID: "FBA15MVVJWB2",
        ShipmentDateTime: "2026-11-10 00:00:00", DestinationFC: "MAA4", Status: "Working",
        CarrierTrackingNumber: "", ExpectedDeliveryDate: "", CreatedByEmail: founder.Email, ClosedAt: "", Notes: "Current live shipment",
      },
      {
        ShipmentID: "SHIP-004", AmazonReferenceID: "FBA15MW115K6",
        ShipmentDateTime: "2026-11-10 00:00:00", DestinationFC: "CJB1", Status: "Working",
        CarrierTrackingNumber: "", ExpectedDeliveryDate: "", CreatedByEmail: founder.Email, ClosedAt: "", Notes: "Current live shipment",
      },
    ], [
      "ShipmentID", "AmazonReferenceID", "ShipmentDateTime", "DestinationFC",
      "Status", "CarrierTrackingNumber", "ExpectedDeliveryDate",
      "CreatedByEmail", "ClosedAt", "Notes",
    ]),
    FBA_Shipment_Lines: objectsToRows([
      { ShipmentLineID: "SHIP-001-L001", ShipmentID: "SHIP-001", ProductID: "PRD-P001", ExpectedQty: 98, Notes: "" },
      { ShipmentLineID: "SHIP-001-L002", ShipmentID: "SHIP-001", ProductID: "PRD-P005", ExpectedQty: 140, Notes: "" },
      { ShipmentLineID: "SHIP-002-L001", ShipmentID: "SHIP-002", ProductID: "PRD-P001", ExpectedQty: 10, Notes: "Current live shipment" },
      { ShipmentLineID: "SHIP-003-L001", ShipmentID: "SHIP-003", ProductID: "PRD-P002", ExpectedQty: 10, Notes: "Current live shipment" },
      { ShipmentLineID: "SHIP-004-L001", ShipmentID: "SHIP-004", ProductID: "PRD-P003", ExpectedQty: 10, Notes: "Current live shipment" },
    ], ["ShipmentLineID", "ShipmentID", "ProductID", "ExpectedQty", "Notes"]),
    Feature_Settings: objectsToRows([], ["FeatureKey", "Enabled", "AllowedRoles"]),
    Change_Log: objectsToRows([], [
      "ChangeID", "ChangeDate", "Version", "Module", "ChangeDescription",
      "ChangedBy", "TestResult", "RollbackNotes",
    ]),
    Audit_Trail: objectsToRows([], [
      "AuditID", "Timestamp", "Action", "RecordType", "RecordID", "FieldName",
      "OldValue", "NewValue", "StaffEmail", "RequestId", "Notes",
    ]),
  };
}

export function post(harness, body) {
  return harness.callJson("doPost", { postData: { contents: JSON.stringify(body) } });
}

export function loginHistoricalFounder(harness) {
  return post(harness, {
    action: "login",
    email: "founder@example.invalid",
    pin: HISTORICAL_TEST_PIN,
    userAgent: "historical-fba-local-rehearsal",
  }).data;
}

export function loginHistoricalCoFounder(harness) {
  return post(harness, {
    action: "login",
    email: "cofounder@example.invalid",
    pin: HISTORICAL_TEST_PIN,
    userAgent: "historical-fba-local-rehearsal",
  }).data;
}
