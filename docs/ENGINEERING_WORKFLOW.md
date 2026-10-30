# Engineering Workflow

## Before starting a task

1. Read `AGENTS.md` and its required documents.
2. Check `docs/STATUS.md` for current work, blockers, and production state.
3. Select one roadmap item and state the intended outcome.
4. Inspect the relevant code and live schema read-only.
5. Identify security, data, and deployment impact.
6. Confirm unresolved decisions before making a high-impact assumption.

## Change sequence

1. Reproduce or characterize current behavior.
2. Define acceptance cases, including permission and failure cases.
3. Change the smallest coherent surface.
4. Add/update automated checks or a repeatable verification script.
5. Run syntax, behavior, regression, and data-contract checks appropriate to the change.
6. Review the diff for secrets, production URLs, accidental generated files, and unrelated edits.
7. Update `docs/STATUS.md` and `docs/CHANGELOG.md`.
8. Hand the verified local files to the owner. The owner performs deployment and publication.

## Definition of done

A task is done only when:

- acceptance behavior is implemented;
- server-side authorization and validation are covered;
- failure and retry behavior are considered;
- relevant tests/checks pass;
- no secret or PIN is exposed;
- documentation and handoff are current;
- remaining production action is clearly stated;
- local files are ready for owner review; deployment/publication has not been performed by the coding task.

## Git conventions

- Keep backend and frontend changes for one behavior understandable in the same change set.
- Use focused branches/commits; do not combine unrelated cleanup with a functional fix.
- Suggested commit form: `type(scope): outcome`, for example `fix(auth): reject unauthenticated reads`.
- Do not rewrite shared history or discard unrelated work.
- Do not push, merge, deploy, or publish; the owner performs those actions.

## Live-data safety

- Read-only inspection is preferred while designing.
- Back up affected sheets before schema or bulk data changes.
- Test migration logic on a copy.
- Use stable IDs, never row numbers, as business identifiers.
- Report expected and actual affected row counts.
- After a write, re-fetch and verify the exact affected records and reconciliations.
- Never silently repair or delete approved history.

## Review checklist

- Authentication required?
- Permission checked on backend?
- PIN/token absent from URL, logs, and persistent browser storage?
- Input and state transition validated?
- Concurrent requests safe?
- Retry idempotent?
- Partial-write recovery defined?
- Audit record complete?
- Files private?
- Production/staging configuration separated?
- Existing data and frontend compatibility preserved?
- Documentation updated?

## Task handoff template

Copy this into the top of `docs/STATUS.md` for active work:

```markdown
### YYYY-MM-DD — Task name

- Status: planned | in progress | blocked | ready for review | complete
- Goal:
- Roadmap item:
- Files changed:
- Checks and results:
- Live/production changes: none | describe explicitly
- Risks or blockers:
- Next recommended action:
```
