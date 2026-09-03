/* フィットイージー西浦和店 備品在庫管理システム 共通JS */

const CFG_KEYS = { owner: "gh_owner", repo: "gh_repo", token: "gh_token" };
const BRANCH = "main";

function getConfig() {
  const owner = localStorage.getItem(CFG_KEYS.owner);
  const repo = localStorage.getItem(CFG_KEYS.repo);
  const token = localStorage.getItem(CFG_KEYS.token);
  if (!owner || !repo || !token) return null;
  return { owner, repo, token };
}

function saveConfig(owner, repo, token) {
  localStorage.setItem(CFG_KEYS.owner, owner.trim());
  localStorage.setItem(CFG_KEYS.repo, repo.trim());
  localStorage.setItem(CFG_KEYS.token, token.trim());
}

function requireConfigOrRedirect() {
  const cfg = getConfig();
  if (!cfg) {
    alert("初期設定(GitHubアクセストークン)がまだ登録されていません。設定画面に移動します。");
    location.href = "settings.html";
    return null;
  }
  return cfg;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function ghRequest(cfg, path, options = {}) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const headers = Object.assign(
    {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    options.headers || {}
  );
  const resp = await fetch(url + (options.query || ""), {
    method: options.method || "GET",
    headers,
    body: options.body,
  });
  return resp;
}

async function ghGetJson(cfg, path) {
  const resp = await ghRequest(cfg, `${path}?ref=${BRANCH}`);
  if (resp.status === 404) {
    return { data: null, sha: null };
  }
  if (!resp.ok) {
    throw new Error(`GitHubからの取得に失敗しました (${resp.status}) : ${path}`);
  }
  const body = await resp.json();
  const text = base64ToUtf8(body.content);
  return { data: JSON.parse(text), sha: body.sha };
}

async function ghCreateJson(cfg, path, obj, message) {
  const content = utf8ToBase64(JSON.stringify(obj, null, 2));
  const resp = await ghRequest(cfg, path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content,
      branch: BRANCH,
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`GitHubへの保存に失敗しました (${resp.status}) : ${errBody}`);
  }
  return resp.json();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function nowJst() {
  // ブラウザのタイムゾーンに関わらず、日本時間の年月日時分秒を得る
  const s = new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  return new Date(s);
}

function todayDateStr() {
  const d = nowJst();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowTimeStr() {
  const d = nowJst();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function nowIsoJst() {
  const d = nowJst();
  const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}+09:00`;
  return iso;
}

function randSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

function showStatus(el, message, isError) {
  el.textContent = message;
  el.className = isError ? "status status-error" : "status status-ok";
  el.hidden = false;
}
