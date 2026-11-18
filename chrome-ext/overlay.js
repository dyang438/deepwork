// Covers blocked sites while a session runs, in tabs already open and in new loads.
// Runs on YouTube and streaming sites. The top frame asks deepwork whether the video is informative
// (deepwork's work_pass model); a tutorial, talk or explainer is uncovered. Every cover has an override. Each new URL (YouTube and Gmail change it without reloading) is judged again.
// The tab is never closed or reloaded; the cover disappears when the session ends.
// While covered, every audio and video element is paused and kept paused, in every frame this script runs in.
// Nothing is resumed when the session ends; that is left to the user.

function makeMediaGuard(doc, Observer) {
  let on = false;
  let mo = null;
  const pauseOne = (m) => { try { if (m && typeof m.pause === "function" && !m.paused) m.pause(); } catch (e) {} };
  const pauseAll = () => doc.querySelectorAll("video, audio").forEach(pauseOne);
  const onPlay = (e) => { if (on) pauseOne(e.target); };
  // "play" and "playing" do not bubble, so listen in the capture phase.
  doc.addEventListener("play", onPlay, true);
  doc.addEventListener("playing", onPlay, true);
  return {
    enable() {
      if (on) return;
      on = true;
      pauseAll();
      if (Observer) {
        mo = new Observer(() => { if (on) pauseAll(); });
        mo.observe(doc.documentElement, { childList: true, subtree: true });
      }
    },
    disable() { on = false; if (mo) { mo.disconnect(); mo = null; } },
    get on() { return on; },
  };
}
// The cover is a modal <dialog> in the top layer (above any z-index), attached to documentElement,
// with max z-index as a fallback. If another element shows up later (for example another extension's
// full-screen chooser), the cover is re-appended and re-shown so it is the newest, topmost layer.
function makeCover(doc, Observer, text) {
  const ID = "deepwork-block-cover";
  let el = null;
  let mo = null;
  const STYLE = "position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;" +
    "z-index:2147483647;outline:none;display:flex;align-items:center;justify-content:center;background:#111;color:#eee;" +
    "font:600 22px -apple-system,system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box;";
  function raise() {
    if (!el) return;
    const root = doc.documentElement;
    if (root.lastElementChild !== el) root.appendChild(el);  // moving it re-orders it to the end
    if (typeof el.showModal === "function") {
      try { if (el.open) el.close(); el.showModal(); } catch (e) { /* not ready yet; z-index still applies */ }
    }
  }
  function onMutations(records) {
    if (!el) return;
    const foreign = records.some((r) => Array.from(r.addedNodes || []).some((n) => n !== el && n.nodeType === 1));
    if (foreign) raise();
  }
  return {
    show() {
      if (el) return false;
      el = doc.createElement("dialog");
      el.id = ID;
      el.textContent = text;
      el.setAttribute("style", STYLE);
      el.addEventListener("cancel", (e) => e.preventDefault());  // Escape does not dismiss it
      raise();
      if (Observer) {
        mo = new Observer(onMutations);
        mo.observe(doc.documentElement, { childList: true });
        if (doc.body) mo.observe(doc.body, { childList: true });
      }
      return true;
    },
    hide() {
      if (mo) { mo.disconnect(); mo = null; }
      if (el) { try { if (el.open) el.close(); } catch (e) {} el.remove(); el = null; }
    },
    raise,
    get el() { return el; },
  };
}
if (typeof module !== "undefined") module.exports = { makeMediaGuard, makeCover };

if (typeof chrome !== "undefined" && chrome.storage) {
  const top = window === window.top;
  const BLOCKED = "Deep work session running. This looks like entertainment; it waits until the session ends.";
  const guard = makeMediaGuard(document, window.MutationObserver);
  const CHECKING = "Deep work session running. Checking whether this video is informative…";
  const cover = makeCover(document, window.MutationObserver, CHECKING);
  let active = false;
  let passed = false;   // the latest verdict for this tab let the page through
  let verdict = null;   // top frame: { url, allow } once the current URL is judged
  let judging = null;   // top frame: URL being judged
  let lastTitle = null; // top frame: title sent with the previous verdict
  const hit = () => chrome.runtime.sendMessage({ type: "deepwork-hit", domain: location.hostname, kind: "cover" }).catch(() => {});
  // Switching back to a covered tab counts as another attempt, and re-raises the cover.
  document.addEventListener("visibilitychange", () => {
    if (top && active && document.visibilityState === "visible" && cover.el && verdict) { hit(); cover.raise(); }
  });
  function judge(url) {
    judging = url;
    const t0 = Date.now();
    // Wait for a title; after a same-page navigation it still shows the previous page for a moment.
    const ready = () => Date.now() - t0 > 3000 ||
      (document.readyState !== "loading" && document.title && document.title !== lastTitle);
    const go = () => {
      if (location.href !== url || !active) { judging = null; return render(); }
      if (!ready()) return setTimeout(go, 200);
      const d = document.querySelector('meta[name="description"], meta[property="og:description"]');
      const page = { url, title: document.title, description: d ? d.content : "" };
      lastTitle = page.title;
      chrome.runtime.sendMessage({ type: "deepwork-judge", page }).then((r) => {
        judging = null;
        if (location.href !== url) return render();
        verdict = { url, allow: !!(r && r.allow) };
        if (!verdict.allow && active) hit();
        render();
      }).catch(() => { judging = null; verdict = { url, allow: false }; render(); });
    };
    go();
  }
  // The blocked cover says why and offers an override; the override is logged and lasts the session.
  function blockedCover(el) {
    if (el.dataset.blocked) return;
    el.dataset.blocked = "1";
    el.textContent = "";
    const msg = document.createElement("div");
    msg.textContent = BLOCKED;
    const btn = document.createElement("button");
    btn.textContent = "Let this page through";
    btn.setAttribute("style", "display:block;margin:24px auto 0;padding:8px 16px;border:1px solid #666;border-radius:6px;" +
      "background:transparent;color:#bbb;font:500 14px -apple-system,system-ui,sans-serif;cursor:pointer;");
    btn.addEventListener("click", () => {
      const url = location.href;
      chrome.runtime.sendMessage({ type: "deepwork-override", url }).catch(() => {});
      verdict = { url, allow: true };
      render();
    });
    const box = document.createElement("div");
    box.append(msg, btn);
    el.append(box);
  }
  function render() {
    const judged = !!verdict && verdict.url === location.href;
    if (top) passed = active && judged && verdict.allow;
    if (active && !passed) guard.enable(); else guard.disable();
    if (!top) return;  // subframes only pause media; the cover and the verdict live in the top frame
    if (!active) { verdict = null; return cover.hide(); }
    if (passed) return cover.hide();
    if (!cover.show()) cover.raise();
    if (judged) blockedCover(cover.el);
    else if (cover.el.dataset.blocked || !cover.el.textContent) { delete cover.el.dataset.blocked; cover.el.textContent = CHECKING; }
    if (!judged && judging !== location.href) judge(location.href);
  }
  chrome.storage.local.get("deepwork", (v) => { active = !!(v.deepwork && v.deepwork.active); render(); });
  chrome.storage.onChanged.addListener((ch) => {
    if (ch.deepwork) { active = !!(ch.deepwork.newValue && ch.deepwork.newValue.active); render(); }
  });
  // The background relays each verdict to every frame of the tab, so subframes stop pausing media too.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "deepwork-verdict" && !top) { passed = !!msg.allow; render(); }
  });
  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("load", render);
  if (top) {
    let href = location.href;
    setInterval(() => { if (location.href !== href) { href = location.href; render(); } }, 500);
    chrome.runtime.sendMessage({ type: "deepwork-refresh" }).catch(() => {});
  }
}
