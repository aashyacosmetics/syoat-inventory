# API and Permission Catalogue

## Response timing metadata

The Phase 2 staging candidate adds `serverDurationMs` to both success and error envelopes. It is a non-negative execution duration only; it contains no request body, identity, PIN, PIN hash/salt, session token, file reference or business data. The active frontend combines this with browser round-trip duration in memory for Founder/Co-Founder System Health review. Refresh/logout clears the browser aggregate, and no performance record is written to the workbook or Drive.

Generated/verified from local sources on 2026-10-28.

## Purpose

This catalogue is the Phase 1 baseline for the Apps Script API. It records every routed backend action, its current transport and gate, whether either frontend contains a literal caller, and the capability that must protect it in the target session-based API.

`current` means the active `syoat-app.js`. The archived redesign test artifact is deliberately excluded. `none` means no literal active-frontend API call was found; it does not prove that the handler is safe to delete because external/manual callers may exist.

## Summary

- 50 unique backend actions.
- Only `ping` and `getAppLogins` are routed by public `doGet`.
- 4 session actions are handled directly by `doPost` (`login`, `logout`, `confirmPin`, and `verifySession`).
- 19 business reads pass through the authenticated POST router.
- 25 writes pass through the authenticated POST router.
- No business-data read or write is routed through GET.
- 13 backend actions have no caller in the current frontend.

Only `ping`, a strictly minimal staff picker, and the PIN-login entry are reachable without an authenticated session. Login-attempt logging is an internal effect of the login service rather than a public command.

## Complete action table

<!-- BEGIN GENERATED ACTION TABLE -->
| Action | Current routes | Current backend gate | Frontend caller | Target capability |
| --- | --- | --- | --- | --- |
| `ping` | GET | Public | none | `system.health` |
| `login` | POST | Public PIN entry with hash verification, five-attempt lockout, and session issue | current | `auth.login` |
| `logout` | POST | Session token revocation | current | `auth.logout` |
| `confirmPin` | POST | Valid session plus PIN hash verification and lockout | current | `auth.confirmPin` |
| `verifySession` | POST | Valid active non-expired session | none | `auth.session.verify` |
| `getAppLogins` | GET | Public; returns active staff picker | current | `auth.staffPicker` |
| `getProducts` | POST | Valid session + central capability catalog.products.view | none | `catalog.products.view` |
| `getLocations` | POST | Valid session + central capability inventory.locations.view | none | `inventory.locations.view` |
| `getStaff` | POST | Valid session + central capability staff.view | none | `staff.view` |
| `getMovements` | POST | Valid session + central capability inventory.movements.view | current | `inventory.movements.view` |
| `getStock` | POST | Valid session + central capability inventory.stock.view | none | `inventory.stock.view` |
| `getInventoryBootstrap` | POST | Valid session + central capability inventory.stock.view | current | `inventory.stock.view` |
| `getSalesOrders` | POST | Valid session + central capability orders.fulfilment.view | none | `orders.fulfilment.view` |
| `getStockCounts` | POST | Valid session + central capability inventory.counts.view | current | `inventory.counts.view` |
| `getFeatureSettings` | POST | Valid session + central capability settings.features.view | none | `settings.features.view` |
| `getLists` | POST | Valid session + central capability settings.lists.view | none | `settings.lists.view` |
| `getComboBOM` | POST | Valid session + central capability catalog.combos.view | current | `catalog.combos.view` |
| `getSupportTickets` | POST | Valid session + central capability support.tickets.view | current | `support.tickets.view` |
| `getSuppliers` | POST | Valid session + central capability purchasing.suppliers.view | current | `purchasing.suppliers.view` |
| `getPurchaseOrders` | POST | Valid session + central capability purchasing.orders.view | current | `purchasing.orders.view` |
| `getFbaShipments` | POST | Valid session + central capability amazon.shipments.view | current | `amazon.shipments.view` |
| `getFbaDispatchShipmentOptions` | POST | Valid session + central capability inventory.movements.create; returns minimal open-shipment fields only | current | `inventory.movements.create` |
| `getFbaLedgerSnapshots` | POST | Valid session + central capability amazon.reconciliation.view | current | `amazon.reconciliation.view` |
| `getOperationalFile` | POST | Valid session + central capability inventory.files.view; movement ownership/scope and stored file reference are revalidated | current | `inventory.files.view` |
| `getSystemHealth` | POST | Valid Founder/Co-Founder session + central capability system.health.view | current | `system.health.view` |
| `createMovement` | POST | Valid session + central capability inventory.movements.create; existing handler domain rules also apply | current | `inventory.movements.create` |
| `approveMovement` | POST | Valid session + central capability inventory.movements.approve; existing handler domain rules also apply | current | `inventory.movements.approve` |
| `reverseMovement` | POST | Valid session + central capability inventory.movements.reverse; existing handler domain rules also apply | current | `inventory.movements.reverse` |
| `editMovement` | POST | Valid session + central capability inventory.movements.edit; existing handler domain rules also apply | current | `inventory.movements.edit` |
| `rejectMovement` | POST | Valid session + central capability inventory.movements.reject; existing handler domain rules also apply | current | `inventory.movements.reject` |
| `createSalesOrder` | POST | Valid session + central capability orders.fulfilment.create; existing handler domain rules also apply | none | `orders.fulfilment.create` |
| `dispatchSalesOrder` | POST | Valid session + central capability orders.fulfilment.dispatch; existing handler domain rules also apply | none | `orders.fulfilment.dispatch` |
| `createStockCount` | POST | Valid session + central capability inventory.counts.create; existing handler domain rules also apply | current | `inventory.counts.create` |
| `approveStockCount` | POST | Valid session + central capability inventory.counts.approve; existing handler domain rules also apply | current | `inventory.counts.approve` |
| `rejectStockCount` | POST | Valid session + central capability inventory.counts.reject; existing handler domain rules also apply | current | `inventory.counts.reject` |
| `editStockCount` | POST | Valid session + central capability inventory.counts.edit; existing handler domain rules also apply | none | `inventory.counts.edit` |
| `logChange` | POST | Valid session + central capability audit.manual.create; existing handler domain rules also apply | none | `audit.manual.create` |
| `assembleCombo` | POST | Valid session + central capability inventory.combos.assemble; existing handler domain rules also apply | current | `inventory.combos.assemble` |
| `createFbaReconciliation` | POST | Valid session + central capability amazon.reconciliation.create; existing handler domain rules also apply | current | `amazon.reconciliation.create` |
| `reviewFbaVariance` | POST | Valid session + central capability amazon.reconciliation.review; Manager-level FBA variance classification only; no stock change | current | `amazon.reconciliation.review` |
| `createSupportTicket` | POST | Valid session + central capability support.tickets.create; existing handler domain rules also apply | current | `support.tickets.create` |
| `updateSupportTicket` | POST | Valid session + central capability support.tickets.update; existing handler domain rules also apply | current | `support.tickets.update` |
| `createPurchaseOrder` | POST | Valid session + central capability purchasing.orders.create; existing handler domain rules also apply | current | `purchasing.orders.create` |
| `approvePurchaseOrder` | POST | Valid session + central capability purchasing.orders.approve; existing handler domain rules also apply | current | `purchasing.orders.approve` |
| `rejectPurchaseOrder` | POST | Valid session + central capability purchasing.orders.reject; existing handler domain rules also apply | current | `purchasing.orders.reject` |
| `closePurchaseOrder` | POST | Valid session + central capability purchasing.orders.close; existing handler domain rules also apply | current | `purchasing.orders.close` |
| `createFbaShipment` | POST | Valid session + central capability amazon.shipments.create; existing handler domain rules also apply | current | `amazon.shipments.create` |
| `updateFbaShipmentStatus` | POST | Valid session + central capability amazon.shipments.update; existing handler domain rules also apply | current | `amazon.shipments.update` |
| `linkMovementToShipment` | POST | Valid session + central capability amazon.shipments.linkMovement; existing handler domain rules also apply | current | `amazon.shipments.linkMovement` |
| `unlinkMovementFromShipment` | POST | Valid session + central capability amazon.shipments.unlinkMovement; existing handler domain rules also apply | current | `amazon.shipments.unlinkMovement` |
<!-- END GENERATED ACTION TABLE -->

## Backend-only actions in the current frontend

The following actions have no literal caller in `syoat-app.js`:

- `ping`
- `getLocations`
- `getProducts`
- `getStaff`
- `getStock`
- `getSalesOrders`
- `getFeatureSettings`
- `getLists`
- `createSalesOrder`
- `dispatchSalesOrder`
- `editStockCount`
- `logChange`
- `verifySession`

These require an explicit retain, migrate, or remove decision during the secured router work. `createSalesOrder` contains financial-looking fields such as payment status and unit price; it must not be expanded into daily sales accounting under the agreed project scope.

## Capability naming

- `*.view` permits an authenticated read within the named module.
- `*.create` creates a draft or new operational record.
- `*.edit` changes a permitted draft/pending record.
- `*.approve`, `*.reject`, `*.reverse`, and `*.close` are distinct high-impact capabilities.
- Linking and unlinking are separate capabilities because unlinking changes the audit interpretation of approved movements.
- `auth.staffPicker` returns only the minimum fields needed to choose an identity. It does not grant access to the staff module.
- `auth.attempt.record` is server-internal in the target design and will not be granted to a browser role.

## Current role observations

- Founder and Co-Founder are the broadest active roles and bypass parts of `requireRole`.
- `Owner` is not a supported application role. Founder and Co-Founder are the only top-authority roles.
- `Admin`, `Manager`, and `Warehouse Manager` share many approval permissions but are maker-checker restricted on records they created.
- `Warehouse`/`Warehouse Operator` movement creation is controlled primarily through movement-type settings.
- Founder, Co-Founder, Admin, Manager and Warehouse Manager may classify an imported FBA variance through the dedicated review action. Generic count approve, edit and reject actions are blocked for these rows.
- `Operations Manager` is explicitly restricted to support tickets.
- `Accounts` can create/edit stock counts in the current backend even though daily accounts are excluded from the product scope.
- Frontend tab visibility and action controls use capabilities issued by the authenticated backend session.

The current matrix is enforced locally. Future role refinements must change the backend matrix, documentation and tests together.

## How to verify this catalogue

From the repository folder, run:

```powershell
npm run check:catalog
```

The check fails if `Code.gs`, the active frontend, `config/api-catalog.json`, or the generated table becomes inconsistent. To print the replacement generated table after an intentional route change:

```powershell
npm run catalog:print
```
