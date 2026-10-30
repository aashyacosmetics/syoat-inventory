# Architecture

## Current system

```text
Employee browser
    |
    | HTTPS requests
    v
Static React application
    |
    | Google Apps Script web-app API
    v
Code.gs business logic
    |
    +--> Google Sheets workbook (operational records)
    +--> Google Drive (attachments and reports)
```

The active frontend is `index.html` plus `syoat-app.js`. The redesign-named HTML/JS files are archived test artifacts and are excluded from the active architecture. A matching local copy of the supplied Apps Script backend is saved as `Code.gs`; it remains uncommitted and undeployed until the owner reviews and handles those actions. Keeping the backend under normal source control remains Phase 1 work.

## Target near-term system

```text
Employee browser
    |
    | PIN login -> temporary session
    | authenticated commands and queries
    v
Frontend application
    |
    v
Apps Script API boundary
    |
    +--> authentication and authorization
    +--> validation and business rules
    +--> idempotency and document locks
    +--> audit and error handling
    |
    +--> Google Sheets repositories
    +--> private Google Drive files
    +--> approved external integrations
```

## Layer responsibilities

### Frontend

- Present workflows appropriate to the logged-in employee.
- Validate for usability, but never act as the authority for access or stock correctness.
- Hold no PIN list, hard-coded staff secret, production secret, or authorization rule that the server does not also enforce.
- Use a single API client and consistent error/session-expiry handling.

### API boundary

- Parse and validate a versioned request envelope.
- Authenticate the session and resolve current permissions.
- Route only allowlisted actions.
- Return a consistent success/error envelope with a correlation/request ID.
- Never use state-changing `GET` requests.

### Domain services

- Implement inventory, FBA, marketplace, website, social, collaboration, task, and approval rules.
- Keep rules independent of cell numbers and UI components.
- Perform approval-time validation, not only draft-time validation.

### Data repositories

- Isolate sheet names, headers, row lookup, insert, update, and serialization logic.
- Use header names rather than fragile fixed column positions where practical.
- Validate schemas at startup or deployment.
- Use `LockService` for shared counters and critical multi-row operations.

### Audit and observability

- Give every request a unique request ID.
- Record actor, action, entity, result, timestamp, and safe change context.
- Keep authentication failures separate from normal business history.
- Surface actionable errors to owners without exposing secrets to employees.

## Transaction strategy for Google Sheets

Google Sheets does not provide database transactions. Until a database migration, critical workflows must:

1. acquire the Apps Script script lock;
2. re-read authoritative state;
3. validate the complete command;
4. reserve identifiers atomically;
5. write using a defined order;
6. mark completion with the request ID;
7. compensate or flag recovery if a later write fails;
8. release the lock in `finally`.

Idempotency records must be persistent enough to cover retries beyond a short cache window.

## Inventory model

- Stock is derived from approved, non-reversed inventory movements.
- Draft and rejected movements do not affect stock.
- A movement has one header and one or more lines.
- Locations are explicit; `MAIN_WH`, `FBA_TRANSIT`, returns, damage, samples, and individual Amazon FCs are not interchangeable.
- Approval revalidates available stock while holding the critical lock.
- FBA shipment dispatch moves stock from warehouse to FBA transit.
- Confirmed Amazon receipt moves accepted quantity from FBA transit to the specific FC.
- Short, excess, damaged, or lost quantities become explicit reconciliation exceptions, not silent adjustments.

## Evolution path

Google Sheets and Apps Script remain the near-term backend to preserve operating continuity. Boundaries should allow later migration to a managed relational database and dedicated API without redesigning every screen. A migration decision will be based on volume, concurrency, reliability, integration, and audit requirements—not feature preference alone.
