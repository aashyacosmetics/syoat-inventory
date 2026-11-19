# Inventory Exception Register

Status: Phase 2 P0 controls and refreshed inventory baseline are production-accepted through 2026-11-19. Open entries below are P1/P2 data-quality or workflow work and do not authorize production correction.

## Severity guide

- **Critical:** can corrupt new inventory or bypass a control; block deployment until corrected.
- **High:** material existing inventory cannot be explained; requires owner-reviewed remediation.
- **Medium:** weakens traceability or usability but does not independently change approved stock.
- **Low:** cleanup or consistency issue with limited operational effect.

## Open exceptions

| ID | Severity | Exception | Verified scope | Proposed owner | Target package | Required outcome |
| --- | --- | --- | --- | --- | --- | --- |
| FBA-004 | High | Historical FBA reports were converted directly into aggregate Stock Adjustments rather than explaining receipts, sales, removals, damage or loss | 29 Approved adjustments across six report dates add 1,994 and remove 293 units; their net +1,701 is the entire current ERP FBA balance | Engineering + Founder | P1 same-date snapshot supersession | Preserve the historical basis, prohibit new report-driven self-adjustment, and replace it only through a reviewed canonical event chain and same-date reconciliation |
| INV-002 | High | Historical Approved lines do not satisfy the products' current batch/expiry tracking policy | The accepted `phase2-inventory-baseline-v1.1` audit reports 739 tracking-policy exceptions; stock quantity remains valid and the exceptions require effective-date classification before remediation | Engineering + Warehouse Manager | P1/P2 movement and master-data work | Define tracking-policy effective dates and classify legacy versus genuinely invalid records before enforcement/remediation |
| INV-003 | Medium | Operational line-level cost is incomplete | The accepted `phase2-inventory-baseline-v1.1` audit reports 356 Approved lines without positive UnitCost; stock quantity is unaffected | Engineering + Founder | P1/P2 movement and master-data work | Define the operational cost source/fallback and report valuation as incomplete until resolved |
| INV-004 | Medium | Six count-generated Approved adjustments are mechanically correct but lack a specific cause/evidence note | `CNT-004`, `CNT-013`, `CNT-027`–`CNT-030`; 45 absolute units, net -33 | Founder + Warehouse Manager | WP6/WP9 | Preserve Approved history; require a reason/evidence note for new count exceptions and review historical cause only if later correction evidence appears |
| CHN-001 | High | Warehouse marketplace dispatches lack a shared order lifecycle | Sales order tables are empty while Approved movements contain 187 website, 20 Flipkart and 42 FirstCry dispatches | Engineering + Operations | WP2/WP4/WP7 | Implement D-027 only after field/status discovery and the canonical ledger; prevent duplicate dispatch/delivery/return stock effects |

## Closed exceptions

| ID | Closed evidence |
| --- | --- |
| FBA-001 | All 24 Approved historical/current FBA dispatch movements are linked to shipment records. Manifest V2 completed with zero stock delta. Later status/plan drift was resolved separately under FBA-010. |
| FBA-010 | P0-1 backend `3.2-phase2-fba-status-closure.1` and frontend `20261117-fba-status-closure.1` were owner-released and accepted. Working, In Transit, Receiving and Received are now derived from Approved linked dispatch/receipt evidence; staff cannot advance or close a shipment from Seller Central status alone. |
| INV-001 | The accepted P0-4 classifier retains `MOV-002-L001` and `MOV-003-L001` as visible known historical exceptions. Both parent movements are Rejected, the lines are excluded from stock replay, and the owner-accepted baseline has zero blocking exceptions; the missing products are not recreated and history is not edited. |
| FBA-002 | P0-3 completed through exact-fingerprint gated preparation, movement-level review and maker-checker approval. Historical/control receipt clearance totals 3,756; final Transit is 811, exactly 40 excluded Avee plus 771 newer genuine-shipment units. Warehouse and Amazon FBA were unchanged, and the final dry run and system-health audit were clean. |
| FBA-009 | Nine reviewed corrections `MOV-478`–`MOV-486` cleared 400 Wooden Combs and 320 Bath Loofahs from `FBA_TRANSIT` to `SAMPLES`. The original Approved dispatches remain immutable, Warehouse/Amazon FBA were unchanged, and new shipments continue using the deployed manual non-inferred freebie workflow. |
| FBA-003 | New report variances are Pending review/classification records; generic approve/edit/reject paths are blocked and no report import silently self-approves a stock movement. Historical approved adjustments remain evidence under FBA-004. |
| FBA-005 | Current import processing rejects a repeated report date and runs inside the existing locked/idempotent write boundary. |
| FBA-006 | FBA freshness/latest-upload state is derived from authenticated backend snapshots rather than browser-only history. |
| FBA-011 | Owner confirmed that Avee must never map to Syoat. The preserved `MOV-088-L001` Approved row remains immutable legacy evidence and is excluded from Syoat receipt/shortage/excess proof. Active FBA upload source now removes Avee rows before mapping and the backend independently prevents Avee-linked variance/snapshot writes. No Avee-to-Syoat correction is authorized or required. |
| FBA-007 | Current parser uses the newest ending-balance report date for reconciliation preview and fails repeated/ambiguous import timing visibly. |
| FBA-008 | P0-4 audit `phase2-inventory-baseline-v1.1` reused the canonical movement-effect replay and was accepted in production with zero writes, zero blockers and zero negative balances. It confirmed `MAIN_WH:15438`, `FBA_TRANSIT:811`, `AMAZON_FBA:1701` and `RETURNS:4`. |
| CNT-001 | Backend `3.2-phase2-fba-variance-resolution.1` was merged, deployed/published and accepted with genuine `CNT-086`: one authorized account classified the imported evidence, a different authorized account confirmed it, the row closed with stock unchanged and no adjustment movement, and the follow-up recovery/system-health audit was clean. |

Closing an exception requires evidence, owner decision where applicable, local/sanitized verification, and a recorded production action or explicit risk acceptance. Staging is not required under D-022.
