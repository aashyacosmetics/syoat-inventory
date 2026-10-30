import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(thisDir, "..");

export function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function functionBody(source, functionName) {
  const signature = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`, "m");
  const match = signature.exec(source);
  if (!match) throw new Error(`Function not found: ${functionName}`);

  const openBrace = source.indexOf("{", match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openBrace + 1, i);
    }
  }
  throw new Error(`Unclosed function body: ${functionName}`);
}

export function extractComparedActions(body) {
  return [...body.matchAll(/action\s*===\s*["']([A-Za-z0-9_]+)["']/g)].map(match => match[1]);
}

export function extractBackendContract(source = readProjectFile("Code.gs")) {
  const getActions = extractComparedActions(functionBody(source, "doGet"));
  const postPreAuthActions = extractComparedActions(functionBody(source, "doPost"));
  const authenticatedReadActions = extractComparedActions(functionBody(source, "handleAuthenticatedAction"));
  // Work Package 5 wraps every command in handleWrite's lock/idempotency
  // boundary, then dispatches the classified business handler here.
  const writeActions = extractComparedActions(functionBody(source, "dispatchBusinessWrite"));

  const routes = new Map();
  const add = (action, route, group) => {
    const current = routes.get(action) || { action, routes: [], groups: [] };
    if (!current.routes.includes(route)) current.routes.push(route);
    if (!current.groups.includes(group)) current.groups.push(group);
    routes.set(action, current);
  };

  getActions.forEach(action => add(action, "GET", "doGet-direct"));
  postPreAuthActions.forEach(action => add(action, "POST", "doPost-direct"));
  authenticatedReadActions.forEach(action => add(action, "POST", "authenticated-read"));
  writeActions.forEach(action => add(action, "POST", "handleWrite"));

  return {
    getActions,
    postPreAuthActions,
    authenticatedReadActions,
    writeActions,
    actions: [...routes.values()].sort((a, b) => a.action.localeCompare(b.action)),
  };
}

export function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

export function extractFrontendCalls(relativePath) {
  const source = readProjectFile(relativePath);
  const calls = [];
  const helperPattern = /\b(api|apiPublic|apiWrite|apiWritePost)\s*\(\s*["']([A-Za-z0-9_]+)["']/g;
  for (const match of source.matchAll(helperPattern)) {
    calls.push({
      action: match[2],
      helper: match[1],
      transport: match[1] === "apiPublic" ? "GET" : "POST",
      line: lineNumberAt(source, match.index),
    });
  }

  const directPostPattern = /body:\s*JSON\.stringify\(\{\s*action:\s*["']([A-Za-z0-9_]+)["']/g;
  for (const match of source.matchAll(directPostPattern)) {
    calls.push({
      action: match[1],
      helper: "directPost",
      transport: "POST",
      line: lineNumberAt(source, match.index),
    });
  }

  return calls.sort((a, b) => a.line - b.line);
}

export function uniqueActions(calls) {
  return [...new Set(calls.map(call => call.action))].sort();
}

export function loadCatalog() {
  return JSON.parse(readProjectFile("config/api-catalog.json"));
}
