# Phase 2 Non-Posting FBA Receipt and Variance Manifest

Manifest ID: `FBA-RECEIPT-RECON-2026-11-13-V1`

Status: prepared for owner review; **non-posting**

## Safety boundary

This document classifies the current historical FBA shipment evidence. It does not authorize or perform a receipt, shortage, excess, adjustment, shipment-status change, report reconciliation or any other stock write.

| Control | Value |
| --- | --- |
| Apply authorized | `false` |
| Current stock delta | `0` |
| Movement rows to create now | `0` |
| Existing Approved rows to edit | `0` |
| Avee quantities permitted in Syoat inventory | `0` |

The current `AMAZON_FBA` balance already depends entirely on 29 historical report-driven snapshot adjustments. Posting the receipt candidates below without first replacing or compensating that snapshot basis would double count FBA stock. Any future posting requires a current backup, same-date FBA report, reviewed idempotent migration, owner approval and immediate post-write reconciliation.

## Evidence basis

- The 24 linked Approved FBA dispatches total 4,516 units in `FBA_TRANSIT`.
- Linked Amazon shipment lines explain 3,796 sellable units; nine preserved dispatches contain another 720 freebie units not present as Amazon shipment lines.
- Seller Central reports 3,659 located units for those 24 references.
- Product-level Contents evidence is complete for the four non-zero shipment variances.
- D-028 excludes all Avee products from active Syoat inventory.
- Amazon location/acceptance evidence is classification evidence only; it does not independently post ERP stock.

## Controlled reconciliation

### Transit-side reconciliation

| Category | Units | Stock action now | Treatment |
| --- | ---: | ---: | --- |
| Matched Syoat receipt candidates | 3,616 | 0 | Retain as evidence for a later canonical receipt migration. |
| Syoat lip balm still open in Receiving | 140 | 0 | Keep open; do not classify as shortage or receipt. |
| Legacy Avee line recorded historically as Syoat shampoo | 40 | 0 | Keep under FBA-011; never receive, short, excess or adjust it as Syoat. |
| Freebie units absent from Amazon shipment lines | 720 | 0 | D-031 confirms manual warehouse promotional/sample consumption. Keep under FBA-009 until a separate historical correction is designed and approved. |
| **Total current `FBA_TRANSIT` explained** | **4,516** | **0** | `3,616 + 140 + 40 + 720 = 4,516`. |

### Amazon acceptance-side reconciliation

| Category | Units | Stock action now | Treatment |
| --- | ---: | ---: | --- |
| Matched Syoat receipt candidates | 3,616 | 0 | Located against expected active Syoat lines. |
| Syoat excess evidence | 43 | 0 | Preserve separately by shipment and product; do not debit Transit or net against open/legacy quantities. |
| **Total Syoat units located** | **3,659** | **0** | `3,616 + 43 = 3,659`. |
| Final Syoat shortages | **0** | 0 | No closed Syoat product line is short in the reviewed evidence. |
| Open Syoat quantity | **140** | 0 | Lip balm remains Receiving. |
| Avee shortage shown by Amazon | **40** | 0 | External legacy evidence only; excluded from every Syoat calculation. |

## Product-level non-posting manifest

Product IDs are the authoritative ERP identifiers. “Matched receipt candidate” means evidence exists for the expected Syoat quantity; it is not an instruction to post a movement.

| Product ID | Syoat product | Expected Syoat units | Matched receipt candidate | Open | Excess evidence | Posting now |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `PRD-P001` | Syoat Kids 2-in-1 Conditioning Shampoo | 1,621 | 1,621 | 0 | 40 | 0 |
| `PRD-P002` | Syoat Scalp Balance Kids Hair Oil | 436 | 436 | 0 | 0 | 0 |
| `PRD-P003` | Syoat Kids Body Wash | 360 | 360 | 0 | 0 | 0 |
| `PRD-P004` | Syoat Kids Body Lotion | 568 | 568 | 0 | 0 | 0 |
| `PRD-P005` | Syoat Kids Lip Balm | 455 | 315 | **140** | 0 | 0 |
| `PRD-C001` | Syoat Kids 2-in-1 Conditioning Shampoo (Pack of 2) | 126 | 126 | 0 | 1 | 0 |
| `PRD-C002` | Syoat Kids Hair Care Combo | 60 | 60 | 0 | 2 | 0 |
| `PRD-C003` | Active Syoat combo `PRD-C003` | 30 | 30 | 0 | 0 | 0 |
| `PRD-C004` | Active Syoat combo `PRD-C004` | 30 | 30 | 0 | 0 | 0 |
| `PRD-C005` | Active Syoat combo `PRD-C005` | 30 | 30 | 0 | 0 | 0 |
| `PRD-C006` | Syoat Kids Body Wash (Pack of 2) | 20 | 20 | 0 | 0 | 0 |
| `PRD-C007` | Syoat Kids Body Lotion (Pack of 2) | 20 | 20 | 0 | 0 | 0 |
| **Total** |  | **3,756** | **3,616** | **140** | **43** | **0** |

## Shipment-level control manifest

“Freebie excluded” is part of the preserved dispatch but not an Amazon shipment-line receipt. The three product-level excesses are shown separately and are not added to Transit receipts.

| ERP shipment | Amazon reference | Amazon state | Matched Syoat receipt candidate | Open Syoat | Excess Syoat | Avee excluded | Freebie excluded | Posting now |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `HSHIP-001` | `FBA15M13T314` | Closed | 20 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-002` | `FBA15M1B9Z8Y` | Closed | 92 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-003` | `FBA15M1F9NRC` | Closed | 92 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-004` | `FBA15M1QCB2P` | Closed | 56 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-005` | `FBA15M1Z6GTC` | Closed | 22 | 0 | 2 | 40 | 0 | 0 |
| `HSHIP-006` | `FBA15M23FXSW` | Closed | 165 | 0 | 40 | 0 | 0 | 0 |
| `HSHIP-007` | `FBA15M27SQ7H` | Closed | 235 | 0 | 1 | 0 | 72 | 0 |
| `HSHIP-008` | `FBA15M2F1Q18` | Closed | 33 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-009` | `FBA15M322TH0` | Closed | 195 | 0 | 0 | 0 | 36 | 0 |
| `HSHIP-010` | `FBA15M3THR38` | Closed | 164 | 0 | 0 | 0 | 36 | 0 |
| `HSHIP-011` | `FBA15M3QDFV1` | Closed | 135 | 0 | 0 | 0 | 36 | 0 |
| `HSHIP-012` | `FBA15M76ZZ04` | Closed | 159 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-013` | `FBA15M72S6FH` | Closed | 63 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-014` | `FBA15M7TSS2H` | Closed | 98 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-015` | `FBA15M7J3P19` | Closed | 98 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-016` | `FBA15M83W07Q` | Closed | 362 | 0 | 0 | 0 | 152 | 0 |
| `HSHIP-017` | `FBA15M8SZT0N` | Closed | 460 | 0 | 0 | 0 | 152 | 0 |
| `HSHIP-018` | `FBA15M9RVFSQ` | Closed | 286 | 0 | 0 | 0 | 76 | 0 |
| `HSHIP-019` | `FBA15MBD201D` | Closed | 227 | 0 | 0 | 0 | 80 | 0 |
| `HSHIP-020` | `FBA15MD4S73W` | Closed | 290 | 0 | 0 | 0 | 80 | 0 |
| `HSHIP-021` | `FBA15ML9B7SM` | Receiving, all expected located | 50 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-022` | `FBA15MMTYWWB` | Receiving, all expected located | 98 | 0 | 0 | 0 | 0 | 0 |
| `HSHIP-023` | `FBA15MPD5V4M` | Receiving, all expected located | 118 | 0 | 0 | 0 | 0 | 0 |
| `SHIP-001` | `FBA15MRFBLH8` | Receiving | 98 | **140** | 0 | 0 | 0 | 0 |
| **Total** |  |  | **3,616** | **140** | **43** | **40** | **720** | **0** |

## Variance instructions

| Reference | Product/evidence | Classification | Required handling |
| --- | --- | --- | --- |
| `FBA15MRFBLH8` | `PRD-P005` lip balm, 140 expected / 0 located | `OPEN_RECEIVING` | Keep open. Recheck only from later Amazon receipt/status evidence. Do not post shortage. |
| `FBA15M1Z6GTC` | Avee shampoo, 40 expected / 0 located | `EXCLUDED_LEGACY_AVEE` | Preserve external evidence. Do not create or map any Syoat product, receipt, shortage, excess or adjustment. |
| `FBA15M1Z6GTC` | `PRD-C002`, 10 expected / 12 located | `EXCESS_2` | Preserve as Syoat excess evidence; no Transit debit and no adjustment now. |
| `FBA15M23FXSW` | `PRD-P001`, 80 expected / 120 located | `EXCESS_40` | Preserve as Syoat excess evidence; no Transit debit and no adjustment now. |
| `FBA15M27SQ7H` | `PRD-C001`, 24 expected / 25 located | `EXCESS_1` | Preserve as Syoat excess evidence; no Transit debit and no adjustment now. |
| `MOV-088-L001` | 40 units recorded as `PRD-P001`, but Amazon identifies the expected product as Avee | `EXCLUDED_LEGACY_EVIDENCE` | FBA-011 is concluded under D-028 without a mapping treatment. Do not use this row to prove Syoat receipt, shortage or excess and do not edit the Approved row. |

## Avee exclusion rule

No Avee item is part of the active Syoat product master or Syoat inventory calculation. Avee ASINs, FNSKUs and quantities may appear only as immutable historical/external evidence for owner-directed removal handling. They must never be:

- created or reactivated as a Syoat product;
- mapped to a Syoat product ID;
- included in a Syoat FBA receipt, shortage, excess or adjustment;
- netted against a Syoat variance;
- included in Syoat available, Transit, FBA or valuation totals.

Active upload processing enforces this boundary twice: the frontend removes Avee rows before ASIN mapping, preview and FC aggregation, and the backend reparses the original report evidence and removes any Avee-linked submitted product before creating a variance count or FC snapshot. Avee does not appear as an unmapped Syoat action item; only a safe ignored count may be retained in the import response/audit log.

## Conditions before any later posting design

1. Obtain a current backup and a same-date Amazon inventory/receipt report.
2. Resolve the 29 snapshot adjustments so canonical receipts do not double count current FBA stock.
3. Design the FBA-009 historical correction for the 720 manually packed freebies under D-031. The correction must clear their erroneous Transit position to the promotional/sample sink without creating FBA stock or editing Approved history.
4. Preserve the concluded FBA-011 exclusion without changing the Approved movement or reintroducing Avee through any upload/mapping path.
5. Recheck the 140 lip balms; keep them open until Amazon reports a final accepted/short/damaged/removal outcome.
6. Prepare a bounded, idempotent dry run that reports per-product before/after balances and zero unexplained residuals.
7. Obtain separate owner approval before enabling any write.

Until every applicable condition passes, this manifest remains evidence only and its production stock effect is exactly zero.

## Manual freebie rule for new shipments

This receipt manifest does not add a freebie posting, but D-031 fixes the future input rule:

1. The Warehouse Operator chooses the freebie product manually.
2. The Warehouse Operator enters only the quantity physically packed for that shipment.
3. No product, combo, shipment quantity or default rule pre-populates a freebie.
4. A blank/omitted freebie entry means zero.
5. The record must retain the ERP shipment ID and Amazon reference as evidence.
6. The freebie reduces `MAIN_WH` as promotional/sample consumption; it does not enter `FBA_TRANSIT`, an FBA Receipt or Amazon FC stock.
7. The manual freebie consumption and the sellable FBA Dispatch must each be idempotent and auditable so retrying either action cannot consume stock twice.
