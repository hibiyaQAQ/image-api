import { UpstreamHttpError } from "./errors.js";
import { netlifyAuthResolver } from "./netlify-auth.js";

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function inferContentType(contentType, text) {
  if (contentType) return contentType;

  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "application/json; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}

function createRequestContext(gatewayConfig) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), gatewayConfig.requestTimeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout)
  };
}

function createTimeoutError() {
  return new UpstreamHttpError(504, {
    error: {
      message: "调用上游图片接口超时",
      type: "gateway_timeout",
      param: null,
      code: null
    }
  });
}

async function fetchUpstream(path, body, gatewayConfig, options, requestContext, accept) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const authResolver = options.authResolver || netlifyAuthResolver;
  const upstreamTarget = await authResolver.resolve(gatewayConfig);
  const headers = {
    "content-type": "application/json"
  };

  if (accept) {
    headers.accept = accept;
  }

  if (upstreamTarget.apiKey) {
    headers.authorization = `Bearer ${upstreamTarget.apiKey}`;
  }

  return fetchImpl(joinUrl(upstreamTarget.baseUrl, path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: requestContext.signal
  });
}

export async function postJsonToUpstream(path, body, gatewayConfig, options = {}) {
  const requestContext = createRequestContext(gatewayConfig);

  try {
    const response = await fetchUpstream(path, body, gatewayConfig, options, requestContext, "application/json");
    const text = await response.text();

    if (!response.ok) {
      throw new UpstreamHttpError(response.status, text ? parseJsonOrText(text) : {}, {
        rawBody: text,
        contentType: inferContentType(response.headers.get("content-type") || "", text),
        passthrough: true
      });
    }

    const payload = text ? parseJsonOrText(text) : {};
    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      throw createTimeoutError();
    }

    throw error;
  } finally {
    requestContext.clear();
  }
}

export async function postStreamToUpstream(path, body, gatewayConfig, options = {}) {
  const requestContext = createRequestContext(gatewayConfig);
  let keepContextOpen = false;

  try {
    const response = await fetchUpstream(path, body, gatewayConfig, options, requestContext, "text/event-stream, application/json");

    if (!response.ok) {
      const text = await response.text();
      throw new UpstreamHttpError(response.status, text ? parseJsonOrText(text) : {}, {
        rawBody: text,
        contentType: inferContentType(response.headers.get("content-type") || "", text),
        passthrough: true
      });
    }

    keepContextOpen = true;
    return {
      response,
      cleanup: requestContext.clear
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw createTimeoutError();
    }

    throw error;
  } finally {
    if (!keepContextOpen) {
      requestContext.clear();
    }
  }
}

function parseJsonOrText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: {
        message: text,
        type: "upstream_error",
        param: null,
        code: null
      }
    };
  }
}
