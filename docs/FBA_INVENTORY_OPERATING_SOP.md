# FBA Inventory Operating SOP

Status: Phase 2 production operating procedure and staff-training baseline. It does not authorize a historical migration, generic count approval or unexplained stock correction.

Last reviewed: 2026-11-16

## 1. Accuracy objective

Syoat maintains three different inventory positions. They must never be added, replaced or corrected as though they were the same location.

| Position | Meaning | Target | Authoritative evidence |
| --- | --- | ---: | --- |
| `MAIN_WH` | Units physically held in Syoat's warehouse | 100% | Current physical count reconciled to Approved ERP movements |
| `FBA_TRANSIT` | Sellable Syoat units physically handed to the courier but not yet accepted by Amazon | 100% | Approved linked FBA Dispatch less Approved linked FBA Receipt and reviewed exceptions |
| `AMAZON_FBA` | Syoat units held by Amazon | 95-99% against a recent report; 100% against the same dated evidence after explained timing items | Amazon Inventory Ledger ending balance for one report date, with later activity kept outside that comparison |

The percentage target is not permission to hide differences. Every difference is either explained and time-bounded or remains visible as an unresolved exception.

## 2. Product identity and scope

Map report rows in this order:

1. exact FNSKU;
2. exact Amazon ASIN;
3. the active Syoat ERP Product ID/SKU already linked to those identifiers.

Do not map by a similar product name, pack description or quantity.

The following items never enter Syoat inventory reconciliation:

- Avee products, even when a legacy ASIN, FNSKU or title appears in an Amazon file;
- Wooden Combs, Bath Loofahs or another `ItemType=Freebie` as an Amazon sellable shipment line;
- an unknown ASIN/FNSKU until the owner confirms its identity.

Avee remains external historical evidence only. Freebies are optional manual warehouse consumption recorded through a separate linked Samples movement when actually packed.

## 3. The staff workflow

### Two operating clocks

The system has two independent input schedules:

1. **Continuous daily events:** warehouse receipts, website/marketplace dispatches, cancellations, returns, damage, samples, combo assembly, physical FBA handover and Amazon located/receipt evidence are recorded on the day the operational event happens.
2. **Irregular FBA snapshots:** the Amazon Inventory Ledger is normally uploaded weekly, often Monday or Tuesday, but its schedule is not guaranteed. The file is a dated observation of Amazon stock, not a list of today's warehouse movements.

Never delay or backdate a daily movement while waiting for the FBA file. Never use a later FBA upload to overwrite daily movements already recorded between its report cutoff and upload time.

For every external marketplace event retain:

| Required field | Purpose |
| --- | --- |
| Platform/channel | Website, Flipkart, FirstCry, JioMart, Myntra, Amazon FBA or another approved channel |
| External order/shipment reference | Trace the source record and reject duplicates |
| Exact ERP Product ID/SKU | Prevent title-based product matching |
| Quantity | Whole units affected by the event |
| External event/status | Dispatch, delivery, cancellation, return or exception |
| Event date/time | The operational date, independent of report upload time |
| Idempotency key | Normally channel + external reference + event type + product; prevents a repeated report from moving stock twice |

### Daily warehouse-fulfilled marketplace flow

For the website, Flipkart, FirstCry, JioMart, Myntra and another warehouse-fulfilled channel:

1. Record the channel and exact external order reference.
2. Before dispatch, a cancellation releases any reservation and has no physical dispatch effect.
3. At physical courier handover, record the warehouse dispatch once: `MAIN_WH` decreases and the appropriate channel-transit position increases.
4. Delivery closes that channel-transit quantity as fulfilled/consumed; it does not decrease `MAIN_WH` a second time.
5. A return enters the returns/inspection position only when physically received. After inspection, an approved disposition moves it to sellable Warehouse, damage, samples or disposal.
6. Re-uploaded channel reports may update status evidence but must not repeat an already recorded stock event.

These daily movements continue normally even when no FBA Inventory Ledger has been uploaded that week.

### Step A - Create the Amazon shipment plan

Responsible: Founder, Co-Founder or Warehouse Manager.

1. Create the shipment in Seller Central.
2. In ERP, open **Amazon -> Shipments -> New Shipment**.
3. Enter the exact Amazon shipment/reference ID once.
4. Enter the exact destination FC.
5. Enter only sellable Syoat products and planned quantities.
6. Keep the ERP shipment **Working** while it is only planned or packed.

Stock effect: none.

### Step B - Pack and physically hand over to the courier

Responsible: Warehouse Operator; approval by an authorized different staff member.

1. Verify the Amazon reference, destination FC and product quantities against the packages.
2. Record carrier/AWB evidence when available.
3. Only after physical courier handover, open **Record Movement -> Ship Orders -> Send to Amazon FBA**.
4. Select the existing open ERP shipment. Do not type or create a second shipment for the same Amazon reference.
5. Enter the actual sellable quantities handed over. They must not exceed the plan's remaining quantities.
6. Under **Optional Manual Freebies**, enter only the Wooden Comb, Bath Loofah or other active Freebie quantity physically packed. Leave it empty when none was packed.
7. Submit the draft and obtain maker-checker approval.

Approved sellable dispatch effect:

- `MAIN_WH` decreases;
- `FBA_TRANSIT` increases by exactly the same quantity;
- `AMAZON_FBA` does not change.

Approved linked freebie effect:

- `MAIN_WH` decreases;
- `SAMPLES` increases;
- `FBA_TRANSIT` and `AMAZON_FBA` do not change.

### Step C - Record Amazon receipt

Responsible: Founder, Co-Founder or Warehouse Manager; maker-checker approval still applies.

Use Amazon shipment **Contents/Shipment events** evidence, not only a shipment status label.

1. Find the exact Amazon shipment/reference and destination FC.
2. Read the product-level **units located/received** quantity.
3. For each product calculate:

   `new receipt = Amazon cumulative located - ERP cumulative Approved receipt`

4. If the result is positive, create one FBA Receipt for only that new quantity.
5. In production backend `3.2-phase2-fba-transit-clearance.1`, select **Dispatched FBA Shipment**. The ERP fills the internal shipment ID, exact Amazon reference and destination FC; staff enter only the newly located product quantities shown as outstanding.
6. Submit the linked receipt draft for maker-checker approval. The backend rechecks the latest dispatched-not-received balance while holding the approval lock, so an overlapping or stale receipt is rejected rather than double-counted.
7. Partial receipt is valid. Leave the remaining quantity in `FBA_TRANSIT`.
8. Do not receive an Avee line or a freebie line into Syoat FBA stock.
9. Mark the shipment Received only when every sellable Syoat line has a final accepted quantity and every shortage/excess is separately classified.

Approved receipt effect:

- `FBA_TRANSIT` decreases;
- internal `FBA_ACCEPTED` records the linked acceptance evidence but holds no stock and is not displayed as an inventory location or quantity;
- `AMAZON_FBA` does not change and remains equal to the latest reviewed dated Inventory Ledger snapshot;
- `MAIN_WH` does not change.

This is the permanent Phase 2 flow for every shipment, including future high-volume use. Never treat Amazon located/accepted evidence as an addition to the ERP Amazon FBA balance. The acceptance event closes Transit only; the next controlled Inventory Ledger upload independently refreshes Amazon FBA.

### Step D - Handle shortage, excess, damage and removals

| Evidence | Classification | ERP action |
| --- | --- | --- |
| Located quantity is still increasing and shipment is Receiving | Receipt timing | Keep the unlocated balance in Transit; review again later |
| Amazon final located quantity is below dispatch | Shortage/loss | Preserve the remaining Transit exception and record case/evidence; do not silently receive it |
| Amazon located quantity exceeds linked dispatch | Excess | Hold as an exception until product identity and source are proven; do not invent warehouse stock |
| Amazon shows damaged/expired/unfulfillable | Damage or loss | Record a separate evidence-backed FBA exception movement only through an approved resolution workflow |
| Amazon removal order | Removal order | Track the removal reference; move to warehouse/returns only when physically received, or to the reviewed loss/disposal destination when Amazon confirms final disposal |
| No reliable evidence | Unexplained | Leave unresolved; no stock write |

### Step E - Upload the dated Amazon Inventory Ledger

Responsible: Founder, Co-Founder, Admin, Manager or Warehouse Manager.

1. Download **Reports -> Fulfilment -> Inventory Ledger -> Summary**.
2. Select one complete report date. Do not mix dates. The report cutoff date may be earlier than the upload date.
3. Upload the original CSV/TXT once. Record both the Amazon report cutoff and the ERP upload timestamp.
4. Confirm the preview excludes Avee and contains only active Syoat mappings.
5. Confirm the report date and product totals before creating the review rows.
6. The upload creates Pending FBA variance reviews. It does not change stock.

Do not compare the report ending balance with today's live Seller Central number without accounting for the days between them. Do not compare the snapshot with daily movements occurring after its cutoff.

### Step F - Review the Pending FBA variance

For each row, compare the same product and same cutoff date across:

- ERP `AMAZON_FBA` movement balance;
- Amazon Inventory Ledger ending sellable balance;
- linked shipment receipts accepted up to that cutoff;
- customer shipments after the prior snapshot;
- removals, returns, damage and disposal evidence.

Use **Review FBA Variance** to save one classification and a specific reference/note. This action does not approve the count or change stock.

Never use a generic Stock Count approval for an imported FBA variance.

## 4. Daily and weekly controls

### Warehouse - daily 100% control

- Record every receipt, dispatch, return, damage, sample and combo assembly on the day it physically occurs.
- Review all Draft/Pending movements before day close.
- Count fast-moving products daily and complete a full scheduled cycle count.
- A warehouse difference must be zero or have an approved correction with evidence.

### Transit - shipment-event 100% control

- Every unit in Transit must belong to one Approved linked dispatch.
- Every Amazon located unit must belong to one Approved linked receipt.
- Review open shipments daily.
- Transit aging starts at physical courier handover, not plan creation.
- A shipment is closed only after accepted, shortage, excess and exception quantities add back to its dispatched quantity.

Reconciliation formula for each product/shipment:

`dispatched = received + open transit + shortage/loss exception + other resolved exception`

### Amazon FBA - dated 95-99% operating control

- Upload the Inventory Ledger when the weekly file is available, commonly Monday or Tuesday, and always retain its report cutoff and upload timestamp. A missed or shifted upload day must be visible as snapshot age, not repaired by backdating.
- Compare ERP and Amazon at that report cutoff.
- A current API/dashboard figure may be newer and include reserved, unfulfillable and inbound states; show those separately.
- Expected 1-2 day timing differences must have a date and cause. They are reviewed on the next report and must not become permanent unexplained drift.

Snapshot comparison window:

`previous report cutoff < daily Amazon/FBA evidence <= current report cutoff`

Daily warehouse and marketplace events outside that window remain in the movement ledger and are never consumed or replaced by the snapshot.

## 5. Current Phase 2 position

The reviewed shipment PDF shows many historical shipment plans with complete dispatched quantities but no linked receipt quantities. A status label therefore cannot be used as a stock event.

The first genuine current-chain acceptance is complete. `SHIP-001` / `FBA15MRFBLH8` at `BOM5` is linked to Approved dispatch `MOV-379` and Approved receipt `MOV-456`. The receipt clears 98 shampoo plus 140 lip-balm units (238 total) from Transit, creates no Amazon FBA addition, and is traceable through shipment lines, movement lines and the audit trail. This is the production example staff should follow.

The shipment was manually marked Received before its receipt evidence was approved. Although the final records now balance, this chronology is a known workflow gap and must not be repeated.

The 4,516-unit table below is the read-only historical baseline captured before the 238-unit `MOV-456` clearance. It is retained for audit context and must not be treated as the current Transit total:

| Category | Units | Current treatment |
| --- | ---: | --- |
| Historical Syoat receipt candidates supported by shipment evidence | 3,616 | Non-posting until the snapshot basis is safely replaced |
| Open 140-unit lip-balm receipt | 140 | Keep open until accepted evidence is final |
| Legacy Avee-to-Syoat exception | 40 | Never receive or map to Syoat FBA |
| Historical freebies incorrectly included in Transit | 720 | Separate reviewed correction to the Samples sink; not an FBA receipt |
| **Total** | **4,516** | Fully explained, but not yet posted/cleared |

The 2026-11-12 ledger upload created current review batch `CNT-071` to `CNT-078`. Their combined net difference is -24 units and combined absolute difference is 374 units. They remain Pending evidence and must not be approved as ordinary counts.

The read-only Amazon India inventory API snapshot on 2026-11-15 returned 1,428 Syoat fulfillable, 38 reserved and 2 unfulfillable units, with inbound quantities reported separately. This is newer than the dated ledger and is operational monitoring evidence, not a replacement for the same-date reconciliation.

## 6. High-priority system work still required

### Completed - Shipment-linked FBA Receipt workflow

Production backend `3.2-phase2-fba-transit-clearance.1` and the corrected frontend flow are accepted. The picker shows only shipments with an Approved dispatched-but-not-received balance, auto-fills the internal shipment ID, Amazon reference and destination FC, restricts products/quantities to that balance, supports partial receipts and revalidates under the approval lock. `MOV-456` proves that approval clears Transit to the virtual acceptance-evidence endpoint and leaves snapshot-derived Amazon FBA unchanged.

### Completed - Status automation and closure equation

Backend `3.2-phase2-fba-status-closure.1` and frontend `20261117-fba-status-closure.1` implement the receipt-only closure rule and were owner-released on 2026-11-17. No Approved dispatch means `Working`; Approved dispatch without receipt means `In Transit`; any partial Approved receipt means `Receiving`; and `Received` requires the complete shipment plan to be dispatched and every dispatched unit to have Approved FBA Receipt evidence. Staff cannot manually skip or advance the lifecycle. Approval, reversal, correction linking and unlinking resynchronize the stored status and audit the change.

### P0-2 local candidate - Evidence-backed FBA variance resolution

The existing Review action classifies evidence only. The prepared resolution action requires a different authorized Amazon manager to check an evidence reference and note, then closes the evidence row as `Resolved` or `Superseded`. `Unexplained` rows remain open and stale reviews fail closed. Resolution is deliberately non-posting: it creates no receipt, adjustment or stock delta. A genuine receipt, damage/loss, removal or other correction must be recorded separately through the applicable controlled movement workflow.

### P0 - Historical canonical-ledger migration

Prepare one non-posting, same-date migration manifest that:

1. posts only the reviewed historical Syoat receipt candidates;
2. compensates/replaces the 29 legacy snapshot adjustments without deleting history or double counting;
3. applies the separate 720-unit freebie correction;
4. keeps the 140 open lip balms open;
5. excludes the 40-unit Avee exception;
6. proves per-product Warehouse, Transit and FBA before/after totals and zero unexplained creation.

Execution requires an owner-approved backup, dry run, protected code review, disabled-by-default idempotent batches, maker-checker approval and immediate reconciliation.

### P1 - Same-date snapshot replacement

When the same report date is uploaded again before any reviews are resolved, replace/supersede that report batch safely rather than stacking duplicate evidence. Never add multiple snapshot variances together.

## 7. Staff teaching checklist

Ask staff to repeat these five rules before live use:

1. **Plan does not move stock.**
2. **Courier handover creates Dispatch: Warehouse down, Transit up.**
3. **Amazon units located creates Receipt: Transit down only; no accepted-stock balance is displayed and FBA does not increase.**
4. **The dated Inventory Ledger upload independently controls the Amazon FBA quantity.**
5. **Avee and freebies never enter Syoat sellable FBA stock.**
