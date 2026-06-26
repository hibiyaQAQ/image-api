import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

function apiKeyHash(apiKey) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function keyPrefix(apiKey) {
  return apiKey.slice(0, 14);
}

function redactKey(record) {
  const { keyHash, ...safeRecord } = record;
  return safeRecord;
}

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function inCurrentMonth(isoDate) {
  if (!isoDate) return false;
  return monthKey(new Date(isoDate)) === monthKey();
}

function normalizeMoney(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;
  return Math.round(numberValue * 1_000_000) / 1_000_000;
}

function makeInitialStore() {
  return {
    version: 1,
    keys: [],
    logs: []
  };
}

export function createAdminStore(gatewayConfig) {
  let state = null;
  let lock = Promise.resolve();

  async function withLock(task) {
    const run = lock.then(task, task);
    lock = run.catch(() => {});
    return run;
  }

  async function load() {
    if (state) return state;

    try {
      const raw = await fs.readFile(gatewayConfig.adminStoreFile, "utf8");
      state = JSON.parse(raw);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      state = makeInitialStore();
      await save();
    }

    state.keys ||= [];
    state.logs ||= [];
    return state;
  }

  async function save() {
    await fs.mkdir(path.dirname(gatewayConfig.adminStoreFile), { recursive: true });
    const tmpFile = `${gatewayConfig.adminStoreFile}.tmp`;
    await fs.writeFile(tmpFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await fs.rename(tmpFile, gatewayConfig.adminStoreFile);
  }

  function findKeyById(id) {
    return state.keys.find((key) => key.id === id);
  }

function summarizeKey(key) {
    const logs = state.logs.filter((log) => log.keyId === key.id);
    const monthLogs = logs.filter((log) => inCurrentMonth(log.createdAt));
    const monthSpendUsd = normalizeMoney(monthLogs.reduce((total, log) => total + Number(log.costUsd || 0), 0));

    return {
      ...redactKey(key),
      requestCount: logs.length,
      monthRequestCount: monthLogs.length,
      monthSpendUsd
    };
  }

  function sanitizeCustomerLog(log) {
    const {
      keyId,
      keyName,
      keyPrefix,
      promptPreview,
      ip,
      errorMessage,
      ...safeLog
    } = log;

    return {
      ...safeLog,
      hasError: Boolean(errorMessage)
    };
  }

  async function getCustomerSummary(keyId) {
    await load();

    const key = findKeyById(keyId);
    if (!key) return null;

    const logs = state.logs.filter((log) => log.keyId === keyId);
    const monthLogs = logs.filter((log) => inCurrentMonth(log.createdAt));
    const monthSpendUsd = normalizeMoney(monthLogs.reduce((total, log) => total + Number(log.costUsd || 0), 0));
    const monthlyBudgetUsd = normalizeMoney(key.monthlyBudgetUsd);

    return {
      key: {
        id: key.id,
        name: key.name,
        enabled: key.enabled,
        monthlyBudgetUsd,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt
      },
      currentMonth: monthKey(),
      requestCount: logs.length,
      monthRequestCount: monthLogs.length,
      monthSuccessCount: monthLogs.filter((log) => log.statusCode >= 200 && log.statusCode < 300).length,
      monthSpendUsd,
      monthBudgetRemainingUsd: monthlyBudgetUsd > 0 ? normalizeMoney(Math.max(0, monthlyBudgetUsd - monthSpendUsd)) : null
    };
  }

  async function listCustomerLogs(keyId, { limit = 200 } = {}) {
    await load();
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    return state.logs
      .filter((log) => log.keyId === keyId)
      .slice(0, safeLimit)
      .map(sanitizeCustomerLog);
  }

  async function authenticateApiKey(apiKey) {
    if (!apiKey) return null;
    await load();

    const presentedHash = apiKeyHash(apiKey);
    const presentedBuffer = Buffer.from(presentedHash, "hex");

    for (const key of state.keys) {
      const storedBuffer = Buffer.from(key.keyHash, "hex");
      if (storedBuffer.length !== presentedBuffer.length) continue;
      if (!timingSafeEqual(storedBuffer, presentedBuffer)) continue;
      if (!key.enabled) return null;
      if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) return null;
      return redactKey(key);
    }

    return null;
  }

  async function createKey(input = {}) {
    return withLock(async () => {
      await load();

      const apiKey = `imgw_${randomBytes(32).toString("base64url")}`;
      const record = {
        id: randomUUID(),
        name: String(input.name || "未命名客户").trim(),
        keyPrefix: keyPrefix(apiKey),
        keyHash: apiKeyHash(apiKey),
        enabled: input.enabled !== false,
        monthlyBudgetUsd: normalizeMoney(input.monthlyBudgetUsd),
        expiresAt: input.expiresAt || null,
        notes: String(input.notes || "").trim(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastUsedAt: null
      };

      state.keys.unshift(record);
      await save();

      return {
        apiKey,
        key: summarizeKey(record)
      };
    });
  }

  async function listKeys() {
    await load();
    return state.keys.map(summarizeKey);
  }

  async function updateKey(id, patch = {}) {
    return withLock(async () => {
      await load();
      const key = findKeyById(id);
      if (!key) return null;

      if (patch.name !== undefined) key.name = String(patch.name || "").trim() || key.name;
      if (patch.enabled !== undefined) key.enabled = Boolean(patch.enabled);
      if (patch.monthlyBudgetUsd !== undefined) key.monthlyBudgetUsd = normalizeMoney(patch.monthlyBudgetUsd);
      if (patch.expiresAt !== undefined) key.expiresAt = patch.expiresAt || null;
      if (patch.notes !== undefined) key.notes = String(patch.notes || "").trim();
      key.updatedAt = nowIso();

      await save();
      return summarizeKey(key);
    });
  }

  async function deleteKey(id) {
    return withLock(async () => {
      await load();
      const before = state.keys.length;
      state.keys = state.keys.filter((key) => key.id !== id);
      const deleted = state.keys.length !== before;
      if (deleted) await save();
      return deleted;
    });
  }

  async function getMonthlySpendUsd(keyId) {
    await load();
    return normalizeMoney(
      state.logs
        .filter((log) => log.keyId === keyId && inCurrentMonth(log.createdAt))
        .reduce((total, log) => total + Number(log.costUsd || 0), 0)
    );
  }

  async function recordRequest(log) {
    return withLock(async () => {
      await load();

      const createdAt = log.createdAt || nowIso();
      const entry = {
        id: randomUUID(),
        createdAt,
        ...log,
        costUsd: log.costUsd === null || log.costUsd === undefined ? null : normalizeMoney(log.costUsd)
      };

      state.logs.unshift(entry);
      if (state.logs.length > gatewayConfig.maxLogEntries) {
        state.logs.length = gatewayConfig.maxLogEntries;
      }

      if (log.keyId) {
        const key = findKeyById(log.keyId);
        if (key) {
          key.lastUsedAt = createdAt;
          key.updatedAt = nowIso();
        }
      }

      await save();
      return entry;
    });
  }

  async function listLogs({ limit = 200, keyId = "" } = {}) {
    await load();
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    return state.logs
      .filter((log) => !keyId || log.keyId === keyId)
      .slice(0, safeLimit);
  }

  async function getSummary() {
    await load();
    const logs = state.logs;
    const monthLogs = logs.filter((log) => inCurrentMonth(log.createdAt));
    const successfulMonthLogs = monthLogs.filter((log) => log.statusCode >= 200 && log.statusCode < 300);

    return {
      keyCount: state.keys.length,
      enabledKeyCount: state.keys.filter((key) => key.enabled).length,
      totalLogCount: logs.length,
      monthRequestCount: monthLogs.length,
      monthSuccessCount: successfulMonthLogs.length,
      monthSpendUsd: normalizeMoney(monthLogs.reduce((total, log) => total + Number(log.costUsd || 0), 0)),
      currentMonth: monthKey()
    };
  }

  return {
    authenticateApiKey,
    createKey,
    listKeys,
    updateKey,
    deleteKey,
    getMonthlySpendUsd,
    getCustomerSummary,
    listCustomerLogs,
    recordRequest,
    listLogs,
    getSummary
  };
}
