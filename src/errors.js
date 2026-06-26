export class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.type = options.type || "invalid_request_error";
    this.param = options.param ?? null;
    this.code = options.code ?? null;
  }
}

export class UpstreamHttpError extends Error {
  constructor(status, payload, options = {}) {
    const message =
      payload && typeof payload === "object" && payload.error?.message
        ? payload.error.message
        : `上游接口返回 HTTP ${status}`;
    super(message);
    this.name = "UpstreamHttpError";
    this.status = status;
    this.payload = payload;
    this.rawBody = options.rawBody;
    this.contentType = options.contentType || "";
    this.passthrough = options.passthrough || false;
  }
}

export function openAiErrorBody(error) {
  return {
    error: {
      message: error.message || "请求处理失败",
      type: error.type || "server_error",
      param: error.param ?? null,
      code: error.code ?? null
    }
  };
}
