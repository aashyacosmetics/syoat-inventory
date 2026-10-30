# Phase 2 Staging and Rollback Record

Status: **CLOSED BY OWNER DECISION — NOT A CURRENT RELEASE GATE**

Owner decision D-022 excludes staging from the current Phase 2 continuation and release workflow. This file preserves historical staging evidence and incomplete rehearsal results; it must not be represented as a passed staging exercise. It is not permission for Codex to change live resources. Do not paste PINs, hashes, salts, tokens, private file URLs or populated resource IDs here.

## Production stabilization

| Evidence | Result |
| --- | --- |
| Review date/time and reviewer | Pending |
| Production version remains `3.0-wp7.1`; staging candidate reports `3.1-phase2-wp1.1` | Pass — staging ping returned the expected candidate version |
| Founder health: unresolved operational errors | Pending |
| Founder health: unresolved recovery records | Pending |
| Login failures/lockouts reviewed | Pending |
| Privacy remains 187/187 private | Prior evidence passed; fresh health confirmation pending |
| Unexplained stock/access behavior | Pending |

## Isolated resources

Store actual identifiers only in the gitignored `config/environments.local.json` and the owner's private deployment record.

| Resource | Isolation check | Result |
| --- | --- | --- |
| Staging workbook | Private copy; ID must differ from production | Pass — native Google Sheet, separate ID, 24 expected tabs, owner-only permission verified read-only on 2026-08-19 |
| Bound Apps Script project | Bound to staging workbook, not production | Pass — owner confirmed copied workbook opens its own bound project containing `Code.gs` |
| Staging backend source | Bound `Code.gs` matches local candidate `3.1-phase2-wp1.1` | Pass — owner confirmed refreshed source saved; runtime ping pending |
| Staging web-app deployment | URL must differ from production | Pass — deployed URL recorded privately and strict checker confirms it differs from production |
| Staging Drive root | Private folder; ID must differ from production | Pass — `[STAGING] Operational Files` is owner-only and directly inside the staging container |
| Staging Drive Script Property | `SYOAT_DRIVE_ROOT_FOLDER_ID` points only to staging; legacy property absent | Pass after correction — runtime audit reported `environment=staging`, Drive root configured/available and notifications enabled. The earlier missing-property failure is retained in the recovery evidence below. |
| Environment Script Property | `SYOAT_ENVIRONMENT=staging` in staging only | Pass — owner confirmed saved; runtime health verification pending |
| Notification Script Property | Explicit staging/test recipient; copied production fallback disabled | Pass — owner confirmed saved; test delivery pending |
| Optional legacy folder | Staging-only or deliberately unset | Pass — owner confirmed legacy-folder Script Property absent |
| Staging frontend | Runtime URL points only to staging | Pass locally — localhost server injects only the staging API, leaves production config unchanged and visibly labels the login/header `STAGING`; login UAT pending |
| Notification recipients | Staging-only/test recipients | Pending |
| Workbook timezone | `Asia/Kolkata` | Pass — connector reports equivalent IANA alias `Asia/Calcutta` |
| Local isolation command | `npm run check:staging` passes | Pass — populated gitignored configuration confirms distinct API URL, workbook and Drive root |

The staging container folder is outside the recorded production Drive root and was verified as owner-only/restricted. The dedicated `[STAGING] Operational Files` root was subsequently created and verified as an owner-only direct child. Its ID must now be configured only in the staging Apps Script Properties.

## Data protection

| Check | Result |
| --- | --- |
| Customer/contact fields sanitized where unnecessary | Pending |
| Staging PINs are unique and known only to testers | Pass — owner confirmed active tester credentials were replaced with unique staging-only PINs |
| Readable PIN cells cleared after staging migration | Pass — active tester PIN cells blank with hash/salt populated; inactive PIN/hash/salt cells blank |
| Operational attachments copied only if required and kept private | Pass for new-write UAT — `MOV-196_1.jpg` was stored under the staging `11_Other_Attachments` subtree with General access Restricted |
| Production Drive references absent from staging rows/properties | Pending |

## Stabilization UAT

| Scenario | Expected result | Evidence/result |
| --- | --- | --- |
| Signed-out ping | Safe `3.1-phase2-wp1.1` staging response | Pass — success/ok with safe request reference and 2 ms reported server duration |
| Public staff picker | Only intended active testers; no authentication fields/capabilities | Pass — owner confirmed 3 staging testers only |
| Signed-out business GET | Rejected with no product data | Pass — owner confirmed protected GET rejected |
| Founder login | Staging session created | Pass — inventory loaded and Founder-only performance summary appeared |
| Non-founder login | Staging session created with restricted capabilities | Partial pass — Zubhedha inventory loaded and performance summary remained hidden; full action-scope check pending |
| Reversible staging draft | Creates one staging-only record | Pass — after recovery closure and Drive-root correction, Zubhedha created a fresh staging draft for Founder review. |
| Reject staging draft | Stock remains unchanged | Pass — Founder rejected the fresh draft and Warehouse stock remained 1,488. |
| Private attachment check | Stays within staging Drive root | Pass — `MOV-196_1.jpg` exists in the staging `11_Other_Attachments` folder, General access is Restricted, and Founder opened it through the authenticated ERP interface |
| Founder health | No unexplained errors/recovery items | Pass — after recovery resolution, refreshed Founder login showed no yellow System attention warning; the recovery audit remained empty and the matching operational error was resolved. |
| Warm login picker | Target 1–2 seconds; record actual | Pending separate measurement |
| Cold/core session API baseline | Target under 5 seconds | Pass for optimized operational load — initial Founder session recorded 11 calls, 3,648 ms average, 5,199 ms maximum and 0 failures. Candidate `3.1-phase2-wp1.2` reduced startup to 4 calls with 0 failures; repeat measurement averaged 4,306 ms. Operational bootstrap was 4,101 ms and login 3,467 ms, both below target. The 6,788 ms maximum was the post-load Founder-only `getSystemHealth` check, not the inventory render path. An earlier optimized run recorded bootstrap 3,610 ms, login 3,074 ms and staff picker 2,388 ms. |
| Normal staging draft | Target 1–3 seconds; PIN reconfirmation still required | Functional pass — owner reported the no-attachment draft test clean; exact timing was not supplied. Attachment-backed `createMovement` completed in 11,620 ms and is recorded separately by design. |
| Staging approval/rejection | Target 2–4 seconds; PIN reconfirmation still required | Functional pass — Founder rejection remained clean with no stock/health issue; exact no-attachment rejection timing was not supplied. |
| Performance privacy | Summary contains action/timing/outcome only; no PIN/hash/salt/token/payload | Pass — owner observed timing-only Founder summary; non-founder saw no performance heading. Latest Founder session: 25 calls, 4,067 ms average, 11,620 ms maximum, 0 failures; slowest were attachment-backed `createMovement` 11,620 ms, lazy `getPurchaseOrders` 4,576 ms and authenticated `getOperationalFile` 4,560 ms. |

## Backup and rollback rehearsal

1. Record a staging workbook backup and its timestamp in the owner's private evidence.
2. Create one clearly identified staging-only draft and note its ID.
3. Restore the staging workbook/project/runtime configuration from the recorded backup procedure.
4. Confirm the test draft is absent after restore and the prior staging baseline is intact.
5. Confirm the staging endpoint still cannot reach the production workbook or Drive root.
6. Record tester, date, expected/actual result and any error reference.

| Rehearsal evidence | Result |
| --- | --- |
| Backup created | Not yet usable — the workbook inspected by the owner was `[BACKUP] Staging Before PIN Setup - 2026-08-19`, which correctly contains no MOV-196 through MOV-198 but is too old to restore the current staging baseline. The intended 2026-08-21 named source-workbook version was not visible after the marker write. Preserve the old backup and create/verify a fresh current-baseline restore point before another marker. |
| Disposable staging marker | First attempt `MOV-198` created, but it cannot be removed through the unverified restore point; close it through the normal staging rejection workflow before repeating the rehearsal with a newly verified baseline and new marker. |
| Rollback executed on staging only | Paused — do not restore the visible 2026-08-19 version or pre-PIN backup because both predate the current valid staging baseline |
| Staging frontend availability | Blocked on 2026-10-27 — the localhost staging ERP address was temporary and the owner reported it was not reachable in the Codex browser. The supplied Apps Script URL is the isolated staging backend API, not a persistent frontend. This does not count as a passed rollback rehearsal. |
| Baseline restored | Pending |
| Production untouched | Pending |
| Founder sign-off | Pending |
| Co-Founder/second reviewer sign-off | Pending |

## Gate conclusion

This historical record is closed without claiming that the incomplete rows passed. Under D-022, they no longer block current Phase 2 work. Any production migration still requires explicit owner approval, current backup, reviewed dry-run, bounded/resumable execution, immediate live reconciliation and a documented production rollback or recovery sequence.
