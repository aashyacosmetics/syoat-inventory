# Phase 2 Execution Plan — Inventory Correctness

Status: in progress. Work Package 1 stabilization evidence is retained, and owner decision D-022 closes staging as a current gate. Phase 2 continues local-first with owner-controlled live verification and rollback/recovery safeguards.

## Objective

Make the movement ledger and current stock trustworthy for every product and operational location before expanding Amazon FC workflows or adding new business modules.

Phase 2 corrects inventory configuration, movement lifecycle, stock counts, adjustments, returns, damage, samples, combos, batch/expiry handling and existing historical exceptions. It also makes Record Movement a guided visual workflow and redesigns inventory Analytics so employees can understand actions, balances and exceptions with minimal training. It does not build the full Amazon shipment/FC lifecycle planned for Phase 3 and does not add accounting.

## Non-negotiable boundaries

- Preserve all Phase 1 authentication, capability, session, privacy, locking, idempotency, recovery and audit controls.
- Active source remains `Code.gs`, `index.html` and `syoat-app.js`; redesign artifacts stay ignored.
- Work locally first. The owner alone deploys/publishes and performs reviewed live migrations.
- No live-data correction is performed during diagnosis.
- Every remediation supports dry-run output, backup, bounded batches, resumability, audit evidence and post-run reconciliation.
- Approved operational records are reversed or superseded; they are not silently edited or deleted.
- Physical locations cannot have unexplained negative stock.
- The movement ledger is the inventory authority. Counts create reviewed adjustment movements; marketplace snapshots remain evidence and never silently overwrite the ledger.
- Amazon FBA and transit locations participate in general stock correctness, but shipment-to-transit-to-specific-FC expansion remains Phase 3.
- Operational unit cost and estimated inventory value may be validated for decisions. Expenses, revenue books, cash received/paid, cash flow and accounting ledgers remain excluded.
- Staging is excluded from the current Phase 2 workflow under D-022. No production migration is authorized without owner approval, exact backup, reviewed dry-run, bounded/resumable execution, immediate live reconciliation and a documented production rollback or recovery sequence.
- PIN login and server PIN reconfirmation before writes remain mandatory. Performance work may reduce round trips but must never bypass authentication, authorization or PIN confirmation.
- Performance telemetry may record action name, timing, outcome and safe request/error references only. It must never record a PIN, PIN hash/salt, session token, private file URL or business payload.

## Working method

1. Complete one work package at a time.
2. Start each package from fresh read-only evidence and the current production release source.
3. Add failing tests for the confirmed defect before changing behavior.
4. Separate code corrections from historical data remediation.
5. Use sanitized fixtures and aggregate diagnostics; never store PINs, tokens, private file links or unnecessary employee data locally.
6. Record decisions, changed files, test results, known exceptions and owner deployment steps after every package.
7. Stop and investigate any recovery marker, unexplained stock change or mismatch between the reviewed dry-run and verified production result.

## Phase 2 success measures

- Every current product/location quantity can be reproduced from approved movement lines using one documented rule set.
- No duplicate IDs, orphan lines, invalid references or impossible state transitions remain unexplained.
- No physical location has an unexplained negative balance.
- Draft, rejected and reversed records affect stock exactly as documented.
- Every count variance is traceable to one approved adjustment or a documented rejection.
- Returns, damage, samples and combo assembly produce the expected balanced stock effects.
- Batch/expiry rules are complete for every product that requires them.
- All historical exceptions are corrected or explicitly accepted with owner, reason and evidence.
- Employees can complete common movement-entry scenarios from visual guidance without interpreting internal codes or relying on undocumented training.
- Every Analytics figure reconciles to the canonical ledger and provides a table/drill-down path to its source movements.
- Local/sanitized verification passes, the owner approves the exact production sequence, and immediate live smoke/reconciliation evidence matches the reviewed expectations.
- Measured production-safe observations remain within the recorded operational targets where practical, and temporary failures preserve user-entered data for safe idempotent retry.

## Cross-cutting performance and reliability requirements

Performance is improved without weakening inventory correctness or PIN access:

1. Replace duplicate post-login reads with one core load path, then introduce a versioned bootstrap response after the canonical ledger contract is stable.
2. Lazy-load counts, support, purchasing, Amazon and Analytics data only when the employee opens the authorized module.
3. Cache stable master data and revision-keyed derived stock; invalidate affected caches after approved/reversed stock events. Cached stock is never authoritative for approval.
4. Refresh incrementally by ledger/data revision instead of repeatedly downloading complete history.
5. Batch Sheet reads and writes while preserving header/state commit markers and recovery semantics.
6. Retry only temporary transport/service failures. Validation, permission, state and insufficient-stock errors return immediately.
7. Preserve form data during failure, prevent double-submit and reuse the same request ID for an idempotent retry.
8. Measure safe client/server duration, outcome and request reference only in an owner-approved environment. PIN login and PIN reconfirmation remain mandatory, but actual PINs, hashes, salts and session tokens are excluded from telemetry.

Initial operational targets remain 1–2 seconds for warm login-picker/core inventory reads, under 5 seconds for cold core loads, 1–3 seconds for normal draft writes and 2–4 seconds for approval/rejection. These are measured targets, not guaranteed platform limits; attachment time is recorded separately by file size/network.

## Work Package 1 — Stabilization and release safeguards

Purpose: prove the Phase 1 release is stable and define safe release controls. Historical staging work is retained but no longer required by D-022.

Deliverables:

- First-business-day review of Founder health, login failures, unresolved operational errors and write-recovery records.
- Safe per-action latency baseline for login picker, core reads and representative writes, including warm/cold observations and error rate.
- Current source/deployment hash confirmation against the Phase 1 release manifest.
- Sanitized local fixtures and read-only production evidence for diagnosis.
- Exact release manifest, backup, deployment, smoke-test and production rollback/recovery sequence.

Exit checks:

- No unexplained Phase 1 error or recovery record remains open.
- Local automated checks and sanitized scenarios pass.
- Owner-reviewed backups, release order, live smoke checks and rollback/recovery steps are recorded before a production change.

## Work Package 2 — Fresh inventory baseline and data dictionary

Purpose: replace the old audit snapshot with a current, read-only picture of production truth and schema.

Deliverables:

- Fresh header, row-count and ID/reference inventory for every inventory-related sheet.
- Current product, location, movement type/status, stock-count status and configuration value dictionary.
- Approved movement-derived stock by product/location, including zero and negative balances.
- Duplicate ID, orphan line, missing product/location, malformed quantity/date and invalid-state reports.
- Batch, expiry and unit-cost completeness report.
- Current returns, damage, samples, combo and opening-balance usage summary.
- Current FBA dispatch, transit, receipt, shipment-link, snapshot-import and reconciliation-adjustment alignment report, following `PHASE_2_FBA_ALIGNMENT.md`.
- Sanitized aggregate snapshot and reproducible local analysis script; no production writes.

Exit checks:

- Every inventory field used by the backend has a documented meaning, type, allowed blank behavior and source of truth.
- Diagnostic totals can be regenerated without manual spreadsheet arithmetic.
- Every discovered exception has severity, affected IDs/count, proposed owner and target work package.
- No corrective migration is run during this package.

## Work Package 3 — Master data and configuration contracts

Purpose: make products, locations, combos and operational settings valid inputs to every later inventory workflow.

Deliverables:

- Product contract for immutable ProductID, SKU/barcode/ASIN identifiers, active status, product/combo type, tracking policy and operational unit cost.
- Location contract for physical, virtual, warehouse, transit, Amazon and exception locations.
- Explicit rules for `SUPPLIER`, `CUSTOMER`, opening-balance sources and same-location movements.
- Versioned combo/BOM validation: valid components, positive quantities, no cycles and defined effective version.
- Feature-setting/list validation with duplicate, blank and unsupported-value detection.
- Startup/pre-deployment schema validator and local contract tests.
- Reviewed migration specification for invalid configuration; implementation remains dry-run until Work Package 9.

Exit checks:

- Invalid or inactive products/locations cannot enter a new movement.
- Every location is classified as physical or virtual with documented stock behavior.
- Every active combo resolves to a valid, acyclic BOM.
- Empty, zero and not-applicable values behave consistently.

## Work Package 4 — Canonical stock ledger and reconciliation engine

Purpose: establish one tested calculation for stock and make differences visible without changing data.

Deliverables:

- Movement-effect matrix covering type, status, source, destination, virtual endpoints, reversal and same-location behavior.
- Pure stock-ledger function shared by API calculations, diagnostics and tests.
- One versioned core bootstrap contract that reuses canonical product/location/ledger data within an execution and returns a ledger revision for incremental refresh and safe cache invalidation.
- Approved-only commit-marker rules for headers and lines.
- Founder-visible read-only reconciliation report by product/location with drill-down movement IDs.
- Exceptions for negative stock, missing lines, orphan lines, invalid endpoints and ledger/display mismatch.
- Balance invariants and deterministic replay tests across realistic histories.

Exit checks:

- API stock, local replay and the owner-verified production reconciliation return identical quantities for every tested product/location.
- Rejected and Draft records have zero stock effect.
- Reversals negate the intended approved event exactly once.
- Transfers preserve total company units while moving quantity between physical locations.
- Every nonzero discrepancy is listed; none is silently corrected.

## Work Package 5 — Movement lifecycle correctness

Purpose: correct create, edit, approve, reject and reverse behavior around the canonical ledger.

Deliverables:

- Explicit state machine and allowed actor/action matrix.
- Maker-checker rules for all stock-changing approvals, including Founder/Co-Founder behavior.
- Draft-only editing, approval/rejection rules and approved-only reversal with mandatory reason.
- Consistent required references, notes, evidence, dates, quantities, products and locations by movement type.
- Removal or correction of automated create-and-self-approve paths.
- Concurrency tests for competing approval, retry, stale draft and double reversal.
- Batched line/header writes that preserve commit ordering, plus structured retryability so business errors are not delayed by automatic transport retries.
- Frontend messages/actions generated from server state and capabilities.

Exit checks:

- No material stock movement bypasses PIN confirmation, capability, maker-checker, lock, request ID or audit.
- Invalid state transitions fail before any Sheet mutation.
- Approval cannot create negative physical stock.
- Rejection leaves stock unchanged and reversal creates the exact documented compensating effect.

## Work Package 6 — Stock counts, variances and adjustments

Purpose: ensure physical counts reconcile the ledger through controlled, reviewable adjustments.

Deliverables:

- Count lifecycle and actor matrix: create, edit, submit/approve, reject and supersede.
- Captured calculated quantity/version at count time and stale-balance handling.
- Variance reason, evidence and approval requirements.
- One approved adjustment movement per accepted variance, linked to the count.
- Duplicate adjustment prevention and retry-safe count approval.
- Product/location coverage, blind-count and recount policy support as approved.
- Count history and unresolved variance report.

Exit checks:

- Zero-variance count creates no stock event.
- Nonzero approved variance creates exactly one linked adjustment.
- Rejected or stale count changes no stock.
- Replaying the same approval creates no duplicate adjustment.
- Post-adjustment ledger equals the approved physical quantity.

## Work Package 7 — Special inventory flows and traceability

Purpose: make non-standard stock uses correct and explicit before historical cleanup.

Deliverables:

- Returns workflow with explicit receipt location and disposition: sellable, damaged, quarantine or other approved outcome.
- Damage and sample issue rules with reason/evidence and correct source/destination.
- Combo assembly rules using the effective BOM; decide and implement disassembly only if approved.
- Batch/manufacture/expiry policy by product/process, including validation and near-expiry reporting where data supports it.
- Opening-balance restriction for migration-only use after go-live.
- Operational unit-cost completeness and valuation estimate checks without accounting entries.
- Scenario tests for each special flow and mixed-product movement.

Exit checks:

- Returns never become available stock without a recorded disposition.
- Damage and samples reduce the correct physical location exactly once.
- Combo assembly consumes components and creates combo units in balance.
- Required tracked products cannot move without valid batch/expiry data.
- Opening balances cannot be used as routine adjustments.

## Work Package 8 — Guided Record Movement and visual Inventory Analytics

Purpose: make correct inventory entry and interpretation easy for employees without weakening backend validation or turning Analytics into accounting.

### Record Movement visual workflow

Deliverables:

- Plain-language, step-by-step flow: choose activity, confirm stock direction, choose products, enter quantities/tracking data, attach evidence and review before submission.
- Visual source → destination diagram with recognizable location labels/icons and movement-specific explanation of what will happen.
- Movement-type cards grouped by employee task such as Receive, Transfer, Dispatch, Return, Damage/Sample and approved adjustment flows; only server-authorized options appear.
- Searchable product cards using image, product name, SKU/identifier and available source stock rather than internal ProductID alone.
- Live stock-impact preview showing source and destination before/after quantities for every line, backed by the canonical ledger and revalidated by the server at approval.
- Progressive batch, manufacture-date and expiry fields shown only when required by the product/process contract.
- Inline prevention and plain-language correction for missing reference, invalid quantity, insufficient stock, duplicate line, invalid location, tracking-data and attachment errors.
- Clear Draft versus Approved explanation, maker-checker status and next responsible person.
- Review screen summarizing movement direction, products, quantities, evidence and expected stock effect before PIN confirmation.
- Responsive desktop/mobile layout, keyboard operation, readable contrast, text/icon redundancy and no color-only status meaning.
- Lazy module loading, progressive rendering and skeleton/refresh states so secondary operational and Analytics requests do not delay the core inventory screen.
- Contextual help/tooltips and short examples embedded in the flow; no separate training manual is required for routine entry.

Record Movement exit checks:

- Founder, Warehouse Manager and Warehouse employee complete their permitted scripted movement tasks in sanitized local UAT and the owner-approved live smoke sequence without developer intervention during the employee steps.
- A first-time test employee can identify source, destination, products, quantities and approval outcome from the review screen before submitting.
- Visual stock-impact preview exactly matches the canonical ledger calculation and final approved result.
- Invalid entries are blocked before submission with actionable field-level guidance.
- Direct API calls remain governed by the same backend capability and lifecycle rules; the visual UI never becomes the security boundary.

### Inventory Analytics visual experience

Deliverables:

- Clear inventory overview cards for total operational units, location balances, low-stock items, pending approvals/counts and reconciliation exceptions.
- Product-by-location visualization with filters for product, category, location and status, plus a readable table fallback.
- Movement activity trend showing operational unit movement—not sales revenue—with movement type/status breakdown.
- Exception-first views for negative/impossible balances, stale counts, missing tracking data, near-expiry batches, orphan/reference problems and unreconciled records.
- Stock-count variance visualization and drill-down from summary to count, adjustment and source movement IDs.
- Returns, damage, samples and combo-flow summaries using the Work Package 7 rules.
- Data freshness timestamp, applied-filter summary, definitions/tooltips and explicit “no data” versus zero states.
- Drill-down from every KPI/chart to the exact filtered records that produce it.
- Accessible labels, legends, units, zero baselines, non-color status cues and responsive desktop/mobile behavior.
- Operational valuation may appear only as a clearly labelled estimate sourced from the approved operational unit-cost field; no revenue, expenses, collections, profit or cash-flow visualization.

Analytics exit checks:

- Every KPI/chart total matches the canonical reconciliation report for the same filters.
- Employees can answer “what stock do we have, where is it, what changed, and what needs attention?” without spreadsheet calculations.
- Charts remain understandable with color removed and have an equivalent table/drill-down view.
- Empty, zero, stale and error states cannot be confused.
- Role/capability and movement visibility scope are preserved in every aggregation and drill-down.

## Work Package 9 — Historical remediation and reconciliation closure

Purpose: correct confirmed live-data exceptions without losing history or creating unexplained stock.

Deliverables:

- Immutable exception register with affected records, proposed correction, expected stock delta, evidence and owner decision.
- Dry-run migration that reports exact row/cell/event changes and before/after balances.
- Separate remediation categories: configuration/header cleanup, orphan/reference repair, status correction and compensating movement.
- Bounded, locked, resumable migration batches with checkpoints and audit trail.
- No destructive deletion of approved history.
- Pre/post row counts, IDs, stock balances and exception comparison.

Exit checks:

- Owner approves the dry-run exception register before production mutation.
- A local/sanitized rehearsal produces the predicted row and stock deltas without contacting production.
- The production rollback/recovery sequence is reviewed against the current backup.
- Production migration has an exact backup, maintenance, execution and rollback sequence.
- Final reconciliation has zero unexplained discrepancy; accepted exceptions identify owner, reason and evidence.

## Work Package 10 — Release verification, production handoff and Phase 2 closure

Purpose: prove corrected inventory behavior end to end and provide an owner-controlled release package.

Deliverables:

- Changed-file/release manifest and hashes.
- Local/sanitized UAT covering every role and inventory scenario.
- Dry-run, backup and production rollback/recovery evidence.
- Exact production deployment order, smoke tests and monitoring plan.
- Phase 2 completion record and refreshed production baseline.

Required UAT scenarios:

- Stock in, transfer, dispatch/consumption, rejected draft and approved reversal.
- Competing approvals and duplicate request replay.
- Zero, positive, negative and stale stock counts.
- Return-to-sellable, return-to-damage, damage and sample issue.
- Combo assembly and approved batch/expiry examples.
- Unauthorized role/action, maker-checker denial and expired session.
- Reconciliation report before/after every stock-changing scenario.
- Guided Record Movement usability tasks for Founder, Warehouse Manager and Warehouse employee on desktop and an actual employee mobile device.
- Analytics KPI/chart-to-ledger reconciliation, filters, drill-down, accessibility, empty/zero/stale states and role-scoped visibility.

Exit checks:

- All local/sanitized tests pass with no unresolved recovery/error item.
- The owner approves the exact production release, smoke/reconciliation and rollback/recovery sequence.
- Owner decisions and accepted historical exceptions are recorded.
- Production smoke/reconciliation results reproduce the reviewed local expectations.
- Phase 2 completion record identifies the verified starting point for Phase 3.

## Owner decisions required before the relevant package

Recommended defaults are included to keep planning concrete; no default becomes binding until the owner accepts it.

| Decision | Recommended default | Needed by |
| --- | --- | --- |
| Inventory authority | Approved movement ledger; counts create adjustments; snapshots are evidence only | WP4 |
| Negative stock | Never allow an approved physical-location balance below zero | WP4–5 |
| Maker-checker | Creator cannot approve/reject/reverse their own material stock event; second top-level approver required for Founder-created events | WP5 |
| Approved correction | Reverse with reason and create a corrected event; never edit/delete approved history | WP5 |
| Count approval | Counter cannot approve own variance; nonzero variances require authorized manager approval | WP6 |
| Count tolerance | Record every difference; no automatic tolerance write-off initially | WP6 |
| Return disposition | Mandatory sellable/damaged/quarantine decision before stock is reusable | WP7 |
| Batch/expiry tracking | Product-level policy; mandatory only for designated products/processes but enforced consistently | WP3/WP7 |
| Combo disassembly | Disabled until a business case and auditable reverse-BOM rule are approved | WP7 |
| Opening balances | Founder/Co-Founder migration-only action; disabled for routine work | WP5/WP7 |
| Operational unit cost | One documented product/source field used only for estimates; no accounting ledger | WP3/WP7 |
| Historical exceptions | Zero unexplained difference; explicit owner acceptance permitted only with evidence when source history cannot be reconstructed | WP9 |

Record accepted choices in `DECISIONS.md` before implementing the dependent behavior.

## Planned deliverable map

- `docs/PHASE_2_PLAN.md` — this execution contract.
- `docs/INVENTORY_DATA_DICTIONARY.md` — Work Package 2–3 source-of-truth fields and rules.
- `docs/INVENTORY_LEDGER_RULES.md` — Work Package 4 movement-effect matrix and invariants.
- `docs/INVENTORY_UX_SPEC.md` — Work Package 8 Record Movement and Analytics visual/interaction contract.
- `docs/INVENTORY_EXCEPTION_REGISTER.md` — Work Package 2/9 reviewed exceptions and outcomes.
- `docs/PHASE_2_UAT.md` — Work Package 10 local/sanitized and owner-run production employee-usability evidence.
- `docs/PHASE_2_COMPLETION.md` — final verified production checkpoint.
