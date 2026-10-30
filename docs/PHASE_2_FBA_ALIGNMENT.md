# Phase 2 FBA Alignment

Status: dispatch-picker and safe report-import candidate implemented locally; owner authorized a controlled direct-live rollout on 2026-10-27.

## Purpose

Align the existing warehouse dispatch, FBA transit, Amazon receipt and report-upload records without silently replacing shipment history or expanding Phase 2 into the full fulfilment-centre lifecycle planned for Phase 3.

## Verified production baseline — 2026-10-27

The figures below were calculated from bounded, read-only production Sheet reads. No workbook cell, Drive file, Apps Script deployment or GitHub file was changed.

| Evidence | Verified result |
| --- | ---: |
| Movement headers | 388 |
| Movement lines | 688 |
| FBA Dispatch movements | 26 total: 24 Approved, 2 Rejected |
| Approved FBA Dispatch quantity | 4,516 units |
| Dispatches linked to an FBA shipment | 0 |
| FBA Receipt movements | 0 |
| FBA shipment headers/lines | Header rows only; no shipment records |
| Current calculated FBA transit | 4,516 units |
| Latest FBA snapshot | Report date 2026-10-21; 36 product/FC rows; 1,701 sellable units |
| Approved FBA-ledger adjustment movements | 29 across six report dates |

The exact equality between approved dispatch quantity and FBA transit confirms that every historical dispatch remains in transit because no FBA Receipt movement has ever cleared it. The latest report upload separately forced aggregate `AMAZON_FBA` balances to match the report through approved stock-adjustment movements. The two histories therefore do not explain one another.

## Confirmed implementation gaps

1. `FBA Dispatch` correctly moves stock from `MAIN_WH` to `FBA_TRANSIT`, but no production dispatch is linked to a shipment record.
2. No `FBA Receipt` movement moves accepted units from `FBA_TRANSIT` to `AMAZON_FBA`.
3. `FBA_Shipments` and `FBA_Shipment_Lines` are unused even though shipment APIs and UI already exist.
4. `createFbaReconciliation()` says it creates pending stock counts, but the implementation creates a Stock Adjustment and immediately approves it with the same employee, then writes an already-approved count row.
5. Report reconciliation uses `SUPPLIER -> AMAZON_FBA` for positive differences and `AMAZON_FBA -> DAMAGE` for negative differences. This forces the snapshot total but does not explain receipt from transit, sales, removal, damage or loss.
6. Re-upload protection is browser-local for one legacy import component. The active backend does not enforce a report checksum or unique import key before appending snapshots and adjustments.
7. The active frontend stores its latest-ledger display in browser `localStorage`; a new browser can say no ledger was uploaded even when backend snapshots exist.
8. The parser must be tested against a sanitized real Summary report. If the report contains multiple dates for the same ASIN/FC, summing every ending-balance row would overstate current stock; only the latest ending balance per ASIN/FC is valid.

## Agreed Phase 2 bridge

Phase 2 will preserve the aggregate `AMAZON_FBA` location. It will not create individual FC stock locations or automate FC splits yet.

The controlled chain is:

```text
FBA shipment plan
    -> Approved FBA Dispatch: MAIN_WH -> FBA_TRANSIT
    -> Approved FBA Receipt: FBA_TRANSIT -> AMAZON_FBA
    -> Amazon report snapshot: read-only evidence and exception comparison
    -> Reviewed stock count/adjustment only for a remaining explained variance
```

Rules:

- Every new FBA Dispatch must reference one open shipment.
- A shipment cannot be marked Received merely by changing its status; accepted quantity must be supported by one or more approved FBA Receipt movements.
- Receipt quantity cannot exceed the linked approved dispatch quantity for the product.
- Partial receipt remains in transit. Short, lost, damaged or excess quantity is an explicit exception with reason and evidence.
- Report upload archives the private source file and stores an idempotent snapshot/import record.
- Report upload does not auto-approve a stock adjustment and does not use `SUPPLIER` to hide an unexplained positive difference.
- A report variance first compares the snapshot with movement-derived Amazon stock and linked open transit.
- Any corrective count remains Pending for a different authorized approver. Maker-checker, PIN reconfirmation, lock, request ID, audit and recovery controls remain mandatory.
- Historical approved records are not edited or deleted. Remediation is a later reviewed, dry-run Work Package 9 migration.

## Implementation sequence

1. Add tests for the verified empty-shipment/no-receipt baseline and the unsafe auto-approval behavior.
2. Add a server-side report import key/checksum and reject duplicate report processing.
3. Change report processing to archive + snapshot + exception preview; create Pending counts only after explicit review.
4. Make the latest upload/freshness state come from backend snapshots rather than browser-local state.
5. Connect new dispatches to open shipment records and show remaining planned quantity.
6. Connect receipts to the same shipment and validate against dispatched/previously received quantity.
7. Add read-only exceptions for unlinked dispatch, overdue transit, over-receipt, report variance and unmapped ASIN/FNSKU.
8. Run the complete chain against sanitized local fixtures, prepare an exact backup/deployment/rollback sequence, and obtain owner approval before any production migration. Staging is excluded under D-022.

## Local candidate implemented — 2026-10-27

- Warehouse and Warehouse Operator roles receive only the approved minimal open-shipment picker.
- New FBA Dispatch drafts require one open plan; creation and approval validate destination and remaining product quantities.
- Report parsing uses only the newest date's ending balance while retaining customer shipments as a period flow, preventing multi-date balance multiplication.
- Latest report/freshness display is rebuilt from authenticated backend snapshots instead of browser `localStorage`.
- A report date can be imported only once. The raw report contributes to a server-side import fingerprint, snapshot rows are checkpointed, and partial writes enter normal recovery handling.
- Import creates Pending `FBA Report Variance Review` rows only. It creates no stock movement, performs no approval, and these review rows are blocked from the generic stock-count approval path until shipment/receipt/exception evidence is reviewed.
- The 2026-10-28 local review candidate replaces generic approve/edit/reject controls with one Manager-level `Review FBA Variance` action. It records sale timing, receipt, damage/loss, removal order or unexplained plus an evidence note, while keeping the row Pending and leaving stock unchanged.
- Amazon Analytics derives drift from the newest immutable report batch rather than all historical reconciliation counts. For the current 2026-10-26 upload, the correct absolute drift is 444 units.
- Automated verification passes locally. On 2026-10-27 the owner explicitly overrode the staging requirement for this package and authorized a controlled direct-live rollout. Backend must be released before frontend, and staff report uploads remain paused until immediate live verification passes.

## Owner access decision — confirmed 2026-10-27

Warehouse Operators may see a minimal open-shipment picker while recording an FBA Dispatch. It is limited to shipment ID, destination, status, expected product and remaining quantities. It does not grant the full Amazon module, creator identity, notes, files or reconciliation access. Backend capability enforcement remains authoritative.

## Historical remediation boundary

The 24 approved historical dispatches, 4,516 transit units and 29 report adjustments require a separate exception-by-exception dry run. They must not be bulk-linked, received, reversed or adjusted based only on dates or matching totals. Amazon shipment references, receipts and report evidence must be reviewed first.
