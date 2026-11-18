# Phase 2 Historical FBA Transit Cleanup Dry Run

Manifest ID: `FBA-TRANSIT-CLEANUP-2026-11-17-V1`

Status: read-only dry run accepted in production; local disabled-by-default Draft-preparation candidate ready for protected review; **no approval/apply action exists**

## Purpose

This P0-3 candidate refreshes the historical FBA Transit baseline after genuine dispatches and Transit-clearance receipts changed the live ledger. It validates the bounded freebie correction, excludes the preserved Avee exception, inventories existing Draft receipts and describes uncovered receipt evidence without writing a Sheet row or changing stock.

The read-only implementation is `getHistoricalFbaTransitCleanupDryRun`. It requires an authenticated Founder and the existing `amazon.shipments.historicalMigration` capability. It returns `applyAuthorized: false`, `applyActionAvailable: false` and `writesPerformed: 0`. The owner subsequently deployed it and accepted a live zero-conflict result for the 4,911-unit baseline.

## Read-only live baseline — 2026-11-17

The production workbook was read through bounded ranges in `Movement_Headers`, `Movement_Lines`, `FBA_Shipments`, `FBA_Shipment_Lines`, `Products` and `Stock_Counts`. No spreadsheet cell, Drive file, Apps Script property or application state was changed.

| Classification | Units | Explanation |
| --- | ---: | --- |
| Current `FBA_TRANSIT` | **4,911** | Current Approved movement ledger |
| Historical/control cohort still outstanding | 4,140 | Original 4,516 dispatch units less 376 Approved Transit-clearance receipts |
| New genuine shipment Transit | 771 | Approved dispatches for `SHIP-002` to `SHIP-005`; `SHIP-006` has no Approved dispatch |
| Historical freebie correction boundary | 720 | 400 Wooden Combs plus 320 Bath Loofahs |
| Eligible historical Syoat receipt evidence | 3,756 | Reviewed shipment evidence after excluding Avee |
| Approved historical/control Transit clearance | 376 | `MOV-456` 238, `MOV-457` 118 and `MOV-458` 20 |
| Eligible receipt evidence still outstanding | 3,380 | 3,756 less 376 Approved receipts |
| Existing Draft receipt evidence | 251 | `MOV-473` 92 and `MOV-476` 159; Drafts have no stock effect |
| Additional uncovered receipt evidence | 3,129 | Reviewed evidence not already Approved or represented by an existing Draft |
| Preserved legacy Avee exception | 40 | `MOV-088-L001`; never a Syoat receipt or adjustment |
| Approved legacy Amazon FBA adjustments | 29 | Separate Amazon baseline replacement/supersession design remains required |

The baseline reconciles exactly:

`4,911 = 3,380 remaining eligible receipt evidence + 40 excluded Avee + 720 historical freebies + 771 new genuine shipment Transit`.

## Freebie dry-run contract

The candidate revalidates the nine source Approved dispatches already recorded in `PHASE_2_FBA_FREEBIE_CORRECTION.md`, including preserved source-reference spelling, canonical Amazon reference, linked shipment, destination FC and exact freebie lines.

When no correction exists, the dry run proposes for owner review:

- 9 future Draft correction headers;
- 13 future correction lines;
- 400 units of `PRD-F001` Wooden Comb;
- 320 units of `PRD-F002` Bath Loofah;
- route `FBA_TRANSIT` to virtual `SAMPLES`;
- projected Transit change `-720`;
- projected Warehouse and Amazon FBA change `0`.

The local follow-up candidate can create these Drafts only through `prepareHistoricalFbaTransitCleanupDrafts`. Preparation is still non-posting: Draft status has no stock effect, and the command never approves a movement.

## Draft-preparation contract

The local backend `3.2-phase2-fba-transit-draft-preparation.1` uses one stable 33-entry sequence: freebie sequences 1–9 and historical/control receipt sequences 10–33. Entries never disappear from this sequence after a prior batch; an entry already represented by valid Draft/Approved evidence becomes a no-op. This prevents sequence drift and makes later batches safely resumable.

Every preparation request must satisfy all of these gates:

1. authenticated session with `amazon.shipments.historicalMigration` and exact role `Founder`;
2. exact `manifestFingerprint` returned by the current dry run;
3. exact `expectedCurrentTransitQty` returned by that reviewed dry run;
4. confirmation text `PREPARE:<fingerprint>`;
5. batch start within the fixed 1–33 sequence and batch size from 1 to 5;
6. temporary Script Property `SYOAT_HISTORICAL_FBA_TRANSIT_DRAFTS_APPROVED_FINGERPRINT` equal to that fingerprint;
7. a fresh zero-conflict preflight under the business-write lock.

Each created aggregate writes child lines first and the `Draft` movement header as its commit marker, then records request checkpoints and audit/log evidence. Completed request IDs replay their prior result; a failed/in-progress request blocks a new retry until its recovery record is reviewed. Manifest-level reruns do not duplicate an existing valid Draft or Approved correction.

Receipt Drafts use `FBA_TRANSIT -> FBA_ACCEPTED`. Freebie correction Drafts use `FBA_TRANSIT -> SAMPLES`. Both retain the shipment, Amazon reference, FC, source movement, manifest, fingerprint and sequence evidence. The result explicitly reports zero Warehouse delta, zero Amazon FBA delta, zero stock delta, zero approvals and zero movement-status edits.

Apps Script-editor helpers `enableHistoricalFbaTransitDraftPreparationGate` and `disableHistoricalFbaTransitDraftPreparationGate` can set/remove only this release's fixed fingerprint. They are not web-app routes. The owner must remove the gate immediately after preparation.

## Receipt-evidence dry-run contract

For the fixed 24-shipment historical/control cohort, the candidate compares each shipment plan against Approved and Draft `FBA Receipt` movements. It subtracts the fixed 40-unit Avee exclusion before proposing uncovered quantities.

The dry run:

1. never proposes an Avee quantity;
2. never creates or approves a movement;
3. treats existing Drafts as non-posting evidence and avoids proposing duplicates;
4. reports remaining product quantities per shipment;
5. keeps Transit clearance separate from `AMAZON_FBA`—future receipts use the hidden `FBA_ACCEPTED` evidence endpoint and never add FBA stock;
6. reports the 29 legacy FBA adjustments as a separate pending canonical-Amazon-baseline design.

## Fail-closed checks

Owner review is ready only when all of these remain true:

- every freebie source movement is Approved, linked and unchanged;
- both freebie products remain active `ItemType=Freebie` products;
- the exact 40-unit Avee source line remains immutable and excluded;
- Approved or Draft receipt quantities do not exceed eligible shipment evidence;
- receipt rows contain no excluded or unexpected product;
- current Transit can absorb the proposed freebie correction without becoming negative;
- historical dispatch, receipt, Avee and freebie quantities reconcile to the historical outstanding balance;
- newer-shipment Transit is derived from explicit Approved dispatch and receipt movements rather than inferred as an unexplained residual;
- historical outstanding plus movement-derived newer-shipment outstanding reconciles exactly to current Transit;
- no duplicate or conflicting historical freebie correction exists.

Any mismatch appears in `conflicts` and sets `readyForOwnerReview: false`.

## Production boundary

This local candidate authorizes no production action by itself. Before Draft preparation:

1. run the reviewed dry run against a newly refreshed live baseline;
2. create a current workbook backup;
3. review every shipment/product proposal and existing Draft;
4. merge and owner-deploy the reviewed preparation code;
5. enable only the exact reviewed fingerprint and use batches of at most five fixed sequences;
6. create Draft movements only, then immediately remove the gate;
7. confirm system health is clean and all prepared records remain Draft with stock unchanged;
8. use a different authorized approver for maker-checker review/approval in a separately confirmed step;
9. reconcile Transit, Warehouse, Amazon FBA, movement history, recovery records and system health immediately afterward;
10. separately resolve the 29-movement legacy Amazon FBA baseline without changing the rule that dated Amazon evidence controls FBA.

Until those gates pass, the required production effect is exactly zero.
