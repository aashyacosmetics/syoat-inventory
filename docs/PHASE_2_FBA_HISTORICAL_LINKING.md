# Phase 2 Historical FBA Shipment Linking

Status: Manifest V2 local implementation and complete sanitized rehearsal passed on 2026-11-11. Production apply remains disabled and is not authorized.

## Why V2 was required

The Founder live read-only V1 dry run found 28 conflicts. The reviewed historical IDs `SHIP-002` through `SHIP-024` collided with new legitimate production shipments, `SHIP-001` had a blank dedicated Amazon reference, and three destination FC values differed only in punctuation or spacing (`PNQ-3`, `HYD- 3`, `DEL-5`). No live write was attempted.

V2 resolves those findings without changing current shipments:

- historical headers use reserved IDs `HSHIP-001` through `HSHIP-023`;
- the normal `nextID("SHIP")` allocator ignores the `HSHIP-` namespace;
- existing current `SHIP-002`, `SHIP-003` and `SHIP-004` headers and lines are preserved byte-for-byte by the rehearsal;
- FC comparisons normalize case, spaces and punctuation while retaining canonical manifest values;
- an empty `SHIP-001.AmazonReferenceID` may be backfilled to `FBA15MRFBLH8` only when the approved control movement `MOV-379` is still linked to `SHIP-001`;
- a different non-empty control reference fails closed and is never overwritten.

## Scope

The migration may create or update only:

- 23 `FBA_Shipments` historical headers (`HSHIP-001` through `HSHIP-023`);
- 74 `FBA_Shipment_Lines` rows;
- 23 empty `Movement_Headers.AmazonShipmentID` links;
- one verified blank `SHIP-001.AmazonReferenceID` control-field backfill.

It never changes an approved movement's `ReferenceNumber`, `Status` or movement lines, creates no FBA Receipt or Stock Adjustment, and has a predicted stock delta of zero. Linking therefore does not reduce the current Transit balance; Transit reconciliation is a later, separately reviewed stock-movement task.

## Reviewed evidence preserved

The fixed manifest is `FBA-HISTORICAL-LINKING-2026-11-11-V2`. Its local fingerprint is:

`CkmH6DlbbI5QRNdSFKZsFfLsJN0ZLGt3dcqD-_Ti9aw`

The three external-reference corrections are stored only in `FBA_Shipments.AmazonReferenceID`:

| Movement | Preserved approved reference | Shipment Amazon reference |
| --- | --- | --- |
| `MOV-125` | `FBA15M322THO` | `FBA15M322TH0` |
| `MOV-216` | `FBA15M73P19` | `FBA15M7J3P19` |
| `MOV-225` | `FBA15M8SZTON` | `FBA15M8SZT0N` |

The three closed-shipment differences remain classifications only:

| Movement | Expected | Located | Difference | Treatment |
| --- | ---: | ---: | ---: | --- |
| `MOV-088` | 62 | 24 | -38 | Receipt shortage; no automatic correction |
| `MOV-102` | 165 | 205 | +40 | Receipt excess; no automatic correction |
| `MOV-108` | 235 | 236 | +1 | Receipt excess; no automatic correction |

All newly created historical shipment headers remain `In Transit`. Amazon Closed or Receiving evidence does not substitute for an approved FBA Receipt movement.

## Commands and safety gates

- `getHistoricalFbaLinkingDryRun` is an authenticated, Founder-only, read-only preflight.
- `applyHistoricalFbaShipmentLinks` is an authenticated, Founder-only business write.
- Apply runs through the existing script lock, durable request ID, payload fingerprint, checkpoint and recovery framework.
- Apply accepts at most five manifest entries per request.
- Repeating a completed request ID replays its stored result. Re-running a batch with a new request ID is a state-based no-op when all rows and links already match.
- Any changed source movement, conflicting shipment ID/reference, unexpected shipment line, alternate movement link or different control reference stops the batch before a business write.
- Live apply requires the exact manifest fingerprint in the request, the exact `APPLY:<fingerprint>` confirmation and Script Property `SYOAT_HISTORICAL_FBA_LINKING_APPROVED_FINGERPRINT` set to that fingerprint.
- The enable property is intentionally absent by default. Do not set it without a separate owner decision, current backup and final production preflight.

## Complete local rehearsal result

Command:

```powershell
npm run rehearse:fba-history
```

The 2026-11-11 sanitized in-memory rehearsal produced:

| Check | Result |
| --- | ---: |
| Initial proposed business mutations | 121 |
| Historical shipment headers | 23 |
| Shipment lines | 74 |
| Movement links | 23 |
| Verified control-reference backfill | 1 |
| Reference corrections | 3 |
| Closed-shipment variances preserved | 3 |
| Apply batches | 5 (maximum 5 manifest entries each) |
| Post-apply proposed mutations | 0 |
| Second-pass mutations | 0 |
| Current `SHIP-002` to `SHIP-004` changed | No |
| Current shipment lines changed | No |
| Movement lines changed | No |
| Approved ReferenceNumbers changed | No |
| Movement statuses changed | No |
| Stock delta | 0 |
| Production contacted | No |
| Production mutated | No |

Repository-wide verification passed on 2026-11-11: 84/84 tests (the localhost isolation test passed when rerun with loopback permission), both active JavaScript syntax checks, the 52-action API catalogue and environment isolation. These checks must pass again immediately before any future owner-authorized deployment or live migration.

## Production remains blocked

The current workbook backup is `[BACKUP] Syoat Inventory Before Historical FBA Linking - 2026-11-10`. It was verified against the five migration-sensitive tabs before the V1 live dry run. The backup and this local rehearsal do not authorize a live apply.

Before production apply, the owner must separately approve:

1. deployment of the reviewed V2 `Code.gs` through the protected-source workflow;
2. a fresh Founder dry run returning zero conflicts and the exact V2 fingerprint above;
3. the exact five bounded request IDs/batches;
4. setting and later removing the enable Script Property;
5. immediate row-count, link, reference, status, stock and recovery verification.

Stop on any fingerprint difference, conflict, failed/recovery-required request, unexpected stock delta or mismatch with this record.
