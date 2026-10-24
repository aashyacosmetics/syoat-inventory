# Changelog

This log records meaningful project changes. It is not a substitute for Git history or the business audit trail.

## Unreleased

### Changed

- Released and verified backend `3.1-phase2-wp1.6` for the measured startup authentication delays. The public staff picker now keeps only its sanitized `name`/`email`/`role` response in server-side Script Cache for 30 seconds; actual login continues to read the live Staff and App Login rows and verify the stored salted PIN hash. Session cleanup now maintains a compact session-property index instead of scanning unrelated write-recovery and operational-error properties on every login. A production ping returned status `ok` and the expected version. The first/cold four-call screenshot recorded 3,436 ms average, 4,156 ms maximum and zero failures. The immediate warm repeat recorded 3,875 ms average, 5,373 ms maximum and zero failures; login was 3,891 ms and the fourth/unlisted picker call was approximately 2,869 ms. These are small improvements from the `3.1-phase2-wp1.5` baseline and remain above the warm target, so no stronger authentication cache is authorized. Both active JavaScript files parse, all 73 tests pass, the 48-action API catalogue is current and the environment template remains structurally safe.
- Released and verified backend `3.1-phase2-wp1.5` with a request-scoped parsed Sheet/header read cache. Repeated unchanged reads within one `doGet`/`doPost` execution are reused; `appendRow()` and `updateRow()` invalidate the affected object rows, and the cache is discarded before the response returns. A production ping returned status `ok` and the expected version; the fresh four-call browser session averaged 3,553 ms with a 4,234 ms maximum and zero failures. The cold inventory bootstrap met the under-five-second target, while picker/login timing remains the next optimization target. Both active JavaScript files parse, all 70 tests pass, the 48-action API catalogue is current and the environment template passes its structural safety check.
- Completed the Phase 2 health classification and owner-run reviewed cleanup. Both failed `approveStockCount` requests were stopped by the approval-time stale-stock guard before any checkpoint or adjustment movement was created: `CNT-037` and `CNT-038` used saved quantity `2091`, while the current approved ledger quantity for `PRD-P002` at `MAIN_WH` was `1880`. The owner preserved both recovery markers as no-retry resolutions, resolved the seven unlinked `PLATFORM_TEMPORARY` login errors, and then rejected both stale count rows. The 2026-10-24 14:40:09 IST follow-up audit returned zero recovery items and zero unresolved errors; read-only verification confirmed both old counts are `Rejected` with no adjustment movement ID.
- Recorded the successful replacement count: `CNT-046` reconciled `PRD-P002` at `MAIN_WH` from system `1880` to physical `1881`; approval created adjustment `MOV-381`, and the Inventory card displayed Warehouse `1881`. The post-approval session had zero API failures and clean recovery/error/missing-sheet health; the 11,499 ms approval and 4,356 ms session average are retained as Phase 2 performance evidence.
- Released and verified the staff-access alignment on 2026-10-24: backend `3.1-phase2-wp1.3`, frontend `20261023-access-baseline.1`, GitHub commit `104c6e8`, and GitHub Pages deployment #80. A fresh production load showed only the four effective staff identities, the backend ping returned status `ok`, and owner UAT confirmed Dharani's Co-Founder movement screen has no Setup or Opening Balance section.
- Prepared local access-alignment candidate backend `3.1-phase2-wp1.3` and frontend `20261023-access-baseline.1`: the public picker now requires active matching `Staff` and `App_Logins` records and uses the authoritative Staff name/role; Founder System Health reports safe access mismatches; Opening Balance is Founder-only in both issued UI capabilities and backend enforcement. Added regression coverage for the verified production mismatch cases; all 68 tests pass.
- Released the source-location availability correction to the existing Apps Script deployment and GitHub `main`; owner confirmation and a read-only production check verified backend `3.1-phase2-wp1.2`, frontend `20260819-phase2-wp1.1`, GitHub commit `c16493b`, and backend status `ok` on 2026-10-23.
- Corrected Record Movement availability so outbound quantities are compared with the selected movement's actual source location instead of the total across Warehouse, FBA, Transit and Returns; inbound and setup flows no longer show a misleading availability value.
- Recorded the owner-confirmed 2026-08-21 restricted staging rollback backup and 24-tab verification. Later screenshot evidence showed the intended named workbook version was not available, so the rehearsal is paused rather than restoring the older 2026-08-19 version.
- Recorded no-attachment staging draft `MOV-198` as the disposable marker for the isolated rollback rehearsal; restore verification remains pending.
- Corrected the rollback evidence after the inspected backup proved to be the older 2026-08-19 pre-PIN copy. It is preserved but explicitly blocked as a current restore source; the rehearsal must restart from a newly verified baseline.

### Added

- Added local backend candidate `3.1-phase2-wp1.4` with the owner-only, non-routed `auditPhase2SystemHealth()` diagnostic. It safely categorizes and correlates unresolved recovery and operational-error records without returning identities, payloads, raw messages, stacks, URLs or configuration identifiers. Added regression coverage; all 69 tests pass.
- Recorded the verified 2026-10-23 production access and asset baseline in the existing project documentation, including `Staff`/`App_Logins` alignment, effective staff access, role and movement gates, private Drive inventory, authoritative production versions, workbook metadata, and unresolved owner decisions. No credentials or private file links were recorded.
- Safe manual `auditOperationalConfiguration()` diagnostic reporting only environment/configured/available/enabled booleans, with no Drive folder ID or notification address in its log.
- Phase 2 cross-cutting performance requirements covering consolidated loading, lazy modules, revision-safe caching, incremental refresh, batched Sheet operations, retry classification, form preservation and credential-free timing telemetry while retaining mandatory PIN controls.
- First performance correction: low-stock alerts now reuse the core Product/Stock response instead of issuing two duplicate requests immediately after login.
- Phase 2 WP1 safe timing: API envelopes report server execution duration, the browser keeps bounded credential-free action/duration/outcome aggregates in memory, and only Founder/Co-Founder System Health displays the current-session summary.
- Staging notification isolation: non-production environments send no operational email unless an explicit test recipient is configured, and enabled subjects are prefixed with the environment name.
- Localhost-only staging frontend server with dynamic staging API injection, production-runtime preservation, no-store responses and an asset allowlist that blocks local configuration/file traversal.
- Founder staging performance summary now identifies the three slowest API actions by action name and duration without recording payloads or credentials.
- Staging candidate `3.1-phase2-wp1.2` consolidates the startup Product, Stock and recent Movement reads into one uncached authenticated bootstrap, and defers Counts, Support, Purchasing and Stock-In purchase-order reads until those interfaces are opened.
- Phase 2 Work Package 1 read-only stabilization evidence, isolated-staging/rollback record and an automated environment gate that rejects placeholders, production resource reuse and credential-like configuration fields.
- Phase 2 inventory-correctness execution plan with ten gated work packages, explicit accounting/FBA boundaries, measurable exits, mandatory staging/rollback, remediation safeguards and owner decision gates.
- Dedicated Phase 2 visual UX package for guided Record Movement data entry and ledger-backed Inventory Analytics, including employee usability, accessibility, role scope and chart-to-source reconciliation requirements.
- Work Package 7 release manifest, owner decision/no-go gates, workbook and Drive configuration checklist, backup and staging sequence, exact coordinated production order, smoke tests, rollback procedure, monitoring plan, and staging/UAT evidence record.
- Phase 1 frontend cache keys for `runtime-config.js` and `syoat-app.js`, preventing a previously cached application bundle from calling the new backend.
- Logged before/after operational-file privacy audit summaries for visible migration evidence and advanced the deployed health version to `3.0-wp7`.
- Replaced the time-limited one-pass file migration with resumable 20-file batches, compact audit summaries, final-batch reference normalization, and release version `3.0-wp7.1` after the live audit identified 187 files.
- Environment-specific Drive root/legacy folder Script Properties that prevent staging from discovering or writing to production folders by name.
- Work Package 6 private operational storage, authenticated movement-scoped attachment retrieval, private FBA ledger archives, legacy-file audit/hardening utilities, safe correlated errors, and Founder/Co-Founder system health.
- Protected frontend attachment loading that fetches file bytes only after authorization and never renders arbitrary legacy URLs.
- Operational hardening and owner-run migration guide with security regression checklist.
- Work Package 5 serialized write boundary covering all 24 business commands, durable request-result idempotency, payload collision detection, identifier checkpoints and manual recovery records.
- Header-last aggregate creation and state-last update ordering for recovery-safe multi-sheet writes.
- Approval-time negative-stock validation, stale-stock-count rejection, and stronger product/location/quantity/date/supplier/FBA validation.
- Active integrity tests for unique IDs, exact retry replay, approval-time stock competition and simulated partial failure recovery.
- Work Package 4 frontend migration: server-capability navigation/actions, centralized session-expiry logout, backend movement row scope, live-only staff discovery, fail-closed PIN confirmation, and environment-specific runtime API configuration.
- Regression coverage proving the retired `Owner` role is not selectable or login-capable and that active frontend source contains no offline staff cache or hard-coded Apps Script URL.
- Session-protected POST router for all 17 business reads and 24 writes; public GET is limited to health and the safe staff picker.
- Central backend action-to-capability and role-to-capability enforcement with server-returned capability lists.
- Exact role/capability documentation and tests for policy/catalogue agreement and denied access.
- Local hashed-PIN login with unique-PIN migration, five-attempt lockout, temporary hashed server sessions, idle/maximum expiry, deactivation checks, PIN confirmation, verification, logout, and expired-session cleanup.
- Active-frontend session transport: memory-only token, POST writes, server PIN confirmation, and logout revocation.
- PIN session implementation and pre-deployment migration documentation.
- Dependency-free Node test harness with syntax, API-contract, fixture-safety, environment, and baseline security checks.
- Reusable in-memory Google Sheets/Apps Script harness with executable health, authenticated-read, stock-derivation, capability-denial, and unauthorized-write tests.
- Machine-readable catalogue covering all 47 currently routed backend actions and the active frontend caller set.
- Sanitized ERP fixtures and a development/staging/production configuration template containing no live credentials or identifiers.
- Active security target tests covering authenticated transport, private operational files, legacy migration controls, and safe operational failures.
- Local canonical `Code.gs` copied from the owner-supplied Apps Script source.
- Workspace and repository `AGENTS.md` instructions for future tasks.
- Project README and documentation index.
- Product charter defining the single-portal goal and accounting exclusion.
- PIN-only access and security requirements.
- Current and target architecture, including the inventory transaction strategy.
- Module map for inventory, Amazon FBA, marketplaces, website, social media, collaborations, tasks, documents, and audit.
- Data and integration rules.
- Sequential roadmap with phase exit criteria.
- Detailed Phase 1 execution plan with seven reviewable work packages and exit checks.
- Engineering workflow, definition of done, review checklist, and handoff template.
- Accepted/open decision log.
- Current audit baseline, risks, production state, and next task.

### Clarified

- Recorded the clean functional no-attachment draft/rejection result without inventing an unsupplied latency measurement; rollback rehearsal is the remaining Work Package 1 process gate.
- Recorded passed post-recovery Founder health with no System attention warning and zero API failures; separated the 11,620 ms attachment-backed draft and 4,560 ms authenticated file retrieval from the normal no-attachment write target.
- Recorded passed staging private-file UAT: `MOV-196_1.jpg` was routed to the staging attachment subtree, remained Restricted in Drive and opened through Founder's authenticated ERP session.
- Recorded the passed staging draft/rejection test: Zubhedha created the fresh draft, Founder rejected it, and Warehouse stock remained 1,488 with no rejected-draft ledger effect.
- Recorded the staging attachment failure as an ID-allocation-only event, restored and verified the staging Drive-root configuration, retained the failed request as `RESOLVED_NO_RETRY`, resolved its matching operational error and confirmed the recovery queue is empty before authorizing a fresh UAT attempt.
- Closed Phase 1 with a durable completion record covering all work packages, release hashes, production migrations/smoke evidence, retained decisions/limitations and the Phase 2 starting point.
- Recorded the owner-run `3.0-wp7.1` production deployment, successful PIN migration, 187/187 private-file result, 85 normalized movement references and passed Founder/Warehouse draft-rejection smoke test; isolated staging/rollback remains an explicit unmet process gate.
- Founder and Co-Founder are the only top-authority roles; `Owner` is retired and unsupported.
- Defined the accounting exclusion as daily expenses, sales/revenue accounts, cash received or paid, and cash-flow tracking while retaining sales-order and fulfilment data needed for inventory operations.
- Recorded that code changes remain local and the owner performs deployment and publication.
- Marked redesign-named HTML/JavaScript files as ignored archived test artifacts rather than active source.
