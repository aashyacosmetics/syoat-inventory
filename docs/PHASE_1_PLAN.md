# Phase 1 Execution Plan

## Objective

Make the existing Syoat ERP safe and dependable enough for employee use before correcting deeper inventory workflows or adding new business modules.

All work is performed and verified locally. The owner performs Apps Script deployment and frontend publication.

## Working method

- Complete one work package at a time.
- Start each package from the current local source and documented contracts.
- Keep frontend and backend changes compatible within the same package.
- Add repeatable tests before handing files to the owner.
- Update `STATUS.md`, `CHANGELOG.md`, and `DECISIONS.md` when applicable.
- Do not modify the live Sheet, deploy, publish, or push.

## Work package 1 — Baseline and safety harness

Purpose: create a repeatable way to prove that later corrections do not break existing operations.

Status: complete locally on 2026-08-19.

Deliverables:

- Inventory of every `doGet`/`doPost` action and its current caller.
- Initial action-to-capability permission table.
- Safe local configuration pattern for development, staging, and production endpoints.
- Test fixtures representing products, staff, locations, movements, FBA shipments, and permissions without copying PINs or other secrets.
- Automated checks for API routing, authentication requirements, authorization, stock rules, and syntax.
- Documented baseline of expected current behavior and known failures.

Exit checks:

- Every API action is classified as public-safe, authenticated read, or authenticated write. Business-data actions should have no public-safe classification.
- Tests run locally with one documented command.
- No test reads or writes the production workbook.

## Work package 2 — PIN login and session boundary

Purpose: keep the PIN-only employee experience while preventing the PIN from accompanying every request.

Status: complete locally on 2026-08-19; not deployable until later security packages and coordinated staging are complete.

Deliverables:

- POST-only login command.
- Salted PIN hashes and a reviewed migration utility/process.
- Unique-PIN validation.
- Failed-attempt counter, temporary lockout, and safe login audit.
- Random expiring server session tokens with logout/revocation.
- Session validation on every protected request.
- Safe staff-picker response containing no PIN, hash, or secret.

Exit checks:

- Correct active staff can log in.
- Wrong, duplicate, inactive, locked, expired, and revoked access fails.
- No PIN or session token appears in URLs or logs.
- Disabling staff blocks access and invalidates sessions according to the approved policy.

## Work package 3 — Backend authorization and API contract

Purpose: ensure every employee can access only their approved modules and actions.

Status: complete locally on 2026-08-19; capability assignments preserve current application intent and are recorded in `ROLE_CAPABILITIES.md`.

Deliverables:

- One backend role-to-capability matrix.
- Authenticated POST request envelope for reads and writes.
- Central router, input validation, consistent error envelope, and request correlation ID.
- Permission checks for every existing action.
- Tests for allowed and denied role/action combinations.

Exit checks:

- Every business data read and write requires a valid session.
- Removing a frontend button does not affect enforcement; direct unauthorized calls still fail.
- Unknown actions and invalid payloads fail closed.

## Work package 4 — Frontend access migration

Purpose: make the current application use the secured backend without changing the business scope.

Status: complete locally; do not deploy. The frontend now uses server capabilities, centralized session expiry, live-only staff discovery, fail-closed PIN confirmation, and runtime endpoint configuration.

Deliverables:

- One frontend API client for login, reads, writes, logout, expiry, and errors.
- Removal of GET writes and PIN query parameters.
- Removal of unsafe staff/PIN cache and offline authentication behavior.
- Role-aware navigation based on server-resolved permissions.
- Clear locked, expired, unauthorized, offline, and retry states.
- Configuration-driven API endpoint rather than a scattered hard-coded production URL.

Exit checks:

- Browser network requests contain no PIN/token in their URLs.
- Refresh/logout/expiry behavior matches the approved session policy.
- Current permitted workflows remain usable.

## Work package 5 — Concurrency and record integrity

Purpose: stop duplicate identifiers, retry duplication, partial operations, and approval-time stock errors.

Status: complete locally; do not deploy. All business writes are serialized and idempotent, aggregate/state commit ordering is defined, current stock is revalidated during approval, and partial failures create manual recovery records.

Deliverables:

- `LockService` around identifiers and critical inventory state changes.
- Durable idempotency records for retried commands.
- Approval-time stock revalidation under the same critical lock.
- Defined multi-sheet write ordering, completion markers, and recovery/exception records.
- Validation for product, location, movement, batch/expiry, quantities, and state transitions.
- Concurrency and retry tests.

Exit checks:

- Concurrent tests create no duplicate IDs.
- Retrying the same request creates no duplicate business event.
- Approval cannot produce negative stock.
- Simulated partial failure becomes recoverable and visible.

## Work package 6 — Private files and operational hardening

Purpose: remove public business-document exposure and make failures supportable.

Status: complete locally; do not deploy. New files are private, existing files have manual audit/hardening utilities, file bytes use an authenticated movement-scoped route, and safe operational errors feed a Founder/Co-Founder health summary.

Deliverables:

- Private attachment/report storage policy and implementation.
- Removal of `ANYONE_WITH_LINK` sharing behavior.
- Authorized file-access workflow.
- Safe error logging, audit retention, health checks, and owner-visible exceptions.
- Security regression checklist.

Exit checks:

- Unauthorized people cannot open operational evidence through a shared public link.
- Errors provide a request ID without leaking internal details or secrets.
- Security deployment gate in `SECURITY_AND_ACCESS.md` passes.

## Work package 7 — Owner review and deployment handoff

Purpose: provide a controlled package the owner can deploy themselves.

Status: local handoff deliverables complete. The owner subsequently deployed `3.0-wp7.1` directly during a production maintenance window and initial smoke tests passed. Isolated staging/UAT and rollback rehearsal were not performed, so those formal exit checks remain open and are documented in `PRODUCTION_RELEASE_RECORD.md`.

Deliverables:

- Final changed-file inventory.
- Test report and known-limitations report.
- Workbook schema/configuration migration checklist.
- Backup, staging, deployment, smoke-test, and rollback steps.
- Exact Apps Script and frontend publication sequence.

Exit checks:

- Local tests pass.
- Owner decisions are recorded.
- Staging/UAT results are recorded before production rollout.
- No production action is taken by the coding task.

## Recommended sequence after Phase 1

1. Phase 2: inventory correctness and historical reconciliation.
2. Phase 3: FBA shipment, transit, receipt, FC-level stock, and reconciliation.
3. Phase 4: purchase and marketplace/website operations.
4. Phase 5: social media and collaborations.
5. Phase 6: unified tasks, approvals, documents, alerts, and dashboards.

## Owner decisions retained for release approval

- PIN length and format.
- Failed-attempt threshold and lock duration.
- Session lifetime and idle-lock behavior.
- Which actions require PIN re-confirmation.
- Final mapping of current employees to roles/capabilities.
- How the owner wants to perform PIN resets and staff deactivation outside the normal employee interface.

Work package 1 can begin before these decisions because it is local, read-only with respect to production, and establishes the tests and permission inventory needed to make the choices safely.
