// deepwork extension service worker.
// Session state comes from the deepwork watchdog at http://127.0.0.1:47615/state.
// If the endpoint is unreachable there is no session: everything is allowed (fail open).
// While sampling, it reports the active tab's DOMAIN only (no path, query or title) and counts block hits.
const BASE = "http://127.0.0.1:47615";
const RULESET = "deepwork_block";

async function getState() {
  const v = await chrome.storage.local.get("deepwork");
  return v.deepwork || { active: false, sampling: false };
}

async function refresh() {
  const prev = await getState();
  let state = { active: false, sampling: false, goal: null, end_ts: null };
  try {
    const r = await fetch(BASE + "/state", { cache: "no-store" });
    if (r.ok) state = await r.json();
  } catch (e) { /* no session running */ }
  if (state.end_ts && Date.now() / 1000 >= state.end_ts) { state.active = false; state.sampling = false; }
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    state.active ? { enableRulesetIds: [RULESET] } : { disableRulesetIds: [RULESET] }
  );
  await chrome.storage.local.set({ deepwork: state });
  if (state.sampling && !prev.sampling) reportActiveTab();
  return state;
}

function domainOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname : u.protocol.replace(":", "");
  } catch (e) { return null; }
}

async function post(path, body) {
  const st = await getState();
  if (!st.sampling) return;
  try {
    await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Deepwork": "1" },
      body: JSON.stringify(body) });
  } catch (e) { /* session ended */ }
}

async function reportActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.url) post("/tab", { domain: domainOf(tab.url) });
}

function ensureAlarm() { chrome.alarms.create("deepwork-poll", { periodInMinutes: 0.5 }); }
chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); refresh(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); refresh(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "deepwork-poll") refresh(); });

chrome.tabs.onActivated.addListener(reportActiveTab);
chrome.windows.onFocusChanged.addListener((w) => { if (w !== chrome.windows.WINDOW_ID_NONE) reportActiveTab(); });
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (info.url && tab.active) post("/tab", { domain: domainOf(info.url) });
});

// Network-level blocks (new page loads). Available to unpacked extensions with declarativeNetRequestFeedback.
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((m) => {
    post("/hit", { domain: domainOf(m.request.url), kind: "block" });
  });
}

// Content scripts ask for a fresh check on page load, and report feed-hide and cover hits.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg) return;
  if (msg.type === "deepwork-refresh") { refresh().then(reply); return true; }
  if (msg.type === "deepwork-hit") post("/hit", { domain: msg.domain, kind: msg.kind });
});
