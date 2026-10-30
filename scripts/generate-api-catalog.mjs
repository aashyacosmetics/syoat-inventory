import fs from "node:fs";
import path from "node:path";
import {
  extractBackendContract,
  extractFrontendCalls,
  loadCatalog,
  repoRoot,
  uniqueActions,
} from "./source-analysis.mjs";

const metadata = loadCatalog();
const backend = extractBackendContract();
const currentCalls = extractFrontendCalls("syoat-app.js");
const currentActions = new Set(uniqueActions(currentCalls));

function callerLabel(action) {
  return currentActions.has(action) ? "current" : "none";
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

const rows = metadata.actions.map(item =>
  `| \`${item.action}\` | ${escapeCell(item.routes.join(" + "))} | ${escapeCell(item.currentGate)} | ${callerLabel(item.action)} | \`${item.targetCapability}\` |`
);

const generated = [
  "<!-- BEGIN GENERATED ACTION TABLE -->",
  "| Action | Current routes | Current backend gate | Frontend caller | Target capability |",
  "| --- | --- | --- | --- | --- |",
  ...rows,
  "<!-- END GENERATED ACTION TABLE -->",
].join("\n");

if (process.argv.includes("--check")) {
  const doc = fs.readFileSync(path.join(repoRoot, "docs", "API_CATALOG.md"), "utf8");
  const match = doc.match(/<!-- BEGIN GENERATED ACTION TABLE -->[\s\S]*?<!-- END GENERATED ACTION TABLE -->/);
  if (!match || match[0].trim() !== generated.trim()) {
    console.error("docs/API_CATALOG.md is out of date. Run `npm run catalog:print` and update the generated table.");
    process.exitCode = 1;
  } else {
    console.log(`API catalogue is current (${backend.actions.length} backend actions).`);
  }
} else {
  console.log(generated);
}
