# Security and Access

## Access model

Syoat ERP uses PIN-only access for a fixed employee allowlist. This is a deliberate product decision.

- An employee selects their authorized identity and enters their PIN.
- There is no signup, invitation, password, email-link, or social-login flow.
- Only the owner-controlled Staff/`App_Logins` records determine who may log in.
- Employees cannot create accounts, activate staff, change roles, or reset another employee's PIN.
- Disabling an employee in the authoritative staff record must invalidate new access and active sessions promptly.

PIN-only describes the employee experience. Internally, the application must exchange the PIN once for a temporary opaque session token. The token, rather than the PIN, authenticates subsequent API calls.

## Required authentication flow

1. The client requests the safe active-staff picker list. It must not receive PINs, hashes, salts, private email fields not needed by the UI, or permission internals.
2. Login is submitted with `POST`; the PIN must never be a query-string value.
3. The server validates active status, PIN, failed-attempt policy, and role.
4. The server returns an opaque, expiring, revocable session token plus the minimum safe user profile and resolved permissions.
5. Every read and write action validates the session and its permissions on the server.
6. Logout revokes the session. Expired, disabled, or revoked sessions fail closed.

## PIN policy

- Continue supporting the current numeric PIN user experience during the initial migration.
- Every active employee must have a unique PIN; shared or duplicate PINs are not permitted.
- Store only a salted PIN hash, never the readable PIN.
- Do not commit PIN data or copy it into documentation, logs, local storage, or screenshots.
- Rate-limit failed attempts by employee and broader request source where the platform permits.
- Apply a temporary lock after repeated failures and audit both failures and lockouts without recording the attempted PIN.
- The exact PIN length, retry count, lock duration, session lifetime, and idle-lock behavior are configuration decisions recorded in `docs/DECISIONS.md` before production rollout.

The current local implementation preserves the four-digit numeric UI, supports four-to-six digits at the hash layer, locks after five failures for fifteen minutes, limits sessions to eight hours and thirty minutes idle, and re-confirms PIN before every current write. These are interim pre-release settings documented in `PIN_SESSIONS.md`.

## Authorization

- Authorization is checked on the server for every action, including reads.
- Permissions are expressed by module and capability, such as `inventory.view`, `inventory.move`, `inventory.approve`, `amazon.reconcile`, or `social.publish`.
- Roles map to capabilities in one backend-controlled policy table.
- Founder/Co-Founder override behavior must be explicit and audited.
- Frontend visibility follows backend permissions, but frontend hiding is never relied upon for security.
- High-impact operations may require PIN re-confirmation even during a valid session. Until the owner changes this decision, preserve the existing requirement to confirm PIN before write actions.

## Data and transport requirements

- Sensitive reads and all writes use authenticated `POST` requests. Do not put credentials or tokens in URLs.
- No business endpoint is public merely because the Apps Script web app itself is reachable.
- Uploaded evidence and marketplace files remain private. Never use `ANYONE_WITH_LINK` for business documents.
- Production and staging use separate configuration and, preferably, separate data stores.
- Error messages sent to the browser must not reveal internal sheet names, stack traces, secrets, or staff authentication data.
- Security-relevant activity is append-only and retained according to an owner-approved policy.

The local Work Package 6 implementation satisfies the private-file delivery and safe-error design in `PRIVATE_FILES_AND_OPERATIONS.md`. Existing live Drive files are unchanged until the owner runs the documented audit and migration after a coordinated deployment.

## Session requirements

- Tokens are random, unguessable, scoped to one employee, time-limited, and revocable.
- Store only a protected token representation server-side when practical.
- Do not persist tokens in `localStorage`. Prefer in-memory storage; `sessionStorage` may be used only after its browser risk is accepted and documented.
- A refreshed page may require re-authentication if secure restoration cannot be guaranteed.
- Privilege changes or staff deactivation invalidate outstanding sessions.

The local implementation stores only a SHA-256 hash of each opaque token in Apps Script Properties and rechecks both Staff and `App_Logins` active status whenever the session is used.

## Deployment gate

PIN-session work is not production-ready until tests demonstrate:

- unauthenticated reads and writes fail;
- wrong, locked, inactive, expired, and revoked access fails;
- permissions are enforced for every routed action;
- no PIN or token appears in a request URL or log;
- logout and staff deactivation invalidate access;
- public file sharing has been removed or replaced with authenticated delivery.

All code-level deployment-gate outcomes are covered by the local automated suite. D-022 excludes staging from the current Phase 2 workflow. Production readiness instead requires owner approval, current backup, an exact release/migration plan, local or sanitized verification, immediate live smoke/reconciliation evidence and a documented production rollback or recovery sequence.
