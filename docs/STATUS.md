# Current Status and Handoff

Last updated: 2026-10-24

## Active phase

Phase 1 is complete and stored in `PHASE_1_COMPLETION.md`. Backend `3.1-phase2-wp1.6` and frontend build `20261023-access-baseline.1` are in production. Phase 2 Work Package 1—production stabilization and isolated staging—is in progress. Read-only workbook/schema evidence and local staging-isolation safeguards are prepared; isolated resources, UAT and rollback rehearsal remain mandatory before inventory correction or migration.

Backend `3.1-phase2-wp1.6` retains request-scoped Sheet read reuse and adds a 30-second sanitized picker cache plus a compact session-property index for the measured startup delays. The owner deployed it on 2026-10-24; the frontend is unchanged.

## Current implementation baseline

- Frontend repository: `aashyacosmetics/syoat-inventory`.
- Local audit checkout contains `index.html`, `syoat-app.js`, styling, images, and older redesign artifacts.
- Current backend: bound Google Apps Script connected to the live workbook.
- The original supplied 2,145-line backend source was saved locally as `Code.gs`; that local file now contains the reviewed Work Package 2–7 changes and is no longer a byte-for-byte copy of the attachment.
- GitHub `main` was verified at commit `8443e09` on 2026-10-24. The four owner upload commits correctly stored backend `3.1-phase2-wp1.5`, its three documentation files and two performance-test files in their intended paths.
- The current Apps Script and GitHub frontend have been deployed by the owner. Updated source/test/documentation files for backend `3.1-phase2-wp1.6` are local until owner publication to GitHub.
- No package manifest, automated test suite, CI workflow, deployment guide, or staging configuration was present at the audit baseline.
- Both committed JavaScript artifacts passed a basic Node syntax check during the audit.

## Data baseline from read-only workbook audit

- 14 products and 12 combo/BOM component lines.
- 11 locations and 7 staff records.
- 192 movement headers and 337 movement lines.
- 185 approved and 7 rejected movements at inspection time.
- 64 FBA snapshot records and 38 stock counts.
- 57 login events, 66 audit records, and 428 change-log rows.
- No duplicate movement IDs, orphan movement lines, invalid movement locations, or negative calculated balances were detected in that snapshot.

Estimated balances at inspection time were approximately:

| Location | Units | Estimated value |
| --- | ---: | ---: |
| Main warehouse | 16,882 | ₹15.11 lakh |
| FBA transit | 1,429 | ₹2.51 lakh |
| Amazon FBA snapshot | 871 | ₹1.61 lakh |
| Returns | 4 | Not materialized in summary |
| Damage | 232 | ₹32.4 thousand |
| Samples | 67 | ₹8.7 thousand |

These are audit-time estimates, not live accounting values. Re-fetch before relying on them operationally.

## Historical audit risks

This list records the original audit baseline for history. Later releases deployed the authentication, authorization, private-file, write-boundary, and source-location corrections. Do not treat every bullet below as a description of the current release; use the dated handoff log and re-verify remaining inventory/FBA risks before acting.

- Many reads are available without authentication through `doGet`.
- Some frontend writes send PINs in GET query strings.
- PINs are short/readable in the current data model; duplicates were observed.
- There is no failed-attempt rate limit.
- ID generation and idempotency are not sufficiently atomic/durable.
- Stock is validated at draft creation but not safely revalidated at approval under a lock.
- Multi-sheet workflows can leave partial writes.
- Some automated flows create and approve under the same employee and can fail after writing a draft.
- Uploaded evidence and Amazon report files can be shared as `ANYONE_WITH_LINK`.
- The live data showed no FBA transit-to-specific-FC receipt movements.
- The Amazon snapshot inspected was stale and FBA transit remained uncleared.
- Batch/expiry and unit-cost completeness are inconsistent.
- The frontend hard-codes a production Apps Script endpoint.
- The older redesign contains unsafe obsolete authentication/cache behavior and must not be treated as production source.

## Next recommended task

Publish the reviewed backend `3.1-phase2-wp1.6` source/test/documentation files to GitHub. Then return to the remaining Work Package 1 gate: establish isolated staging and rehearse rollback before the next inventory migration.

## Production state

- Documentation/test files for backend `3.1-phase2-wp1.5`: verified on GitHub `main` through commit `8443e09`; candidate `3.1-phase2-wp1.6` records remain local.
- Apps Script `Code.gs`: owner deployed backend `3.1-phase2-wp1.6`; public health returned status `ok`, the expected version and 2 ms server duration on 2026-10-24 16:04:30 IST.
- GitHub frontend: build `20261023-access-baseline.1` published from commit `104c6e8` and GitHub Pages deployment #80 at verification time.
- Live Google Sheet: PIN hashes/salts populated, readable PIN cells cleared, and 85 movement file references normalized.
- Live Drive: the earlier migration audit reported 187 checked and private; the later read-only folder inventory observed at least 359 owner-only/not-shared files.
- Deployment: owner-run production deployment completed and the owner confirmed the ERP is working.

## Handoff log

### 2026-10-24 — Phase 2 startup authentication optimization deployed and measured

- Status: deployed by the owner, verified read-only in production and measured with cold and immediate warm samples. No frontend publication was required.
- Goal: reduce the measured `getAppLogins` 3,012 ms and `login` 4,125 ms startup delays without weakening PIN, status, session, capability or audit controls.
- Roadmap item: Phase 2 Work Package 1 performance stabilization.
- Files changed: `Code.gs`, `tests/helpers/apps-script-harness.mjs`, `tests/apps-script-baseline.test.mjs`, `tests/phase-2-performance.test.mjs`, `docs/PHASE_2_WP1_STABILIZATION.md`, `docs/CHANGELOG.md`, and this status record.
- Picker behavior: the server caches only the sanitized public picker array (`name`, `email`, `role`) for 30 seconds. A login never trusts that cache; it rereads current Staff and App Login rows and verifies the stored salted PIN hash.
- Login behavior: session cleanup now maintains a compact session-property index. After the first discovery scan, later logins no longer enumerate unrelated write-request, recovery and operational-error properties. Session maximum/idle expiry, deactivation checks, token hashing, lockout, login audit and logout remain enforced.
- Local version: backend `3.1-phase2-wp1.6`; frontend remains `20261023-access-baseline.1`.
- Checks and results: both active JavaScript files parse; all 73 automated tests pass, including sanitized picker caching, live-row login enforcement and session-index reuse; the 48-action API catalogue is current; the environment template passes its structural safety check with expected unconfigured-environment warnings.
- Production evidence: a direct read-only ping returned backend `3.1-phase2-wp1.6`, status `ok` and 2 ms server duration at 16:04:30 IST. The owner screenshot showed four calls, 3,436 ms average, 4,156 ms maximum and zero failures. The displayed slowest actions were `getInventoryBootstrap` 4,156 ms, `login` 4,003 ms and `getSystemHealth` 3,096 ms; `getAppLogins` was not in the slowest three.
- Live/production changes: the owner updated the existing Apps Script deployment. Codex did not change Sheet data, Drive, live Script Properties, GitHub or the frontend.
- Warm evidence: the immediate repeat showed four calls, 3,875 ms average, 5,373 ms maximum and zero failures. The displayed slowest actions were `getInventoryBootstrap` 5,373 ms, `login` 3,891 ms and `getSystemHealth` 3,367 ms. The rounded aggregate places the unlisted `getAppLogins` call at approximately 2,869 ms.
- Interpretation: versus the `3.1-phase2-wp1.5` sample, login improved by about 6% and the picker by about 5%, but both remain above the 1–2 second warm target and the bootstrap varied upward. The change is retained because it removes bounded duplicate work; no stronger cache of authoritative authentication rows is justified because that would increase stale-access risk for little measured benefit.
- Next recommended action: publish the reviewed `3.1-phase2-wp1.6` source/test/documentation files to GitHub, then complete the isolated-staging and rollback-rehearsal gate before inventory migration work.

### 2026-10-24 — Phase 2 request-scoped Sheet read optimization ready for owner review

- Status: deployed by the owner and verified read-only in production. No frontend publication was required.
- Goal: reduce repeated full-Sheet reads inside one API execution, focusing on the measured `approveStockCount`, `createStockCount` and `getSystemHealth` delays without weakening correctness controls.
- Roadmap item: Phase 2 Work Package 1 performance stabilization; cross-cutting support for Work Packages 4–6.
- Files changed: `Code.gs`, `tests/helpers/apps-script-harness.mjs`, `tests/phase-2-performance.test.mjs`, `docs/PHASE_2_WP1_STABILIZATION.md`, `docs/CHANGELOG.md`, and this status record.
- Behavior: `doGet` and `doPost` now use a request-local parsed Sheet/header cache. Repeated reads of an unchanged table in the same request reuse the first result. `appendRow()` and `updateRow()` invalidate cached object rows for the affected table; every new HTTP request starts empty.
- Safety: approval-time stock checks still begin from a fresh request and run under the existing write lock. PIN confirmation, sessions, backend capabilities, idempotency, recovery, maker-checker, audit, commit-marker ordering and live Sheet schemas are unchanged.
- Local version: backend `3.1-phase2-wp1.5`; frontend remains `20261023-access-baseline.1`.
- Checks and results: both active JavaScript files parse; all 70 automated tests pass, including duplicate-read reuse, post-write invalidation and request-cache disposal; the 48-action API catalogue is current; the committed environment template passes its structural safety check with expected unconfigured-environment warnings.
- Production verification: a direct read-only ping returned success, status `ok`, backend `3.1-phase2-wp1.5` and 2 ms server duration at 2026-10-24 15:40:18 IST. The owner-provided fresh-session screenshot showed 4 calls, 3,553 ms average, 4,234 ms maximum and zero failures; the three slowest displayed calls were `getInventoryBootstrap` 4,234 ms, `login` 4,125 ms and `getAppLogins` 3,012 ms.
- Interpretation: this is a clean four-call startup sample and is not directly comparable to the earlier 19-call session containing stock-count writes. It passes the cold-load target for the 4,234 ms inventory bootstrap, but the 3,012 ms staff picker and 4,125 ms login remain above the 1–2 second warm target and need further measured optimization.
- Live/production changes: the owner updated the existing Apps Script deployment. Codex did not change Sheet data, Drive, Script Properties, GitHub, staff access or production configuration.
- Next recommended action: push the reviewed source/test/documentation changes to GitHub, then optimize the login picker and login path from a fresh read-only call-count profile.

### 2026-10-24 — Phase 2 production health items classified read-only

- Status: diagnosis and reviewed cleanup complete. At 2026-10-24 14:40:09 IST the owner-run audit returned zero recovery items and zero unresolved operational errors.
- Recovery evidence: request `mt3zcy1yo9fh5` targeted `CNT-037` and request `mt3zcc0mf29bl` targeted `CNT-038`. Both failed `approveStockCount` with zero write checkpoints.
- Count evidence: both rows remain `Pending`, have no approver and no adjustment movement ID, and each records `PRD-P002` at `MAIN_WH` with saved system quantity `2091`, physical quantity `2092`, and difference `+1`.
- Ledger evidence: neither count ID appears in `Movement_Headers`; no approval audit/change entry exists. The approved movement ledger currently calculates `PRD-P002` at `MAIN_WH` as `1880`, so the approval-time stale-stock guard stopped both requests before `createMovement()` could allocate or append an adjustment.
- Recovery result: both request markers were preserved as `RESOLVED_NO_RETRY`; neither approval will be retried. Reject both stale count rows, then physically recount and create one fresh count only if correction is still needed.
- Error evidence: all seven unresolved records are unlinked `login` errors categorized `PLATFORM_TEMPORARY`, occurring from 2026-08-24 12:18:10 to 12:22:06 IST. `Login_Log` records a successful login at 12:22:32 IST, 26 seconds after the final error, followed by later successful logins.
- Error result: the seven login errors were marked resolved with notes that they were transient platform failures and normal login recovered; no business-write recovery was linked to them.
- Privacy: the durable record omits employee identity, PIN/session values, raw errors, stacks, user agents, private URLs and file IDs.
- Verification: the resolution helper's immediate follow-up `auditPhase2SystemHealth()` and the separate logged audit both returned `recoveryRequired: []` and `unresolvedErrors: []`.
- Stale-count cleanup: the owner rejected `CNT-037` and `CNT-038`; a read-only Sheet verification confirmed both are `Rejected`, have no adjustment movement ID, and therefore did not change inventory.
- Fresh-count result: the owner physically recounted `PRD-P002` (Syoat Scalp Balance Kids Hair oil, 100ml) at `MAIN_WH`, created `CNT-046` with system quantity `1880`, physical quantity `1881` and difference `+1`, then approved it. Owner screenshots confirmed `CNT-046` is `Approved`, adjustment `MOV-381` was created, and the Inventory product card now reports Warehouse quantity `1881`.
- Post-approval health: Founder System Health shows zero write-recovery items, zero unresolved errors and zero missing sheets. Two previously known staff-access mismatches remain, and two unrelated draft movements still await normal review.
- Performance evidence: the successful browser session reported zero failures across 19 calls, average 4,356 ms, with `approveStockCount` at 11,499 ms, `createStockCount` at 5,609 ms and `getSystemHealth` at 5,526 ms. Treat these as the next Work Package 1 performance baseline rather than a stock-correction failure.
- Next recommended action: inspect the two pending movements on their business merits; do not approve them merely to clear the banner. Then address the two known staff-access decisions and begin the approved performance work.

### 2026-10-24 — Phase 2 safe health diagnostic ready for owner execution

- Status: local implementation complete; ready for owner save and read-only execution. A web-app deployment is not required for this manual editor function.
- Goal: safely capture the evidence needed to classify the two recovery items and seven unresolved operational errors without exposing sensitive internals or changing production records.
- Files changed: `Code.gs`, `tests/apps-script-baseline.test.mjs`, `tests/phase-2-performance.test.mjs`, `docs/WRITE_INTEGRITY.md`, `docs/CHANGELOG.md`, and this status record.
- Behavior: new manual `auditPhase2SystemHealth()` correlates recovery and error records by request ID and returns only safe identifiers, actions, timestamps, checkpoints, categories, and correlation state.
- Privacy: employee identity, payloads, fingerprints, raw messages, stacks, URLs, file/folder IDs, PIN data, session data and configuration values are omitted.
- Local version: backend `3.1-phase2-wp1.4`; frontend unchanged at `20261023-access-baseline.1`.
- Checks and results: both active JavaScript files parse; all 69 automated tests pass; the 48-action API catalogue remains current; the environment template passes structural safety checks.
- Live/production changes: none. No Sheet, Drive, Script Property, recovery marker, operational error, Apps Script deployment or GitHub file was changed.
- Owner action: replace the Apps Script editor source with the prepared `Code.gs`, save without updating the web-app deployment, run `auditPhase2SystemHealth()` once from the editor, and provide only the returned/logged JSON summary. Do not run either resolve function.
- Next recommended action: classify every returned item and identify the exact read-only Sheet/log comparisons required before any resolution decision.

### 2026-10-24 — Phase 1 staff-access alignment deployed and verified

- Status: deployed by the owner and verified read-only in production.
- Production source: GitHub `main` commit `104c6e8`; GitHub Pages deployment #80 completed successfully.
- Frontend evidence: a fresh cache-busted load displayed build `20261023-access-baseline.1` and exactly four picker identities: Lalith Kiran, Dharani, Zubedha, and Pushpanjali. Archived Sravanthi was absent.
- Backend evidence: public ping returned success, service `Syoat ERP`, status `ok`, and version `3.1-phase2-wp1.3` at 2026-10-24 14:02 IST.
- Owner UAT evidence: the owner confirmed the live login screen displayed `4 staff from sheet · build 20261023-access-baseline.1`. Dharani logged in successfully as Co-Founder; the Record Movement screen showed Receive, Ship Orders, Returns, and Damage / Samples, with no Setup or Opening Balance section. Screenshot evidence was supplied in the Codex task on 2026-10-24.
- Security evidence: no PIN, hash, salt, token, private file URL, or business payload was read or recorded during verification.
- Live/production changes by Codex: none. The owner performed the Apps Script deployment and GitHub publication; Codex performed read-only verification only.
- Next recommended action: Founder confirms the System Health access-mismatch list is understandable, then begin the two write-recovery and seven unresolved-error review.

### 2026-10-23 — Phase 1 staff-access alignment ready for owner deployment

- Status: ready for owner review and deployment; local changes only.
- Goal: make the login picker match effective access, surface safe access-record mismatches to the Founder, preserve `Staff.Role` authority, and restrict Opening Balance to the Founder.
- Roadmap item: production stabilization and access-policy alignment before further inventory feature work.
- Files changed: `Code.gs`, `syoat-app.js`, `tests/apps-script-baseline.test.mjs`, `tests/phase-2-performance.test.mjs`, `docs/DECISIONS.md`, `docs/ROLE_CAPABILITIES.md`, `docs/CHANGELOG.md`, and this status record.
- Backend behavior: `getAppLogins` now returns the deduplicated active intersection of `Staff` and `App_Logins`, using Staff name and role. Login/session enforcement remains unchanged and still validates both records.
- Health behavior: Founder System Health receives safe mismatch entries using staff ID, name, and issue code only. No email, PIN, hash, salt, token, or permission flag is included. Co-Founder receives no mismatch detail.
- Opening Balance behavior: only Founder receives `inventory.openingBalance.create`; direct Co-Founder write attempts fail with a safe explicit Forbidden response.
- Local versions: backend `3.1-phase2-wp1.3`; frontend `20261023-access-baseline.1`.
- Checks and results: both active JavaScript files parse; all 68 automated tests pass; the 48-action API catalogue is current; the committed environment template passes its structural safety check.
- Live/production changes: none. No Google Sheet, Drive, Apps Script deployment, GitHub publication, staff record, App Login row, PIN, or production configuration was changed.
- Remaining owner decisions: whether to add App Login rows for Keerthana and Sai Ram, and whether Sravanthi should remain archived. The code remains safe without those decisions.
- Next recommended action: owner reviews and deploys `Code.gs`, then publishes `syoat-app.js`; verify that the login picker shows only Lalith, Dharani, Pushpanjali, and Zubedha and that Founder System Health lists the expected access mismatches.

### 2026-10-23 — Production access and asset baseline recorded

- Status: complete; read-only verification and documentation only.
- Goal: preserve the current staff-access, production-asset, and private-Drive baseline before further Apps Script or GitHub changes.
- Documentation updated: `ROLE_CAPABILITIES.md`, `PRIVATE_FILES_AND_OPERATIONS.md`, `DATA_AND_INTEGRATIONS.md`, `DECISIONS.md`, `STATUS.md`, and `CHANGELOG.md`.
- Access evidence: seven staff records; six active and one archived. Five active app-login rows produced four effective users because Keerthana and Sai Ram have no app-login row and Sravanthi is archived in `Staff` but active in `App_Logins`.
- Authority evidence: permissions derive from `Staff.Role`; both sheets must be active and email-aligned. Legacy permission flags in `App_Logins` are not authoritative.
- Production evidence: backend `3.1-phase2-wp1.2` healthy; frontend build `20260819-phase2-wp1.1`; GitHub main commit `c16493b` at inspection time.
- Drive evidence: configured root and all enumerated descendants were owner-only/not shared; at least 359 files were observed across the established operational folders.
- Data evidence: live workbook has 24 tabs, locale `en_GB`, and timezone `America/Los_Angeles`.
- Live changes: none. No staff, login, Drive, Sheet, Apps Script, or GitHub production state was changed.
- Owner decisions required before related edits: missing logins for Keerthana and Sai Ram, stale Sravanthi login, Opening Balance role mismatch, workbook timezone, movement-form default, and Backend/Drive cleanup questions.
- Next action: owner confirms the staff-access decisions first; then address the two write-recovery items and seven unresolved errors before starting a larger feature phase.

### 2026-10-23 — Source-location availability production release

- Status: deployed by the owner and verified in production
- Goal: remove the misleading all-location Stock value from movement entry and show the quantity available at the movement's actual source.
- Roadmap item: Phase 2 Work Package 1 staging UX finding supporting the later guided Record Movement package.
- Files changed: `syoat-app.js`, `tests/phase-2-performance.test.mjs`, `docs/CHANGELOG.md` and this status record.
- Behavior changed: outbound movement lines now calculate and label availability for the exact source location. Inbound and opening-balance flows hide the non-applicable availability card and use the space for quantity and cost.
- Checks and results: both active JavaScript files parse; all 65 automated tests pass with zero failures/TODOs; the 48-action API catalogue and environment-template safety checks pass.
- Production evidence: the owner confirmed the ERP is working. A read-only endpoint check returned backend success, status `ok`, backend version `3.1-phase2-wp1.2`, frontend build `20260819-phase2-wp1.1`, and GitHub commit `c16493b`.
- Live/production changes: the owner updated the existing Apps Script deployment and GitHub `main` directly. Codex did not change Google Sheet data, configuration or permissions during production verification.
- Release note: the owner explicitly chose this direct release without a separate backup. Apps Script version history and Git history remain the available platform histories.
- Next recommended action: monitor normal staff use, especially source-location availability for Warehouse, FBA and Transit outbound movements. If no issue appears, begin the next Phase 2 work package from this verified production baseline.

### 2026-08-21 — Staging rollback rehearsal baseline captured

- Status: first rehearsal attempt paused; a fresh current-baseline restore point is required
- Evidence: the inspected backup is `[BACKUP] Staging Before PIN Setup - 2026-08-19`, which contains none of MOV-196 through MOV-198 and is therefore too old for a current-baseline restore. Post-write Version history also did not show the intended 2026-08-21 named baseline.
- First marker: Zubhedha created no-attachment draft `MOV-198`, but it must not be manually deleted or removed through the old backup. Close it using normal staging rejection before repeating the rehearsal.
- Live/production changes: none. The backup and named version apply only to the isolated staging workbook.
- Safety decision: do not restore the visible 2026-08-19 version or the pre-PIN backup because either would remove valid staging setup and current records.
- Next action: reject MOV-198 normally, create and visibly verify a new named current-workbook baseline, then create a new disposable marker for the actual rollback.

### 2026-08-21 — Staging movement recovery resolved

- Status: resolved as no-retry; recovery queue empty and fresh staging UAT authorized
- Evidence: Zubhedha's attachment-backed staging movement returned `FAILED_REVIEW_REQUIRED`. The frontend preserved the form and displayed the request reference, and the durable idempotency guard refused an unsafe new attempt.
- Required inspection: run the local safe `auditWriteRecoveryRecords()` helper from the staging Apps Script editor, then compare any allocated Movement ID against staging `Movement_Headers`, `Movement_Lines`, `Audit_Trail`, `Change_Log` and the staging attachment folder before resolving the marker.
- Recovery evidence: request `mt02ujtcq2yfc` failed in `createMovement`; its only checkpoint is `MOV-196 / ID_ALLOCATED`. The stored error is `Operational Drive root is not configured.` Code ordering places this failure before attachment creation and before Movement line/header, Change Log or Audit Trail writes. Confirm those rows/files are absent, restore the exact staging-only Script Property, verify the safe configuration audit, then close the original marker as no-retry before a fresh UAT submission.
- Resolution evidence: the owner confirmed `MOV-196` was absent, restored the staging-only Drive-root property, and received a passing runtime configuration audit. The failed request is retained as `RESOLVED_NO_RETRY`; one matching operational error was resolved; the follow-up write-recovery audit returned an empty list.
- Fresh UAT result: Zubhedha subsequently created a new staging draft and Founder rejected it. Warehouse stock remained 1,488 after rejection, confirming the rejected draft had zero ledger effect. Attachment descriptor/location/privacy evidence remains a separate pending check.
- Attachment UAT result: the fresh movement's `MOV-196_1.jpg` was stored under the staging `11_Other_Attachments` subtree, Drive reported General access Restricted, and Founder could open it through the authenticated ERP route. New attachment privacy and authorized delivery therefore passed.
- Founder health result: after resolving the explained staging error/recovery, refreshed Founder login displayed no System attention warning. The current session recorded 25 API calls, 4,067 ms average and zero failures. Attachment-backed `createMovement` was 11,620 ms; authenticated file retrieval was 4,560 ms and lazy purchase-order loading was 4,576 ms. Attachment timing is tracked separately from the pending no-attachment draft baseline.
- No-attachment UAT result: the owner reported the follow-up draft/rejection flow clean with no stock or health issue. Functional behavior passed; exact normal create/reject timings were not supplied and are not inferred.
- Additional UX finding: the movement form's Stock value sums all physical locations. The shown 2,547 equals 537 FBA + 1,488 Warehouse + 522 Transit + 0 Returns, so it is not source-location availability and is misleading for entry. Correct this in the guided movement visual package before UAT acceptance.
- Live/production changes: none. Execute the isolated rollback rehearsal before closing Work Package 1; timing can be refined later without blocking functional rollback evidence.

### 2026-08-19 — Phase 2 WP1 startup-load optimization

- Status: implemented and measured in staging; performance gate passed, broader UAT remains pending
- Evidence addressed: Founder staging identified `getStock` at 4,674 ms and `getPurchaseOrders` at 3,969 ms as the two slowest startup actions.
- Local candidate: `3.1-phase2-wp1.2` replaces three separate startup requests with one authenticated, uncached inventory bootstrap that reads Movement headers/lines once and returns Products, canonical Stock and recent Movements. Counts, Support, Purchasing and Stock-In purchase-order data now load only when their interfaces are opened.
- Staging result: the optimized bootstrap completed in 3,610 ms versus the former standalone `getStock` at 4,674 ms, a 1,064 ms (about 23%) reduction while also replacing the Product and recent-Movement startup calls. The former 3,969 ms `getPurchaseOrders` action no longer appeared in the startup slowest list. Remaining slowest actions were PIN-preserving `login` at 3,074 ms and the safe public staff picker at 2,388 ms; all three are below the current 5-second core-action target.
- Repeat staging result: startup fell from 11 to 4 calls (about 64% fewer) with zero failures. Average was 4,306 ms; inventory bootstrap was 4,101 ms and login was 3,467 ms. The 6,788 ms maximum came from the deferred Founder-only System Health request after the inventory screen had loaded, so it is recorded separately from operational time-to-screen and remains available for genuine recovery/error warnings.
- Security/integrity: PIN login, session validation, server PIN reconfirmation and approval-time canonical stock validation are unchanged. The bootstrap is not cached and does not write data.
- Live/production changes: none. Continue with reversible staging-write, role-scope, attachment and health-warning UAT before any production handoff.

### 2026-08-19 — Phase 2 staging workbook verified

- Status: staging workbook, bound script and operational Drive root gates passed; staging configuration/deployment pending
- Read-only evidence: `[STAGING] Syoat Inventory ERP Backend` is a native Google Sheet with a distinct ID, all 24 expected tabs, owner-only permission and the equivalent IST timezone alias `Asia/Calcutta`. The private staging container is outside the production Drive root. `[STAGING] Operational Files` is an owner-only direct child, and the owner confirmed that the copied workbook opens its own bound Apps Script project containing `Code.gs`.
- Owner configuration evidence: the staging-bound project now has `SYOAT_DRIVE_ROOT_FOLDER_ID` set to the verified staging Operational Files folder, with the legacy-folder property absent. Runtime verification remains pending a staging-only deployment.
- Owner source evidence: the initial WP1 candidate was used for the completed staging PIN migration; the notification-isolated `3.1-phase2-wp1.1` source was subsequently refreshed and saved before deployment.
- Updated staging evidence: the owner confirmed `3.1-phase2-wp1.1` was refreshed and saved, with `SYOAT_ENVIRONMENT=staging` and an explicit staging notification recipient configured.
- PIN isolation evidence: owner confirmed the final staging cell-state check passed—active testers have blank readable PIN cells with staging hash/salt values populated, while inactive employees have blank PIN/hash/salt fields. The staging backend is ready for its first web-app deployment and ping test.
- Deployment evidence: the owner deployed the staging web app and its signed-out ping returned success/ok for candidate `3.1-phase2-wp1.1`, with a safe request reference and 2 ms server execution duration.
- Isolation evidence: the staging `/exec` URL was recorded only in gitignored local configuration. The strict environment check passes and confirms staging uses a different API URL, workbook and Drive root from production; the local configuration file is excluded from Git.
- Public-route evidence: owner confirmed the staging staff picker returns only the 3 intended testers and the signed-out Product GET is rejected without business data.
- Local staging frontend: added a localhost-only server that dynamically injects the staging API, leaves production `runtime-config.js` untouched, blocks arbitrary/configuration-file paths and visibly labels the login/header as `STAGING`. Both active sources parse, 61 tests pass with zero failures/TODOs, and strict staging isolation passes.
- Login/performance UAT: Founder and Zubhedha both loaded staging Inventory with zero observed API failures. The performance summary was visible only to Founder as intended. Founder baseline was 11 calls, 3,648 ms average and 5,199 ms maximum, so functional access passed but the warm/cold performance target remains open. Zubhedha's full action-scope check is still pending.
- Rollback evidence: the owner created a restricted `[BACKUP] Staging Before PIN Setup - 2026-08-19` workbook before any staging authentication changes.
- Live/production changes: none. Verification was read-only; production and staging content/permissions were not changed by Codex.
- Next recommended action: set `SYOAT_DRIVE_ROOT_FOLDER_ID` in the staging project only, confirm the legacy-folder property is absent, and save; do not deploy or run a migration yet.

### 2026-08-19 — Phase 2 WP1 PIN-preserving performance measurement

- Status: local measurement and first optimization implemented; staging measurements remain pending
- Goal: improve pull/display/write responsiveness without bypassing PIN access or inventory-integrity controls.
- Roadmap item: Phase 2 cross-cutting requirements supporting Work Packages 1, 4, 5, 8 and 10.
- Files changed: active `Code.gs` and `syoat-app.js`, Phase 2/WP1/staging/API records, decision log, performance regression tests, changelog and this status record. Redesign artifacts were not changed.
- Behavior changed: post-login low-stock alerts reuse the core Product/Stock load, removing two duplicate authenticated Sheet/API requests. Candidate `3.1-phase2-wp1` adds safe server-duration response metadata and a continuously refreshed Founder/Co-Founder current-browser performance summary. The summary contains action/timing/outcome aggregates only and is cleared by refresh/close.
- PIN/security result: PIN login, session validation and server PIN reconfirmation before writes remain unchanged. PINs, hashes, salts, tokens, request bodies, file URLs and business payloads are excluded from performance measurement.
- Checks and results: both active JavaScript files parse; 59 automated tests pass with zero failures/TODOs; the 47-action API catalogue and environment-template safety check pass. The historical Phase 1 production manifest remains immutable while Phase 2 local source diverges.
- Live/production changes: none. No deployment, publication, push or live-data/configuration change occurred.
- Next recommended action: verify locally, then capture staging warm/cold timings before implementing the versioned bootstrap and revision-safe cache.

### 2026-08-19 — Phase 2 Work Package 1 local staging foundation

- Status: in progress; local safeguards ready, owner staging execution pending
- Goal: verify the production structure read-only and make staging isolation/rollback a testable gate before Phase 2 inventory changes.
- Roadmap item: Phase 2, Work Package 1.
- Read-only evidence: production workbook reachable with 24 tabs and expected operational schemas; readable PIN field blank; prior 187/187 private-file result retained. Workbook timezone is unexpectedly `America/Los_Angeles` and is recorded for staging-first correction to `Asia/Kolkata`.
- Files changed: environment-isolation checker/tests, package commands, `PHASE_2_WP1_STABILIZATION.md`, `PHASE_2_STAGING_RECORD.md`, configuration guidance, phase plan, changelog and this status record.
- Checks and results: both active JavaScript files parse; 53 automated tests pass with zero failures/TODOs; all 47 API actions match the catalogue; the committed environment template passes structural safety checks and intentionally warns that staging/production placeholders are not deployment-ready.
- Live/production changes: none. No Sheet/Drive write, Apps Script deployment/property change, GitHub push or frontend publication occurred.
- Risks or blockers: authenticated Founder health and Apps Script recovery records cannot be evidenced from workbook rows; private staging workbook/script/Drive/frontend resources and rollback rehearsal require owner execution.
- Next recommended action: run the owner evidence and isolated-staging checklist in `PHASE_2_STAGING_RECORD.md`; do not begin WP2 correction/migration until WP1 passes.

### 2026-08-19 — Phase 2 inventory correctness planning

- Status: plan complete locally; implementation not started
- Objective: make the movement ledger and current stock reproducible and correct for every product/location before Phase 3 FBA expansion or new modules.
- Scope: ten gated work packages covering stabilization/staging, fresh baseline, master-data contracts, canonical ledger, movement lifecycle, counts, special flows, guided Record Movement, visual Inventory Analytics, historical remediation and owner-run release closure.
- Boundaries: no accounting, no new business modules, no live correction during diagnosis and no next migration without real staging/rollback.
- Owner decisions: inventory authority, maker-checker, count variance, returns disposition, batch/expiry, combos, opening balances, operational unit cost and historical exception acceptance are listed with recommended defaults.
- Files changed: added `docs/PHASE_2_PLAN.md`; updated README, roadmap, required-reading order, changelog and status.
- Next recommended action: Phase 2 Work Package 1—monitor release health and build an isolated staging environment.

### 2026-08-19 — Phase 2 visual-entry and analytics scope added

- Status: incorporated into the Phase 2 plan; implementation not started
- Goal: let employees record movements and understand inventory/exception data with minimal training.
- Scope: dedicated Work Package 8 for a guided visual Record Movement flow and inventory-only Analytics redesign, followed by employee usability and ledger-reconciliation UAT in Work Package 10.
- Controls: backend authorization/validation remains authoritative; every preview/KPI/chart must reconcile to the canonical ledger; accounting, revenue, expense and cash-flow visuals remain excluded.
- Files changed: `docs/PHASE_2_PLAN.md`, changelog and status.
- Next recommended action: keep Work Package 1 first; implement visual work only after master-data, ledger, movement, count and special-flow rules are stable.

### 2026-08-19 — Phase 1 completion checkpoint

- Status: complete, stored locally and deployed by owner
- Scope: Work Packages 1–7, secure PIN/session access, authenticated capabilities/API, frontend migration, concurrency/integrity, private files, operational hardening and deployment handoff.
- Verification: 49 tests passed, zero failed/TODO; syntax, 47-action catalogue and release hashes passed.
- Production evidence: final file audit 187/187 private, 85 references normalized, PIN migration completed and Founder/Warehouse draft-rejection smoke test preserved stock.
- Canonical record: `docs/PHASE_1_COMPLETION.md`.
- Process debt: staging/UAT and rollback rehearsal required before the next migration.
- Next recommended task: Phase 2 inventory correctness baseline and reconciliation planning after first-business-day monitoring.

### 2026-08-19 — Production deployment and smoke test

- Status: deployed by owner; initial smoke test passed; first-business-day monitoring required
- Release: `3.0-wp7.1`.
- Data/security migrations: PIN migration completed; final Drive audit 187 private of 187 with zero exposure/errors; 85 movement references normalized.
- Smoke result: Founder login/file access/logout passed. Zubhedha created a PIN-confirmed test draft and Founder rejected it; displayed stock remained FBA 537, Warehouse 1,488, Transit 522 and Returns 0.
- Local checks: 49 tests passed, zero failed/TODO; syntax and 47-action catalogue checks passed.
- Process exception: production was deployed directly; isolated staging/UAT and rollback rehearsal remain not performed.
- Full evidence: `docs/PRODUCTION_RELEASE_RECORD.md`.

### 2026-08-19 — Work Package 7: owner review and deployment handoff

- Status: local deliverables complete; production NO-GO pending owner staging/UAT and approvals
- Goal: provide an exact, reviewable package the owner can deploy and roll back without the coding task touching production.
- Roadmap item: Phase 1, Work Package 7.
- Files changed: `Code.gs` environment-specific Drive configuration, environment/test records, `docs/OWNER_DEPLOYMENT_HANDOFF.md`, `docs/RELEASE_MANIFEST.md`, `docs/STAGING_UAT_RECORD.md`, roadmap/plan/security/private-file/decision/changelog/README/status records. Active frontend release files were not changed during this work package; redesign artifacts were untouched.
- Checks and results: release hashes recorded and automatically checked; both active JavaScript files parse; 49 automated tests pass with zero failures/TODOs; catalogue check covers 47 actions. Handoff includes exact file inventory, schema/configuration checks, backup, isolated staging, migration, deployment order, smoke tests, rollback and monitoring.
- Live/production changes: none. No push, deployment, publication, Sheet write, Drive permission change, migration or live Apps Script Property change occurred.
- Risks or blockers: all approval fields and staging results are intentionally pending because they require the owner's real environment and decisions. `runtime-config.js` must be included by the chosen publishing method. Phase 2 inventory reconciliation remains outstanding.
- Next recommended action: owner review and isolated staging execution; production remains NO-GO until the UAT and approval records pass.

### 2026-08-19 — Work Package 6: private files and operational hardening

- Status: complete locally; do not deploy or run the live migration
- Goal: eliminate public operational-document links and make failures safe, traceable, and Founder-visible.
- Roadmap item: Phase 1, Work Package 6.
- Files changed: `Code.gs`, `syoat-app.js`, API catalogue/configuration, Apps Script/security tests, `docs/PRIVATE_FILES_AND_OPERATIONS.md`, phase plan, security policy, decisions, changelog, README and this status record. `index.html` retains earlier local changes; redesign artifacts were untouched.
- Checks and results: both active JavaScript files parse; the catalogue check reports 47 routed actions (17 authenticated reads and 24 locked writes); 46 automated tests passed, zero failed and zero TODOs. Tests cover private storage, authenticated movement scope, no arbitrary URL rendering, legacy-folder audit/hardening, generic correlated errors and sanitized Founder health.
- Live/production changes: none. Google Sheet, Apps Script deployment, Drive sharing and GitHub remote remain unchanged.
- Risks or blockers: existing Drive files are still exposed exactly as in production until the owner reviews deliberate shares and runs the manual hardening migration after coordinated deployment. Files over 8 MB cannot be previewed in-app. Permanent document/audit retention is still an open policy decision.
- Next recommended action: Work Package 7 owner review and deployment handoff.

### 2026-08-19 — Work Package 5: concurrency and record integrity

- Status: complete locally; do not deploy
- Goal: prevent duplicate identifiers/events, stale-stock approval and silent partial multi-sheet writes.
- Roadmap item: Phase 1, Work Package 5.
- Files changed: `Code.gs`, source analysis, Apps Script harness/integrity tests, `docs/WRITE_INTEGRITY.md`, phase plan, decisions, changelog, README and this status record. Active frontend and redesign artifacts were untouched.
- Checks and results: all 24 writes require validated request IDs and run under one script lock; completed retries replay the stored result; payload collisions fail; identifiers are checkpointed; movement approval revalidates aggregated current stock; stale counts fail; child/header and metadata/state commit order is defined; an injected partial append remains hidden and creates a recovery item. 41 active tests passed, zero failed, 1 Work Package 6 TODO remains; 45 routed actions match the catalogue.
- Live/production changes: none.
- Risks or blockers: Google Sheets still lacks native transactions, so manual recovery remains a compensating control. Operational attachments and FBA ledger archives still use public-link sharing and must be corrected in Work Package 6.
- Next recommended action: Work Package 6 private files and operational hardening.

### 2026-08-19 — Work Package 4: frontend access migration

- Status: complete locally; do not deploy
- Goal: make the active frontend consume the secured API without maintaining a second authorization matrix.
- Roadmap item: Phase 1, Work Package 4.
- Files changed: `Code.gs`, `index.html`, `syoat-app.js`, `.gitignore`, runtime configuration template/local file, Work Package 4 tests, and project records. Redesign artifacts were untouched.
- Checks and results: Founder/Co-Founder are the only top-authority roles; retired `Owner` rows are excluded from the picker and rejected at login; frontend permissions and navigation derive from server capabilities; movement row scope is backend-enforced; session expiry is centralized; offline staff caching is removed; PIN confirmation fails closed; the production API URL lives only in gitignored `runtime-config.js`; 36 active tests passed, zero failed, 4 Work Package 5/6 TODOs remain; 45 routed actions match the catalogue.
- Live/production changes: none.
- Risks or blockers: any live Staff/App_Logins row still using `Owner` must be changed manually before release. Concurrency, approval-time stock validation, durable idempotency and private attachments remain incomplete.
- Next recommended action: Work Package 5 concurrency and record integrity.

### 2026-08-19 — Work Package 3: authenticated API and capabilities

- Status: complete locally; do not deploy
- Goal: protect all business reads/writes with sessions and backend capabilities.
- Roadmap item: Phase 1, Work Package 3; active API portion of Work Package 4.
- Files changed: `Code.gs`, `syoat-app.js`, API/source-analysis scripts, tests, catalogue/configuration, role documentation, and supporting project records. Redesign artifacts were untouched and removed from active checks.
- Checks and results: public GET limited to health/staff picker; 15 business reads and 24 writes are authenticated POST-only; public login-log route removed; 39 business actions centrally classified; role denial and router-order tests pass; 30 active tests passed, zero failed, 4 later-phase TODOs remain; 45 routed actions match the catalogue.
- Live/production changes: none.
- Risks or blockers: frontend navigation still duplicates role logic; endpoint remains hard-coded; concurrency, approval-time stock validation, durable idempotency and public attachments remain incomplete.
- Next recommended action: finish Work Package 4 frontend capability/session/configuration migration.

### 2026-08-19 — Work Package 2: PIN sessions

- Status: complete locally; do not deploy
- Goal: replace readable-PIN-per-write authentication with hashed PIN login and temporary server sessions.
- Roadmap item: Phase 1, Work Package 2, plus the necessary active-frontend transport portion of Work Package 4.
- Files changed: `Code.gs`, `syoat-app.js`, session/migration tests and mocks, API catalogue/configuration, `docs/PIN_SESSIONS.md`, and supporting project documents.
- Checks and results: hashed login, lockout, PIN confirmation, token hashing, verification, logout, maximum expiry, deactivation, cleanup, PIN migration, duplicate refusal, POST transport, and no browser credential persistence pass locally; 26 active tests passed, zero failed, and 7 later-phase security tests remain explicit TODOs; all 46 backend actions match the catalogue.
- Live/production changes: none.
- Risks or blockers: business reads remain public; backend GET writes remain; central capability enforcement, concurrency, stock approval integrity, durable idempotency, and private files remain incomplete. Current backend/frontend require a coordinated future release.
- Next recommended action: Work Package 3 central authorization and authenticated API contract.

### 2026-08-19 — Work Package 1: local testing and API catalogue

- Status: complete locally
- Goal: build the local safety harness and catalogue every frontend/backend API action.
- Roadmap item: Phase 1, Work Package 1.
- Files changed: `package.json`, `.gitignore`, `scripts/`, `tests/`, `config/`, `docs/API_CATALOG.md`, and supporting README/status/changelog/plan updates.
- Checks and results: 43 backend actions catalogued; both frontend caller sets mapped; 17 active tests passed with zero failures; 10 target security tests remain explicit TODOs; Apps Script executed locally against in-memory sanitized Sheets; catalogue consistency check passed.
- Live/production changes: none.
- Risks or blockers: 15 business-data GET actions remain unauthenticated and all 24 routed writes remain GET-callable in the current application; these are recorded baseline risks, not corrected yet.
- Next recommended action: owner confirms PIN/session policies and role mapping, then Work Package 2 begins locally.

### 2026-08-19 — Phase 1 execution planning

- Status: complete locally
- Goal: convert the roadmap's secure-foundation phase into small, verifiable work packages.
- Roadmap item: Phase 1.
- Files changed: added `docs/PHASE_1_PLAN.md`; updated `README.md`, `STATUS.md`, and `CHANGELOG.md`.
- Checks and results: plan covers baseline tests, PIN sessions, backend authorization, frontend migration, concurrency/integrity, private files, and owner-run deployment handoff.
- Live/production changes: none.
- Risks or blockers: work package 2 requires owner choices about PIN/session/lockout/re-confirmation policy; work package 1 can begin without them.
- Next recommended action: begin work package 1 locally.

### 2026-08-19 — Local source consolidation

- Status: complete locally
- Goal: keep the supplied Apps Script backend and current GitHub frontend/related assets together in the local project for future corrections.
- Roadmap item: Phase 1 source-control foundation.
- Files changed: added `Code.gs`; updated project documentation and handoff records.
- Checks and results: GitHub `pull --ff-only` reported already up to date at `998ca62`; `Code.gs` matches the supplied 2,145-line source after line-ending normalization; JavaScript syntax checks passed for `Code.gs`, `syoat-app.js`, and `syoat-app-redesign.js`.
- Live/production changes: none; no GitHub push, Apps Script deployment, frontend publication, or live Sheet write.
- Risks or blockers: the saved code still contains the security and data-integrity risks listed above and should not be treated as corrected merely because it is now local.
- Next recommended action: implement Phase 1 secure access locally, then provide the owner with reviewed files and deployment steps.

### 2026-08-19 — Accounting boundary clarification

- Status: complete locally
- Goal: define exactly what is excluded by "accounting/accounts."
- Roadmap item: project scope.
- Files changed: `AGENTS.md`, `README.md`, `PROJECT_CHARTER.md`, `MODULES.md`, `DECISIONS.md`, `ROADMAP.md`, `CHANGELOG.md`, and this status file.
- Checks and results: scope now explicitly excludes daily expenses, sales/revenue accounts, cash received/paid, and cash flow while permitting operational order and fulfilment records.
- Live/production changes: none.
- Risks or blockers: none for documentation.
- Next recommended action: Phase 1 access and security design.

### 2026-08-19 — Project documentation baseline

- Status: complete locally
- Goal: create durable source-of-truth Markdown files for coordinated future tasks.
- Roadmap item: Phase 0.
- Files changed: workspace `AGENTS.md`, repository `AGENTS.md`, `README.md`, and the Markdown files in `docs/`.
- Checks and results: documentation links and structure to be verified locally.
- Live/production changes: none.
- Risks or blockers: Apps Script is still outside version control; security and inventory risks remain active in production.
- Next recommended action: begin Phase 1 design and source-control the backend after owner authorization.
