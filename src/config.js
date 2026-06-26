import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function ensureRoutePrefix(value) {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/uploads";
}

function parseIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} 必须是非负整数`);
  }
  return value;
}

function parseBytesEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const match = /^(\d+)(b|kb|mb|gb)?$/i.exec(raw.trim());
  if (!match) {
    throw new Error(`${name} 必须是字节数，或带 kb/mb/gb 后缀`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = (match[2] || "b").toLowerCase();
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  return amount * multipliers[unit];
}

function parseJsonObjectEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = JSON.parse(raw);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${name} 必须是 JSON 对象`);
  }

  return parsed;
}

export function loadConfig() {
  const netlifyUrl = process.env.NETLIFY_URL ? trimTrailingSlash(process.env.NETLIFY_URL) : "";
  const upstreamBaseUrl = trimTrailingSlash(
    process.env.UPSTREAM_BASE_URL || (netlifyUrl ? `${netlifyUrl}/.netlify/ai/v1` : "https://stellar-quokka-2fdb2f.netlify.app/.netlify/ai/v1")
  );

  return {
    port: parseIntegerEnv("PORT", 3000),
    netlifyUrl,
    netlifyKeyTtlMs: parseIntegerEnv("NETLIFY_KEY_TTL_SECONDS", 5 * 60) * 1000,
    netlifyConfigTimeoutMs: parseIntegerEnv("NETLIFY_CONFIG_TIMEOUT_SECONDS", 15) * 1000,
    upstreamBaseUrl,
    upstreamApiKey: process.env.UPSTREAM_API_KEY || "",
    gatewayApiKey: process.env.GATEWAY_API_KEY || "",
    adminUsername: process.env.ADMIN_USERNAME || "admin",
    adminPassword: process.env.ADMIN_PASSWORD || "",
    adminToken: process.env.ADMIN_TOKEN || "",
    adminStoreFile: path.resolve(projectRoot, process.env.ADMIN_STORE_FILE || "data/admin-store.json"),
    maxLogEntries: parseIntegerEnv("MAX_LOG_ENTRIES", 5000),
    publicBaseUrl: process.env.PUBLIC_BASE_URL ? trimTrailingSlash(process.env.PUBLIC_BASE_URL) : "",
    defaultImageModel: process.env.DEFAULT_IMAGE_MODEL || "gpt-image-2",
    modelAliases: parseJsonObjectEnv("MODEL_ALIASES", {}),
    storageDir: path.resolve(projectRoot, process.env.STORAGE_DIR || "data/uploads"),
    fileRoutePrefix: ensureRoutePrefix(process.env.FILE_ROUTE_PREFIX || "/uploads"),
    tempFileTtlMs: parseIntegerEnv("TEMP_FILE_TTL_SECONDS", 24 * 60 * 60) * 1000,
    cleanupIntervalMs: parseIntegerEnv("CLEANUP_INTERVAL_SECONDS", 60 * 60) * 1000,
    maxUploadBytes: parseBytesEnv("MAX_UPLOAD_BYTES", 20 * 1024 * 1024),
    maxStorageBytes: parseBytesEnv("MAX_STORAGE_BYTES", 10 * 1024 * 1024 * 1024),
    maxStoredFiles: parseIntegerEnv("MAX_STORED_FILES", 5000),
    maxImages: parseIntegerEnv("MAX_IMAGES", 16),
    bodyLimit: process.env.BODY_LIMIT || "30mb",
    requestTimeoutMs: parseIntegerEnv("REQUEST_TIMEOUT_SECONDS", 300) * 1000
  };
}

export const config = loadConfig();
