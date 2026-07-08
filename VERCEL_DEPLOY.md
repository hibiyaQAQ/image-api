# Vercel 部署说明

本项目已经加入 Vercel 适配：

- `api/index.js`：Vercel Function 入口，复用现有 Express 应用。
- `vercel.json`：把 `/health`、`/v1/*`、`/admin`、`/usage` 等根路径请求重写到函数。
- `.vercelignore`：排除本地数据、日志、测试和 `.env`。

## 环境变量

推荐在 Vercel 项目中配置：

```env
NETLIFY_URL=https://你的上游站点.netlify.app
PUBLIC_BASE_URL=https://你的-vercel-域名.vercel.app
GATEWAY_API_KEY=给客户端使用的网关密钥
ADMIN_USERNAME=admin
ADMIN_PASSWORD=管理台密码
ADMIN_STORE_PROVIDER=auto
STORAGE_PROVIDER=auto
```

如果使用静态上游密钥，也可以改用：

```env
UPSTREAM_BASE_URL=https://你的上游兼容接口/v1
UPSTREAM_API_KEY=你的上游密钥
```

## 图片存储

如果需要处理 `data:`/base64 图片输入、multipart 上传，或需要 `response_format=url` 返回稳定图片 URL，请在 Vercel 控制台绑定 Vercel Blob。

绑定 Blob 后 Vercel 会提供 `BLOB_READ_WRITE_TOKEN`，`STORAGE_PROVIDER=auto` 会自动启用 Blob 存储。也可以显式设置：

```env
STORAGE_PROVIDER=vercel-blob
BLOB_PREFIX=image-api
BLOB_CACHE_CONTROL_MAX_AGE_SECONDS=3600
```

未配置 Blob 时，Vercel 环境会退回 `/tmp/image-api/uploads`。这只适合临时测试，不适合作为稳定图床，因为 Serverless 实例文件系统不会持久保存，也不能保证后续请求命中同一实例。

## 管理台持久化限制

管理台支持两种存储：

- `ADMIN_STORE_PROVIDER=postgres`：使用 Vercel Marketplace 数据库持久化客户 key、预算和请求日志。
- `ADMIN_STORE_PROVIDER=local`：使用本地 JSON 文件，Vercel 上会写入 `/tmp/image-api/admin-store.json`，不适合生产持久化。
- `ADMIN_STORE_PROVIDER=auto`：检测到 `DATABASE_URL` 或 `POSTGRES_URL` 时自动使用 Postgres，否则退回本地 JSON 文件。

推荐在 Vercel 项目里通过 Marketplace 绑定 Neon Postgres 或其他 Postgres 数据库。Vercel 会自动注入连接串，项目会在首次请求时自动创建下面两张表：

- `image_api_keys`
- `image_api_request_logs`

常用数据库环境变量：

```env
ADMIN_STORE_PROVIDER=auto
DATABASE_URL=postgres://...
POSTGRES_URL=postgres://...
DATABASE_MAX_CONNECTIONS=1
DATABASE_CONNECT_TIMEOUT_SECONDS=10
DATABASE_IDLE_TIMEOUT_SECONDS=20
```

在 Vercel Serverless 环境中建议保持 `DATABASE_MAX_CONNECTIONS=1`，避免函数实例过多时耗尽数据库连接。绑定数据库后，管理台创建的客户 key、预算和日志会跨实例、跨重新部署保留。

## 部署命令

```bash
npm install
npx vercel
npx vercel --prod
```

部署后可以先访问：

```text
https://你的-vercel-域名.vercel.app/health
```
