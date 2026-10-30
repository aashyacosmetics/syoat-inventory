# Role and Capability Matrix

Status: access-alignment backend `3.1-phase2-wp1.3` and frontend `20261023-access-baseline.1` deployed and verified in production on 2026-10-24.

## Enforcement model

Every business API request follows this order:

1. validate the temporary session;
2. resolve the employee's current role from the Staff sheet;
3. find the action's centrally classified capability;
4. require the role to possess that capability;
5. run the narrower handler rules for ownership, maker-checker, movement type, state and required fields.

Frontend navigation is not authorization. Direct calls still pass through this backend policy.

The active frontend now renders navigation and action controls from the capability list returned by the authenticated session. It does not maintain a separate role-permission matrix.

## Production staff access baseline (owner-confirmed closed 2026-10-30)

Effective ERP access requires the same person to be active in both `Staff` and `App_Logins`. The login email must also match in both sheets. Permissions come from `Staff.Role`; the legacy `CanCreate`, `CanApprove`, `CanReverse`, and `CanViewAll` columns in `App_Logins` are not authoritative in the current application.

The live Staff display-name column is `FullName`. Backend `3.2-phase2-access-schema.1` uses `Staff.FullName` for the picker, authenticated profile, operational evidence filename, and Founder-only mismatch display; legacy `Name` remains a compatibility fallback only.

Owner decision D-021 denies ERP access to Keerthana and Sai Ram while preserving their active Staff records. The owner confirmed the access task closed with matching App Login rows using exact status `Inactive` and blank PIN/hash/salt fields. Backend `3.2-phase2-access-policy.1` treats an explicit `Inactive` or `Archived` login as an intentional denial, while a completely missing login for active Staff remains a health mismatch.

| Staff ID | Name | Staff role | Staff status | App login | Effective access |
| --- | --- | --- | --- | --- | --- |
| STF001 | Lalith Kiran | Founder | Active | Active | Yes |
| STF002 | Keerthana | Co-Founder | Active | Inactive | No |
| STF003 | Dharani | Co-Founder | Active | Active | Yes |
| STF004 | Sravanthi | Operations Manager | Archived | Active | No |
| STF005 | Pushpanjali | Warehouse Manager | Active | Active | Yes |
| STF006 | Zubedha | Warehouse Operator | Active | Active | Yes |
| STF007 | Sai Ram | Accounts | Active | Inactive | No |

Current effective users are Lalith Kiran, Dharani, Pushpanjali, and Zubedha.

Important preservation rules:

- Do not add, remove, activate, archive, or change a staff role without the store owner's decision.
- Update `Staff` and `App_Logins` together when changing access. A one-sheet email change breaks login and audit matching.
- Never store PINs, hashes, salts, or recovery details in project documentation.
- Production filters the picker to the active intersection and reports the Sravanthi mismatch to Founder System Health without exposing email or credential data.

## Live movement-type gates

- Opening Balance: Founder only. Backend `3.1-phase2-wp1.3` aligns the issued UI capability and backend handler with the existing live Founder/Lalith setting.
- Stock In, FBA Dispatch, Returns, Damage, Samples, Website Warehouse Ship, Flipkart, FirstCry, Return Received, Returns to Warehouse, and Returns Damaged: Founder, Co-Founder, Warehouse Manager, and Warehouse Operator.
- FBA Receipt and Website FBA Ship: Founder, Co-Founder, and Warehouse Manager.
- Stock Audit: Founder, Co-Founder, Warehouse Manager, and Accounts.

These feature settings are an additional gate. They do not replace the server-side role capability checks below.

## Current production role summary

| Role | Operational access enforced by the backend |
| --- | --- |
| Founder | All classified operational capabilities |
| Co-Founder | All classified operational capabilities except Opening Balance creation |
| Admin | Common inventory reads; staff; movement/count management; Amazon; fulfilment; manual audit |
| Manager | Common inventory reads; movement/count management; Amazon; fulfilment; manual audit |
| Warehouse Manager | Common inventory reads; movement/count management; Amazon; fulfilment; purchasing view/create; manual audit |
| Operations Manager | Common operational reads; support-ticket view/create/update; manual audit |
| Warehouse | Common operational reads; movement create/edit; fulfilment; purchasing view; manual audit |
| Warehouse Operator | Same central capability group as Warehouse; handler rules and Staff role remain authoritative |
| Accounts | Common operational reads; staff view; stock-count create/edit; manual audit. No daily expenses, sales accounts or cash-flow module. |

## Important narrow rules retained in handlers

- Founder may perform every classified operation. Co-Founder has broad operational access except the Founder-only Opening Balance setup action.
- Purchase-order approval, rejection and close are Founder/Co-Founder only.
- Purchase-order creation is Founder/Co-Founder/Warehouse Manager only.
- FBA shipment unlink is Founder/Co-Founder only.
- Warehouse and Warehouse Operator may read the minimal open-FBA-shipment picker only while recording an authorized FBA Dispatch. This does not grant `amazon.shipments.view` or the Amazon module.
- Support-ticket management is Founder/Co-Founder/Operations Manager only.
- Amazon management is Founder/Co-Founder/Admin/Manager/Warehouse Manager only.
- Imported FBA report variances use the dedicated `amazon.reconciliation.review` capability for Founder/Co-Founder/Admin/Manager/Warehouse Manager. Review records one classification and evidence note only; it does not approve a count or change stock. Generic count approve, edit and reject actions are blocked for these rows.
- Movement and count approval/reversal retain their existing role and maker-checker checks.
- Movement creation still uses movement-type feature settings and explicitly blocks Operations Manager.
- Opening balances retain their top-tier restriction.
- Staff rows using the retired `Owner` role are omitted from the login picker and cannot authenticate until manually changed to Founder or Co-Founder.

## Shared read group

All recognized employee roles receive the operational reads needed for the current app shell:

- products and combo/BOM;
- locations;
- movements and stock;
- stock counts;
- feature settings and operational lists.

Module-specific data remains restricted. Staff, support, purchasing, Amazon and fulfilment records require their separate capability where applicable.

## Action-level source

The exact mapping of all 42 authenticated business actions is in:

- `Code.gs` → `ACTION_CAPABILITIES`
- `config/api-catalog.json`
- `docs/API_CATALOG.md`

Automated tests fail if the backend action mapping and machine-readable catalogue disagree.

## Review note

This matrix preserves the current backend/UI intent as closely as possible while replacing frontend-only visibility with backend enforcement. The owner may narrow or expand a role later by changing the documented capability assignment and its tests; action handlers must not be bypassed.
