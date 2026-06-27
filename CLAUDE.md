# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # 生产模式启动
npm run dev        # 开发模式（node --watch 热重载）
npm test           # 运行全部测试（Node.js 内置 test runner）
node --test test/translator.test.js  # 运行单个测试文件
```

初次运行前需要复制并配置环境变量：

```bash
cp .env.example .env
```

## 架构概览

这是一个 OpenAI Images 兼容的聚合网关，Node.js ESM（`type: "module"`），要求 Node ≥ 20，无构建步骤。

### 请求流程

```
客户端请求 (multipart 或 JSON)
  → requireGatewayApiKey 鉴权（admin-store.js 的托管 key 或环境变量 GATEWAY_API_KEY）
  → normalizeImageEditRequest / normalizeImageGenerationRequest（translator.js）
      → 上传文件或 base64 data URL → storage.saveBuffer() → 得到公网临时图片 URL
  → assertBudgetAllowed（admin-store.js 月度预算检查）
  → postJsonToUpstream / postStreamToUpstream（upstream.js）
      → netlifyAuthResolver.resolve()（netlify-auth.js，动态获取/缓存 Netlify API Key）
  → transformImageResponse（translator.js）：response_format=url 时把 b64_json 存为临时图片
  → recordImageRequest（admin-store.js，写日志并统计费用）
```

流式响应（`stream: true`）在 `server.js` 中单独处理：先 peek 首个 SSE 事件检测错误，再实时转发给客户端。

### 核心模块职责

| 文件 | 职责 |
|------|------|
| `src/config.js` | 解析所有环境变量，`loadConfig()` 导出 `config` 单例 |
| `src/server.js` | Express 应用、路由、流式 SSE 处理、错误中间件 |
| `src/translator.js` | 请求规范化（multipart/JSON → 上游格式）和响应转换 |
| `src/upstream.js` | HTTP 调用上游 API，超时控制，错误透传 |
| `src/storage.js` | 临时图片保存（`data/uploads/`）、TTL/容量清理、base64 解析 |
| `src/cost.js` | 按 token usage 或 size/quality 估算费用 |
| `src/netlify-auth.js` | 动态获取 Netlify 短效 API Key，内存缓存（5 分钟 TTL） |
| `src/admin-store.js` | JSON 文件持久化（`data/admin-store.json`）：客户 key、请求日志、月度用量；SHA-256 key hash |
| `src/admin-routes.js` | 管理台 API（`/admin`），Basic Auth 保护 |
| `src/customer-routes.js` | 客户自助查询 API（`/usage`），脱敏返回 |
| `src/errors.js` | `HttpError`（网关内部错误）、`UpstreamHttpError`（上游错误透传） |

### 上游模式

- **Netlify 动态 key 模式**：配置 `NETLIFY_URL`，网关请求 `/api/config` 获取 `gatewayKey` 并缓存。
- **静态 key 模式**：不配置 `NETLIFY_URL`，使用 `UPSTREAM_BASE_URL` + `UPSTREAM_API_KEY`。

### 测试

测试使用 Node.js 内置 `node:test` 模块，无外部测试框架。每个模块都有对应的 `test/*.test.js`。测试通过依赖注入（如 `fetchImpl`、`authResolver`）避免真实网络调用。
