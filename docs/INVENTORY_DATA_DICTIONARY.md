# Inventory Data Dictionary

Captured: 2026-11-13

Status: Phase 2 Work Package 2 read-only contract. This document describes the current live schema and the stricter contract for future entries. It does not authorize a Sheet migration, historical rewrite or stock correction.

## Source and interpretation

- Live source: the owner-designated Syoat Inventory ERP workbook.
- Evidence: exact live header rows, representative values, the active `Code.gs` behavior, automated contract tests and accepted decisions.
- `Required` means required for every new row.
- `Conditional` means required only when the stated workflow applies.
- `Optional` means a blank value has a defined no-value meaning.
- `Legacy blank` means historical blanks are retained, but new rows must follow the stricter contract.
- Identifiers are text even when they contain only digits. Quantities and money-like operational values are numbers. Boolean flags must be explicit `TRUE` or `FALSE`, not blank.
- Dates/times are stored as Sheet date/time values and interpreted in the configured business-timezone contract. The workbook currently reports `America/Los_Angeles`; changing it remains blocked pending owner review because Syoat operates in India.

The movement ledger is the quantity source of truth. Product, location, shipment, count, snapshot and configuration rows provide master data, evidence and workflow state; they do not silently replace movement-derived stock.

## Products

Live header order:

`ProductID`, `SKU`, `ProductName`, `VariantName`, `Category`, `Unit`, `MPN `, `FNSKU`, `AmazonASIN`, `ShopifyVariantID`, `ShiprocketSKU`, `ReorderLevel`, `UnitCost`, `GST %`, `MRP`, `Status`, `ItemType`, `HSNCode`, `DefaultBoxSize`, `DefaultPackSize`, `DefaultUOM`, `Sellable`, `TrackInventory`, `TrackBatch`, `TrackExpiry`, `CreatedAt`, `CreatedBy`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `ProductID` | Text ID | Required | Immutable ERP product key; backend-generated. |
| `SKU` | Text | Required | Unique operating SKU controlled by the product master. |
| `ProductName` | Text | Required | Staff-facing product name. |
| `VariantName` | Text | Optional | Variant descriptor when applicable. |
| `Category` | Text | Optional | Operational catalogue grouping. |
| `Unit` | Text | Conditional | Human-readable unit; required when quantity meaning is not obvious from the product. |
| `MPN ` | Text | Optional | Manufacturer part number. The live header has a trailing space; preserve it until a reviewed schema migration. |
| `FNSKU` | Text | Conditional | Amazon fulfilment identifier; required for an FBA-mapped product. |
| `AmazonASIN` | Text | Conditional | Amazon catalogue identifier; required for an active Amazon listing. |
| `ShopifyVariantID` | Text | Conditional | Shopify variant identifier when mapped. |
| `ShiprocketSKU` | Text | Conditional | Shiprocket identifier when mapped. |
| `ReorderLevel` | Number >= 0 | Required; zero allowed | Operational alert threshold, not an accounting value. |
| `UnitCost` | Number >= 0 | Legacy blank; required or exception-classified for new tracked stock | Operational inventory valuation input only. It is not a financial ledger. |
| `GST %` | Number >= 0 | Optional | Catalogue/tax reference only; outside daily accounting. |
| `MRP` | Number >= 0 | Optional | Catalogue/display reference. |
| `Status` | Enum | Required | Product availability state. New contract: `Active` or `Archived`. Archived products remain addressable in history. |
| `ItemType` | Enum/text | Required | Current values include `Finished Product` and `Freebie`; governs workflow, not stock arithmetic by itself. |
| `HSNCode` | Text | Optional | Catalogue reference; retain leading zeroes. |
| `DefaultBoxSize` | Text/number | Optional | Packing default. |
| `DefaultPackSize` | Number > 0 | Conditional | Required when a pack conversion is used. |
| `DefaultUOM` | Text | Conditional | Required with a default pack conversion. |
| `Sellable` | Boolean | Required | Whether the item can be offered for sale. |
| `TrackInventory` | Boolean | Required | Whether the item participates in inventory tracking. |
| `TrackBatch` | Boolean | Required | New-entry batch requirement policy. Historical blanks in movement lines need an effective-date rule before remediation. |
| `TrackExpiry` | Boolean | Required | New-entry expiry requirement policy. Historical blanks need an effective-date rule before remediation. |
| `CreatedAt` | Date-time | Required; system-generated | Product-master creation timestamp. |
| `CreatedBy` | Text identity | Required; system-generated | Authenticated creator identity. |

## Locations

Live header order: `LocationID`, `LocationName`, `LocationType`, `IsVirtual`, `Status`, `Notes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `LocationID` | Text ID | Required | Immutable stock-location key. |
| `LocationName` | Text | Required | Staff-facing name. |
| `LocationType` | Enum/text | Required | Current types include Warehouse, In Transit, Marketplace, Returns, Virtual and External. |
| `IsVirtual` | Boolean | Required | Distinguishes operational endpoints that do not hold physical stock. |
| `Status` | Enum | Required | New contract: `Active` or `Archived`; archival hides normal entry but preserves history. |
| `Notes` | Text | Optional | Operational explanation. |

Hard-coded virtual movement endpoints (`SUPPLIER`, `CUSTOMER`, `WEBSITE_SALES`, `FLIPKART_SALES`, `FIRSTCRY_SALES`, `SAMPLES`, `DAMAGE`) may be valid transaction endpoints without being stock-holding locations. `MAIN_WH`, `FBA_TRANSIT`, `AMAZON_FBA` and `RETURNS` are distinct stock locations.

## Combo BOM

Live header order: `ComboProductID`, `ComponentProductID`, `Qty`, `Notes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `ComboProductID` | Product ID | Required | Finished combo product. |
| `ComponentProductID` | Product ID | Required | Component consumed by assembly. |
| `Qty` | Number > 0 | Required | Component units consumed per combo unit. |
| `Notes` | Text | Optional | Assembly clarification. |

A BOM definition has no stock effect. Only an Approved `Assemble Combo` movement consumes components and creates combo stock.

## Movement headers

Live header order:

`MovementID`, `MovementDateTime`, `MovementType`, `SourceLocationID`, `DestinationLocationID`, `ReferenceType`, `ReferenceNumber`, `AmazonShipmentID`, `AmazonDestinationFC`, `CarrierTrackingNumber`, `DocumentFile`, `Status`, `EnteredByEmail`, `ApprovedByEmail`, `ApprovedAt`, `ReversalOfMovementID`, `PurchaseOrderID`, `Notes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `MovementID` | Text ID | Required | Immutable backend-generated transaction ID. |
| `MovementDateTime` | Date-time | Required; system-generated | Transaction creation time. |
| `MovementType` | Enum/text | Required | Defines the approved ledger effect and workflow. Unknown types must fail visibly. |
| `SourceLocationID` | Location/endpoint ID | Required | Source of the movement; may be a controlled virtual endpoint. |
| `DestinationLocationID` | Location/endpoint ID | Required | Destination of the movement; may be a controlled virtual endpoint. |
| `ReferenceType` | Text | Conditional | Required when the workflow has an external/source-document class. |
| `ReferenceNumber` | Text | Conditional | Source evidence such as order, invoice or Amazon reference; preserve exactly after normalization rules. |
| `AmazonShipmentID` | Internal shipment ID | Conditional | Required for linked FBA dispatch/receipt workflow; stores `FBA_Shipments.ShipmentID`, not the Amazon reference. |
| `AmazonDestinationFC` | Text | Conditional | Required for an FBA dispatch/receipt when known. |
| `CarrierTrackingNumber` | Text | Conditional | Required when carrier evidence is available or mandated by the movement workflow. |
| `DocumentFile` | Private file reference | Optional | Private evidence reference; never a public URL in normal staff output. |
| `Status` | Enum | Required | Current transaction state; see the status matrix below. |
| `EnteredByEmail` | Text identity | Required; system-generated | Authenticated maker. |
| `ApprovedByEmail` | Text identity | Conditional | Required for Approved/Rejected/Reversed manager action where the workflow records a reviewer. |
| `ApprovedAt` | Date-time | Conditional | Required with the approval/rejection/reversal decision. |
| `ReversalOfMovementID` | Movement ID | Conditional | Required only for a traceable reversing record/relationship. |
| `PurchaseOrderID` | Purchase-order ID | Conditional | Required only when linked to a purchase order. |
| `Notes` | Text | Optional | Operational reason/evidence; mandatory where the specific exception workflow requires a reason. |

## Movement lines

Live header order: `MovementLineID`, `MovementID`, `ProductID`, `BatchNumber`, `ManufacturingDate`, `ExpiryDate`, `Quantity`, `UnitCost`, `LineNotes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `MovementLineID` | Text ID | Required | Immutable backend-generated line key. |
| `MovementID` | Movement ID | Required | Parent header link. |
| `ProductID` | Product ID | Required | Product moved. Historical lines retain their original reference even if the master is later archived. |
| `BatchNumber` | Text | Conditional | Required when the product/process requires batch tracking. |
| `ManufacturingDate` | Date | Conditional | Required when captured by the batch/expiry policy. |
| `ExpiryDate` | Date | Conditional | Required when expiry tracking applies; cannot precede manufacturing date. |
| `Quantity` | Number > 0 | Required | Absolute line quantity. Direction comes from the header/source/destination and movement type. |
| `UnitCost` | Number >= 0 | Legacy blank; required or exception-classified for new inbound/tracked stock | Operational valuation input only. Blank does not change quantity but makes valuation incomplete. |
| `LineNotes` | Text | Optional | Line-specific evidence. |

## Stock counts

Live header order:

`CountID`, `CountDateTime`, `LocationID`, `ProductID`, `SystemQty`, `PhysicalQty`, `Difference`, `CountedByEmail`, `ApprovedByEmail`, `Status`, `Reason`, `AdjustmentMovementID`, `Notes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `CountID` | Text ID | Required | Immutable count/evidence key. |
| `CountDateTime` | Date-time | Required; system-generated | Observation/import time. |
| `LocationID` | Location ID | Required | Counted/evidenced stock location. |
| `ProductID` | Product ID | Required | Counted/evidenced product. |
| `SystemQty` | Number | Required | Ledger quantity captured at count creation; must be revalidated before any approval. |
| `PhysicalQty` | Number >= 0 | Required | Observed/imported quantity. |
| `Difference` | Number | Required; zero allowed | `PhysicalQty - SystemQty`; derived, not manually authoritative. |
| `CountedByEmail` | Text identity | Required; system-generated | Authenticated counter/import actor. |
| `ApprovedByEmail` | Text identity | Conditional | Required for reviewed resolution/approval. |
| `Status` | Enum | Required | Current values are Pending, Approved and Rejected. Imported FBA evidence needs a future non-stock-changing Superseded/Resolved state. |
| `Reason` | Text/classification | Required for new exceptions | Evidence category, not automatic permission to change stock. |
| `AdjustmentMovementID` | Movement ID | Conditional | Present only when a reviewed count creates a traceable adjustment movement. |
| `Notes` | Text | Optional | Review evidence. |

A count row never changes stock directly. Only its separately created Approved adjustment movement can affect the ledger. Imported FBA report-variance rows must not use generic count approval.

## FBA shipments

Live header order: `ShipmentID`, `AmazonReferenceID`, `ShipmentDateTime`, `DestinationFC`, `Status`, `CarrierTrackingNumber`, `ExpectedDeliveryDate`, `CreatedByEmail`, `ClosedAt`, `Notes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `ShipmentID` | Text ID | Required | Immutable ERP plan ID (`SHIP-...` or preserved historical ID). |
| `AmazonReferenceID` | Text | Required | Uppercase, unique Seller Central shipment/reference value. |
| `ShipmentDateTime` | Date-time | Required; system-generated | ERP plan creation time. |
| `DestinationFC` | Text | Required | Amazon fulfilment-centre destination. |
| `Status` | Enum | Required | Exact active workflow: `Working`, `Shipped`, `In Transit`, `Received`. Forward-only in current code. |
| `CarrierTrackingNumber` | Text | Conditional | Required when carrier evidence exists or the workflow mandates it. |
| `ExpectedDeliveryDate` | Date | Optional | Planning evidence; blank means not recorded, not zero. |
| `CreatedByEmail` | Text identity | Required; system-generated | Authenticated plan creator. |
| `ClosedAt` | Date-time | Conditional | Required only when the ERP plan reaches `Received`. |
| `Notes` | Text | Optional | Operational evidence. |

Shipment status alone has no stock effect. Under D-029, stock moves from warehouse to FBA Transit only through an Approved linked FBA Dispatch recorded at actual physical courier handover.

## FBA shipment lines

Live header order: `ShipmentLineID`, `ShipmentID`, `ProductID`, `ExpectedQty`, `Notes`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `ShipmentLineID` | Text ID | Required | Immutable shipment-line key. |
| `ShipmentID` | Shipment ID | Required | Parent ERP shipment plan. |
| `ProductID` | Product ID | Required | Planned product. |
| `ExpectedQty` | Number > 0 | Required | Planned quantity; planning only until a movement is Approved. |
| `Notes` | Text | Optional | Product-line evidence. |

## FBA ledger snapshots

Live header order: `SnapshotID`, `ReportDate`, `ProductID`, `FC`, `Qty`, `Sold`, `UploadedByEmail`, `UploadedAt`

| Field | Type | Blank rule for new rows | Meaning / source of truth |
| --- | --- | --- | --- |
| `SnapshotID` | Text ID | Required | Immutable import/snapshot line key. |
| `ReportDate` | Date | Required | Seller report date represented by the snapshot. |
| `ProductID` | Product ID | Required | Mapped ERP product. Unmapped identifiers fail visibly. |
| `FC` | Text | Required | Amazon fulfilment centre. |
| `Qty` | Number >= 0 | Required; zero allowed | Reported ending/located quantity for the report contract. |
| `Sold` | Number >= 0 | Required; zero allowed | Report metric when supplied by the accepted report contract. |
| `UploadedByEmail` | Text identity | Required; system-generated | Authenticated importer. |
| `UploadedAt` | Date-time | Required; system-generated | Import time. |

Snapshots are external evidence. They may create Pending review variances, never a self-approved stock movement.

## Inventory configuration

### Feature settings

Live header order: `FeatureKey`, `DisplayName`, `Enabled`, `SortOrder`, `AllowedRoles`, `Notes`

`FeatureKey`, `DisplayName`, `Enabled`, `SortOrder` and `AllowedRoles` are required for a new setting; `Notes` is optional. Backend authorization remains authoritative even when a feature is hidden.

### Lists

Live header order: `ListName`, `Value`, `Meaning`

`ListName` and `Value` are required; `Meaning` should be required for new operational values. The live list currently contains `Status: Active/Archived` and movement values `Draft`, `Submitted`, `Approved`, `Reversed`. This list is stale: current code/live records use `Rejected`, and current new movements do not use `Submitted`. Do not use the stale row as authorization and do not edit it without a reviewed configuration migration.

## Status and stock-effect matrix

| Record | Status | Direct stock effect | Rule |
| --- | --- | --- | --- |
| Product / Location | `Active` | No | Available for current entry. |
| Product / Location | `Archived` | No | Hidden from normal entry; history remains valid. |
| Movement | `Draft` | No | Editable pending transaction. |
| Movement | `Approved` | Yes, except `MovementType=Reversal` | Only Approved non-Reversal movements participate in the current ledger replay. |
| Movement | `Rejected` | No | Retained evidence; never deleted. |
| Movement | `Reversed` | No | Original effect is removed by the current replay rule; reversal remains traceable. |
| Stock count | `Pending` | No | Awaiting evidence/review. |
| Stock count | `Approved` | No by itself | Only the linked Approved adjustment movement affects stock. |
| Stock count | `Rejected` | No | Retained rejected evidence. |
| FBA shipment | `Working` | No | Plan only. |
| FBA shipment | `Shipped` | No | Workflow state only; D-029 still requires an Approved dispatch at physical handover. |
| FBA shipment | `In Transit` | No | Workflow state only. |
| FBA shipment | `Received` | No | Closure state only; accepted receipt quantity requires an Approved FBA Receipt movement. |
| FBA snapshot | Imported | No | External evidence only. |

## Known contract gaps requiring later controlled work

1. The `Products` header `MPN ` contains a trailing space.
2. The workbook timezone conflicts with the India business timezone.
3. The `Lists` movement-status vocabulary is stale (`Submitted` present, `Rejected` absent).
4. Batch/expiry flags have no recorded enforcement effective date; historical blanks must not be bulk-invalidated.
5. Approved historical lines with blank/non-positive UnitCost require an operational fallback or exception policy.
6. FBA report evidence needs a non-stock-changing Superseded/Resolved lifecycle instead of generic count rejection.
7. Historical absent/archived product references must remain readable even when blocked from new entry.
8. External marketplace status vocabularies must be mapped explicitly; unknown statuses fail without changing stock.

No gap above is permission to edit production. Each correction requires backup, reviewed migration/dry run, idempotent execution and post-change reconciliation.
