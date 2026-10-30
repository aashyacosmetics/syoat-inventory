# Roadmap

The roadmap is sequential. Work may be investigated early, but a later phase should not be deployed before the preceding phase's exit criteria are met.

## Phase 0 — Shared project foundation

Status: complete as documentation baseline; ongoing maintenance required.

- Establish charter, scope, architecture, security model, module map, workflow, decisions, status, and changelog.
- Add repository-wide working rules for future tasks.
- Record the inspected baseline and risks.

Exit criteria:

- New tasks can identify the product rules, current phase, known risks, and next work without relying on prior chat history.

## Phase 1 — Secure and reliable foundation

Status: complete. Release `3.0-wp7.1` was deployed by the owner and initial production smoke tests passed. The unperformed Phase 1 staging/UAT and rollback rehearsal remain historical process evidence; owner decision D-022 excludes staging from the current Phase 2 workflow, so they are not a current release gate.

- Add the canonical Apps Script source and deployment configuration to version control without secrets.
- Replace PIN-per-request behavior with POST login and temporary server sessions.
- Authenticate all reads and writes.
- Hash unique PINs and add failed-attempt lockout/audit.
- Create one backend permission matrix and remove unsafe offline authentication fallbacks.
- Move all routine actions to a consistent authenticated API envelope.
- Add `LockService`, atomic IDs, durable idempotency, approval-time stock validation, and recovery handling.
- Keep evidence files private.
- Separate development/staging/production configuration.
- Add automated checks and deployment/rollback instructions.

Exit criteria:

- All checks in the deployment gate of `SECURITY_AND_ACCESS.md` pass.
- Concurrent stock/ID tests pass without duplicate IDs or negative approved stock.
- Frontend and backend source are versioned together.
- A tested release verification and rollback/recovery procedure exists for the owner-approved deployment path.

## Phase 2 — Inventory correctness

Status: active. Staging is excluded by D-022; local-first verification and owner-controlled live release safeguards apply.

Detailed execution sequence: `PHASE_2_PLAN.md`.

- Confirm product, combo/BOM, location, batch, and expiry rules.
- Repair movement creation/edit/approval/rejection/reversal workflows.
- Correct self-approval policy and maker-checker behavior.
- Repair stock counts and variance approval.
- Validate returns, damage, samples, and combo assembly.
- Add location/product reconciliation and exception reporting.
- Clean invalid configuration/header rows through a reviewed migration.

Exit criteria:

- Test scenarios reconcile stock from movements for every location.
- No material movement can bypass validation, permission, approval, idempotency, or audit.
- Existing live records are reconciled and migration exceptions documented.

## Phase 3 — Amazon FBA by fulfilment centre

- Repair shipment lifecycle and linked movements.
- Implement warehouse-to-transit and transit-to-actual-FC receipt.
- Support partial receipt, FC splits, discrepancies, returns, loss, and damage.
- Import and reconcile Amazon snapshots/reports idempotently.
- Add stale-data and unresolved-transit alerts.

Exit criteria:

- Every open transit quantity explains its shipment and age.
- FC balances reconcile to accepted receipts, subsequent movements, and current Amazon evidence.
- Report freshness and reconciliation exceptions are visible in the portal.

## Phase 4 — Purchasing and channel operations

- Complete operational purchase-order and goods-receipt flow without expenses, payments, supplier accounts, or cash flow.
- Add Amazon marketplace activity tracking.
- Add FirstCry and other marketplace activities.
- Add website catalog/content/promotion/issue workflow.

Channel activities may include order references, quantities, fulfilment, dispatch, cancellations, returns, and issues. They do not include daily sales/revenue accounts, receipts, collections, or cash flow.

## Phase 5 — Social media and collaborations

- Add content calendar, briefs, assets, approval, publishing, and result tracking.
- Add creator/collaboration records, deliverables, product samples, evidence, deadlines, and outcomes.

## Phase 6 — Unified work management

- Add cross-module tasks, checklists, owners, due dates, approvals, notifications, and dashboards.
- Add owner exception dashboard and operational reporting.
- Add private document/evidence center and retention rules.

## Phase 7 — Scale and platform evolution

- Measure Apps Script/Sheets concurrency, latency, data volume, audit, and integration limits.
- Migrate to a managed database/API when objective thresholds require it.
- Preserve the portal's domain contracts and user workflows during migration.

## Priority rule

Security vulnerabilities, inventory corruption risks, access-control failures, and unreconciled stock take priority over new screens and modules.
