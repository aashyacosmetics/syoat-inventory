# Source Synchronization Plan

Prepared: 2026-10-30

Status: completed. The clean-room baseline was committed as `6861997`, CI was added as `276dabe`, and PR #1 was merged to protected `main` as `02eaa2f`. No application deployment, production configuration or production data was changed.

## Closeout result

- The isolated branch was pushed and merged only after owner approval; the preserved original working directory was not pulled over, overwritten, cleaned or reset.
- GitHub Actions passed on PR #1 and again on merge commit `02eaa2f`. The merge-triggered Pages deployment also completed successfully.
- Read-only live verification on 2026-10-30 returned HTTP 200 for the Pages index and `runtime-config.js`; the application loaded the four authorized identities and build `20261028-fba-review.1`.
- The repository now records backend `3.2-phase2-access-policy.1`, the allowlisted foundation and the unchanged production runtime configuration.
- Active ruleset `Protect main` (`26201018`) requires a pull request, the `Verify repository` status check and an up-to-date branch, and blocks deletion and force pushes.
- The preparation and comparison sections below are retained as historical execution evidence. Statements that the baseline was local, unpublished, unmerged or awaiting protection are superseded by this closeout.

## Historical execution result

- A read-only remote check found that the cached local `origin/main` reference at `c16493b` was stale. Current remote `main` is `f42a482`.
- The current remote was fetched into a private review ref and used as the isolated branch base. The original working-tree files were not changed.
- Remote `f42a482` already contains `Code.gs`, selected Phase 2 records/tests, and frontend build `20261028-fba-review.1`. Local `index.html` and `syoat-app.js` match that remote exactly.
- Only the reviewed backend access-policy delta and allowlisted foundation files were copied into the isolated proposal.
- `runtime-config.js` was not removed or modified.

## GitHub Pages production-configuration proof

The repository root contains no `.github` workflow, Pages build script, package/build configuration or generator that creates `runtime-config.js`. The published `index.html` loads `runtime-config.js` directly from the same root.

Read-only live verification on 2026-10-30 established:

- the Pages index returned HTTP 200;
- the Pages `runtime-config.js` returned HTTP 200 as JavaScript;
- the live index loads `runtime-config.js` and frontend build `20261028-fba-review.1`;
- the live configuration is semantically identical to the preserved local and remote production configuration, including the same Apps Script URL fingerprint.

Therefore the tracked root file is the currently proven delivery mechanism. Removing it without first implementing and verifying an alternative Pages artifact-generation process would break ERP API configuration. This proposal deliberately retains it unchanged.

## Historical pre-merge repository state

- The original local branch `main` was behind its cached tracking ref, and that tracking ref itself was stale. The isolated proposal uses actual remote `main` commit `f42a482`.
- Tracked local changes exist in `index.html` and `syoat-app.js`.
- The backend, tests, configuration templates and project Markdown records are currently untracked in this checkout and must be treated as preserved owner work.
- `runtime-config.js` exists in the remote base and is the proven live Pages delivery mechanism. It remains unchanged; its endpoint must not be copied into documentation, patches or review output.
- Archived `index-redesign.html` and `syoat-app-redesign.js` remain excluded.

## Historical four-commit comparison

| Commit | Date | Remote effect | Local relationship |
| --- | --- | --- | --- |
| `d1818ae` | 2026-08-19 | Replaced `index.html` and `syoat-app.js` with the secured runtime-config-based frontend; the upload contains substantial line-ending/format churn | The preserved local frontend is based on this behavior and has later changes |
| `2faad97` | 2026-08-19 | Updated the two `index.html` script cache keys for the Phase 1 publication | Local cache keys are newer (`20261028-fba-review.1`) |
| `f32b39b` | 2026-08-19 | Added tracked production `runtime-config.js` | Local policy ignores this file; preserve it outside the synchronized source change and do not expose its endpoint |
| `c16493b` | 2026-10-23 | Corrected Record Movement availability to use the selected source location | Already present in the preserved local frontend; it does not appear as a remaining semantic difference from `origin/main` |

## Semantic comparison result

After ignoring whitespace, local `index.html` differs from `origin/main` only in the two current cache/build query strings. Local `syoat-app.js` is 278 additions and 43 deletions beyond `origin/main`. The remaining delta is later work, including:

- current frontend build marker;
- Founder-only Opening Balance UI alignment;
- minimal FBA open-shipment selection for dispatch;
- backend-derived FBA report freshness and newest-date parsing;
- Pending FBA variance handling and dedicated evidence classification;
- current-upload variance analytics;
- Founder health display for staff-access mismatches.

The cached comparison established that local work included the original four commits. The actual execution then refreshed the remote tip privately and confirmed that current remote `f42a482` already contains the complete reviewed frontend. The remaining application delta is backend `Code.gs` only.

## Historical safe synchronization sequence

These steps were the approved execution plan. They are retained for audit history and are no longer an open synchronization task:

1. Freeze the current workspace. Record `git status --short`, the branch/ref values, and cryptographic hashes for every tracked and untracked project file. Save a recoverable copy outside the working directory. Exclude PINs, session data, populated private environment files and private URLs from any shareable manifest.
2. Create an isolated worktree and a `codex/` branch from the reviewed `origin/main` commit. Do not change the current working tree and do not reuse it for synchronization.
3. Retain tracked `runtime-config.js` unchanged because it is the proven current Pages delivery mechanism. A future removal requires a separately implemented and live-verified artifact-generation process.
4. Generate the application patch from the preserved workspace relative to `origin/main`, limited initially to `index.html` and `syoat-app.js`. Apply it to the isolated worktree and confirm that the remote source-location fix remains present.
5. Copy the untracked foundation deliberately by allowlist: `.gitignore`, `AGENTS.md`, `Code.gs`, `README.md`, `config/` templates/catalogue, `docs/`, `package.json`, `pnpm-lock.yaml`, `runtime-config.example.js`, `scripts/`, and `tests/`. Do not bulk-copy ignored files, populated local environment configuration, caches, build output or archived redesign artifacts.
6. Review the isolated diff in three groups: remote baseline retained, local application delta, and newly tracked foundation/documentation. Normalize line endings separately so format churn cannot hide semantic changes.
7. Run syntax checks, the full Node test suite, API-catalogue verification and environment-template safety checks. Run the localhost staging-server test only as a local security regression test; D-022 does not make staging a release gate.
8. Verify version alignment across `Code.gs`, `index.html`, `syoat-app.js`, `config/api-catalog.json`, `docs/API_CATALOG.md`, `docs/STATUS.md` and the new release manifest. Confirm that no PIN, hash, salt, session token, populated environment identifier, private file URL or credential was added.
9. Produce an owner review package containing the isolated diff, changed-file manifest, hashes, test output, known production actions and rollback/recovery sequence. Do not commit, push, deploy or publish until the owner explicitly authorizes that separate action.

## Stop conditions

Stop the synchronization review if any of the following occurs:

- the isolated patch drops the source-location availability fix or another remote behavior;
- local application behavior cannot be mapped to the matching backend/API catalogue;
- `runtime-config.js` or another populated environment file appears in the proposed tracked diff;
- a secret, PIN-derived value, session token or private document URL appears in output;
- tests, catalogue verification or version alignment fail;
- an unrelated owner file would be overwritten or omitted.

## Historical expected result

The reviewed proposal uses current remote `f42a482` as its clean baseline, preserves the identical published frontend, applies the later backend access policy, adds the project foundation intentionally, keeps the proven production configuration unchanged, and leaves the original working-tree files untouched.
