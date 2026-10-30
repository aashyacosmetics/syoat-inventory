import test from "node:test";
import assert from "node:assert/strict";
import { functionBody, readProjectFile } from "../scripts/source-analysis.mjs";

test("operational attachments are private and served only through the authenticated API", () => {
  const backend = readProjectFile("Code.gs");
  const frontend = readProjectFile("syoat-app.js");
  const saveAttachments = functionBody(backend, "saveAttachmentsToDrive");
  const saveLedger = functionBody(backend, "saveLedgerToDrive");
  const fileRead = functionBody(backend, "getOperationalFile");

  assert.doesNotMatch(backend, /ANYONE_WITH_LINK/);
  assert.match(backend, /DriveApp\.Access\.PRIVATE/);
  assert.doesNotMatch(saveAttachments, /https?:\/\//);
  assert.doesNotMatch(saveLedger, /https?:\/\//);
  assert.match(fileRead, /movementID/);
  assert.match(fileRead, /fileId/);
  assert.match(fileRead, /EnteredByEmail/);
  assert.match(frontend, /api\("getOperationalFile"/);
  assert.match(frontend, /never render unauthenticated remote URLs/);
});

test("existing operational files have explicit audit and hardening utilities", () => {
  const backend = readProjectFile("Code.gs");
  const privacyAudit = functionBody(backend, "auditOperationalFilePrivacy");
  assert.match(backend, /function hardenOperationalDriveFiles/);
  assert.match(backend, /function auditOperationalFilePrivacy/);
  assert.match(backend, /removeViewer/);
  assert.match(backend, /removeEditor/);
  assert.match(privacyAudit, /getLegacyAttachmentsFolder/);
  assert.match(backend, /SYOAT_DRIVE_ROOT_FOLDER_ID/);
  assert.match(backend, /FILE_HARDEN_BATCH_SIZE/);
  assert.match(backend, /remaining/);
  assert.doesNotMatch(backend, /DriveApp\.getFoldersByName\("Syoat Inventory ERP"\)/);
});

test("manual staging configuration audit omits resource identifiers and recipients", () => {
  const backend = readProjectFile("Code.gs");
  const audit = functionBody(backend, "auditOperationalConfiguration");

  assert.match(audit, /driveRootConfigured/);
  assert.match(audit, /driveRootAvailable/);
  assert.match(audit, /notificationsEnabled/);
  assert.doesNotMatch(audit, /folderId\s*:/i);
  assert.doesNotMatch(audit, /recipient(?:s|Address)?\s*:/i);
});
