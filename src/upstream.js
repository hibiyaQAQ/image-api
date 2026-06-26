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

export async function postJsonToUpstream(path, body, gatewayConfig, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const authResolver = options.authResolver || netlifyAuthResolver;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), gatewayConfig.requestTimeoutMs);

  try {
    const upstreamTarget = await authResolver.resolve(gatewayConfig);
    const headers = {
      "content-type": "application/json"
    };

    if (upstreamTarget.apiKey) {
      headers.authorization = `Bearer ${upstreamTarget.apiKey}`;
    }

    const response = await fetchImpl(joinUrl(upstreamTarget.baseUrl, path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

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
      throw new UpstreamHttpError(504, {
        error: {
          message: "调用上游图片接口超时",
          type: "gateway_timeout",
          param: null,
          code: null
        }
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
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
