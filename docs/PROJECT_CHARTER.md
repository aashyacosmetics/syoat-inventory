# Project Charter

## Vision

Create one dependable Syoat ERP portal through which owners and existing employees perform and monitor the operational work of the D2C business.

The portal should replace scattered operational tracking with consistent workflows, permissions, approvals, documents, alerts, and audit history. It is not intended to replace accounting software.

## Primary outcomes

- One role-aware dashboard for daily business operations.
- Accurate stock visibility across the main warehouse, operational locations, FBA transit, and individual Amazon fulfilment centres.
- Traceable movement of goods from purchase or production through dispatch, marketplace receipt, returns, damage, samples, and adjustments.
- Organized Amazon, FirstCry, website, social-media, and collaboration activities.
- Clear ownership, status, deadlines, evidence, and approvals for work.
- A durable history of who performed or approved each material action.

## Users

Only staff already authorized by the owner may use the system. There is no customer access, vendor portal, public registration, or employee self-service account creation.

The role names come from the existing Staff and `App_Logins` sheets. The current local backend capability matrix is documented in `ROLE_CAPABILITIES.md`; role behavior must never be inferred only from frontend labels.

## In scope

- Product and combo master data
- Warehouse and location-based inventory
- Goods receipt and internal stock movements
- Counts, adjustments, damage, returns, and samples
- Purchase and supplier operations needed to move goods, excluding accounting
- Amazon FBA shipment, transit, FC receipt, FC inventory, and reconciliation
- Amazon marketplace operational activities
- FirstCry and other marketplace operational activities
- Website content, catalog, promotion, and issue tracking
- Social-media planning, production, publishing, and performance workflow
- Collaborations, creators, deliverables, samples, and approval tracking
- Tasks, checklists, evidence, documents, alerts, and audit history
- Operational reports and dashboards

## Explicitly out of scope

- Daily expense entry and expense ledgers
- Daily sales/revenue books, sales accounting, receipts, and collections
- Cash received, cash paid, petty cash, and cash-flow tracking
- General ledger and journal entries
- Accounts payable or receivable ledgers
- Bank, cash, or payment reconciliation
- Tax filing, GST accounting, payroll, and statutory accounts
- Profit-and-loss, balance sheet, or accountant workflow
- Public user registration or employee-created accounts

Order/channel references, quantities, fulfilment status, dispatch, cancellations, and returns may exist when required for inventory and marketplace operations. They must not become a daily sales account, revenue ledger, receipt/collection record, or cash-flow system. Procurement references and estimated inventory values may exist for operational decisions but are not authoritative accounting records.

## Principles

1. Correctness before feature count.
2. Secure access before broader adoption.
3. One business event should have one authoritative record.
4. Automations must remain explainable and reversible.
5. Users should see only the modules and actions needed for their role.
6. The spreadsheet backend may support the early system, but the frontend and business rules must not prevent a later database migration.

## Success criteria

- No unauthenticated business data is available through the API.
- No PIN or session secret leaks through URLs, logs, source code, or persistent browser storage.
- No approved workflow can silently create impossible or negative inventory.
- FBA transit and FC receipts reconcile to a clear shipment history.
- Every material write has actor, timestamp, request ID, before/after context, and outcome.
- Founders can determine current work and business exceptions from one portal.
