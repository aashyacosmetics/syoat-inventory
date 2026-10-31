# Phase 1 Staging and UAT Record

Status: **NOT RUN — PRODUCTION DEPLOYMENT IS BLOCKED**

This record must contain real staging evidence. Do not mark an item passed based only on the local automated suite.

## Release and environment

| Field | Record |
| --- | --- |
| Release candidate | `phase-1-local-2026-08-19` |
| Manifest reviewed | Pending |
| Staging workbook ID/reference | Pending — do not place it in public documentation |
| Staging Apps Script deployment/version | Pending |
| Staging frontend URL | Pending |
| Separate staging Drive root confirmed | Pending |
| Tester(s) | Pending |
| Test date/time | Pending |

## Migration evidence

| Check | Expected | Result/evidence |
| --- | --- | --- |
| Backup created before migration | Workbook, script, frontend and staging Drive evidence saved | Not run |
| Retired roles removed | No active `Owner` row in Staff or App_Logins | Not run |
| PIN precheck | Every active user has one unique 4–6 digit staging PIN | Not run |
| PIN migration | `migratePinsToHashes()` succeeds; readable PIN cells are empty; hashes/salts populated | Not run |
| Drive properties | Staging root and optional legacy folder IDs point only to staging copies | Not run |
| Privacy audit before | Exposure inventory saved | Not run |
| File hardening | `hardenOperationalDriveFiles()` completes with reviewed errors | Not run |
| Privacy audit after | Public/link-shared exception count is zero | Not run |
| Recovery baseline | `listWriteRecoveryRecords()` is empty or every item is explained | Not run |
| Error baseline | Founder health contains no unexplained error/recovery item | Not run |

## Functional and security UAT

Use staging-only users and data. Record the request/error ID for every unexpected result.

| Scenario | Expected result | Pass/fail and evidence |
| --- | --- | --- |
| Signed-out ping | Safe service/version response only | Not run |
| Public staff picker | Name, email and supported role only; no PIN/hash/salt/capabilities | Not run |
| Signed-out business read/write | Rejected | Not run |
| Founder login | Valid staging PIN creates a session | Not run |
| Wrong PIN and lockout | Failure is generic; five failures cause temporary lock | Not run |
| Inactive employee | Login and existing session fail | Not run |
| Refresh/close | Memory-only session is lost and PIN login is required | Not run |
| Logout | Session is revoked | Not run |
| Warehouse scope | Can see permitted operational data but not Founder/staff/other-employee restricted data | Not run |
| Founder/Co-Founder scope | Expected full classified operational access | Not run |
| Retired Owner role | Not shown and cannot log in | Not run |
| PIN confirmation | Every write requires server PIN confirmation | Not run |
| Movement create/approve | Correct IDs, maker-checker rule and stock result | Not run |
| Duplicate request replay | Same request ID does not create a second event | Not run |
| Competing stock approval | Negative stock cannot be approved | Not run |
| Stock count stale balance | Approval fails and requires a fresh count | Not run |
| Attachment upload | File is created in the configured staging root and remains private | Not run |
| Authorized attachment view | Visible only after authenticated click | Not run |
| Unauthorized attachment view | Denied before file delivery | Not run |
| Incognito/direct old link | Cannot open after hardening | Not run |
| FBA ledger archive | Private archive created in the configured staging root | Not run |
| Founder system health | Sanitized summary; no stack/internal messages | Not run |
| Non-founder system health | Forbidden | Not run |
| Existing core workflows | Products, stock, movement list, approvals, counts, support, purchasing and Amazon screens behave as authorized | Not run |

## Browser/device coverage

Record at least the actual employee browser/device combination and one second browser or mobile device.

| Browser/device | Result | Notes |
| --- | --- | --- |
| Primary employee environment | Not run | |
| Secondary environment | Not run | |

## UAT conclusion

- Blocking defects: Pending.
- Accepted limitations: Pending.
- Rollback rehearsal result: Pending.
- Founder approval for production: Pending.
- Co-Founder/second reviewer approval: Pending.

Production remains blocked until all release-critical rows pass, defects are resolved or explicitly accepted, rollback is rehearsed, and the deployment owner records approval here.
