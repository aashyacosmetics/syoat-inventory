# Phase 1 Production Release Record

Release: `3.0-wp7.1`

Deployment date: 2026-08-19

Status: deployed by the owner during an employee maintenance window; initial smoke tests passed.

## Post-release repository closeout — 2026-10-30

- This Phase 1 production record remains historical; no deployment or production-data action was performed during repository closeout.
- The audited source baseline (`6861997`) and CI workflow (`276dabe`) were merged through PR #1 as `02eaa2f`.
- CI passed on the pull request and merge commit; the merge-triggered Pages deployment succeeded.
- A fresh read-only health check returned HTTP 200 for the Pages index and unchanged `runtime-config.js`, and the live application showed build `20261028-fba-review.1` with the four authorized identities.
- The latest recorded deployed backend is `3.2-phase2-access-policy.1`.
- Active `Protect main` ruleset `26201018` requires a pull request, up-to-date branch and `Verify repository` check, and blocks deletion and force pushes.
- Earlier statements in this record about missing staging remain historical Phase 1 process evidence; D-022 now excludes staging from the current Phase 2 workflow without deleting that history.

## Important process note

The owner deployed directly to production after informing employees not to use the application for the day. The planned isolated staging/UAT and rollback rehearsal were not performed. `STAGING_UAT_RECORD.md` therefore remains `NOT RUN`; this is retained as an explicit process gap rather than retroactively treating production evidence as staging evidence.

## Deployment evidence reported by the owner

- GitHub active frontend files were published, including the Phase 1 cache-busting `index.html` and production `runtime-config.js`.
- The new Apps Script web app was deployed and its ping returned `success: true` for the Syoat ERP service.
- Production Script Property `SYOAT_DRIVE_ROOT_FOLDER_ID` was configured with the production operational root.
- Active `Owner` roles were corrected and active PINs were made unique.
- `migratePinsToHashes()` completed. Readable PIN cells are empty and the hash/salt columns are populated.
- The initial privacy audit checked 187 files: 4 private and 183 exposed through link sharing.
- The first one-pass hardening attempt reached the Apps Script time limit after partially securing files. No Sheet reference normalization had been reported at that point.
- The resumable `3.0-wp7.1` migration then measured 153 private and 34 exposed files with zero audit errors.
- Batch 1 hardened 20 files, leaving 14, with zero errors.
- Batch 2 hardened the final 14 files, normalized 85 movement references, and reported zero errors.
- Final privacy audit: 187 checked, 187 private, 0 exposed and 0 errors.

## Smoke tests reported by the owner

- Founder PIN login, application load, protected attachment viewing and logout worked.
- Warehouse employee Zubhedha logged in and created a test draft through PIN-confirmed access.
- Founder rejected the test draft.
- Before/after screenshots showed identical product quantities: FBA 537, Warehouse 1,488, Transit 522 and Returns 0. The rejected draft did not change stock.
- The owner reported that the remaining tested behavior was working normally.

## Local source verification

After the resumable migration change:

- `Code.gs` and `syoat-app.js` passed syntax checks.
- 49 automated tests passed; 0 failed, 0 skipped and 0 TODO.
- The API catalogue check passed for all 47 actions.
- Release-manifest hashes match the local publication sources.

## Remaining release follow-up

- Keep the maintenance freeze until the owner explicitly reopens employee access.
- Ask employees to hard-refresh with `Ctrl+F5` before login.
- Monitor Founder system health, login failures, operational errors and write-recovery items through the first business day.
- Preserve the pre-release backups and the execution logs from PIN/file migration.
- Do not rerun the completed PIN migration or file-hardening migration.
- Rehearse isolated staging and rollback before the next security/data migration; this Phase 1 process requirement remains unmet.
