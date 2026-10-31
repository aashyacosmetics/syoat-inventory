# Source Synchronization Plan

Prepared: 2026-10-30

Status: plan only. No pull, fetch, checkout, reset, clean, overwrite, commit, push or application-code edit was performed.

## Current repository state

- Local branch `main` is four commits behind the existing `origin/main` reference.
- Tracked local changes exist in `index.html` and `syoat-app.js`.
- The backend, tests, configuration templates and project Markdown records are currently untracked in this checkout and must be treated as preserved owner work.
- `runtime-config.js` exists locally, matches the remote production blob at the time of comparison, and is ignored locally. Its endpoint is environment configuration and must not be copied into documentation, patches or review output.
- Archived `index-redesign.html` and `syoat-app-redesign.js` remain excluded.

## Four remote commits reviewed

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

This means the synchronization should start from `origin/main` and reapply the local semantic delta. It should not try to pull the remote commits through the dirty working tree or replay the large upload diff from the old local branch tip.

## Safe synchronization sequence

Perform these steps only after separate owner approval:

1. Freeze the current workspace. Record `git status --short`, the branch/ref values, and cryptographic hashes for every tracked and untracked project file. Save a recoverable copy outside the working directory. Exclude PINs, session data, populated private environment files and private URLs from any shareable manifest.
2. Create an isolated worktree and a `codex/` branch from the reviewed `origin/main` commit. Do not change the current working tree and do not reuse it for synchronization.
3. In the isolated worktree, remove `runtime-config.js` from the proposed tracked source set while retaining `runtime-config.example.js` and the existing ignore rule. Keep the real environment file available only through the owner's deployment process. Review this deletion explicitly because the remote currently tracks the file.
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

## Expected result

The eventual reviewed branch should have `origin/main` as its clean baseline, preserve all later local application/backend behavior, add the project foundation intentionally, keep deployment configuration outside tracked source, and leave the present working tree recoverable and untouched.
