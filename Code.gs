// ============================================================
//  SYOAT INVENTORY ERP — Google Apps Script Backend v3.0
//
//  What's new in v3:
//  • RequestId idempotency — duplicate submissions are ignored
//  • editStockCount action added (for Edit button on count cards)
//  • doPost now handles ALL write actions (parity with doGet)
//  • Cleaner error messages for common mistakes
//
//  Deploy: Web App | Execute as: Me | Access: Anyone
// ============================================================

const SHEETS = {
  PRODUCTS:         "Products",
  LOCATIONS:        "Locations",
  STAFF:            "Staff",
  MOV_HEADERS:      "Movement_Headers",
  MOV_LINES:        "Movement_Lines",
  SALES_ORDERS:     "Sales_Orders",
  SALES_LINES:      "Sales_Order_Lines",
  STOCK_COUNTS:     "Stock_Counts",
  FEATURE_SETTINGS: "Feature_Settings",
  CHANGE_LOG:       "Change_Log",
  LISTS:            "Lists",
  APP_LOGINS:       "App_Logins",
  COMBO_BOM:        "Combo_BOM",
  AUDIT_TRAIL:      "Audit_Trail",
  LOGIN_LOG:        "Login_Log",
  SUPPORT_TICKETS:  "Support_Tickets",
  SUPPLIERS:            "Suppliers",
  PURCHASE_ORDERS:       "Purchase_Orders",
  PURCHASE_ORDER_LINES:  "Purchase_Order_Lines",
  FBA_SHIPMENTS:         "FBA_Shipments",
  FBA_SHIPMENT_LINES:    "FBA_Shipment_Lines",
  FBA_LEDGER_SNAPSHOTS:  "FBA_Ledger_Snapshots",
};

// Authentication policy. PIN length remains compatible with the current
// four-digit employee experience; hashes also accept a future move to six
// digits without changing the storage format.
const AUTH_CONFIG = {
  MIN_PIN_LENGTH:          4,
  MAX_PIN_LENGTH:          6,
  MAX_FAILED_ATTEMPTS:     5,
  LOCK_MINUTES:           15,
  SESSION_HOURS:           8,
  SESSION_IDLE_MINUTES:   30,
  SESSION_PROPERTY_PREFIX: "SYOAT_SESSION_",
  ATTEMPT_PROPERTY_PREFIX: "SYOAT_AUTH_ATTEMPT_",
};

const WRITE_CONFIG = {
  LOCK_WAIT_MS:             30000,
  REQUEST_PROPERTY_PREFIX: "SYOAT_WRITE_REQUEST_",
  REQUEST_RETENTION_DAYS:  30,
  MAX_REQUEST_RECORDS:      500,
};

const OPERATIONS_CONFIG = {
  VERSION:               "3.1-phase2-wp1.5",
  ERROR_PROPERTY_PREFIX: "SYOAT_OPERATIONAL_ERROR_",
  ERROR_RETENTION_DAYS:  90,
  MAX_ERROR_RECORDS:     100,
  MAX_FILE_BYTES:        8 * 1024 * 1024,
  FILE_HARDEN_BATCH_SIZE: 20,
};

// Environment-specific Drive folders must be configured in Apps Script
// Properties. Name-based discovery is unsafe because staging and production
// can run under the same Google account and contain identically named folders.
const DRIVE_CONFIG = {
  ROOT_FOLDER_PROPERTY:   "SYOAT_DRIVE_ROOT_FOLDER_ID",
  LEGACY_FOLDER_PROPERTY: "SYOAT_LEGACY_ATTACHMENTS_FOLDER_ID",
};

const ENVIRONMENT_CONFIG = {
  NAME_PROPERTY:          "SYOAT_ENVIRONMENT",
  NOTIFICATION_PROPERTY:  "SYOAT_NOTIFICATION_RECIPIENTS",
};

var CURRENT_CORRELATION_ID = "";
var CURRENT_REQUEST_STARTED_AT = 0;

// Central action policy. Handler-level checks (ownership, maker-checker,
// movement type, state transitions) remain as narrower domain rules; this map
// is the mandatory module/capability gate applied before any business handler.
const ACTION_CAPABILITIES = {
  getProducts:                 "catalog.products.view",
  getLocations:                "inventory.locations.view",
  getStaff:                    "staff.view",
  getMovements:                "inventory.movements.view",
  getStock:                    "inventory.stock.view",
  getInventoryBootstrap:       "inventory.stock.view",
  getSalesOrders:              "orders.fulfilment.view",
  getStockCounts:              "inventory.counts.view",
  getFeatureSettings:          "settings.features.view",
  getLists:                    "settings.lists.view",
  getComboBOM:                 "catalog.combos.view",
  getSupportTickets:           "support.tickets.view",
  getSuppliers:                "purchasing.suppliers.view",
  getPurchaseOrders:           "purchasing.orders.view",
  getFbaShipments:             "amazon.shipments.view",
  getFbaLedgerSnapshots:       "amazon.reconciliation.view",
  getOperationalFile:          "inventory.files.view",
  getSystemHealth:             "system.health.view",
  createMovement:              "inventory.movements.create",
  approveMovement:             "inventory.movements.approve",
  reverseMovement:             "inventory.movements.reverse",
  editMovement:                "inventory.movements.edit",
  rejectMovement:              "inventory.movements.reject",
  createSalesOrder:            "orders.fulfilment.create",
  dispatchSalesOrder:          "orders.fulfilment.dispatch",
  createStockCount:            "inventory.counts.create",
  approveStockCount:           "inventory.counts.approve",
  rejectStockCount:            "inventory.counts.reject",
  editStockCount:              "inventory.counts.edit",
  logChange:                   "audit.manual.create",
  assembleCombo:               "inventory.combos.assemble",
  createFbaReconciliation:     "amazon.reconciliation.create",
  createSupportTicket:         "support.tickets.create",
  updateSupportTicket:         "support.tickets.update",
  createPurchaseOrder:         "purchasing.orders.create",
  approvePurchaseOrder:        "purchasing.orders.approve",
  rejectPurchaseOrder:         "purchasing.orders.reject",
  closePurchaseOrder:          "purchasing.orders.close",
  createFbaShipment:           "amazon.shipments.create",
  updateFbaShipmentStatus:     "amazon.shipments.update",
  linkMovementToShipment:      "amazon.shipments.linkMovement",
  unlinkMovementFromShipment:  "amazon.shipments.unlinkMovement",
};

const COMMON_READ_CAPABILITIES = [
  "catalog.products.view",
  "catalog.combos.view",
  "inventory.locations.view",
  "inventory.movements.view",
  "inventory.stock.view",
  "inventory.counts.view",
  "inventory.files.view",
  "settings.features.view",
  "settings.lists.view",
];

const MOVEMENT_OPERATOR_CAPABILITIES = [
  "inventory.movements.create",
  "inventory.movements.edit",
  "inventory.combos.assemble",
];

const MOVEMENT_MANAGER_CAPABILITIES = [
  ...MOVEMENT_OPERATOR_CAPABILITIES,
  "inventory.movements.approve",
  "inventory.movements.reject",
  "inventory.movements.reverse",
  "inventory.counts.create",
  "inventory.counts.edit",
  "inventory.counts.approve",
  "inventory.counts.reject",
];

const AMAZON_MANAGER_CAPABILITIES = [
  "amazon.shipments.view",
  "amazon.shipments.create",
  "amazon.shipments.update",
  "amazon.shipments.linkMovement",
  "amazon.reconciliation.view",
  "amazon.reconciliation.create",
];

const FULFILMENT_CAPABILITIES = [
  "orders.fulfilment.view",
  "orders.fulfilment.create",
  "orders.fulfilment.dispatch",
];

// Server-issued UI/scope capabilities. These are not routed API actions, but
// they let the frontend render navigation and record scope without duplicating
// role lists in the browser.
const UI_CAPABILITIES = [
  "inventory.movements.viewAll",
  "inventory.openingBalance.create",
];

const ROLE_CAPABILITIES = {
  Founder: ["*"],
  "Co-Founder": ["*"],
  Admin: [
    ...COMMON_READ_CAPABILITIES,
    ...MOVEMENT_MANAGER_CAPABILITIES,
    ...AMAZON_MANAGER_CAPABILITIES,
    ...FULFILMENT_CAPABILITIES,
    "staff.view", "audit.manual.create", "inventory.movements.viewAll",
  ],
  Manager: [
    ...COMMON_READ_CAPABILITIES,
    ...MOVEMENT_MANAGER_CAPABILITIES,
    ...AMAZON_MANAGER_CAPABILITIES,
    ...FULFILMENT_CAPABILITIES,
    "audit.manual.create", "inventory.movements.viewAll",
  ],
  "Warehouse Manager": [
    ...COMMON_READ_CAPABILITIES,
    ...MOVEMENT_MANAGER_CAPABILITIES,
    ...AMAZON_MANAGER_CAPABILITIES,
    ...FULFILMENT_CAPABILITIES,
    "purchasing.suppliers.view", "purchasing.orders.view", "purchasing.orders.create", "audit.manual.create", "inventory.movements.viewAll",
  ],
  "Operations Manager": [
    ...COMMON_READ_CAPABILITIES,
    "support.tickets.view", "support.tickets.create", "support.tickets.update", "audit.manual.create", "inventory.movements.viewAll",
  ],
  Warehouse: [
    ...COMMON_READ_CAPABILITIES,
    ...MOVEMENT_OPERATOR_CAPABILITIES,
    ...FULFILMENT_CAPABILITIES,
    "purchasing.suppliers.view", "purchasing.orders.view", "audit.manual.create",
  ],
  "Warehouse Operator": [
    ...COMMON_READ_CAPABILITIES,
    ...MOVEMENT_OPERATOR_CAPABILITIES,
    ...FULFILMENT_CAPABILITIES,
    "purchasing.suppliers.view", "purchasing.orders.view", "audit.manual.create",
  ],
  Accounts: [
    ...COMMON_READ_CAPABILITIES,
    "staff.view", "inventory.counts.create", "inventory.counts.edit", "audit.manual.create", "inventory.movements.viewAll",
  ],
};

// ─────────────────────────────────────────────────────────────
//  ENTRY POINTS
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  CURRENT_REQUEST_STARTED_AT = Date.now();
  CURRENT_CORRELATION_ID = Utilities.getUuid();
  return withRequestSheetReadCache(function () {
    try {
      const action = e.parameter.action;
      if (action === "ping")               return ok({ service: "Syoat ERP", status: "ok", version: OPERATIONS_CONFIG.VERSION, ts: now() });
      if (action === "getAppLogins")       return ok(getAppLogins());
      return err("GET is allowed only for ping and the safe staff picker.");
    } catch (ex) {
      return operationalErrorResponse(ex, "public-get");
    }
  });
}

function doPost(e) {
  let action = "unknown";
  CURRENT_REQUEST_STARTED_AT = Date.now();
  CURRENT_CORRELATION_ID = Utilities.getUuid();
  return withRequestSheetReadCache(function () {
    try {
      const body   = JSON.parse(e.postData.contents);
      const email  = body.email || "";
      action = body.action;
      CURRENT_CORRELATION_ID = /^[A-Za-z0-9._:-]{8,100}$/.test(String(body.requestId || ""))
        ? String(body.requestId)
        : CURRENT_CORRELATION_ID;
      if (action === "login")           return ok(loginWithPin(body));
      if (action === "logout")          return ok(logoutSession(body));
      if (action === "confirmPin")      return ok(confirmSessionPin(body));
      if (action === "verifySession")   return ok(verifySession(body));
      return handleAuthenticatedAction(action, body, email);
    } catch (ex) {
      if (!CURRENT_CORRELATION_ID) CURRENT_CORRELATION_ID = Utilities.getUuid();
      return operationalErrorResponse(ex, action);
    }
  });
}

function capabilitiesForRole(role) {
  const assigned = ROLE_CAPABILITIES[String(role || "")] || [];
  const capabilities = assigned.includes("*")
    ? [...new Set(Object.keys(ACTION_CAPABILITIES).map(action => ACTION_CAPABILITIES[action]).concat(UI_CAPABILITIES))]
    : [...new Set(assigned)];
  // Opening Balance is a migration/setup action reserved to the Founder. The
  // Co-Founder keeps every routed operational capability, but the server does
  // not issue the UI capability for this one high-impact setup action.
  return String(role || "") === "Co-Founder"
    ? capabilities.filter(capability => capability !== "inventory.openingBalance.create")
    : capabilities;
}

function isSupportedRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_CAPABILITIES, String(role || ""));
}

function requireCapability(staff, capability) {
  if (!capability) throw new Error("Unknown or unclassified action.");
  const assigned = ROLE_CAPABILITIES[String(staff.Role || "")] || [];
  if (assigned.includes("*") || assigned.includes(capability)) return;
  throw new Error("Forbidden: role '" + staff.Role + "' lacks capability '" + capability + "'.");
}

function handleAuthenticatedAction(action, body, email) {
  const staff = requireSession(body.sessionToken);
  if (email && normaliseEmail(email) !== normaliseEmail(staff.Email)) {
    throw new Error("Unauthorised: session identity mismatch");
  }
  const capability = ACTION_CAPABILITIES[action];
  requireCapability(staff, capability);

  if (action === "getProducts")        return ok(getProducts(body));
  if (action === "getLocations")       return ok(getLocations());
  if (action === "getStaff")           return ok(getStaff(staff.Email));
  if (action === "getMovements")       return ok(getMovements(body, staff));
  if (action === "getStock")           return ok(getStock(body));
  if (action === "getInventoryBootstrap") return ok(getInventoryBootstrap(body, staff));
  if (action === "getSalesOrders")     return ok(getSalesOrders(body));
  if (action === "getStockCounts")     return ok(getStockCounts(body));
  if (action === "getFeatureSettings") return ok(getFeatureSettings(staff.Email));
  if (action === "getLists")           return ok(getLists(body.listName));
  if (action === "getComboBOM")        return ok(getComboBOM(body));
  if (action === "getSupportTickets")  return ok(getSupportTickets(body));
  if (action === "getSuppliers")       return ok(getSuppliers(body));
  if (action === "getPurchaseOrders")  return ok(getPurchaseOrders(body));
  if (action === "getFbaShipments")    return ok(getFbaShipments(body));
  if (action === "getFbaLedgerSnapshots") return ok(getFbaLedgerSnapshots(body));
  if (action === "getOperationalFile") return ok(getOperationalFile(body, staff));
  if (action === "getSystemHealth")    return ok(getSystemHealth(staff));

  return handleWrite(action, body, staff);
}

function handleWrite(action, body, staff) {
  requireFields(body, ["requestId"]);
  validateRequestId(body.requestId);
  return withBusinessWriteLock(function () {
    return ok(runIdempotentWrite(action, body, staff));
  });
}

function dispatchBusinessWrite(action, body, staff) {
  if (action === "createMovement")     return createMovement(body, staff);
  if (action === "approveMovement")    return approveMovement(body, staff);
  if (action === "reverseMovement")    return reverseMovement(body, staff);
  if (action === "editMovement")       return editMovement(body, staff);
  if (action === "rejectMovement")     return rejectMovement(body, staff);
  if (action === "createSalesOrder")   return createSalesOrder(body, staff);
  if (action === "dispatchSalesOrder") return dispatchSalesOrder(body, staff);
  if (action === "createStockCount")   return createStockCount(body, staff);
  if (action === "approveStockCount")  return approveStockCount(body, staff);
  if (action === "rejectStockCount")   return rejectStockCount(body, staff);
  if (action === "editStockCount")     return editStockCount(body, staff);
  if (action === "logChange")          return logChange(body, staff);
  if (action === "assembleCombo")      return assembleCombo(body, staff);
  if (action === "createFbaReconciliation") return createFbaReconciliation(body, staff);
  if (action === "createSupportTicket") return createSupportTicket(body, staff);
  if (action === "updateSupportTicket") return updateSupportTicket(body, staff);
  if (action === "createPurchaseOrder") return createPurchaseOrder(body, staff);
  if (action === "approvePurchaseOrder") return approvePurchaseOrder(body, staff);
  if (action === "rejectPurchaseOrder")  return rejectPurchaseOrder(body, staff);
  if (action === "closePurchaseOrder")   return closePurchaseOrder(body, staff);
  if (action === "createFbaShipment")       return createFbaShipment(body, staff);
  if (action === "updateFbaShipmentStatus") return updateFbaShipmentStatus(body, staff);
  if (action === "linkMovementToShipment")  return linkMovementToShipment(body, staff);
  if (action === "unlinkMovementFromShipment") return unlinkMovementFromShipment(body, staff);
  throw new Error("Unknown action: " + action);
}

// ─────────────────────────────────────────────────────────────
//  READ HANDLERS
// ─────────────────────────────────────────────────────────────

function getProducts(params) {
  const rows = sheetToObjects(SHEETS.PRODUCTS);
  return (params && params.status === "all") ? rows : rows.filter(r => r.Status === "Active");
}

function getLocations() {
  return sheetToObjects(SHEETS.LOCATIONS).filter(r => r.Status === "Active");
}

function getStaff(email) {
  const all = sheetToObjects(SHEETS.STAFF);
  const me  = all.find(s => s.Email === email);
  if (!me) return [];
  return ["Founder","Co-Founder","Admin","Accounts"].includes(me.Role) ? all : [me];
}

// Robust "latest first" sort by the numeric suffix of a sequential ID (MOV-068 > MOV-040).
// Fixes the bug where Sheets returns *DateTime cells as Date OBJECTS, so String(date) sorts
// by weekday name ("Wed" > "Mon") instead of chronologically — which hid the newest rows.
function _idNum(v) {
  var m = String(v == null ? "" : v).match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

function getMovements(params, staff) {
  return getMovementsFromRows(params || {}, staff, sheetToObjects(SHEETS.MOV_HEADERS), null);
}

function getMovementsFromRows(params, staff, headerRows, lineRows) {
  let headers = headerRows.slice();
  if (staff && !capabilitiesForRole(staff.Role).includes("inventory.movements.viewAll")) {
    headers = headers.filter(h => normaliseEmail(h.EnteredByEmail) === normaliseEmail(staff.Email));
  }
  if (params.status)       headers = headers.filter(h => h.Status === params.status);
  if (params.movementType) headers = headers.filter(h => h.MovementType === params.movementType);

  headers.sort((a, b) => _idNum(b.MovementID) - _idNum(a.MovementID));
  headers = headers.slice(0, parseInt(params.limit) || 100);

  if (params.includeLines === "true") {
    const allLines = lineRows || sheetToObjects(SHEETS.MOV_LINES);
    headers = headers.map(h => ({ ...h, lines: allLines.filter(l => l.MovementID === h.MovementID) }));
  }
  return headers;
}

function getStock(params) {
  return getStockFromRows(params || {}, sheetToObjects(SHEETS.MOV_HEADERS), sheetToObjects(SHEETS.MOV_LINES));
}

function getStockFromRows(params, headerRows, lineRows) {
  const approvedMap = {};
  headerRows
    .filter(h => h.Status === "Approved" && h.MovementType !== "Reversal")
    .forEach(h => { approvedMap[h.MovementID] = h; });

  const VIRTUAL = ["SUPPLIER","CUSTOMER","WEBSITE_SALES","FLIPKART_SALES","FIRSTCRY_SALES","SAMPLES","DAMAGE"];

  const stock = {};
  lineRows.forEach(line => {
    const header = approvedMap[line.MovementID];
    if (!header) return;

    const pid = line.ProductID;
    const qty = parseFloat(line.Quantity) || 0;
    const src = header.SourceLocationID;
    const dst = header.DestinationLocationID;
    if (!stock[pid]) stock[pid] = {};

    const isOpeningBalance = header.MovementType === "Opening Balance"
      || header.MovementType === "Opening Balance – WH"
      || header.MovementType === "Opening Balance – FBA";

    if (isOpeningBalance) {
      stock[pid][dst] = (stock[pid][dst] || 0) + qty;
    } else if (header.MovementType === "Assemble Combo") {
      // Combo assembly: the output line (ProductID === header.ReferenceNumber = the combo) is
      // PRODUCED; every other line is a component CONSUMED. src === dst === MAIN_WH, so both
      // post to the same physical location. Mirrors the Opening Balance special case above.
      if (pid === header.ReferenceNumber) stock[pid][dst] = (stock[pid][dst] || 0) + qty;
      else                                stock[pid][src] = (stock[pid][src] || 0) - qty;
    } else {
      if (src && !VIRTUAL.includes(src)) stock[pid][src] = (stock[pid][src] || 0) - qty;
      if (dst && !VIRTUAL.includes(dst)) stock[pid][dst] = (stock[pid][dst] || 0) + qty;
    }
  });

  let result = [];
  Object.entries(stock).forEach(([pid, locs]) => {
    Object.entries(locs).forEach(([lid, qty]) => {
      result.push({ ProductID: pid, LocationID: lid, Quantity: qty });
    });
  });

  if (params && params.productId)  result = result.filter(r => r.ProductID  === params.productId);
  if (params && params.locationId) result = result.filter(r => r.LocationID === params.locationId);
  return result;
}

// One authenticated startup read. Products, stock and recent movements share
// the same Movement sheets so the browser avoids three Apps Script executions
// and the backend reads those sheets only once. This is intentionally not
// cached: every refresh and every post-write reload still sees canonical rows.
function getInventoryBootstrap(params, staff) {
  const headerRows = sheetToObjects(SHEETS.MOV_HEADERS);
  const lineRows = sheetToObjects(SHEETS.MOV_LINES);
  return {
    products: getProducts(params || {}),
    stock: getStockFromRows({}, headerRows, lineRows),
    movements: getMovementsFromRows({
      includeLines: "true",
      limit: String((params && params.limit) || 50),
    }, staff, headerRows, lineRows),
  };
}

function getSalesOrders(params) {
  let orders = sheetToObjects(SHEETS.SALES_ORDERS);
  if (params.status)           orders = orders.filter(o => o.Status           === params.status);
  if (params.channel)          orders = orders.filter(o => o.Channel           === params.channel);
  if (params.fulfilmentStatus) orders = orders.filter(o => o.FulfilmentStatus  === params.fulfilmentStatus);
  orders.sort((a,b) => _idNum(b.OrderID) - _idNum(a.OrderID));
  orders = orders.slice(0, parseInt(params.limit) || 100);
  if (params.includeLines === "true") {
    const allLines = sheetToObjects(SHEETS.SALES_LINES);
    orders = orders.map(o => ({ ...o, lines: allLines.filter(l => l.OrderID === o.OrderID) }));
  }
  return orders;
}

function getStockCounts(params) {
  let counts = sheetToObjects(SHEETS.STOCK_COUNTS);
  if (params && params.status)     counts = counts.filter(c => c.Status     === params.status);
  if (params && params.locationId) counts = counts.filter(c => c.LocationID === params.locationId);
  counts.sort((a,b) => _idNum(b.CountID) - _idNum(a.CountID));
  return counts;
}

function getFeatureSettings(email) {
  const staff = findStaffByEmail(email);
  const role  = staff ? staff.Role : "Warehouse";
  return sheetToObjects(SHEETS.FEATURE_SETTINGS).filter(r => {
    const allowed = (r.AllowedRoles || "").split(",").map(s => s.trim());
    return allowed.includes(role) || role === "Founder" || role === "Co-Founder";
  });
}

function getLists(listName) {
  const rows = sheetToObjects(SHEETS.LISTS);
  return listName ? rows.filter(r => r.ListName === listName) : rows;
}

// v3.7 (2026-08-06): this action is served by doGet BEFORE any authentication,
// and the Web App is deployed "Access: Anyone" — so everything it returns is
// effectively public. It used to include each staff member's PIN, which meant
// anyone holding the Web App URL could read every credential and then submit
// authenticated writes, defeating the server-side check added in Step 0. The
// PIN field is gone; the browser now exchanges a PIN for a temporary session
// through loginWithPin() below. The picker is the active intersection of Staff
// and App_Logins, while Staff remains authoritative for name and role.
function getAppLogins() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.APP_LOGINS);
    const staffSheet = ss.getSheetByName(SHEETS.STAFF);
    if (!sheet || !staffSheet) return { error: "Staff directory is unavailable." };
    const staffByEmail = {};
    sheetToObjects(SHEETS.STAFF).forEach(staff => {
      const email = normaliseEmail(staff.Email);
      if (email && String(staff.Status).trim().toLowerCase() === "active" && isSupportedRole(staff.Role)) {
        staffByEmail[email] = staff;
      }
    });
    const seen = {};
    return sheetToObjects(SHEETS.APP_LOGINS)
      .filter(login => {
        const email = normaliseEmail(login.Email);
        if (!email || seen[email] || String(login.Status).trim().toLowerCase() !== "active" || !staffByEmail[email]) return false;
        seen[email] = true;
        return true;
      })
      .map(login => {
        const staff = staffByEmail[normaliseEmail(login.Email)];
        return {
          name:  String(staff.Name || login.Name || ""),
          email: String(staff.Email || login.Email || ""),
          role:  String(staff.Role || "Warehouse"),
        };
      });
  } catch(e) {
    recordOperationalError(e, "getAppLogins");
    return { error: "Staff directory is unavailable. Reference: " + CURRENT_CORRELATION_ID };
  }
}

// ── Login audit (v3.3) ───────────────────────────────────────
// Logs every login attempt — success and failure — to a new Login_Log sheet.
// Deliberately bypasses requireStaff/handleWrite: a failed attempt (wrong PIN,
// unknown email) must still be logged, not blocked by the same auth check it's
// trying to record. Fails silent (never throws) if Login_Log doesn't exist yet —
// create it manually with columns: LoginID, Timestamp, Email, Success, Reason,
// UserAgent. Known limitation: Apps Script Web Apps don't expose the caller's
// IP address to server-side code, so this captures email + User-Agent + time,
// not network-level attribution.
function logLoginAttempt(body) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LOGIN_LOG);
    if (!sheet) return { logged: false, reason: "Login_Log sheet not found — create it to enable login auditing." };
    appendRow(SHEETS.LOGIN_LOG, {
      LoginID:   Utilities.getUuid(),
      Timestamp: now(),
      Email:     body.email || "",
      Success:   (body.success === "true" || body.success === true) ? "TRUE" : "FALSE",
      Reason:    body.reason || "",
      UserAgent: body.userAgent || "",
    });
    return { logged: true };
  } catch (e) {
    return { logged: false, reason: e.message };
  }
}

// ── PIN hashing, lockout and temporary sessions (Phase 1) ──────────────────
// The PIN is submitted only to POST login/confirmation actions. Successful
// login returns a random opaque token. Only its SHA-256 hash is retained in
// Script Properties, and every use re-checks current Staff/App_Logins status.

function normaliseEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function authProperties() {
  return PropertiesService.getScriptProperties();
}

function withAuthLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return callback(); }
  finally { lock.releaseLock(); }
}

function sha256Base64Url(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, "");
}

function secureEquals(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (a.charCodeAt(i % Math.max(a.length, 1)) || 0) ^
                (b.charCodeAt(i % Math.max(b.length, 1)) || 0);
  }
  return mismatch === 0;
}

function validatePinFormat(pin) {
  const value = String(pin || "");
  const pattern = new RegExp("^\\d{" + AUTH_CONFIG.MIN_PIN_LENGTH + "," + AUTH_CONFIG.MAX_PIN_LENGTH + "}$");
  return pattern.test(value);
}

function pinHash(pin, salt) {
  return sha256Base64Url(String(salt) + ":" + String(pin));
}

function findLoginByEmail(email) {
  const wanted = normaliseEmail(email);
  return sheetToObjects(SHEETS.APP_LOGINS).find(r => normaliseEmail(r.Email) === wanted) || null;
}

function verifyStoredPin(login, pin) {
  if (!login || !validatePinFormat(pin)) return false;
  const salt = String(login.PINSalt || "");
  const storedHash = String(login.PINHash || "");
  if (!salt || !storedHash) return false;
  return secureEquals(pinHash(pin, salt), storedHash);
}

function attemptPropertyKey(email) {
  return AUTH_CONFIG.ATTEMPT_PROPERTY_PREFIX + sha256Base64Url(normaliseEmail(email));
}

function getAttemptState(email) {
  const raw = authProperties().getProperty(attemptPropertyKey(email));
  if (!raw) return { failures: 0, lockedUntil: 0 };
  try { return JSON.parse(raw); } catch (e) { return { failures: 0, lockedUntil: 0 }; }
}

function clearAttemptState(email) {
  authProperties().deleteProperty(attemptPropertyKey(email));
}

function registerFailedAttempt(email) {
  const key = attemptPropertyKey(email);
  const state = getAttemptState(email);
  const nowMs = Date.now();
  if (state.lockedUntil && state.lockedUntil > nowMs) return state;
  const failures = (parseInt(state.failures, 10) || 0) + 1;
  const lockedUntil = failures >= AUTH_CONFIG.MAX_FAILED_ATTEMPTS
    ? nowMs + AUTH_CONFIG.LOCK_MINUTES * 60 * 1000
    : 0;
  const next = { failures: failures, lockedUntil: lockedUntil };
  authProperties().setProperty(key, JSON.stringify(next));
  return next;
}

function activeLockState(email) {
  const state = getAttemptState(email);
  if (state.lockedUntil && state.lockedUntil > Date.now()) return state;
  if (state.lockedUntil) clearAttemptState(email);
  return null;
}

function randomSessionToken() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
}

function sessionPropertyKey(token) {
  return AUTH_CONFIG.SESSION_PROPERTY_PREFIX + sha256Base64Url(token);
}

function safeStaffProfile(staff) {
  return {
    name:  String(staff.Name || ""),
    email: String(staff.Email || ""),
    role:  String(staff.Role || "Warehouse"),
    capabilities: capabilitiesForRole(staff.Role),
  };
}

function cleanupExpiredSessions() {
  const properties = authProperties();
  const all = properties.getProperties();
  const nowMs = Date.now();
  const idleMs = AUTH_CONFIG.SESSION_IDLE_MINUTES * 60 * 1000;
  Object.keys(all).forEach(key => {
    if (!key.startsWith(AUTH_CONFIG.SESSION_PROPERTY_PREFIX)) return;
    try {
      const record = JSON.parse(all[key]);
      if (record.expiresAt <= nowMs || record.lastSeenAt + idleMs <= nowMs) {
        properties.deleteProperty(key);
      }
    } catch (e) {
      properties.deleteProperty(key);
    }
  });
}

function createSession(staff) {
  cleanupExpiredSessions();
  const token = randomSessionToken();
  const nowMs = Date.now();
  const record = {
    email: normaliseEmail(staff.Email),
    issuedAt: nowMs,
    lastSeenAt: nowMs,
    expiresAt: nowMs + AUTH_CONFIG.SESSION_HOURS * 60 * 60 * 1000,
  };
  authProperties().setProperty(sessionPropertyKey(token), JSON.stringify(record));
  return {
    sessionToken: token,
    expiresAt: new Date(record.expiresAt).toISOString(),
    idleMinutes: AUTH_CONFIG.SESSION_IDLE_MINUTES,
  };
}

function loadSessionRecord(token) {
  const value = String(token || "");
  if (!value) throw new Error("Unauthorised: session required");
  const key = sessionPropertyKey(value);
  const raw = authProperties().getProperty(key);
  if (!raw) throw new Error("Unauthorised: session invalid or expired");
  let record;
  try { record = JSON.parse(raw); } catch (e) {
    authProperties().deleteProperty(key);
    throw new Error("Unauthorised: session invalid or expired");
  }

  const nowMs = Date.now();
  const idleMs = AUTH_CONFIG.SESSION_IDLE_MINUTES * 60 * 1000;
  if (record.expiresAt <= nowMs || record.lastSeenAt + idleMs <= nowMs) {
    authProperties().deleteProperty(key);
    throw new Error("Unauthorised: session expired");
  }

  const staff = findStaffByEmail(record.email);
  const login = findLoginByEmail(record.email);
  if (!staff || String(staff.Status).trim() !== "Active" ||
      !login || String(login.Status).trim() !== "Active" ||
      !isSupportedRole(staff.Role)) {
    authProperties().deleteProperty(key);
    throw new Error("Unauthorised: account inactive");
  }

  record.lastSeenAt = nowMs;
  authProperties().setProperty(key, JSON.stringify(record));
  return { key: key, record: record, staff: staff };
}

function requireSession(token) {
  return loadSessionRecord(token).staff;
}

function loginWithPin(body) {
  return withAuthLock(function () { return loginWithPinUnlocked(body); });
}

function loginWithPinUnlocked(body) {
  const email = normaliseEmail(body.email);
  const locked = activeLockState(email);
  if (locked) {
    logLoginAttempt({ email: email, success: false, reason: "Temporarily locked", userAgent: body.userAgent || "" });
    return { ok: false, reason: "Temporarily locked", lockedUntil: new Date(locked.lockedUntil).toISOString() };
  }

  const login = findLoginByEmail(email);
  const staff = findStaffByEmail(email);
  const valid = !!(
    login && staff &&
    String(login.Status).trim() === "Active" &&
    String(staff.Status).trim() === "Active" &&
    isSupportedRole(staff.Role) &&
    verifyStoredPin(login, body.pin)
  );

  if (!valid) {
    const failed = registerFailedAttempt(email);
    logLoginAttempt({
      email: email,
      success: false,
      reason: failed.lockedUntil ? "Too many failed attempts" : "Invalid PIN or inactive account",
      userAgent: body.userAgent || "",
    });
    return {
      ok: false,
      reason: failed.lockedUntil ? "Temporarily locked" : "Invalid PIN or inactive account",
      attemptsRemaining: Math.max(0, AUTH_CONFIG.MAX_FAILED_ATTEMPTS - failed.failures),
      lockedUntil: failed.lockedUntil ? new Date(failed.lockedUntil).toISOString() : "",
    };
  }

  clearAttemptState(email);
  const session = createSession(staff);
  logLoginAttempt({ email: email, success: true, reason: "", userAgent: body.userAgent || "" });
  return {
    ok: true,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
    idleMinutes: session.idleMinutes,
    user: safeStaffProfile(staff),
  };
}

function confirmSessionPin(body) {
  return withAuthLock(function () { return confirmSessionPinUnlocked(body); });
}

function confirmSessionPinUnlocked(body) {
  const session = loadSessionRecord(body.sessionToken);
  const email = normaliseEmail(session.staff.Email);
  const locked = activeLockState(email);
  if (locked) return { ok: false, reason: "Temporarily locked", lockedUntil: new Date(locked.lockedUntil).toISOString() };

  const login = findLoginByEmail(email);
  if (!verifyStoredPin(login, body.pin)) {
    const failed = registerFailedAttempt(email);
    return {
      ok: false,
      reason: failed.lockedUntil ? "Temporarily locked" : "Invalid PIN",
      attemptsRemaining: Math.max(0, AUTH_CONFIG.MAX_FAILED_ATTEMPTS - failed.failures),
      lockedUntil: failed.lockedUntil ? new Date(failed.lockedUntil).toISOString() : "",
    };
  }
  clearAttemptState(email);
  return { ok: true };
}

function verifySession(body) {
  const session = loadSessionRecord(body.sessionToken);
  return { ok: true, user: safeStaffProfile(session.staff) };
}

function logoutSession(body) {
  const token = String(body.sessionToken || "");
  if (token) authProperties().deleteProperty(sessionPropertyKey(token));
  return { ok: true };
}

// Founder-run, one-time migration. Run from the Apps Script editor before
// deploying session-based login. It refuses duplicate or malformed active PINs,
// adds PINHash/PINSalt columns when missing, hashes every populated PIN, and
// clears the plaintext PIN only after all validation has passed.
function migratePinsToHashes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.APP_LOGINS);
  if (!sheet) throw new Error("App_Logins sheet not found.");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    ["PINHash", "PINSalt"].forEach(name => {
      if (!headers.includes(name)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(name);
        headers.push(name);
      }
    });
    const pinIndex = headers.indexOf("PIN");
    const hashIndex = headers.indexOf("PINHash");
    const saltIndex = headers.indexOf("PINSalt");
    const statusIndex = headers.indexOf("Status");
    if (pinIndex === -1) throw new Error("App_Logins.PIN column not found.");

    const rowCount = Math.max(0, sheet.getLastRow() - 1);
    if (!rowCount) return { migrated: 0 };
    const values = sheet.getRange(2, 1, rowCount, headers.length).getValues();
    const activePins = {};
    values.forEach((row, index) => {
      const pin = String(row[pinIndex] || "");
      const active = String(row[statusIndex] || "").trim() === "Active";
      if (active && !validatePinFormat(pin) && !(row[hashIndex] && row[saltIndex])) {
        throw new Error("Active App_Logins row " + (index + 2) + " needs a " + AUTH_CONFIG.MIN_PIN_LENGTH + "-" + AUTH_CONFIG.MAX_PIN_LENGTH + " digit PIN.");
      }
      if (active && pin) {
        if (activePins[pin]) throw new Error("Duplicate active PINs found in App_Logins rows " + activePins[pin] + " and " + (index + 2) + ". Assign unique PINs before migration.");
        activePins[pin] = index + 2;
      }
    });

    let migrated = 0;
    values.forEach((row, index) => {
      const pin = String(row[pinIndex] || "");
      if (!pin) return;
      if (!validatePinFormat(pin)) throw new Error("Invalid PIN format in App_Logins row " + (index + 2) + ".");
      const salt = Utilities.getUuid().replace(/-/g, "");
      row[hashIndex] = pinHash(pin, salt);
      row[saltIndex] = salt;
      row[pinIndex] = "";
      migrated += 1;
    });
    sheet.getRange(2, 1, rowCount, headers.length).setValues(values);
    return { migrated: migrated };
  } finally {
    lock.releaseLock();
  }
}

// ── Structured audit trail (v3.3) ───────────────────────────────────────────
// Appends one row PER CHANGED FIELD to a new Audit_Trail sheet, instead of one
// prose sentence like Change_Log. Fails silent (never throws, never blocks the
// calling write) if Audit_Trail doesn't exist yet — create it manually with
// columns: AuditID, Timestamp, Action, RecordType, RecordID, FieldName,
// OldValue, NewValue, StaffEmail, RequestId, Notes.
// `changes` is an array of { field, oldValue, newValue }; pass [] for actions
// that create a record rather than change one (still logs a single row with
// blank field/old/new so the action itself is traceable).
function writeAuditTrail(action, recordType, recordId, changes, staff, requestId, notes) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUDIT_TRAIL);
    if (!sheet) return;
    const ts = now();
    const email = staff ? staff.Email : "";
    const rows = (changes && changes.length) ? changes : [{ field: "", oldValue: "", newValue: "" }];
    rows.forEach(c => {
      appendRow(SHEETS.AUDIT_TRAIL, {
        AuditID:    Utilities.getUuid(),
        Timestamp:  ts,
        Action:     action,
        RecordType: recordType,
        RecordID:   recordId,
        FieldName:  c.field     || "",
        OldValue:   c.oldValue  !== undefined ? c.oldValue : "",
        NewValue:   c.newValue  !== undefined ? c.newValue : "",
        StaffEmail: email,
        RequestId:  requestId || "",
        Notes:      notes || "",
      });
    });
  } catch (e) { /* best-effort — never block the write it's auditing */ }
}

function operationalEnvironment() {
  const configured = String(authProperties().getProperty(ENVIRONMENT_CONFIG.NAME_PROPERTY) || "").trim().toLowerCase();
  return ["production", "staging", "development"].includes(configured) ? configured : "development";
}

function operationalNotificationRecipients() {
  const environment = operationalEnvironment();
  const configured = String(authProperties().getProperty(ENVIRONMENT_CONFIG.NOTIFICATION_PROPERTY) || "")
    .split(/[;,]/)
    .map(value => normaliseEmail(value))
    .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  if (configured.length) return [...new Set(configured)];

  // Staging/development fail closed: no copied production recipient is used
  // unless the owner explicitly configures a test mailbox.
  if (environment !== "production") return [];
  return [...new Set(sheetToObjects(SHEETS.APP_LOGINS)
    .filter(user => user.Status === "Active" && ["Founder", "Co-Founder"].includes(user.Role) && user.Email)
    .map(user => normaliseEmail(user.Email)))];
}

function operationalNotificationSubject(subject) {
  const environment = operationalEnvironment();
  if (environment === "production") return String(subject || "");
  return "[" + environment.toUpperCase() + "] " + String(subject || "");
}

// ── Anomaly alerts (v3.3) ────────────────────────────────────────────────────
// Extends the exact pattern notifyLowStockOnApproval already uses (rule-based
// thresholds, MailApp.sendEmail, best-effort/never blocks the approval). Flags:
// (a) a Founder/Co-Founder self-approving their own movement (visible, not hidden),
// (b) a single line moving an outsized share (>30%) of a product's current
// total on-hand stock. Call after approveMovement, wrapped in try/catch.
function checkAnomalies(movementID, header, staff, isSelfApproved) {
  const recips = operationalNotificationRecipients();
  if (!recips.length) return;

  const alerts = [];
  if (isSelfApproved) {
    alerts.push("Self-approved: " + staff.Email + " (" + staff.Role + ") both created and approved " + movementID + ".");
  }

  const lines = sheetToObjects(SHEETS.MOV_LINES).filter(l => l.MovementID === movementID);
  const stockRows = getStock({});
  lines.forEach(l => {
    const qty = Math.abs(parseFloat(l.Quantity) || 0);
    const onHand = stockRows
      .filter(r => r.ProductID === l.ProductID)
      .reduce((a, r) => a + (parseFloat(r.Quantity) || 0), 0);
    if (onHand > 0 && qty / onHand > 0.3) {
      alerts.push(l.ProductID + ": this movement's line qty (" + qty + ") is " + Math.round((qty / onHand) * 100) + "% of total on-hand (" + onHand + ").");
    }
  });

  if (!alerts.length) return;
  const subject = operationalNotificationSubject("⚠️ Syoat accountability alert: " + movementID);
  const mailBody = "Movement " + movementID + " (" + (header.MovementType || "") + ") approved by " + staff.Email + " on " + now() + ".\n\n"
    + alerts.map(a => "• " + a).join("\n")
    + "\n\nThis is an informational flag, not a block — review at your convenience.";
  MailApp.sendEmail(recips.join(","), subject, mailBody);
}

// ── Daily accountability digest (v3.3, optional) ────────────────────────────
// Run setupDailyAccountabilityDigest() ONCE manually from the Apps Script
// editor (same pattern as migrateAttachmentsToFolders) to install a daily
// time-driven trigger. Flags if one approver's share of the day's approvals
// looks disproportionate (>70% of at least 5 movements) — informational only.
function setupDailyAccountabilityDigest() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "dailyAccountabilityDigest") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyAccountabilityDigest").timeBased().everyDays(1).atHour(20).create();
  Logger.log("Daily accountability digest trigger created — runs ~8pm IST daily.");
}

function dailyAccountabilityDigest() {
  const recips = operationalNotificationRecipients();
  if (!recips.length) return;

  const today = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  const headers = sheetToObjects(SHEETS.MOV_HEADERS).filter(h => String(h.MovementDateTime || "").indexOf(today) === 0);
  if (!headers.length) return;

  const byApprover = {};
  headers.forEach(h => { if (h.ApprovedByEmail) byApprover[h.ApprovedByEmail] = (byApprover[h.ApprovedByEmail] || 0) + 1; });
  const total = headers.length;
  const flags = Object.entries(byApprover).filter(([email, count]) => total >= 5 && (count / total) > 0.7);
  if (!flags.length) return;

  const subject = operationalNotificationSubject("Syoat daily accountability digest — " + today);
  const mailBody = "Today's movement volume: " + total + ".\n\n"
    + flags.map(([email, count]) => email + " approved " + count + " of " + total + " movements (" + Math.round((count / total) * 100) + "%).").join("\n")
    + "\n\nInformational only — useful if concentration should be spread across more approvers.";
  MailApp.sendEmail(recips.join(","), subject, mailBody);
}

// ─────────────────────────────────────────────────────────────
//  WRITE HANDLERS
// ─────────────────────────────────────────────────────────────

// Shared by createMovement and editMovement — see the note in createMovement.
function validateMovementLines(lines) {
  const known = {};
  sheetToObjects(SHEETS.PRODUCTS).forEach(p => { known[String(p.ProductID)] = true; });
  lines.forEach((line, i) => {
    const q = parseFloat(line.quantity);
    if (!isFinite(q) || q <= 0) {
      throw new Error("Line " + (i + 1) + ": quantity must be a number greater than 0 — got \"" + line.quantity + "\".");
    }
    if (!line.productID || !known[String(line.productID)]) {
      throw new Error("Line " + (i + 1) + ": unknown ProductID \"" + line.productID + "\".");
    }
    ["manufacturingDate", "expiryDate"].forEach(field => {
      if (line[field] && !/^\d{4}-\d{2}-\d{2}$/.test(String(line[field]))) {
        throw new Error("Line " + (i + 1) + ": " + field + " must use YYYY-MM-DD.");
      }
    });
    if (line.manufacturingDate && line.expiryDate && String(line.expiryDate) < String(line.manufacturingDate)) {
      throw new Error("Line " + (i + 1) + ": expiryDate cannot be before manufacturingDate.");
    }
  });
}

const VIRTUAL_LOCATIONS = ["SUPPLIER","CUSTOMER","WEBSITE_SALES","FLIPKART_SALES","FIRSTCRY_SALES","SAMPLES","DAMAGE"];

function validateMovementEndpoints(sourceLocationID, destinationLocationID) {
  const known = {};
  sheetToObjects(SHEETS.LOCATIONS).forEach(location => { known[String(location.LocationID)] = true; });
  VIRTUAL_LOCATIONS.forEach(locationID => { known[locationID] = true; });
  if (!known[String(sourceLocationID || "")]) throw new Error("Unknown source LocationID: " + sourceLocationID);
  if (!known[String(destinationLocationID || "")]) throw new Error("Unknown destination LocationID: " + destinationLocationID);
}

function requiredSourceStock(header, lines) {
  const required = {};
  const opening = ["Opening Balance – WH", "Opening Balance – FBA", "Opening Balance"].includes(header.MovementType);
  if (opening || !header.SourceLocationID || header.SourceLocationID === header.DestinationLocationID || VIRTUAL_LOCATIONS.includes(header.SourceLocationID)) return required;
  lines.forEach(line => {
    const productID = String(line.ProductID || line.productID || "");
    if (header.MovementType === "Assemble Combo" && productID === String(header.ReferenceNumber || "")) return;
    required[productID] = (required[productID] || 0) + Math.abs(parseFloat(line.Quantity !== undefined ? line.Quantity : line.quantity) || 0);
  });
  return required;
}

function assertMovementStockAvailable(header, lines) {
  const required = requiredSourceStock(header, lines);
  const productIDs = Object.keys(required);
  if (!productIDs.length) return;
  const stockRows = getStock({});
  const shortages = productIDs.filter(productID => {
    const available = stockRows
      .filter(row => String(row.ProductID) === productID && String(row.LocationID) === String(header.SourceLocationID))
      .reduce((sum, row) => sum + (parseFloat(row.Quantity) || 0), 0);
    return required[productID] > available;
  }).map(productID => {
    const available = stockRows
      .filter(row => String(row.ProductID) === productID && String(row.LocationID) === String(header.SourceLocationID))
      .reduce((sum, row) => sum + (parseFloat(row.Quantity) || 0), 0);
    return productID + " (need " + required[productID] + ", have " + available + " at " + header.SourceLocationID + ")";
  });
  if (shortages.length) throw new Error("Approval would create negative stock: " + shortages.join("; "));
}

function createMovement(body, staff) {
  requireFields(body, ["movementType","sourceLocationID","destinationLocationID","lines"]);
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new Error("lines must have at least one entry");

  // Validation (2026-08-06): every line needs a real, positive quantity and a
  // ProductID that exists. requireFields only ever rejected an empty string, so
  // "-5" (one stray minus in the qty box), "0" and even "abc" all got through —
  // "-5" silently reverses the intended stock effect and "abc" writes NaN into
  // Movement_Lines.Quantity. Enforced here, not just in the UI, because this API
  // is callable directly. Products are matched on ID regardless of Status, so
  // stock in an archived product can still be moved out.
  validateMovementLines(body.lines);
  validateMovementEndpoints(body.sourceLocationID, body.destinationLocationID);

  // v3.4: Operations Manager (Sravanthi) is scoped to Support Tickets only — no
  // Amazon or warehouse operations. This is a hard code-level block, independent
  // of Feature_Settings.AllowedRoles (which is sheet-editable and shouldn't be
  // the only thing standing between her and movement creation).
  if (staff.Role === "Operations Manager") {
    throw new Error("Operations Manager role is scoped to Support Tickets only — movement creation is not permitted.");
  }

  const OB_TYPES = ["Opening Balance – WH", "Opening Balance – FBA", "Opening Balance"];
  if (OB_TYPES.includes(body.movementType) && staff.Role !== "Founder") {
    throw new Error("Forbidden: Opening Balance can only be entered by the Founder.");
  }

  checkFeatureGate(body.movementType, staff.Role);

  // Step 0 (2026-07-19): negative-stock guard. Previously a typo or double-entry
  // on Stock In/Returns/Damage/dispatch movements could push a physical location
  // negative with no warning — assembleCombo already validated this for combos,
  // but plain createMovement never did. Opening Balance and Assemble Combo are
  // skipped here: Opening Balance only ever adds stock (no consumption), and
  // Assemble Combo already validates its own component shortages before calling
  // this function. Virtual locations (Supplier, Customer, sales-channel sinks,
  // Damage) aren't stock-tracked, so a virtual source needs no check either.
  const OB_TYPES_GUARD = ["Opening Balance – WH", "Opening Balance – FBA", "Opening Balance"];
  const VIRTUAL_SRC = ["SUPPLIER", "CUSTOMER", "WEBSITE_SALES", "FLIPKART_SALES", "FIRSTCRY_SALES", "SAMPLES", "DAMAGE"];
  if (!OB_TYPES_GUARD.includes(body.movementType) && body.movementType !== "Assemble Combo"
      && body.sourceLocationID && !VIRTUAL_SRC.includes(body.sourceLocationID)) {
    const stockRows = getStock({});
    const onHand = function (pid) {
      return stockRows
        .filter(function (s) { return s.ProductID === pid && s.LocationID === body.sourceLocationID; })
        .reduce(function (a, s) { return a + (parseFloat(s.Quantity) || 0); }, 0);
    };
    const shortages = [];
    body.lines.forEach(function (line) {
      const need = parseFloat(line.quantity) || 0;
      const have = onHand(line.productID);
      if (need > have) shortages.push(line.productID + " (need " + need + ", have " + have + " at " + body.sourceLocationID + ")");
    });
    if (shortages.length) {
      throw new Error("Not enough stock at " + body.sourceLocationID + " for this movement: " + shortages.join("; "));
    }
  }

  const movementID = nextID("MOV");
  const ts = now();
  const _docFile = attachmentsToDocumentFile(body, movementID);

  // Child rows are written first; the header is the aggregate's commit marker.
  // A failure before the final header leaves no visible movement and the durable
  // request record identifies the orphan lines for manual recovery.
  const lineIDs = body.lines.map((line, idx) => {
    requireFields(line, ["productID","quantity"]);
    const lineID = movementID + "-L" + String(idx + 1).padStart(3,"0");
    appendRow(SHEETS.MOV_LINES, {
      MovementLineID:    lineID,
      MovementID:        movementID,
      ProductID:         line.productID,
      BatchNumber:       line.batchNumber       || "",
      ManufacturingDate: line.manufacturingDate || "",
      ExpiryDate:        line.expiryDate        || "",
      Quantity:          parseFloat(line.quantity),
      UnitCost:          parseFloat(line.unitCost) || "",
      LineNotes:         line.lineNotes         || "",
    });
    return lineID;
  });

  appendRow(SHEETS.MOV_HEADERS, {
    MovementID:            movementID,
    MovementDateTime:      ts,
    MovementType:          body.movementType,
    SourceLocationID:      body.sourceLocationID,
    DestinationLocationID: body.destinationLocationID,
    ReferenceType:         body.referenceType          || "",
    ReferenceNumber:       body.referenceNumber        || "",
    AmazonShipmentID:      body.amazonShipmentID       || "",
    AmazonDestinationFC:   body.amazonDestinationFC    || "",
    CarrierTrackingNumber: body.carrierTrackingNumber  || "",
    DocumentFile:          (_docFile !== undefined ? _docFile : ""),
    PurchaseOrderID:       body.purchaseOrderID || "",
    Status:                "Draft",
    EnteredByEmail:        staff.Email,
    ApprovedByEmail:       "",
    ApprovedAt:            "",
    ReversalOfMovementID:  "",
    Notes:                 body.notes || "",
  });

  writeLog("createMovement", movementID, staff, `Created ${body.movementType} — ${body.lines.length} line(s)`, body.requestId);
  writeAuditTrail("createMovement", "Movement", movementID, [], staff, body.requestId, body.movementType);
  return { movementID, lineIDs };
}

function approveMovement(body, staff) {
  requireFields(body, ["movementID"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"]);

  const headers  = sheetToObjects(SHEETS.MOV_HEADERS);
  const rowIndex = headers.findIndex(h => h.MovementID === body.movementID);
  if (rowIndex === -1) throw new Error("MovementID not found: " + body.movementID);

  const header = headers[rowIndex];
  if (header.Status === "Approved") throw new Error("Already approved.");
  if (header.Status === "Reversed") throw new Error("Cannot approve a reversed movement.");
  // 2026-08-06: previously only Approved/Reversed were blocked, so a Rejected
  // movement could be approved back into existence through a direct API call.
  if (header.Status === "Rejected") throw new Error("This movement was rejected — create a new one instead of approving it.");
  if (header.Status !== "Draft") throw new Error("Only a Draft movement can be approved. Current status: " + header.Status);

  // Maker-checker (v3.3): the creator of a movement can't also approve it — but
  // only enforced for Admin/Manager. Founder/Co-Founder are exempt (they are
  // the ultimate authority and a hard block would just create friction with no
  // one else to hand approval to) — their self-approvals still get flagged
  // distinctly below so it's visible in review, not a silent exception.
  const isSelf = header.EnteredByEmail === staff.Email;
  if (isSelf && ["Admin","Manager","Warehouse Manager"].includes(staff.Role)) {
    throw new Error("Maker-checker: you created this movement, so you can't also approve it. Ask another approver.");
  }

  const movementLines = sheetToObjects(SHEETS.MOV_LINES).filter(line => line.MovementID === body.movementID);
  if (!movementLines.length) throw new Error("Movement has no lines and cannot be approved.");
  // This check runs while the global business-write lock is held. It evaluates
  // the latest Approved stock, not the earlier quantity seen when the Draft was
  // created, so two competing drafts cannot both consume the same units.
  assertMovementStockAvailable(header, movementLines);

  updateRow(SHEETS.MOV_HEADERS, rowIndex + 2, {
    Status:          "Approved",
    ApprovedByEmail: staff.Email,
    ApprovedAt:      now(),
  });

  writeLog("approveMovement", body.movementID, staff, isSelf ? "Approved [SELF-APPROVED]" : "Approved", body.requestId);
  writeAuditTrail("approveMovement", "Movement", body.movementID, [
    { field: "Status", oldValue: header.Status, newValue: "Approved" },
  ], staff, body.requestId, isSelf ? "Self-approved by " + staff.Role : "");
  try { notifyLowStockOnApproval(body.movementID); } catch (mailErr) { /* email is best-effort — never block approval */ }
  try { checkAnomalies(body.movementID, header, staff, isSelf); } catch (anomErr) { /* best-effort — never block approval */ }
  return { movementID: body.movementID, status: "Approved" };
}

// ── Combo assembly (kitting) ────────────────────────────────────────────────
// Reads the Combo_BOM sheet (ComboProductID, ComponentProductID, Qty). One recipe
// row per component. Reusable for future combos — just add rows, no code change.
function getComboBOM(params) {
  const rows = sheetToObjects(SHEETS.COMBO_BOM);
  return (params && params.comboProductID)
    ? rows.filter(r => String(r.ComboProductID) === String(params.comboProductID))
    : rows;
}

// Assemble N units of a combo: consumes its components from MAIN_WH and produces the
// combo into MAIN_WH, as ONE "Assemble Combo" movement (Draft → approved like any other).
// getStock special-cases this type. Reversing the approved movement cleanly disassembles.
function assembleCombo(body, staff) {
  requireFields(body, ["comboProductID", "quantity"]);
  const combo = String(body.comboProductID);
  const qty   = parseFloat(body.quantity);
  if (!(qty > 0)) throw new Error("Quantity to assemble must be greater than 0.");

  const bom = sheetToObjects(SHEETS.COMBO_BOM)
    .filter(r => String(r.ComboProductID) === combo && (parseFloat(r.Qty) || 0) > 0);
  if (!bom.length) throw new Error("No recipe found for " + combo + ". Add its parts in the Combo_BOM sheet.");

  // Validate every component has enough on-hand in MAIN_WH (backend is the source of truth)
  const stock  = getStock({});
  const onHand = pid => stock
    .filter(s => s.ProductID === pid && s.LocationID === "MAIN_WH")
    .reduce((a, s) => a + (parseFloat(s.Quantity) || 0), 0);

  const componentLines = [];
  const shortages = [];
  bom.forEach(r => {
    const need = qty * (parseFloat(r.Qty) || 0);
    if (onHand(r.ComponentProductID) < need)
      shortages.push(r.ComponentProductID + " (need " + need + ", have " + onHand(r.ComponentProductID) + ")");
    componentLines.push({ productID: r.ComponentProductID, quantity: need });
  });
  if (shortages.length) throw new Error("Not enough stock in Main Warehouse to assemble: " + shortages.join("; "));

  // Output line (the combo) FIRST, then the consumed component lines.
  const lines = [{ productID: combo, quantity: qty }].concat(componentLines);

  const res = createMovement({
    movementType:          "Assemble Combo",
    sourceLocationID:      "MAIN_WH",
    destinationLocationID: "MAIN_WH",
    referenceType:         "Assembly",
    referenceNumber:       combo,
    notes:                 body.notes || ("Assemble " + qty + " x " + combo),
    lines:                 lines,
  }, staff);

  writeLog("assembleCombo", res.movementID, staff, "Assemble " + qty + " x " + combo, body.requestId);
  return { movementID: res.movementID, comboProductID: combo, quantity: qty, components: componentLines };
}

// ── Low-stock email alert (best-effort; fires after an approval) ─────────────
// Matches the in-app login alert exactly: sellable = MAIN_WH + AMAZON_FBA + FBA_TRANSIT
// (Returns Hold excluded — units need QC before sale). Emails active Founders/Co-Founders
// when a product touched by this movement is at LOW tier or worse (<=60% of ReorderLevel,
// or 0). Reuses getStock(), so it automatically respects the reversal fix.
function notifyLowStockOnApproval(movementID) {
  const SELLABLE = ["MAIN_WH","AMAZON_FBA","FBA_TRANSIT"];

  const lines = sheetToObjects(SHEETS.MOV_LINES).filter(l => l.MovementID === movementID);
  if (!lines.length) return;
  const pids = {};
  lines.forEach(l => { pids[l.ProductID] = true; });

  const products  = sheetToObjects(SHEETS.PRODUCTS);
  const stockRows = getStock({});

  const alerts = [];
  Object.keys(pids).forEach(pid => {
    const prod = products.find(p => p.ProductID === pid);
    if (!prod) return;
    const lvl = parseInt(prod.ReorderLevel, 10);
    if (isNaN(lvl) || lvl <= 0) return;
    const qty = stockRows
      .filter(r => r.ProductID === pid && SELLABLE.indexOf(r.LocationID) !== -1)
      .reduce((a, r) => a + (parseFloat(r.Quantity) || 0), 0);
    const pct  = Math.round((qty / lvl) * 100);
    const tier = qty === 0 ? "OUT OF STOCK" : (pct <= 30 ? "CRITICAL" : (pct <= 60 ? "LOW" : null));
    if (tier) alerts.push({ name: prod.ProductName || pid, sku: prod.SKU || "", qty: qty, lvl: lvl, pct: pct, tier: tier });
  });
  if (!alerts.length) return;

  const recips = operationalNotificationRecipients();
  if (!recips.length) return;

  const subject = operationalNotificationSubject("\u26A0\uFE0F Syoat low stock: " + alerts.map(a => a.name).join(", "));
  let body = "Low-stock alert triggered by approval of " + movementID + " on " + now() + ".\n\n";
  alerts.forEach(a => {
    body += "\u2022 " + a.name + (a.sku ? " (" + a.sku + ")" : "") + "\n"
         +  "    On-hand (WH + FBA + Transit): " + a.qty + " / reorder " + a.lvl + "  \u2192  " + a.pct + "%  [" + a.tier + "]\n";
  });
  body += "\nOpen the Syoat Inventory ERP to review and reorder.";

  MailApp.sendEmail(recips.join(","), subject, body);
}

// ── Private attachment storage in Google Drive ───────────────────────────────
// Files stay PRIVATE in Drive. The sheet stores opaque descriptors, never public
// view/thumbnail links. Authenticated employees retrieve bytes through
// getOperationalFile(), which also verifies the file belongs to a movement they
// are allowed to see.
function attachmentsToDocumentFile(body, movementID) {
  if (Array.isArray(body.attachmentImages) && body.attachmentImages.length) {
    return JSON.stringify(saveAttachmentsToDrive(body.attachmentImages, movementID, body.movementType));
  }
  if (body.documentFile !== undefined) return body.documentFile; // legacy path
  return undefined;
}

function extractDriveFileId(reference) {
  if (!reference) return "";
  if (typeof reference === "object" && reference.fileId) return String(reference.fileId);
  const value = String(reference);
  const query = value.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (query) return query[1];
  const path = value.match(/\/d\/([A-Za-z0-9_-]{10,})/);
  if (path) return path[1];
  if (/^[A-Za-z0-9_-]{10,}$/.test(value)) return value;
  return "";
}

function parseStoredFileReferences(documentFile) {
  if (!documentFile) return [];
  let values = [documentFile];
  if (typeof documentFile === "string" && documentFile.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(documentFile);
      if (Array.isArray(parsed)) values = parsed;
    } catch (e) { values = [documentFile]; }
  }
  return values.map(value => {
    if (value && typeof value === "object") return value;
    const fileId = extractDriveFileId(value);
    if (fileId) return { fileId: fileId, name: "Operational file", mimeType: "" };
    if (typeof value === "string" && value.startsWith("data:")) return { inlineData: value };
    return null;
  }).filter(Boolean);
}

function hardenDriveFile(file) {
  // New Drive files are private by default; this explicit call makes the policy
  // fail-safe if a parent/default ever changes. Direct viewers/editors are also
  // removed so access occurs through the authenticated ERP route only.
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.EDIT);
  try { file.getViewers().forEach(user => file.removeViewer(user.getEmail())); } catch (e) {}
  try { file.getEditors().forEach(user => file.removeEditor(user.getEmail())); } catch (e) {}
  try { file.setSecurityUpdateEnabled(true); } catch (e) {}
  return file;
}

function privateFileDescriptor(file) {
  return {
    fileId: file.getId(),
    name: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
  };
}

// ── Attachment folder routing (v3.2) ────────────────────────────────────────
// Routes new attachments straight into the correct Syoat/Syoat Inventory ERP/
// subfolder based on movement type, instead of the old flat "Syoat ERP
// Attachments" folder. See CLAUDE.md Section 7.5 for the folder map and the
// one-time migrateAttachmentsToFolders() below that moved existing files.
function getInventoryErpRoot() {
  const folderId = String(authProperties().getProperty(DRIVE_CONFIG.ROOT_FOLDER_PROPERTY) || "").trim();
  if (!folderId) return null;
  try { return DriveApp.getFolderById(folderId); }
  catch (error) { throw new Error("Configured operational Drive root is unavailable."); }
}

function getLegacyAttachmentsFolder() {
  const folderId = String(authProperties().getProperty(DRIVE_CONFIG.LEGACY_FOLDER_PROPERTY) || "").trim();
  if (!folderId) return null;
  try { return DriveApp.getFolderById(folderId); }
  catch (error) { throw new Error("Configured legacy attachment folder is unavailable."); }
}

function getOrCreateSubfolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// Resolves a "A/B" style relative path under the ERP root, creating any
// missing folder along the way. Returns null if the ERP root itself is missing.
function resolveErpFolderPath(relativePath) {
  const root = getInventoryErpRoot();
  if (!root) return null;
  let folder = root;
  relativePath.split("/").forEach(name => { folder = getOrCreateSubfolder(folder, name); });
  return folder;
}

// MovementType -> folder path under "Syoat Inventory ERP/". Anything not
// listed here falls back to "11_Other_Attachments".
const ATTACHMENT_FOLDER_MAP = {
  "Stock In":          "02_Supplier_Invoices",
  "Damage":            "08_Damage_Photos",
  "Returns – to WH":   "09_Returns",
  "Returns – Damaged": "09_Returns",
  "Samples":           "10_Samples",
  "FBA Dispatch":      "03_FBA_Documents/02_Shipment_Plans_Labels",
  "FBA Receipt":       "03_FBA_Documents/02_Shipment_Plans_Labels",
};

function getAttachmentFolder(movementType) {
  const relPath = ATTACHMENT_FOLDER_MAP[movementType] || "11_Other_Attachments";
  const folder = resolveErpFolderPath(relPath);
  if (folder) return folder;
  throw new Error("Operational Drive root is not configured.");
}

// Decodes each data-URL, writes it privately, and returns opaque descriptors.
function saveAttachmentsToDrive(dataUrls, movementID, movementType) {
  const folder = getAttachmentFolder(movementType);
  const files = [];
  // Backstop only — the frontend now refuses the 5th attachment at selection
  // time (MAX_ATTACH in syoat-app.js). Keep these two numbers in step.
  (dataUrls || []).slice(0, 4).forEach((dataUrl, i) => {
    if (typeof dataUrl !== "string") return;
    const marker = "base64,";
    const idx = dataUrl.indexOf(marker);
    if (idx === -1) return;
    const header      = dataUrl.substring(0, idx);
    // 2026-08-06: PDFs are now stored instead of silently dropped. The picker
    // has always accepted application/pdf and the notes claimed one was
    // attached, but the frontend filtered uploads to data:image only, so the
    // file never reached Drive. Supplier invoices are usually PDFs.
    const isPdf       = header.indexOf("pdf") !== -1;
    const isPng       = header.indexOf("png") !== -1;
    const contentType = isPdf ? "application/pdf" : (isPng ? "image/png" : "image/jpeg");
    const ext         = isPdf ? ".pdf" : (isPng ? ".png" : ".jpg");
    const bytes = Utilities.base64Decode(dataUrl.substring(idx + marker.length));
    const blob  = Utilities.newBlob(bytes, contentType, (movementID || "ATT") + "_" + (i + 1) + ext);
    const file  = hardenDriveFile(folder.createFile(blob));
    files.push(privateFileDescriptor(file));
  });
  return files;
}

function getOperationalFile(body, staff) {
  requireFields(body, ["movementID", "fileId"]);
  const movements = sheetToObjects(SHEETS.MOV_HEADERS);
  const movement = movements.find(row => String(row.MovementID) === String(body.movementID));
  if (!movement) throw new Error("Operational file not found.");
  if (!capabilitiesForRole(staff.Role).includes("inventory.movements.viewAll") && normaliseEmail(movement.EnteredByEmail) !== normaliseEmail(staff.Email)) {
    throw new Error("Forbidden: this file belongs to another employee's movement.");
  }
  const allowed = parseStoredFileReferences(movement.DocumentFile)
    .some(reference => String(reference.fileId || "") === String(body.fileId));
  if (!allowed) throw new Error("Operational file not found.");

  const file = DriveApp.getFileById(String(body.fileId));
  if (file.getSize() > OPERATIONS_CONFIG.MAX_FILE_BYTES) throw new Error("This file is too large for in-app viewing. Ask a Founder for access.");
  const blob = file.getBlob();
  const mimeType = blob.getContentType() || file.getMimeType() || "application/octet-stream";
  const encoded = Utilities.base64Encode(blob.getBytes());
  writeAuditTrail("getOperationalFile", "MovementFile", body.movementID, [], staff, body.requestId || CURRENT_CORRELATION_ID, "Viewed " + file.getName());
  return {
    name: file.getName(),
    mimeType: mimeType,
    size: file.getSize(),
    dataUrl: "data:" + mimeType + ";base64," + encoded,
  };
}

// ── One-time migration: move existing attachments out of the flat
// "Syoat ERP Attachments" folder into the correct Syoat Inventory ERP
// subfolder (see ATTACHMENT_FOLDER_MAP above). Run this ONCE manually from
// the Apps Script editor: select migrateAttachmentsToFolders in the function
// dropdown and click Run. File IDs remain valid when files move folders.
function migrateAttachmentsToFolders() {
  const oldFolder = getLegacyAttachmentsFolder();
  if (!oldFolder) {
    Logger.log("No legacy attachment folder ID is configured — nothing to migrate.");
    return;
  }

  const headers = sheetToObjects(SHEETS.MOV_HEADERS);
  const typeById = {};
  headers.forEach(h => { typeById[h.MovementID] = h.MovementType; });

  const moved = {};    // destination path -> count
  const skipped = [];  // filenames we couldn't confidently route

  const files = oldFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    const m = name.match(/^(MOV-\d+)/);
    if (!m) { skipped.push(name + " (no MovementID prefix)"); continue; }

    const movementId = m[1];
    const movementType = typeById[movementId];
    if (!movementType) { skipped.push(name + " (MovementID " + movementId + " not found in Movement_Headers)"); continue; }

    const relPath = ATTACHMENT_FOLDER_MAP[movementType] || "11_Other_Attachments";
    const destFolder = resolveErpFolderPath(relPath);
    if (!destFolder) { skipped.push(name + " (ERP root folder 'Syoat Inventory ERP' not found)"); continue; }

    destFolder.addFile(file);
    const parents = file.getParents();
    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getId() !== destFolder.getId()) parent.removeFile(file);
    }

    moved[relPath] = (moved[relPath] || 0) + 1;
  }

  Logger.log("Moved: " + JSON.stringify(moved));
  Logger.log("Skipped (" + skipped.length + "): " + skipped.join(" | "));
}

function visitDriveFolder(folder, visitor) {
  const files = folder.getFiles();
  while (files.hasNext()) visitor(files.next());
  const folders = folder.getFolders();
  while (folders.hasNext()) visitDriveFolder(folders.next(), visitor);
}

// Manual pre-deployment migration. It revokes link/domain and direct-user
// access from files under the ERP root and legacy attachment folder, then
// rewrites movement cells from old Drive URLs to private descriptors.
function normalizeOperationalFileReferences() {
  let referencesUpdated = 0;
  const movements = sheetToObjects(SHEETS.MOV_HEADERS);
  movements.forEach((movement, index) => {
    const refs = parseStoredFileReferences(movement.DocumentFile);
    if (!refs.some(ref => ref.fileId)) return;
    const normalized = refs.map(ref => ref.inlineData || {
      fileId: ref.fileId,
      name: ref.name || "Operational file",
      mimeType: ref.mimeType || "",
      size: ref.size || "",
    });
    const nextValue = JSON.stringify(normalized);
    if (nextValue !== String(movement.DocumentFile || "")) {
      updateRow(SHEETS.MOV_HEADERS, index + 2, { DocumentFile: nextValue });
      referencesUpdated++;
    }
  });
  return referencesUpdated;
}

// Safe to run repeatedly. Each invocation scans both configured roots, skips
// files already private with no direct users, and hardens only a bounded batch
// so Apps Script's execution limit cannot strand every run at the same point.
// Sheet references are normalized only after no exposed files remain.
function hardenOperationalDriveFiles() {
  return withBusinessWriteLock(function () {
    const stats = {
      checked: 0,
      alreadyPrivate: 0,
      filesHardened: 0,
      remaining: 0,
      referencesUpdated: 0,
      errors: [],
    };
    const seen = {};
    const harden = function (file) {
      if (seen[file.getId()]) return;
      seen[file.getId()] = true;
      stats.checked++;
      try {
        const privateAccess = String(file.getSharingAccess()) === String(DriveApp.Access.PRIVATE);
        const directViewers = file.getViewers().length;
        const directEditors = file.getEditors().length;
        if (privateAccess && !directViewers && !directEditors) {
          stats.alreadyPrivate++;
          return;
        }
        if (stats.filesHardened >= OPERATIONS_CONFIG.FILE_HARDEN_BATCH_SIZE) {
          stats.remaining++;
          return;
        }
        hardenDriveFile(file);
        stats.filesHardened++;
      }
      catch (error) { stats.errors.push(file.getId() + ": " + String(error.message || error)); }
    };

    const root = getInventoryErpRoot();
    if (root) visitDriveFolder(root, harden);
    const legacy = getLegacyAttachmentsFolder();
    if (legacy) visitDriveFolder(legacy, harden);

    if (stats.remaining === 0 && stats.errors.length === 0) {
      stats.referencesUpdated = normalizeOperationalFileReferences();
    }
    Logger.log("Operational file hardening: " + JSON.stringify(stats));
    return stats;
  });
}

// Read-only manual verification used before and after the migration.
function auditOperationalFilePrivacy() {
  const result = { checked: 0, private: 0, exposed: [], errors: [] };
  const seen = {};
  const inspect = function (file) {
    if (seen[file.getId()]) return;
    seen[file.getId()] = true;
    result.checked++;
    try {
      const access = String(file.getSharingAccess());
      const viewers = file.getViewers().map(user => user.getEmail());
      const editors = file.getEditors().map(user => user.getEmail());
      if (access === String(DriveApp.Access.PRIVATE) && !viewers.length && !editors.length) result.private++;
      else result.exposed.push({ fileId: file.getId(), name: file.getName(), access: access, viewers: viewers, editors: editors });
    } catch (error) {
      result.errors.push({ fileId: file.getId(), error: String(error.message || error) });
    }
  };
  const root = getInventoryErpRoot();
  if (root) visitDriveFolder(root, inspect);
  const legacy = getLegacyAttachmentsFolder();
  if (legacy) visitDriveFolder(legacy, inspect);
  Logger.log("Operational file privacy audit: " + JSON.stringify({
    checked: result.checked,
    private: result.private,
    exposedCount: result.exposed.length,
    errorCount: result.errors.length,
    exposedSample: result.exposed.slice(0, 10),
    errorSample: result.errors.slice(0, 10),
  }));
  return result;
}

// ──────────────────────────────────────────────────────────
//  v3.1: FBA Inventory Ledger reconciliation
//  Frontend parses the Ledger SUMMARY, aggregates SELLABLE on-hand per
//  ProductID (matched by ASIN) and POSTs items[]. We archive the raw file
//  to Drive (Syoat Inventory ERP > 03_FBA_Documents > 01_Inventory_Ledgers,
//  found by name) and create one PENDING stock count at AMAZON_FBA per
//  CHANGED product. Manager approval then makes the adjustment movement via
//  the existing approveStockCount flow — full audit, no new stock logic.
// ──────────────────────────────────────────────────────────
function getLedgerArchiveFolder() {
  var root = getInventoryErpRoot();
  if (!root) return null;
  var fbaIt = root.getFoldersByName("03_FBA_Documents");
  if (!fbaIt.hasNext()) return null;
  var fba = fbaIt.next();
  var subIt = fba.getFoldersByName("01_Inventory_Ledgers");
  return subIt.hasNext() ? subIt.next() : fba.createFolder("01_Inventory_Ledgers");
}

function saveLedgerToDrive(fileName, fileText, mime) {
  var folder = getLedgerArchiveFolder();
  if (!folder || !fileText) return null;
  var blob = Utilities.newBlob(fileText, mime || "text/csv", fileName);
  var file = hardenDriveFile(folder.createFile(blob));
  return privateFileDescriptor(file);
}

function createFbaReconciliation(body, staff) {
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"]);
  var items = body.items || [];
  var fcSnapshotIn = Array.isArray(body.fcSnapshot) ? body.fcSnapshot : [];
  // A week where every product already matches the ledger (no adjustments
  // needed) still needs its history row saved for week-over-week comparisons —
  // only reject if there's truly nothing to do at all.
  if (!items.length && !fcSnapshotIn.length) throw new Error("No products to reconcile.");

  var driveFile = null;
  try {
    if (body.fileText) {
      var ext   = (body.fileMime === "text/plain") ? ".txt" : ".csv";
      var who   = String(staff.Name || staff.Email || "staff").split(" ")[0];
      var stamp = body.reportDate || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
      driveFile = saveLedgerToDrive(stamp + "_FBA-Ledger_" + who + ext, body.fileText, body.fileMime || "text/csv");
    }
  } catch (e) { driveFile = null; }

  var note = "FBA Ledger " + (body.reportDate || "") + (driveFile ? " | private-file:" + driveFile.fileId : "");
  var applied = 0, unchanged = 0;
  items.forEach(function (it) {
    var pid = it.productID;
    var ledgerQty = parseFloat(it.ledgerQty);
    if (!pid || isNaN(ledgerQty)) return;
    var rows = getStock({ productId: pid, locationId: "AMAZON_FBA" });
    var sys  = rows.length ? Number(rows[0].Quantity) : 0;
    var diff = ledgerQty - sys;
    if (diff === 0) { unchanged++; return; }
    var isPos = diff > 0;
    // create the adjustment movement and APPROVE it immediately (auto-apply)
    var mv = createMovement({
      movementType:          "Stock Adjustment",
      sourceLocationID:      isPos ? "SUPPLIER"   : "AMAZON_FBA",
      destinationLocationID: isPos ? "AMAZON_FBA" : "DAMAGE",
      referenceType:         "FBA Ledger",
      referenceNumber:       body.reportDate || "",
      notes:                 note,
      lines: [{ productID: pid, quantity: Math.abs(diff), lineNotes: "FBA ledger sync" }],
    }, staff);
    approveMovement({ movementID: mv.movementID }, staff);
    // write an already-Approved audit row into Stock_Counts (history + traceability)
    var countID = nextID("CNT");
    appendRow(SHEETS.STOCK_COUNTS, {
      CountID:              countID,
      CountDateTime:        now(),
      LocationID:           "AMAZON_FBA",
      ProductID:            pid,
      SystemQty:            sys,
      PhysicalQty:          ledgerQty,
      Difference:           diff,
      CountedByEmail:       staff.Email,
      ApprovedByEmail:      staff.Email,
      Status:               "Approved",
      Reason:               "FBA Ledger Reconcile",
      AdjustmentMovementID: mv.movementID,
      Notes:                note,
    });
    applied++;
  });

  // 2026-07-24: persist the FULL per-product-per-FC breakdown of this upload —
  // not just the products that had a delta — so week-over-week comparisons
  // (Locations–FC, Recommendations, Analytics) have real history to compare
  // against instead of only ever seeing the single latest snapshot. Uploads
  // happen weekly (Monday mornings), so "history" here means one row set per
  // Monday, not a daily series — deliberately not over-building for a
  // cadence that doesn't exist. Silently no-ops (does not fail the whole
  // reconciliation) if the sheet doesn't exist yet or fcSnapshot wasn't sent,
  // so this never blocks the reconciliation itself.
  var snapshotSaved = 0;
  try {
    var fcSnapshot = Array.isArray(body.fcSnapshot) ? body.fcSnapshot : [];
    var reportDate = body.reportDate || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
    var uploadedAt = now();
    fcSnapshot.forEach(function (row) {
      if (!row.productID || !row.fc) return;
      appendRow(SHEETS.FBA_LEDGER_SNAPSHOTS, {
        SnapshotID:      "LSN-" + reportDate + "-" + row.fc + "-" + row.productID,
        ReportDate:      reportDate,
        ProductID:       row.productID,
        FC:              row.fc,
        Qty:             parseFloat(row.qty) || 0,
        Sold:            parseFloat(row.sold) || 0,
        UploadedByEmail: staff.Email,
        UploadedAt:      uploadedAt,
      });
      snapshotSaved++;
    });
  } catch (e) { /* sheet may not exist yet — don't fail the reconciliation over it */ }

  writeLog("createFbaReconciliation", (body.reportDate || "-"), staff,
    "FBA auto-sync: " + applied + " adjusted, " + unchanged + " unchanged, " + snapshotSaved + " FC-snapshot row(s). " + (driveFile ? "private-file:" + driveFile.fileId : "no-file"),
    body.requestId);
  return { appliedCount: applied, unchanged: unchanged, ledgerArchived: !!driveFile };
}

// Weekly ledger history for week-over-week comparisons (Locations–FC deltas,
// Recommendations "did the refill happen", Analytics trend). One row per
// product per FC per upload — see createFbaReconciliation for how rows get
// written. Read-only, no role gate beyond normal Amazon-tab access checked
// client-side, same as getFbaShipments.
function getFbaLedgerSnapshots(params) {
  params = params || {};
  var rows;
  try { rows = sheetToObjects(SHEETS.FBA_LEDGER_SNAPSHOTS); } catch (e) { return []; }
  if (params.productID) rows = rows.filter(function (r) { return r.ProductID === params.productID; });
  if (params.fc)         rows = rows.filter(function (r) { return r.FC === params.fc; });
  rows.sort(function (a, b) { return String(a.ReportDate).localeCompare(String(b.ReportDate)); });
  return rows;
}

function reverseMovement(body, staff) {
  // 2026-08-06: reason is now required server-side too. The UI and the staff
  // guides both say it is mandatory, but the API accepted a reversal without one.
  requireFields(body, ["movementID","reason"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"]);

  const headers  = sheetToObjects(SHEETS.MOV_HEADERS);
  const original = headers.find(h => h.MovementID === body.movementID);
  if (!original) throw new Error("MovementID not found: " + body.movementID);
  if (original.Status !== "Approved") throw new Error("Only Approved movements can be reversed.");

  const originalLines = sheetToObjects(SHEETS.MOV_LINES).filter(l => l.MovementID === body.movementID);
  if (!originalLines.length) throw new Error("Movement has no lines and cannot be reversed.");
  const reverseID = nextID("MOV");
  const ts = now();

  const reversalHeader = {
    MovementType: "Reversal",
    SourceLocationID: original.DestinationLocationID,
    DestinationLocationID: original.SourceLocationID,
    ReferenceNumber: original.ReferenceNumber,
  };
  assertMovementStockAvailable(reversalHeader, originalLines);

  const reversalLineIDs = originalLines.map((line, idx) => {
    const lineID = reverseID + "-L" + String(idx+1).padStart(3,"0");
    appendRow(SHEETS.MOV_LINES, {
      MovementLineID:    lineID,
      MovementID:        reverseID,
      ProductID:         line.ProductID,
      BatchNumber:       line.BatchNumber       || "",
      ManufacturingDate: line.ManufacturingDate || "",
      ExpiryDate:        line.ExpiryDate        || "",
      Quantity:          parseFloat(line.Quantity),
      UnitCost:          line.UnitCost          || "",
      LineNotes:         "Reversal of " + line.MovementLineID,
    });
    return lineID;
  });

  appendRow(SHEETS.MOV_HEADERS, {
    MovementID:            reverseID,
    MovementDateTime:      ts,
    MovementType:          "Reversal",
    SourceLocationID:      original.DestinationLocationID,
    DestinationLocationID: original.SourceLocationID,
    ReferenceType:         "Reversal",
    ReferenceNumber:       original.ReferenceNumber,
    AmazonShipmentID:      "",
    AmazonDestinationFC:   "",
    CarrierTrackingNumber: "",
    DocumentFile:          "",
    Status:                "Approved",
    EnteredByEmail:        staff.Email,
    ApprovedByEmail:       staff.Email,
    ApprovedAt:            ts,
    ReversalOfMovementID:  body.movementID,
    Notes:                 body.reason || "Reversal of " + body.movementID,
  });

  const origIdx = headers.findIndex(h => h.MovementID === body.movementID);
  updateRow(SHEETS.MOV_HEADERS, origIdx + 2, { Status: "Reversed" });

  writeLog("reverseMovement", body.movementID, staff, "Reversed → " + reverseID, body.requestId);
  writeAuditTrail("reverseMovement", "Movement", body.movementID, [
    { field: "Status", oldValue: original.Status, newValue: "Reversed" },
  ], staff, body.requestId, "Reason: " + (body.reason || "") + " | Reversal movement: " + reverseID);
  return { originalMovementID: body.movementID, reversalMovementID: reverseID, reversalLineIDs };
}

function editMovement(body, staff) {
  requireFields(body, ["movementID","lines"]);
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new Error("lines must have at least one entry");
  validateMovementLines(body.lines);

  const headers  = sheetToObjects(SHEETS.MOV_HEADERS);
  const rowIndex = headers.findIndex(h => h.MovementID === body.movementID);
  if (rowIndex === -1) throw new Error("MovementID not found: " + body.movementID);
  const header = headers[rowIndex];

  if (header.Status !== "Draft") throw new Error("Only Draft movements can be edited. Reject it and create a new one instead.");

  // Only the person who entered it, or someone who can approve, may edit it
  const canEditAny = ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"].includes(staff.Role);
  if (header.EnteredByEmail !== staff.Email && !canEditAny) {
    throw new Error("You can only edit movements you created.");
  }

  const headerUpdates = {};
  if (body.referenceNumber       !== undefined) headerUpdates.ReferenceNumber       = body.referenceNumber;
  if (body.carrierTrackingNumber !== undefined) headerUpdates.CarrierTrackingNumber = body.carrierTrackingNumber;
  if (body.notes                 !== undefined) headerUpdates.Notes                 = body.notes;
  if (Array.isArray(body.attachmentImages) && body.attachmentImages.length)
                                                headerUpdates.DocumentFile          = JSON.stringify(saveAttachmentsToDrive(body.attachmentImages, body.movementID));
  else if (body.documentFile     !== undefined) headerUpdates.DocumentFile          = body.documentFile;

  // Structured audit trail (v3.3): capture old→new per changed header field BEFORE
  // overwriting — this is the one place data used to be lost with no before/after record.
  const fieldChanges = Object.keys(headerUpdates)
    .filter(k => String(header[k] || "") !== String(headerUpdates[k] || ""))
    .map(k => ({ field: k, oldValue: header[k] || "", newValue: headerUpdates[k] }));

  if (Object.keys(headerUpdates).length > 0) {
    updateRow(SHEETS.MOV_HEADERS, rowIndex + 2, headerUpdates);
  }

  // Replace existing lines with the corrected set (delete bottom-up so row numbers stay valid)
  const lineSheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MOV_LINES);
  const allLines   = sheetToObjects(SHEETS.MOV_LINES);
  const oldLinesSummary = allLines
    .filter(l => l.MovementID === body.movementID)
    .map(l => l.ProductID + ":" + l.Quantity).join(", ");
  const rowsToKill = [];
  allLines.forEach((l, idx) => { if (l.MovementID === body.movementID) rowsToKill.push(idx + 2); });
  rowsToKill.sort((a, b) => b - a).forEach(r => lineSheet.deleteRow(r));

  const lineIDs = body.lines.map((line, idx) => {
    requireFields(line, ["productID","quantity"]);
    const lineID = body.movementID + "-L" + String(idx + 1).padStart(3,"0");
    appendRow(SHEETS.MOV_LINES, {
      MovementLineID:    lineID,
      MovementID:        body.movementID,
      ProductID:         line.productID,
      BatchNumber:       line.batchNumber       || "",
      ManufacturingDate: line.manufacturingDate || "",
      ExpiryDate:        line.expiryDate        || "",
      Quantity:          parseFloat(line.quantity),
      UnitCost:          parseFloat(line.unitCost) || "",
      LineNotes:         line.lineNotes         || "",
    });
    return lineID;
  });

  writeLog("editMovement", body.movementID, staff, `Edited draft — ${body.lines.length} line(s)`, body.requestId);
  const newLinesSummary = body.lines.map(l => l.productID + ":" + l.quantity).join(", ");
  writeAuditTrail("editMovement", "Movement", body.movementID,
    fieldChanges.concat([{ field: "Lines", oldValue: oldLinesSummary, newValue: newLinesSummary }]),
    staff, body.requestId, "");
  return { movementID: body.movementID, lineIDs };
}

function rejectMovement(body, staff) {
  requireFields(body, ["movementID"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"]);

  const headers  = sheetToObjects(SHEETS.MOV_HEADERS);
  const rowIndex = headers.findIndex(h => h.MovementID === body.movementID);
  if (rowIndex === -1) throw new Error("MovementID not found: " + body.movementID);
  const header = headers[rowIndex];

  if (header.Status === "Approved") throw new Error("Cannot reject an already approved movement. Use Reverse instead.");
  if (header.Status === "Rejected") throw new Error("Already rejected.");

  updateRow(SHEETS.MOV_HEADERS, rowIndex + 2, {
    Status:          "Rejected",
    ApprovedByEmail: staff.Email,
    ApprovedAt:      now(),
    Notes:           (header.Notes || "") + (body.reason ? " | Rejected: " + body.reason : " | Rejected"),
  });

  writeLog("rejectMovement", body.movementID, staff, "Rejected" + (body.reason ? ": " + body.reason : ""), body.requestId);
  writeAuditTrail("rejectMovement", "Movement", body.movementID, [
    { field: "Status", oldValue: header.Status, newValue: "Rejected" },
  ], staff, body.requestId, body.reason || "");
  return { movementID: body.movementID, status: "Rejected" };
}

function createSalesOrder(body, staff) {
  requireFields(body, ["channel","lines"]);
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new Error("lines must not be empty");
  validateMovementLines(body.lines);
  validateMovementEndpoints(body.sourceLocationID || "MAIN_WH", "CUSTOMER");

  const orderID = nextID("ORD");
  const ts = now();

  const lineIDs = body.lines.map((line, idx) => {
    const lineID = orderID + "-L" + String(idx+1).padStart(3,"0");
    appendRow(SHEETS.SALES_LINES, {
      OrderLineID: lineID,
      OrderID:     orderID,
      ProductID:   line.productID,
      Quantity:    parseFloat(line.quantity),
      UnitPrice:   parseFloat(line.unitPrice) || "",
      LineStatus:  line.lineStatus || "Pending",
      Notes:       line.notes     || "",
    });
    return lineID;
  });

  appendRow(SHEETS.SALES_ORDERS, {
    OrderID:             orderID,
    Channel:             body.channel,
    ExternalOrderNumber: body.externalOrderNumber || "",
    AWBBarcode:          body.awbBarcode          || "",
    OrderDateTime:       body.orderDateTime        || ts,
    PaymentStatus:       body.paymentStatus        || "Pending",
    FulfilmentStatus:    "Pending",
    SourceLocationID:    body.sourceLocationID     || "MAIN_WH",
    CustomerName:        body.customerName         || "",
    ImportedAt:          ts,
    DispatchMovementID:  "",
    Status:              "Active",
    Notes:               body.notes               || "",
  });

  writeLog("createSalesOrder", orderID, staff, `${body.channel} order — ${body.lines.length} line(s)`);
  return { orderID, lineIDs };
}

function dispatchSalesOrder(body, staff) {
  requireFields(body, ["orderID"]);
  const orders   = sheetToObjects(SHEETS.SALES_ORDERS);
  const orderIdx = orders.findIndex(o => o.OrderID === body.orderID);
  if (orderIdx === -1) throw new Error("OrderID not found: " + body.orderID);

  const order = orders[orderIdx];
  if (order.FulfilmentStatus === "Dispatched") throw new Error("Order already dispatched.");

  const orderLines = sheetToObjects(SHEETS.SALES_LINES)
    .filter(l => l.OrderID === body.orderID && l.LineStatus !== "Cancelled");
  if (orderLines.length === 0) throw new Error("No active lines for order " + body.orderID);

  const { movementID } = createMovement({
    movementType:          "Website Dispatch",
    sourceLocationID:      order.SourceLocationID || "MAIN_WH",
    destinationLocationID: "CUSTOMER",
    referenceType:         "Sales Order",
    referenceNumber:       body.orderID,
    carrierTrackingNumber: body.carrierTrackingNumber || "",
    notes:                 body.notes || "",
    lines: orderLines.map(l => ({ productID: l.ProductID, quantity: parseFloat(l.Quantity), lineNotes: l.OrderLineID })),
  }, staff);

  approveMovement({ movementID }, staff);

  updateRow(SHEETS.SALES_ORDERS, orderIdx + 2, {
    FulfilmentStatus:   "Dispatched",
    AWBBarcode:         body.awbBarcode || order.AWBBarcode,
    DispatchMovementID: movementID,
  });

  writeLog("dispatchSalesOrder", body.orderID, staff, "Dispatched via " + movementID);
  return { orderID: body.orderID, dispatchMovementID: movementID };
}

function createStockCount(body, staff) {
  requireFields(body, ["locationID","productID","physicalQty"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager","Accounts"]);

  const stockRows = getStock({ productId: body.productID, locationId: body.locationID });
  const systemQty = stockRows.length > 0 ? stockRows[0].Quantity : 0;
  const physQty   = parseFloat(body.physicalQty);
  if (!isFinite(physQty) || physQty < 0) throw new Error("physicalQty must be a number greater than or equal to 0.");
  validateMovementLines([{ productID: body.productID, quantity: Math.max(physQty, 1) }]);
  validateMovementEndpoints(body.locationID, body.locationID);
  const diff      = physQty - systemQty;
  const countID   = nextID("CNT");

  appendRow(SHEETS.STOCK_COUNTS, {
    CountID:              countID,
    CountDateTime:        body.countDateTime || now(),
    LocationID:           body.locationID,
    ProductID:            body.productID,
    SystemQty:            systemQty,
    PhysicalQty:          physQty,
    Difference:           diff,
    CountedByEmail:       staff.Email,
    ApprovedByEmail:      "",
    Status:               "Pending",
    Reason:               body.reason || "",
    AdjustmentMovementID: "",
    Notes:                body.notes  || "",
  });

  writeLog("createStockCount", countID, staff, `${body.productID}@${body.locationID} diff:${diff}`, body.requestId);
  writeAuditTrail("createStockCount", "StockCount", countID, [], staff, body.requestId, body.productID + "@" + body.locationID + " diff:" + diff);
  return { countID, systemQty, physicalQty: physQty, difference: diff };
}

function editStockCount(body, staff) {
  requireFields(body, ["countID","physicalQty"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager","Accounts"]);

  const counts = sheetToObjects(SHEETS.STOCK_COUNTS);
  const orig   = counts.find(c => c.CountID === body.countID);
  if (!orig) throw new Error("CountID not found: " + body.countID);
  if (orig.Status === "Approved") throw new Error("Cannot edit an already approved count. Reject it first.");

  const stockRows = getStock({ productId: orig.ProductID, locationId: orig.LocationID });
  const systemQty = stockRows.length > 0 ? stockRows[0].Quantity : 0;
  const physQty   = parseFloat(body.physicalQty);
  if (!isFinite(physQty) || physQty < 0) throw new Error("physicalQty must be a number greater than or equal to 0.");
  const diff      = physQty - systemQty;
  const newCountID = nextID("CNT");

  appendRow(SHEETS.STOCK_COUNTS, {
    CountID:              newCountID,
    CountDateTime:        now(),
    LocationID:           orig.LocationID,
    ProductID:            orig.ProductID,
    SystemQty:            systemQty,
    PhysicalQty:          physQty,
    Difference:           diff,
    CountedByEmail:       staff.Email,
    ApprovedByEmail:      "",
    Status:               "Pending",
    Reason:               orig.Reason || "",
    AdjustmentMovementID: "",
    Notes:                `Corrected from ${orig.PhysicalQty} to ${physQty}. Original: ${body.countID}. ${body.notes || ""}`.trim(),
  });

  const origIdx = counts.findIndex(c => c.CountID === body.countID);
  updateRow(SHEETS.STOCK_COUNTS, origIdx + 2, {
    Status: "Rejected",
    Notes:  (orig.Notes || "") + " | Superseded by " + newCountID,
  });

  writeLog("editStockCount", body.countID, staff, `Corrected → ${newCountID}`, body.requestId);
  writeAuditTrail("editStockCount", "StockCount", body.countID, [
    { field: "PhysicalQty", oldValue: orig.PhysicalQty, newValue: physQty },
    { field: "Status",      oldValue: orig.Status,      newValue: "Rejected (superseded by " + newCountID + ")" },
  ], staff, body.requestId, "");
  return { originalCountID: body.countID, newCountID, systemQty, physicalQty: physQty, difference: diff };
}

function rejectStockCount(body, staff) {
  requireFields(body, ["countID"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"]);

  const counts = sheetToObjects(SHEETS.STOCK_COUNTS);
  const idx    = counts.findIndex(c => c.CountID === body.countID);
  if (idx === -1) throw new Error("CountID not found: " + body.countID);
  if (counts[idx].Status === "Approved") throw new Error("Cannot reject an already approved count.");

  updateRow(SHEETS.STOCK_COUNTS, idx + 2, {
    Status:          "Rejected",
    ApprovedByEmail: staff.Email,
    Notes:           (counts[idx].Notes || "") + " | Rejected by " + staff.Email,
  });

  writeLog("rejectStockCount", body.countID, staff, "Count rejected.", body.requestId);
  writeAuditTrail("rejectStockCount", "StockCount", body.countID, [
    { field: "Status", oldValue: counts[idx].Status, newValue: "Rejected" },
  ], staff, body.requestId, "");
  return { countID: body.countID, status: "Rejected" };
}

function approveStockCount(body, staff) {
  requireFields(body, ["countID"]);
  requireRole(staff, ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"]);

  const counts = sheetToObjects(SHEETS.STOCK_COUNTS);
  const idx    = counts.findIndex(c => c.CountID === body.countID);
  if (idx === -1) throw new Error("CountID not found: " + body.countID);

  const count = counts[idx];
  if (count.Status === "Approved") throw new Error("Already approved.");
  // 2026-08-06: same hole as approveMovement. Live data has Rejected counts
  // carrying differences of +522/+141/+23/+13, so approving one would have
  // injected several hundred phantom units at AMAZON_FBA.
  if (count.Status === "Rejected") throw new Error("This count was rejected — record a new count instead of approving it.");
  if (count.Status !== "Pending") throw new Error("Only a Pending count can be approved. Current status: " + count.Status);

  // Maker-checker (v3.3): same rule as approveMovement — Admin/Manager can't
  // approve a count they submitted themselves. Founder/Co-Founder exempt,
  // flagged distinctly in the log instead of silently allowed.
  const isSelf = count.CountedByEmail === staff.Email;
  if (isSelf && ["Admin","Manager","Warehouse Manager"].includes(staff.Role)) {
    throw new Error("Maker-checker: you submitted this count, so you can't also approve it. Ask another approver.");
  }

  const currentRows = getStock({ productId: count.ProductID, locationId: count.LocationID });
  const currentSystemQty = currentRows.length ? Number(currentRows[0].Quantity) : 0;
  if (currentSystemQty !== Number(count.SystemQty)) {
    throw new Error("Stock changed after this count was recorded (was " + count.SystemQty + ", now " + currentSystemQty + "). Record a new count.");
  }

  let adjMovID = "";
  if (parseFloat(count.Difference) !== 0) {
    const isPositive = parseFloat(count.Difference) > 0;
    const { movementID } = createMovement({
      movementType:          "Stock Adjustment",
      sourceLocationID:      isPositive ? "SUPPLIER"          : count.LocationID,
      destinationLocationID: isPositive ? count.LocationID    : "DAMAGE",
      referenceType:         "Cycle Count",
      referenceNumber:       body.countID,
      notes:                 "Adjustment from count " + body.countID,
      lines: [{ productID: count.ProductID, quantity: Math.abs(parseFloat(count.Difference)), lineNotes: "count diff" }],
    }, staff);
    approveMovement({ movementID }, staff);
    adjMovID = movementID;
  }

  updateRow(SHEETS.STOCK_COUNTS, idx + 2, {
    Status:               "Approved",
    ApprovedByEmail:      staff.Email,
    AdjustmentMovementID: adjMovID,
  });

  writeLog("approveStockCount", body.countID, staff, (isSelf ? "[SELF-APPROVED] " : "") + "Approved. Adj: " + (adjMovID || "none"), body.requestId);
  writeAuditTrail("approveStockCount", "StockCount", body.countID, [
    { field: "Status", oldValue: count.Status, newValue: "Approved" },
  ], staff, body.requestId, isSelf ? "Self-approved by " + staff.Role : "");
  return { countID: body.countID, adjustmentMovementID: adjMovID };
}

// ─────────────────────────────────────────────────────────────
//  MODULE A: SUPPORT / RETURNS TICKETS
//  Same role gate as who can create Return movements today.
//  Simpler lifecycle than Movements — no stock impact, so no
//  maker-checker approval step: Open → In Progress → Resolved → Closed.
// ─────────────────────────────────────────────────────────────

// v3.4: only Operations Manager or Founder/Co-Founder
// can create or resolve tickets. Zubedha (Warehouse) and Pushpanjali (Warehouse Manager) are
// not part of this workflow at all.
const SUPPORT_TICKET_ROLES = ["Founder","Co-Founder","Operations Manager"];

// v3.6: a ticket links to the movement that actually matters to the customer's query —
// the order that was shipped to them (Website – WH Ship, Flipkart Dispatch, Firstcry
// Dispatch) since most Support queries are about a new order, before or after delivery —
// not just to what came back to the warehouse (kept too, since some tickets are opened
// after a physical return). Keep this in sync with TICKET_LINKABLE_MOVEMENT_TYPES_FE in
// syoat-app.js. Website – FBA Ship and FBA Dispatch are deliberately excluded (Lalith's call).
const TICKET_LINKABLE_MOVEMENT_TYPES = ["Website – WH Ship", "Flipkart Dispatch", "Firstcry Dispatch", "Returns – to WH", "Returns – Damaged", "Damage"];

function validateLinkedMovementID(movementID) {
  if (!movementID) return;
  const mv = sheetToObjects(SHEETS.MOV_HEADERS).find(m => m.MovementID === movementID);
  if (!mv) throw new Error("Linked MovementID not found: " + movementID);
  if (!TICKET_LINKABLE_MOVEMENT_TYPES.includes(mv.MovementType)) {
    throw new Error("MovementID " + movementID + " is a '" + mv.MovementType + "' movement — that type can't be linked to a ticket.");
  }
}

function getSupportTickets(params) {
  let rows = sheetToObjects(SHEETS.SUPPORT_TICKETS);
  if (params && params.status)    rows = rows.filter(r => r.Status === params.status);
  if (params && params.productId) rows = rows.filter(r => r.ProductID === params.productId);
  return rows.sort((a, b) => _idNum(b.TicketID) - _idNum(a.TicketID));
}

function createSupportTicket(body, staff) {
  requireFields(body, ["customerName","reasonCode","description"]);
  requireRole(staff, SUPPORT_TICKET_ROLES);
  validateLinkedMovementID(body.linkedMovementID);

  const ticketID = nextID("TKT");
  appendRow(SHEETS.SUPPORT_TICKETS, {
    TicketID:         ticketID,
    TicketDateTime:   now(),
    CustomerName:     body.customerName,
    ContactInfo:      body.contactInfo      || "",
    Channel:          body.channel          || "",
    ProductID:        body.productID        || "",
    ReasonCode:       body.reasonCode,
    Description:      body.description,
    LinkedMovementID: body.linkedMovementID || "",
    Status:           "Open",
    Resolution:       "",
    CreatedByEmail:   staff.Email,
    ResolvedByEmail:  "",
    ResolvedAt:       "",
    Notes:            body.notes || "",
  });

  writeLog("createSupportTicket", ticketID, staff, `${body.reasonCode} — ${body.customerName}`, body.requestId);
  writeAuditTrail("createSupportTicket", "SupportTicket", ticketID, [], staff, body.requestId, body.reasonCode + " — " + body.customerName);
  return { ticketID, status: "Open" };
}

// v3.5: status is now optional — this lets Operations Manager or Founder/Co-Founder attach or
// change the Linked Movement ID later, once the Return/Damage movement actually exists, without
// forcing a status change at the same time. At least one of status/resolution/notes/
// linkedMovementID must be provided.
function updateSupportTicket(body, staff) {
  requireFields(body, ["ticketID"]);
  requireRole(staff, SUPPORT_TICKET_ROLES);

  const tickets = sheetToObjects(SHEETS.SUPPORT_TICKETS);
  const idx = tickets.findIndex(t => t.TicketID === body.ticketID);
  if (idx === -1) throw new Error("TicketID not found: " + body.ticketID);
  const orig = tickets[idx];

  const updates = {};
  if (body.status !== undefined) {
    const validStatuses = ["Open","In Progress","Resolved","Closed"];
    if (!validStatuses.includes(body.status)) throw new Error("Invalid status: " + body.status);
    updates.Status = body.status;
  }
  if (body.resolution !== undefined) updates.Resolution = body.resolution;
  if (body.notes !== undefined)      updates.Notes = body.notes;
  if (body.linkedMovementID !== undefined) {
    validateLinkedMovementID(body.linkedMovementID);
    updates.LinkedMovementID = body.linkedMovementID;
  }
  if (Object.keys(updates).length === 0) throw new Error("Nothing to update.");

  if (updates.Status === "Resolved" || updates.Status === "Closed") {
    updates.ResolvedByEmail = staff.Email;
    updates.ResolvedAt      = now();
  }

  updateRow(SHEETS.SUPPORT_TICKETS, idx + 2, updates);

  const changes = [];
  if (updates.Status !== undefined)           changes.push({ field: "Status", oldValue: orig.Status, newValue: updates.Status });
  if (updates.LinkedMovementID !== undefined) changes.push({ field: "LinkedMovementID", oldValue: orig.LinkedMovementID, newValue: updates.LinkedMovementID });

  writeLog("updateSupportTicket", body.ticketID, staff,
    (updates.Status !== undefined ? `${orig.Status} → ${updates.Status}` : "updated") +
    (updates.LinkedMovementID !== undefined ? " | linked " + (updates.LinkedMovementID || "(cleared)") : ""),
    body.requestId);
  writeAuditTrail("updateSupportTicket", "SupportTicket", body.ticketID, changes, staff, body.requestId, body.resolution || "");
  return { ticketID: body.ticketID, status: updates.Status || orig.Status, linkedMovementID: updates.LinkedMovementID !== undefined ? updates.LinkedMovementID : orig.LinkedMovementID };
}

function logChange(body, staff) {
  writeLog(body.module || "manual", body.ref || "-", staff, body.description || "");
  return { logged: true };
}

// ─────────────────────────────────────────────────────────────
//  MODULE B: PURCHASING / SUPPLIER POs (2026-07-19, roles revised 2026-07-19)
//  Founder and Co-Founder are the only top-authority roles. Create and
//  approve are now split into two tiers, not one shared list:
//    - Create:  Founder, Co-Founder, Warehouse Manager (Pushpanjali creates POs)
//    - Approve/Reject/Close: Founder, Co-Founder only (Warehouse Manager cannot
//      approve her own or anyone else's PO — a PO commits real money, so the
//      sign-off stays with the top tier)
//  Warehouse Operator (Zubedha) and everyone else can see the Purchasing tab
//  read-only (to know what's expected when linking a Stock In to a PO) but
//  cannot create/approve/reject/close — enforced here server-side, not just
//  hidden client-side.
//  Stock In movements optionally link back to a PO (Movement_Headers gains
//  PurchaseOrderID) — received quantity is computed dynamically from
//  approved Stock In movements against that PO, mirroring how getStock()
//  derives on-hand stock from movements rather than storing a running total.
// ─────────────────────────────────────────────────────────────

const PURCHASE_ORDER_CREATE_ROLES  = ["Founder","Co-Founder","Warehouse Manager"];
const PURCHASE_ORDER_APPROVE_ROLES = ["Founder","Co-Founder"];

function getSuppliers(params) {
  const rows = sheetToObjects(SHEETS.SUPPLIERS);
  return (params && params.status === "all") ? rows : rows.filter(r => r.Status === "Active");
}

// { [POID]: { [ProductID]: receivedQty } } — summed from Approved "Stock In"
// movements whose Movement_Headers.PurchaseOrderID matches. Draft/Rejected
// Stock In movements don't count, same as getStock() only counting Approved.
function receivedQtyByPO() {
  const result = {};
  const headers = sheetToObjects(SHEETS.MOV_HEADERS)
    .filter(h => h.Status === "Approved" && h.MovementType === "Stock In" && h.PurchaseOrderID);
  const headerByMovID = {};
  headers.forEach(h => { headerByMovID[h.MovementID] = h; });
  sheetToObjects(SHEETS.MOV_LINES).forEach(line => {
    const h = headerByMovID[line.MovementID];
    if (!h) return;
    const poid = h.PurchaseOrderID;
    result[poid] = result[poid] || {};
    result[poid][line.ProductID] = (result[poid][line.ProductID] || 0) + (parseFloat(line.Quantity) || 0);
  });
  return result;
}

function getPurchaseOrders(params) {
  params = params || {};
  let headers = sheetToObjects(SHEETS.PURCHASE_ORDERS);
  if (params.status)     headers = headers.filter(h => h.Status === params.status);
  if (params.supplierId) headers = headers.filter(h => h.SupplierID === params.supplierId);
  headers.sort((a, b) => _idNum(b.POID) - _idNum(a.POID));

  if (params.includeLines === "true") {
    const allLines = sheetToObjects(SHEETS.PURCHASE_ORDER_LINES);
    const received = receivedQtyByPO();
    headers = headers.map(h => ({
      ...h,
      lines: allLines.filter(l => l.POID === h.POID).map(l => ({
        ...l,
        ReceivedQty: (received[h.POID] && received[h.POID][l.ProductID]) || 0,
      })),
    }));
  }
  return headers;
}

function createPurchaseOrder(body, staff) {
  requireFields(body, ["supplierID","lines"]);
  requireRole(staff, PURCHASE_ORDER_CREATE_ROLES);
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new Error("A purchase order needs at least one line item.");
  const supplier = sheetToObjects(SHEETS.SUPPLIERS).find(row => String(row.SupplierID) === String(body.supplierID) && String(row.Status) === "Active");
  if (!supplier) throw new Error("Unknown or inactive SupplierID: " + body.supplierID);
  validateMovementLines(body.lines.map(line => ({ productID: line.productID, quantity: line.qty })));

  const poID = nextID("PO");
  const ts = now();

  let totalAmount = 0, totalGST = 0;
  const lineRows = body.lines.map((line, idx) => {
    requireFields(line, ["productID","qty","rate"]);
    const qty   = parseFloat(line.qty);
    const rate  = parseFloat(line.rate);
    if (!isFinite(qty) || qty <= 0) throw new Error("PO line " + (idx + 1) + ": qty must be greater than 0.");
    if (!isFinite(rate) || rate < 0) throw new Error("PO line " + (idx + 1) + ": rate cannot be negative.");
    const assessable = qty * rate;
    const cgst  = parseFloat(line.cgst) || 0;
    const sgst  = parseFloat(line.sgst) || 0;
    const igst  = parseFloat(line.igst) || 0;
    const amount = assessable + cgst + sgst + igst;
    totalAmount += assessable;
    totalGST    += (cgst + sgst + igst);
    return {
      POLineID:        poID + "-L" + String(idx + 1).padStart(3,"0"),
      POID:            poID,
      ProductID:       line.productID,
      HSNCode:         line.hsnCode  || "",
      BoxSize:         line.boxSize  || "",
      PackSize:        line.packSize || "",
      PackType:        line.packType || "",
      Qty:             qty,
      UOM:             line.uom || "NUM",
      Rate:            rate,
      MRP:             line.mrp || "",
      AssessableValue: assessable,
      TaxableValue:    assessable,
      GSTPercent:      parseFloat(line.gstPercent) || 0,
      CGST:            cgst,
      SGST:            sgst,
      IGST:            igst,
      Amount:          amount,
    };
  });

  // Lines first, header last: the header is the visible commit marker.
  lineRows.forEach(row => appendRow(SHEETS.PURCHASE_ORDER_LINES, row));
  appendRow(SHEETS.PURCHASE_ORDERS, {
    POID:                 poID,
    PODateTime:           ts,
    SupplierID:           body.supplierID,
    ExpectedDeliveryDate: body.expectedDeliveryDate || "",
    Status:               "Draft",
    CreatedByEmail:       staff.Email,
    ApprovedByEmail:      "",
    ApprovedAt:           "",
    Notes:                body.notes || "",
    TotalAmount:          totalAmount,
    TotalGST:             totalGST,
    GrandTotal:           totalAmount + totalGST,
  });

  writeLog("createPurchaseOrder", poID, staff, "Created PO — " + body.lines.length + " line(s), supplier " + body.supplierID, body.requestId);
  writeAuditTrail("createPurchaseOrder", "PurchaseOrder", poID, [], staff, body.requestId, "Supplier " + body.supplierID);
  return { poID: poID };
}

function approvePurchaseOrder(body, staff) {
  requireFields(body, ["poID"]);
  requireRole(staff, PURCHASE_ORDER_APPROVE_ROLES);

  const headers = sheetToObjects(SHEETS.PURCHASE_ORDERS);
  const idx = headers.findIndex(h => h.POID === body.poID);
  if (idx === -1) throw new Error("POID not found: " + body.poID);
  const po = headers[idx];
  if (po.Status !== "Draft") throw new Error("Only a Draft PO can be approved. Current status: " + po.Status);

  // No maker-checker block here anymore: only Founder/Co-Founder can reach
  // this function at all (Warehouse Manager, who creates POs, is not in
  // PURCHASE_ORDER_APPROVE_ROLES and can never call this). Founder/Co-Founder
  // self-approving their own PO is allowed but flagged, same convention used
  // everywhere else in this app for that tier.
  const isSelf = po.CreatedByEmail === staff.Email;

  updateRow(SHEETS.PURCHASE_ORDERS, idx + 2, {
    Status:          "Approved",
    ApprovedByEmail: staff.Email,
    ApprovedAt:      now(),
  });

  writeLog("approvePurchaseOrder", body.poID, staff, isSelf ? "Approved [SELF-APPROVED]" : "Approved", body.requestId);
  writeAuditTrail("approvePurchaseOrder", "PurchaseOrder", body.poID, [
    { field: "Status", oldValue: po.Status, newValue: "Approved" },
  ], staff, body.requestId, isSelf ? "Self-approved by " + staff.Role : "");
  return { poID: body.poID, status: "Approved" };
}

function rejectPurchaseOrder(body, staff) {
  requireFields(body, ["poID"]);
  requireRole(staff, PURCHASE_ORDER_APPROVE_ROLES);

  const headers = sheetToObjects(SHEETS.PURCHASE_ORDERS);
  const idx = headers.findIndex(h => h.POID === body.poID);
  if (idx === -1) throw new Error("POID not found: " + body.poID);
  const po = headers[idx];
  if (po.Status !== "Draft") throw new Error("Only a Draft PO can be rejected.");

  updateRow(SHEETS.PURCHASE_ORDERS, idx + 2, {
    Status: "Rejected",
    ApprovedByEmail: staff.Email,
    ApprovedAt: now(),
    Notes: (po.Notes || "") + (body.reason ? " | Rejected: " + body.reason : " | Rejected"),
  });

  writeLog("rejectPurchaseOrder", body.poID, staff, "Rejected" + (body.reason ? ": " + body.reason : ""), body.requestId);
  writeAuditTrail("rejectPurchaseOrder", "PurchaseOrder", body.poID, [
    { field: "Status", oldValue: po.Status, newValue: "Rejected" },
  ], staff, body.requestId, body.reason || "");
  return { poID: body.poID, status: "Rejected" };
}

// Manual close — for when a PO is settled (fully received, or a shortage was
// accepted) and shouldn't keep showing as an open, waiting-on-goods PO. Only
// an Approved PO can be closed; received-quantity comparison is still visible
// on the PO itself (via getPurchaseOrders' computed ReceivedQty) so closing
// doesn't hide whether it was actually fulfilled in full.
function closePurchaseOrder(body, staff) {
  requireFields(body, ["poID"]);
  requireRole(staff, PURCHASE_ORDER_APPROVE_ROLES);

  const headers = sheetToObjects(SHEETS.PURCHASE_ORDERS);
  const idx = headers.findIndex(h => h.POID === body.poID);
  if (idx === -1) throw new Error("POID not found: " + body.poID);
  const po = headers[idx];
  if (po.Status !== "Approved") throw new Error("Only an Approved PO can be closed.");

  updateRow(SHEETS.PURCHASE_ORDERS, idx + 2, {
    Status: "Closed",
    Notes: (po.Notes || "") + (body.reason ? " | Closed: " + body.reason : " | Closed"),
  });

  writeLog("closePurchaseOrder", body.poID, staff, "Closed" + (body.reason ? ": " + body.reason : ""), body.requestId);
  writeAuditTrail("closePurchaseOrder", "PurchaseOrder", body.poID, [
    { field: "Status", oldValue: po.Status, newValue: "Closed" },
  ], staff, body.requestId, body.reason || "");
  return { poID: body.poID, status: "Closed" };
}

// ─────────────────────────────────────────────────────────────
//  MODULE C: FBA SHIPMENT TRACKING (2026-07-19)
//  "Sit alongside" design, same pattern as Module B's PO↔Stock-In linking:
//  FBA Dispatch / FBA Receipt movements keep working exactly as they do
//  today (Zubedha and everyone else records them the same way, same
//  approval flow) — nothing about movement creation changes. An FBA
//  Shipment is a separate tracking record on top: its own ID, destination
//  FC, expected product lines, and a status lifecycle (Working → Shipped →
//  In Transit → Received) that Amazon-tab roles advance manually. Linking
//  an existing Approved movement to a shipment (to compute Shipped/Received
//  quantities) is done from inside the Amazon tab only — not from the
//  regular Record Movement screen — so Zubedha's movement form is
//  completely untouched (Lalith's explicit choice, since she has no
//  Amazon-tab access today and this shouldn't change that).
//  Reuses the existing (previously unused) Movement_Headers.AmazonShipmentID
//  column to store the link — no new Movement_Headers column needed.
//  Roles mirror who already sees the Amazon tab today.
// ─────────────────────────────────────────────────────────────

const FBA_SHIPMENT_ROLES = ["Founder","Co-Founder","Admin","Manager","Warehouse Manager"];
const FBA_SHIPMENT_STATUSES = ["Working","Shipped","In Transit","Received"];
// Undoing a link is a correction to already-approved audit data, not a routine
// action — deliberately a higher bar than linking itself (which Warehouse
// Manager can do). Founder/Co-Founder only, matching how Reversal is gated.
const UNLINK_SHIPMENT_ROLES = ["Founder","Co-Founder"];

// { [ShipmentID]: { shipped: {[ProductID]: qty}, received: {[ProductID]: qty} } }
// — summed from Approved FBA Dispatch / FBA Receipt movements whose
// Movement_Headers.AmazonShipmentID matches. Mirrors receivedQtyByPO()'s
// derive-don't-store pattern.
function shipmentQtyTotals() {
  const result = {};
  const headers = sheetToObjects(SHEETS.MOV_HEADERS)
    .filter(h => h.Status === "Approved" && h.AmazonShipmentID &&
      (h.MovementType === "FBA Dispatch" || h.MovementType === "FBA Receipt"));
  const headerByMovID = {};
  headers.forEach(h => { headerByMovID[h.MovementID] = h; });
  sheetToObjects(SHEETS.MOV_LINES).forEach(line => {
    const h = headerByMovID[line.MovementID];
    if (!h) return;
    const sid = h.AmazonShipmentID;
    result[sid] = result[sid] || { shipped: {}, received: {} };
    const bucket = h.MovementType === "FBA Dispatch" ? result[sid].shipped : result[sid].received;
    bucket[line.ProductID] = (bucket[line.ProductID] || 0) + (parseFloat(line.Quantity) || 0);
  });
  return result;
}

function getFbaShipments(params) {
  params = params || {};
  let headers = sheetToObjects(SHEETS.FBA_SHIPMENTS);
  if (params.status) headers = headers.filter(h => h.Status === params.status);
  headers.sort((a, b) => _idNum(b.ShipmentID) - _idNum(a.ShipmentID));

  if (params.includeLines === "true") {
    const allLines = sheetToObjects(SHEETS.FBA_SHIPMENT_LINES);
    const totals = shipmentQtyTotals();
    // Movements actually linked to each shipment (any status — a movement that
    // was later Reversed stays visible here even though shipmentQtyTotals()
    // stops counting it) so Founder/Co-Founder have something concrete to pick
    // from when unlinking a mistaken match. Also carries the movement's own
    // product lines + destination FC so the picker/unlink UI can show enough
    // detail to tell shipments apart without guessing.
    const movHeaders = sheetToObjects(SHEETS.MOV_HEADERS);
    const movLines = sheetToObjects(SHEETS.MOV_LINES);
    headers = headers.map(h => ({
      ...h,
      lines: allLines.filter(l => l.ShipmentID === h.ShipmentID).map(l => ({
        ...l,
        ShippedQty:  (totals[h.ShipmentID] && totals[h.ShipmentID].shipped[l.ProductID]) || 0,
        ReceivedQty: (totals[h.ShipmentID] && totals[h.ShipmentID].received[l.ProductID]) || 0,
      })),
      linkedMovements: movHeaders.filter(m => m.AmazonShipmentID === h.ShipmentID).map(m => ({
        MovementID: m.MovementID,
        MovementType: m.MovementType,
        Status: m.Status,
        MovementDateTime: m.MovementDateTime,
        AmazonDestinationFC: m.AmazonDestinationFC || "",
        CarrierTrackingNumber: m.CarrierTrackingNumber || "",
        Notes: m.Notes || "",
        lines: movLines.filter(l => l.MovementID === m.MovementID),
      })),
    }));
  }
  return headers;
}

function createFbaShipment(body, staff) {
  requireFields(body, ["destinationFC","lines"]);
  requireRole(staff, FBA_SHIPMENT_ROLES);
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new Error("A shipment needs at least one product line.");
  const destination = sheetToObjects(SHEETS.LOCATIONS).find(location => String(location.LocationID) === String(body.destinationFC) && String(location.Status) === "Active");
  if (!destination) throw new Error("Unknown or inactive destination FC: " + body.destinationFC);
  validateMovementLines(body.lines.map(line => ({ productID: line.productID, quantity: line.expectedQty })));

  const shipmentID = nextID("SHIP");
  const ts = now();

  body.lines.forEach((line, idx) => {
    requireFields(line, ["productID","expectedQty"]);
    appendRow(SHEETS.FBA_SHIPMENT_LINES, {
      ShipmentLineID: shipmentID + "-L" + String(idx + 1).padStart(3,"0"),
      ShipmentID:     shipmentID,
      ProductID:      line.productID,
      ExpectedQty:    parseFloat(line.expectedQty) || 0,
      Notes:          line.notes || "",
    });
  });

  appendRow(SHEETS.FBA_SHIPMENTS, {
    ShipmentID:            shipmentID,
    ShipmentDateTime:      ts,
    DestinationFC:         body.destinationFC,
    Status:                "Working",
    CarrierTrackingNumber: body.carrierTrackingNumber || "",
    ExpectedDeliveryDate:  body.expectedDeliveryDate || "",
    CreatedByEmail:        staff.Email,
    ClosedAt:              "",
    Notes:                 body.notes || "",
  });

  writeLog("createFbaShipment", shipmentID, staff, "Created FBA shipment — " + body.lines.length + " line(s), destination " + body.destinationFC, body.requestId);
  writeAuditTrail("createFbaShipment", "FbaShipment", shipmentID, [], staff, body.requestId, "Destination " + body.destinationFC);
  return { shipmentID: shipmentID };
}

// Manual forward-only status advance. Skipping a stage is allowed (e.g. going
// straight from Working to Received if the in-between updates were missed) —
// but never backwards, since that would misrepresent history.
function updateFbaShipmentStatus(body, staff) {
  requireFields(body, ["shipmentID","status"]);
  requireRole(staff, FBA_SHIPMENT_ROLES);

  if (!FBA_SHIPMENT_STATUSES.includes(body.status)) {
    throw new Error("Invalid status. Must be one of: " + FBA_SHIPMENT_STATUSES.join(", "));
  }

  const headers = sheetToObjects(SHEETS.FBA_SHIPMENTS);
  const idx = headers.findIndex(h => h.ShipmentID === body.shipmentID);
  if (idx === -1) throw new Error("ShipmentID not found: " + body.shipmentID);
  const shipment = headers[idx];

  const curIdx = FBA_SHIPMENT_STATUSES.indexOf(shipment.Status);
  const newIdx = FBA_SHIPMENT_STATUSES.indexOf(body.status);
  if (newIdx <= curIdx) throw new Error("Shipment is already at '" + shipment.Status + "' — status can only move forward.");

  const updates = { Status: body.status };
  if (body.carrierTrackingNumber) updates.CarrierTrackingNumber = body.carrierTrackingNumber;
  if (body.status === "Received")  updates.ClosedAt = now();
  if (body.reason) updates.Notes = (shipment.Notes || "") + " | " + body.status + ": " + body.reason;

  updateRow(SHEETS.FBA_SHIPMENTS, idx + 2, updates);

  writeLog("updateFbaShipmentStatus", body.shipmentID, staff, shipment.Status + " → " + body.status, body.requestId);
  writeAuditTrail("updateFbaShipmentStatus", "FbaShipment", body.shipmentID, [
    { field: "Status", oldValue: shipment.Status, newValue: body.status },
  ], staff, body.requestId, body.reason || "");
  return { shipmentID: body.shipmentID, status: body.status };
}

// Tags an existing, already-Approved FBA Dispatch/FBA Receipt movement to a
// shipment, purely for shipped/received quantity tracking on the shipment
// record — done from the Amazon tab, never from the Record Movement screen.
// Only Approved movements are linkable (not Draft/Rejected/Reversed), so a
// shipment's numbers only ever reflect real, approved stock activity.
function linkMovementToShipment(body, staff) {
  requireFields(body, ["movementID","shipmentID"]);
  requireRole(staff, FBA_SHIPMENT_ROLES);

  const movHeaders = sheetToObjects(SHEETS.MOV_HEADERS);
  const movIdx = movHeaders.findIndex(h => h.MovementID === body.movementID);
  if (movIdx === -1) throw new Error("MovementID not found: " + body.movementID);
  const mov = movHeaders[movIdx];

  if (mov.MovementType !== "FBA Dispatch" && mov.MovementType !== "FBA Receipt") {
    throw new Error("Only FBA Dispatch or FBA Receipt movements can be linked to a shipment.");
  }
  if (mov.Status !== "Approved") throw new Error("Only an Approved movement can be linked to a shipment.");

  const shipments = sheetToObjects(SHEETS.FBA_SHIPMENTS);
  if (!shipments.find(s => s.ShipmentID === body.shipmentID)) throw new Error("ShipmentID not found: " + body.shipmentID);

  updateRow(SHEETS.MOV_HEADERS, movIdx + 2, { AmazonShipmentID: body.shipmentID });

  writeLog("linkMovementToShipment", body.movementID, staff, "Linked to shipment " + body.shipmentID, body.requestId);
  writeAuditTrail("linkMovementToShipment", "Movement", body.movementID, [
    { field: "AmazonShipmentID", oldValue: mov.AmazonShipmentID || "", newValue: body.shipmentID },
  ], staff, body.requestId, "");
  return { movementID: body.movementID, shipmentID: body.shipmentID };
}

// Undoes a mistaken link (wrong movement linked to wrong shipment). Founder/
// Co-Founder only, and a reason is required — same accountability pattern as
// Reversal. Does not touch the movement itself (still Approved, stock
// unaffected) or the shipment's own Status — only clears the tag that made it
// count toward that shipment's shipped/received totals.
function unlinkMovementFromShipment(body, staff) {
  requireFields(body, ["movementID","reason"]);
  requireRole(staff, UNLINK_SHIPMENT_ROLES);

  const movHeaders = sheetToObjects(SHEETS.MOV_HEADERS);
  const movIdx = movHeaders.findIndex(h => h.MovementID === body.movementID);
  if (movIdx === -1) throw new Error("MovementID not found: " + body.movementID);
  const mov = movHeaders[movIdx];

  if (!mov.AmazonShipmentID) throw new Error("This movement isn't linked to any shipment.");
  const oldShipmentID = mov.AmazonShipmentID;

  updateRow(SHEETS.MOV_HEADERS, movIdx + 2, { AmazonShipmentID: "" });

  writeLog("unlinkMovementFromShipment", body.movementID, staff, "Unlinked from shipment " + oldShipmentID + " — " + body.reason, body.requestId);
  writeAuditTrail("unlinkMovementFromShipment", "Movement", body.movementID, [
    { field: "AmazonShipmentID", oldValue: oldShipmentID, newValue: "" },
  ], staff, body.requestId, body.reason);
  return { movementID: body.movementID, unlinkedFrom: oldShipmentID };
}

// ─────────────────────────────────────────────────────────────
//  DURABLE IDEMPOTENCY + WRITE RECOVERY (WORK PACKAGE 5)
// ─────────────────────────────────────────────────────────────

function withBusinessWriteLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(WRITE_CONFIG.LOCK_WAIT_MS);
  try { return callback(); }
  finally { lock.releaseLock(); }
}

function validateRequestId(requestId) {
  const value = String(requestId || "");
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(value)) {
    throw new Error("requestId must be 8-100 characters using letters, numbers, dot, underscore, colon or hyphen.");
  }
}

function requestPropertyKey(requestId) {
  return WRITE_CONFIG.REQUEST_PROPERTY_PREFIX + sha256Base64Url(String(requestId));
}

function parseRequestRecord(value) {
  try { return value ? JSON.parse(value) : null; }
  catch (e) { return null; }
}

function cleanupRequestRegistry() {
  const properties = authProperties();
  const all = properties.getProperties();
  const cutoff = Date.now() - WRITE_CONFIG.REQUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const records = Object.keys(all)
    .filter(key => key.startsWith(WRITE_CONFIG.REQUEST_PROPERTY_PREFIX))
    .map(key => ({ key: key, record: parseRequestRecord(all[key]) }))
    .sort((a, b) => Number(b.record && b.record.updatedAt || 0) - Number(a.record && a.record.updatedAt || 0));

  let retainedCompleted = 0;
  records.forEach(entry => {
    const updatedAt = Number(entry.record && entry.record.updatedAt || 0);
    const isRecovery = entry.record && ["IN_PROGRESS", "FAILED_REVIEW_REQUIRED"].includes(entry.record.status);
    if (isRecovery) return; // unresolved recovery evidence is never aged out automatically
    retainedCompleted += 1;
    if (!entry.record || updatedAt < cutoff || retainedCompleted > WRITE_CONFIG.MAX_REQUEST_RECORDS) {
      properties.deleteProperty(entry.key);
    }
  });
}

function stableRequestValue(value) {
  if (Array.isArray(value)) return value.map(stableRequestValue);
  if (value && typeof value === "object") {
    const sorted = {};
    Object.keys(value).sort().forEach(key => {
      if (key !== "sessionToken" && key !== "pin") sorted[key] = stableRequestValue(value[key]);
    });
    return sorted;
  }
  return value;
}

function requestPayloadFingerprint(body) {
  return sha256Base64Url(JSON.stringify(stableRequestValue(body || {})));
}

var ACTIVE_WRITE_REQUEST_KEY = "";
var ACTIVE_WRITE_REQUEST_RECORD = null;

function recordWriteCheckpoint(recordType, recordId, phase) {
  if (!ACTIVE_WRITE_REQUEST_KEY || !ACTIVE_WRITE_REQUEST_RECORD) return;
  ACTIVE_WRITE_REQUEST_RECORD.checkpoints = ACTIVE_WRITE_REQUEST_RECORD.checkpoints || [];
  ACTIVE_WRITE_REQUEST_RECORD.checkpoints.push({
    recordType: String(recordType || ""),
    recordId: String(recordId || ""),
    phase: String(phase || ""),
    at: Date.now(),
  });
  ACTIVE_WRITE_REQUEST_RECORD.updatedAt = Date.now();
  authProperties().setProperty(ACTIVE_WRITE_REQUEST_KEY, JSON.stringify(ACTIVE_WRITE_REQUEST_RECORD));
}

function runIdempotentWrite(action, body, staff) {
  cleanupRequestRegistry();
  const requestId = String(body.requestId);
  const key = requestPropertyKey(requestId);
  const properties = authProperties();
  const existing = parseRequestRecord(properties.getProperty(key));
  const payloadFingerprint = requestPayloadFingerprint(body);

  if (existing) {
    if (existing.requestId !== requestId || existing.action !== action || normaliseEmail(existing.email) !== normaliseEmail(staff.Email) || existing.payloadFingerprint !== payloadFingerprint) {
      throw new Error("Request ID collision: this requestId belongs to a different command, payload or employee.");
    }
    if (existing.status === "COMPLETED") {
      const replay = existing.result && typeof existing.result === "object"
        ? Object.assign({}, existing.result)
        : { result: existing.result };
      replay.idempotentReplay = true;
      return replay;
    }
    throw new Error("Recovery required for request " + requestId + " (status " + existing.status + "). Do not retry with a new requestId until it is reviewed.");
  }

  const startedAt = Date.now();
  const record = {
    requestId: requestId,
    action: action,
    email: normaliseEmail(staff.Email),
    payloadFingerprint: payloadFingerprint,
    status: "IN_PROGRESS",
    startedAt: startedAt,
    updatedAt: startedAt,
    targetReference: String(body.movementID || body.orderID || body.countID || body.ticketID || body.poID || body.shipmentID || ""),
    checkpoints: [],
  };
  properties.setProperty(key, JSON.stringify(record));
  ACTIVE_WRITE_REQUEST_KEY = key;
  ACTIVE_WRITE_REQUEST_RECORD = record;

  try {
    const result = dispatchBusinessWrite(action, body, staff);
    record.status = "COMPLETED";
    record.result = result;
    record.updatedAt = Date.now();
    properties.setProperty(key, JSON.stringify(record));
    return result;
  } catch (error) {
    record.status = "FAILED_REVIEW_REQUIRED";
    record.error = String(error && error.message || error).slice(0, 500);
    record.updatedAt = Date.now();
    properties.setProperty(key, JSON.stringify(record));
    throw error;
  } finally {
    ACTIVE_WRITE_REQUEST_KEY = "";
    ACTIVE_WRITE_REQUEST_RECORD = null;
  }
}

// Manual Apps Script-editor recovery view. It is intentionally not routed to
// the web app. A failed/in-progress record means a command may have written
// only part of an aggregate and must be inspected before its marker is cleared.
function listWriteRecoveryRecords() {
  const all = authProperties().getProperties();
  return Object.keys(all)
    .filter(key => key.startsWith(WRITE_CONFIG.REQUEST_PROPERTY_PREFIX))
    .map(key => parseRequestRecord(all[key]))
    .filter(record => record && ["IN_PROGRESS", "FAILED_REVIEW_REQUIRED"].includes(record.status))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

// Safe Apps Script-editor diagnostic. It deliberately omits employee identity,
// payload fingerprints and request bodies while retaining the checkpoints and
// error needed to decide whether an aggregate was partially written.
function auditWriteRecoveryRecords() {
  const summary = listWriteRecoveryRecords().map(record => ({
    requestId: String(record.requestId || ""),
    action: String(record.action || ""),
    status: String(record.status || ""),
    targetReference: String(record.targetReference || ""),
    startedAt: Number(record.startedAt || 0),
    updatedAt: Number(record.updatedAt || 0),
    checkpoints: Array.isArray(record.checkpoints) ? record.checkpoints : [],
    error: String(record.error || "").slice(0, 500),
  }));
  Logger.log("Write recovery audit: " + JSON.stringify(summary));
  return summary;
}

// Owner-run Phase 2 diagnostic. This function is intentionally not routed to
// the web app. It correlates unresolved write markers and operational errors
// while omitting employee identity, payloads, fingerprints, raw messages,
// stack traces, URLs, file IDs and configuration values.
function auditPhase2SystemHealth() {
  const recoveryRequired = listWriteRecoveryRecords().map(record => ({
    requestId: String(record.requestId || ""),
    action: String(record.action || ""),
    status: String(record.status || ""),
    targetReference: String(record.targetReference || ""),
    startedAt: Number(record.startedAt || 0),
    updatedAt: Number(record.updatedAt || 0),
    checkpoints: Array.isArray(record.checkpoints) ? record.checkpoints : [],
    errorCategory: classifyOperationalError(record.error),
  }));
  const recoveryRequestIds = {};
  recoveryRequired.forEach(record => { if (record.requestId) recoveryRequestIds[record.requestId] = true; });
  const unresolvedErrors = listOperationalErrors(false).map(record => ({
    errorId: String(record.errorId || ""),
    requestId: String(record.requestId || ""),
    action: String(record.action || ""),
    at: Number(record.at || 0),
    category: classifyOperationalError(record.message),
    linkedToRecovery: !!recoveryRequestIds[String(record.requestId || "")],
  }));
  const summary = {
    generatedAt: now(),
    recoveryRequired: recoveryRequired,
    unresolvedErrors: unresolvedErrors,
  };
  Logger.log("Phase 2 system health audit: " + JSON.stringify(summary));
  return summary;
}

function classifyOperationalError(message) {
  const value = String(message || "");
  if (!value) return "NO_MESSAGE";
  if (/Operational Drive root|Drive root.*configur/i.test(value)) return "DRIVE_CONFIGURATION";
  if (/Sheet not found/i.test(value)) return "MISSING_SHEET";
  if (/Column not found/i.test(value)) return "MISSING_COLUMN";
  if (/DriveApp|file not found|folder not found|permission.*Drive/i.test(value)) return "DRIVE_OPERATION";
  if (/Service invoked too many times|timed out|timeout|temporar|rate limit|quota/i.test(value)) return "PLATFORM_TEMPORARY";
  if (/Cannot call|undefined|null|is not a function|TypeError|ReferenceError/i.test(value)) return "CODE_DEFECT";
  if (/JSON|parse|malformed|invalid response/i.test(value)) return "DATA_FORMAT";
  return "UNCLASSIFIED";
}

// Safe Apps Script-editor check for environment configuration. Folder IDs and
// notification addresses are intentionally omitted from the log.
function auditOperationalConfiguration() {
  const rootConfigured = !!String(authProperties().getProperty(DRIVE_CONFIG.ROOT_FOLDER_PROPERTY) || "").trim();
  let rootAvailable = false;
  try { rootAvailable = !!getInventoryErpRoot(); } catch (error) { rootAvailable = false; }
  const summary = {
    environment: operationalEnvironment(),
    driveRootConfigured: rootConfigured,
    driveRootAvailable: rootAvailable,
    notificationsEnabled: operationalNotificationRecipients().length > 0,
  };
  Logger.log("Operational configuration audit: " + JSON.stringify(summary));
  return summary;
}

// Manual recovery acknowledgement. Only use after comparing the affected
// sheets and logs. Removing the marker permits a deliberate retry with the
// original requestId; `resolutionNotes` is retained in a resolved record.
function resolveWriteRecoveryRecord(requestId, resolutionNotes, allowRetry) {
  validateRequestId(requestId);
  const properties = authProperties();
  const key = requestPropertyKey(requestId);
  const record = parseRequestRecord(properties.getProperty(key));
  if (!record) throw new Error("Request recovery record not found: " + requestId);
  if (record.status === "COMPLETED") throw new Error("Completed request records cannot be cleared.");
  if (!String(resolutionNotes || "").trim()) throw new Error("resolutionNotes are required.");
  if (allowRetry === true) {
    properties.deleteProperty(key);
    return { requestId: requestId, status: "CLEARED_FOR_RETRY", notes: String(resolutionNotes) };
  }
  record.status = "RESOLVED_NO_RETRY";
  record.resolutionNotes = String(resolutionNotes).slice(0, 1000);
  record.updatedAt = Date.now();
  properties.setProperty(key, JSON.stringify(record));
  return record;
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────

// Apps Script calls are slowest when the same Sheet table is downloaded more
// than once in a single request. Keep a request-local read-through cache only;
// every write invalidates that table's object rows, and the cache is discarded
// before the HTTP request returns. Approval still begins from a fresh execution
// and therefore never trusts stock cached by an earlier request.
var REQUEST_SHEET_READ_CACHE = null;

function withRequestSheetReadCache(work) {
  const isRoot = REQUEST_SHEET_READ_CACHE === null;
  if (isRoot) REQUEST_SHEET_READ_CACHE = { objects: {}, headers: {} };
  try {
    return work();
  } finally {
    if (isRoot) REQUEST_SHEET_READ_CACHE = null;
  }
}

function invalidateRequestSheetObjects(name) {
  if (REQUEST_SHEET_READ_CACHE) delete REQUEST_SHEET_READ_CACHE.objects[name];
}

function sheetHeaders(name, sheet) {
  if (REQUEST_SHEET_READ_CACHE && Object.prototype.hasOwnProperty.call(REQUEST_SHEET_READ_CACHE.headers, name)) {
    return REQUEST_SHEET_READ_CACHE.headers[name];
  }
  const target = sheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!target) throw new Error("Sheet not found: " + name);
  const headers = target.getRange(1, 1, 1, target.getLastColumn()).getValues()[0].map(h => String(h).trim());
  if (REQUEST_SHEET_READ_CACHE) REQUEST_SHEET_READ_CACHE.headers[name] = headers;
  return headers;
}

function sheetToObjects(name) {
  if (REQUEST_SHEET_READ_CACHE && Object.prototype.hasOwnProperty.call(REQUEST_SHEET_READ_CACHE.objects, name)) {
    return REQUEST_SHEET_READ_CACHE.objects[name];
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  if (REQUEST_SHEET_READ_CACHE) REQUEST_SHEET_READ_CACHE.headers[name] = headers;
  const objects = data.length < 2 ? [] : data.slice(1)
    .filter(row => row.some(c => c !== "" && c !== null && c !== undefined))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] === undefined ? "" : row[i]; });
      return obj;
    });
  if (REQUEST_SHEET_READ_CACHE) REQUEST_SHEET_READ_CACHE.objects[name] = objects;
  return objects;
}

function appendRow(name, obj) {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  const headers = sheetHeaders(name, sheet);
  sheet.appendRow(headers.map(h => (obj[h] !== undefined ? obj[h] : "")));
  invalidateRequestSheetObjects(name);
}

function updateRow(name, rowNumber, updates) {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  const headers = sheetHeaders(name, sheet);
  // State fields are commit markers and must be written after their metadata.
  // Readers may run while a write lock is held, so this ordering prevents them
  // seeing Approved/Dispatched before actor, timestamp and linked record fields.
  const stateFields = ["Status", "FulfilmentStatus"];
  Object.entries(updates).sort(([left], [right]) => {
    const leftState = stateFields.includes(left) ? 1 : 0;
    const rightState = stateFields.includes(right) ? 1 : 0;
    return leftState - rightState;
  }).forEach(([key, val]) => {
    const col = headers.indexOf(key);
    if (col === -1) throw new Error("Column not found: " + key + " in " + name);
    sheet.getRange(rowNumber, col + 1).setValue(val);
  });
  invalidateRequestSheetObjects(name);
}

function now() {
  const d   = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().replace("T"," ").substring(0,19);
}

function nextID(prefix) {
  const map = { MOV: SHEETS.MOV_HEADERS, ORD: SHEETS.SALES_ORDERS, CNT: SHEETS.STOCK_COUNTS, TKT: SHEETS.SUPPORT_TICKETS, PO: SHEETS.PURCHASE_ORDERS, SHIP: SHEETS.FBA_SHIPMENTS };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(map[prefix]);
  const lr = sheet.getLastRow();
  if (lr < 2) {
    const firstID = prefix + "-001";
    recordWriteCheckpoint(prefix, firstID, "ID_ALLOCATED");
    return firstID;
  }
  const ids = sheet.getRange(2, 1, lr - 1, 1).getValues().flat()
    .filter(v => String(v).startsWith(prefix + "-"))
    .map(v => parseInt(String(v).split("-").pop()) || 0);
  const next = prefix + "-" + String(ids.length > 0 ? Math.max(...ids) + 1 : 1).padStart(3,"0");
  recordWriteCheckpoint(prefix, next, "ID_ALLOCATED");
  return next;
}

function findStaffByEmail(email) {
  if (!email) return null;
  const wanted = normaliseEmail(email);
  return sheetToObjects(SHEETS.STAFF).find(s => normaliseEmail(s.Email) === wanted) || null;
}

// Compatibility helper for any internal/manual caller. The second argument is
// now a session token, never a PIN.
function requireStaff(email, sessionToken) {
  const staff = requireSession(sessionToken);
  if (email && normaliseEmail(email) !== normaliseEmail(staff.Email)) {
    throw new Error("Unauthorised: session identity mismatch");
  }
  return staff;
}

function requireRole(staff, allowed) {
  // Founder and Co-Founder always pass because they have full operational access.
  if (["Founder","Co-Founder"].includes(staff.Role)) return;
  if (!allowed.includes(staff.Role))
    throw new Error(`Role '${staff.Role}' not permitted. Allowed: ${allowed.join(", ")}`);
}

function requireFields(obj, fields) {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === "");
  if (missing.length) throw new Error("Missing fields: " + missing.join(", "));
}

function checkFeatureGate(movType, role) {
  const map = {
    "Opening Balance – WH":  "OPENING_BALANCE",
    "Opening Balance – FBA": "OPENING_BALANCE",
    "Stock In":                    "STOCK_IN",
    "FBA Dispatch":                "FBA_DISPATCH",
    "FBA Receipt":                 "FBA_RECEIPT",
    "Website – WH Ship":     "WEBSITE_WH_SHIP",
    "Website – FBA Ship":    "WEBSITE_FBA_SHIP",
    "Flipkart Dispatch":           "FLIPKART_DISPATCH",
    "Firstcry Dispatch":           "FIRSTCRY_DISPATCH",
    "Returns – to WH":       "RETURNS_TO_WH",
    "Returns – Damaged":     "RETURNS_DAMAGED",
    "Damage":                      "DAMAGE",
    "Samples":                     "SAMPLES",
    "Stock Adjustment":            "STOCK_AUDIT",
  };
  const key = map[movType];
  if (!key) return;
  const feat = sheetToObjects(SHEETS.FEATURE_SETTINGS).find(f => f.FeatureKey === key);
  if (!feat) return;
  if (String(feat.Enabled).toUpperCase() !== "TRUE") throw new Error("Feature disabled: " + movType);
  const allowed = (feat.AllowedRoles || "").split(",").map(s => s.trim());
  if (!allowed.includes(role) && role !== "Founder" && role !== "Co-Founder")
    throw new Error(`Role '${role}' not allowed for '${movType}'`);
}

function writeLog(module, ref, staff, desc, requestId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CHANGE_LOG);
  if (!sheet) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lr   = sheet.getLastRow();
  const next = lr < 2 ? 1 : lr;
  const fullDesc = desc + " [" + ref + "]" + (requestId ? " [rid:" + requestId + "]" : "");
  sheet.appendRow(headers.map(h => ({
    ChangeID:          next,
    ChangeDate:        now(),
    Version:           "3.0",
    Module:            module,
    ChangeDescription: fullDesc,
    ChangedBy:         staff ? staff.Email : "",
    TestResult:        "",
    RollbackNotes:     "",
  }[h] ?? "")));
}

function operationalErrorKey(errorId) {
  return OPERATIONS_CONFIG.ERROR_PROPERTY_PREFIX + String(errorId);
}

function cleanupOperationalErrors() {
  const properties = authProperties();
  const all = properties.getProperties();
  const cutoff = Date.now() - OPERATIONS_CONFIG.ERROR_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const entries = Object.keys(all)
    .filter(key => key.startsWith(OPERATIONS_CONFIG.ERROR_PROPERTY_PREFIX))
    .map(key => ({ key: key, record: parseRequestRecord(all[key]) }))
    .sort((a, b) => Number(b.record && b.record.at || 0) - Number(a.record && a.record.at || 0));
  entries.forEach((entry, index) => {
    const expiredResolved = entry.record && entry.record.resolvedAt && Number(entry.record.at || 0) < cutoff;
    if (!entry.record || expiredResolved || index >= OPERATIONS_CONFIG.MAX_ERROR_RECORDS) properties.deleteProperty(entry.key);
  });
}

function recordOperationalError(error, action) {
  try {
    cleanupOperationalErrors();
    const errorId = "ERR-" + Utilities.getUuid();
    const record = {
      errorId: errorId,
      requestId: CURRENT_CORRELATION_ID || "",
      action: String(action || "unknown"),
      at: Date.now(),
      message: String(error && error.message || error).slice(0, 1000),
      stack: String(error && error.stack || "").slice(0, 3000),
      resolvedAt: 0,
      resolutionNotes: "",
    };
    authProperties().setProperty(operationalErrorKey(errorId), JSON.stringify(record));
    Logger.log("Operational error " + errorId + " request " + record.requestId + " action " + record.action + ": " + record.message);
    return errorId;
  } catch (loggingError) {
    Logger.log("Operational error logging failed: " + String(loggingError.message || loggingError));
    return "";
  }
}

function listOperationalErrors(includeResolved) {
  return Object.keys(authProperties().getProperties())
    .filter(key => key.startsWith(OPERATIONS_CONFIG.ERROR_PROPERTY_PREFIX))
    .map(key => parseRequestRecord(authProperties().getProperty(key)))
    .filter(record => record && (includeResolved === true || !record.resolvedAt))
    .sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
}

function resolveOperationalError(errorId, resolutionNotes) {
  if (!String(resolutionNotes || "").trim()) throw new Error("resolutionNotes are required.");
  const key = operationalErrorKey(errorId);
  const record = parseRequestRecord(authProperties().getProperty(key));
  if (!record) throw new Error("Operational error not found: " + errorId);
  record.resolvedAt = Date.now();
  record.resolutionNotes = String(resolutionNotes).slice(0, 1000);
  authProperties().setProperty(key, JSON.stringify(record));
  return record;
}

function isExpectedClientError(message) {
  return /^(Unauthorised|Unauthorized|Forbidden|Missing fields|Invalid |Unknown |Not enough stock|Approval would create negative stock|Stock changed|Already |Only |Cannot |Maker-checker|Feature disabled|Role |Request ID collision|Recovery required|Cancelled|PIN confirmation|Temporarily locked|This file is too large|Operational file not found)/i.test(String(message || ""));
}

function safeClientErrorMessage(error) {
  const message = String(error && error.message || error || "Request failed.");
  if (/Sheet not found|Column not found|DriveApp|PropertiesService|Service invoked|Exception:| at [A-Za-z0-9_$.]+\s*\(/i.test(message)) {
    return "The request could not be completed safely.";
  }
  if (/^Unauthorised/i.test(message)) return "Unauthorised: session invalid or expired.";
  if (message === "Forbidden: Opening Balance can only be entered by the Founder.") return message;
  if (/^Forbidden/i.test(message)) return "Forbidden: action not permitted.";
  return message.slice(0, 500);
}

function operationalErrorResponse(error, action) {
  const message = String(error && error.message || error || "Request failed.");
  const expected = isExpectedClientError(message);
  const errorId = expected ? "" : recordOperationalError(error, action);
  return err(expected ? safeClientErrorMessage(error) : "The request could not be completed safely.", errorId);
}

function getSystemHealth(staff) {
  requireRole(staff, ["Founder", "Co-Founder"]);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const missingSheets = Object.keys(SHEETS)
    .map(key => SHEETS[key])
    .filter(name => !spreadsheet.getSheetByName(name));
  let driveRootAvailable = false;
  try { driveRootAvailable = !!getInventoryErpRoot(); } catch (e) { driveRootAvailable = false; }
  const recovery = listWriteRecoveryRecords();
  const errors = listOperationalErrors(false);
  const environment = operationalEnvironment();
  const notificationRecipientCount = operationalNotificationRecipients().length;
  const staffAccessMismatches = staff.Role === "Founder" ? listStaffAccessMismatches() : [];
  return {
    service: "Syoat ERP",
    version: OPERATIONS_CONFIG.VERSION,
    status: missingSheets.length || recovery.length || errors.length || staffAccessMismatches.length ? "attention" : "ok",
    checkedAt: now(),
    missingSheets: missingSheets,
    driveRootAvailable: driveRootAvailable,
    environment: environment,
    notificationsEnabled: notificationRecipientCount > 0,
    notificationRecipientCount: notificationRecipientCount,
    recoveryRequired: recovery.map(record => ({ requestId: record.requestId, action: record.action, status: record.status, updatedAt: record.updatedAt })),
    unresolvedErrors: errors.slice(0, 10).map(record => ({ errorId: record.errorId, requestId: record.requestId, action: record.action, at: record.at })),
    staffAccessMismatches: staffAccessMismatches,
  };
}

function listStaffAccessMismatches() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet.getSheetByName(SHEETS.STAFF) || !spreadsheet.getSheetByName(SHEETS.APP_LOGINS)) return [];
  const staffRows = sheetToObjects(SHEETS.STAFF);
  const loginRows = sheetToObjects(SHEETS.APP_LOGINS);
  const staffByEmail = {};
  const activeLoginsByEmail = {};
  staffRows.forEach(staff => {
    const email = normaliseEmail(staff.Email);
    if (email && !staffByEmail[email]) staffByEmail[email] = staff;
  });
  loginRows.forEach(login => {
    const email = normaliseEmail(login.Email);
    if (email && String(login.Status).trim().toLowerCase() === "active") {
      if (!activeLoginsByEmail[email]) activeLoginsByEmail[email] = [];
      activeLoginsByEmail[email].push(login);
    }
  });

  const mismatches = [];
  staffRows.forEach(staff => {
    const email = normaliseEmail(staff.Email);
    const staffActive = String(staff.Status).trim().toLowerCase() === "active";
    if (!email || !staffActive) return;
    const activeLogins = activeLoginsByEmail[email] || [];
    if (!isSupportedRole(staff.Role)) {
      mismatches.push({ staffId: String(staff.StaffID || ""), name: String(staff.Name || "Unknown staff"), issue: "UNSUPPORTED_STAFF_ROLE" });
    }
    if (!activeLogins.length) {
      mismatches.push({ staffId: String(staff.StaffID || ""), name: String(staff.Name || "Unknown staff"), issue: "LOGIN_MISSING_OR_INACTIVE" });
      return;
    }
    if (activeLogins.length > 1) {
      mismatches.push({ staffId: String(staff.StaffID || ""), name: String(staff.Name || "Unknown staff"), issue: "DUPLICATE_ACTIVE_LOGIN" });
    }
    if (String(activeLogins[0].Role || "") !== String(staff.Role || "")) {
      mismatches.push({ staffId: String(staff.StaffID || ""), name: String(staff.Name || "Unknown staff"), issue: "LOGIN_ROLE_DIFFERS" });
    }
  });
  Object.keys(activeLoginsByEmail).forEach(email => {
    const staff = staffByEmail[email];
    if (!staff) {
      const login = activeLoginsByEmail[email][0];
      mismatches.push({ staffId: "", name: String(login.Name || "Unknown login"), issue: "STAFF_MISSING" });
    } else if (String(staff.Status).trim().toLowerCase() !== "active") {
      mismatches.push({ staffId: String(staff.StaffID || ""), name: String(staff.Name || activeLoginsByEmail[email][0].Name || "Unknown staff"), issue: "STAFF_INACTIVE" });
    }
  });
  return mismatches;
}

// ─────────────────────────────────────────────────────────────
//  RESPONSE HELPERS
// ─────────────────────────────────────────────────────────────

function ok(data) {
  const serverDurationMs = CURRENT_REQUEST_STARTED_AT ? Math.max(0, Date.now() - CURRENT_REQUEST_STARTED_AT) : 0;
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data, requestId: CURRENT_CORRELATION_ID || "", serverDurationMs: serverDurationMs, ts: now() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg, errorId) {
  const serverDurationMs = CURRENT_REQUEST_STARTED_AT ? Math.max(0, Date.now() - CURRENT_REQUEST_STARTED_AT) : 0;
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg, requestId: CURRENT_CORRELATION_ID || "", errorId: errorId || "", serverDurationMs: serverDurationMs, ts: now() }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Quick tests from the Apps Script editor ──
function _testPing()     { Logger.log(JSON.stringify({ ping: "ok", ts: now() })); }
function _testProducts() { Logger.log(JSON.stringify(getProducts({}))); }
function _testStock()    { Logger.log(JSON.stringify(getStock({}))); }
