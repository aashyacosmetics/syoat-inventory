# Phase 2 Historical FBA Shipment Linking

Status: local implementation and complete sanitized rehearsal passed on 2026-11-03. Production apply is disabled and not authorized.

## Scope

This migration links the reviewed historical FBA dispatch evidence without changing inventory history. It may create only:

- 23 `FBA_Shipments` headers (`SHIP-002` through `SHIP-024`);
- 74 `FBA_Shipment_Lines` rows;
- 23 `Movement_Headers.AmazonShipmentID` links.

It never changes an approved movement's `ReferenceNumber` or `Status`, creates no FBA Receipt or Stock Adjustment, and has a predicted stock delta of zero. Existing `SHIP-001` / `MOV-379` remains a required control and is not recreated.

## Reviewed evidence preserved

The fixed manifest is `FBA-HISTORICAL-LINKING-2026-10-31-V1`. Its local fingerprint is:

`HxPsx4xnjb2SO1wSTwapJ9onqiaoP5QXi4FakR2AXiY`

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
- Any changed source movement, conflicting shipment ID/reference, unexpected shipment line or alternate movement link stops the batch before a business write.
- Live apply requires the exact manifest fingerprint in the request, the exact `APPLY:<fingerprint>` confirmation and Script Property `SYOAT_HISTORICAL_FBA_LINKING_APPROVED_FINGERPRINT` set to that fingerprint.
- The enable property is intentionally absent by default. Do not set it without a separate owner decision, current backup and final production preflight.

## Complete local rehearsal result

Command:

```powershell
npm run rehearse:fba-history
```

The 2026-11-03 sanitized in-memory rehearsal produced:

| Check | Result |
| --- | ---: |
| Initial proposed business mutations | 120 |
| Shipment headers | 23 |
| Shipment lines | 74 |
| Movement links | 23 |
| Reference corrections | 3 |
| Closed-shipment variances preserved | 3 |
| Apply batches | 5 (maximum 5 shipments each) |
| Post-apply proposed mutations | 0 |
| Second-pass mutations | 0 |
| Movement lines changed | No |
| Approved ReferenceNumbers changed | No |
| Movement statuses changed | No |
| Stock delta | 0 |
| Production contacted | No |
| Production mutated | No |

Repository-wide verification passed on 2026-11-03: 83/83 tests, both active JavaScript syntax checks, the 52-action API catalogue, environment isolation and `git diff --check`. These checks must still pass again immediately before any future owner-authorized deployment or live migration.

## Production remains blocked

This local rehearsal does not authorize a live run. Before production apply, the owner must separately approve:

1. a current workbook backup and restore/recovery sequence;
2. a fresh Founder dry-run with zero conflicts and the same manifest fingerprint;
3. the exact five bounded request IDs/batches;
4. setting and later removing the enable Script Property;
5. immediate row-count, link, reference, status, stock and recovery verification.

Stop on any fingerprint difference, conflict, failed/recovery-required request, unexpected stock delta or mismatch with this record.
