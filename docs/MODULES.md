# Modules and Scope

## Module map

| Module | Purpose | Initial priority |
| --- | --- | --- |
| Access and staff | PIN login, sessions, roles, deactivation, audit | Foundation |
| Product master | Products, SKUs, combos/BOMs, identifiers, operational attributes | Core |
| Warehouse inventory | Receipts, transfers, dispatch, returns, damage, samples, counts | Core |
| Amazon FBA inventory | Shipments, transit, FC receipts, FC balances, reconciliation | Core |
| Purchasing operations | Supplier/PO status and goods receipt, excluding payables/accounts | Core |
| Amazon marketplace | Listings, content, issues, cases, promotions, fulfilment and operational tasks; no sales accounts | Later |
| FirstCry/marketplaces | Listings, fulfilment/order issues, catalog and operational tasks; no sales accounts | Later |
| Website operations | Catalog, content, promotions, issues and release tracking | Later |
| Social media | Calendar, briefs, assets, approvals, publishing, results | Later |
| Collaborations | Creators/partners, deliverables, samples, approvals, status | Later |
| Work management | Tasks, owners, due dates, checklists, evidence, approvals, alerts | Later |
| Documents and audit | Private evidence, reports, change history, exception history | Cross-cutting |

## Core inventory capabilities

- Receive goods into an explicit location.
- Transfer between locations.
- Dispatch or consume stock for an authorized business reason.
- Record customer/marketplace returns and disposition.
- Record damage, samples, promotional use, and adjustments with reason/evidence.
- Assemble and disassemble combos according to a versioned BOM.
- Count stock and approve variances.
- Prevent invalid products, locations, quantities, batch/expiry values, and negative stock.
- Show stock by product, location, batch where applicable, and status.

## Amazon FBA capabilities

- Create a shipment with Amazon shipment/reference identifiers.
- Link outbound stock movements to the shipment.
- Move dispatched quantity into `FBA_TRANSIT`.
- Record receipt at the actual Amazon FC and date.
- Support partial/multiple FC receipts when Amazon splits a shipment.
- Reconcile sent, received, excess, short, damaged, lost, and returned quantities.
- Import snapshots without treating them as unexplained stock movements.
- Show stale-data warnings and unresolved transit exceptions.

## Operational activity pattern

Website, marketplace, social, collaboration, and future modules should reuse a common pattern where possible:

- activity type;
- business channel/module;
- title and description;
- owner and collaborators;
- status and priority;
- start/due/completed dates;
- related product/campaign/order/shipment;
- checklist and approval;
- private evidence/attachments;
- comments and audit history;
- result or outcome metrics.

Reuse must not erase domain-specific rules. For example, publishing a social post and receiving FBA stock are not the same approval operation.

## Excluded module behavior

Do not add screens or tables for daily expenses, daily sales/revenue books, receipts or collections, cash received/paid, cash flow, bookkeeping, payment posting, bank reconciliation, GST filing, payroll, customer balances, supplier balances, profit-and-loss, or balance sheet. Order references, quantities, fulfilment state, dispatch and returns are allowed only where needed for inventory or marketplace operations. Purchase prices and inventory valuation are permitted only as operational inputs and estimates.
