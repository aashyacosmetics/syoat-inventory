# Runtime Configuration

`environments.example.json` defines the target separation between development, staging, and production without storing live identifiers or credentials.

- Development uses synthetic fixtures only.
- Staging will use a separate Apps Script deployment and non-production workbook supplied by the owner.
- Staging and production use explicit, different Drive root folder IDs in Apps Script Properties; folders are never discovered globally by name.
- Production identifiers are provided only during the owner's publication/deployment process.
- Secrets, PINs, session tokens, and private file links never belong in this directory or Git.
- The active frontend reads `runtime-config.js`; this JSON template is the review record for environment separation and is not loaded by the browser.

Create local/private configuration from the example only when needed. Do not commit populated private identifiers. The public Apps Script endpoint still must be supplied to the published frontend through `runtime-config.js` as explained in `docs/OWNER_DEPLOYMENT_HANDOFF.md`.

For Phase 2 staging preparation, copy the example to the gitignored `environments.local.json`, populate only the non-secret resource identifiers and run `npm run check:staging`. The command fails if staging reuses the production API URL, workbook or Drive root. It never creates, changes or contacts either environment.
