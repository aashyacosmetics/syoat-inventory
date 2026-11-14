# Phase 2 Inventory Baseline

Captured: 2026-11-13

Status: Work Package 2 read-only baseline in progress. This record contains schema, counts and sanitized aggregate diagnostics only. It does not authorize a live correction.

## Source and safety boundary

- Source: live operational workbook `1uO8M6uvz4HKIgXZOIFUJVG7qRjPL-0Tv-niPq05zeaY`.
- Method: native Google Sheets metadata plus bounded header/first-column and inventory-domain range reads.
- No Sheet, Apps Script, Drive, GitHub or production configuration write occurred.
- PINs, PIN hashes/salts, session data, staff row values, private links and attachment contents were not copied into this record or the repository.
- Quantities below use the current backend `getStockFromRows()` rule: Approved non-Reversal movements only; opening balances add to destination; combo output is produced while components are consumed; hard-coded virtual endpoints do not hold stock.
- The completed field-level schema, blank-value, status and stock-effect contract is in [INVENTORY_DATA_DICTIONARY.md](INVENTORY_DATA_DICTIONARY.md).

## Workbook inventory

The workbook has 24 visible tabs. Current inventory-domain used rows are:

| Domain | Rows |
| --- | ---: |
| Products | 14 |
| Locations | 11 |
| Combo BOM | 12 |
| Movement headers | 434 |
| Movement lines | 753 |
| Stock counts | 70 |
| FBA shipments | 27 |
| FBA shipment lines | 87 |
| FBA ledger snapshots | 233 |
| Sales orders / lines | 0 / 0 |
| Purchase orders / lines | 0 / 0 |
| Feature settings | 15 |
| List values | 11 |

The active headers match the fields currently consumed by the backend, including dedicated `FBA_Shipments.AmazonReferenceID`, internal `ShipmentID`, movement `AmazonShipmentID`, product tracking flags and count adjustment links.

## Current dictionaries

- Products: 14 Active; 12 Finished Product and 2 Freebie.
- Locations: 11 Active; 1 Warehouse, 1 In Transit, 1 Marketplace, 1 Returns, 4 Virtual and 3 External.
- Movement status: 419 Approved and 15 Rejected. No Draft header was present in this snapshot.
- Stock-count status: 40 Approved, 6 Rejected and 24 Pending.
- FBA shipment status: 24 In Transit and 3 Working.
- No duplicate ProductID, SKU, FNSKU, Amazon ASIN, LocationID, MovementID, MovementLineID, CountID, ShipmentID, AmazonReferenceID or ShipmentLineID was found.

## Canonical current stock replay

| Location | Units |
| --- | ---: |
| `MAIN_WH` | 16,384 |
| `AMAZON_FBA` | 1,701 |
| `FBA_TRANSIT` | 4,516 |
| `RETURNS` | 4 |

- 41 product/location balance rows were produced.
- No negative balance was found.
- Five explicit zero Returns balances were produced; zero is not treated as missing.
- These totals match the current ERP dashboard evidence and become the starting comparison for Work Package 4. They do not prove the historical cause of every quantity.

## Approved movement evidence

| Movement type | Approved movements | Lines | Units |
| --- | ---: | ---: | ---: |
| Opening Balance – WH | 9 | 9 | 7,668 |
| Stock In | 8 | 9 | 14,078 |
| Website – WH Ship | 187 | 323 | 413 |
| Flipkart Dispatch | 20 | 29 | 35 |
| Firstcry Dispatch | 42 | 56 | 62 |
| FBA Dispatch | 24 | 89 | 4,516 |
| Return Received | 11 | 18 | 21 |
| Returns – to WH | 45 | 60 | 347 |
| Returns – Damaged | 1 | 1 | 1 |
| Samples | 20 | 59 | 135 |
| Stock Adjustment | 40 | 40 | 2,340 |
| Assemble Combo | 12 | 33 | 1,430 line units |

Combo line units include consumed components and produced combo units and therefore are not a net company-stock measure.

## Marketplace baseline for D-027

- The Sales Order and Sales Order Line tables are empty even though the movement ledger contains 187 approved website shipments, 20 approved Flipkart dispatches and 42 approved FirstCry dispatches.
- Existing channel movements therefore prove inventory activity but do not yet provide the shared order lifecycle required for reservation, dispatch, delivery, cancellation and return reconciliation.
- No Myntra or JioMart order structure is present in the current workbook snapshot.
- Work Package 2 must next document each available platform report/API field and map its statuses without changing stock. FirstCry remains the first planned bridge implementation after the canonical ledger foundation.

## FBA alignment snapshot

- 27 shipment headers and 87 lines are present.
- 24 approved FBA dispatch movements are linked to shipment records; the completed historical-linking migration is reflected in the current data.
- At the workbook capture, three plans (`SHIP-002` to `SHIP-004`) still showed Working and had no linked dispatch movement. The later 2026-11-13 Amazon export shows an external In transit workflow event for all three, but the subsequent event screenshots do not prove physical pickup; FBA-010 tracks this evidence gap.
- Shipment expected quantities total 4,367 units, while approved FBA dispatch lines total 4,516 units. This difference is not corrected here; shipment-by-shipment timing and historical scope must be reconciled before interpretation.
- No FBA Receipt movement exists, so all 4,516 dispatched units remain in `FBA_TRANSIT` under the current ledger rules.
- Snapshot rows total 8,957 units across history and are evidence by report date/FC, not a current-stock total to compare directly with the ledger.

### Transit-to-shipment line reconciliation

The 24 linked Approved FBA Dispatch movements were compared product-by-product with their linked shipment lines:

- Approved dispatch total: 4,516 units.
- Linked shipment-plan total for those 24 dispatches: 3,796 units.
- Fifteen linked dispatches match their shipment lines exactly.
- Nine historical dispatches contain 720 additional movement-line units that are absent from Amazon shipment lines.
- All 720 additional units are active Freebie products: 400 Wooden Combs (`PRD-F001`) and 320 Bath Loofahs (`PRD-F002`).
- The affected linked records are `HSHIP-007`, `HSHIP-009`, `HSHIP-010`, `HSHIP-011` and `HSHIP-016` through `HSHIP-020`.
- The three unlinked ERP plans (`SHIP-002`–`SHIP-004`) contain 571 planned units and have no Approved dispatch. They do not affect the current ERP Transit balance. Amazon reports an In transit workflow state without pickup evidence, so FBA-010 treats dispatch as unverified rather than missing.

The historical linking manifest intentionally preserved Approved movement lines and built shipment evidence only from reviewed Amazon contents. Therefore, the 720-unit difference is not a failed migration. D-031 now confirms the stock-model rule: the warehouse team decides and enters each actual freebie quantity manually; some shipments/products receive freebies and others do not. These optional promotional/sample units are consumed at the warehouse, are never inferred automatically and must not remain as independent FBA Transit inventory. A separate reviewed correction is still required for the preserved historical Transit lines.

Available closed-shipment evidence remains unchanged and non-posting:

| Movement | Expected | Located | Difference | Current treatment |
| --- | ---: | ---: | ---: | --- |
| `MOV-088` | 62 | 24 | -38 | Receipt shortage evidence only |
| `MOV-102` | 165 | 205 | +40 | Receipt excess evidence only |
| `MOV-108` | 235 | 236 | +1 | Receipt excess evidence only |

All historical shipment headers remain `In Transit` because Amazon Closed/Receiving evidence cannot create stock effects without an approved FBA Receipt. The next read-only step is to obtain current Seller Central shipment status/received quantities for all 24 linked shipments and determine the accepted quantity by product/FC.

### Current Seller Central inventory cross-check

A read-only Amazon India inventory-summary query on 2026-11-13 matched all 12 active sellable Syoat ASINs. It reported:

- 1,592 currently fulfillable units;
- 378 inbound Working units;
- 761 inbound Shipped units; and
- 140 inbound Receiving units.

The ERP `AMAZON_FBA` ledger balance is 1,701, which is 109 units above the live Seller Central fulfillable figure. This is a date/scope comparison, not an adjustment instruction: the ERP balance is based on the last controlled report/movement snapshot, while Seller Central inventory is a later operational view affected by continuing fulfilment activity. The difference must be reconciled using a same-date report before it can be classified.

The connected read-only Seller Central interface exposes inventory summaries but not shipment-level expected/received quantities or shipment status history. It therefore cannot close the 24 historical Transit records by itself. A current shipment export or equivalent Seller Central evidence containing Amazon reference, status, expected quantity, received/located quantity and destination FC is still required.

### Current shipment export reconciliation

The 2026-11-13 Seller Central shipment export contains 250 rows through a latest update of 2026-11-12. It includes shipment reference, status, destination FC, expected units and located units. All 24 ERP-linked references were found:

- ERP shipment-line expected quantity: 3,796 units.
- Amazon expected quantity for the same references: 3,796 units.
- Amazon located quantity: 3,659 units.
- Current linked statuses: 22 Closed and 2 Receiving.
- Twenty shipments have no quantity variance; they contain 3,096 located units.
- Four shipments have receipt variance: the current control shipment is Receiving at 238 expected / 98 located (-140), and the three preserved Closed variances are 62 / 24 (-38), 165 / 205 (+40) and 235 / 236 (+1).

The 22 Closed references total 3,460 expected and 3,463 located units, a net +3 that contains both shortage and excess events and must not be netted into one adjustment. The two Receiving references total 336 expected and 196 located; one is complete at 98 / 98 while the control shipment remains incomplete at 238 / 98. Product-level Contents evidence is required for all four non-zero variances before accepted quantities can be allocated by product.

Product-level Contents evidence supplied on 2026-11-13 allocates the four variances as follows:

| Amazon reference | Status | Product-level result | Treatment boundary |
| --- | --- | --- | --- |
| `FBA15MRFBLH8` | Receiving | Syoat shampoo 98 / 98; Syoat lip balm 140 / 0 | Shampoo is located. Lip balm remains an open Receiving quantity, not a final shortage. |
| `FBA15M1Z6GTC` | Closed | Legacy Avee shampoo 40 / 0; Syoat shampoo pack of 2 is 12 / 12; Syoat Hair Care Combo is 10 / 12 (+2) | The Avee shortage must not map to active Syoat shampoo. Preserve the +2 Syoat combo evidence separately. |
| `FBA15M23FXSW` | Closed | Syoat hair oil 36 / 36; Syoat shampoo 80 / 120 (+40); Syoat body lotion 49 / 49 | The +40 excess belongs entirely to Syoat shampoo. |
| `FBA15M27SQ7H` | Closed | Hair oil 72 / 72; shampoo pack of 2 is 24 / 25 (+1); shampoo 80 / 80; body lotion 49 / 49; Hair Care Combo 10 / 10 | The +1 excess belongs entirely to the shampoo pack of 2. The separate 72-comb Transit exception remains under FBA-009. |

`MOV-088-L001` records 40 units of active Syoat shampoo (`PRD-P001`), while Seller Central shows the corresponding expected line as the legacy Avee ASIN. The completed historical manifest preserved that movement line and therefore did not cause the mismatch, but it also cannot be used as evidence that Syoat shampoo was received or lost. D-028 keeps Avee outside the active Syoat ledger and requires a separate reviewed historical treatment.

Carrier-update evidence supplied for the same four variance shipments confirms that each was physically picked up by the courier. The three historical variance shipments later became Closed. The current control shipment remains Receiving; its three boxes show delayed and/or return-routing events in the carrier timeline, consistent with keeping the 140 unlocated lip balms open rather than declaring a final shortage. Carrier evidence proves handoff, not product-level Amazon acceptance, and does not itself create a receipt movement.

The export also exposes a separate current-process exception:

- ERP plans `SHIP-002`–`SHIP-004` still say Working, while their Amazon references show an In transit workflow event for 140, 218 and 213 expected units (571 total).
- None of those three references exists in an Approved movement, so the ERP contains no dispatch stock effect for them. Current Amazon event screenshots show the In transit event about 10–11 minutes after creation, zero units located and no Delivered, Checked In, Receiving, carrier, tracking or pickup event. They do not prove warehouse handoff.
- The owner confirmed on 2026-11-13 that none of the three shipments has been handed to the courier. Planned pickup is 2026-11-19 for `FBA15MV3JWHZ` and 2026-11-28 for `FBA15MVVJWB2` and `FBA15MW115K6`. Their ERP `Working` state is therefore correct and no movement is due before physical handover.
- Amazon also contains one additional In-transit shipment absent from both ERP shipment headers and movements: `FBA15MW9M3TG`, HYD8, 200 expected and 0 located. Three Amazon-only Working plans are also absent: `FBA15MV7CDHJ`, HYD3, 150 units; `FBA15MRCH332`, BOM5, 140 units; and `FBA15MP17F6M`, BLR7, 98 units. The Working plans total 388 units.
- Owner classification on 2026-11-13: staff will create only the `FBA15MW9M3TG` ERP shipment plan on 2026-11-14. `FBA15MV7CDHJ`, `FBA15MRCH332` and `FBA15MP17F6M` are excluded from ERP action under D-030. Their external rows are retained as evidence and must not be interpreted as ERP stock.

These are not part of the completed historical-linking migration. They show that Amazon workflow status alone is insufficient dispatch evidence. D-029 requires the linked FBA Dispatch to be recorded only at actual courier handover. No plan, status or stock quantity was changed during this review.

## Verified exceptions from this pass

- Two rejected historical lines, `MOV-002-L001` and `MOV-003-L001`, reference absent products `PRD-F003` and `PRD-F004`. They have no stock effect because their headers are Rejected, but the history needs an explicit retention/legacy-reference rule.
- 611 Approved lines for products currently flagged `TrackBatch=TRUE` and `TrackExpiry=TRUE` have blank batch and expiry values. This may include records created before the current tracking policy; Work Packages 3 and 7 must define effective-date and legacy handling before classifying them as invalid.
- 262 Approved lines have no positive line-level UnitCost. Stock quantity is unaffected, but operational valuation is incomplete.
- 24 stock counts remain Pending and require classification before any count/adjustment remediation.
- The 4,516-unit Transit balance remains unexplained by receipts and is the highest material reconciliation item. Historical shipment linking improved metadata only and did not change this balance.

## Pending stock-count classification

All 24 Pending rows are imported FBA report-variance evidence at `AMAZON_FBA`. None is a routine physical warehouse count, none has an invalid product/location, and every saved `SystemQty` still equals the current movement-ledger quantity. They must not use the generic stock-count approval path.

| Report date | Count IDs | Classified | Unclassified | Net difference | Absolute drift | Baseline treatment |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 2026-10-26 | `CNT-047`–`CNT-054` | 4 | 4 | +360 | 444 | Historical evidence; four receipt classifications exist; later reports supersede it as the current snapshot |
| 2026-11-01 | `CNT-055`–`CNT-062` | 0 | 8 | +169 | 403 | Historical evidence superseded by the 2026-11-08 report |
| 2026-11-08 | `CNT-063`–`CNT-070` | 0 | 8 | +92 | 432 | Latest actionable report evidence; reconcile to detailed ledger, shipments, receipts, removals and loss/damage before classification |

Across all Pending evidence rows there are 12 positive and 12 negative differences, net +621 and absolute historical drift 1,279. These figures span three snapshots and must not be summed into a stock adjustment. Only the newest report can represent current external evidence; older rows remain immutable historical evidence until a dedicated superseded/resolved state is designed.

Read-only classification outcome:

- No count should be approved, rejected or edited as part of Work Package 2.
- The 16 rows from 2026-10-26 and 2026-11-01 need an explicit non-stock-changing `Superseded`/resolved-evidence workflow rather than generic rejection.
- The eight 2026-11-08 rows remain open for evidence-backed FBA reconciliation and D-020 classification.
- Receipt classification alone does not create a receipt movement or clear Transit; shipment-linked accepted quantities remain required.

## Historical Approved Stock Adjustment classification

All 40 Approved `Stock Adjustment` movements were matched to their single movement line and, where applicable, their linked count or FBA snapshot evidence. Their 2,340 absolute line units split into two fundamentally different families.

### Count-generated corrections — 11 movements

Every count-generated movement has the same product, absolute quantity and direction as its linked Approved count difference. Together they represent 53 absolute units and a net stock change of -37 units.

| Classification | Count / movement references | Net units | Assessment |
| --- | --- | ---: | --- |
| Explained physical/process correction | `CNT-001` / `MOV-034`, `CNT-002` / `MOV-035`, `CNT-003` / `MOV-057` | -6 | Notes identify an Avee return removal, an unentered order and a wrong entry. Preserve as explained historical corrections. |
| Explicit phantom-balance correction | `CNT-036` / `MOV-162` | +1 | Notes identify the exact earlier movement mismatch that created a negative Returns balance. Preserve as a traced system correction. |
| Owner-verified replacement count | `CNT-046` / `MOV-381` | +1 | Previously verified replacement count after stale-count cleanup. Preserve as confirmed count evidence. |
| Mechanically linked but weakly explained | `CNT-004`, `CNT-013`, `CNT-027`–`CNT-030` and their six linked movements | -33 | Count math and movement links are correct, but the rows have no specific cause/evidence note. Preserve the Approved history; classify the missing narrative as a traceability exception rather than reversing stock. |

The legacy endpoints `SUPPLIER` and `DAMAGE` express positive/negative adjustment direction. They do not prove that a supplier receipt or physical damage event caused the variance.

### FBA report-driven snapshot synchronizations — 29 movements

These movements use `SUPPLIER -> AMAZON_FBA` for positive report differences and `AMAZON_FBA -> DAMAGE` for negative differences. They are not independently evidenced receipts, sales, removals or losses. They are legacy report-to-ledger synchronizations that forced the aggregate FBA ledger toward successive report snapshots.

| Report date | Movements | Added | Removed | Net | Absolute drift |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-07-11 | 4 | 699 | 0 | +699 | 699 |
| 2026-07-18 | 4 | 5 | 140 | -135 | 145 |
| 2026-07-19 | 4 | 20 | 12 | +8 | 32 |
| 2026-07-26 | 5 | 128 | 29 | +99 | 157 |
| 2026-08-02 | 5 | 206 | 6 | +200 | 212 |
| 2026-10-21 | 7 | 936 | 106 | +830 | 1,042 |
| **Total** | **29** | **1,994** | **293** | **+1,701** | **2,287** |

The retained snapshot table begins at 2026-07-26. Its totals are 671 units on 2026-07-26, 871 on 2026-08-02 and 1,701 on 2026-10-21, exactly matching the cumulative net of these adjustments at each retained date. The earlier three movement batches retain report-date/file evidence in their headers but have no corresponding rows in the current snapshot table.

Classification outcome:

- preserve all 29 as legacy snapshot-synchronization history;
- do not interpret `SUPPLIER` or `DAMAGE` as the real business cause;
- do not reverse or net them while they form the entire current 1,701-unit ERP FBA balance;
- prohibit this legacy pattern for new report imports; current imports remain Pending evidence only;
- replace their ongoing role only through a reviewed canonical chain of dispatch, receipt, sale/removal/damage evidence and a same-date reconciliation manifest.

## Work Package 2 remaining read-only work

The non-posting receipt/shortage/excess manifest is complete in [PHASE_2_FBA_RECEIPT_MANIFEST.md](PHASE_2_FBA_RECEIPT_MANIFEST.md). It classifies 3,616 matched Syoat receipt candidates, 43 Syoat excess units, 140 open Receiving lip balms, 40 excluded Avee units and 720 unresolved freebie units with zero posting authorization and zero stock delta.

1. Implement D-031's manual freebie input and consumption contract, then prepare the separate non-posting historical correction for the 720 freebie units. Also design the separate FBA-011 historical Avee mapping treatment. No inferred receipt or adjustment is permitted.
2. Obtain a same-date Amazon report and design the canonical replacement for the 29 snapshot adjustments before any receipt can post without double counting FBA stock.
3. At the confirmed pickup dates, verify actual courier handover and record one linked FBA Dispatch for each of `FBA15MV3JWHZ`, `FBA15MVVJWB2` and `FBA15MW115K6`; do not post in advance. On 2026-11-14 staff creates the shipment plan for `FBA15MW9M3TG` without creating an early dispatch. Keep `FBA15MV7CDHJ`, `FBA15MRCH332` and `FBA15MP17F6M` excluded unless the owner explicitly reactivates them.
4. Document marketplace report/API availability and status mappings for FirstCry, Flipkart, Myntra, JioMart and website/Shopify.
5. Resolve the controlled contract gaps recorded in the data dictionary, including the effective-date rule for batch/expiry requirements and the operational UnitCost fallback/exception policy.
6. Add a sanitized reproducible analyzer/test fixture for the approved movement-effect matrix before Work Package 4 implementation.

Production correction remains blocked until the applicable exception has evidence, an owner-approved plan, a current backup, reviewed dry-run, bounded/idempotent execution and immediate reconciliation.
