# Phase 2 Historical FBA Freebie Correction Manifest

Manifest ID: `FBA-FREEBIE-CORRECTION-2026-11-14-V1`

Status: prepared for owner review; **non-posting**

## Purpose

Nine preserved Approved FBA Dispatch movements contain 720 manually packed freebies that are absent from the corresponding Amazon shipment lines. The original movements correctly reduced `MAIN_WH`, but incorrectly added those freebies to `FBA_TRANSIT` as though Amazon would receive and track them as sellable shipment products.

Decision D-031 defines the intended treatment: physical freebies are optional promotional/sample consumption, entered from the quantity actually packed, and never become FBA Transit, FBA Receipt or Amazon FC inventory.

This manifest defines the exact historical correction boundary without authorizing a live write.

## Safety boundary

| Control | Current value |
| --- | --- |
| Apply authorized | `false` |
| Movements created now | `0` |
| Existing Approved rows edited | `0` |
| Current stock delta | `0` |
| Historical freebie units in scope | `720` |
| Sellable Syoat units in scope | `0` |
| Avee units in scope | `0` |
| Open 140-unit lip-balm receipt in scope | `0` |
| Current/new warehouse shipments in scope | `0` |

The four current shipments waiting for warehouse action are outside this manifest. Staff must continue recording them only from real shipment plans and actual physical packing.

## Evidence and correction principle

- The 24 linked historical Approved dispatches total 4,516 units in `FBA_TRANSIT`.
- Amazon shipment lines explain 3,796 sellable units.
- The remaining 720 units are exactly 400 Wooden Combs (`PRD-F001`) and 320 Bath Loofahs (`PRD-F002`).
- All nine affected Amazon shipments are Closed.
- The original Approved movement headers and lines remain immutable evidence.
- The original dispatches already reduced warehouse stock. The correction must therefore **not** reduce `MAIN_WH` again.
- `SAMPLES` is a virtual promotional/sample sink in the current stock engine. An Approved compensating movement from `FBA_TRANSIT` to `SAMPLES` removes the false Transit balance without creating stock at another physical location.

When all later corrections are safely approved, the intended aggregate effect is:

| Location/product | Wooden Comb | Bath Loofah | Total |
| --- | ---: | ---: | ---: |
| `MAIN_WH` | 0 | 0 | 0 |
| `FBA_TRANSIT` | -400 | -320 | **-720** |
| `AMAZON_FBA` and FC locations | 0 | 0 | 0 |
| Physical stock created | 0 | 0 | 0 |

## Exact non-posting manifest

Each future correction must remain linked to its source movement and shipment. Quantities below reconcile exactly to the owner-confirmed historical freebie totals.

| Seq | Source movement | ERP shipment | Amazon reference | Destination FC | Wooden Comb | Bath Loofah | Total | Posting now |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | `MOV-108` | `HSHIP-007` | `FBA15M27SQ7H` | `BOM5` | 72 | 0 | 72 | 0 |
| 2 | `MOV-125` | `HSHIP-009` | `FBA15M322TH0` | `HYD8` | 36 | 0 | 36 | 0 |
| 3 | `MOV-144` | `HSHIP-010` | `FBA15M3THR38` | `PNQ3` | 36 | 0 | 36 | 0 |
| 4 | `MOV-161` | `HSHIP-011` | `FBA15M3QDFV1` | `BLR7` | 36 | 0 | 36 | 0 |
| 5 | `MOV-218` | `HSHIP-016` | `FBA15M83W07Q` | `DEL4` | 72 | 80 | 152 | 0 |
| 6 | `MOV-225` | `HSHIP-017` | `FBA15M8SZT0N` | `BLR8` | 72 | 80 | 152 | 0 |
| 7 | `MOV-231` | `HSHIP-018` | `FBA15M9RVFSQ` | `BLR7` | 36 | 40 | 76 | 0 |
| 8 | `MOV-239` | `HSHIP-019` | `FBA15MBD201D` | `HYD8` | 40 | 40 | 80 | 0 |
| 9 | `MOV-258` | `HSHIP-020` | `FBA15MD4S73W` | `BOM5` | 0 | 80 | 80 | 0 |
| **Total** |  |  |  |  | **400** | **320** | **720** | **0** |

## Required future movement contract

The correction must not use the ordinary staff Record Movement form. A reviewed, bounded and idempotent migration should prepare one correction movement per source dispatch with:

- movement type: `Samples`;
- source: `FBA_TRANSIT`;
- destination: virtual `SAMPLES`;
- reference type: `Historical FBA Freebie Correction`;
- reference number: the exact external Amazon reference above;
- Amazon shipment ID: the exact `HSHIP-...` value above;
- notes: source Approved movement ID, manifest ID and correction reason;
- lines: only the listed `PRD-F001` and/or `PRD-F002` quantities;
- status: Draft at preparation time, with no stock effect until a separate authorized maker-checker approval.

The preparation command must be Founder-only, disabled by default and safe to retry. It must reject any changed source movement, changed shipment link, changed freebie product/type, duplicate correction, unexpected existing correction, insufficient current Transit quantity, or manifest fingerprint mismatch.

The Founder who prepares a correction cannot approve the same movement. Approval must use the existing authorized Manager-level movement path and revalidate the current Transit balance under the write lock.

## Dry-run acceptance requirements

Before any future live preparation, the dry run must report:

1. all nine source movements still Approved and linked to the exact shipment/reference;
2. exact freebie quantities of 400 Wooden Combs and 320 Bath Loofahs;
3. no sellable product, Avee product, current shipment or open lip-balm quantity included;
4. nine proposed Draft correction headers and 13 proposed lines;
5. projected `FBA_TRANSIT` change of `-720` and projected `MAIN_WH`/`AMAZON_FBA` change of `0`;
6. no negative product/location balance after all projected approvals;
7. zero existing correction movements for this manifest/source set;
8. a stable manifest fingerprint and explicit `applyEnabled: false` until separately approved.

## Production gates

No preparation or approval is authorized by this document. A later execution requires:

1. a fresh backup of the live workbook;
2. a new read-only dry run against current live rows;
3. owner review of every proposed movement and projected balance;
4. protected-branch review and passing repository verification for any migration code;
5. owner deployment of the reviewed backend;
6. a separately enabled, bounded preparation command;
7. maker-checker review before any Draft is approved;
8. immediate post-approval reconciliation of `FBA_TRANSIT`, `MAIN_WH`, `AMAZON_FBA`, movement history, recovery records and system health;
9. removal of any temporary enable property after completion.

Until those gates pass, the authoritative action from this manifest is **no write**.
