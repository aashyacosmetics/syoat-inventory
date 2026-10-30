import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { inspectEnvironmentIsolation } from "./check-environment-isolation.mjs";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const ROOT_FILES = new Set(["index.html", "syoat-app.js", "syoat-theme.css", "syoat-logo.png"]);

function loadReadyConfiguration(path) {
  if (!existsSync(path)) throw new Error(`Staging configuration not found: ${path}`);
  const config = JSON.parse(readFileSync(path, "utf8"));
  const result = inspectEnvironmentIsolation(config, { requireReady: true });
  if (result.errors.length) throw new Error("Staging configuration is unsafe: " + result.errors.join("; "));
  return config;
}

function safeAssetPath(root, pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (ROOT_FILES.has(decoded)) return resolve(root, decoded);
  if (!decoded.startsWith("images/")) return "";
  const candidate = resolve(root, decoded);
  const imagesRoot = resolve(root, "images") + sep;
  return candidate.startsWith(imagesRoot) ? candidate : "";
}

function commonHeaders(contentType) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

export function createStagingServer({
  root = process.cwd(),
  configPath = resolve(process.cwd(), "config", "environments.local.json")
} = {}) {
  const config = loadReadyConfiguration(configPath);
  const staging = config.environments.staging;

  return createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, commonHeaders("text/plain; charset=utf-8"));
      response.end("Method not allowed");
      return;
    }

    if (url.pathname === "/runtime-config.js") {
      const source = "window.SYOAT_CONFIG = Object.freeze(" + JSON.stringify({ environment: "staging", apiUrl: staging.apiUrl }) + ");\n";
      response.writeHead(200, commonHeaders("text/javascript; charset=utf-8"));
      response.end(request.method === "HEAD" ? "" : source);
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetPath = safeAssetPath(root, pathname);
    if (!assetPath || !existsSync(assetPath)) {
      response.writeHead(404, commonHeaders("text/plain; charset=utf-8"));
      response.end("Not found");
      return;
    }

    const contentType = CONTENT_TYPES[extname(assetPath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, commonHeaders(contentType));
    response.end(request.method === "HEAD" ? "" : readFileSync(assetPath));
  });
}

function runCli() {
  const port = Number(process.env.SYOAT_STAGING_PORT || 4173);
  const server = createStagingServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Syoat staging frontend: http://127.0.0.1:${port}`);
    console.log("Localhost only; production runtime-config.js is not used or changed.");
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
