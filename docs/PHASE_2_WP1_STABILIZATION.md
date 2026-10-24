# Phase 2 Work Package 1 — Stabilization and Isolated Staging

Status: in progress; local safeguards and read-only production evidence prepared. Owner staging setup and live health evidence remain pending.

## Safety boundary

- Production inspection mode: read-only.
- No live Sheet, Drive, Apps Script or GitHub write was performed.
- No PIN, PIN hash/salt, session token, private attachment URL or populated environment identifier is stored in this record.
- The owner alone creates/copies staging resources, changes Apps Script Properties, deploys the staging web app and publishes any staging frontend.
- Inventory correction and migration work remains blocked until the staging record passes.

## Read-only production evidence — 2026-08-19

The connected workbook metadata and bounded sheet ranges were inspected through the Google Drive/Sheets connector.

| Check | Observation | WP1 disposition |
| --- | --- | --- |
| Workbook identity | `Syoat Inventory ERP - Live Backend.xlsm` was reachable through the recorded production spreadsheet ID | Pass; ID is not repeated in this record |
| Workbook structure | 24 tabs present | Pass for stabilization; detailed row counts and data diagnosis belong to WP2 |
| Core schemas | Products, locations, staff, movements, counts, purchasing, sales, FBA, audit, settings and lists headers are present | Pass for bounded schema availability |
| PIN migration | Readable PIN field was blank in the bounded authentication-row check | Pass; authentication hash/salt values are deliberately not recorded |
| Privacy migration | Prior owner evidence remains 187/187 private with zero errors | Pass based on `PRODUCTION_RELEASE_RECORD.md`; not rerun |
| Workbook timezone | `America/Los_Angeles` | Open configuration defect: business display/storage policy should use `Asia/Kolkata`; correct only after staging verification |
| Founder system health | Requires an authenticated Founder/Co-Founder application check | Pending owner evidence |
| Write recovery | Stored in Apps Script Properties and requires `listWriteRecoveryRecords()` or Founder health | Pending owner evidence |
| Recent operational errors | Restricted Apps Script health data; not inferred from Sheet rows | Pending owner evidence |
| Login failures/lockouts | Founder health/login review required; no authentication secrets should be exported | Pending owner evidence |
| Request timing | Local candidate `3.1-phase2-wp1.1` returns safe server duration and keeps a Founder-only, in-memory browser timing summary | Ready for staging measurement; no production timing claim |

The bounded schema read found no reason to stop normal production use. It is not an inventory reconciliation and does not supersede WP2.

## Owner monitoring evidence required

Record only counts, safe request/error references and disposition—never authentication material or internal stack traces.

1. Log in as Founder and open System Health.
2. Record unresolved operational-error count, recovery count and privacy summary.
3. Review failed/locked login counts for the first business day and identify whether each is expected user error or unexplained activity.
4. If recovery count is non-zero, run `listWriteRecoveryRecords()` from the Apps Script editor and stop before retrying or editing any affected business record.
5. Preserve deployment/migration execution logs and the pre-release backups.
6. In staging, record warm/cold login-picker and inventory-load timings from the Founder performance summary; record action, duration, outcome and safe request reference only.

Any unexplained recovery item, privacy exposure, repeated operational error or stock change without an approved movement blocks Phase 2 staging writes.

## Isolated staging design

The backend uses `SpreadsheetApp.getActiveSpreadsheet()`. Therefore the staging Apps Script project must be bound to the private staging workbook; copying only the frontend or changing a URL is insufficient.

Staging must have all of the following:

- a private workbook copy with a clearly marked staging title;
- a separate bound Apps Script project/deployment using the reviewed local `Code.gs`;
- a separate private Drive root configured as `SYOAT_DRIVE_ROOT_FOLDER_ID`;
- an optional legacy folder that is also staging-only;
- a staging web-app URL distinct from production;
- a staging frontend runtime configuration distinct from production;
- staging-only PIN hashes and notification recipients, with readable PIN cells cleared after migration;
- `SYOAT_ENVIRONMENT=staging`; staging notifications fail closed without an explicit `SYOAT_NOTIFICATION_RECIPIENTS` test mailbox and all enabled staging subjects are prefixed `[STAGING]`;
- sanitized customer/contact data where it is not required for inventory scenarios;
- the workbook timezone set and verified as `Asia/Kolkata`;
- access limited to the Founder, Co-Founder and named UAT employee(s).

## Local isolation gate

Copy `config/environments.example.json` to the gitignored `config/environments.local.json`, populate only non-secret environment identifiers, and run:

```powershell
npm run check:staging
```

The gate fails if required values remain placeholders, if staging reuses the production API URL/workbook/Drive root, if environment classifications are wrong, or if credential-like fields are added. Passing this structural check does not replace the manual staging/UAT evidence.

## Exit state

Local WP1 preparation is complete when automated checks pass. WP1 itself remains open until `PHASE_2_STAGING_RECORD.md` contains actual owner evidence for production health, isolated resource identities, a Founder and non-founder login, a reversible staging write and a rollback rehearsal.

The local timing implementation does not send performance records back to the server or store them in Sheets/Drive. It aggregates action name, client round-trip duration, server duration and success/failure only in the current browser session. Closing/refreshing the browser clears it. PIN login and server PIN reconfirmation remain unchanged.

## Request-scoped Sheet read optimization — 2026-10-24

Production timing after the reviewed `CNT-046` correction showed `approveStockCount` at 11,499 ms, `createStockCount` at 5,609 ms and `getSystemHealth` at 5,526 ms with zero failures. Local backend candidate `3.1-phase2-wp1.5` introduces a request-scoped read-through cache for parsed Sheet tables and header rows.

- The cache exists only during one `doGet` or `doPost` execution and is discarded before the response returns.
- `appendRow()` and `updateRow()` invalidate the affected table's cached object rows immediately after a successful mutation.
- Header rows remain reusable within the request because these business commands do not change schema.
- A later HTTP request always starts with an empty cache; approval-time stock validation therefore continues to read the current workbook state under the existing business-write lock.
- Authentication, authorization, PIN confirmation, idempotency, recovery checkpoints, maker-checker rules, audit records and stock validation are unchanged.

This is a local candidate only. Its performance effect must be measured after owner deployment using the same Founder current-browser summary; no duration improvement is claimed from local in-memory tests.

## Startup authentication optimization — 2026-10-24

The clean production startup sample after backend `3.1-phase2-wp1.5` measured `getAppLogins` at 3,012 ms and `login` at 4,125 ms. Local candidate `3.1-phase2-wp1.6` makes two bounded changes:

- `getAppLogins` caches only the already-public sanitized picker array (`name`, `email`, `role`) in server-side Script Cache for 30 seconds. PIN material, status rows, session data and internal capabilities are excluded. A real login still rereads the live Staff and App Login sheets and fails closed for an inactive or unsupported account.
- Session cleanup records a compact index of session-property keys. The first login after upgrade discovers existing session keys once; later logins inspect only those keys instead of scanning unrelated idempotency, recovery and operational-error properties. Expiry, inactivity, deactivation and revocation checks are unchanged.

The owner deployed this candidate on 2026-10-24. A read-only ping confirmed backend `3.1-phase2-wp1.6`, status `ok` and 2 ms server duration at 16:04:30 IST. The first/cold four-call screenshot recorded 3,436 ms average, 4,156 ms maximum and zero failures; `getInventoryBootstrap` was 4,156 ms, `login` was 4,003 ms and `getSystemHealth` was 3,096 ms. `getAppLogins` was not among the three slowest actions.

The immediate warm repeat recorded four calls, 3,875 ms average, 5,373 ms maximum and zero failures. `getInventoryBootstrap` was 5,373 ms, `login` was 3,891 ms and `getSystemHealth` was 3,367 ms. From the rounded aggregate, the unlisted fourth call (`getAppLogins`) was approximately 2,869 ms. Compared with the `3.1-phase2-wp1.5` sample, login improved from 4,125 ms by about 6% and the picker improved from 3,012 ms by about 5%; both remain above the 1–2 second warm target and the overall sample shows normal Apps Script variability. The bounded optimization is retained because it removes known duplicate work without weakening controls, but stronger caching of authoritative authentication rows is not justified by this evidence.
