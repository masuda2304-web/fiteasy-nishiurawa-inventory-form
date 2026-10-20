/* フィットイージー西浦和店 備品在庫管理システム 共通処理(フロントエンド) */

// ---- GitHub接続設定(localStorageに保存) ----
function getConfig() {
  const owner = localStorage.getItem("gh_owner");
  const repo = localStorage.getItem("gh_repo");
  const token = localStorage.getItem("gh_token");
  if (!owner || !repo || !token) return null;
  return { owner, repo, token };
}

function saveConfig(owner, repo, token) {
  localStorage.setItem("gh_owner", owner);
  localStorage.setItem("gh_repo", repo);
  localStorage.setItem("gh_token", token);
}

function requireConfigOrRedirect() {
  const cfg = getConfig();
  if (!cfg) {
    location.href = "settings.html";
    return null;
  }
  return cfg;
}

// ---- base64 (UTF-8対応) ----
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---- GitHub Contents API ----
async function ghGetJson(cfg, path) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`接続に失敗しました: ${res.status}`);
  }
  const json = await res.json();
  const text = base64ToUtf8(json.content);
  return { data: JSON.parse(text), sha: json.sha };
}

async function ghGetJsonOrNull(cfg, path) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) {
    throw new Error(`接続に失敗しました: ${res.status}`);
  }
  const json = await res.json();
  const text = base64ToUtf8(json.content);
  return { data: JSON.parse(text), sha: json.sha };
}

// 既存ファイルの更新(sha指定あり)・新規作成(sha未指定)の両方に使う
async function ghPutJson(cfg, path, obj, message, sha) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const body = {
    message: message || `update ${path}`,
    content: utf8ToBase64(JSON.stringify(obj, null, 2)),
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 409 || res.status === 422) {
    throw new Error(
      "保存に失敗しました(他の人が同時に更新した可能性があります)。画面を再読み込みしてからもう一度お試しください。"
    );
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`送信に失敗しました: ${res.status} ${errText}`);
  }
  return await res.json();
}

async function ghListDir(cfg, path) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`一覧取得に失敗しました: ${res.status}`);
  }
  return await res.json();
}

async function ghCreateJson(cfg, path, obj, message) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const body = {
    message: message || `add ${path}`,
    content: utf8ToBase64(JSON.stringify(obj, null, 2)),
  };
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`送信に失敗しました: ${res.status} ${errText}`);
  }
  return await res.json();
}

// ---- JST日時ヘルパー ----
function nowJstDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
}

function todayDateStr() {
  const d = nowJstDate();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeStr() {
  const d = nowJstDate();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowMinutesOfDay() {
  const d = nowJstDate();
  return d.getHours() * 60 + d.getMinutes();
}

function randSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

// ---- ステータスバー(各ページ共通のライブ時計 + オンライン表示) ----
function mountStatusBar() {
  const header = document.querySelector("header");
  if (!header) return;
  const bar = document.createElement("div");
  bar.className = "statusbar";
  bar.innerHTML =
    '<span class="status-left"><span class="status-dot"></span>SYSTEM ONLINE</span>' +
    '<span class="status-clock" id="statusbar-clock">--:--:--</span>';
  header.insertBefore(bar, header.firstChild);

  function tick() {
    const d = nowJstDate();
    const pad = (n) => String(n).padStart(2, "0");
    const el = document.getElementById("statusbar-clock");
    if (el) {
      el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }
  tick();
  setInterval(tick, 1000);
}
