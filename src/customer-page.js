export function renderCustomerUsagePage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>用量查询</title>
  <style>
    :root {
      --bg: #f6f7f5;
      --panel: #ffffff;
      --panel-soft: #eef3f1;
      --text: #18211f;
      --muted: #68746f;
      --line: #dce3df;
      --accent: #155f56;
      --blue: #285c82;
      --danger: #b42318;
      --shadow: 0 16px 42px rgba(21, 38, 34, 0.08);
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

    button, input, select { font: inherit; }

    .wrap {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 42px;
      display: grid;
      gap: 18px;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      line-height: 1.25;
    }

    .sub {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .auth {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto auto;
      gap: 10px;
      align-items: center;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    input, select {
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 10px;
      background: #fff;
      color: var(--text);
      outline: none;
    }

    input:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(21, 95, 86, 0.12);
    }

    .button {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--text);
      cursor: pointer;
    }

    .button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }

    .button.danger {
      color: var(--danger);
      border-color: rgba(180, 35, 24, 0.24);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .stat span {
      color: var(--muted);
      font-size: 13px;
    }

    .stat strong {
      display: block;
      margin-top: 8px;
      font-size: 23px;
      line-height: 1.2;
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
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: var(--panel-soft);
    }

    .panel-head h2 {
      margin: 0;
      font-size: 16px;
    }

    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      min-width: 1060px;
      border-collapse: collapse;
    }

    th, td {
      padding: 11px 12px;
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
      color: var(--accent);
      background: #edf5f2;
      white-space: nowrap;
    }

    .badge.off {
      color: var(--danger);
      background: #fff1f0;
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

    .muted { color: var(--muted); }
    .mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    .empty {
      padding: 26px;
      text-align: center;
      color: var(--muted);
    }

    .error {
      display: none;
      padding: 12px 14px;
      border: 1px solid rgba(180, 35, 24, 0.24);
      border-radius: 8px;
      color: var(--danger);
      background: #fff8f7;
    }

    .error.visible { display: block; }

    .error-detail {
      max-width: 360px;
      margin: 0;
      color: var(--danger);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    @media (max-width: 760px) {
      .auth { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr; }
      header { align-items: start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>用量查询</h1>
      </div>
    </header>

    <section class="auth">
      <input id="api-key" class="mono" type="password" placeholder="粘贴你的 API key" autocomplete="off" />
      <button id="load-button" class="button primary" type="button">查询</button>
      <button id="clear-button" class="button danger" type="button">清除</button>
    </section>

    <div id="error-box" class="error"></div>
    <section class="stats" id="stats"></section>

    <section class="panel">
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
              <th>端点</th>
              <th>模型</th>
              <th>尺寸/质量</th>
              <th>状态</th>
              <th>错误信息</th>
              <th>花费</th>
              <th>Token 明细</th>
              <th>耗时</th>
            </tr>
          </thead>
          <tbody id="log-rows"></tbody>
        </table>
      </div>
    </section>
  </div>

  <script>
    const state = { summary: null, logs: [] };
    const keyInput = document.getElementById("api-key");
    const errorBox = document.getElementById("error-box");

    const money = (value) => value === null || value === undefined ? "-" : "$" + Number(value).toFixed(6).replace(/0+$/, "").replace(/\\.$/, "");
    const date = (value) => value ? new Date(value).toLocaleString() : "-";
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

    function authHeaders() {
      const apiKey = keyInput.value.trim();
      if (!apiKey) throw new Error("请先输入 API key");
      return { authorization: "Bearer " + apiKey };
    }

    async function api(path) {
      const response = await fetch(path, { headers: authHeaders() });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "查询失败");
      }
      return response.json();
    }

    function showError(message) {
      errorBox.textContent = message;
      errorBox.classList.toggle("visible", Boolean(message));
    }

    function tokenDetails(usage) {
      if (!usage) return '<span class="muted">无 usage</span>';
      return '<div class="token-grid">' +
        '<span>文本输入</span><strong>' + (usage.inputTextTokens || 0) + '</strong>' +
        '<span>图片输入</span><strong>' + (usage.inputImageTokens || 0) + '</strong>' +
        '<span>缓存输入</span><strong>' + (usage.cachedInputTokens || 0) + '</strong>' +
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
      const key = summary.key || {};
      const budget = key.monthlyBudgetUsd > 0 ? money(key.monthlyBudgetUsd) : "不限额";
      const remaining = summary.monthBudgetRemainingUsd === null ? "不限额" : money(summary.monthBudgetRemainingUsd);
      document.getElementById("stats").innerHTML = [
        ["客户", escapeHtml(key.name || "-")],
        ["本月花费", money(summary.monthSpendUsd || 0)],
        ["本月请求", summary.monthRequestCount || 0],
        ["预算剩余", remaining + '<span class="muted"> / ' + budget + '</span>']
      ].map(([label, value]) => '<div class="stat"><span>' + label + '</span><strong>' + value + '</strong></div>').join("");
    }

    function renderLogs() {
      const rows = state.logs.map((log) => {
        const ok = log.statusCode >= 200 && log.statusCode < 300;
        return '<tr>' +
          '<td>' + date(log.createdAt) + '</td>' +
          '<td class="mono">' + escapeHtml(log.endpoint || "") + '</td>' +
          '<td>' + escapeHtml(log.model || "-") + '</td>' +
          '<td>' + escapeHtml(log.size || "-") + '<br /><span class="muted">' + escapeHtml(log.quality || "-") + '</span></td>' +
          '<td><span class="badge ' + (ok ? "" : "off") + '">' + log.statusCode + '</span></td>' +
          '<td>' + errorDetails(log) + '</td>' +
          '<td>' + money(log.costUsd) + '<br /><span class="muted">' + escapeHtml(log.costMethod || "") + '</span></td>' +
          '<td>' + tokenDetails(log.usage) + '</td>' +
          '<td>' + (log.latencyMs || 0) + ' ms</td>' +
        '</tr>';
      }).join("");
      document.getElementById("log-rows").innerHTML = rows || '<tr><td colspan="9" class="empty">暂无请求日志</td></tr>';
    }

    async function loadUsage() {
      showError("");
      const limit = document.getElementById("log-limit").value;
      const [summary, logs] = await Promise.all([
        api("/usage/api/summary"),
        api("/usage/api/logs?limit=" + encodeURIComponent(limit))
      ]);
      state.summary = summary;
      state.logs = logs;
      renderStats();
      renderLogs();
    }

    document.getElementById("load-button").addEventListener("click", () => loadUsage().catch((error) => showError(error.message)));
    document.getElementById("log-limit").addEventListener("change", () => loadUsage().catch((error) => showError(error.message)));
    document.getElementById("clear-button").addEventListener("click", () => {
      keyInput.value = "";
      state.summary = null;
      state.logs = [];
      showError("");
      document.getElementById("stats").innerHTML = "";
      renderLogs();
    });

    renderLogs();
  </script>
</body>
</html>`;
}
