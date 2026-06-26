import express from "express";

import { HttpError, openAiErrorBody } from "./errors.js";
import { renderCustomerUsagePage } from "./customer-page.js";

function extractBearerToken(request) {
  const authorization = request.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return request.get("x-api-key") || "";
}

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function requireCustomerKey(adminStore) {
  return asyncHandler(async (request, response, next) => {
    const customerKey = await adminStore.authenticateApiKey(extractBearerToken(request));
    if (!customerKey) {
      response.status(401).json(openAiErrorBody(new HttpError(401, "缺少或无效的客户 API key", { type: "authentication_error" })));
      return;
    }

    request.customerKey = customerKey;
    next();
  });
}

export function createCustomerRouter({ adminStore }) {
  const router = express.Router();

  router.get("/", (request, response) => {
    response.type("html").send(renderCustomerUsagePage());
  });

  router.use("/api", requireCustomerKey(adminStore));

  router.get(
    "/api/summary",
    asyncHandler(async (request, response) => {
      const summary = await adminStore.getCustomerSummary(request.customerKey.id);
      if (!summary) {
        response.status(404).json(openAiErrorBody(new HttpError(404, "客户 key 不存在")));
        return;
      }
      response.json(summary);
    })
  );

  router.get(
    "/api/logs",
    asyncHandler(async (request, response) => {
      response.json(
        await adminStore.listCustomerLogs(request.customerKey.id, {
          limit: request.query.limit
        })
      );
    })
  );

  return router;
}
