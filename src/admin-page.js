export function renderAdminPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Image API 管理台</title>
  <style>
    :root {
      --bg: #f7f5f0;
      --panel: #ffffff;
      --panel-2: #f1f5f4;
      --text: #17201d;
      --muted: #65726d;
      --line: #dbe2df;
      --accent: #146c63;
      --danger: #b42318;
      --warning: #9a6700;
      --shadow: 0 18px 50px rgba(20, 34, 30, 0.08);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
      line-height: 1.65;
    }

    button, input, textarea, select { font: inherit; }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
    }

    aside {
      padding: 28px 22px;
      background: #17312d;
      color: #f4fbf8;
    }

    .brand {
      display: grid;
      gap: 3px;
      margin-bottom: 30px;
    }

    .brand strong { font-size: 18px; }
    .brand span {
      color: rgba(244, 251, 248, 0.68);
      font-size: 12px;
    }

    nav {
      display: grid;
      gap: 8px;
    }

    .nav-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid transparent;
      border-radius: 8px;
      color: rgba(244, 251, 248, 0.78);
      background: transparent;
      cursor: pointer;
      text-align: left;
    }

    .nav-button.active {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.16);
    }

    main {
      padding: 28px;
      display: grid;
      gap: 22px;
      align-content: start;
    }

    header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 18px;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      line-height: 1.2;
    }

    .subtitle, .muted {
      color: var(--muted);
      font-size: 13px;
    }

    .subtitle { margin: 6px 0 0; }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .button {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 13px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
      text-decoration: none;
    }

    .button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #ffffff;
    }

    .button.danger {
      border-color: rgba(180, 35, 24, 0.32);
      color: var(--danger);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .stat {
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .stat span {
      display: block;
      color: var(--muted);
      font-size: 13px;
    }

    .stat strong {
      display: block;
      margin-top: 8px;
      font-size: 24px;
      line-height: 1.2;
    }

    .grid {
      display: grid;
      grid-template-columns: 360px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--panel-2);
    }

    .panel-head h2 {
      margin: 0;
      font-size: 16px;
    }

    .panel-body { padding: 18px; }

    form {
      display: grid;
      gap: 14px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 13px;
    }

    input, textarea, select {
      width: 100%;
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--text);
      padding: 8px 10px;
      outline: none;
    }

    textarea {
      min-height: 78px;
      resize: vertical;
    }

    input:focus, textarea:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(20, 108, 99, 0.12);
    }

    .table-wrap { overflow-x: auto; }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1040px;
    }

    th, td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      color: var(--muted);
      font-weight: 600;
      background: #fbfcfb;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      background: #eef4f2;
      color: var(--accent);
      white-space: nowrap;
    }

    .badge.off { color: var(--danger); background: #fff1f0; }
    .badge.warn { color: var(--warning); background: #fff7e6; }

    .mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    .token-grid {
      display: grid;
      grid-template-columns: repeat(2, max-content);
      gap: 2px 12px;
      color: var(--muted);
      white-space: nowrap;
    }

    .token-grid strong {
      color: var(--text);
      font-weight: 600;
    }

    .error-detail {
      max-width: 420px;
      margin: 0;
      color: var(--danger);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    .new-key {
      display: none;
      gap: 10px;
      margin-top: 14px;
      padding: 12px;
      border: 1px solid rgba(31, 79, 122, 0.22);
      border-radius: 8px;
      background: #eef6ff;
    }

    .new-key.visible { display: grid; }
    .section { display: none; }
    .section.active { display: grid; gap: 16px; }

    .empty {
      padding: 24px;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 980px) {
      .shell { grid-template-columns: 1fr; }
      aside { position: sticky; top: 0; z-index: 2; padding: 16px; }
      nav { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .brand { margin-bottom: 12px; }
      .stats, .grid { grid-template-columns: 1fr; }
      header { align-items: start; flex-direction: column; }
      main { padding: 18px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand">
        <strong>Image API 管理台</strong>
        <span>客户密钥、日志与预算控制</span>
      </div>
      <nav>
        <button class="nav-button active" data-tab="overview">总览 <span>01</span></button>
        <button class="nav-button" data-tab="keys">客户密钥 <span>02</span></button>
        <button class="nav-button" data-tab="logs">请求日志 <span>03</span></button>
      </nav>
    </aside>
    <main>
      <header>
        <div>
          <h1 id="page-title">总览</h1>
          <p class="subtitle">管理员日志包含提示词和诊断信息；客户自助页只显示脱敏用量。</p>
        </div>
        <div class="toolbar">
          <button class="button" id="refresh-button" type="button">刷新</button>
          <a class="button" href="/usage" target="_blank" rel="noreferrer">客户查询页</a>
          <a class="button" href="/health" target="_blank" rel="noreferrer">健康检查</a>
        </div>
      </header>

      <section class="stats" id="stats"></section>

      <section class="section active" id="tab-overview">
        <div class="panel">
          <div class="panel-head"><h2>本月客户用量</h2></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>客户</th>
                  <th>Key 前缀</th>
                  <th>状态</th>
                  <th>本月请求</th>
                  <th>本月花费</th>
                  <th>预算</th>
                  <th>最后使用</th>
                </tr>
              </thead>
              <tbody id="overview-rows"></tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section" id="tab-keys">
        <div class="grid">
          <div class="panel">
            <div class="panel-head"><h2>创建客户 key</h2></div>
            <div class="panel-body">
              <form id="create-key-form">
                <label>客户名称
                  <input name="name" required placeholder="例如：Acme Studio" />
                </label>
                <label>每月预算 USD，0 表示不限额
                  <input name="monthlyBudgetUsd" type="number" min="0" step="0.01" value="0" />
                </label>
                <label>过期时间，可留空
                  <input name="expiresAt" type="datetime-local" />
                </label>
                <label>备注
                  <textarea name="notes" placeholder="套餐、联系人、结算说明"></textarea>
                </label>
                <button class="button primary" type="submit">生成 key</button>
              </form>
              <div class="new-key" id="new-key-box">
                <strong>新 key 只显示一次</strong>
                <input class="mono" id="new-key-value" readonly />
                <button class="button" id="copy-key-button" type="button">复制</button>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>客户 key</h2></div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>客户</th>
                    <th>前缀</th>
                    <th>状态</th>
                    <th>本月</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="key-rows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="tab-logs">
        <div class="panel">
          <div class="panel-head">
            <h2>最近请求</h2>
            <select id="log-limit">
              <option value="100">100 条</option>
              <option value="300">300 条</option>
              <option value="1000">1000 条</option>
            </select>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>客户</th>
                  <th>端点</th>
                  <th>模型</th>
                  <th>尺寸/质量</th>
                  <th>状态</th>
                  <th>错误信息</th>
                  <th>花费</th>
                  <th>Token 明细</th>
                  <th>耗时</th>
                  <th>提示词</th>
                </tr>
              </thead>
              <tbody id="log-rows"></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    const state = { summary: null, keys: [], logs: [], tab: "overview" };
    const money = (value) => value === null || value === undefined ? "-" : "$" + Number(value).toFixed(6).replace(/0+$/, "").replace(/\\.$/, "");
    const date = (value) => value ? new Date(value).toLocaleString() : "-";
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

    async function api(path, options = {}) {
      const response = await fetch(path, {
        credentials: "same-origin",
        headers: { "content-type": "application/json", ...(options.headers || {}) },
        ...options
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "请求失败");
      }
      return response.json();
    }

    function tokenDetails(usage) {
      if (!usage) return '<span class="muted">无 usage</span>';
      return '<div class="token-grid">' +
        '<span>文本输入</span><strong>' + (usage.inputTextTokens || 0) + '</strong>' +
        '<span>图片输入</span><strong>' + (usage.inputImageTokens || 0) + '</strong>' +
        '<span>缓存文本</span><strong>' + (usage.cachedTextTokens || 0) + '</strong>' +
        '<span>缓存图片</span><strong>' + (usage.cachedImageTokens || 0) + '</strong>' +
        '<span>图片输出</span><strong>' + (usage.outputImageTokens || 0) + '</strong>' +
        '<span>文本输出</span><strong>' + (usage.outputTextTokens || 0) + '</strong>' +
        '<span>总计</span><strong>' + (usage.totalTokens || 0) + '</strong>' +
      '</div>';
    }

    function errorDetails(log) {
      if (!log.errorDetail) return '<span class="muted">-</span>';
      return '<pre class="error-detail">' + escapeHtml(log.errorDetail) + '</pre>';
    }

    function renderStats() {
      const summary = state.summary || {};
      document.getElementById("stats").innerHTML = [
        ["本月花费", money(summary.monthSpendUsd || 0)],
        ["本月请求", summary.monthRequestCount || 0],
        ["成功请求", summary.monthSuccessCount || 0],
        ["启用 key", (summary.enabledKeyCount || 0) + " / " + (summary.keyCount || 0)]
      ].map(([label, value]) => '<div class="stat"><span>' + label + '</span><strong>' + value + '</strong></div>').join("");
    }

    function renderOverview() {
      const rows = state.keys.map((key) => {
        const budget = Number(key.monthlyBudgetUsd || 0);
        const spend = Number(key.monthSpendUsd || 0);
        const nearLimit = budget > 0 && spend >= budget * 0.8;
        return '<tr>' +
          '<td><strong>' + escapeHtml(key.name) + '</strong><br /><span class="subtitle">' + escapeHtml(key.notes || "") + '</span></td>' +
          '<td class="mono">' + escapeHtml(key.keyPrefix) + '</td>' +
          '<td><span class="badge ' + (key.enabled ? "" : "off") + '">' + (key.enabled ? "启用" : "停用") + '</span></td>' +
          '<td>' + key.monthRequestCount + '</td>' +
          '<td><span class="badge ' + (nearLimit ? "warn" : "") + '">' + money(spend) + '</span></td>' +
          '<td>' + (budget > 0 ? money(budget) : "不限额") + '</td>' +
          '<td>' + date(key.lastUsedAt) + '</td>' +
        '</tr>';
      }).join("");
      document.getElementById("overview-rows").innerHTML = rows || '<tr><td colspan="7" class="empty">还没有客户 key</td></tr>';
    }

    function renderKeys() {
      const rows = state.keys.map((key) => {
        return '<tr>' +
          '<td><strong>' + escapeHtml(key.name) + '</strong><br /><span class="subtitle">' + escapeHtml(key.notes || "") + '</span></td>' +
          '<td class="mono">' + escapeHtml(key.keyPrefix) + '</td>' +
          '<td><span class="badge ' + (key.enabled ? "" : "off") + '">' + (key.enabled ? "启用" : "停用") + '</span></td>' +
          '<td>' + money(key.monthSpendUsd || 0) + '<br /><span class="subtitle">' + key.monthRequestCount + ' 次请求</span></td>' +
          '<td><div class="toolbar">' +
            '<button class="button" data-action="toggle" data-id="' + key.id + '">' + (key.enabled ? "停用" : "启用") + '</button>' +
            '<button class="button danger" data-action="delete" data-id="' + key.id + '">删除</button>' +
          '</div></td>' +
        '</tr>';
      }).join("");
      document.getElementById("key-rows").innerHTML = rows || '<tr><td colspan="5" class="empty">先创建一个客户 key</td></tr>';
    }

    function renderLogs() {
      const rows = state.logs.map((log) => {
        const ok = log.statusCode >= 200 && log.statusCode < 300;
        return '<tr>' +
          '<td>' + date(log.createdAt) + '</td>' +
          '<td>' + escapeHtml(log.keyName || "-") + '</td>' +
          '<td class="mono">' + escapeHtml(log.endpoint || "") + '</td>' +
          '<td>' + escapeHtml(log.model || "-") + '</td>' +
          '<td>' + escapeHtml(log.size || "-") + '<br /><span class="subtitle">' + escapeHtml(log.quality || "-") + '</span></td>' +
          '<td><span class="badge ' + (ok ? "" : "off") + '">' + log.statusCode + '</span></td>' +
          '<td>' + errorDetails(log) + '</td>' +
          '<td>' + money(log.costUsd) + '<br /><span class="subtitle">' + escapeHtml(log.costMethod || "") + '</span></td>' +
          '<td>' + tokenDetails(log.usage) + '</td>' +
          '<td>' + (log.latencyMs || 0) + ' ms</td>' +
          '<td>' + escapeHtml(log.promptPreview || "") + '</td>' +
        '</tr>';
      }).join("");
      document.getElementById("log-rows").innerHTML = rows || '<tr><td colspan="11" class="empty">还没有请求日志</td></tr>';
    }

    function renderAll() {
      renderStats();
      renderOverview();
      renderKeys();
      renderLogs();
    }

    async function refresh() {
      const limit = document.getElementById("log-limit").value;
      const [summary, keys, logs] = await Promise.all([
        api("/admin/api/summary"),
        api("/admin/api/keys"),
        api("/admin/api/logs?limit=" + encodeURIComponent(limit))
      ]);
      state.summary = summary;
      state.keys = keys;
      state.logs = logs;
      renderAll();
    }

    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.tab = button.dataset.tab;
        document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("active", item === button));
        document.querySelectorAll(".section").forEach((section) => section.classList.toggle("active", section.id === "tab-" + state.tab));
        document.getElementById("page-title").textContent = button.firstChild.textContent.trim();
      });
    });

    document.getElementById("refresh-button").addEventListener("click", refresh);
    document.getElementById("log-limit").addEventListener("change", refresh);

    document.getElementById("create-key-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const expiresAt = form.get("expiresAt");
      const payload = {
        name: form.get("name"),
        monthlyBudgetUsd: Number(form.get("monthlyBudgetUsd") || 0),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes: form.get("notes")
      };
      const result = await api("/admin/api/keys", { method: "POST", body: JSON.stringify(payload) });
      document.getElementById("new-key-value").value = result.apiKey;
      document.getElementById("new-key-box").classList.add("visible");
      event.currentTarget.reset();
      await refresh();
    });

    document.getElementById("copy-key-button").addEventListener("click", async () => {
      const input = document.getElementById("new-key-value");
      await navigator.clipboard.writeText(input.value);
    });

    document.getElementById("key-rows").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const key = state.keys.find((item) => item.id === button.dataset.id);
      if (!key) return;
      if (button.dataset.action === "toggle") {
        await api("/admin/api/keys/" + key.id, { method: "PATCH", body: JSON.stringify({ enabled: !key.enabled }) });
      }
      if (button.dataset.action === "delete") {
        if (!confirm("确定删除这个 key？删除后客户将无法继续使用。")) return;
        await api("/admin/api/keys/" + key.id, { method: "DELETE" });
      }
      await refresh();
    });

    refresh().catch((error) => {
      document.body.innerHTML = '<div style="padding:24px;font-family:-apple-system, PingFang SC, sans-serif;"><h1>管理台加载失败</h1><pre>' + escapeHtml(error.message) + '</pre></div>';
    });
  </script>
</body>
</html>`;
}
