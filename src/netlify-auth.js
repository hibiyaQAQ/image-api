import { UpstreamHttpError } from "./errors.js";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function joinUrl(baseUrl, path) {
  return `${trimTrailingSlash(baseUrl)}/${path.replace(/^\/+/, "")}`;
}

function openAiUpstreamAuthError(status, message, type = "upstream_auth_error") {
  return new UpstreamHttpError(status, {
    error: {
      message,
      type,
      param: null,
      code: null
    }
  });
}

function normalizeGatewayBaseUrl(payload, gatewayConfig) {
  if (payload.gatewayUrl && typeof payload.gatewayUrl === "string") {
    return joinUrl(payload.gatewayUrl, "v1");
  }

  return gatewayConfig.upstreamBaseUrl;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw openAiUpstreamAuthError(502, "Netlify /api/config 返回的内容不是合法 JSON");
  }
}

export function createNetlifyAuthResolver({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  let cachedTarget = null;
  let pendingRefresh = null;

  async function refresh(gatewayConfig) {
    if (!fetchImpl) {
      throw openAiUpstreamAuthError(500, "当前 Node 环境不支持 fetch，无法获取 Netlify 动态 API Key");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), gatewayConfig.netlifyConfigTimeoutMs);
    const configUrl = joinUrl(gatewayConfig.netlifyUrl, "api/config");

    try {
      const response = await fetchImpl(configUrl, {
        method: "GET",
        headers: {
          accept: "application/json"
        },
        signal: controller.signal
      });

      const payload = await parseJsonResponse(response);
      if (!response.ok) {
        throw openAiUpstreamAuthError(response.status, `获取 Netlify 动态 API Key 失败：HTTP ${response.status}`);
      }

      if (!payload.gatewayKey || typeof payload.gatewayKey !== "string") {
        throw openAiUpstreamAuthError(502, "Netlify /api/config 响应缺少 gatewayKey");
      }

      cachedTarget = {
        baseUrl: normalizeGatewayBaseUrl(payload, gatewayConfig),
        apiKey: payload.gatewayKey,
        fetchedAt: now(),
        source: "netlify"
      };

      return cachedTarget;
    } catch (error) {
      if (error instanceof UpstreamHttpError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw openAiUpstreamAuthError(504, "获取 Netlify 动态 API Key 超时", "gateway_timeout");
      }

      throw openAiUpstreamAuthError(502, `获取 Netlify 动态 API Key 失败：${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function resolve(gatewayConfig) {
    if (!gatewayConfig.netlifyUrl) {
      return {
        baseUrl: gatewayConfig.upstreamBaseUrl,
        apiKey: gatewayConfig.upstreamApiKey,
        fetchedAt: null,
        source: "static"
      };
    }

    const currentTime = now();
    if (cachedTarget && currentTime - cachedTarget.fetchedAt < gatewayConfig.netlifyKeyTtlMs) {
      return cachedTarget;
    }

    if (!pendingRefresh) {
      pendingRefresh = refresh(gatewayConfig).finally(() => {
        pendingRefresh = null;
      });
    }

    return pendingRefresh;
  }

  function clear() {
    cachedTarget = null;
    pendingRefresh = null;
  }

  return {
    resolve,
    clear
  };
}

export const netlifyAuthResolver = createNetlifyAuthResolver();
