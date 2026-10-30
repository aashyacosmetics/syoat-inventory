import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PLACEHOLDER = /^(?:REPLACE_WITH_|OPTIONAL_|PENDING$)/i;
const REQUIRED_ENVIRONMENTS = ["development", "staging", "production"];
const REQUIRED_REMOTE_FIELDS = ["apiUrl", "spreadsheetId", "driveRootFolderId"];
const FORBIDDEN_KEY = /(?:pin|password|secret|session|token|salt|hash)/i;

function isPlaceholder(value) {
  return typeof value !== "string" || !value.trim() || PLACEHOLDER.test(value.trim());
}

function visitKeys(value, path, onKey) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    onKey(key, `${path}.${key}`);
    visitKeys(child, `${path}.${key}`, onKey);
  }
}

export function inspectEnvironmentIsolation(config, { requireReady = false } = {}) {
  const errors = [];
  const warnings = [];
  const environments = config?.environments;

  if (config?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!environments || typeof environments !== "object") {
    return { ready: false, errors: ["environments object is required"], warnings };
  }

  for (const name of REQUIRED_ENVIRONMENTS) {
    if (!environments[name] || typeof environments[name] !== "object") {
      errors.push(`environment is missing: ${name}`);
    }
  }

  visitKeys(config, "config", (key, path) => {
    if (FORBIDDEN_KEY.test(key)) errors.push(`credential-like key is not allowed: ${path}`);
  });

  for (const name of ["staging", "production"]) {
    const environment = environments[name];
    if (!environment) continue;
    if (environment.ownerDeploymentOnly !== true) {
      errors.push(`${name}.ownerDeploymentOnly must be true`);
    }
    for (const field of REQUIRED_REMOTE_FIELDS) {
      if (isPlaceholder(environment[field])) {
        const message = `${name}.${field} is not configured`;
        if (requireReady) errors.push(message);
        else warnings.push(message);
      }
    }
  }

  if (environments.staging?.dataClass !== "staging-copy") {
    errors.push("staging.dataClass must be staging-copy");
  }
  if (environments.production?.dataClass !== "live-business-data") {
    errors.push("production.dataClass must be live-business-data");
  }
  if (environments.development?.dataClass !== "synthetic-fixtures") {
    errors.push("development.dataClass must be synthetic-fixtures");
  }

  for (const field of REQUIRED_REMOTE_FIELDS) {
    const stagingValue = environments.staging?.[field];
    const productionValue = environments.production?.[field];
    if (!isPlaceholder(stagingValue) && !isPlaceholder(productionValue) && stagingValue === productionValue) {
      errors.push(`staging.${field} must differ from production.${field}`);
    }
  }

  const stagingLegacy = environments.staging?.legacyAttachmentsFolderId;
  const productionLegacy = environments.production?.legacyAttachmentsFolderId;
  if (!isPlaceholder(stagingLegacy) && !isPlaceholder(productionLegacy) && stagingLegacy === productionLegacy) {
    errors.push("staging.legacyAttachmentsFolderId must differ from production.legacyAttachmentsFolderId");
  }

  return { ready: errors.length === 0 && (requireReady || warnings.length === 0), errors, warnings };
}

function runCli() {
  const args = process.argv.slice(2);
  const path = args.find(arg => !arg.startsWith("--")) || "config/environments.example.json";
  const requireReady = args.includes("--require-ready");

  if (!existsSync(path)) {
    console.error(`FAIL  environment configuration not found: ${path}`);
    process.exitCode = 1;
    return;
  }

  let config;
  try {
    config = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`FAIL  invalid environment JSON: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = inspectEnvironmentIsolation(config, { requireReady });
  for (const warning of result.warnings) console.warn(`WARN  ${warning}`);
  for (const error of result.errors) console.error(`FAIL  ${error}`);

  if (result.errors.length) {
    process.exitCode = 1;
  } else if (requireReady) {
    console.log("OK  staging and production configuration are populated and isolated");
  } else {
    console.log("OK  environment template is structurally safe; placeholders are expected until owner setup");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
