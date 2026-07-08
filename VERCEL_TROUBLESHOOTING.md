# Vercel 故障处理

## DEP0169: url.parse()

Vercel 现在默认使用 Node.js 24。项目依赖 Express 4，Express 4 的依赖链里仍有 `parseurl`，它会触发 Node.js 24 的 `DEP0169` 弃用警告。

这个 warning 本身不会导致函数崩溃，但会污染 Runtime Logs，并且容易掩盖真正的 500 错误。项目已在 `package.json` 中固定：

```json
{
  "engines": {
    "node": "22.x"
  }
}
```

修改后需要重新部署，Vercel 才会使用 Node.js 22。

## 页面无法访问

先访问健康检查：

```text
https://你的域名/health
```

如果 `/health` 正常，但 `/admin` 或 `/usage` 报错，重点检查：

- `ADMIN_PASSWORD` 或 `ADMIN_TOKEN` 是否已配置。
- `ADMIN_STORE_PROVIDER=postgres` 时，`DATABASE_URL` 或 `POSTGRES_URL` 是否有效。
- `ADMIN_STORE_PROVIDER=auto` 时，只要检测到数据库连接串就会启用 Postgres。
- 数据库与函数区域距离过远时，首次自动建表可能较慢。

现在 `api/index.js` 会捕获函数初始化错误并返回 JSON，Vercel Runtime Logs 里也会打印 `Vercel 函数处理失败`，方便定位真正的异常。

## Invalid export found in module "/var/task/src/server.js"

Vercel 可能会根据 `package.json` 的 `main` 字段探测 `src/server.js`。如果该文件没有默认导出，运行时会报：

```text
Invalid export found in module "/var/task/src/server.js".
The default export must be a function or server.
```

项目已在 `src/server.js` 中增加默认导出：

```js
export default createApp();
```

这样即使 Vercel 直接加载 `src/server.js`，也能拿到一个 Express app；本地 `npm start` 仍然会走 `startServer()` 并监听端口。
