# Syoat ERP

Syoat ERP is the planned single point of access for Syoat's non-accounting D2C business operations. It will bring warehouse inventory, Amazon FBA inventory by fulfilment centre, marketplace operations, website work, social media, collaborations, approvals, documents, tasks, and audit history into one role-controlled portal.

The present application is a static React frontend backed by Google Apps Script and a Google Sheets workbook. It is an operating prototype that requires security and inventory-integrity corrections before new business modules are added.

## Non-negotiable product rules

- PIN-only employee access.
- No public signup and no user-creation workflow.
- Only owner-controlled, pre-authorized staff may log in.
- Backend-enforced role and module permissions.
- No daily accounts module for expenses, sales/revenue books, cash received or paid, or cash flow.
- All business changes must have an audit trail.
- Warehouse, FBA transit, and every Amazon FC are separate stock locations.

## Current repository

- `index.html` — current application entry page.
- `syoat-app.js` — current application bundle/source artifact.
- `syoat-theme.css` — application styling.
- `index-redesign.html` and `syoat-app-redesign.js` — archived test artifacts from before the live-version edits; ignore and never publish them.
- `images/` — product and brand images.
- `Code.gs` — local canonical copy of the supplied Apps Script backend; pending owner review/commit and manual deployment.
- `docs/` — product, architecture, security, roadmap, decisions, status, and working procedures.

## Documentation map

- [Project charter](docs/PROJECT_CHARTER.md)
- [Security and access](docs/SECURITY_AND_ACCESS.md)
- [PIN session implementation](docs/PIN_SESSIONS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Modules and scope](docs/MODULES.md)
- [Data and integrations](docs/DATA_AND_INTEGRATIONS.md)
- [API and permission catalogue](docs/API_CATALOG.md)
- [Role and capability matrix](docs/ROLE_CAPABILITIES.md)
- [Write integrity and recovery](docs/WRITE_INTEGRITY.md)
- [Private files and operational hardening](docs/PRIVATE_FILES_AND_OPERATIONS.md)
- [Owner deployment handoff](docs/OWNER_DEPLOYMENT_HANDOFF.md)
- [Phase 1 release manifest](docs/RELEASE_MANIFEST.md)
- [Staging and UAT record](docs/STAGING_UAT_RECORD.md)
- [Production release record](docs/PRODUCTION_RELEASE_RECORD.md)
- [Phase 1 completion record](docs/PHASE_1_COMPLETION.md)
- [Phase 2 execution plan](docs/PHASE_2_PLAN.md)
- [Phase 2 WP1 stabilization and staging foundation](docs/PHASE_2_WP1_STABILIZATION.md)
- [Phase 2 staging and rollback evidence record](docs/PHASE_2_STAGING_RECORD.md)
- [Roadmap](docs/ROADMAP.md)
- [Phase 1 execution plan](docs/PHASE_1_PLAN.md)
- [Engineering workflow](docs/ENGINEERING_WORKFLOW.md)
- [Decision log](docs/DECISIONS.md)
- [Current status and handoff](docs/STATUS.md)
- [Changelog](docs/CHANGELOG.md)

## Current phase

Phase 1 is complete and stored in `docs/PHASE_1_COMPLETION.md`. Phase 2 inventory correctness is active. Under owner decision D-022, staging is excluded from the current Phase 2 continuation and release workflow; historical staging records are retained but are not an open gate. Local verification, owner-only deployment, backups, dry-runs for data changes, immediate production verification and rollback/recovery planning remain required. New modules must still follow the sequential roadmap.

## Starting a new task

Open `AGENTS.md` first. A task should identify one roadmap item, state whether it affects production, implement the smallest coherent change, verify it, and update the status/handoff documentation.

Development changes are made locally. The owner performs Apps Script deployment and frontend publication.

## Local verification

The test harness uses Node's built-in tools and has no third-party package dependencies:

```powershell
npm run check
```

This checks JavaScript syntax, executes the Apps Script locally against in-memory sanitized Sheets, verifies backend/frontend action coverage, catalogue and release-manifest consistency, environment safety, and the Phase 1 security/integrity outcomes. The completed Phase 1 suite has no TODO tests.
