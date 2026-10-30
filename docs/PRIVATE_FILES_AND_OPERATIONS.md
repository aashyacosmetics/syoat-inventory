# Private Files and Operational Hardening

Status: private-file controls are deployed. The configured production Drive root was inspected read-only on 2026-10-23.

## Implemented policy

- Movement evidence and generated marketplace ledgers are stored as private Drive files. New code contains no `ANYONE_WITH_LINK` sharing path.
- Sheet records store opaque file descriptors (`fileId`, name, MIME type, and size), not public URLs.
- The browser can fetch movement evidence only through the authenticated `getOperationalFile` POST action. The server rechecks the session, capability, movement visibility, and stored file reference before returning the file.
- File content is loaded only after the employee clicks an attachment, retained in browser memory, and limited to 8 MB for in-app viewing.
- Founder and Co-Founder can see a protected system-health summary. Other roles do not receive the `system.health.view` capability.
- Unexpected server failures return a safe message, request ID, and error ID. Browser responses omit stack traces, Sheet names, Drive details, secrets, and raw internal messages.
- Each Apps Script environment resolves its operational Drive root only from the `SYOAT_DRIVE_ROOT_FOLDER_ID` Script Property. The optional `SYOAT_LEGACY_ATTACHMENTS_FOLDER_ID` property includes a legacy folder in audit/hardening. Name-based root discovery is prohibited.

The coordinated private-file release is deployed. The 2026-10-23 inspection was read-only and made no Drive permission, ownership, naming, or file changes.

## Production Drive baseline (verified 2026-10-23)

The configured root folder is named `Syoat Inventory ERP`. It and every enumerated descendant were owner-only and reported as not shared. Staff should access attachments through the authenticated ERP, not by receiving direct Drive shares. The folder ID remains in Apps Script properties and owner-controlled handoff records rather than this repository document.

| Folder | Observed contents | Operational purpose |
| --- | ---: | --- |
| `01_Backend` | 4 files | Live workbook, two older workbook copies, and one Google Doc of unknown purpose |
| `02_Supplier_Invoices` | 16 JPEG files | Stock-in and supplier evidence |
| `03_FBA_Documents/01_Inventory_Ledgers` | 8 CSV files | Amazon FBA ledger imports |
| `03_FBA_Documents/02_Shipment_Plans_Labels` | 85 JPEG files | FBA dispatch and receipt evidence |
| `03_FBA_Documents/03_Returns_Removals ` | Empty | Returns/removals; current name has a trailing space |
| `04_Shiprocket_Exports` | Empty | Shiprocket exports |
| `05_Stock_Audits` | Empty | Stock-audit evidence |
| `06_Backups` | Empty | Backup destination |
| `07_SOP_and_Change_Log` | Empty | Operating documentation |
| `08_Damage_Photos` | Empty | Damage evidence |
| `09_Returns` | 46 JPEG files | Return evidence |
| `10_Samples` | Empty | Sample evidence |
| `11_Other_Attachments` | At least 200 JPEG files | Fallback attachment location |

At least 359 files were visible in the read-only inventory. The actual total may be higher because the connector capped the largest folder listing.

The application depends on the exact folder names above. Do not rename or move them without a coordinated code and configuration change. In particular, `03_FBA_Documents/03_Returns_Removals ` currently includes a trailing space.

Operational observations:

- The newest observed FBA ledger was dated 2026-10-21, although the live Amazon page reported that no ledger had been uploaded. Investigate this application/import-state mismatch before changing files.
- Ledger filenames showed duplicate dates on 2026-07-11 and 2026-07-19; confirm whether they are legitimate separate exports before cleanup.
- `01_Backend` contains two older workbook copies and an untitled Google Doc. Their purpose and retention policy require owner confirmation.
- `06_Backups` was empty. No backup was created because the owner explicitly requested changes to the current Apps Script and GitHub project without a new backup.

## Existing-file migration utilities

`auditOperationalFilePrivacy()` is read-only. It reports the number of operational files inspected and any public/link-shared or directly shared exceptions.

`hardenOperationalDriveFiles()` is a manual resumable migration. Under the script lock it recursively scans the ERP operational folders, skips completed files, hardens at most 20 exposed files per invocation, and reports `remaining`. Run it again only after a completed batch, until `remaining` is zero and `errors` is empty. The final batch converts legacy movement URLs into file descriptors.

Run neither function automatically from the frontend. Before production use:

1. Back up the workbook and confirm the configured operational Drive folder IDs and ownership. Staging IDs must never point to production folders.
2. Run `auditOperationalFilePrivacy()` and save its summary.
3. Review direct access that the migration will remove, especially any deliberate external sharing.
4. Deploy the matching `Code.gs`, `index.html`, and `syoat-app.js` versions together.
5. Run `hardenOperationalDriveFiles()` in completed batches. Record each summary and repeat until `remaining` is zero and `errors` is empty.
6. Run `auditOperationalFilePrivacy()` again. Investigate any remaining exception; the expected `exposedCount` and `errorCount` are zero.
7. Smoke-test one authorized attachment, one out-of-scope movement, and a signed-out browser.

## Errors, retention, and health

- Unexpected-error records are held in Script Properties under generated error IDs.
- Resolved records older than 90 days are cleaned up and storage is capped at 100 records. This is an operational troubleshooting store, not the permanent business audit trail.
- `resolveOperationalError(errorId, resolutionNote)` is a manual Founder support utility.
- `getSystemHealth` reports missing required sheets, Drive-root availability, unresolved recovery items, and unresolved error references. It deliberately excludes raw error messages and stack traces.
- Business audit records and operational documents retain their existing lifecycle until the owner approves a module-specific retention policy.

## Security regression checklist

- Public GET exposes only ping and the minimal staff picker.
- Operational file bytes require a valid session and `inventory.files.view`.
- The requested file must be referenced by a movement visible to the requesting employee.
- Arbitrary or legacy remote URLs are never rendered directly by the active frontend.
- New attachments and FBA ledgers are private and create no public URL.
- Safe error responses contain correlation references but no internal implementation detail.
- System health is limited to Founder and Co-Founder.
- Migration and privacy audit remain manual owner-controlled operations.
