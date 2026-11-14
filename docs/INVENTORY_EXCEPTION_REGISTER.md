# Inventory Exception Register

Status: Work Package 2 read-only discovery in progress. This register does not authorize production correction.

## Severity guide

- **Critical:** can corrupt new inventory or bypass a control; block deployment until corrected.
- **High:** material existing inventory cannot be explained; requires owner-reviewed remediation.
- **Medium:** weakens traceability or usability but does not independently change approved stock.
- **Low:** cleanup or consistency issue with limited operational effect.

## Open exceptions

| ID | Severity | Exception | Verified scope | Proposed owner | Target package | Required outcome |
| --- | --- | --- | --- | --- | --- | --- |
| FBA-002 | High | FBA transit has never been cleared by a receipt movement | 0 FBA Receipt movements; the non-posting manifest explains all 4,516 units as 3,616 matched Syoat receipt candidates, 140 open lip balms, 40 legacy-mapping units and 720 freebies | Founder + Warehouse Manager | Phase 2 bridge / WP9 history | Preserve the zero-posting manifest; replace the snapshot-adjustment basis and resolve FBA-009/FBA-011 before designing any idempotent receipt apply |
| FBA-004 | High | Historical FBA reports were converted directly into aggregate Stock Adjustments rather than explaining receipts, sales, removals, damage or loss | 29 Approved adjustments across six report dates add 1,994 and remove 293 units; their net +1,701 is the entire current ERP FBA balance | Engineering + Founder | WP4/WP9 | Preserve the historical basis, prohibit new report-driven self-adjustment, and replace it only through a reviewed canonical event chain and same-date reconciliation |
| FBA-009 | High | Manually packed freebies were moved to FBA Transit even though they are warehouse promotional/sample consumption and are not Amazon shipment-line products | Nine linked Approved dispatches contain 720 unmatched units: 400 Wooden Combs and 320 Bath Loofahs; D-031 confirms staff manually chooses actual freebies and some shipments receive none | Founder + Warehouse Manager | WP3/WP7/WP9 | Implement manual, non-inferred freebie consumption for new shipments and design a reviewed historical correction from Transit to the promotional/sample sink without editing Approved history |
| FBA-010 | High | Amazon workflow status is not sufficient to determine ERP dispatch state | Three existing ERP plans totalling 571 units await scheduled handover under D-029. Under D-030, staff will create only Amazon-only `FBA15MW9M3TG` (In transit, 200 units) as an ERP shipment plan on 2026-11-14; `FBA15MV7CDHJ` (Working, 150), `FBA15MRCH332` (Working, 140) and `FBA15MP17F6M` (Working, 98) are owner-excluded | Founder + Warehouse Manager | Phase 2 bridge / WP5 | Keep scheduled plans Working until handover, create `FBA15MW9M3TG` as a non-posting plan, retain the three exclusions as audit evidence, and prevent status-only stock effects |
| FBA-011 | High | A historical Avee shipment line is mapped to an active Syoat product in the preserved ERP movement | Seller Central shows 40 Avee shampoo expected / 0 located on `FBA15M1Z6GTC`; `MOV-088-L001` records 40 units of `PRD-P001` Syoat shampoo | Founder + Engineering | WP3/WP9 | Preserve the Avee identity under D-028, do not create a Syoat receipt/shortage from it, and design an auditable historical treatment without editing the Approved movement |
| INV-001 | Medium | Rejected historical lines reference product IDs no longer present in Products | `MOV-002-L001` -> `PRD-F003`; `MOV-003-L001` -> `PRD-F004`; zero stock effect because both headers are Rejected | Engineering + Founder | WP3/WP9 | Preserve history and define an inactive/legacy product-reference rule; do not recreate or silently edit products |
| INV-002 | High | Current tracking flags conflict with blank batch/expiry on historical Approved lines | 611 Approved lines are blank for both fields while their current product rows require tracking | Engineering + Warehouse Manager | WP3/WP7 | Define tracking-policy effective dates and classify legacy versus genuinely invalid records before enforcement/remediation |
| INV-003 | Medium | Operational line-level cost is incomplete | 262 Approved lines have no positive UnitCost; stock quantity is unaffected | Engineering + Founder | WP3/WP7 | Define the operational cost source/fallback and report valuation as incomplete until resolved |
| INV-004 | Medium | Six count-generated Approved adjustments are mechanically correct but lack a specific cause/evidence note | `CNT-004`, `CNT-013`, `CNT-027`–`CNT-030`; 45 absolute units, net -33 | Founder + Warehouse Manager | WP6/WP9 | Preserve Approved history; require a reason/evidence note for new count exceptions and review historical cause only if later correction evidence appears |
| CNT-001 | Medium | Imported FBA variance evidence has no non-stock-changing superseded/resolved state | All 24 Pending rows are current-ledger FBA evidence: 16 belong to older 2026-10-26/2026-11-01 snapshots and 8 to latest 2026-11-08; none is a routine count | Founder + Warehouse Manager | WP6 | Preserve old evidence without generic rejection; add explicit superseded/resolved handling and keep only the latest report actionable for evidence classification |
| CHN-001 | High | Warehouse marketplace dispatches lack a shared order lifecycle | Sales order tables are empty while Approved movements contain 187 website, 20 Flipkart and 42 FirstCry dispatches | Engineering + Operations | WP2/WP4/WP7 | Implement D-027 only after field/status discovery and the canonical ledger; prevent duplicate dispatch/delivery/return stock effects |

## Closed exceptions

| ID | Closed evidence |
| --- | --- |
| FBA-001 | All 24 Approved historical/current FBA dispatch movements are linked to shipment records. Manifest V2 completed with zero stock delta. Later status/plan drift is tracked separately under FBA-010. |
| FBA-003 | New report variances are Pending review/classification records; generic approve/edit/reject paths are blocked and no report import silently self-approves a stock movement. Historical approved adjustments remain evidence under FBA-004. |
| FBA-005 | Current import processing rejects a repeated report date and runs inside the existing locked/idempotent write boundary. |
| FBA-006 | FBA freshness/latest-upload state is derived from authenticated backend snapshots rather than browser-only history. |
| FBA-007 | Current parser uses the newest ending-balance report date for reconciliation preview and fails repeated/ambiguous import timing visibly. |
| FBA-008 | The current backend movement-effect rules replay 41 product/location rows with zero negative balances; the 2026-11-13 totals match the ERP display. Work Package 4 still must turn this into the shared tested engine. |

Closing an exception requires evidence, owner decision where applicable, local/sanitized verification, and a recorded production action or explicit risk acceptance. Staging is not required under D-022.
