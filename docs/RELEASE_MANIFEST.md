# Phase 1 Release Manifest

Historical production evidence: this manifest is immutable for deployed release `3.0-wp7.1`. Phase 2 local source is expected to diverge and will receive a new release manifest after local/sanitized verification and owner approval; staging is excluded from the current workflow under D-022.

## Post-release repository closeout — 2026-10-30

The Phase 1 hashes and deployment statements below remain immutable historical evidence. Their descriptions of uncommitted/local-only source and an ignored runtime configuration are superseded for the current repository state:

- audited source baseline commit `6861997` and CI commit `276dabe` were merged through PR #1 as `02eaa2f`;
- `Code.gs` is version-controlled at recorded deployed backend version `3.2-phase2-access-policy.1`;
- the tracked root `runtime-config.js` remains the proven GitHub Pages production-configuration mechanism and was not modified;
- PR and merge CI succeeded, and the merge-triggered Pages deployment succeeded;
- active ruleset `Protect main` (`26201018`) requires the `Verify repository` check through a pull request; and
- this closeout did not deploy application code or mutate configuration, the workbook, Drive or production data.

The original Phase 1 release candidate record follows unchanged.

Release candidate: `phase-1-local-2026-08-19`

Historical source baseline at release time: local branch `main`, original Git commit `998ca62`, plus the then-uncommitted Phase 0/1 files and changes listed below. Nothing had been pushed or deployed at that checkpoint.

## Production publication files

| File | Deployment purpose | SHA-256 |
| --- | --- | --- |
| `Code.gs` | Complete Apps Script backend replacement | `E6108D58CDB878FD724A51B181668F9DDCC9C1B064D2C4B2D7DED940601261C4` |
| `index.html` | Active frontend entry point; loads runtime configuration and forces the Phase 1 cache version | `0137C19959C2D912013CFD6144F76006B11E7B39B369D437F0CEE8F7E6CF076E` |
| `syoat-app.js` | Active secured frontend | `5C58C59E616A52A7296F620E6F1974779B63D112BF2979553860515DE7391533` |
| `runtime-config.example.js` | Template only; copy to `runtime-config.js` and set the environment API URL | `0B2C5C76B903F589272094301DD9D5F6D9925102183ECE9A3FB954EAAAA927D9` |
| `syoat-theme.css` | Existing frontend styling asset | `9A2143DEE7DBD31CEAD6177F2E5541FD39E784FC5D62E3518C69D87BE4E3DDB5` |

Historical Phase 1 packaging instruction: `runtime-config.js` was treated as environment-specific and gitignored. The owner later approved the non-secret production version as a tracked root file; GitHub Pages now serves that unchanged file beside `index.html`. It contains a public web-app endpoint, never a PIN, token, Drive ID, or other credential. Removing it still requires a separately implemented and verified artifact-generation replacement.

Continue publishing the existing `syoat-logo.png` and `images/` assets. Do not publish `index-redesign.html` or `syoat-app-redesign.js`; they are archived test artifacts.

## Source-control and verification files

- Root controls: `AGENTS.md`, `.gitignore`, `README.md`, `package.json`, `pnpm-lock.yaml`, `runtime-config.example.js`.
- Configuration: `config/api-catalog.json`, `config/environments.example.json`, and `config/README.md`.
- Local verification: `scripts/` and `tests/`, including sanitized fixtures only.
- Project records: all Markdown files under `docs/`.

These files should be reviewed and committed with the matching active frontend/backend so future tasks share one source of truth. They are not browser publication assets unless the deployment owner deliberately publishes documentation.

## Verification result

- Runtime: Node.js `v24.19.0`.
- JavaScript syntax: `Code.gs` and `syoat-app.js` passed.
- Automated suite: 49 passed, 0 failed, 0 skipped, 0 TODO.
- API catalogue: current, covering 47 backend actions.
- Business routes: 17 authenticated reads and 24 serialized authenticated writes; public GET is limited to ping and the minimal staff picker.
- Active source contains no `ANYONE_WITH_LINK` path and no production Apps Script URL.

If any production publication file changes after this manifest, recalculate its SHA-256 and rerun the complete local check before using this release candidate.
