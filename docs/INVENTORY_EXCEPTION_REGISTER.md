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
| FBA-001 | High | Approved FBA dispatches are not linked to shipment records | 24 movements; 4,516 units; 0 linked | Founder + Warehouse Manager | Phase 2 bridge / WP9 history | Review shipment evidence and produce a dry-run link/receipt/remediation plan; do not infer links from dates alone |
| FBA-002 | High | FBA transit has never been cleared by a receipt movement | 0 FBA Receipt movements; calculated transit equals all 4,516 approved dispatch units | Founder + Warehouse Manager | Phase 2 bridge / WP9 history | Establish linked receipt workflow; classify historical open, received, lost, damaged and unresolved transit |
| FBA-003 | Critical | FBA report reconciliation auto-creates and self-approves stock adjustments | 29 approved FBA-ledger adjustments; current handler uses the importer as creator and approver | Engineering + Founder | WP5/WP6 bridge | Replace with idempotent snapshot/exception processing and Pending reviewed counts; preserve maker-checker |
| FBA-004 | High | Positive FBA report differences use `SUPPLIER -> AMAZON_FBA` instead of explaining transit receipt or another real event | Present in historical FBA-ledger adjustments, including the latest upload | Engineering + Founder | WP4/WP9 | Classify variance causes; never use a virtual supplier source as an unexplained reconciliation shortcut |
| FBA-005 | High | Report imports lack durable server-side duplicate protection | Snapshot ID is deterministic but appends are not guarded; browser history is not authoritative | Engineering | WP5 bridge | Store and enforce report import key/checksum and processing result under the write lock |
| FBA-006 | Medium | Latest-ledger indicator is browser-local and can contradict backend history | Backend has latest 2026-10-21 snapshot while a fresh browser can show no uploaded ledger | Engineering | WP8 bridge | Derive freshness and latest import status from authenticated backend data |
| FBA-007 | High | Summary report aggregation may overstate current stock if multiple dates exist per ASIN/FC | Parser sums all ending-balance rows; sanitized source-file verification pending | Engineering + Founder | WP2/WP5 bridge | Test a sanitized real report; use latest ending balance per ASIN/FC and fail on ambiguous date semantics |
| FBA-008 | High | Historical workbook contains negative movement-derived warehouse balances for several products under a naive transfer replay | Confirmed during diagnostic replay; canonical opening-balance/same-location rules are not yet applied | Engineering + Founder | WP4 | Build the documented movement-effect matrix before treating replay totals as production truth |

## Closed exceptions

None yet. Closing an exception requires evidence, owner decision where applicable, local/sanitized verification, and a recorded production action or explicit risk acceptance. Staging is not required under D-022.
