# PIN Session Implementation

Status: implemented and tested locally; not approved for deployment.

## Employee experience

1. Select an existing active employee.
2. Enter the current four-digit PIN.
3. The server verifies the salted PIN hash and returns a temporary opaque session token.
4. The browser keeps the token in memory only.
5. The current application re-confirms the PIN with the server before each write.
6. Logout revokes the token. Refreshing or closing the page requires login again.

No signup, invitation, new-user, password, email-link, or OAuth flow has been added.

## Implemented backend controls

- `login`: POST-only PIN login.
- `confirmPin`: re-checks the PIN for the employee represented by the session.
- `verifySession`: validates and returns the safe current employee profile.
- `logout`: deletes the hashed session record.
- Salted SHA-256 PIN hashes in `App_Logins.PINHash` and `App_Logins.PINSalt`.
- Plaintext PIN migration that validates all rows before writing and clears readable PIN cells after hashing.
- Duplicate active-PIN detection before migration.
- Five failed attempts followed by a fifteen-minute lock.
- Eight-hour maximum session life.
- Thirty-minute inactivity expiry.
- Session record cleanup during new login.
- Current Staff and `App_Logins` active status rechecked on every session use.
- Session identity mismatch rejection on writes.
- Only a SHA-256 token hash is stored in Script Properties.

## Implemented frontend controls

- The active frontend calls `login`, `confirmPin`, and `logout` using POST bodies.
- All current frontend writes now use POST and an in-memory session token.
- No readable PIN is retained after login or PIN confirmation.
- No session token is written to local storage or session storage.
- Refresh requires a fresh PIN login.
- The older redesign file was not migrated and must not be published.

## PIN migration behavior

The manual Apps Script function `migratePinsToHashes()`:

1. takes a script lock;
2. adds `PINHash` and `PINSalt` headers when absent;
3. validates active PIN format;
4. refuses duplicate active PINs;
5. computes a unique salted hash for every populated PIN;
6. clears the plaintext `PIN` cells only after validation succeeds.

The local audit previously found duplicate active PINs. The migration will deliberately stop until the owner assigns unique values. No PIN value is recorded in project files or documentation.

## Interim policy implemented locally

| Setting | Local implementation |
| --- | --- |
| Current UI PIN length | 4 numeric digits |
| Hash layer compatibility | 4–6 numeric digits |
| Failed attempts | 5 |
| Lock duration | 15 minutes |
| Maximum session | 8 hours |
| Inactivity expiry | 30 minutes |
| PIN re-confirmation | Before every current write |
| Browser persistence | None |

These values remain subject to owner review before release.

## Why deployment must wait

This change is intentionally incompatible with the currently deployed frontend/backend when deployed one side at a time. A coordinated release is required. More importantly:

- concurrency, approval-time stock validation, durable idempotency and private-file delivery are complete locally in Work Packages 5–6; the live application remains unchanged until the owner-run coordinated release and file migration.

All seven local work packages are complete and Work Package 7 preserves the historical staging, backup, migration, smoke-test and rollback handoff. D-022 excludes staging from the current Phase 2 workflow. Any future release still requires owner approval, current backup, local/sanitized verification, immediate live smoke checks and a documented production rollback or recovery sequence. Codex must not run a live migration or deploy these files.

## Local verification

The local suite tests successful hashed login, token hashing, PIN lockout, PIN confirmation, logout, expiry, deactivation, expired-session cleanup, migration, duplicate refusal, POST transport, and absence of browser credential persistence.

Run:

```powershell
npm run check
```
