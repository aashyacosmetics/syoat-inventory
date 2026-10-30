# Decision Log

Accepted decisions are binding until the owner explicitly changes them. Add new entries; do not erase historical decisions.

## Accepted

### D-001 — Single operations portal excluding daily accounts

- Date: 2026-08-19
- Decision: Syoat ERP will be the single access point for D2C operational activities, excluding daily financial accounts such as expenses, sales/revenue books, cash received or paid, and cash flow.
- Consequence: Sales order references, quantities, fulfilment, dispatch, cancellations, and returns are allowed for inventory and channel operations, but they must not become a sales ledger, collections record, or cash-flow system. Operational purchasing values and inventory estimates are allowed, but bookkeeping and statutory accounting workflows are not.

### D-002 — PIN-only access

- Date: 2026-08-19
- Decision: Employees authenticate using a PIN. No password, email-link, social-login, or customer-login flow will be added.
- Consequence: PIN security requires server-side verification, hashing, uniqueness, rate limiting, lockout, auditing, and temporary sessions.

### D-003 — Fixed, owner-controlled staff allowlist

- Date: 2026-08-19
- Decision: There will be no public signup, employee-created users, invitations, or in-app add-user feature. Only existing owner-authorized staff records can access the ERP.
- Consequence: Staff activation, deactivation, roles, and PIN resets remain owner-controlled administrative operations outside normal employee workflows.

### D-004 — Correct foundations before new modules

- Date: 2026-08-19
- Decision: Security, authorization, source control, concurrency, inventory correctness, and FBA reconciliation are corrected before adding website, marketplace, social, or collaboration modules.
- Consequence: New feature requests are placed on the roadmap unless they address a foundation risk.

### D-005 — Google Sheets/Apps Script remain near-term backend

- Date: 2026-08-19
- Decision: Preserve the current backend initially while introducing boundaries that support a later database/API migration.
- Consequence: Implement explicit API/domain/repository layers and compensate for Sheets' lack of transactions.

### D-006 — Amazon FCs are distinct locations

- Date: 2026-08-19
- Decision: FBA transit and each actual Amazon fulfilment centre are separate inventory locations with explicit receipt/reconciliation movements.
- Consequence: A snapshot cannot silently substitute for shipment receipt history.

### D-007 — Local changes; owner-controlled deployment

- Date: 2026-08-19
- Decision: Project work is saved and verified in the local repository. The owner will deploy Apps Script and publish the frontend themselves.
- Consequence: Coding tasks must not deploy, publish, push to GitHub, or mutate the live workbook. Every handoff must identify the exact local files changed and any manual deployment step the owner may perform after review.

### D-008 — Interim local PIN-session policy

- Date: 2026-08-19
- Decision: Implement the secure session foundation locally with compatibility for the existing four-digit numeric PIN UI, five failed attempts, a fifteen-minute lock, an eight-hour maximum session, thirty-minute inactivity expiry, no browser persistence, and server PIN confirmation before every current write.
- Consequence: These settings can be reviewed before release. The PIN hash format supports a later move to six digits without redesigning session storage.

### D-009 — Redesign files are ignored test artifacts

- Date: 2026-08-19
- Decision: `index-redesign.html` and `syoat-app-redesign.js` are old test uploads created before editing the live version. They are excluded from active development, tests, API catalogues and publication.
- Consequence: The active frontend source is `index.html` and `syoat-app.js`. Do not edit or publish the redesign artifacts unless the owner explicitly reverses this decision.

### D-010 — Central capability matrix preserves current role intent

- Date: 2026-08-19
- Decision: Every authenticated business action is assigned one backend capability, and roles receive the capability groups documented in `ROLE_CAPABILITIES.md`.
- Consequence: Backend enforcement is authoritative. Existing handler-level role, ownership, maker-checker and state rules remain as narrower restrictions.

### D-011 — Founder and Co-Founder replace the retired Owner role

- Date: 2026-08-19
- Decision: `Owner` is not a valid ERP role. Founder and Co-Founder are the only top-authority roles and receive full classified operational capabilities.
- Consequence: The public picker omits `Owner` rows and login fails closed if the Staff role is unsupported. Any existing Sheet row using `Owner` must be changed manually to Founder or Co-Founder before deployment.

### D-012 — Serialized, durable writes compensate for Google Sheets transactions

- Date: 2026-08-19
- Decision: Every business command requires a request ID and runs inside one Apps Script script lock. Script Properties retain the command fingerprint, status, identifier checkpoints and result; aggregate headers and state fields are written last as commit markers.
- Consequence: Completed retries replay their original result. In-progress or failed requests stop for Founder review through the manual recovery functions documented in `WRITE_INTEGRITY.md`; they are never silently repeated.

### D-013 — Operational files are private and delivered through the authenticated API

- Date: 2026-08-19
- Decision: Uploaded evidence and generated marketplace reports remain private in Drive. Sheet rows store opaque file descriptors and the active frontend obtains file bytes only through a session-protected, capability- and movement-scoped POST action.
- Consequence: Public Drive links are unsupported. Existing files require the owner-run audit and hardening migration in `PRIVATE_FILES_AND_OPERATIONS.md`; in-app viewing is limited to 8 MB per file.

### D-014 — Safe operational errors and restricted health visibility

- Date: 2026-08-19
- Decision: Unexpected backend failures return only a safe message plus request/error references. Detailed records are kept in capped Script Properties storage, and only Founder/Co-Founder can view the sanitized system-health summary.
- Consequence: Resolved operational error records are cleaned after 90 days and storage is capped at 100. Business audit/document retention remains an open module-level policy decision.

### D-015 — Drive roots are environment-specific Script Properties

- Date: 2026-08-19
- Decision: Apps Script resolves the operational Drive root from `SYOAT_DRIVE_ROOT_FOLDER_ID` and the optional legacy folder from `SYOAT_LEGACY_ATTACHMENTS_FOLDER_ID`. Global folder-name discovery is unsupported.
- Consequence: Staging and production must use different explicit folder IDs. Missing/invalid configuration fails closed or appears in Founder health instead of falling back to a similarly named folder.

### D-016 — Performance improvements preserve PIN controls

- Date: 2026-08-19
- Decision: Phase 2 will reduce duplicate requests, lazy-load secondary modules, use revision-safe caching/incremental refresh, batch Sheet operations, classify retryable failures and measure performance. PIN login and server PIN reconfirmation before every write remain mandatory.
- Consequence: Performance telemetry is limited to safe action/timing/outcome/request-reference fields and must never contain actual PINs, PIN hashes/salts, session tokens, private file URLs or business payloads. Cached stock is not authoritative for approval, and retry optimization cannot weaken idempotency, locking, maker-checker or audit controls.

### D-017 — Effective staff access requires aligned active records; Opening Balance is Founder-only

- Date: 2026-10-23
- Decision: The public staff picker returns only identities active in both `Staff` and `App_Logins`, with live-schema `Staff.FullName` and `Staff.Role` authoritative. The backend accepts legacy `Staff.Name` only as a compatibility fallback for older fixtures/copies. Staff/App Login mismatches are reported without email or credential data in Founder System Health. Opening Balance is restricted to the Founder as a migration/setup action.
- Consequence: An archived or missing Staff record cannot appear in the picker even when its App Login remains active. Missing or inactive App Login rows continue to block access. Co-Founder retains broad operational access but neither receives the Opening Balance UI capability nor passes the backend Opening Balance guard. This code decision does not add, activate, archive, or delete any Sheet row.

### D-018 — FBA dispatch, receipt and report evidence form one controlled chain

- Date: 2026-10-27
- Decision: Align warehouse-to-FBA dispatch, transit, Amazon receipt and FBA report upload as one traceable inventory chain. A report snapshot is evidence and cannot silently substitute for a shipment receipt or auto-approve an unexplained adjustment. Phase 2 may implement an aggregate `AMAZON_FBA` bridge; individual FC stock locations, splits and full lifecycle automation remain Phase 3.

### D-019 — Owner-authorized direct-live Phase 2 FBA rollout

- Date: 2026-10-27
- Status: accepted owner exception
- Decision: The owner explicitly directed the Phase 2 FBA work to skip staging and proceed only against the live Apps Script/GitHub application. This exception applies to the prepared FBA bridge only and does not authorize historical inventory rewrites. Release order remains backend first, frontend second, followed by immediate live health, role-access, dispatch-draft and report-safety verification. Staff report uploads remain paused until those checks pass.
- Consequence: New dispatches must reference an open shipment, receipts must clear only linked dispatched quantity, partial/unresolved transit stays visible, duplicate report processing fails closed, and any remaining report variance uses a Pending maker-checker count/adjustment with reason and evidence. Historical records require a reviewed dry-run remediation; they are not silently edited or linked by date.

### D-020 — Imported FBA variances require classification before resolution

- Date: 2026-10-28
- Decision: An imported FBA report variance is reviewed only through the dedicated `Review FBA Variance` action. A Manager classifies it as sale timing, receipt, damage/loss, removal order or unexplained and records a short evidence note. Classification remains a Pending evidence record; it does not approve the count, create a movement or change stock.
- Consequence: Generic stock-count approve, edit and reject actions are blocked for imported FBA variance rows in both the frontend and backend. Any later inventory correction must be a separate evidence-backed resolution that preserves maker-checker, PIN confirmation, audit and recovery controls.

### D-021 — Keerthana and Sai Ram have no ERP access

- Date: 2026-10-29
- Decision: The owner explicitly denied ERP login access to Keerthana (active Co-Founder staff record) and Sai Ram (active Accounts staff record). Their Staff records remain active for business/audit identity, while `App_Logins` must contain one matching row each with status `Inactive` and blank PIN, PIN hash and PIN salt fields.
- Consequence: An explicit `Inactive` or `Archived` App Login row is a recorded intentional denial and is not a System Health mismatch. A completely missing login row for an active Staff record remains a mismatch until the owner records either an active login or an explicit non-active denial. Non-active login rows never appear in the picker and cannot authenticate.

### D-022 — Staging is excluded from the current Phase 2 workflow

- Date: 2026-10-30
- Status: accepted owner decision
- Decision: The owner excludes staging from the current Phase 2 continuation, synchronization and release workflow. Existing staging resources and records are retained as historical evidence but are not an open gate, required execution environment or prerequisite for current Phase 2 work. This supersedes the narrower D-019 exception and the older Phase 2 plan language that required staging/UAT and a staging rollback rehearsal.
- Consequence: Work remains local-first and the owner alone deploys, publishes or authorizes live-data changes. Before any owner-approved live release or migration, the project still requires local automated checks, an exact changed-file manifest, current backups, dry-run output for data changes, bounded/idempotent execution, backend-first release where applicable, immediate production smoke/reconciliation checks and a documented production rollback or recovery sequence. Excluding staging does not authorize Codex to deploy, publish, push, alter live configuration or mutate production data.

## Open decisions

### Access and production-baseline decisions captured 2026-10-23

- Keerthana and Sai Ram access decisions were resolved as **No** under D-021. The owner confirmed the task closed on 2026-10-30 with matching `Inactive` App Login rows and blank PIN/hash/salt fields; no further access action is open.
- Decide whether Sravanthi should remain archived. The local candidate now hides the archived identity from the picker; if the archive is permanent, the stale active `App_Logins` row should still be deactivated deliberately, while restoration requires explicit owner approval.
- Decide whether to change the live workbook timezone from `America/Los_Angeles` to an India timezone after assessing formulas, triggers, stored timestamps, and reports.
- Decide whether the Record Movement form should continue opening on Setup -> Opening Balance -> Warehouse or default to the most common safe staff workflow.
- Confirm the retention purpose of the two older workbooks and the untitled Google Doc in `01_Backend`.
- Decide whether and how to remove the trailing space from `03_FBA_Documents/03_Returns_Removals `; this requires a coordinated code/configuration change, not a Drive-only rename.

These must be resolved before the relevant production rollout:

- PIN format and length: preserve four digits or migrate to a longer numeric PIN.
- Whether the interim failed-attempt, lock, session and re-confirmation settings in D-008 should become the final production policy.
- Final capability refinements for non-founder roles based on operational review.
- Who besides the owner, if anyone, may disable staff or reset a PIN.
- Production hosting remains an open long-term platform decision. Current Phase 2 staging use is resolved by D-022: staging is excluded unless the owner explicitly reopens it.
- Document retention and access rules by module.
- Objective thresholds that trigger migration from Sheets/Apps Script.
