// Hides X and LinkedIn feeds during a deepwork session; profiles, posts, search and messages stay usable.
// Both sites are single-page apps, so the URL is re-checked on a timer and on history events.
function isFeed(host, path) {
  host = host.replace(/^www\./, "");
  path = path.replace(/\/+$/, "") || "/";
  if (host === "x.com" || host === "twitter.com") {
    return path === "/" || path === "/home" || path.startsWith("/explore") || path === "/i/foryou" || path === "/i/following";
  }
  if (host === "linkedin.com") {
    return path === "/" || path === "/feed" || (path.startsWith("/feed/") && !path.startsWith("/feed/update/"));
  }
  return false;
}
if (typeof module !== "undefined") module.exports = { isFeed };

if (typeof chrome !== "undefined" && chrome.storage) {
  const NOTE_ID = "deepwork-feed-note";
  let active = false;

  function render() {
    const hide = active && isFeed(location.hostname, location.pathname);
    let note = document.getElementById(NOTE_ID);
    if (!hide) { if (note) note.remove(); return; }
    if (note) return;
    chrome.runtime.sendMessage({ type: "deepwork-hit", domain: location.hostname, kind: "feed" }).catch(() => {});
    note = document.createElement("div");
    note.id = NOTE_ID;
    note.textContent = "Deep work: open a specific account or post";
    note.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
      "justify-content:center;background:#111;color:#eee;font:600 22px -apple-system,system-ui,sans-serif;" +
      "pointer-events:auto;";
    // Leave the nav (X left rail, LinkedIn top bar with search and messages) uncovered.
    if (/x\.com|twitter\.com/.test(location.hostname)) note.style.left = "280px";
    if (/linkedin\.com/.test(location.hostname)) note.style.top = "56px";
    (document.body || document.documentElement).appendChild(note);
  }

  chrome.storage.local.get("deepwork", (v) => { active = !!(v.deepwork && v.deepwork.active); render(); });
  chrome.storage.onChanged.addListener((c) => {
    if (c.deepwork) { active = !!(c.deepwork.newValue && c.deepwork.newValue.active); render(); }
  });
  chrome.runtime.sendMessage({ type: "deepwork-refresh" }).catch(() => {});
  let last = location.href;
  setInterval(() => { if (location.href !== last) { last = location.href; render(); } }, 400);
  window.addEventListener("popstate", render);
  document.addEventListener("DOMContentLoaded", render);
}
