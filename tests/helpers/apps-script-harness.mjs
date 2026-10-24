import vm from "node:vm";
import crypto from "node:crypto";
import { readProjectFile } from "../../scripts/source-analysis.mjs";

export function objectsToRows(objects, preferredHeaders = []) {
  const headers = [...preferredHeaders];
  for (const object of objects) {
    for (const key of Object.keys(object)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }
  return [headers, ...objects.map(object => headers.map(header => object[header] ?? ""))];
}

class MemoryRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from({ length: this.columnCount }, (_, columnOffset) =>
        this.sheet.valueAt(this.row + rowOffset, this.column + columnOffset)
      )
    );
  }

  getValue() {
    return this.getValues()[0][0];
  }

  setValue(value) {
    this.sheet.setValueAt(this.row, this.column, value);
    return this;
  }

  setValues(values) {
    values.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
      this.sheet.setValueAt(this.row + rowOffset, this.column + columnOffset, value);
    }));
    return this;
  }
}

class MemorySheet {
  constructor(name, values) {
    this.name = name;
    this.values = values.map(row => [...row]);
    this.dataRangeReads = 0;
    this.rangeReads = 0;
    this.appendFailureCountdown = null;
    this.appendFailureMessage = "Injected append failure";
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    return this.values.length;
  }

  getLastColumn() {
    return this.values.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  }

  getDataRange() {
    this.dataRangeReads += 1;
    return new MemoryRange(this, 1, 1, this.getLastRow(), this.getLastColumn());
  }

  getRange(row, column, rowCount = 1, columnCount = 1) {
    this.rangeReads += 1;
    return new MemoryRange(this, row, column, rowCount, columnCount);
  }

  appendRow(row) {
    if (this.appendFailureCountdown === 0) {
      this.appendFailureCountdown = null;
      throw new Error(this.appendFailureMessage);
    }
    if (this.appendFailureCountdown !== null) this.appendFailureCountdown -= 1;
    this.values.push([...row]);
    return this;
  }

  failAppendAfter(successfulAppends = 0, message = "Injected append failure") {
    this.appendFailureCountdown = successfulAppends;
    this.appendFailureMessage = message;
  }

  deleteRow(row) {
    this.values.splice(row - 1, 1);
  }

  valueAt(row, column) {
    return this.values[row - 1]?.[column - 1] ?? "";
  }

  setValueAt(row, column, value) {
    while (this.values.length < row) this.values.push([]);
    while (this.values[row - 1].length < column) this.values[row - 1].push("");
    this.values[row - 1][column - 1] = value;
  }
}

class MemorySpreadsheet {
  constructor(sheetValues) {
    this.sheets = new Map(Object.entries(sheetValues).map(([name, values]) => [name, new MemorySheet(name, values)]));
  }

  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }
}

function contentService() {
  return {
    MimeType: { JSON: "application/json" },
    createTextOutput(content) {
      return {
        content,
        mimeType: null,
        setMimeType(mimeType) {
          this.mimeType = mimeType;
          return this;
        },
        getContent() {
          return this.content;
        },
      };
    },
  };
}

export function createAppsScriptHarness(sheetValues = {}) {
  const spreadsheet = new MemorySpreadsheet(sheetValues);
  const cache = new Map();
  let uuidCounter = 0;
  const properties = new Map();
  const propertyStats = { getPropertyCalls: 0, getPropertiesCalls: 0 };
  const scriptProperties = {
    getProperty: key => {
      propertyStats.getPropertyCalls += 1;
      return properties.get(key) ?? null;
    },
    setProperty: (key, value) => { properties.set(key, String(value)); return scriptProperties; },
    deleteProperty: key => { properties.delete(key); return scriptProperties; },
    getProperties: () => {
      propertyStats.getPropertiesCalls += 1;
      return Object.fromEntries(properties);
    },
  };
  const lockStats = { waitCalls: 0, releaseCalls: 0 };
  const scriptLock = {
    waitLock: () => { lockStats.waitCalls += 1; },
    releaseLock: () => { lockStats.releaseCalls += 1; },
  };
  const context = vm.createContext({
    console,
    ContentService: contentService(),
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    CacheService: {
      getScriptCache: () => ({
        get: key => cache.get(key) ?? null,
        put: (key, value) => cache.set(key, String(value)),
        remove: key => cache.delete(key),
      }),
    },
    PropertiesService: { getScriptProperties: () => scriptProperties },
    LockService: { getScriptLock: () => scriptLock },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      getUuid: () => {
        uuidCounter += 1;
        return "00000000-0000-4000-8000-" + String(uuidCounter).padStart(12, "0");
      },
      computeDigest: (algorithm, value) => [...crypto.createHash("sha256").update(String(value), "utf8").digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString("base64url"),
      base64Encode: bytes => Buffer.from(bytes).toString("base64"),
      base64Decode: value => Buffer.from(value, "base64"),
      newBlob: (bytes, contentType, name) => ({ bytes, contentType, name }),
    },
    DriveApp: new Proxy({}, { get: () => () => { throw new Error("DriveApp is not available in local tests"); } }),
    MailApp: { sendEmail: () => undefined },
    Logger: { log: () => undefined },
    Session: { getScriptTimeZone: () => "Asia/Kolkata" },
    Buffer,
    setTimeout,
    clearTimeout,
  });

  new vm.Script(readProjectFile("Code.gs"), { filename: "Code.gs" }).runInContext(context);

  return {
    spreadsheet,
    properties,
    propertyStats,
    lockStats,
    call(functionName, ...args) {
      if (typeof context[functionName] !== "function") throw new Error(`Apps Script function not found: ${functionName}`);
      return context[functionName](...args);
    },
    evaluate(expression) {
      return vm.runInContext(expression, context);
    },
    callJson(functionName, ...args) {
      const output = this.call(functionName, ...args);
      return JSON.parse(output.getContent());
    },
  };
}
