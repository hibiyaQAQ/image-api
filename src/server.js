import "dotenv/config";

import cors from "cors";
import express from "express";
import multer from "multer";
import { pathToFileURL } from "node:url";

import { createAdminRouter } from "./admin-routes.js";
import { createAdminStore } from "./admin-store.js";
import { config } from "./config.js";
import { estimateImageCost } from "./cost.js";
import { createCustomerRouter } from "./customer-routes.js";
import { HttpError, UpstreamHttpError, openAiErrorBody } from "./errors.js";
import { createStorage } from "./storage.js";
import { normalizeImageEditRequest, normalizeImageGenerationRequest, transformImageResponse } from "./translator.js";
import { postJsonToUpstream } from "./upstream.js";

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function getRequestBaseUrl(request, gatewayConfig) {
  if (gatewayConfig.publicBaseUrl) {
    return gatewayConfig.publicBaseUrl;
  }

  const forwardedProto = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = forwardedProto || request.protocol;
  const host = forwardedHost || request.get("host");

  if (!host) {
    throw new HttpError(500, "无法推断请求 Host，请设置 PUBLIC_BASE_URL");
  }

  return `${proto}://${host}`;
}

function extractBearerToken(request) {
  const authorization = request.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return request.get("x-api-key") || "";
}

function requireGatewayApiKey(gatewayConfig, adminStore) {
  return asyncHandler(async (request, response, next) => {
    if (!gatewayConfig.gatewayApiKey) {
      const managedKey = await adminStore.authenticateApiKey(extractBearerToken(request));
      if (managedKey) {
        request.customerKey = managedKey;
        next();
        return;
      }
      throw new HttpError(401, "缺少或无效的网关 API Key", { type: "authentication_error" });
    }

    const apiKey = extractBearerToken(request);

    if (apiKey === gatewayConfig.gatewayApiKey) {
      request.customerKey = {
        id: "env",
        name: "环境变量 GATEWAY_API_KEY",
        keyPrefix: "env",
        enabled: true,
        monthlyBudgetUsd: 0
      };
      next();
      return;
    }

    const managedKey = await adminStore.authenticateApiKey(apiKey);
    if (managedKey) {
      request.customerKey = managedKey;
      next();
      return;
    }

    throw new HttpError(401, "缺少或无效的网关 API Key", { type: "authentication_error" });
  });
}

function createUploadMiddleware(gatewayConfig) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: gatewayConfig.maxUploadBytes,
      files: gatewayConfig.maxImages + 1,
      fields: 100
    }
  }).any();
}

function sendOpenAiJson(response, status, payload) {
  response.status(status).json(payload);
}

function sendUpstreamHttpError(response, error) {
  if (!error.passthrough) {
    sendOpenAiJson(response, error.status, error.payload && typeof error.payload === "object" ? error.payload : openAiErrorBody(error));
    return;
  }

  response.status(error.status);

  if (error.contentType) {
    response.set("content-type", error.contentType);
  }

  if (error.rawBody !== undefined && error.rawBody !== null) {
    response.send(error.rawBody);
    return;
  }

  response.end();
}

export function createErrorMiddleware() {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      sendOpenAiJson(response, 400, openAiErrorBody(new HttpError(400, `上传文件错误：${error.message}`)));
      return;
    }

    if (error.type === "entity.parse.failed") {
      sendOpenAiJson(response, 400, openAiErrorBody(new HttpError(400, "请求体不是合法 JSON")));
      return;
    }

    if (error.type === "entity.too.large") {
      sendOpenAiJson(response, 413, openAiErrorBody(new HttpError(413, "请求体超过大小限制")));
      return;
    }

    if (error instanceof HttpError) {
      sendOpenAiJson(response, error.status, openAiErrorBody(error));
      return;
    }

    if (error instanceof UpstreamHttpError) {
      sendUpstreamHttpError(response, error);
      return;
    }

    console.error("未处理的服务错误", error);
    sendOpenAiJson(response, 500, openAiErrorBody(new HttpError(500, "服务内部错误", { type: "server_error" })));
  };
}

function promptPreview(prompt) {
  if (typeof prompt !== "string") return "";
  return prompt.length > 120 ? `${prompt.slice(0, 120)}...` : prompt;
}

function getRequestIp(request) {
  return request.get("x-forwarded-for")?.split(",")[0]?.trim() || request.ip || "";
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function truncateLogText(value, maxLength = 8000) {
  if (!value) return "";
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}... [已截断]`;
}

function errorDetail(error) {
  if (!error) return "";

  if (error instanceof UpstreamHttpError) {
    if (typeof error.rawBody === "string" && error.rawBody) {
      return truncateLogText(error.rawBody);
    }
    if (error.payload) {
      return truncateLogText(safeJson(error.payload));
    }
  }

  if (error instanceof HttpError) {
    return truncateLogText(safeJson(openAiErrorBody(error)));
  }

  return truncateLogText(error.message || "");
}

async function assertBudgetAllowed(adminStore, customerKey, preflightCost) {
  if (!customerKey || customerKey.id === "env") return;
  const budget = Number(customerKey.monthlyBudgetUsd || 0);
  if (budget <= 0) return;

  const spent = await adminStore.getMonthlySpendUsd(customerKey.id);
  const estimated = Number(preflightCost.costUsd || 0);
  if (spent >= budget || (estimated > 0 && spent + estimated > budget)) {
    throw new HttpError(402, "客户本月预算已用尽", {
      type: "billing_error",
      code: "monthly_budget_exceeded"
    });
  }
}

async function recordImageRequest({ adminStore, request, endpoint, normalized, upstreamResponse, error, startedAt }) {
  const latencyMs = Date.now() - startedAt;
  const responseBody = upstreamResponse || null;
  const cost = responseBody ? estimateImageCost({ requestBody: normalized?.upstreamBody, responseBody }) : null;
  const statusCode = error instanceof UpstreamHttpError ? error.status : error instanceof HttpError ? error.status : error ? 500 : 200;
  const customerKey = request.customerKey || null;

  await adminStore.recordRequest({
    createdAt: new Date(startedAt).toISOString(),
    keyId: customerKey?.id || null,
    keyName: customerKey?.name || "未认证",
    keyPrefix: customerKey?.keyPrefix || "",
    endpoint,
    method: request.method,
    model: normalized?.upstreamBody?.model || "",
    size: cost?.size || normalized?.upstreamBody?.size || "",
    quality: cost?.quality || normalized?.upstreamBody?.quality || "",
    imageCount: cost?.imageCount || normalized?.upstreamBody?.n || 1,
    statusCode,
    errorMessage: error ? error.message : "",
    errorDetail: errorDetail(error),
    costUsd: cost?.costUsd ?? null,
    costMethod: cost?.method || "none",
    usage: cost?.usage || null,
    latencyMs,
    promptPreview: promptPreview(normalized?.upstreamBody?.prompt),
    ip: getRequestIp(request)
  });
}

export function createApp({ gatewayConfig = config, storage = createStorage(gatewayConfig), adminStore = createAdminStore(gatewayConfig) } = {}) {
  const app = express();
  const upload = createUploadMiddleware(gatewayConfig);

  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use(cors());
  app.use(express.json({ limit: gatewayConfig.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: gatewayConfig.bodyLimit }));
  app.use(gatewayConfig.fileRoutePrefix, express.static(gatewayConfig.storageDir, { maxAge: "1h" }));

  app.get("/health", (request, response) => {
    response.json({
      ok: true
    });
  });

  app.use("/admin", createAdminRouter({ gatewayConfig, adminStore }));
  app.use("/usage", createCustomerRouter({ adminStore }));
  app.use("/v1", requireGatewayApiKey(gatewayConfig, adminStore));

  app.post(
    "/v1/images/edits",
    upload,
    asyncHandler(async (request, response) => {
      const startedAt = Date.now();
      let normalized = null;
      let upstreamResponse = null;
      const baseUrl = getRequestBaseUrl(request, gatewayConfig);

      try {
        normalized = await normalizeImageEditRequest({
          body: request.body,
          files: request.files || [],
          storage,
          baseUrl,
          gatewayConfig
        });
        await assertBudgetAllowed(adminStore, request.customerKey, estimateImageCost({ requestBody: normalized.upstreamBody }));

        upstreamResponse = await postJsonToUpstream("images/edits", normalized.upstreamBody, gatewayConfig);
        const responseBody = await transformImageResponse(upstreamResponse, {
          responseFormat: normalized.responseFormat,
          outputFormat: normalized.outputFormat,
          storage,
          baseUrl
        });

        await recordImageRequest({ adminStore, request, endpoint: "/v1/images/edits", normalized, upstreamResponse, startedAt });
        response.json(responseBody);
      } catch (error) {
        await recordImageRequest({ adminStore, request, endpoint: "/v1/images/edits", normalized, upstreamResponse, error, startedAt }).catch((logError) => {
          console.error("记录请求日志失败", logError);
        });
        throw error;
      }
    })
  );

  app.post(
    "/v1/images/generations",
    upload,
    asyncHandler(async (request, response) => {
      const startedAt = Date.now();
      let normalized = null;
      let upstreamResponse = null;
      const baseUrl = getRequestBaseUrl(request, gatewayConfig);

      try {
        normalized = normalizeImageGenerationRequest({
          body: request.body,
          gatewayConfig
        });
        await assertBudgetAllowed(adminStore, request.customerKey, estimateImageCost({ requestBody: normalized.upstreamBody }));

        upstreamResponse = await postJsonToUpstream("images/generations", normalized.upstreamBody, gatewayConfig);
        const responseBody = await transformImageResponse(upstreamResponse, {
          responseFormat: normalized.responseFormat,
          outputFormat: normalized.outputFormat,
          storage,
          baseUrl
        });

        await recordImageRequest({ adminStore, request, endpoint: "/v1/images/generations", normalized, upstreamResponse, startedAt });
        response.json(responseBody);
      } catch (error) {
        await recordImageRequest({ adminStore, request, endpoint: "/v1/images/generations", normalized, upstreamResponse, error, startedAt }).catch((logError) => {
          console.error("记录请求日志失败", logError);
        });
        throw error;
      }
    })
  );

  app.use("/v1/images/variations", (request, response) => {
    sendOpenAiJson(
      response,
      501,
      openAiErrorBody(new HttpError(501, "当前网关暂未实现 /v1/images/variations，请使用 /v1/images/edits", { type: "unsupported_endpoint" }))
    );
  });

  app.use((request, response) => {
    sendOpenAiJson(response, 404, openAiErrorBody(new HttpError(404, "接口不存在", { type: "invalid_request_error" })));
  });

  app.use(createErrorMiddleware());

  return app;
}

export async function startServer(gatewayConfig = config) {
  const storage = createStorage(gatewayConfig);
  const adminStore = createAdminStore(gatewayConfig);
  await storage.ensureReady();
  storage.startCleanupTimer(gatewayConfig.cleanupIntervalMs);

  const app = createApp({ gatewayConfig, storage, adminStore });

  return new Promise((resolve) => {
    const server = app.listen(gatewayConfig.port, () => {
      resolve({ app, server, storage });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = await startServer(config);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  console.log(`OpenAI Images 兼容网关已启动：http://localhost:${port}`);
}
