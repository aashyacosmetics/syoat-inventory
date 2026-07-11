// ─────────────────────────────────────────────────────────────
//  Hide loading splash once this script executes
// ─────────────────────────────────────────────────────────────
(function() {
  var splash = document.getElementById('splash');
  if (splash) {
    splash.style.transition = 'opacity 0.3s ease';
    splash.style.opacity = '0';
    setTimeout(function() { if (splash) splash.style.display = 'none'; }, 320);
  }
})();

// ─────────────────────────────────────────────────────────────
//  Logo — reference by filename (lives in same folder as index.html)
// ─────────────────────────────────────────────────────────────
const SYOAT_LOGO = "syoat-logo.png";

// ─────────────────────────────────────────────────────────────
//  ErrorBoundary — catches React crashes gracefully
//  Shows a friendly card instead of a blank white page
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }
  componentDidCatch(error, info) {
    console.error("Syoat ERP — unhandled error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", {
        style: {
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", background: "#efe4d2",
          fontFamily: "Plus Jakarta Sans, system-ui", padding: "24px", gap: "16px"
        }
      },
        React.createElement("img", { src: SYOAT_LOGO, alt: "Syoat", style: { width: 80, opacity: 0.6 } }),
        React.createElement("h2", { style: { color: "#2c211a", margin: 0 } }, "Something went wrong"),
        React.createElement("p", { style: { color: "#6f6152", textAlign: "center", maxWidth: 360, margin: 0 } },
          "The app hit an unexpected error. Refresh the page to restart. If the problem persists, contact Lalith."
        ),
        React.createElement("p", { style: { color: "#bd5d38", fontSize: 12, maxWidth: 480, wordBreak: "break-all" } },
          this.state.error ? this.state.error.message : "Unknown error"
        ),
        React.createElement("button", {
          onClick: () => window.location.reload(),
          style: {
            background: "#bd5d38", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontWeight: 600
          }
        }, "Refresh App")
      );
    }
    return this.props.children;
  }
}

const API = "https://script.google.com/macros/s/AKfycbwqBI7uPnv63VYms4PHaJceFhNzEf8Y6f-6ni-2LT2G_1pWmL7WpdwK4uu6HeAuW67agg/exec";

// ─────────────────────────────────────────────────────────────
//  STAFF — with PINs and role-based permissions
//  CHANGE THESE PINs before sharing the file with your team
// ─────────────────────────────────────────────────────────────
// Staff loaded dynamically from App_Logins sheet via getAppLogins API
// Fallback shown if sheet not yet configured
const STAFF_DB_FALLBACK = [{
  name: "Lalith Kiran",
  email: "info@aveekids.com",
  role: "Founder",
  // PIN intentionally omitted — offline fallback uses localStorage cache (set on first successful load).
  canCreate: true,
  canApprove: true,
  canReverse: true,
  canViewAll: true
}];
// What each role can CREATE
const CAN_CREATE_TYPES = {
  Founder: ["Opening Balance – WH", "Opening Balance – FBA", "Stock In", "FBA Dispatch", "FBA Receipt", "Website – WH Ship", "Website – FBA Ship", "Flipkart Dispatch", "Return Received", "Returns – to WH", "Returns – Damaged", "Damage", "Samples"],
  "Co-Founder": ["Opening Balance – WH", "Opening Balance – FBA", "Stock In", "FBA Dispatch", "FBA Receipt", "Website – WH Ship", "Website – FBA Ship", "Flipkart Dispatch", "Return Received", "Returns – to WH", "Returns – Damaged", "Damage", "Samples"],
  Owner: ["Opening Balance – WH", "Opening Balance – FBA", "Stock In", "FBA Dispatch", "FBA Receipt", "Website – WH Ship", "Website – FBA Ship", "Flipkart Dispatch", "Return Received", "Returns – to WH", "Returns – Damaged", "Damage", "Samples"],
  Admin: ["Stock In", "FBA Dispatch", "FBA Receipt", "Website – WH Ship", "Website – FBA Ship", "Flipkart Dispatch", "Return Received", "Returns – to WH", "Returns – Damaged", "Damage", "Samples"],
  Manager: ["Stock In", "FBA Dispatch", "FBA Receipt", "Website – WH Ship", "Website – FBA Ship", "Flipkart Dispatch", "Return Received", "Returns – to WH", "Returns – Damaged", "Damage", "Samples"],
  // Warehouse ships from WH only — cannot touch FBA stock
  Warehouse: ["Stock In", "FBA Dispatch", "Website – WH Ship", "Flipkart Dispatch", "Return Received", "Returns – to WH", "Returns – Damaged", "Damage", "Samples"],
  Auditor: []
};

// ─────────────────────────────────────────────────────────────
//  API helpers — v3: retry + requestId idempotency
// ─────────────────────────────────────────────────────────────

// Generate a unique requestId for every write (idempotency)
function genRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Retry with exponential backoff — 3 attempts, 1.2s / 2.4s gaps
async function fetchWithRetry(url, options, retries) {
  retries = retries || 3;
  var lastErr;
  for (var attempt = 1; attempt <= retries; attempt++) {
    try {
      var resp = await fetch(url, Object.assign({ redirect: "follow" }, options || {}));
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var d = await resp.json();
      if (d.success === false) throw new Error(d.error || "API error");
      return d.data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await new Promise(function(r) { setTimeout(r, attempt * 1200); });
      }
    }
  }
  throw lastErr;
}

// READ — GET (safe, cacheable)
async function api(action, params) {
  params = params || {};
  var qs = new URLSearchParams(Object.assign({ action: action }, params)).toString();
  return fetchWithRetry(API + "?" + qs);
}

// WRITE — GET with payload + requestId
// requestId lets Apps Script detect and skip duplicate submissions
async function apiWrite(action, email, payload) {
  var enriched = Object.assign({}, payload, { requestId: genRequestId() });
  var serialised = JSON.stringify(enriched);
  var qs = new URLSearchParams({
    action: action,
    email: email,
    payload: encodeURIComponent(serialised)
  }).toString();

  // Guard: URL length limit (~7500 chars safe across all browsers/proxies)
  if (qs.length > 7000) {
    throw new Error(
      "Payload too large (" + qs.length + " chars). Please reduce the number of product lines or split into two submissions."
    );
  }
  return fetchWithRetry(API + "?" + qs);
}

// WRITE via POST — no URL-length ceiling. Used when the payload carries photo
// attachments (base64 thumbnails can easily exceed the ~7000-char GET budget).
async function apiWritePost(action, email, payload) {
  var enriched = Object.assign({}, payload, { action: action, email: email, requestId: genRequestId() });
  return fetchWithRetry(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight on Apps Script
    body: JSON.stringify(enriched)
  });
}

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
// Alert thresholds loaded dynamically from Products sheet (ReorderLevel column)
// This is the fallback if the sheet value is missing
const ALERT_FALLBACK = 100;
const SRC_DST = {
  "Opening Balance – WH": {
    src: "MAIN_WH",
    dst: "MAIN_WH"
  },
  "Opening Balance – FBA": {
    src: "AMAZON_FBA",
    dst: "AMAZON_FBA"
  },
  "Stock In": {
    src: "SUPPLIER",
    dst: "MAIN_WH"
  },
  "FBA Dispatch": {
    src: "MAIN_WH",
    dst: "FBA_TRANSIT"
  },
  "FBA Receipt": {
    src: "FBA_TRANSIT",
    dst: "AMAZON_FBA"
  },
  "Website – WH Ship": {
    src: "MAIN_WH",
    dst: "WEBSITE_SALES"
  },
  "Website – FBA Ship": {
    src: "AMAZON_FBA",
    dst: "WEBSITE_SALES"
  },
  "Flipkart Dispatch": {
    src: "MAIN_WH",
    dst: "FLIPKART_SALES"
  },
  "Samples": {
    src: "MAIN_WH",
    dst: "SAMPLES"
  },
  "Damage": {
    src: "MAIN_WH",
    dst: "DAMAGE"
  },
  "Returns – to WH": {
    src: "RETURNS",
    dst: "MAIN_WH"
  },
  "Returns – Damaged": {
    src: "RETURNS",
    dst: "DAMAGE"
  },
  "Return Received": {
    src: "CUSTOMER",
    dst: "RETURNS"
  }
};

// Friendly display names for the dropdown + history. DISPLAY ONLY — the stored
// MovementType value stays the key on the left, so history and all logic are unchanged.
const TYPE_LABEL = {
  "Opening Balance – WH":  "Opening Balance — Warehouse",
  "Opening Balance – FBA": "Opening Balance — Amazon FBA",
  "Stock In":              "Stock In — Supplier → Warehouse",
  "FBA Dispatch":          "Send to Amazon FBA — WH → FBA",
  "FBA Receipt":           "FBA Receipt — In-Transit → FBA",
  "Website – WH Ship":     "Website Order — ship from Warehouse",
  "Website – FBA Ship":    "Website Order — ship from Amazon FBA",
  "Flipkart Dispatch":     "Flipkart Order — WH → Flipkart",
  "Samples":               "Samples / Office Use — WH → Samples",
  "Damage":                "Damage in Warehouse — WH → Damage",
  "Returns – to WH":       "Return → back to Warehouse (good stock)",
  "Returns – Damaged":     "Return → mark Damaged (unsellable)",
  "Return Received":       "Return Received — Customer → Returns"
};

// Category tabs for the Record Movement form. Types are grouped by the task the
// user is doing. A tab only appears if the user's role has ≥1 type in it, so
// Warehouse sees 4 tabs (Receive/Ship/Returns/Damage-Samples) and owners see 5.
// The 'types' are stored MovementType keys — display uses TYPE_LABEL.
const TYPE_GROUPS = [
  { key: "receive", label: "📥 Receive",         types: ["Stock In", "FBA Receipt"] },
  { key: "ship",    label: "📤 Ship Orders",     types: ["FBA Dispatch", "Website – WH Ship", "Website – FBA Ship", "Flipkart Dispatch"] },
  { key: "returns", label: "↩️ Returns",          types: ["Return Received", "Returns – to WH", "Returns – Damaged"] },
  { key: "adjust",  label: "🗑️ Damage / Samples", types: ["Damage", "Samples"] },
  { key: "setup",   label: "⚙️ Setup",           types: ["Opening Balance – WH", "Opening Balance – FBA"] }
];
const LOC_LABEL = {
  MAIN_WH: "Main Warehouse",
  AMAZON_FBA: "Amazon FBA",
  FBA_TRANSIT: "FBA Transit",
  RETURNS: "Returns Hold",
  DAMAGE: "Damage",
  WEBSITE_SALES: "Website Sales",
  FLIPKART_SALES: "Flipkart Sales",
  SAMPLES: "Samples"
};

// Locations that hold physical, sellable stock (shown on dashboard)
const STOCK_LOCATIONS = ["MAIN_WH", "AMAZON_FBA", "FBA_TRANSIT", "RETURNS"];
// Locations that are outbound sinks (consumed stock — shown in analytics only)
const SALES_LOCATIONS = ["WEBSITE_SALES", "FLIPKART_SALES", "SAMPLES", "DAMAGE"];
// Virtual pass-through (ignored in stock calc)
const VIRTUAL_LOCATIONS = ["SUPPLIER", "CUSTOMER"];
const ROLE_COLOR = {
  Founder: "#8b1a1a",
  "Co-Founder": "#1a3a6b",
  Owner: "#bd5d38",
  Admin: "#2c211a",
  Manager: "#a97b52",
  Warehouse: "#bd5d38",
  Auditor: "#a89680"
};
function statusOf(qty, at) {
  if (qty <= 0) return "oos";
  if (qty <= at * 0.4) return "critical";
  if (qty <= at) return "low";
  return "ok";
}
const SC = {
  ok: "#5f7a4f",
  low: "#c2872f",
  critical: "#b23a2e",
  oos: "#8a6d3b"
};
const SL = {
  ok: "✅ OK",
  low: "⚠️ Low",
  critical: "🔴 Critical",
  oos: "🚫 Out of Stock"
};
const SC2 = {
  Draft: "#f59e0b",
  Approved: "#5f7a4f",
  Reversed: "#64748b"
};
function tsAgo(d) {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return m + "m ago";
  if (m < 1440) return Math.floor(m / 60) + "h ago";
  return Math.floor(m / 1440) + "d ago";
}

// ─────────────────────────────────────────────────────────────
//  Shared styles
// ─────────────────────────────────────────────────────────────
const card = {
  background: "#fdf9f1",
  border: "1px solid #e7d9c4",
  borderRadius: 14,
  padding: "16px 18px",
  boxShadow: "0 2px 8px rgba(60,40,20,0.06)"
};
const inp = {
  width: "100%",
  background: "#efe4d2",
  border: "1px solid #e0d2bd",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#2c211a",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box"
};
const lbl = {
  display: "block",
  color: "#a89680",
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: 0.5
};
const btnS = (c = "#6366f1") => ({
  background: c,
  border: "none",
  borderRadius: 8,
  color: "#fff",
  padding: "9px 18px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13
});
const ghost = {
  background: "transparent",
  border: "1px solid #e0d2bd",
  borderRadius: 8,
  color: "#6f6152",
  padding: "7px 13px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};
function Badge({
  status
}) {
  const c = SC[status];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      background: c + "20",
      color: c,
      border: `1px solid ${c}40`,
      borderRadius: 6,
      padding: "2px 7px",
      fontSize: 11,
      fontWeight: 700
    }
  }, SL[status]);
}

// ─────────────────────────────────────────────────────────────
//  LOGIN SCREEN
// ─────────────────────────────────────────────────────────────
function LoginScreen({
  onLogin,
  staffDB,
  staffLoadError,
  staffSource
}) {
  const [selected, setSelected] = React.useState(null);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [dropVal, setDropVal] = React.useState("");
  const ROLE_ICON = {
    Founder: "🌟",
    "Co-Founder": "💎",
    Owner: "👑",
    Admin: "🛡️",
    Manager: "📋",
    Warehouse: "📦",
    Auditor: "🔍"
  };
  function selectStaff(s) {
    setSelected(s);
    setPin("");
    setError("");
  }
  function handleDropChange(e) {
    const val = e.target.value;
    setDropVal(val);
    if (val) {
      const found = staffDB.find(s => s.email === val);
      if (found) selectStaff(found);
    }
  }
  function handlePinKey(digit) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setTimeout(() => checkPin(newPin), 150);
    }
  }
  function checkPin(enteredPin) {
    if (!selected.pin) {
      setShake(true);
      setError("Logins didn't load (offline). Reload the page, then try again.");
      setPin("");
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (String(enteredPin) === String(selected.pin)) {
      onLogin(selected);
    } else {
      setShake(true);
      setError("Wrong PIN. Try again.");
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
  }
  function clearPin() {
    setPin("");
    setError("");
  }
  if (!selected) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#efe4d2"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 36,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        margin: "0 auto 16px",
        background: "#fff",
        borderRadius: 16,
        width: 140,
        height: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        boxShadow: "0 4px 20px rgba(90,138,94,0.15)"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: SYOAT_LOGO,
      alt: "Syoat",
      style: {
        width: 110,
        height: "auto",
        display: "block",
        filter: "brightness(0) saturate(100%) invert(27%) sepia(30%) saturate(600%) hue-rotate(90deg) brightness(85%)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 900,
        fontSize: 22,
        letterSpacing: -0.5,
        color: "#2c211a"
      }
    }, "Inventory ERP"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#a89680",
        fontSize: 13,
        marginTop: 6
      }
    }, "Aashya Cosmetics · Hyderabad")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fdf9f1",
        border: "1px solid #e0d2bd",
        borderRadius: 16,
        padding: 28,
        width: "100%",
        maxWidth: 360
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#6f6152",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 10
      }
    }, "Who are you?"), staffLoadError && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#856404",
        marginBottom: 10,
        lineHeight: 1.5
      }
    }, /*#__PURE__*/React.createElement("strong", null, "⚠️ Sheet not connected"), /*#__PURE__*/React.createElement("br", null), staffLoadError), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: dropVal,
      onChange: handleDropChange,
      style: {
        width: "100%",
        background: "#efe4d2",
        border: "1px solid #e0d2bd",
        borderRadius: 10,
        padding: "12px 44px 12px 14px",
        color: dropVal ? "#2c211a" : "#475569",
        fontSize: 14,
        fontWeight: 600,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none"
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "",
      disabled: true
    }, "Select your name…"), staffDB.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.email,
      value: s.email
    }, ROLE_ICON[s.role], "  ", s.name, " — ", s.role))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        color: "#a89680",
        pointerEvents: "none",
        fontSize: 12
      }
    }, "▼")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: staffSource === "sheet" ? "#6b9e6b" : "#bd5d38",
        marginTop: 6,
        marginBottom: 2,
        textAlign: "right"
      }
    }, staffSource === "sheet"
      ? "✓ " + staffDB.length + " staff from sheet"
      : "⚠ offline — sheet not connected"
    ), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        color: "#c8b9a3",
        fontSize: 12,
        textAlign: "center"
      }
    }, "You'll enter your PIN on the next screen")));
  }

  // PIN entry
  const dots = [0, 1, 2, 3];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "#efe4d2"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelected(null),
    style: {
      position: "absolute",
      top: 20,
      left: 20,
      ...ghost,
      padding: "6px 12px",
      fontSize: 12
    }
  }, "← Back"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: ROLE_COLOR[selected.role] + "20",
      border: `1px solid ${ROLE_COLOR[selected.role]}40`,
      borderRadius: 16,
      width: 64,
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 28,
      margin: "0 auto 14px"
    }
  }, {
    Founder: "🌟",
    "Co-Founder": "💎",
    Owner: "👑",
    Admin: "🛡️",
    Manager: "📋",
    Warehouse: "📦",
    Auditor: "🔍"
  }[selected.role]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18
    }
  }, "Hi, ", selected.name.split(" ")[0], "!"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13,
      marginTop: 4
    }
  }, "Enter your 4-digit PIN")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      marginBottom: 16,
      animation: shake ? "shake 0.4s ease" : "none"
    }
  }, dots.map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: i < pin.length ? "#6366f1" : "#e0d2bd",
      border: "2px solid " + (i < pin.length ? "#6366f1" : "#475569"),
      transition: "background 0.1s"
    }
  }))), error && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#f87171",
      fontSize: 12,
      marginBottom: 14
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,72px)",
      gap: 12,
      userSelect: "none"
    }
  }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((d, i) => {
    if (d === "") return /*#__PURE__*/React.createElement("div", {
      key: i
    });
    const isDel = d === "⌫";
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => isDel ? clearPin() : handlePinKey(String(d)),
      style: {
        width: 72,
        height: 72,
        borderRadius: 12,
        fontSize: isDel ? 22 : 20,
        fontWeight: 700,
        background: isDel ? "#e8e0d4" : "#fdf9f1",
        border: "1px solid #e0d2bd",
        color: isDel ? "#a89680" : "#2c211a",
        cursor: "pointer",
        transition: "background 0.1s"
      },
      onMouseEnter: e => e.currentTarget.style.background = "#e8e0d4",
      onMouseLeave: e => e.currentTarget.style.background = isDel ? "#e8e0d4" : "#faf6f0"
    }, d);
  })), /*#__PURE__*/React.createElement("style", null, `@keyframes shake {
        0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)}
        40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)}
      }`));
}

// ─────────────────────────────────────────────────────────────
//  PENDING APPROVALS BANNER
// ─────────────────────────────────────────────────────────────
function parseAttachments(docFile) {
  if (!docFile) return [];
  const s = String(docFile);
  const isImg = x => typeof x === "string" && (x.startsWith("data:image") || x.startsWith("http"));
  if (isImg(s)) return [s]; // single attachment (legacy base64 OR Drive URL)
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.filter(isImg).slice(0, 4);
    } catch (e) { /* fall through */ }
  }
  return [];
}

function PendingBanner({
  drafts,
  user,
  products,
  onApprove,
  onApproveAll,
  onEdit,
  onReject
}) {
  const [busy, setBusy] = React.useState(null);
  const [busyAll, setBusyAll] = React.useState(false);
  const [viewImg, setViewImg] = React.useState(null); // lightbox image URL
  const [rejectTarget, setRejectTarget] = React.useState(null); // movementID with reject-reason box open
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectBusy, setRejectBusy] = React.useState(null);
  if (!drafts || drafts.length === 0) return null;
  if (!user.canApprove) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#bd5d3810",
        border: "1px solid #bd5d3840",
        borderRadius: 12,
        padding: "12px 16px",
        margin: "14px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#bd5d38",
        fontWeight: 700,
        fontSize: 13
      }
    }, "⚠️ ", drafts.length, " movement", drafts.length > 1 ? "s" : "", " pending approval"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#92400e",
        fontSize: 12,
        marginTop: 3
      }
    }, "A Manager or Owner needs to approve before stock updates."));
  }
  async function approveOne(movID) {
    setBusy(movID);
    await onApprove(movID);
    setBusy(null);
  }
  async function approveAll() {
    setBusyAll(true);
    await onApproveAll();
    setBusyAll(false);
  }
  async function confirmReject() {
    if (!rejectTarget) return;
    setRejectBusy(rejectTarget);
    await onReject(rejectTarget, rejectReason);
    setRejectBusy(null);
    setRejectTarget(null);
    setRejectReason("");
  }
  const lightbox = viewImg ? /*#__PURE__*/React.createElement("div", {
    onClick: () => setViewImg(null),
    style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }
  }, /*#__PURE__*/React.createElement("img", {
    src: viewImg,
    style: { maxWidth: "95vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 40px rgba(0,0,0,0.6)" }
  }), /*#__PURE__*/React.createElement("div", {
    style: { position: "absolute", top: 14, right: 18, color: "#fff", fontSize: 32, cursor: "pointer", fontWeight: 700, lineHeight: 1 },
    onClick: e => { e.stopPropagation(); setViewImg(null); }
  }, "×")) : null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, lightbox, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3810",
      border: "1px solid #bd5d3840",
      borderRadius: 12,
      padding: "14px 18px",
      margin: "14px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#bd5d38",
      fontWeight: 800,
      fontSize: 13
    }
  }, "⚠️ ", drafts.length, " movement", drafts.length > 1 ? "s" : "", " waiting for your approval"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#92400e",
      fontSize: 12,
      marginTop: 2
    }
  }, "Stock will NOT update until approved")), drafts.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: approveAll,
    disabled: busyAll,
    style: {
      ...btnS("#f59e0b"),
      padding: "7px 16px",
      fontSize: 12,
      opacity: busyAll ? 0.6 : 1
    }
  }, busyAll ? "Approving…" : `✅ Approve All ${drafts.length}`)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 8
    }
  }, drafts.map(m => {
    const atts = parseAttachments(m.DocumentFile);
    const thumbs = atts.map((img, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => setViewImg(img),
      style: { cursor: "pointer", position: "relative", borderRadius: 8, overflow: "hidden", border: "2px solid #bd5d38", width: 90, height: 90, flexShrink: 0 }
    }, /*#__PURE__*/React.createElement("img", {
      src: img, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
    }), /*#__PURE__*/React.createElement("div", {
      style: { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(60,40,20,0.78)", fontSize: 9, color: "#fff", textAlign: "center", padding: "2px 0", fontWeight: 700 }
    }, "👁 Tap to view")));
    const pdfBadge = m.Notes && m.Notes.includes("attachment(s)") && atts.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: { background: "#bd5d3812", border: "1px solid #bd5d3840", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#bd5d38", fontWeight: 600 }
    }, "📄 PDF invoice attached — filename in notes") : null;
    const rejectBox = rejectTarget === m.MovementID ? /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }
    }, /*#__PURE__*/React.createElement("input", {
      value: rejectReason,
      onChange: e => setRejectReason(e.target.value),
      placeholder: "Reason for rejecting (optional)",
      style: { flex: 1, minWidth: 160, borderRadius: 7, border: "1px solid #e0d2bd", padding: "6px 10px", fontSize: 12, fontFamily: "inherit" }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: confirmReject,
      disabled: rejectBusy === m.MovementID,
      style: { ...btnS("#ef4444"), padding: "6px 12px", fontSize: 11, opacity: rejectBusy === m.MovementID ? 0.6 : 1 }
    }, rejectBusy === m.MovementID ? "…" : "Confirm Reject"), /*#__PURE__*/React.createElement("button", {
      onClick: () => { setRejectTarget(null); setRejectReason(""); },
      style: { ...ghost, padding: "6px 12px", fontSize: 11 }
    }, "Cancel")) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: m.MovementID,
      style: {
        background: "#efe4d2",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        marginBottom: 3,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#2c211a",
        fontWeight: 700,
        fontSize: 13
      }
    }, m.MovementID), /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#bd5d3818",
        color: "#bd5d38",
        border: "1px solid #bd5d3840",
        borderRadius: 5,
        padding: "1px 6px",
        fontSize: 11,
        fontWeight: 700
      }
    }, "Draft"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#a89680",
        fontSize: 12
      }
    }, TYPE_LABEL[m.MovementType] || m.MovementType)), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#a89680",
        fontSize: 12
      }
    }, LOC_LABEL[m.SourceLocationID] || m.SourceLocationID, " → ", LOC_LABEL[m.DestinationLocationID] || m.DestinationLocationID, m.Notes ? " · " + m.Notes : "", " · by " + (m.EnteredByEmail || "").split("@")[0]), m.lines && m.lines.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        flexWrap: "wrap",
        marginTop: 5
      }
    }, m.lines.map(l => /*#__PURE__*/React.createElement("span", {
      key: l.MovementLineID,
      style: {
        background: "#fdf9f1",
        borderRadius: 5,
        padding: "2px 8px",
        fontSize: 11,
        color: "#6f6152"
      }
    }, (products && products.find(p => p.ProductID === l.ProductID) ? products.find(p => p.ProductID === l.ProductID).ProductName : l.ProductID), " × ", l.Quantity))), rejectBox), /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }
    }, thumbs, pdfBadge, /*#__PURE__*/React.createElement("button", {
      onClick: () => onEdit(m),
      style: { background: "none", border: "1px solid #a97b52", color: "#a97b52", borderRadius: 7, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }
    }, "✏️ Edit"), /*#__PURE__*/React.createElement("button", {
      onClick: () => { setRejectTarget(m.MovementID); setRejectReason(""); },
      style: { background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 7, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }
    }, "✖ Reject"), /*#__PURE__*/React.createElement("button", {
      onClick: () => approveOne(m.MovementID),
      disabled: busy === m.MovementID,
      style: {
        ...btnS("#5f7a4f"),
        padding: "7px 16px",
        fontSize: 12,
        opacity: busy === m.MovementID ? 0.6 : 1,
        whiteSpace: "nowrap"
      }
    }, busy === m.MovementID ? "Approving…" : "✅ Approve")));
  }))));
}

// ─────────────────────────────────────────────────────────────
//  MOVEMENT CREATE MODAL
// ─────────────────────────────────────────────────────────────
function MovEditModal({
  movement,
  products,
  user,
  onClose,
  onDone
}) {
  const [lines, setLines] = React.useState(
    (movement.lines || []).map(l => ({ pid: l.ProductID, qty: String(l.Quantity ?? ""), cost: l.UnitCost != null ? String(l.UnitCost) : "" }))
  );
  const [refNo, setRefNo] = React.useState(movement.ReferenceNumber || "");
  const [carrier, setCarrier] = React.useState(movement.CarrierTrackingNumber || "");
  const [notes, setNotes] = React.useState((movement.Notes || "").replace(/\s*\[\d+ attachment\(s\):[^\]]*\]/, "").trim());
  const [images, setImages] = React.useState([]); // newly added photos this session — replaces old ones if any added
  const [compressing, setCompressing] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const existingAtts = parseAttachments(movement.DocumentFile);

  function compressToTarget(file, callback) {
    if (!file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = e => callback(e.target.result, file.size, file.type);
      r.readAsDataURL(file);
      return;
    }
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX_BYTES = 900 * 1024;
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        const MAX_DIM = 2048;
        if (w > MAX_DIM || h > MAX_DIM) { const s = Math.min(MAX_DIM/w, MAX_DIM/h); w=Math.round(w*s); h=Math.round(h*s); }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        let q = 0.92;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length * 0.75 > MAX_BYTES && q > 0.45) {
          q = Math.round((q - 0.05) * 100) / 100;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        callback(dataUrl, Math.round(dataUrl.length * 0.75), "image/jpeg");
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  }
  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
      setCompressing(n => n + 1);
      compressToTarget(file, (dataUrl, finalBytes, finalType) => {
        setImages(prev => [...prev, { name: file.name, dataUrl, type: finalType, size: (finalBytes/1024).toFixed(1) + " KB" }]);
        setCompressing(n => Math.max(0, n - 1));
      });
    });
  }
  function removeImage(i) {
    setImages(imgs => imgs.filter((_, j) => j !== i));
  }
  const addLine = () => setLines(l => [...l, { pid: products[0]?.ProductID || "", qty: "", cost: "" }]);
  const remLine = i => setLines(l => l.filter((_, j) => j !== i));
  const setLine = (i, k, v) => setLines(l => l.map((x, j) => j === i ? { ...x, [k]: v } : x));

  async function submit() {
    if (lines.some(l => !l.qty || isNaN(Number(l.qty)))) {
      setErr("All lines need a quantity.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      let uploads = [];
      if (images.length > 0) {
        const MAX_ATTACH = 4;
        const imgFiles = images.filter(i => i.dataUrl && i.dataUrl.startsWith("data:image")).slice(0, MAX_ATTACH);
        function makeUpload(dataUrl) {
          return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX = 1600;
              let w = img.width, h = img.height;
              if (w > MAX || h > MAX) { const s = Math.min(MAX/w, MAX/h); w=Math.round(w*s); h=Math.round(h*s); }
              canvas.width = w; canvas.height = h;
              canvas.getContext("2d").drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/jpeg", 0.82));
            };
            img.onerror = () => resolve(null);
            img.src = dataUrl;
          });
        }
        uploads = (await Promise.all(imgFiles.map(f => makeUpload(f.dataUrl)))).filter(Boolean);
      }
      const finalNotes = (notes ? notes + " " : "") + (images.length > 0 ? `[${images.length} attachment(s): ${images.map(i => i.name).join(", ")}]` : "");
      const payload = {
        movementID: movement.MovementID,
        referenceNumber: refNo,
        carrierTrackingNumber: carrier,
        notes: finalNotes,
        lines: lines.map(l => ({ productID: l.pid, quantity: Number(l.qty), unitCost: Number(l.cost) || "" }))
      };
      if (uploads.length) payload.attachmentImages = uploads;
      // Photo attachments can exceed the GET URL-length budget — use POST when present.
      const res = uploads.length
        ? await apiWritePost("editMovement", user.email, payload)
        : await apiWrite("editMovement", user.email, payload);
      onDone(`✅ ${res.movementID} updated`);
      onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return /*#__PURE__*/React.createElement("div", {
    style: { position: "fixed", inset: 0, background: "rgba(60,40,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }
  }, /*#__PURE__*/React.createElement("div", {
    style: { background: "#fefcf9", borderRadius: 16, padding: 22, width: 500, maxWidth: "100%", border: "1px solid #e0d2bd", maxHeight: "90vh", overflowY: "auto" }
  },
    /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }
    },
      /*#__PURE__*/React.createElement("div", { style: { color: "#2c211a", fontWeight: 800, fontSize: 15 } }, "✏️ Edit ", movement.MovementID),
      /*#__PURE__*/React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", color: "#a89680", fontSize: 22, cursor: "pointer" } }, "×")
    ),
    /*#__PURE__*/React.createElement("div", {
      style: { background: "#efe4d2", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#4a7a4e", fontWeight: 600, marginBottom: 12 }
    }, TYPE_LABEL[movement.MovementType] || movement.MovementType, " · ", LOC_LABEL[movement.SourceLocationID] || movement.SourceLocationID, " → ", LOC_LABEL[movement.DestinationLocationID] || movement.DestinationLocationID),
    err && /*#__PURE__*/React.createElement("div", { style: { color: "#ef4444", fontSize: 12, marginBottom: 10 } }, err),
    /*#__PURE__*/React.createElement("div", { style: { display: "grid", gap: 10 } },
      lines.map((line, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: { display: "flex", gap: 8, alignItems: "center" }
      },
        /*#__PURE__*/React.createElement("select", {
          value: line.pid,
          onChange: e => setLine(i, "pid", e.target.value),
          style: { ...inp, flex: 2 }
        }, products.map(p => /*#__PURE__*/React.createElement("option", { key: p.ProductID, value: p.ProductID }, p.ProductName))),
        /*#__PURE__*/React.createElement("input", {
          type: "number",
          value: line.qty,
          onChange: e => setLine(i, "qty", e.target.value),
          placeholder: "Qty",
          style: { ...inp, flex: 1 }
        }),
        lines.length > 1 && /*#__PURE__*/React.createElement("button", {
          onClick: () => remLine(i),
          style: { background: "none", border: "none", color: "#ef4444", fontSize: 18, cursor: "pointer" }
        }, "×")
      )),
      /*#__PURE__*/React.createElement("button", {
        onClick: addLine,
        style: { ...ghost, padding: "6px 12px", fontSize: 12, justifySelf: "start" }
      }, "+ Add product line"),
      /*#__PURE__*/React.createElement("div", null,
        /*#__PURE__*/React.createElement("label", { style: lbl }, "Reference No."),
        /*#__PURE__*/React.createElement("input", { value: refNo, onChange: e => setRefNo(e.target.value), style: inp })
      ),
      /*#__PURE__*/React.createElement("div", null,
        /*#__PURE__*/React.createElement("label", { style: lbl }, "Notes"),
        /*#__PURE__*/React.createElement("textarea", { value: notes, onChange: e => setNotes(e.target.value), rows: 2, style: { ...inp, fontFamily: "inherit", resize: "vertical" } })
      ),
      existingAtts.length > 0 && images.length === 0 && /*#__PURE__*/React.createElement("div", {
        style: { fontSize: 11, color: "#a89680" }
      }, "This draft already has ", existingAtts.length, " photo(s) attached. Adding a new photo below will replace them."),
      /*#__PURE__*/React.createElement("div", null,
        /*#__PURE__*/React.createElement("label", { style: lbl }, "Replace photo (optional)"),
        /*#__PURE__*/React.createElement("input", {
          type: "file",
          accept: "image/*",
          multiple: true,
          onChange: e => { handleFiles(e.target.files); e.target.value = ""; }
        }),
        images.length > 0 && /*#__PURE__*/React.createElement("div", {
          style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }
        }, images.map((img, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          style: { position: "relative", width: 56, height: 56, borderRadius: 6, overflow: "hidden", border: "1px solid #e0d2bd" }
        },
          /*#__PURE__*/React.createElement("img", { src: img.dataUrl, style: { width: "100%", height: "100%", objectFit: "cover" } }),
          /*#__PURE__*/React.createElement("div", {
            onClick: () => removeImage(i),
            style: { position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "0 4px", cursor: "pointer" }
          }, "×")
        )))
      )
    ),
    /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 10, marginTop: 18 }
    },
      /*#__PURE__*/React.createElement("button", { onClick: onClose, style: { ...ghost, flex: 1 } }, "Cancel"),
      /*#__PURE__*/React.createElement("button", {
        onClick: submit,
        disabled: busy || compressing > 0,
        style: { ...btnS("#a97b52"), flex: 2, opacity: (busy || compressing > 0) ? 0.6 : 1 }
      }, busy ? "Saving…" : compressing > 0 ? "Processing image…" : "Save Changes")
    )
  ));
}

function MovModal({
  products,
  stock,
  user,
  onClose,
  onDone
}) {
  // Opening Balance is ONLY available to Owner — never any other role
  const OWNER_ONLY = ["Opening Balance – WH", "Opening Balance – FBA"];
  const isOwner = user.role === "Owner" || user.role === "Founder" || user.role === "Co-Founder";
  const allAllowed = CAN_CREATE_TYPES[user.role] || [];
  const allowedTypes = allAllowed.filter(t => isOwner || !OWNER_ONLY.includes(t));
  const [type, setType] = React.useState(allowedTypes[0] || "");
  const availGroups = TYPE_GROUPS
    .map(g => ({ key: g.key, label: g.label, types: g.types.filter(t => allowedTypes.includes(t)) }))
    .filter(g => g.types.length > 0);
  const groupKeyOf = t => { const g = availGroups.find(x => x.types.includes(t)); return g ? g.key : (availGroups[0] ? availGroups[0].key : ""); };
  const [category, setCategory] = React.useState(groupKeyOf(allowedTypes[0] || ""));
  const activeGroup = availGroups.find(g => g.key === category) || availGroups[0] || { types: [] };
  const [refNo, setRefNo] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState([{
    pid: products[0]?.ProductID || "",
    qty: "",
    cost: ""
  }]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [images, setImages] = React.useState([]); // { name, dataUrl, type }
  const [compressing, setCompressing] = React.useState(0); // tracks in-flight image compressions
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);
  const sd = SRC_DST[type] || {
    src: "",
    dst: ""
  };
  // Compress image to <1MB at best quality using canvas
  function compressToTarget(file, callback) {
    if (!file.type.startsWith("image/")) {
      // PDF — read as-is, no compression
      const r = new FileReader();
      r.onload = e => callback(e.target.result, file.size, file.type);
      r.readAsDataURL(file);
      return;
    }
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX_BYTES = 900 * 1024; // target <1MB (900KB to be safe)
        const canvas = document.createElement("canvas");
        // Scale down if wider/taller than 2048px
        let w = img.width, h = img.height;
        const MAX_DIM = 2048;
        if (w > MAX_DIM || h > MAX_DIM) {
          const s = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        // Start at quality 0.92 and step down until under limit
        let q = 0.92;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length * 0.75 > MAX_BYTES && q > 0.45) {
          q = Math.round((q - 0.05) * 100) / 100;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        callback(dataUrl, Math.round(dataUrl.length * 0.75), "image/jpeg");
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  }
  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
      setCompressing(n => n + 1); // block submit until this resolves
      compressToTarget(file, (dataUrl, finalBytes, finalType) => {
        setImages(prev => [...prev, {
          name: file.name,
          dataUrl,
          type: finalType,
          size: (finalBytes / 1024).toFixed(1) + " KB"
        }]);
        setCompressing(n => Math.max(0, n - 1)); // done — unblock submit
      });
    });
  }
  function removeImage(i) {
    setImages(imgs => imgs.filter((_, j) => j !== i));
  }
  const addLine = () => setLines(l => [...l, {
    pid: products[0]?.ProductID || "",
    qty: "",
    cost: ""
  }]);
  const remLine = i => setLines(l => l.filter((_, j) => j !== i));
  const setLine = (i, k, v) => setLines(l => l.map((x, j) => j === i ? {
    ...x,
    [k]: v
  } : x));
  async function submit() {
    if (!type) {
      setErr("Select a movement type.");
      return;
    }
    if (lines.some(l => !l.qty || isNaN(Number(l.qty)))) {
      setErr("All lines need a quantity.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      // Build a small thumbnail (≤30KB each) for every attached photo — up to 4 —
      // so the approver can see all of them, not just the first one.
      const MAX_ATTACH = 4;
      const imgFiles = images.filter(i => i.dataUrl && i.dataUrl.startsWith("data:image")).slice(0, MAX_ATTACH);
      function makeUpload(dataUrl) {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 1600;
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) { const s = Math.min(MAX/w, MAX/h); w=Math.round(w*s); h=Math.round(h*s); }
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
      }
      const uploads = (await Promise.all(imgFiles.map(f => makeUpload(f.dataUrl)))).filter(Boolean);
      const hasImgs = uploads.length > 0;
      const finalNotes = (notes ? notes + " " : "") + (images.length > 0 ? `[${images.length} attachment(s): ${images.map(i => i.name).join(", ")}]` : "");
      const movPayload = {
        movementType: type,
        sourceLocationID: sd.src,
        destinationLocationID: sd.dst,
        referenceNumber: refNo,
        carrierTrackingNumber: carrier,
        notes: finalNotes,
        attachmentImages: uploads,
        lines: lines.map(l => ({
          productID: l.pid,
          quantity: Number(l.qty),
          unitCost: Number(l.cost) || ""
        }))
      };
      // Photo attachments can exceed the GET URL-length budget — use POST when present.
      const res = hasImgs
        ? await apiWritePost("createMovement", user.email, movPayload)
        : await apiWrite("createMovement", user.email, movPayload);
      onDone(`✅ ${res.movementID} saved as Draft` + (user.canApprove ? " — approve it on the dashboard" : " — a Manager will approve it"));
      onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(60,40,20,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fefcf9",
      borderRadius: 16,
      padding: 22,
      width: 500,
      maxWidth: "100%",
      border: "1px solid #e0d2bd",
      maxHeight: "90vh",
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2c211a",
      fontWeight: 800,
      fontSize: 15
    }
  }, "📋 Record Movement"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "#a89680",
      fontSize: 22,
      cursor: "pointer"
    }
  }, "×")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Movement Type"), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }
  }, availGroups.map(g => /*#__PURE__*/React.createElement("button", {
    key: g.key,
    onClick: () => { setCategory(g.key); setType(g.types[0]); },
    style: {
      padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
      border: "1px solid " + (category === g.key ? "#a97b52" : "#d8dcc8"),
      background: category === g.key ? "#a97b52" : "#fff",
      color: category === g.key ? "#fff" : "#5a6b5b"
    }
  }, g.label))), /*#__PURE__*/React.createElement("div", {
    style: { display: "grid", gap: 6 }
  }, activeGroup.types.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setType(t),
    style: {
      textAlign: "left", padding: "10px 12px", borderRadius: 9, fontSize: 13, cursor: "pointer",
      border: "1px solid " + (type === t ? "#a97b52" : "#d8dcc8"),
      background: type === t ? "#eaf5f5" : "#fff",
      color: "#2c211a", fontWeight: type === t ? 700 : 500
    }
  }, TYPE_LABEL[t] || t)))), type && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#efe4d2",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#4a7a4e",
      fontWeight: 600
    }
  }, LOC_LABEL[sd.src] || sd.src), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a89680"
    }
  }, "→"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#4ade80",
      fontWeight: 600
    }
  }, LOC_LABEL[sd.dst] || sd.dst)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#efe4d2",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2
    }
  }, "Entered By"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2c211a",
      fontWeight: 700,
      fontSize: 13
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: ROLE_COLOR[user.role],
      fontSize: 11
    }
  }, user.role)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Reference No."), /*#__PURE__*/React.createElement("input", {
    value: refNo,
    onChange: e => setRefNo(e.target.value),
    placeholder: "Invoice / Order ID",
    style: inp
  }))), (type === "FBA Dispatch" || type === "Website – WH Ship" || type === "Website – FBA Ship" || type === "Flipkart Dispatch") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Carrier / AWB"), /*#__PURE__*/React.createElement("input", {
    value: carrier,
    onChange: e => setCarrier(e.target.value),
    placeholder: "Delhivery / Blue Dart AWB",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Product Lines"), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    style: {
      ...ghost,
      padding: "3px 10px",
      fontSize: 12
    }
  }, "+ Add Line")), lines.map((line, i) => {
    const avail = stock ? stock.filter(s => s.ProductID === line.pid && STOCK_LOCATIONS.includes(s.LocationID)).reduce((a, s) => a + Number(s.Quantity), 0) : null;
    const availColor = avail === 0 ? "#b23a2e" : avail !== null && avail < 50 ? "#bd5d38" : "#bd5d38";
    const availBg = avail === 0 ? "#b23a2e12" : avail !== null && avail < 50 ? "#bd5d3812" : "#bd5d3812";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#f8f4ef",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        border: "1px solid #e7d9c4"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4
      }
    }, "Product"), /*#__PURE__*/React.createElement("select", {
      value: line.pid,
      onChange: e => {
        const newPid = e.target.value;
        const newProd = products.find(p => p.ProductID === newPid);
        setLine(i, "pid", newPid);
        if (newProd && newProd.UnitCost && !line.cost) {
          setLine(i, "cost", newProd.UnitCost);
        }
      },
      style: {
        ...inp,
        fontSize: 13,
        padding: "9px 12px",
        fontWeight: 600,
        background: "#fdf9f1"
      }
    }, products.map(p => /*#__PURE__*/React.createElement("option", {
      key: p.ProductID,
      value: p.ProductID
    }, p.ProductName, " (", p.VariantName, ")")))), /*#__PURE__*/React.createElement("button", {
      onClick: () => remLine(i),
      disabled: lines.length === 1,
      style: {
        marginTop: 20,
        background: "#fff",
        border: "1px solid #e7d9c4",
        borderRadius: 8,
        width: 36,
        height: 36,
        color: "#b23a2e",
        cursor: "pointer",
        fontSize: 16,
        flexShrink: 0,
        opacity: lines.length === 1 ? 0.3 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, "✕")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4
      }
    }, "Stock"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: availBg,
        border: `1px solid ${availColor}30`,
        borderRadius: 8,
        padding: "8px 6px",
        textAlign: "center",
        minHeight: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 900,
        fontSize: 18,
        color: availColor,
        letterSpacing: -0.5,
        lineHeight: 1
      }
    }, avail !== null ? avail : "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#a89680",
        marginTop: 2
      }
    }, "units"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4
      }
    }, "Qty"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      value: line.qty,
      onChange: e => setLine(i, "qty", e.target.value),
      style: {
        ...inp,
        textAlign: "center",
        fontWeight: 900,
        fontSize: 20,
        padding: "7px 4px",
        background: "#fdf9f1",
        height: 40
      },
      placeholder: "0"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4
      }
    }, "Cost ₹"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      value: line.cost,
      onChange: e => setLine(i, "cost", e.target.value),
      style: {
        ...inp,
        textAlign: "center",
        fontSize: 14,
        fontWeight: 700,
        padding: "7px 4px",
        background: "#fdf9f1",
        height: 40
      },
      placeholder: "0"
    }))), avail !== null && avail > 0 && Number(line.qty) > avail && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        background: "#bd5d3812",
        border: "1px solid #bd5d3830",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 11,
        color: "#bd5d38",
        fontWeight: 600
      }
    }, "⚠️ Qty ", line.qty, " exceeds available stock (", avail, " units)"), avail === 0 && Number(line.qty) > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        background: "#b23a2e12",
        border: "1px solid #b23a2e30",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 11,
        color: "#b23a2e",
        fontWeight: 600
      }
    }, "🚫 No stock available at this location"));
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Notes"), /*#__PURE__*/React.createElement("input", {
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "Optional notes...",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "📎 Attachments (Invoice / Label / Photos)"), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    accept: "image/*,application/pdf",
    multiple: true,
    style: {
      display: "none"
    },
    onChange: e => handleFiles(e.target.files)
  }), /*#__PURE__*/React.createElement("input", {
    ref: cameraInputRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    style: {
      display: "none"
    },
    onChange: e => handleFiles(e.target.files)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 8,
      marginBottom: 10
    }
  }, [{
    icon: "📷",
    label: "Camera",
    ref: cameraInputRef,
    color: "#bd5d38",
    sub: "Take photo"
  }, {
    icon: "🖼️",
    label: "Gallery",
    ref: fileInputRef,
    color: "#a97b52",
    sub: "From phone/PC"
  }, {
    icon: "📄",
    label: "Document",
    ref: fileInputRef,
    color: "#bd5d38",
    sub: "Invoice / PDF"
  }].map(btn => /*#__PURE__*/React.createElement("button", {
    key: btn.label,
    onClick: () => btn.ref.current && btn.ref.current.click(),
    type: "button",
    style: {
      background: btn.color + "12",
      border: `1px solid ${btn.color}30`,
      borderRadius: 10,
      padding: "10px 6px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, btn.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: btn.color
    }
  }, btn.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#a89680"
    }
  }, btn.sub)))), /*#__PURE__*/React.createElement("div", {
    onDragOver: e => {
      e.preventDefault();
      e.currentTarget.style.borderColor = "#bd5d38";
    },
    onDragLeave: e => {
      e.currentTarget.style.borderColor = "#e0d2bd";
    },
    onDrop: e => {
      e.preventDefault();
      e.currentTarget.style.borderColor = "#e0d2bd";
      handleFiles(e.dataTransfer.files);
    },
    onClick: () => fileInputRef.current && fileInputRef.current.click(),
    style: {
      border: "2px dashed #e0d2bd",
      borderRadius: 10,
      padding: "14px",
      textAlign: "center",
      cursor: "pointer",
      transition: "border-color 0.2s",
      marginBottom: images.length > 0 ? 10 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#a89680"
    }
  }, "or drag & drop files here")), images.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))",
      gap: 8
    }
  }, images.map((img, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid #e0d2bd",
      background: "#faf8f4"
    }
  }, img.type.startsWith("image/") ? /*#__PURE__*/React.createElement("img", {
    src: img.dataUrl,
    alt: img.name,
    style: {
      width: "100%",
      height: 80,
      objectFit: "cover",
      display: "block"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 80,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0ebe2"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24
    }
  }, "📄"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#a89680",
      marginTop: 2,
      padding: "0 4px",
      textAlign: "center",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "100%"
    }
  }, img.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(60,40,20,0.7)",
      padding: "2px 4px",
      fontSize: 9,
      color: "#fff",
      textAlign: "center"
    }
  }, img.size), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeImage(i),
    type: "button",
    style: {
      position: "absolute",
      top: 3,
      right: 3,
      background: "rgba(220,38,38,0.85)",
      border: "none",
      borderRadius: "50%",
      width: 18,
      height: 18,
      color: "#fff",
      cursor: "pointer",
      fontSize: 11,
      lineHeight: "18px",
      textAlign: "center",
      padding: 0
    }
  }, "×"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => fileInputRef.current && fileInputRef.current.click(),
    type: "button",
    style: {
      height: 80,
      borderRadius: 8,
      border: "2px dashed #e0d2bd",
      background: "transparent",
      color: "#a89680",
      fontSize: 22,
      cursor: "pointer"
    }
  }, "+")), images.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 11,
      color: "#a89680"
    }
  }, images.length, " file", images.length > 1 ? "s" : "", " attached · Names will be saved in movement notes")), err && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ef444420",
      border: "1px solid #ef444460",
      borderRadius: 8,
      padding: "10px 13px",
      color: "#fca5a5",
      fontSize: 13
    }
  }, "❌ ", err)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      ...ghost,
      flex: 1
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    disabled: busy || compressing > 0,
    style: {
      ...btnS(),
      flex: 2,
      opacity: busy || compressing > 0 ? 0.7 : 1
    }
  }, busy ? "Saving…" : compressing > 0 ? "Processing image…" : "Record Movement"))));
}

// ─────────────────────────────────────────────────────────────
//  MOVEMENTS LIST MODAL
// ─────────────────────────────────────────────────────────────
function MovListModal({
  user,
  onClose,
  onApproveSuccess,
  staffDB,
  products
}) {
  const [movs, setMovs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(null);
  const [msg, setMsg] = React.useState("");
  const [pageLimit, setPageLimit] = React.useState(10);
  const [hasMore, setHasMore] = React.useState(false);
  const [reverseModal, setReverseModal] = React.useState(null); // movementID to reverse
  const [reverseReason, setReverseReason] = React.useState("");
  const [reverseBusy, setReverseBusy] = React.useState(false);
  const [viewImg, setViewImg] = React.useState(null); // lightbox image URL
  const [productFilter, setProductFilter] = React.useState(""); // ProductID or "" for all
  const load = React.useCallback(async lim => {
    setLoading(true);
    try {
      const all = await api("getMovements", {
        includeLines: "true",
        limit: String(lim || pageLimit)
      });
      const filtered = user.canViewAll ? all : all.filter(m => m.EnteredByEmail === user.email);
      setMovs(filtered);
      setHasMore(filtered.length >= (lim || pageLimit));
    } catch (e) {
      setMsg("❌ " + e.message);
    }
    setLoading(false);
  }, [user, pageLimit]);
  React.useEffect(() => {
    load(pageLimit);
  }, [load, pageLimit]);
  async function approve(movID) {
    if (!user.canApprove) {
      setMsg("❌ Your role cannot approve movements.");
      return;
    }
    setBusy(movID);
    try {
      await apiWrite("approveMovement", user.email, {
        movementID: movID
      });
      setMsg("✅ Approved " + movID);
      load();
      if (onApproveSuccess) onApproveSuccess();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
    setBusy(null);
  }
  async function reverse(movID, reason) {
    if (!user.canReverse) { setMsg("❌ Your role cannot reverse movements."); return; }
    if (!reason.trim()) { setMsg("❌ Please enter a reason for the reversal."); return; }
    setReverseBusy(true);
    try {
      const res = await apiWrite("reverseMovement", user.email, { movementID: movID, reason: reason.trim() });
      setMsg("✅ Reversed " + movID + " → " + res.reversalMovementID);
      setReverseModal(null);
      setReverseReason("");
      load();
      if (onApproveSuccess) onApproveSuccess();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
    setReverseBusy(false);
  }
  const displayMovs = productFilter ? movs.filter(m => m.lines && m.lines.some(l => l.ProductID === productFilter)) : movs;
  const lightbox = viewImg ? /*#__PURE__*/React.createElement("div", {
    onClick: () => setViewImg(null),
    style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }
  }, /*#__PURE__*/React.createElement("img", {
    src: viewImg,
    style: { maxWidth: "95vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 40px rgba(0,0,0,0.6)" }
  }), /*#__PURE__*/React.createElement("div", {
    style: { position: "absolute", top: 14, right: 18, color: "#fff", fontSize: 32, cursor: "pointer", fontWeight: 700, lineHeight: 1 },
    onClick: e => { e.stopPropagation(); setViewImg(null); }
  }, "×")) : null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, lightbox, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(60,40,20,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fefcf9",
      borderRadius: 16,
      width: 660,
      maxWidth: "100%",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      border: "1px solid #e0d2bd"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid #e7d9c4",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2c211a",
      fontWeight: 800,
      fontSize: 15
    }
  }, "📋 ", user.canViewAll ? "All Movements" : "My Movements"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: productFilter,
    onChange: e => setProductFilter(e.target.value),
    style: { borderRadius: 7, border: "1px solid #e0d2bd", padding: "6px 8px", fontSize: 12, color: "#2c211a", background: "#faf6f0", maxWidth: 150 }
  }, /*#__PURE__*/React.createElement("option", { value: "" }, "All products"), (products || []).map(p => /*#__PURE__*/React.createElement("option", { key: p.ProductID, value: p.ProductID }, p.ProductName))), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: {
      ...ghost,
      padding: "6px 11px"
    }
  }, "⟳"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "#a89680",
      fontSize: 22,
      cursor: "pointer"
    }
  }, "×"))), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "9px 18px",
      background: msg.startsWith("❌") ? "#ef444420" : "#5f7a4f20",
      color: msg.startsWith("❌") ? "#fca5a5" : "#4ade80",
      fontSize: 13,
      borderBottom: "1px solid #e7d9c4"
    }
  }, msg), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: "auto",
      flex: 1
    }
  }, loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center",
      color: "#a89680"
    }
  }, "Loading…") : displayMovs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center",
      color: "#a89680"
    }
  }, "No movements found.") : displayMovs.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.MovementID,
    style: {
      borderBottom: "1px solid #e7d9c4",
      padding: "13px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      alignItems: "center",
      marginBottom: 4,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#2c211a",
      fontWeight: 700,
      fontSize: 13
    }
  }, m.MovementID), /*#__PURE__*/React.createElement("span", {
    style: {
      background: SC2[m.Status] + "20",
      color: SC2[m.Status],
      border: `1px solid ${SC2[m.Status]}40`,
      borderRadius: 5,
      padding: "1px 7px",
      fontSize: 11,
      fontWeight: 700
    }
  }, m.Status), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a89680",
      fontSize: 12
    }
  }, TYPE_LABEL[m.MovementType] || m.MovementType)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12,
      marginBottom: 4
    }
  }, LOC_LABEL[m.SourceLocationID] || m.SourceLocationID, " → ", LOC_LABEL[m.DestinationLocationID] || m.DestinationLocationID, m.ReferenceNumber ? " · " + m.ReferenceNumber : "", " · by " + (m.EnteredByEmail || "").split("@")[0]), m.lines && m.lines.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexWrap: "wrap"
    }
  }, m.lines.map(l => /*#__PURE__*/React.createElement("span", {
    key: l.MovementLineID,
    style: {
      background: "#efe4d2",
      borderRadius: 5,
      padding: "2px 7px",
      fontSize: 11,
      color: "#6f6152"
    }
  }, (products || []).find(p => p.ProductID === l.ProductID)?.ProductName || l.ProductID, " × ", l.Quantity)))),
  parseAttachments(m.DocumentFile).map((img, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => setViewImg(img),
    style: { cursor: "pointer", position: "relative", borderRadius: 8, overflow: "hidden", border: "2px solid #bd5d38", width: 64, height: 64, flexShrink: 0, marginTop: 6 }
  }, /*#__PURE__*/React.createElement("img", {
    src: img, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
  }), /*#__PURE__*/React.createElement("div", {
    style: { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(60,40,20,0.75)", fontSize: 8, color: "#fff", textAlign: "center", padding: "2px 0", fontWeight: 700 }
  }, "👁"))),
  m.Notes && m.Notes.includes("attachment(s)") && parseAttachments(m.DocumentFile).length === 0 && /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 10, color: "#bd5d38", fontWeight: 600, marginTop: 4 }
  }, "📄 PDF"),
  m.Status === "Draft" && user.canApprove && /*#__PURE__*/React.createElement("button", {
    onClick: () => approve(m.MovementID),
    disabled: busy === m.MovementID,
    style: {
      ...btnS("#5f7a4f"),
      padding: "6px 13px",
      fontSize: 12,
      opacity: busy === m.MovementID ? 0.6 : 1
    }
  }, busy === m.MovementID ? "…" : "Approve"), m.Status === "Draft" && !user.canApprove && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a89680",
      fontSize: 11
    }
  }, "Awaiting approval"),
  m.Status === "Approved" && user.canReverse && /*#__PURE__*/React.createElement("button", {
    onClick: () => { setReverseModal(m.MovementID); setReverseReason(""); setMsg(""); },
    style: {
      background: "none",
      border: "1px solid #bd5d38",
      color: "#bd5d38",
      borderRadius: 7,
      padding: "5px 11px",
      fontSize: 11,
      cursor: "pointer",
      fontWeight: 600
    }
  }, "↩ Reverse"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 18px",
      borderTop: "1px solid #e7d9c4",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#faf6f0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#a89680"
    }
  }, "Showing ", displayMovs.length, productFilter ? " filtered" : " latest", " movements"), hasMore && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const newLimit = pageLimit + 10;
      setPageLimit(newLimit);
      load(newLimit);
    },
    style: {
      background: "transparent",
      border: "1px solid #e0d2bd",
      borderRadius: 7,
      padding: "5px 14px",
      fontSize: 12,
      color: "#bd5d38",
      fontWeight: 700,
      cursor: "pointer"
    }
  }, "Load 10 more ↓"), !hasMore && movs.length > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#c8b9a3"
    }
  }, "All movements loaded")),
  reverseModal && React.createElement("div", {
    style: { position:"fixed", inset:0, background:"rgba(60,40,20,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:16 }
  }, React.createElement("div", {
    style: { background:"#fefcf9", borderRadius:16, padding:28, width:400, maxWidth:"100%", border:"1px solid #e0d2bd" }
  },
    React.createElement("div", { style:{ fontWeight:800, fontSize:16, color:"#bd5d38", marginBottom:6 } }, "↩ Reverse Movement"),
    React.createElement("div", { style:{ fontSize:13, color:"#6f6152", marginBottom:16 } },
      "You are about to reverse ", React.createElement("strong", null, reverseModal),
      ". This creates an equal and opposite approved movement, restoring the original stock. This action cannot be undone."
    ),
    React.createElement("div", { style:{ fontSize:12, fontWeight:700, color:"#2c211a", marginBottom:6 } }, "Reason for reversal *"),
    React.createElement("textarea", {
      value: reverseReason,
      onChange: e => setReverseReason(e.target.value),
      placeholder: "e.g. Entered wrong product, wrong quantity, duplicate entry...",
      rows: 3,
      style: { width:"100%", borderRadius:8, border:"1px solid #e0d2bd", padding:"9px 12px", fontSize:13, fontFamily:"inherit", resize:"vertical", background:"#faf8f4", color:"#2c211a" }
    }),
    React.createElement("div", { style:{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" } },
      React.createElement("button", {
        onClick: () => { setReverseModal(null); setReverseReason(""); },
        style: { ...ghost, padding:"9px 18px" }
      }, "Cancel"),
      React.createElement("button", {
        onClick: () => reverse(reverseModal, reverseReason),
        disabled: reverseBusy || !reverseReason.trim(),
        style: { background: reverseBusy || !reverseReason.trim() ? "#ccc" : "#bd5d38", color:"#fff", border:"none", borderRadius:9, padding:"9px 20px", fontWeight:700, cursor: reverseBusy || !reverseReason.trim() ? "not-allowed" : "pointer", fontSize:13 }
      }, reverseBusy ? "Reversing…" : "Confirm Reversal")
    )
  )))));
}

// ─────────────────────────────────────────────────────────────
//  STOCK COUNT / CYCLE COUNT MODAL
// ─────────────────────────────────────────────────────────────
function StockCountModal({
  products,
  stock,
  user,
  onClose,
  onDone
}) {
  const [pid, setPid] = React.useState(products[0]?.ProductID || "");
  const [locID, setLocID] = React.useState("MAIN_WH");
  const [physical, setPhysical] = React.useState("");
  const [reason, setReason] = React.useState("Cycle Count");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const REASONS = ["Cycle Count", "Annual Stock Take", "Damaged Recount", "Location Transfer Check", "Audit", "Other"];
  const PHYSICAL_LOCS = Object.entries(LOC_LABEL).filter(([k]) => STOCK_LOCATIONS.includes(k));

  // Compute current system stock for selected product + location
  const systemQty = stock ? stock.filter(s => s.ProductID === pid && s.LocationID === locID).reduce((a, s) => a + Number(s.Quantity), 0) : 0;
  const physNum = parseFloat(physical);
  const diff = !isNaN(physNum) ? physNum - systemQty : null;
  async function submit() {
    if (!physical || isNaN(physNum) || physNum < 0) {
      setErr("Enter a valid physical count (0 or more).");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await apiWrite("createStockCount", user.email, {
        locationID: locID,
        productID: pid,
        physicalQty: physNum,
        reason,
        notes
      });
      onDone(`✅ Count ${res.countID} created · diff: ${diff >= 0 ? "+" : ""}${diff} · pending Manager approval`);
      onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }
  const diffColor = diff === null ? "#a89680" : diff === 0 ? "#bd5d38" : diff > 0 ? "#a97b52" : "#b23a2e";
  const MODAL_STYLE = {
    position: "fixed",
    inset: 0,
    background: "rgba(60,40,20,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16
  };
  const BOX_STYLE = {
    background: "#fefcf9",
    borderRadius: 16,
    padding: 22,
    width: 460,
    maxWidth: "100%",
    border: "1px solid #e0d2bd",
    maxHeight: "90vh",
    overflowY: "auto"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: MODAL_STYLE
  }, /*#__PURE__*/React.createElement("div", {
    style: BOX_STYLE
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color: "#2c211a"
    }
  }, "🔢 New Stock Count"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "#a89680",
      fontSize: 22,
      cursor: "pointer"
    }
  }, "×")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Product to Count"), /*#__PURE__*/React.createElement("select", {
    value: pid,
    onChange: e => setPid(e.target.value),
    style: inp
  }, products.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.ProductID,
    value: p.ProductID
  }, p.ProductName, " (", p.VariantName, ")")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Location"), /*#__PURE__*/React.createElement("select", {
    value: locID,
    onChange: e => setLocID(e.target.value),
    style: inp
  }, PHYSICAL_LOCS.map(([k, v]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ef",
      borderRadius: 12,
      padding: 14,
      border: "1px solid #e7d9c4"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#a89680",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6
    }
  }, "System Stock"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 28,
      color: "#2c211a",
      letterSpacing: -1
    }
  }, systemQty), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginTop: 2
    }
  }, "calculated")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#a89680",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6
    }
  }, "Physical Count"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: physical,
    onChange: e => setPhysical(e.target.value),
    style: {
      ...inp,
      textAlign: "center",
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: -1,
      padding: "4px",
      height: 48,
      background: "#fff",
      border: "2px solid #bd5d38"
    },
    placeholder: "0",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginTop: 2
    }
  }, "enter here")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#a89680",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6
    }
  }, "Difference"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 28,
      color: diffColor,
      letterSpacing: -1
    }
  }, diff === null ? "—" : diff >= 0 ? "+" + diff : diff), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: diffColor,
      marginTop: 2
    }
  }, diff === null ? "" : diff === 0 ? "✅ Match" : diff > 0 ? "⬆ Surplus" : "⬇ Shortage")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Reason for Count"), /*#__PURE__*/React.createElement("select", {
    value: reason,
    onChange: e => setReason(e.target.value),
    style: inp
  }, REASONS.map(r => /*#__PURE__*/React.createElement("option", {
    key: r
  }, r)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Notes (optional)"), /*#__PURE__*/React.createElement("input", {
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "e.g. found 2 damaged, counted twice...",
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3810",
      border: "1px solid #bd5d3830",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: "#bd5d38"
    }
  }, "ℹ️ This count will be saved as ", /*#__PURE__*/React.createElement("b", null, "Pending"), ". A Manager or Owner must approve it before any stock adjustment is created."), err && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#b23a2e12",
      border: "1px solid #b23a2e40",
      borderRadius: 8,
      padding: "10px 13px",
      color: "#b23a2e",
      fontSize: 13
    }
  }, "❌ ", err)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      ...ghost,
      flex: 1
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    disabled: busy || !physical,
    style: {
      ...btnS(),
      flex: 2,
      opacity: busy || !physical ? 0.6 : 1
    }
  }, busy ? "Saving Count…" : "Submit Count"))));
}

// ─────────────────────────────────────────────────────────────
//  AMAZON IMPORT TAB v2
//  Handles: FBA Inventory Event Detail Report (CSV)
//  One upload → Stock Count + FBA Shipments + Damage
// ─────────────────────────────────────────────────────────────
function AssembleComboModal({
  products,
  stock,
  user,
  onClose,
  onDone
}) {
  const [bom, setBom] = React.useState(null);
  const [loadErr, setLoadErr] = React.useState("");
  const [comboID, setComboID] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    api("getComboBOM").then(rows => {
      if (!alive) return;
      const list = Array.isArray(rows) ? rows : [];
      setBom(list);
      const ids = Array.from(new Set(list.map(r => String(r.ComboProductID))));
      if (ids.length) setComboID(ids[0]);
    }).catch(e => { if (alive) setLoadErr(e.message); });
    return () => { alive = false; };
  }, []);

  const nameOf = pid => { const p = products.find(x => x.ProductID === pid); return p ? p.ProductName : pid; };
  const onHandWH = pid => stock ? stock.filter(s => s.ProductID === pid && s.LocationID === "MAIN_WH").reduce((a, s) => a + Number(s.Quantity), 0) : 0;

  const comboIDs = bom ? Array.from(new Set(bom.map(r => String(r.ComboProductID)))) : [];
  const recipe = bom ? bom.filter(r => String(r.ComboProductID) === comboID && Number(r.Qty) > 0) : [];
  const nQty = parseFloat(qty);
  const perUnitBuildable = recipe.length ? Math.min.apply(null, recipe.map(r => Math.floor(onHandWH(r.ComponentProductID) / Number(r.Qty)))) : 0;

  async function submit() {
    if (!comboID) { setErr("Pick a combo to assemble."); return; }
    if (!qty || isNaN(nQty) || nQty <= 0) { setErr("Enter a quantity greater than 0."); return; }
    const short = recipe.filter(r => onHandWH(r.ComponentProductID) < nQty * Number(r.Qty));
    if (short.length) { setErr("Not enough parts in Main Warehouse: " + short.map(r => nameOf(r.ComponentProductID)).join(", ")); return; }
    setBusy(true);
    setErr("");
    try {
      const res = await apiWrite("assembleCombo", user.email, { comboProductID: comboID, quantity: nQty });
      onDone("✅ " + res.movementID + " — assemble " + nQty + " × " + nameOf(comboID) + " saved as Draft" + (user.canApprove ? " — approve it on the dashboard" : " — a Manager will approve it"));
      onClose();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const MODAL_STYLE = { position: "fixed", inset: 0, background: "rgba(60,40,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 };
  const BOX_STYLE = { background: "#fefcf9", borderRadius: 16, padding: 22, width: 460, maxWidth: "100%", border: "1px solid #e0d2bd", maxHeight: "90vh", overflowY: "auto" };
  const LBL = { fontSize: 12, fontWeight: 700, color: "#5a6b5b", marginBottom: 4, display: "block" };
  const INP = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid #ccd3c4", fontSize: 14, marginBottom: 14, boxSizing: "border-box" };

  return /*#__PURE__*/React.createElement("div", { style: MODAL_STYLE }, /*#__PURE__*/React.createElement("div", { style: BOX_STYLE }, /*#__PURE__*/React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /*#__PURE__*/React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color: "#2c211a" } }, "🧩 Assemble Combo"), /*#__PURE__*/React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#a89680" } }, "×")), loadErr ? /*#__PURE__*/React.createElement("div", { style: { color: "#b23a2e", fontSize: 13 } }, "Couldn't load recipes: " + loadErr) : bom === null ? /*#__PURE__*/React.createElement("div", { style: { color: "#a89680", fontSize: 13, padding: "10px 0" } }, "Loading recipes…") : comboIDs.length === 0 ? /*#__PURE__*/React.createElement("div", { style: { color: "#a89680", fontSize: 13, padding: "10px 0" } }, "No combos found. Add rows to the Combo_BOM sheet first.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", { style: LBL }, "Combo to build"), /*#__PURE__*/React.createElement("select", { value: comboID, onChange: e => setComboID(e.target.value), style: INP }, comboIDs.map(id => /*#__PURE__*/React.createElement("option", { key: id, value: id }, nameOf(id) + " (" + id + ")"))), /*#__PURE__*/React.createElement("label", { style: LBL }, "Quantity to assemble"), /*#__PURE__*/React.createElement("input", { type: "number", min: "1", value: qty, onChange: e => setQty(e.target.value), placeholder: "e.g. 20", style: INP }), /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: "#bd5d38", marginTop: -8, marginBottom: 14 } }, "Buildable now from parts: " + perUnitBuildable), /*#__PURE__*/React.createElement("div", { style: { background: "#f4f1ea", borderRadius: 10, padding: "10px 12px", marginBottom: 14 } }, /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#5a6b5b", marginBottom: 6 } }, "Will consume from Main Warehouse:"), recipe.map(r => {
    const need = (nQty > 0 ? nQty : 0) * Number(r.Qty);
    const have = onHandWH(r.ComponentProductID);
    const okStock = have >= need;
    return /*#__PURE__*/React.createElement("div", { key: r.ComponentProductID, style: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0", color: okStock ? "#2c211a" : "#b23a2e" } }, /*#__PURE__*/React.createElement("span", null, nameOf(r.ComponentProductID) + " × " + Number(r.Qty) + "/unit"), /*#__PURE__*/React.createElement("span", null, "need " + need + " · have " + have));
  })), err && /*#__PURE__*/React.createElement("div", { style: { color: "#b23a2e", fontSize: 13, marginBottom: 10 } }, err), /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } }, /*#__PURE__*/React.createElement("button", { onClick: onClose, style: { padding: "9px 18px", borderRadius: 9, border: "1px solid #ccd3c4", background: "#fff", cursor: "pointer", fontSize: 14 } }, "Cancel"), /*#__PURE__*/React.createElement("button", { onClick: submit, disabled: busy, style: { padding: "9px 20px", borderRadius: 9, border: "none", background: busy ? "#a89680" : "#6d5ae6", color: "#fff", cursor: busy ? "default" : "pointer", fontSize: 14, fontWeight: 700 } }, busy ? "Saving…" : "Assemble")))));
}

function AmazonImportTab({
  products,
  stock,
  user,
  notify,
  onCountCreated
}) {
  const [csvData, setCsvData] = React.useState(null);
  const [preview, setPreview] = React.useState([]);
  const [importing, setImporting] = React.useState(false);
  const [importLog, setImportLog] = React.useState([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [reportDate, setReportDate] = React.useState("");
  const [manualDate, setManualDate] = React.useState("");
  const [importNote, setImportNote] = React.useState("");
  const [step, setStep] = React.useState("upload");
  const [importedDates, setImportedDates] = React.useState({}); // { "YYYY-MM-DD": true }
  const [showHistory, setShowHistory] = React.useState(false);
  const fileRef = React.useRef(null);
  const effectiveDate = manualDate || reportDate;

  // Load import history from storage on mount
  React.useEffect(() => {
    try {
      const _cached = localStorage.getItem("amazon_import_dates");
      if (_cached) setImportedDates(JSON.parse(_cached));
    } catch (e) {}
  }, []);

  // Save imported dates to storage
  async function saveImportedDate(dateStr) {
    if (!dateStr) return;
    try {
      const existing = {
        ...importedDates
      };
      const dateKey = normaliseDate(dateStr);
      if (!dateKey) return;
      if (!existing[dateKey]) {
        existing[dateKey] = new Date().toISOString().slice(0, 10);
        setImportedDates(existing);
        localStorage.setItem("amazon_import_dates", JSON.stringify(existing));
      }
    } catch (e) {}
  }

  // Convert any date format to YYYY-MM-DD
  function normaliseDate(d) {
    if (!d) return null;
    // MM/DD/YYYY → YYYY-MM-DD
    const mmddyyyy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) return `${mmddyyyy[3]}-${mmddyyyy[1].padStart(2, "0")}-${mmddyyyy[2].padStart(2, "0")}`;
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return null;
  }
  function isDateImported(d) {
    const key = normaliseDate(d);
    return key ? !!importedDates[key] : false;
  }
  async function clearImportHistory() {
    setImportedDates({});
    try {
      localStorage.removeItem("amazon_import_dates");
    } catch (e) {}
  }
  function reset() {
    setCsvData(null);
    setPreview([]);
    setImportLog([]);
    setReportDate("");
    setManualDate("");
    setImportNote("");
    setStep("upload");
  }

  // ── Parse FBA Inventory Event Detail Report ──
  function parseFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const lines = text.trim().split(/\r?\n/);
        const delim = lines[0].includes("\t") ? "\t" : ",";

        // Strip quotes
        const clean = s => s.replace(/^"|"$/g, "").trim();
        const headers = lines[0].split(delim).map(clean);
        const rows = lines.slice(1).filter(l => l.trim()).map(line => {
          const vals = line.split(delim).map(clean);
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] || "";
          });
          return obj;
        });

        // Verify it's the right report
        if (!headers.includes("Ending Warehouse Balance") || !headers.includes("Disposition")) {
          notify("❌ Wrong file. Please upload the FBA Inventory Event Detail Report.");
          return;
        }

        // ── CORRECT AGGREGATION ──────────────────────────────
        // The report is a DAILY LEDGER per FC per ASIN.
        // Each row = one day × one FC × one disposition.
        //
        // CURRENT STOCK  = SUM of Ending Warehouse Balance
        //                  for the LATEST DATE at each FC
        //                  where Disposition = SELLABLE
        //
        // EVENTS (shipments, damage etc)
        //                = SUM across ALL dates and ALL FCs
        //                  (each day's events are unique)
        // ─────────────────────────────────────────────────

        // Step 1: collect all rows per ASIN
        const byAsin = {};
        rows.forEach(r => {
          const asin = r["ASIN"];
          const disp = r["Disposition"];
          if (!asin) return;
          if (!byAsin[asin]) byAsin[asin] = {
            asin,
            fnsku: r["FNSKU"],
            msku: r["MSKU"],
            title: r["Title"],
            // latest ending balance per FC (for current stock)
            latestEndingByFC: {},
            // { FC: { date, ending } }
            latestDamagedByFC: {},
            // events summed across all dates (each day unique)
            shipments: 0,
            returns_sellable: 0,
            returns_damaged: 0,
            damaged: 0,
            lost: 0,
            disposed: 0,
            receipts: 0,
            found: 0,
            allDates: new Set()
          };
          const fc = r["Location"] || "UNKNOWN";
          const date = r["Date"] || "";
          byAsin[asin].allDates.add(date);
          if (disp === "SELLABLE") {
            // Track latest ending balance per FC (always — for current stock)
            const cur = byAsin[asin].latestEndingByFC[fc];
            if (!cur || date >= cur.date) {
              byAsin[asin].latestEndingByFC[fc] = {
                date,
                ending: parseInt(r["Ending Warehouse Balance"] || 0)
              };
            }
            // Sum events — but SKIP the first date if it was in a previous upload
            // This prevents double-counting overlap dates
            const skipThisDate = date === firstDate && firstDateAlreadyImported;
            if (!skipThisDate) {
              byAsin[asin].shipments += parseInt(r["Customer Shipments"] || 0);
              byAsin[asin].returns_sellable += parseInt(r["Customer Returns"] || 0);
              byAsin[asin].damaged += parseInt(r["Damaged"] || 0);
              byAsin[asin].lost += parseInt(r["Lost"] || 0);
              byAsin[asin].disposed += parseInt(r["Disposed"] || 0);
              byAsin[asin].receipts += parseInt(r["Receipts"] || 0);
              byAsin[asin].found += parseInt(r["Found"] || 0);
            }
          } else if (disp === "WAREHOUSE_DAMAGED") {
            const cur = byAsin[asin].latestDamagedByFC[fc];
            if (!cur || date >= cur.date) {
              byAsin[asin].latestDamagedByFC[fc] = {
                date,
                ending: parseInt(r["Ending Warehouse Balance"] || 0)
              };
            }
            byAsin[asin].returns_damaged += parseInt(r["Customer Returns"] || 0);
          }
        });

        // Detect overlap: find the earliest date in this report
        const allDatesInReport = [...new Set(rows.map(r => r["Date"]).filter(Boolean))].sort();
        const firstDate = allDatesInReport[0]; // potential overlap date with previous upload
        const lastDate = allDatesInReport[allDatesInReport.length - 1];
        const firstDateKey = normaliseDate(firstDate);

        // Check if first date was already imported
        const firstDateAlreadyImported = firstDateKey && importedDates[firstDateKey];

        // Step 2: compute final totals from latest-per-FC data
        Object.values(byAsin).forEach(a => {
          // Current sellable stock = sum of latest ending balance at each FC
          a.sellable_ending = Object.values(a.latestEndingByFC).reduce((sum, fc) => sum + fc.ending, 0);

          // Current damaged ending at FBA
          a.damaged_ending = Object.values(a.latestDamagedByFC).reduce((sum, fc) => sum + fc.ending, 0);

          // Date range for display
          const dArr = [...a.allDates].sort();
          a.dateRange = dArr.length > 1 ? `${dArr[0]} – ${dArr[dArr.length - 1]}` : dArr[0] || "";
          a.latestDate = dArr[dArr.length - 1] || "";

          // FC breakdown for transparency
          a.fcBreakdown = Object.entries(a.latestEndingByFC).map(([fc, v]) => `${fc}:${v.ending}`).join(", ");
          delete a.latestEndingByFC;
          delete a.latestDamagedByFC;
          delete a.allDates;
        });

        // Detect report date
        const allDates = rows.map(r => r["Date"]).filter(Boolean).sort();
        setReportDate(allDates[allDates.length - 1] || "");

        // Match to Products sheet by ASIN or FNSKU
        const enriched = Object.values(byAsin).map(row => {
          const prod = products.find(p => p.AmazonASIN === row.asin || p.FNSKU === row.fnsku);

          // Calculate what actions to take
          const shipped = Math.abs(row.shipments); // shipments is negative in report
          const dmgTotal = Math.abs(row.damaged) + Math.abs(row.lost) + Math.abs(row.disposed) + row.returns_damaged;

          // Current FBA stock in our system
          const systemFBA = stock ? stock.filter(s => s.ProductID === prod?.ProductID && s.LocationID === "AMAZON_FBA").reduce((a, s) => a + Number(s.Quantity), 0) : 0;
          const stockDiff = row.sellable_ending - systemFBA;
          const actions = [];
          actions.push({
            type: "count",
            label: "Stock Count",
            color: "#bd5d38",
            detail: `Amazon has ${row.sellable_ending} sellable units · System shows ${systemFBA} · Diff ${stockDiff >= 0 ? "+" : ""}${stockDiff}`,
            qty: row.sellable_ending,
            skip: stockDiff === 0,
            skipReason: "✅ System matches Amazon — no count needed"
          });
          if (shipped > 0) actions.push({
            type: "shipped",
            label: "FBA Shipments",
            color: "#a97b52",
            detail: `${shipped} units shipped by Amazon to customers`,
            qty: shipped,
            skip: false
          });
          if (dmgTotal > 0) actions.push({
            type: "damage",
            label: "Damage / Loss",
            color: "#b23a2e",
            detail: `${dmgTotal} units (Damaged: ${row.damaged}, Lost: ${row.lost}, Disposed: ${row.disposed}, Dmg Returns: ${row.returns_damaged})`,
            qty: dmgTotal,
            skip: false
          });
          if (row.returns_sellable > 0) actions.push({
            type: "skip_return",
            label: "Sellable Returns",
            color: "#a89680",
            detail: `${row.returns_sellable} units returned as sellable — Amazon auto-restocks, nothing to do`,
            qty: row.returns_sellable,
            skip: true,
            skipReason: "⏭️ Auto-restocked by Amazon"
          });
          return {
            ...row,
            prod,
            systemFBA,
            stockDiff,
            actions
          };
        });
        setPreview(enriched);
        setCsvData(byAsin);
        // Pass overlap info for display
        setPreview(prev => prev.map(r => ({
          ...r,
          _overlapDate: firstDate,
          _overlapSkipped: firstDateAlreadyImported,
          _dateRange: allDatesInReport
        })));
        setStep("preview");
      } catch (ex) {
        notify("❌ Parse error: " + ex.message);
      }
    };
    reader.readAsText(file);
  }

  // ── Run Import ──
  async function runImport() {
    setImporting(true);
    const log = [];
    const dateRef = effectiveDate || new Date().toISOString().slice(0, 10);
    for (const row of preview) {
      if (!row.prod) {
        log.push({
          ok: false,
          asin: row.asin,
          msg: `❌ ASIN ${row.asin} not in Products sheet — skipped`
        });
        continue;
      }
      const pid = row.prod.ProductID;
      const name = row.prod.ProductName;

      // 1. Stock Count (skip if already matching)
      const countAction = row.actions.find(a => a.type === "count");
      if (countAction && !countAction.skip) {
        try {
          const res = await apiWrite("createStockCount", user.email, {
            locationID: "AMAZON_FBA",
            productID: pid,
            physicalQty: countAction.qty,
            reason: "FBA Inventory Report Upload",
            notes: `Report date: ${dateRef}. Amazon: ${countAction.qty} units, System: ${row.systemFBA}.${importNote ? " Note: " + importNote : ""}`
          });
          log.push({
            ok: true,
            asin: row.asin,
            msg: `📊 ${name} — Count ${res.countID} created (diff: ${row.stockDiff >= 0 ? "+" : ""}${row.stockDiff})`
          });
        } catch (e) {
          log.push({
            ok: false,
            asin: row.asin,
            msg: `❌ ${name} count failed: ${e.message}`
          });
        }
      } else if (countAction?.skip) {
        log.push({
          ok: true,
          asin: row.asin,
          msg: `✅ ${name} — Stock matches (${row.sellable_ending} units), no count needed`
        });
      }

      // 2. FBA Shipments → Website–FBA Ship movement
      const shipAction = row.actions.find(a => a.type === "shipped");
      if (shipAction) {
        try {
          const res = await apiWrite("createMovement", user.email, {
            movementType: "Website \u2013 FBA Ship",
            sourceLocationID: "AMAZON_FBA",
            destinationLocationID: "WEBSITE_SALES",
            referenceType: "FBA Inventory Report",
            referenceNumber: `FBA-SHIP-${dateRef}`,
            notes: `Amazon shipped ${shipAction.qty} units. Report: ${dateRef}.${importNote ? " Note: " + importNote : ""}`,
            lines: [{
              productID: pid,
              quantity: shipAction.qty
            }]
          });
          log.push({
            ok: true,
            asin: row.asin,
            msg: `🚚 ${name} — ${shipAction.qty} units FBA shipment recorded (${res.movementID})`
          });
        } catch (e) {
          log.push({
            ok: false,
            asin: row.asin,
            msg: `❌ ${name} shipment failed: ${e.message}`
          });
        }
      }

      // 3. Damage / Loss / Disposed
      const dmgAction = row.actions.find(a => a.type === "damage");
      if (dmgAction) {
        try {
          const res = await apiWrite("createMovement", user.email, {
            movementType: "Damage",
            sourceLocationID: "AMAZON_FBA",
            destinationLocationID: "DAMAGE",
            referenceType: "FBA Inventory Report",
            referenceNumber: `FBA-DMG-${dateRef}`,
            notes: `${dmgAction.detail}.${importNote ? " Note: " + importNote : ""}`,
            lines: [{
              productID: pid,
              quantity: dmgAction.qty
            }]
          });
          log.push({
            ok: true,
            asin: row.asin,
            msg: `⚠️ ${name} — ${dmgAction.qty} units Damage recorded (${res.movementID})`
          });
        } catch (e) {
          log.push({
            ok: false,
            asin: row.asin,
            msg: `❌ ${name} damage failed: ${e.message}`
          });
        }
      }

      // 4. Skipped sellable returns
      const skipReturn = row.actions.find(a => a.type === "skip_return");
      if (skipReturn) {
        log.push({
          ok: true,
          asin: row.asin,
          msg: `⏭️ ${name} — ${skipReturn.qty} sellable return(s) skipped (Amazon auto-restocked)`
        });
      }
    }
    setImportLog(log);
    setImporting(false);
    setStep("done");

    // Save ALL dates from this report to history
    // so future overlapping uploads can detect and skip them
    if (preview[0]?._dateRange) {
      for (const d of preview[0]._dateRange) {
        await saveImportedDate(d);
      }
    }
    const ok = log.filter(l => l.ok).length;
    const err = log.filter(l => !l.ok).length;
    notify(`✅ Import complete — ${ok} actions${err > 0 ? `, ${err} errors` : ""}`);
    onCountCreated();
  }

  // ── STATUS COLORS ──
  const diffColor = d => d === 0 ? "#bd5d38" : d > 0 ? "#a97b52" : "#b23a2e";
  const diffLabel = d => d === 0 ? "✅ Match" : d > 0 ? `⬆ +${d} surplus` : `⬇ ${d} shortage`;

  // ── RENDER ──
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: { background: "linear-gradient(135deg,#241b14,#3f2e20)", borderRadius: 16, padding: "16px 18px", marginBottom: 16, color: "#f2e7d5" }
  }, /*#__PURE__*/React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11 } }, /*#__PURE__*/React.createElement("div", { style: { width: 42, height: 42, borderRadius: 11, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /*#__PURE__*/React.createElement(AmazonIcon, { size: 30, color: "#241b14" })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", { style: { fontFamily: "Fraunces,serif", fontSize: 19, fontWeight: 600 } }, "Amazon FBA"), /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#c9b49a", marginTop: 1 } }, "Upload a Seller Central report to sync FBA")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3812",
      border: "1px solid #bd5d3830",
      borderRadius: 12,
      padding: "14px 18px",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      color: "#2c211a",
      fontSize: 14,
      marginBottom: 6
    }
  }, "📋 FBA Inventory Event Detail Report"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6f6152",
      fontSize: 13,
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("b", null, "How to download from Seller Central:"), /*#__PURE__*/React.createElement("br", null), "Reports → Fulfillment → Inventory → ", /*#__PURE__*/React.createElement("b", null, "Inventory Event Detail"), " → Select date range → Download"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, [{
    icon: "📊",
    label: "Stock Count",
    desc: "Syncs FBA sellable qty"
  }, {
    icon: "🚚",
    label: "FBA Shipments",
    desc: "Records customer dispatches"
  }, {
    icon: "⚠️",
    label: "Damage / Loss",
    desc: "Records damaged/lost units"
  }, {
    icon: "⏭️",
    label: "Sellable Returns",
    desc: "Skipped — Amazon restocks"
  }].map(t => /*#__PURE__*/React.createElement("div", {
    key: t.label,
    style: {
      background: "#fdf9f1",
      border: "1px solid #e7d9c4",
      borderRadius: 8,
      padding: "6px 12px",
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, t.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#2c211a"
    }
  }, t.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680"
    }
  }, t.desc)))))), step === "upload" && Object.keys(importedDates).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fdf9f1",
      border: "1px solid #e7d9c4",
      borderRadius: 12,
      padding: "12px 16px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: showHistory ? 10 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#2c211a",
      fontWeight: 600
    }
  }, "📅 ", Object.keys(importedDates).length, " dates already imported", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a89680",
      fontWeight: 400,
      fontSize: 12,
      marginLeft: 8
    }
  }, "(overlap dates will be auto-excluded)")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHistory(h => !h),
    style: {
      ...ghost,
      fontSize: 11,
      padding: "3px 10px"
    }
  }, showHistory ? "Hide" : "View", " history"), /*#__PURE__*/React.createElement("button", {
    onClick: clearImportHistory,
    style: {
      ...ghost,
      fontSize: 11,
      padding: "3px 10px",
      color: "#b23a2e",
      borderColor: "#b23a2e40"
    }
  }, "Clear history"))), showHistory && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 6
    }
  }, Object.entries(importedDates).sort().map(([date, importedOn]) => /*#__PURE__*/React.createElement("div", {
    key: date,
    style: {
      background: "#f8f4ef",
      border: "1px solid #e7d9c4",
      borderRadius: 6,
      padding: "3px 10px",
      fontSize: 11,
      color: "#6f6152"
    }
  }, date, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#c8b9a3",
      marginLeft: 4
    }
  }, "(uploaded ", importedOn, ")"))))), step === "upload" && /*#__PURE__*/React.createElement("div", {
    onDragOver: e => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: e => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) parseFile(f);
    },
    onClick: () => fileRef.current?.click(),
    style: {
      border: `2px dashed ${dragOver ? "#bd5d38" : "#e0d2bd"}`,
      borderRadius: 14,
      padding: "52px 24px",
      textAlign: "center",
      cursor: "pointer",
      background: dragOver ? "#bd5d3808" : "#fdf9f1",
      transition: "all 0.2s"
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".csv,.txt,.tsv",
    style: {
      display: "none"
    },
    onChange: e => parseFile(e.target.files[0])
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 14
    }
  }, "📂"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#2c211a",
      marginBottom: 8
    }
  }, "Drop your FBA Inventory Event Detail Report"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13,
      marginBottom: 20
    }
  }, "Accepts .csv or .txt · Tab or comma delimited"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-block",
      background: "#bd5d38",
      color: "#fff",
      borderRadius: 9,
      padding: "10px 24px",
      fontSize: 14,
      fontWeight: 700
    }
  }, "Choose File")), step === "preview" && preview.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      flexWrap: "wrap",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3815",
      border: "1px solid #bd5d3830",
      borderRadius: 8,
      padding: "5px 14px",
      fontSize: 13,
      color: "#bd5d38",
      fontWeight: 700
    }
  }, preview.filter(r => r.prod).length, " ASINs matched"), preview.filter(r => !r.prod).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3815",
      border: "1px solid #bd5d3830",
      borderRadius: 8,
      padding: "5px 14px",
      fontSize: 13,
      color: "#bd5d38",
      fontWeight: 700
    }
  }, "⚠️ ", preview.filter(r => !r.prod).length, " ASINs not in Products sheet"), effectiveDate && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#a97b5215",
      border: "1px solid #a97b5230",
      borderRadius: 8,
      padding: "5px 14px",
      fontSize: 13,
      color: "#a97b52",
      fontWeight: 700
    }
  }, "📅 ", manualDate ? "Date set: " : "Report: ", effectiveDate), importNote && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3815",
      border: "1px solid #bd5d3830",
      borderRadius: 8,
      padding: "5px 14px",
      fontSize: 13,
      color: "#bd5d38",
      fontWeight: 600,
      maxWidth: 300,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, "📝 ", importNote)), /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    style: {
      ...ghost,
      fontSize: 12,
      padding: "5px 12px"
    }
  }, "✕ Clear")), preview[0]?._overlapSkipped && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3812",
      border: "1px solid #bd5d3840",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 14,
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      flexShrink: 0
    }
  }, "✅"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2c211a",
      fontSize: 13,
      marginBottom: 3
    }
  }, "Overlap date handled automatically"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6f6152",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("b", null, preview[0]._overlapDate), " was in your previous upload. Events on that date have been ", /*#__PURE__*/React.createElement("b", null, "excluded from this import"), " to prevent double-counting. Only stock counts use the ending balance — those are always safe to re-import."))), preview[0] && !preview[0]._overlapSkipped && preview[0]._overlapDate && importedDates[normaliseDate(preview[0]._overlapDate)] === undefined && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3810",
      border: "1px solid #bd5d3830",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 14,
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      flexShrink: 0
    }
  }, "ℹ️"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6f6152",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("b", null, "First import detected."), " All dates including ", /*#__PURE__*/React.createElement("b", null, preview[0]._overlapDate), " will be imported. Future uploads overlapping this date will automatically skip its events.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fdf9f1",
      border: "1px solid #e7d9c4",
      borderRadius: 12,
      padding: "16px 18px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2c211a",
      fontSize: 13,
      marginBottom: 12
    }
  }, "📅 Import Details"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Report Date"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: manualDate || (reportDate ? (() => {
      // Convert MM/DD/YYYY to YYYY-MM-DD for input[type=date]
      const parts = reportDate.split("/");
      return parts.length === 3 ? `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}` : reportDate;
    })() : ""),
    onChange: e => setManualDate(e.target.value),
    style: {
      ...inp,
      colorScheme: "light"
    }
  }), reportDate && !manualDate && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginTop: 3
    }
  }, "Auto-detected: ", reportDate)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Import Note (optional)"), /*#__PURE__*/React.createElement("input", {
    value: importNote,
    onChange: e => setImportNote(e.target.value),
    placeholder: "e.g. Week 25 FBA report, Prime Day prep stock, checked by Pushpanjali...",
    style: inp
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginTop: 3
    }
  }, "This note is saved with every count and movement created from this upload")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 12,
      marginBottom: 16
    }
  }, preview.map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: "#fdf9f1",
      border: `1px solid ${row.prod ? "#e7d9c4" : "#bd5d3850"}`,
      borderRadius: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderBottom: "1px solid #f0ebe2",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      color: "#2c211a",
      fontSize: 14,
      marginBottom: 2
    }
  }, row.prod ? row.prod.ProductName : row.title.slice(0, 50) + "…"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 11
    }
  }, row.asin, " · ", row.fnsku, !row.prod && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#bd5d38",
      fontWeight: 600
    }
  }, " · ⚠️ Not in Products sheet")), row.fcBreakdown && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3",
      fontSize: 10,
      marginTop: 2
    }
  }, "FC breakdown: ", row.fcBreakdown), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3",
      fontSize: 10,
      marginTop: 1
    }
  }, row.dateRange && `Report period: ${row.dateRange}`)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginBottom: 2
    }
  }, "AMAZON"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 22,
      color: "#2c211a",
      letterSpacing: -0.5
    }
  }, row.sellable_ending)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#e0d2bd",
      fontSize: 18
    }
  }, "vs"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginBottom: 2
    }
  }, "SYSTEM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 22,
      color: "#2c211a",
      letterSpacing: -0.5
    }
  }, row.systemFBA)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: diffColor(row.stockDiff) + "15",
      border: `1px solid ${diffColor(row.stockDiff)}40`,
      borderRadius: 8,
      padding: "6px 12px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 18,
      color: diffColor(row.stockDiff)
    }
  }, row.stockDiff >= 0 ? "+" : "", row.stockDiff), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: diffColor(row.stockDiff),
      fontWeight: 600
    }
  }, diffLabel(row.stockDiff).split(" ")[0])))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, row.actions.map((act, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      opacity: act.skip ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: act.skip ? "#c8b9a3" : act.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: act.skip ? "#a89680" : act.color,
      marginRight: 8
    }
  }, act.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#6f6152"
    }
  }, act.detail)), act.skip && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#a89680",
      fontStyle: "italic",
      whiteSpace: "nowrap"
    }
  }, act.skipReason))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      bottom: 0,
      background: "#efe4d2",
      padding: "14px 0",
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    style: {
      ...ghost,
      flex: 1
    }
  }, "← Upload Different File"), /*#__PURE__*/React.createElement("button", {
    onClick: runImport,
    disabled: importing || preview.filter(r => r.prod).length === 0,
    style: {
      ...btnS("#bd5d38"),
      flex: 2,
      fontSize: 14,
      opacity: importing || preview.filter(r => r.prod).length === 0 ? 0.6 : 1
    }
  }, importing ? "Importing…" : `Import ${preview.filter(r => r.prod).length} ASINs into Sheet`))), step === "done" && importLog.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 10,
      marginBottom: 16
    }
  }, [{
    label: "Stock Counts",
    count: importLog.filter(l => l.msg.includes("Count")).length,
    color: "#bd5d38",
    icon: "📊"
  }, {
    label: "FBA Shipments",
    count: importLog.filter(l => l.msg.includes("shipment")).length,
    color: "#a97b52",
    icon: "🚚"
  }, {
    label: "Damage",
    count: importLog.filter(l => l.msg.includes("Damage")).length,
    color: "#b23a2e",
    icon: "⚠️"
  }, {
    label: "Errors",
    count: importLog.filter(l => !l.ok).length,
    color: "#bd5d38",
    icon: "❌"
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      background: "#fdf9f1",
      border: `1px solid ${s.color}30`,
      borderRadius: 10,
      padding: "12px 14px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      marginBottom: 4
    }
  }, s.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 22,
      color: s.color
    }
  }, s.count), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#a89680",
      marginTop: 2
    }
  }, s.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fdf9f1",
      border: "1px solid #e7d9c4",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px",
      background: "#f8f4ef",
      borderBottom: "1px solid #e7d9c4"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#2c211a"
    }
  }, "Import Log"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#a89680",
      marginTop: 3,
      display: "flex",
      gap: 16
    }
  }, importLog[0] && /*#__PURE__*/React.createElement("span", null, "📅 ", effectiveDate || "Date not set"), importNote && /*#__PURE__*/React.createElement("span", null, "📝 ", importNote))), importLog.map((entry, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "9px 16px",
      borderBottom: i < importLog.length - 1 ? "1px solid #f0ebe2" : "none",
      fontSize: 13,
      color: entry.ok ? "#2c211a" : "#b23a2e",
      background: entry.ok ? "transparent" : "#b23a2e05"
    }
  }, entry.msg))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3810",
      border: "1px solid #bd5d3830",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 16,
      fontSize: 13,
      color: "#6f6152"
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "#bd5d38"
    }
  }, "Next step:"), " Go to ", /*#__PURE__*/React.createElement("b", null, "🔢 Stock Count"), " tab → Manager approves the stock counts → FBA stock updates automatically. FBA Shipment and Damage movements are saved as ", /*#__PURE__*/React.createElement("b", null, "Draft"), " — also need approval."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    style: {
      ...ghost,
      flex: 1
    }
  }, "Upload Another Report"), /*#__PURE__*/React.createElement("button", {
    onClick: onCountCreated,
    style: {
      ...btnS("#bd5d38"),
      flex: 2
    }
  }, "→ Go to Stock Count Tab"))), step === "preview" && preview.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fdf9f1",
      border: "1px solid #e7d9c4",
      borderRadius: 12,
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 8
    }
  }, "🔍"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2c211a",
      marginBottom: 6
    }
  }, "No ASINs found"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13,
      marginBottom: 16
    }
  }, "Could not parse the file. Make sure you're uploading the", /*#__PURE__*/React.createElement("b", null, " FBA Inventory Event Detail Report"), "."), /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    style: btnS()
  }, "Try Again")));
}

// ─────────────────────────────────────────────────────────────
//  EDIT STOCK COUNT MODAL
// ─────────────────────────────────────────────────────────────
function EditCountModal({
  count,
  products,
  stock,
  user,
  onClose,
  onDone
}) {
  const prod = products.find(p => p.ProductID === count.ProductID);
  const [physical, setPhysical] = React.useState(String(count.PhysicalQty ?? ""));
  const [reason, setReason] = React.useState(count.Reason || "Cycle Count");
  const [notes, setNotes] = React.useState(count.Notes || "");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const REASONS = ["Cycle Count", "Annual Stock Take", "Damaged Recount", "Location Transfer Check", "Audit", "FBA Inventory Report Upload", "Other"];

  // Live system qty for this product+location
  const systemQty = stock ? stock.filter(s => s.ProductID === count.ProductID && s.LocationID === count.LocationID).reduce((a, s) => a + Number(s.Quantity), 0) : Number(count.SystemQty) || 0;
  const physNum = parseFloat(physical);
  const newDiff = !isNaN(physNum) ? physNum - systemQty : null;
  const diffColor = newDiff === null ? "#a89680" : newDiff === 0 ? "#bd5d38" : newDiff > 0 ? "#a97b52" : "#b23a2e";
  async function submit() {
    if (!physical || isNaN(physNum) || physNum < 0) {
      setErr("Enter a valid physical count (0 or more).");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      // Create a NEW stock count replacing the old one
      // (Apps Script doesn't support UPDATE — we create corrected count)
      const res = await apiWrite("createStockCount", user.email, {
        locationID: count.LocationID,
        productID: count.ProductID,
        physicalQty: physNum,
        reason: reason,
        notes: `Corrected from ${count.PhysicalQty} to ${physNum}. ` + `Original: ${count.CountID}. ` + (notes ? notes : "")
      });
      onDone(`✅ Corrected count ${res.countID} created — approve to apply`);
      onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }
  const MODAL_STYLE = {
    position: "fixed",
    inset: 0,
    background: "rgba(60,40,20,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
    padding: 16
  };
  const BOX_STYLE = {
    background: "#fefcf9",
    borderRadius: 16,
    padding: 24,
    width: 460,
    maxWidth: "100%",
    border: "1px solid #e0d2bd",
    maxHeight: "90vh",
    overflowY: "auto"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: MODAL_STYLE
  }, /*#__PURE__*/React.createElement("div", {
    style: BOX_STYLE
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color: "#2c211a"
    }
  }, "✏️ Edit Stock Count"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "#a89680",
      fontSize: 22,
      cursor: "pointer"
    }
  }, "×")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ef",
      border: "1px solid #e7d9c4",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2c211a",
      fontSize: 13
    }
  }, prod ? prod.ProductName : count.ProductID), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12,
      marginTop: 2
    }
  }, count.CountID, " · ", LOC_LABEL[count.LocationID] || count.LocationID, " · ", count.Reason), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#bd5d38",
      fontSize: 12,
      marginTop: 4,
      fontWeight: 600
    }
  }, "⚠️ Original physical count was: ", /*#__PURE__*/React.createElement("b", null, count.PhysicalQty), " · Diff was: ", count.diff >= 0 ? "+" : "", count.diff)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ef",
      borderRadius: 12,
      padding: 14,
      border: "1px solid #e7d9c4"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#a89680",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6
    }
  }, "System Stock"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 28,
      color: "#2c211a",
      letterSpacing: -1
    }
  }, systemQty), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginTop: 2
    }
  }, "calculated")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#a89680",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6
    }
  }, "New Physical"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: physical,
    onChange: e => setPhysical(e.target.value),
    style: {
      ...inp,
      textAlign: "center",
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: -1,
      padding: "4px",
      height: 48,
      background: "#fff",
      border: "2px solid #bd5d38"
    },
    placeholder: "0",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#a89680",
      marginTop: 2
    }
  }, "correct count")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#a89680",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6
    }
  }, "New Diff"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 900,
      fontSize: 28,
      color: diffColor,
      letterSpacing: -1
    }
  }, newDiff === null ? "—" : newDiff >= 0 ? "+" + newDiff : newDiff), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: diffColor,
      marginTop: 2
    }
  }, newDiff === null ? "" : newDiff === 0 ? "✅ Match" : newDiff > 0 ? "⬆ Surplus" : "⬇ Shortage")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Reason"), /*#__PURE__*/React.createElement("select", {
    value: reason,
    onChange: e => setReason(e.target.value),
    style: inp
  }, REASONS.map(r => /*#__PURE__*/React.createElement("option", {
    key: r
  }, r)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Notes (why you're correcting)"), /*#__PURE__*/React.createElement("input", {
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "e.g. Original entry had wrong qty, recount done...",
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#a97b5210",
      border: "1px solid #a97b5230",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: "#a97b52"
    }
  }, "ℹ️ This creates a new corrected count (", count.CountID, " stays as-is). A Manager must approve the new count to apply the adjustment."), err && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#b23a2e12",
      border: "1px solid #b23a2e40",
      borderRadius: 8,
      padding: "10px 13px",
      color: "#b23a2e",
      fontSize: 13
    }
  }, "❌ ", err)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      ...ghost,
      flex: 1
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    disabled: busy || !physical,
    style: {
      ...btnS("#a97b52"),
      flex: 2,
      opacity: busy || !physical ? 0.6 : 1
    }
  }, busy ? "Saving…" : "Save Corrected Count"))));
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  Redesign helpers — Amazon smile icon, Home dashboard, Bottom nav
//  (added for warm-editorial redesign; all data/permission logic reused)
// ─────────────────────────────────────────────────────────────
function AmazonIcon(props) {
  var size = props.size || 20, color = props.color || "#2c211a";
  return /*#__PURE__*/React.createElement("svg", { width: size, height: size * 0.68, viewBox: "0 0 50 34" },
    /*#__PURE__*/React.createElement("text", { x: 25, y: 20, textAnchor: "middle", fontFamily: "Fraunces,serif", fontWeight: 700, fontSize: 21, fill: color }, "a"),
    /*#__PURE__*/React.createElement("path", { d: "M8 25 C 19 32, 31 32, 42 25", fill: "none", stroke: "#ff9900", strokeWidth: 3.4, strokeLinecap: "round" }),
    /*#__PURE__*/React.createElement("path", { d: "M39.5 26.2 l4 -2.2 -1 4.4 z", fill: "#ff9900" })
  );
}

function HomeView(props) {
  var user = props.user, products = props.products, stock = props.stock,
      alertThresholds = props.alertThresholds, drafts = props.drafts;
  var byProd = {};
  stock.forEach(function(s){
    if (STOCK_LOCATIONS.indexOf(s.LocationID) !== -1)
      byProd[s.ProductID] = (byProd[s.ProductID] || 0) + Number(s.Quantity || 0);
  });
  var meta = {}; products.forEach(function(p){ meta[p.ProductID] = p; });
  var ok = 0, low = 0, crit = 0, oos = 0, lowItems = [];
  Object.keys(byProd).forEach(function(pid){
    var p = meta[pid]; if (!p) return;
    var qty = byProd[pid], at = alertThresholds[pid] || ALERT_FALLBACK, st = statusOf(qty, at);
    if (st === "ok") ok++;
    else { if (st === "low") low++; else if (st === "critical") crit++; else oos++;
           lowItems.push({ p: p, qty: qty, at: at, st: st }); }
  });
  lowItems.sort(function(a,b){ return a.qty - b.qty; });
  var first = (user.name || "there").split(" ")[0];
  var hr = new Date().getHours();
  var greet = hr < 12 ? "Good morning" : (hr < 17 ? "Good afternoon" : "Good evening");
  var eyebrow = { fontFamily: "Fraunces,serif", fontSize: 18, fontWeight: 600, color: "#2c211a", margin: "18px 2px 8px" };
  var actBtn = { background: "#2a201a", color: "#f4ead8", border: "none", borderRadius: 14, height: 50, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" };
  var bic = { width: 22, height: 22, borderRadius: "50%", background: "#bd5d38", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 };
  function prodImg(pid, emoji) {
    return /*#__PURE__*/React.createElement("div", { style: { width: 40, height: 46, borderRadius: 8, overflow: "hidden", position: "relative", background: "linear-gradient(160deg,#e7dcc9,#cdbb9f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 } },
      emoji,
      /*#__PURE__*/React.createElement("img", { src: "images/" + pid + ".png", onError: function(e){ e.currentTarget.style.display = "none"; }, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } })
    );
  }
  var healthCells = [
    { t: "OK", v: ok, c: "#5f7a4f", bg: "#e2e8d3", ic: "💚" },
    { t: "Low", v: low, c: "#c2872f", bg: "#f4e7c8", ic: "⬇️" },
    { t: "Critical", v: crit, c: "#b23a2e", bg: "#f3dcd5", ic: "❗" },
    { t: "Out", v: oos, c: "#a89680", bg: "#e6ddd0", ic: "🚫" }
  ];
  return /*#__PURE__*/React.createElement("div", { style: { maxWidth: 460, margin: "0 auto", paddingTop: 6 } },
    /*#__PURE__*/React.createElement("div", { style: { margin: "10px 2px 4px" } },
      /*#__PURE__*/React.createElement("div", { style: { fontFamily: "Fraunces,serif", fontSize: 24, fontWeight: 600, color: "#2c211a" } }, greet + ", " + first),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12.5, color: "#6f6152", marginTop: 2 } }, "Here's what's happening with your inventory today.")
    ),
    /*#__PURE__*/React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, margin: "12px 0" } },
      /*#__PURE__*/React.createElement("div", { style: { ...card, padding: 14 } },
        /*#__PURE__*/React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: "#f5ecdc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9 } }, /*#__PURE__*/React.createElement(AmazonIcon, { size: 22, color: "#2c211a" })),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 28, fontWeight: 900, color: "#bd5d38", letterSpacing: -1, lineHeight: 1 } }, props.totFBA),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#6f6152", marginTop: 4 } }, "Amazon FBA")
      ),
      /*#__PURE__*/React.createElement("div", { style: { ...card, padding: 14 } },
        /*#__PURE__*/React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: "#f5ecdc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9, fontSize: 16 } }, "🏠"),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 28, fontWeight: 900, color: "#a97b52", letterSpacing: -1, lineHeight: 1 } }, props.totWH),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#6f6152", marginTop: 4 } }, "Warehouse")
      )
    ),
    user.canCreate && /*#__PURE__*/React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, margin: "4px 0" } },
      /*#__PURE__*/React.createElement("button", { onClick: props.onRecord, style: actBtn },
        /*#__PURE__*/React.createElement("span", { style: bic }, "+"), " Record Movement"),
      /*#__PURE__*/React.createElement("button", { onClick: props.onAssemble, style: actBtn },
        /*#__PURE__*/React.createElement("span", { style: { ...bic, fontSize: 12 } }, "🧩"), " Assemble Combo")
    ),
    /*#__PURE__*/React.createElement("div", { style: eyebrow }, "Stock Health"),
    /*#__PURE__*/React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 } },
      healthCells.map(function(h){
        return /*#__PURE__*/React.createElement("div", { key: h.t, style: { ...card, padding: "11px 6px", textAlign: "center" } },
          /*#__PURE__*/React.createElement("div", { style: { width: 26, height: 26, borderRadius: "50%", margin: "0 auto 6px", background: h.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 } }, h.ic),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: h.c } }, h.t),
          /*#__PURE__*/React.createElement("div", { style: { fontFamily: "Fraunces,serif", fontSize: 20, fontWeight: 600, color: "#2c211a", marginTop: 2 } }, h.v)
        );
      })
    ),
    lowItems.length > 0 && /*#__PURE__*/React.createElement("div", { style: { ...card, borderLeft: "4px solid #b23a2e", marginTop: 12, padding: "13px 15px" } },
      /*#__PURE__*/React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
        /*#__PURE__*/React.createElement("div", { style: { color: "#b23a2e", fontSize: 13.5, fontWeight: 700 } }, "❗ Low Stock Alert"),
        /*#__PURE__*/React.createElement("button", { onClick: function(){ props.setTab("product"); }, style: { background: "none", border: "none", color: "#bd5d38", fontSize: 11.5, fontWeight: 700, cursor: "pointer" } }, "View All ›")
      ),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#6f6152", marginTop: 2 } }, lowItems.length + " item" + (lowItems.length > 1 ? "s" : "") + " need attention"),
      lowItems.slice(0,4).map(function(it,i){
        var nm = (it.p.ProductName || "").replace("Syoat ", "");
        return /*#__PURE__*/React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid #e7d9c4", marginTop: 8 } },
          prodImg(it.p.ProductID, "🧴"),
          /*#__PURE__*/React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#2c211a" } }, nm),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: "#a89680" } }, it.p.SKU || it.p.ProductID)
          ),
          /*#__PURE__*/React.createElement("div", { style: { textAlign: "right" } },
            /*#__PURE__*/React.createElement("div", { style: { fontFamily: "Fraunces,serif", fontSize: 20, fontWeight: 600, color: (it.st === "critical" || it.st === "oos") ? "#b23a2e" : "#c2872f", lineHeight: 1 } }, it.qty),
            /*#__PURE__*/React.createElement("div", { style: { fontSize: 9, color: "#a89680", textTransform: "uppercase", letterSpacing: 0.5 } }, "vs " + it.at)
          )
        );
      })
    ),
    /*#__PURE__*/React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 11, marginTop: 12 } },
      /*#__PURE__*/React.createElement("div", { style: card },
        /*#__PURE__*/React.createElement("div", { style: { width: 32, height: 32, borderRadius: 9, background: "#f5ecdc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, marginBottom: 9 } }, "📋"),
        /*#__PURE__*/React.createElement("div", { style: { fontFamily: "Fraunces,serif", fontSize: 26, fontWeight: 600, color: "#2c211a", lineHeight: 1 } }, drafts.length),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#6f6152", marginTop: 3 } }, "Pending Approval"),
        /*#__PURE__*/React.createElement("button", { onClick: props.onOpenList, style: { marginTop: 10, fontSize: 11, color: "#bd5d38", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 } }, "View history ›")
      ),
      /*#__PURE__*/React.createElement("div", { style: { ...card, padding: "12px 13px" } },
        /*#__PURE__*/React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          /*#__PURE__*/React.createElement("b", { style: { fontSize: 13, color: "#2c211a" } }, "Recent Activity"),
          /*#__PURE__*/React.createElement("button", { onClick: props.onOpenList, style: { background: "none", border: "none", color: "#bd5d38", fontSize: 11, fontWeight: 700, cursor: "pointer" } }, "All ›")
        ),
        drafts.length > 0
          ? drafts.slice(0,3).map(function(d,i){
              return /*#__PURE__*/React.createElement("div", { key: i, style: { display: "flex", gap: 9, padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid #e7d9c4" } },
                /*#__PURE__*/React.createElement("div", { style: { width: 26, height: 26, borderRadius: 7, background: "#f5ecdc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 } }, "📝"),
                /*#__PURE__*/React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                  /*#__PURE__*/React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: "#2c211a" } }, d.MovementID),
                  /*#__PURE__*/React.createElement("div", { style: { fontSize: 10, color: "#6f6152" } }, d.MovementType)
                )
              );
            })
          : /*#__PURE__*/React.createElement("div", { style: { fontSize: 11.5, color: "#a89680", padding: "6px 0" } }, "No pending items. Tap All to view history.")
      )
    )
  );
}

function BottomNav(props) {
  var tab = props.tab, setTab = props.setTab, user = props.user, showList = props.showList;
  var items = [
    { k: "home", label: "Home", icon: "🏠" },
    { k: "product", label: "Inventory", icon: "📦" },
    { k: "amazon", label: "Amazon", amazon: true },
    { k: "movements", label: "Movements", icon: "🔄" },
    { k: "analytics", label: "Analytics", icon: "📊" }
  ];
  // Permission: Warehouse role has no Amazon import access — hide that tab.
  if (user.role === "Warehouse") items = items.filter(function(it){ return it.k !== "amazon"; });
  var active = showList ? "movements" : ((tab === "product" || tab === "location" || tab === "counts") ? "product" : tab);
  return /*#__PURE__*/React.createElement("div", { style: { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 120, background: "rgba(253,249,241,0.94)", backdropFilter: "blur(10px)", borderTop: "1px solid #e7d9c4", display: "flex", padding: "8px 4px 18px" } },
    items.map(function(it){
      var on = active === it.k;
      return /*#__PURE__*/React.createElement("button", { key: it.k, onClick: it.k === "movements" ? props.onMovements : function(){ setTab(it.k); },
        style: { flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "#bd5d38" : "#a89680", fontWeight: 700, fontSize: 9.5, fontFamily: "inherit" } },
        it.amazon
          ? /*#__PURE__*/React.createElement(AmazonIcon, { size: 20, color: on ? "#bd5d38" : "#2c211a" })
          : /*#__PURE__*/React.createElement("span", { style: { fontSize: 18, lineHeight: 1, filter: on ? "none" : "grayscale(1) opacity(0.55)" } }, it.icon),
        /*#__PURE__*/React.createElement("span", null, it.label)
      );
    })
  );
}

function App() {
  const [user, setUser] = React.useState(null);
  const [products, setProducts] = React.useState([]);
  const [stock, setStock] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("home");
  const [showMov, setShowMov] = React.useState(false);
  const [showList, setShowList] = React.useState(false);
  const [editingMov, setEditingMov] = React.useState(null); // draft movement being edited, or null
  const [toast, setToast] = React.useState("");
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [alertThresholds, setAlertThresholds] = React.useState({}); // from Products.ReorderLevel
  const [staffDB, setStaffDB] = React.useState(null); // null = not yet loaded
  const [staffLoadError, setStaffLoadError] = React.useState(null);
  const [stockCounts, setStockCounts] = React.useState([]);
  const [showCountModal, setShowCountModal] = React.useState(false);
  const [showAssemble, setShowAssemble] = React.useState(false);
  const [countsLoading, setCountsLoading] = React.useState(false);
  const [editingCount, setEditingCount] = React.useState(null);
  const [showLowStockAlert, setShowLowStockAlert] = React.useState(false);
  const [lowStockItems, setLowStockItems] = React.useState([]);
  const [analyticsMovs, setAnalyticsMovs] = React.useState(null); // approved movs for analytics dispatch panel
  const notify = msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  };
  const load = React.useCallback(async () => {
    setSyncing(true);
    try {
      const [p, s, movs] = await Promise.all([api("getProducts"), api("getStock"), api("getMovements", {
        includeLines: "true",
        limit: "50"
      })]);
      setProducts(p);
      setStock(s);
      setDrafts(movs.filter(m => m.Status === "Draft"));
      // Build alert thresholds from ReorderLevel column in Products sheet
      const alertMap = {};
      p.forEach(prod => {
        const lvl = parseInt(prod.ReorderLevel);
        if (prod.ProductID && !isNaN(lvl) && lvl > 0) {
          alertMap[prod.ProductID] = lvl;
        }
      });
      setAlertThresholds(alertMap);
      setLastSync(new Date());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setSyncing(false);
  }, []);

  // Load staff/PINs from sheet on app mount (before login)
  React.useEffect(() => {
    // Safety net: if the API hasn't responded within 7s, show login with offline fallback.
    // fetchWithRetry has no per-request timeout, so a slow/cold GAS endpoint can hang
    // for 30–90s per attempt × 3 retries, keeping staffDB===null (loading spinner) indefinitely.
    let done = false;
    const loginTimer = setTimeout(() => {
      if (!done) {
        done = true;
        const _ct = (() => { try { return JSON.parse(localStorage.getItem("syoat_staff_cache") || "null"); } catch { return null; } })();
        setStaffDB(_ct || STAFF_DB_FALLBACK);
        setStaffLoadError(_ct
          ? "Google Sheet is slow — using cached logins. Refresh to retry."
          : "Google Sheet is slow — using offline mode. Refresh to retry."
        );
      }
    }, 12000);
    api("getAppLogins").then(data => {
      clearTimeout(loginTimer);
      if (Array.isArray(data) && data.length > 0) {
        // Merge sheet roles with permission map
        const rolePerms = {
          Founder: {
            canCreate: true,
            canApprove: true,
            canReverse: true,
            canViewAll: true
          },
          "Co-Founder": {
            canCreate: true,
            canApprove: true,
            canReverse: true,
            canViewAll: true
          },
          Owner: {
            canCreate: true,
            canApprove: true,
            canReverse: true,
            canViewAll: true
          },
          Admin: {
            canCreate: true,
            canApprove: true,
            canReverse: true,
            canViewAll: true
          },
          Manager: {
            canCreate: true,
            canApprove: true,
            canReverse: false,
            canViewAll: true
          },
          Warehouse: {
            canCreate: true,
            canApprove: false,
            canReverse: false,
            canViewAll: false
          },
          Auditor: {
            canCreate: false,
            canApprove: false,
            canReverse: false,
            canViewAll: true
          }
        };
        const enriched = data.map(s => {
          // Role is the source of truth for permissions.
          // Sheet CanCreate/CanApprove columns are IGNORED — role determines access.
          // This prevents sheet typos from locking out team members.
          const perms = rolePerms[s.role] || rolePerms["Warehouse"];
          return { ...s, ...perms };
        });
        // Cache enriched list in localStorage — used by timeout/error fallback so PINs stay current.
        try { localStorage.setItem("syoat_staff_cache", JSON.stringify(enriched)); } catch {}
        setStaffDB(enriched);
        setStaffLoadError(null);
        done = true;
        return;
      }
      if (done) return; // timeout already applied a fallback — keep it rather than replace with another fallback
      done = true;
      if (data && data.error) {
        const _c1 = (() => { try { return JSON.parse(localStorage.getItem("syoat_staff_cache") || "null"); } catch { return null; } })();
        setStaffDB(_c1 || STAFF_DB_FALLBACK);
        setStaffLoadError("Sheet error: " + data.error);
      } else {
        const _c2 = (() => { try { return JSON.parse(localStorage.getItem("syoat_staff_cache") || "null"); } catch { return null; } })();
        setStaffDB(_c2 || STAFF_DB_FALLBACK);
        setStaffLoadError("App_Logins sheet has no Active rows. Add staff rows with Status = Active.");
      }
    }).catch(err => {
      if (done) return;
      done = true;
      clearTimeout(loginTimer);
      const _c3 = (() => { try { return JSON.parse(localStorage.getItem("syoat_staff_cache") || "null"); } catch { return null; } })();
      setStaffDB(_c3 || STAFF_DB_FALLBACK);
      setStaffLoadError("API error: " + (err && err.message ? err.message : String(err)));
    });
  }, []);
  React.useEffect(() => {
    if (!user) return;
    load();
    loadCounts();
  }, [user]);
  // Fetch approved movements for analytics dispatch panel (lazy — only when tab is opened)
  React.useEffect(() => {
    if (!user || tab !== "analytics" || analyticsMovs !== null) return;
    api("getMovements", { includeLines: "true", limit: "500" }).then(data => {
      setAnalyticsMovs(Array.isArray(data) ? data.filter(m => m.Status === "Approved") : []);
    }).catch(() => setAnalyticsMovs([]));
  }, [user, tab, analyticsMovs]);
  async function loadCounts() {
    setCountsLoading(true);
    try {
      const data = await api("getStockCounts", {
        limit: "50"
      });
      setStockCounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Counts:", e.message);
    }
    setCountsLoading(false);
  }
  async function approveOne(movID) {
    try {
      await apiWrite("approveMovement", user.email, {
        movementID: movID
      });
      notify("✅ Approved " + movID);
      await load();
    } catch (e) {
      notify("❌ " + e.message);
    }
  }
  async function approveAll() {
    try {
      for (const m of drafts) {
        await apiWrite("approveMovement", user.email, {
          movementID: m.MovementID
        });
      }
      notify("✅ All " + drafts.length + " movements approved");
      await load();
    } catch (e) {
      notify("❌ " + e.message);
    }
  }
  async function rejectDraft(movID, reason) {
    try {
      await apiWrite("rejectMovement", user.email, {
        movementID: movID,
        reason: reason || ""
      });
      notify("🚫 Rejected " + movID);
      await load();
    } catch (e) {
      notify("❌ " + e.message);
    }
  }
  function stockFor(pid) {
    const rows = stock.filter(s => s.ProductID === pid && STOCK_LOCATIONS.includes(s.LocationID));
    const by = {};
    rows.forEach(r => {
      by[r.LocationID] = (by[r.LocationID] || 0) + Number(r.Quantity);
    });
    return {
      fba: by["AMAZON_FBA"] || 0,
      wh: by["MAIN_WH"] || 0,
      transit: by["FBA_TRANSIT"] || 0,
      returns: by["RETURNS"] || 0
    };
  }
  // Exports current system FBA + FBA-transit stock per product as a CSV,
  // so it can be compared line-by-line against Amazon's own inventory report.
  function exportFBAReconciliation() {
    const rows = products.map(p => {
      const sk = stockFor(p.ProductID);
      return {
        ProductID: p.ProductID,
        SKU: p.SKU || "",
        ProductName: p.ProductName || "",
        ASIN: p.AmazonASIN || "",
        FBA_Transit_Qty: sk.transit,
        FBA_Qty: sk.fba,
        Total_FBA_Side: sk.transit + sk.fba
      };
    });
    const headers = ["ProductID","SKU","ProductName","ASIN","FBA_Transit_Qty","FBA_Qty","Total_FBA_Side"];
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.join(",")].concat(
      rows.map(r => headers.map(h => esc(r[h])).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Syoat_FBA_Reconciliation_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  const totFBA = stock.filter(s => s.LocationID === "AMAZON_FBA").reduce((a, s) => a + Number(s.Quantity), 0);
  const totWH = stock.filter(s => s.LocationID === "MAIN_WH").reduce((a, s) => a + Number(s.Quantity), 0);
  const shm = stockFor("PRD-P001");
  const tabSt = t => ({
    padding: "8px 18px",
    borderRadius: 9,
    border: "1px solid",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    borderColor: tab === t ? "#bd5d38" : "#e0d2bd",
    background: tab === t ? "#bd5d38" : "transparent",
    color: tab === t ? "#fdf9f1" : "#a89680",
    transition: "all 0.15s"
  });

  // Show loading spinner while staff list is being fetched from sheet
  if (staffDB === null) return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#efe4d2",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: SYOAT_LOGO,
    alt: "Syoat",
    style: {
      width: 120,
      filter: "brightness(0) saturate(100%) invert(27%) sepia(30%) saturate(600%) hue-rotate(90deg) brightness(85%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#bd5d38",
      fontWeight: 700,
      fontSize: 14,
      marginTop: 8
    }
  }, "Loading staff list..."), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12
    }
  }, "Connecting to Google Sheet"));
  if (!user) return /*#__PURE__*/React.createElement(LoginScreen, {
    staffDB: staffDB,
      staffLoadError: staffLoadError,
      staffSource: staffLoadError ? "offline" : "sheet",
    onLogin: async u => {
      setUser(u);
      // Check stock immediately after login — alert if anything is critical
      try {
        const [prods, stk] = await Promise.all([api("getProducts"), api("getStock")]);
        const alertMap = {};
        prods.forEach(p => {
          const lvl = parseInt(p.ReorderLevel);
          if (p.ProductID && !isNaN(lvl) && lvl > 0) alertMap[p.ProductID] = lvl;
        });
        const totals = {};
        stk.forEach(row => {
          // Only count sellable physical locations — same formula as product cards (fba + wh + transit)
          // Excludes Returns Hold since those units need QC before they can be sold
          const SELLABLE = ["MAIN_WH","AMAZON_FBA","FBA_TRANSIT"];
          if (SELLABLE.includes(row.LocationID)) {
            totals[row.ProductID] = (totals[row.ProductID] || 0) + (parseFloat(row.Quantity) || 0);
          }
        });
        const alerts = prods
          .filter(p => alertMap[p.ProductID] !== undefined)
          .map(p => {
            const qty = totals[p.ProductID] || 0;
            const threshold = alertMap[p.ProductID];
            const pct = threshold > 0 ? Math.round((qty / threshold) * 100) : 0;
            let status = "ok";
            if (qty === 0) status = "oos";
            else if (pct <= 30) status = "critical";
            else if (pct <= 60) status = "low";
            return { ...p, totalQty: qty, threshold, pct, status };
          })
          .filter(p => p.status !== "ok");
        if (alerts.length > 0) {
          setLowStockItems(alerts);
          setShowLowStockAlert(true);
        }
      } catch (e) { /* silent — don't block login on alert fetch failure */ }
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "#efe4d2",
      color: "#2c211a",
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      paddingBottom: 50
    }
  }, toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: 12,
      right: 12,
      zIndex: 999,
      background: "#fdf9f1",
      border: `1px solid ${toast.startsWith("❌") ? "#ef4444" : "#e0d2bd"}`,
      borderRadius: 10,
      padding: "11px 18px",
      color: toast.startsWith("❌") ? "#fca5a5" : "#2c211a",
      fontSize: 13,
      boxShadow: "0 8px 32px rgba(60,40,20,0.15)",
      maxWidth: 340
    }
  }, toast),
  showLowStockAlert && React.createElement("div", {
    style: { position:"fixed", inset:0, background:"rgba(60,40,20,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:16 }
  }, React.createElement("div", {
    style: { background:"#fefcf9", borderRadius:18, padding:"28px 28px 24px", width:460, maxWidth:"100%", border:"1px solid #e0d2bd", boxShadow:"0 20px 60px rgba(60,40,20,0.2)" }
  },
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10, marginBottom:18 } },
      React.createElement("span", { style:{ fontSize:28 } }, "⚠️"),
      React.createElement("div", null,
        React.createElement("div", { style:{ fontWeight:800, fontSize:17, color:"#bd5d38" } }, "Low Stock Alert"),
        React.createElement("div", { style:{ fontSize:12, color:"#6f6152" } }, lowStockItems.length + " product" + (lowStockItems.length > 1 ? "s" : "") + " need attention")
      )
    ),
    lowStockItems.map(p => React.createElement("div", {
      key: p.ProductID,
      style: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background: p.status === "oos" ? "#fef2f2" : "#fff8f0", borderRadius:10, marginBottom:8, border: "1px solid " + (p.status === "oos" ? "#fca5a5" : "#f4c98a") }
    },
      React.createElement("div", null,
        React.createElement("div", { style:{ fontWeight:700, fontSize:13, color:"#2c211a" } }, p.ProductName || p.ProductID),
        React.createElement("div", { style:{ fontSize:11, color:"#6f6152", marginTop:2 } }, "Reorder level: " + p.threshold + " units")
      ),
      React.createElement("div", { style:{ textAlign:"right" } },
        React.createElement("div", { style:{ fontWeight:800, fontSize:18, color: p.status === "oos" ? "#ef4444" : "#bd5d38" } }, p.totalQty),
        React.createElement("div", { style:{ fontSize:10, fontWeight:700, color: p.status === "oos" ? "#ef4444" : "#bd5d38", textTransform:"uppercase", letterSpacing:"0.05em" } },
          p.status === "oos" ? "OUT OF STOCK" : p.status === "critical" ? "CRITICAL" : "LOW"
        )
      )
    )),
    React.createElement("div", { style:{ fontSize:11, color:"#a89680", marginTop:6, marginBottom:18 } },
      "Total stock across all physical locations (excludes virtual like FBA in-transit)."
    ),
    React.createElement("div", { style:{ display:"flex", gap:10, justifyContent:"flex-end" } },
      React.createElement("button", {
        onClick: () => setShowLowStockAlert(false),
        style: { background:"#bd5d38", color:"#fff", border:"none", borderRadius:9, padding:"10px 24px", fontWeight:700, cursor:"pointer", fontSize:14 }
      }, "Noted — Go to Dashboard")
    )
  )),
  /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#faf6f0",
      borderBottom: "1px solid #e0d2bd",
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 10,
      padding: "4px 10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 1px 6px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: SYOAT_LOGO,
    alt: "Syoat",
    style: {
      height: 32,
      width: "auto",
      display: "block",
      filter: "brightness(0) saturate(100%) invert(27%) sepia(30%) saturate(600%) hue-rotate(90deg) brightness(85%)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14
    }
  }, "Inventory ERP"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 11
    }
  }, "Aashya Cosmetics · Hyderabad")), /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#5f7a4f20",
      color: "#4ade80",
      border: "1px solid #5f7a4f40",
      borderRadius: 6,
      padding: "2px 7px",
      fontSize: 11,
      fontWeight: 700
    }
  }, "● LIVE")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: ROLE_COLOR[user.role] + "15",
      border: `1px solid ${ROLE_COLOR[user.role]}30`,
      borderRadius: 8,
      padding: "5px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, {
    Founder: "🌟",
    "Co-Founder": "💎",
    Owner: "👑",
    Admin: "🛡️",
    Manager: "📋",
    Warehouse: "📦",
    Auditor: "🔍"
  }[user.role]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#2c211a",
      fontWeight: 700,
      fontSize: 12
    }
  }, user.name.split(" ")[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      color: ROLE_COLOR[user.role],
      fontSize: 10,
      fontWeight: 600
    }
  }, user.role))), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: ghost
  }, syncing ? "⟳ Syncing…" : "⟳ Sync" + (lastSync ? " · " + tsAgo(lastSync) : "")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowList(true),
    style: ghost
  }, "📋 Movements"), user.canViewAll && /*#__PURE__*/React.createElement("button", {
    onClick: exportFBAReconciliation,
    style: ghost,
    title: "Download system FBA + FBA-Transit stock per product as CSV, to compare against Amazon's report"
  }, "⬇ FBA Report"), user.canCreate && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMov(true),
    style: btnS()
  }, "+ Record Movement"), user.canCreate && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAssemble(true),
    style: {
      ...btnS(),
      background: "#6d5ae6"
    }
  }, "🧩 Assemble Combo"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setUser(null),
    style: {
      ...ghost,
      color: "#ef4444",
      borderColor: "#ef444430"
    }
  }, "Logout"))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 940,
      margin: "0 auto",
      padding: "0 14px"
    }
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "16px 0",
      background: "#ef444415",
      border: "1px solid #ef444440",
      borderRadius: 10,
      padding: "12px 16px",
      color: "#fca5a5",
      fontSize: 13
    }
  }, "❌ ", error), !loading && /*#__PURE__*/React.createElement(PendingBanner, {
    drafts: drafts,
    user: user,
    products: products,
    onApprove: approveOne,
    onApproveAll: approveAll,
    onEdit: m => setEditingMov(m),
    onReject: rejectDraft
  }), tab === "home" && /*#__PURE__*/React.createElement(HomeView, {
    user: user, products: products, stock: stock, alertThresholds: alertThresholds,
    totFBA: totFBA, totWH: totWH, drafts: drafts,
    onRecord: function(){ setShowMov(true); }, onAssemble: function(){ setShowAssemble(true); },
    onOpenList: function(){ setShowList(true); }, setTab: setTab
  }), (tab === "product" || tab === "location" || tab === "counts") && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      margin: "16px 0",
      maxWidth: 400
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3818",
      borderRadius: 10,
      width: 44,
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      flexShrink: 0
    }
  }, "🏭"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: "#bd5d38",
      letterSpacing: -1,
      lineHeight: 1
    }
  }, loading ? "…" : totFBA), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12,
      marginTop: 3
    }
  }, "Amazon FBA"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#a97b5218",
      borderRadius: 10,
      width: 44,
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      flexShrink: 0
    }
  }, "🏠"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: "#a97b52",
      letterSpacing: -1,
      lineHeight: 1
    }
  }, loading ? "…" : totWH), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12,
      marginTop: 3
    }
  }, "Warehouse")))), (tab === "product" || tab === "location" || tab === "counts") && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: tabSt("product"),
    onClick: () => setTab("product")
  }, "📦 By Product"), /*#__PURE__*/React.createElement("button", {
    style: tabSt("location"),
    onClick: () => setTab("location")
  }, "📍 By Location"), /*#__PURE__*/React.createElement("button", {
    style: tabSt("counts"),
    onClick: () => setTab("counts")
  }, "🔢 Stock Count")), tab === "product" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 10
    }
  }, loading ? [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      ...card,
      height: 88,
      opacity: 0.3
    }
  })) : products.map(p => {
    const sk = stockFor(p.ProductID);
    const tot = sk.fba + sk.wh + sk.transit;
    const at = alertThresholds[p.ProductID] || parseInt(p.ReorderLevel) || ALERT_FALLBACK;
    const st = statusOf(tot, at);
    return /*#__PURE__*/React.createElement("div", {
      key: p.ProductID,
      style: {
        ...card,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        border: `1px solid ${st !== "ok" ? SC[st] + "50" : "#e0d2bd"}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { width: 50, height: 58, borderRadius: 9, overflow: "hidden", position: "relative", flexShrink: 0, background: "linear-gradient(160deg,#e7dcc9,#cdbb9f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }
    }, p.ItemType === "Freebie" ? "🎁" : "🧴", /*#__PURE__*/React.createElement("img", { src: "images/" + p.ProductID + ".png", onError: function(e){ e.currentTarget.style.display = "none"; }, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } })), /*#__PURE__*/React.createElement("div", {
      style: { flex: 1, minWidth: 0 }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 180
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      status: st
    }), p.ProductID === "PRD-P001" && /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#bd5d3818",
        color: "#bd5d38",
        border: "1px solid #bd5d3840",
        borderRadius: 6,
        padding: "1px 6px",
        fontSize: 10,
        fontWeight: 700
      }
    }, "HERO ASIN"), p.ItemType === "Freebie" && /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#8b5cf620",
        color: "#a78bfa",
        border: "1px solid #8b5cf640",
        borderRadius: 6,
        padding: "1px 6px",
        fontSize: 10,
        fontWeight: 700
      }
    }, "FREEBIE")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#2c211a",
        marginBottom: 2
      }
    }, p.ProductName), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#a89680",
        fontSize: 11
      }
    }, p.SKU, p.AmazonASIN ? " · " + p.AmazonASIN : "", p.FNSKU ? " · " + p.FNSKU : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 14,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, [{
      label: "FBA",
      val: sk.fba,
      c: "#bd5d38"
    }, {
      label: "Warehouse",
      val: sk.wh,
      c: "#a97b52"
    }, {
      label: "Transit",
      val: sk.transit,
      c: "#bd5d38"
    }, {
      label: "Returns",
      val: sk.returns,
      c: "#b23a2e"
    }].map(loc => /*#__PURE__*/React.createElement("div", {
      key: loc.label,
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "Fraunces,serif",
        fontSize: loc.label === "FBA" || loc.label === "Warehouse" ? 24 : 18,
        fontWeight: 600,
        color: loc.val > 0 ? loc.c : "#c8b9a3",
        letterSpacing: -0.5
      }
    }, loc.val), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#a89680",
        fontSize: 10
      }
    }, loc.label))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        paddingTop: 8,
        borderTop: "1px solid #e7d9c4"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#efe4d2",
        borderRadius: 5,
        overflow: "hidden",
        height: 4,
        maxWidth: 280
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        background: SC[st],
        width: Math.min(100, tot / (at * 3) * 100) + "%",
        transition: "width 0.5s"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#a89680",
        fontSize: 11,
        marginTop: 3
      }
    }, "Alert at ", at, " · MRP ₹", p.MRP || "—", " · Cost ₹", p.UnitCost || "—"))));
  })), tab === "location" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: 12
    }
  }, Object.entries(LOC_LABEL).filter(([lid]) => STOCK_LOCATIONS.includes(lid)).map(([lid, lname]) => {
    const rows = stock.filter(s => s.LocationID === lid);
    const total = rows.reduce((a, s) => a + Number(s.Quantity), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: lid,
      style: card
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#2c211a",
        marginBottom: 10
      }
    }, lname), rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#c8b9a3",
        fontSize: 13
      }
    }, "No stock") : rows.map(r => {
      const p = products.find(x => x.ProductID === r.ProductID);
      return /*#__PURE__*/React.createElement("div", {
        key: r.ProductID,
        style: {
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #e7d9c4",
          padding: "7px 0",
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#6f6152"
        }
      }, (p?.ProductName || r.ProductID).split(" ").slice(0, 4).join(" ")), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 800,
          color: "#2c211a"
        }
      }, r.Quantity));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        paddingTop: 7,
        borderTop: "1px solid #e7d9c4",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        color: "#a89680"
      }
    }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 800,
        color: "#bd5d38"
      }
    }, total)));
  })), tab === "counts" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      flexWrap: "wrap",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13
    }
  }, countsLoading ? "Loading…" : `${stockCounts.length} counts recorded`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: loadCounts,
    style: {
      ...ghost,
      padding: "6px 14px",
      fontSize: 12
    }
  }, "⟳ Refresh"), (user.role === "Founder" || user.role === "Co-Founder" || user.role === "Owner" || user.role === "Admin" || user.role === "Manager" || user.role === "Auditor") && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowCountModal(true),
    style: {
      ...btnS(),
      padding: "7px 16px",
      fontSize: 12
    }
  }, "+ New Count"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#a97b5210",
      border: "1px solid #a97b5230",
      borderRadius: 10,
      padding: "10px 16px",
      marginBottom: 14,
      fontSize: 13,
      color: "#a97b52"
    }
  }, "📋 ", /*#__PURE__*/React.createElement("b", null, "How cycle counting works:"), " Enter your physical count for any product at any location. The system compares it to the calculated stock and shows the difference. When approved by a Manager, a stock adjustment movement is created automatically."), countsLoading ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      textAlign: "center",
      padding: 32,
      color: "#a89680"
    }
  }, "Loading counts…") : stockCounts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      textAlign: "center",
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 8
    }
  }, "🔢"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      marginBottom: 6
    }
  }, "No stock counts recorded"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13,
      marginBottom: 16
    }
  }, "Run a cycle count to verify physical stock matches system records"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowCountModal(true),
    style: btnS()
  }, "+ Start Count")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 10
    }
  }, stockCounts.map((c, i) => {
    const diff = Number(c.Difference) || 0;
    const diffColor = diff === 0 ? "#bd5d38" : diff > 0 ? "#a97b52" : "#b23a2e";
    const isPending = c.Status === "Pending";
    return /*#__PURE__*/React.createElement("div", {
      key: c.CountID || i,
      style: {
        ...card,
        border: `1px solid ${diffColor}30`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 180
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 800,
        color: "#2c211a",
        fontSize: 14
      }
    }, c.CountID), /*#__PURE__*/React.createElement("span", {
      style: {
        background: isPending ? "#bd5d3815" : "#bd5d3815",
        color: isPending ? "#bd5d38" : "#bd5d38",
        border: `1px solid ${isPending ? "#bd5d3840" : "#bd5d3840"}`,
        borderRadius: 5,
        padding: "1px 7px",
        fontSize: 11,
        fontWeight: 700
      }
    }, c.Status)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2c211a",
        fontSize: 13,
        marginBottom: 3
      }
    }, c.ProductID, " @ ", LOC_LABEL[c.LocationID] || c.LocationID), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#a89680",
        fontSize: 12
      }
    }, "Counted by ", (c.CountedByEmail || "").split("@")[0], c.CountDateTime && /*#__PURE__*/React.createElement("span", null, " · ", String(c.CountDateTime).substring(0, 16)), c.Reason && /*#__PURE__*/React.createElement("span", null, " · ", c.Reason)), c.AdjustmentMovementID && /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#bd5d38",
        fontSize: 11,
        marginTop: 3,
        fontWeight: 600
      }
    }, "✅ Adjustment: ", c.AdjustmentMovementID)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#a89680",
        marginBottom: 2
      }
    }, "SYSTEM"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 900,
        fontSize: 20,
        color: "#2c211a"
      }
    }, c.SystemQty ?? "—")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#a89680",
        marginBottom: 2
      }
    }, "PHYSICAL"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 900,
        fontSize: 20,
        color: "#2c211a"
      }
    }, c.PhysicalQty ?? "—")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#a89680",
        marginBottom: 2
      }
    }, "DIFF"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 900,
        fontSize: 20,
        color: diffColor
      }
    }, diff > 0 ? "+" + diff : diff)), isPending && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, user.canApprove && /*#__PURE__*/React.createElement("button", {
      onClick: async () => {
        try {
          await apiWrite("approveStockCount", user.email, {
            countID: c.CountID
          });
          notify("✅ Count " + c.CountID + " approved" + (diff !== 0 ? " · adjustment created" : " · no change"));
          loadCounts();
          load();
        } catch (e) {
          notify("❌ " + e.message);
        }
      },
      style: {
        ...btnS("#5f7a4f"),
        padding: "7px 16px",
        fontSize: 12,
        whiteSpace: "nowrap"
      }
    }, "✅ Approve"), (user.canApprove || user.role === "Auditor") && /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditingCount({
        ...c,
        diff
      }),
      style: {
        ...ghost,
        padding: "6px 16px",
        fontSize: 12,
        whiteSpace: "nowrap",
        color: "#a97b52",
        borderColor: "#a97b5240",
        background: "#a97b5210"
      }
    }, "✏️ Edit"), user.canApprove && /*#__PURE__*/React.createElement("button", {
      onClick: async () => {
        if (!window.confirm("Reject CNT " + c.CountID + "? This cannot be undone.")) return;
        try {
          await apiWrite("rejectStockCount", user.email, {
            countID: c.CountID
          });
          notify("🚫 Count " + c.CountID + " rejected");
          loadCounts();
        } catch (e) {
          // Fallback: mark as rejected via createMovement note
          notify("❌ " + e.message);
        }
      },
      style: {
        ...ghost,
        padding: "6px 16px",
        fontSize: 12,
        whiteSpace: "nowrap",
        color: "#b23a2e",
        borderColor: "#b23a2e40",
        background: "#b23a2e08"
      }
    }, "🚫 Reject")))));
  }))), tab === "amazon" && (user.role === "Warehouse" ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fdf9f1",
      border: "1px solid #e7d9c4",
      borderRadius: 12,
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 8
    }
  }, "🔒"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2c211a",
      marginBottom: 6
    }
  }, "Access Restricted"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13
    }
  }, "Amazon report imports are handled by Managers and above.")) : /*#__PURE__*/React.createElement(AmazonImportTab, {
    products: products,
    stock: stock,
    user: user,
    notify: notify,
    onCountCreated: () => {
      loadCounts();
      load();
      setTab("counts");
    }
  })), tab === "analytics" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color: "#2c211a",
      marginBottom: 4
    }
  }, "📊 Stock by Product"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12,
      marginBottom: 18
    }
  }, "Units across Warehouse + FBA + Transit"), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3"
    }
  }, "Loading…") : products.map(p => {
    const sk = stockFor(p.ProductID);
    const tot = sk.fba + sk.wh + sk.transit;
    const at = alertThresholds[p.ProductID] || parseInt(p.ReorderLevel) || ALERT_FALLBACK;
    const pct = Math.min(100, tot / (at * 3) * 100);
    const st = statusOf(tot, at);
    const shortName = p.ProductName.replace("Syoat ", "").replace("Kids ", "").split(" ").slice(0, 3).join(" ");
    return /*#__PURE__*/React.createElement("div", {
      key: p.ProductID,
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "#2c211a"
      }
    }, shortName), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 900,
        color: SC[st]
      }
    }, tot, " units")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0ebe2",
        borderRadius: 8,
        overflow: "hidden",
        height: 28,
        display: "flex"
      }
    }, sk.wh > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        width: sk.wh / Math.max(tot, 1) * 100 + "%",
        background: "#bd5d38",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#fff",
        fontWeight: 700,
        transition: "width 0.5s",
        minWidth: sk.wh > 0 ? 30 : 0
      }
    }, sk.wh > 0 ? sk.wh : ""), sk.fba > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        width: sk.fba / Math.max(tot, 1) * 100 + "%",
        background: "#a97b52",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#fff",
        fontWeight: 700,
        transition: "width 0.5s",
        minWidth: sk.fba > 0 ? 30 : 0
      }
    }, sk.fba > 0 ? sk.fba : ""), sk.transit > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        width: sk.transit / Math.max(tot, 1) * 100 + "%",
        background: "#bd5d38",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#fff",
        fontWeight: 700,
        transition: "width 0.5s",
        minWidth: sk.transit > 0 ? 30 : 0
      }
    }, sk.transit > 0 ? sk.transit : ""), sk.returns > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        width: sk.returns / Math.max(tot, 1) * 100 + "%",
        background: "#b23a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#fff",
        fontWeight: 700,
        transition: "width 0.5s",
        minWidth: sk.returns > 0 ? 20 : 0
      }
    }, sk.returns > 0 ? sk.returns : ""), tot === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        paddingLeft: 10,
        fontSize: 11,
        color: "#c8b9a3"
      }
    }, "No stock")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 4,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#bd5d38",
        fontWeight: 600
      }
    }, "■ WH (", sk.wh, ")"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#a89680"
      }
    }, "·"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#a97b52",
        fontWeight: 600
      }
    }, "■ FBA (", sk.fba, ")"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#a89680"
      }
    }, "·"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#bd5d38",
        fontWeight: 600
      }
    }, "■ Transit (", sk.transit, ")"), sk.returns > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#a89680"
      }
    }, "·"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#b23a2e",
        fontWeight: 600
      }
    }, "■ Returns (", sk.returns, ")"))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: "#2c211a",
      marginBottom: 12
    }
  }, "🏭 FBA vs Warehouse Split"), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3"
    }
  }, "Loading…") : (() => {
    const total = totFBA + totWH;
    const fbaPct = total > 0 ? Math.round(totFBA / total * 100) : 0;
    const whPct = total > 0 ? Math.round(totWH / total * 100) : 0;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        borderRadius: 10,
        overflow: "hidden",
        height: 36,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: fbaPct + "%",
        background: "#bd5d38",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        transition: "width 0.6s"
      }
    }, fbaPct > 10 ? fbaPct + "%" : ""), /*#__PURE__*/React.createElement("div", {
      style: {
        width: whPct + "%",
        background: "#a97b52",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        transition: "width 0.6s"
      }
    }, whPct > 10 ? whPct + "%" : ""), total === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: "#f0ebe2",
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        color: "#c8b9a3",
        fontSize: 12
      }
    }, "No stock")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#bd5d38",
        fontWeight: 700
      }
    }, "🏭 Amazon FBA"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 900,
        color: "#2c211a",
        fontSize: 14
      }
    }, totFBA)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#a97b52",
        fontWeight: 700
      }
    }, "🏠 Warehouse"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 900,
        color: "#2c211a",
        fontSize: 14
      }
    }, totWH)), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid #e7d9c4",
        paddingTop: 6,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#a89680",
        fontWeight: 600
      }
    }, "Total"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 900,
        color: "#bd5d38",
        fontSize: 16
      }
    }, total))));
  })()), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: "#2c211a",
      marginBottom: 12
    }
  }, "🚦 Stock Health"), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3"
    }
  }, "Loading…") : (() => {
    const statuses = products.map(p => {
      const sk = stockFor(p.ProductID);
      const tot = sk.fba + sk.wh + sk.transit;
      return statusOf(tot, alertThresholds[p.ProductID] || parseInt(p.ReorderLevel) || ALERT_FALLBACK);
    });
    const counts = {
      ok: 0,
      low: 0,
      critical: 0,
      oos: 0
    };
    statuses.forEach(s => counts[s]++);
    const items = [{
      label: "OK",
      count: counts.ok,
      color: "#5f7a4f",
      icon: "✅"
    }, {
      label: "Low",
      count: counts.low,
      color: "#bd5d38",
      icon: "⚠️"
    }, {
      label: "Critical",
      count: counts.critical,
      color: "#b23a2e",
      icon: "🔴"
    }, {
      label: "Out of Stock",
      count: counts.oos,
      color: "#8a6d3b",
      icon: "🚫"
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, items.map(it => /*#__PURE__*/React.createElement("div", {
      key: it.label,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: it.color + "18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        flexShrink: 0
      }
    }, it.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#6f6152",
        fontWeight: 600
      }
    }, it.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 900,
        color: it.color,
        fontSize: 14
      }
    }, it.count)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0ebe2",
        borderRadius: 4,
        height: 5,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        background: it.color,
        width: it.count / products.length * 100 + "%",
        transition: "width 0.5s"
      }
    }))))));
  })())), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: "#2c211a",
      marginBottom: 4
    }
  }, "📦 Dispatches by Channel"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 12,
      marginBottom: 14
    }
  }, "Units shipped out from all approved movements"), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3"
    }
  }, "Loading…") : (() => {
    // Compute dispatches per channel from approved movement lines (accurate).
    // IMPORTANT: getStock treats sales destinations (WEBSITE_SALES, FLIPKART_SALES, etc.)
    // as VIRTUAL — no stock accumulates there. We must use movement data instead.
    // AMAZON_FBA is a holding location (not a sales channel) so it is excluded here.
    const channels = [{
      key: "WEBSITE_SALES",
      label: "Website Orders",
      color: "#bd5d38",
      icon: "🌐"
    }, {
      key: "FLIPKART_SALES",
      label: "Flipkart",
      color: "#bd5d38",
      icon: "🛒"
    }, {
      key: "SAMPLES",
      label: "Samples",
      color: "#a89680",
      icon: "🎁"
    }, {
      key: "DAMAGE",
      label: "Damage / Loss",
      color: "#b23a2e",
      icon: "⚠️"
    }];
    // Sum line quantities from approved movements whose destination matches each channel
    const dispatchTotals = {};
    channels.forEach(ch => { dispatchTotals[ch.key] = 0; });
    if (analyticsMovs) {
      analyticsMovs.forEach(m => {
        if (dispatchTotals.hasOwnProperty(m.DstLocationID) && Array.isArray(m.Lines)) {
          m.Lines.forEach(l => { dispatchTotals[m.DstLocationID] += Number(l.Quantity) || 0; });
        }
      });
    }
    const totalOut = Object.values(dispatchTotals).reduce((a, v) => a + v, 0);
    if (!analyticsMovs) return /*#__PURE__*/React.createElement("div", {style:{color:"#c8b9a3",fontSize:13,padding:"8px 0"}}, "Loading dispatch data…");
    return /*#__PURE__*/React.createElement("div", null, channels.map(ch => {
      const qty = dispatchTotals[ch.key] || 0;
      const pct = totalOut > 0 ? Math.round(qty / totalOut * 100) : 0;
      return /*#__PURE__*/React.createElement("div", {
        key: ch.key,
        style: {
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14
        }
      }, ch.icon), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: "#2c211a"
        }
      }, ch.label), ch.note && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: "#a89680"
        }
      }, "(", ch.note, ")")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: "#a89680"
        }
      }, pct, "%"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 900,
          color: ch.color,
          fontSize: 15
        }
      }, qty, " units"))), /*#__PURE__*/React.createElement("div", {
        style: {
          background: "#f0ebe2",
          borderRadius: 6,
          overflow: "hidden",
          height: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: "100%",
          background: ch.color,
          width: pct + "%",
          transition: "width 0.6s",
          borderRadius: 6
        }
      })));
    }), totalOut === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        color: "#c8b9a3",
        fontSize: 13,
        padding: "20px 0"
      }
    }, "No dispatches recorded yet"), totalOut > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid #f0ebe2",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#a89680"
      }
    }, "Total dispatched"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 900,
        color: "#2c211a"
      }
    }, totalOut, " units")));
  })()), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: "#2c211a",
      marginBottom: 12
    }
  }, "💰 Inventory Value (at Cost)"), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#c8b9a3"
    }
  }, "Loading…") : (() => {
    const rows = products.map(p => {
      const sk = stockFor(p.ProductID);
      const tot = sk.fba + sk.wh + sk.transit;
      const cost = parseFloat(p.UnitCost) || 0;
      const val = tot * cost;
      const mrp = parseFloat(p.MRP) || 0;
      return {
        name: p.ProductName.replace("Syoat ", "").replace("Kids ", ""),
        tot,
        cost,
        val,
        mrpVal: tot * mrp
      };
    });
    const totalCost = rows.reduce((a, r) => a + r.val, 0);
    const totalMRP = rows.reduce((a, r) => a + r.mrpVal, 0);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5
      }
    }, "Product"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        textAlign: "center"
      }
    }, "Units"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        textAlign: "right"
      }
    }, "Cost Value"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#a89680",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        textAlign: "right"
      }
    }, "MRP Value")), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: 8,
        padding: "9px 0",
        borderBottom: "1px solid #f0ebe2"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#2c211a",
        fontWeight: 600
      }
    }, r.name.split(" ").slice(0, 3).join(" ")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#6f6152",
        textAlign: "center"
      }
    }, r.tot), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#bd5d38",
        fontWeight: 700,
        textAlign: "right"
      }
    }, "₹", r.val.toLocaleString("en-IN", {
      maximumFractionDigits: 0
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#bd5d38",
        fontWeight: 700,
        textAlign: "right"
      }
    }, "₹", r.mrpVal.toLocaleString("en-IN", {
      maximumFractionDigits: 0
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: 8,
        paddingTop: 10,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "#2c211a"
      }
    }, "Total"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#6f6152",
        fontWeight: 700,
        textAlign: "center"
      }
    }, rows.reduce((a, r) => a + r.tot, 0)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "#bd5d38",
        fontWeight: 900,
        textAlign: "right"
      }
    }, "₹", totalCost.toLocaleString("en-IN", {
      maximumFractionDigits: 0
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "#bd5d38",
        fontWeight: 900,
        textAlign: "right"
      }
    }, "₹", totalMRP.toLocaleString("en-IN", {
      maximumFractionDigits: 0
    }))));
  })()), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: "#2c211a",
      marginBottom: 12
    }
  }, "📋 Recent Movement Activity"), drafts.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#bd5d3812",
      border: "1px solid #bd5d3830",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#bd5d38",
      fontWeight: 600
    }
  }, "⚠️ ", drafts.length, " Draft movement", drafts.length > 1 ? "s" : "", " pending approval"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10
    }
  }, [{
    label: "Total Movements",
    value: "—",
    icon: "📦",
    color: "#bd5d38"
  }, {
    label: "Pending Approval",
    value: drafts.length,
    icon: "⏳",
    color: "#bd5d38"
  }, {
    label: "Locations Active",
    value: Object.keys(LOC_LABEL).length,
    icon: "📍",
    color: "#a97b52"
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      background: "#f8f4ef",
      borderRadius: 10,
      padding: "12px 14px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      marginBottom: 4
    }
  }, s.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      color: s.color
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#a89680",
      marginTop: 2
    }
  }, s.label)))))), !loading && stock.length === 0 && !error && drafts.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      textAlign: "center",
      padding: 36,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 30,
      marginBottom: 10
    }
  }, "🌾"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#a89680",
      fontSize: 13,
      marginBottom: 18
    }
  }, user.canCreate ? "Click + Record Movement → Opening Balance to enter your stock." : "No movements recorded yet."), user.canCreate && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMov(true),
    style: btnS()
  }, "+ Record Opening Balance"))), showMov && /*#__PURE__*/React.createElement(MovModal, {
    products: products,
    stock: stock,
    user: user,
    alertThresholds: alertThresholds,
    onClose: () => setShowMov(false),
    onDone: msg => {
      notify(msg);
      load();
    }
  }), showList && /*#__PURE__*/React.createElement(MovListModal, {
    user: user,
    staffDB: staffDB,
    products: products,
    onClose: () => setShowList(false)
  }), showCountModal && /*#__PURE__*/React.createElement(StockCountModal, {
    products: products,
    stock: stock,
    user: user,
    onClose: () => setShowCountModal(false),
    onDone: msg => {
      notify(msg);
      loadCounts();
      load();
    }
  }), showAssemble && /*#__PURE__*/React.createElement(AssembleComboModal, {
    products: products,
    stock: stock,
    user: user,
    onClose: () => setShowAssemble(false),
    onDone: msg => {
      notify(msg);
      load();
    }
  }), editingCount && /*#__PURE__*/React.createElement(EditCountModal, {
    count: editingCount,
    products: products,
    stock: stock,
    user: user,
    onClose: () => setEditingCount(null),
    onDone: msg => {
      notify(msg);
      loadCounts();
      load();
      setEditingCount(null);
    }
  }), editingMov && /*#__PURE__*/React.createElement(MovEditModal, {
    movement: editingMov,
    products: products,
    user: user,
    onClose: () => setEditingMov(null),
    onDone: msg => {
      notify(msg);
      load();
      setEditingMov(null);
    }
  }), /*#__PURE__*/React.createElement("div", { style: { height: 88 } }), /*#__PURE__*/React.createElement(BottomNav, {
    tab: tab, setTab: setTab, showList: showList,
    onMovements: function(){ setShowList(true); }, user: user
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(App, null)
  )
);
