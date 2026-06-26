import express from "express";

import { HttpError, openAiErrorBody } from "./errors.js";
import { getPricingTables } from "./cost.js";
import { renderAdminPage } from "./admin-page.js";

function parseBasicAuth(header) {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1)
  };
}

function requireAdminAuth(gatewayConfig) {
  return (request, response, next) => {
    if (!gatewayConfig.adminPassword && !gatewayConfig.adminToken) {
      response.status(503).type("text/plain").send("管理台未启用：请设置 ADMIN_PASSWORD 或 ADMIN_TOKEN");
      return;
    }

    const authorization = request.get("authorization") || "";
    if (gatewayConfig.adminToken && authorization === `Bearer ${gatewayConfig.adminToken}`) {
      next();
      return;
    }

    const basic = parseBasicAuth(authorization);
    if (basic && basic.username === gatewayConfig.adminUsername && basic.password === gatewayConfig.adminPassword) {
      next();
      return;
    }

    response.set("www-authenticate", 'Basic realm="Image API Admin"');
    response.status(401).type("text/plain").send("需要管理员认证");
  };
}

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createAdminRouter({ gatewayConfig, adminStore }) {
  const router = express.Router();

  router.use(requireAdminAuth(gatewayConfig));

  router.get("/", (request, response) => {
    response.type("html").send(renderAdminPage());
  });

  router.get(
    "/api/summary",
    asyncHandler(async (request, response) => {
      response.json(await adminStore.getSummary());
    })
  );

  router.get(
    "/api/keys",
    asyncHandler(async (request, response) => {
      response.json(await adminStore.listKeys());
    })
  );

  router.post(
    "/api/keys",
    asyncHandler(async (request, response) => {
      const result = await adminStore.createKey(request.body || {});
      response.status(201).json(result);
    })
  );

  router.patch(
    "/api/keys/:id",
    asyncHandler(async (request, response) => {
      const key = await adminStore.updateKey(request.params.id, request.body || {});
      if (!key) {
        response.status(404).json(openAiErrorBody(new HttpError(404, "客户 key 不存在")));
        return;
      }
      response.json(key);
    })
  );

  router.delete(
    "/api/keys/:id",
    asyncHandler(async (request, response) => {
      const deleted = await adminStore.deleteKey(request.params.id);
      if (!deleted) {
        response.status(404).json(openAiErrorBody(new HttpError(404, "客户 key 不存在")));
        return;
      }
      response.status(204).end();
    })
  );

  router.get(
    "/api/logs",
    asyncHandler(async (request, response) => {
      response.json(
        await adminStore.listLogs({
          limit: request.query.limit,
          keyId: request.query.keyId || ""
        })
      );
    })
  );

  router.get("/api/pricing", (request, response) => {
    response.json(getPricingTables());
  });

  return router;
}
