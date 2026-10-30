# Syoat ERP Working Rules

This file applies to every person or coding agent working anywhere in this repository.

## Required reading before work

Read these files in order before proposing or making changes:

1. `README.md`
2. `docs/PROJECT_CHARTER.md`
3. `docs/SECURITY_AND_ACCESS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/ROADMAP.md`
6. `docs/STATUS.md`
7. `docs/PHASE_1_COMPLETION.md`
8. `docs/PHASE_2_PLAN.md`
9. `docs/DECISIONS.md`

Read `docs/API_CATALOG.md` and `docs/ROLE_CAPABILITIES.md` for frontend or Apps Script API work. Read `docs/DATA_AND_INTEGRATIONS.md` for data, Google Sheets, Apps Script, Amazon, website, or marketplace work. Read `docs/ENGINEERING_WORKFLOW.md` before changing code or live data.

## Product invariants

- This is the single operations portal for Syoat's D2C business.
- Access is PIN-based and limited to the existing, owner-controlled staff allowlist.
- Do not build self-registration, invitations, public signup, or employee-created accounts.
- Daily financial accounts are out of scope: expense recording, sales/revenue books, cash received or paid, cash flow, bookkeeping, taxation, payroll, bank reconciliation, and financial ledgers.
- Inventory valuation may be displayed for operational decisions, but must not become an accounting ledger.
- Sales order references, quantities, fulfilment status, dispatch, returns, and channel issues may be stored only for operations and inventory; do not turn them into a daily sales account.
- Permissions are enforced by the backend for every operation. Hiding a button is not authorization.
- Warehouse stock, FBA transit, and each Amazon fulfilment centre are distinct inventory locations.
- Every stock change must be traceable, idempotent, and auditable.
- Never place a PIN, session token, API secret, or private document URL in source control, browser storage, a query string, logs, screenshots, or documentation.
- `index-redesign.html` and `syoat-app-redesign.js` are archived test artifacts. Ignore them for implementation, tests, catalogues and publication unless the owner explicitly reactivates them.

## Change rules

- Treat `docs/DECISIONS.md` as the decision record. Do not reverse an accepted decision silently.
- Keep work inside the current roadmap phase unless the owner explicitly changes priority.
- Inspect existing behavior and data contracts before editing.
- Work on files in the local project only. The owner will deploy Apps Script and publish the frontend themselves unless they explicitly replace this instruction.
- Do not write to the live Google Sheet, deploy Apps Script, publish the website, push commits, change sharing permissions, or alter production configuration.
- Make the smallest coherent change and preserve unrelated user changes.
- Add or update verification for every behavior change.
- Do not declare work complete until the relevant checks pass and `docs/STATUS.md` is updated.
- Record meaningful completed changes in `docs/CHANGELOG.md`.
- If a decision is still unresolved, add it under Open decisions in `docs/DECISIONS.md`; do not guess when the choice affects security, production data, or business workflow.

## Source-of-truth order

When documents disagree, use this order:

1. The owner's latest explicit instruction
2. `docs/DECISIONS.md`
3. `docs/PROJECT_CHARTER.md` and `docs/SECURITY_AND_ACCESS.md`
4. `docs/ROADMAP.md`
5. `docs/STATUS.md`
6. Existing implementation

Update the lower-priority source so the conflict does not remain.

## Handoff requirement

At the end of a coding task, update `docs/STATUS.md` with:

- what changed;
- files changed;
- checks performed and results;
- production actions still required;
- risks, blockers, and the next recommended task.
