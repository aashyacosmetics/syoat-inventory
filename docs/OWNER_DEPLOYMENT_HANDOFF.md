# Phase 1 Owner Review and Deployment Handoff

Status: local release candidate ready for owner review and staging; **not approved for production**.

This is a coordinated security migration. Backend, PIN data, Drive access and frontend are incompatible with the old release when changed independently. Use a maintenance window and follow the order below. The coding task has not pushed, deployed, published, changed the workbook, or changed Drive sharing.

## Absolute no-go conditions

Do not begin production deployment if any condition is true:

- `STAGING_UAT_RECORD.md` still says `NOT RUN`, contains a release-critical failure, or lacks Founder approval.
- A current workbook/script/frontend backup and rollback copy do not exist.
- Any active Staff or App_Logins row still uses the retired `Owner` role.
- Active PINs are duplicate, malformed, unknown to the assigned employee, or not approved for migration.
- The production Apps Script Properties do not contain the exact production Drive root folder ID.
- Staging uses or can resolve the production workbook or production Drive folders.
- The publishing method cannot deliver `runtime-config.js` beside `index.html`.
- The production frontend URL, Apps Script deployment access setting, maintenance window, or rollback owner is undecided.
- Local file hashes differ from `RELEASE_MANIFEST.md` without a fresh review and test run.

## Owner decisions to record before staging approval

The recommended first-release values match the implemented policy. Record acceptance or a replacement before production:

| Decision | Implemented/recommended value | Owner record |
| --- | --- | --- |
| PIN format | Preserve current numeric UI; accept 4–6 digits; every active PIN unique | Pending |
| Failed attempts | 5 attempts, then 15-minute lock | Pending |
| Session policy | 8-hour maximum, 30-minute inactivity, memory-only browser token | Pending |
| Write confirmation | Re-enter PIN before every current write | Pending |
| Top roles | Founder and Co-Founder only; `Owner` invalid | Pending |
| Capability matrix | Approve `ROLE_CAPABILITIES.md` for initial release | Pending |
| Direct Drive sharing | Remove link/domain and direct viewer/editor access from operational files | Pending |
| File preview | 8 MB maximum for in-app viewing | Pending |
| Error retention | Resolved errors 90 days, capped at 100; completed request records 30 days, capped at 500 | Pending |
| Publishing method | Manual artifact, GitHub Pages generation, or explicitly tracked non-secret runtime config | Pending |
| Maintenance/rollback owner | Named person and communication channel | Pending |

Daily expenses, revenue books, cash received/paid and cash-flow features remain excluded.

## Release contents

Use `RELEASE_MANIFEST.md` as the authoritative file inventory and hash record. Production application files are:

1. `Code.gs` — replace the bound Apps Script backend as one complete file.
2. `index.html` and `syoat-app.js` — publish together.
3. `runtime-config.js` — create from `runtime-config.example.js`, set the correct environment and Apps Script `/exec` URL, and publish beside `index.html`.
4. Existing `syoat-theme.css`, `syoat-logo.png`, and `images/` assets.

Never publish the redesign-named artifacts.

## Workbook and Apps Script preflight

The following sheets must exist with their current headers preserved:

`Products`, `Locations`, `Staff`, `Movement_Headers`, `Movement_Lines`, `Sales_Orders`, `Sales_Order_Lines`, `Stock_Counts`, `Feature_Settings`, `Change_Log`, `Lists`, `App_Logins`, `Combo_BOM`, `Audit_Trail`, `Login_Log`, `Support_Tickets`, `Suppliers`, `Purchase_Orders`, `Purchase_Order_Lines`, `FBA_Shipments`, `FBA_Shipment_Lines`, and `FBA_Ledger_Snapshots`.

Critical migration checks:

- `App_Logins` has `Email`, `Name`, `Role`, `Status`, and a readable `PIN` column before migration. `migratePinsToHashes()` adds `PINHash` and `PINSalt` if absent and clears readable PIN values only after validating every row.
- Active App_Logins and Staff roles use only a supported role from `ROLE_CAPABILITIES.md`; change every `Owner` to Founder or Co-Founder as appropriate.
- Staff/App_Logins emails identify the same employee consistently and active/inactive state is correct.
- `Movement_Headers` retains `DocumentFile`, `EnteredByEmail`, and `AmazonShipmentID`.
- `Audit_Trail` retains `AuditID, Timestamp, Action, RecordType, RecordID, FieldName, OldValue, NewValue, StaffEmail, RequestId, Notes`.
- `Login_Log` retains `LoginID, Timestamp, Email, Success, Reason` and its existing source/user-agent fields if present.
- Spreadsheet and Apps Script timezone remain `Asia/Kolkata`.
- Review installed triggers. Do not create duplicate digest or time-based triggers during deployment.

No new accounting sheet is required. Script Properties hold sessions, lockout state, idempotency/recovery records and operational error records; do not add those values to employee-visible sheets.

## Drive environment configuration

In Apps Script **Project Settings → Script Properties**, configure each deployment separately:

| Property | Requirement |
| --- | --- |
| `SYOAT_DRIVE_ROOT_FOLDER_ID` | Required. Exact root folder ID for that environment only. New attachment subfolders and FBA ledger folders are created beneath it. |
| `SYOAT_LEGACY_ATTACHMENTS_FOLDER_ID` | Optional. Exact legacy attachment folder ID to include in audit/hardening. Leave absent if that environment has no legacy folder. |

Folder names are deliberately not used for root discovery. Never put a production folder ID in staging. Confirm the script owner can access the configured folders.

## Backup package

Before staging migration and again immediately before production:

1. Record row counts, header rows, last IDs and calculated stock summaries for reconciliation.
2. Create a dated Google Sheet copy and export an offline workbook copy. Preserve formulas, validations, protections and hidden sheets.
3. Copy/export the currently deployed Apps Script source and record its deployment ID/version and URL.
4. Save the currently published frontend files and record the Git commit/deployment reference and API URL.
5. Run and save `auditOperationalFilePrivacy()` output before hardening. Also save the intended direct-share exception list, if any.
6. Export or screenshot relevant Apps Script Project Settings, Script Properties names (not secret values), scopes and triggers.
7. Store the backups in a Founder-controlled private location and verify they can be opened.

Do not paste PINs, hashes, salts, session tokens or private folder/file URLs into project documentation.

## Staging procedure

1. Copy/sanitize the workbook into a non-production staging workbook. Do not bind staging to the live Sheet.
2. Create a separate staging Drive root and, if testing legacy migration, a copied staging legacy folder. Configure their IDs in staging Script Properties.
3. Replace any production contact or notification recipient that could send real messages during testing.
4. Replace retired roles and assign unique staging-only PINs.
5. Put the release-candidate `Code.gs` into the staging-bound Apps Script project and save.
6. Run `migratePinsToHashes()` from the editor. Confirm readable PIN cells are empty and hash/salt cells are populated; save the returned migrated count.
7. Run `listWriteRecoveryRecords()` and review any existing marker before accepting writes.
8. Deploy a new staging web-app version. Use **Execute as: Me** and the access setting required for the PIN-only employee portal (normally the same anonymous `Anyone` setting as the current portal). Application authorization still occurs inside the API.
9. Confirm `GET <staging-exec-url>?action=ping` returns the expected service/version and that no business action is reachable through GET.
10. Create staging `runtime-config.js` with `environment: "staging"` and the staging `/exec` URL. Publish `index.html`, `syoat-app.js`, the runtime config and assets together to a staging URL.
11. Run `auditOperationalFilePrivacy()` and save the before result. Run `hardenOperationalDriveFiles()` only after verifying both configured folder IDs are staging copies; repeat completed 20-file batches until `remaining` is zero and `errors` is empty. Then rerun the audit; exposed count must be zero.
12. Complete every applicable row in `STAGING_UAT_RECORD.md`, including a rollback rehearsal. Fix and retest failures. Production remains blocked until approval is recorded.

## Exact production deployment sequence

Use a communicated maintenance window. No employee should write inventory during steps 1–14.

1. Confirm the no-go checklist is clear and staging UAT matches the hashes in `RELEASE_MANIFEST.md`.
2. Announce maintenance and stop employee access.
3. Create and verify the full production backup package.
4. Recheck Staff/App_Logins active state, supported roles and unique PIN assignments.
5. Configure the exact production Drive root and optional legacy folder IDs in production Script Properties.
6. Copy the complete release-candidate `Code.gs` into the bound production Apps Script project and save it as a new version. Preserve the previous deployment/version for rollback.
7. Create a new web-app deployment URL where practical, using **Execute as: Me** and the approved access setting. Keep the old deployment URL unchanged during validation.
8. Run `migratePinsToHashes()` once from the editor. Record its migrated count; confirm no readable PIN remains.
9. Call the new deployment's ping URL and verify the reported release version.
10. Run `auditOperationalFilePrivacy()` and save the before result. Confirm its checked files belong only to the configured production folders.
11. Run `hardenOperationalDriveFiles()` in completed 20-file batches. After each run record `filesHardened`, `remaining`, `referencesUpdated` and `errors`; repeat until `remaining` is zero and `errors` is empty. Rerun the privacy audit and do not continue while an unexplained exposure/error remains.
12. Create the production `runtime-config.js` pointing to the new deployment URL. Verify it contains no PIN, token or private Drive identifier.
13. Publish `runtime-config.js`, `index.html`, `syoat-app.js` and required assets as one release. Purge/invalidate host cache if applicable.
14. Perform the production smoke tests below using small, deliberate records. If they pass, end maintenance and notify employees. If they fail, keep maintenance active and execute rollback.

## Production smoke tests

- Signed-out page loads the safe staff picker and does not expose PIN/hash/salt fields.
- Founder login, logout and re-login work; refresh requires login again.
- Warehouse login shows only authorized navigation/data.
- One harmless draft movement can be created with PIN confirmation and reviewed by a different authorized approver; verify stock and audit rows.
- One attachment can be uploaded, viewed by an authorized user and denied to an unauthorized/signed-out user.
- Direct/incognito use of an old Drive link fails after hardening.
- Founder health reports the Drive root available and no unexplained missing sheet, recovery item or operational error.
- `listWriteRecoveryRecords()` is empty after smoke tests.
- No browser network request URL contains a PIN or session token.

Record actual results and IDs; reverse the smoke-test movement when operationally appropriate rather than deleting approved records.

## Rollback

Prefer roll-forward for a minor defect. Use rollback when login, authorization, stock integrity or core workflows are unsafe.

During the maintenance window, before real post-release writes:

1. Re-publish the saved previous frontend and its previous API configuration.
2. Switch to the preserved previous Apps Script deployment/version or previous deployment URL.
3. Restore only the backed-up App_Logins authentication columns required by the old release. This reintroduces readable PINs and is a temporary security regression; restrict access and plan an immediate corrected rollout.
4. Restore changed `Movement_Headers.DocumentFile` cells from backup only if the old UI cannot read descriptors. Do **not** make hardened files public again; attachment viewing may remain unavailable until the secure release is fixed.
5. Leave new `SYOAT_*` Script Properties in place unless a reviewed rollback specifically requires removal; old code ignores them. Preserve recovery/error evidence.
6. Verify login, one read and stock totals against the pre-release baseline before reopening access.

After employees resume or new business writes exist, never restore the entire workbook: that would erase valid operations. Use a surgical repair based on IDs, audit history and `listWriteRecoveryRecords()`. Escalate any uncertain partial write instead of clearing its marker.

## Post-release monitoring

For the first business day, a Founder/Co-Founder should check system health at opening, mid-shift and close; review `listWriteRecoveryRecords()` and unresolved operational error IDs; confirm login failures/lockouts are expected; and verify new attachments are private. Continue daily review for one week or until the release is stable.

## Known limitations accepted for review

- Google Sheets has no multi-sheet transactions; locks, commit ordering and manual recovery are compensating controls.
- Apps Script quotas and Script Properties capacity remain operational limits.
- Browser refresh/close intentionally ends the memory-only session.
- Public pre-login picker reveals active employee name, email and supported role; it reveals no authentication secret or capability list.
- In-app private-file viewing is capped at 8 MB.
- Existing operational file sharing changes are not automatically reversible; direct access must be re-granted deliberately if the business later approves an exception.
- Permanent document/business-audit retention remains an open module-level policy.
- There is no CI or automated production deployment; the owner must preserve matching backend/frontend versions.
- The frontend loads React and fonts from public CDNs and therefore needs internet access.
- Phase 2 inventory reconciliation and deeper historical correctness work have not yet been completed.

## Release approval record

| Approval | Name/date/result |
| --- | --- |
| Manifest and hashes reviewed | Pending |
| Owner decisions accepted | Pending |
| Staging/UAT passed | Pending |
| Backup restore verified | Pending |
| Rollback rehearsal passed | Pending |
| Founder authorizes production | Pending |
| Second reviewer confirms | Pending |

Until these fields are completed, the correct release decision is **NO-GO**.
