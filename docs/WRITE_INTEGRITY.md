# Write Concurrency, Idempotency and Recovery

Status: Work Package 5 implemented and verified locally; not deployed.

## Serialized write boundary

Every authenticated business write passes through `handleWrite`, which:

1. requires and validates a client-generated `requestId`;
2. obtains the Apps Script script lock;
3. checks the durable request record;
4. runs exactly one classified business command;
5. records the command result before releasing the lock.

The lock covers identifier allocation, current-stock reads, state validation and every Sheet mutation made by that command. Reads do not take this lock, so aggregate headers and state fields serve as commit markers.

## Durable request records

Records are stored in Script Properties under a hashed `SYOAT_WRITE_REQUEST_` key. Each contains the request ID, action, employee, payload fingerprint, status, timestamps, target reference, allocated-ID checkpoints, result, and a bounded error when review is required.

| State | Meaning | Retry behavior |
| --- | --- | --- |
| `IN_PROGRESS` | Command began but has no durable outcome yet | Blocked; review first |
| `COMPLETED` | Command and result completed | Original result returns with `idempotentReplay: true` |
| `FAILED_REVIEW_REQUIRED` | Command threw and may have partially written | Blocked; review first |
| `RESOLVED_NO_RETRY` | Founder reviewed and closed the item | Permanently blocked |

Completed records are retained for 30 days, with at most 500 completed records retained to stay within Script Properties quotas. Unresolved recovery evidence is never automatically aged out. Reusing a request ID with a different action, employee or payload fails as a collision.

## Aggregate commit ordering

New multi-sheet aggregates write child rows first and the header last for movements, sales orders, purchase orders and FBA shipments. The header is the visible completion marker. A failure before it leaves no apparently complete aggregate, while the request record retains the allocated ID for finding orphan rows.

For updates, actor, timestamp and reference fields are written before `Status` or `FulfilmentStatus`; the state field is the final commit marker.

## Inventory approval rules

Movement approval re-reads current Approved stock while holding the write lock. Required quantities are aggregated by product. Approval fails if it would make a physical source negative, including when competing drafts try to consume the same units.

Opening balances and virtual sources do not consume tracked stock. Same-source/destination movements have no ordinary net consumption. A stock count fails approval when calculated stock changed after the count was recorded; a fresh count is required.

## Validation added

- recognized products and movement endpoints;
- positive finite movement/order/shipment quantities;
- non-negative finite physical counts;
- optional manufacturing/expiry dates in `YYYY-MM-DD`, with expiry not before manufacture;
- active PO suppliers, non-negative PO rates and valid FBA destinations;
- Draft-only movement approval and Pending-only stock-count approval.

## Manual recovery procedure

The following functions are Apps Script-editor utilities, not web API routes:

1. Run `listWriteRecoveryRecords()`.
2. Inspect the action, target reference, ID checkpoints and error.
3. Compare those IDs against related header/line sheets and Change/Audit logs.
4. Repair or remove only confirmed partial rows.
5. Use `resolveWriteRecoveryRecord(requestId, notes, true)` only when the original request should be retried.
6. Use `resolveWriteRecoveryRecord(requestId, notes, false)` when the outcome is correct or must remain cancelled.

Never clear a marker merely to hide an error. Preserve resolution notes and evidence.

## Phase 2 safe health diagnostic

`auditPhase2SystemHealth()` is an owner-run Apps Script-editor function and is not exposed through the web API. It returns and logs:

- unresolved recovery request ID, action, state, target reference, timestamps and checkpoints;
- a safe category for the recovery error instead of the raw message;
- unresolved operational error ID, request ID, action, timestamp and safe category;
- whether an operational error is correlated to an unresolved recovery request.

It deliberately omits employee identity, request payloads, payload fingerprints, raw error messages, stack traces, URLs, file/folder IDs and configuration values. Run it for diagnosis only. It does not resolve, delete, retry or alter any recovery/error record.

## Remaining limitation

Google Sheets has no multi-sheet transactions. Locking, commit ordering and recovery records are compensating controls, not native atomic transactions. A future database should replace them with transactions and unique constraints.
