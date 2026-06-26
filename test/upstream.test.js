import assert from "node:assert/strict";
import test from "node:test";

import { UpstreamHttpError } from "../src/errors.js";
import { createErrorMiddleware } from "../src/server.js";
import { postJsonToUpstream } from "../src/upstream.js";

function makeGatewayConfig() {
  return {
    requestTimeoutMs: 1_000
  };
}

function makeAuthResolver() {
  return {
    resolve: async () => ({
      baseUrl: "https://upstream.example/v1",
      apiKey: "dynamic-key"
    })
  };
}

function makeResponseRecorder() {
  return {
    headersSent: false,
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

test("上游 HTTP 错误会保留原始响应体和 Content-Type", async () => {
  const rawBody = JSON.stringify({
    error: {
      message: "上游拒绝了这个请求",
      type: "invalid_request_error"
    }
  });

  await assert.rejects(
    () =>
      postJsonToUpstream("images/edits", { prompt: "test" }, makeGatewayConfig(), {
        authResolver: makeAuthResolver(),
        fetchImpl: async (url, options) => {
          assert.equal(url, "https://upstream.example/v1/images/edits");
          assert.equal(options.headers.authorization, "Bearer dynamic-key");
          return new Response(rawBody, {
            status: 422,
            headers: {
              "content-type": "application/json; charset=utf-8"
            }
          });
        }
      }),
    (error) => {
      assert.ok(error instanceof UpstreamHttpError);
      assert.equal(error.status, 422);
      assert.equal(error.rawBody, rawBody);
      assert.equal(error.contentType, "application/json; charset=utf-8");
      assert.equal(error.passthrough, true);
      return true;
    }
  );
});

test("错误中间件会透传上游状态码、Content-Type 和原始响应体", () => {
  const rawBody = "{\"error\":{\"message\":\"原始错误\"}}";
  const error = new UpstreamHttpError(429, JSON.parse(rawBody), {
    rawBody,
    contentType: "application/json; charset=utf-8",
    passthrough: true
  });
  const response = makeResponseRecorder();

  createErrorMiddleware()(error, {}, response, (nextError) => {
    throw nextError;
  });

  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(response.body, rawBody);
});
