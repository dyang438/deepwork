// Covers tabs that were already open on a blocked site when a session starts (new loads are redirected by rules.json).
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
    "z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#111;color:#eee;" +
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

if (typeof chrome !== "undefined" && chrome.storage && !/(^|\.)aws\.amazon\.com$/.test(location.hostname)) {
  const top = window === window.top;
  const guard = makeMediaGuard(document, window.MutationObserver);
  const cover = makeCover(document, window.MutationObserver,
    "Deep work session running. Inbox, calendar, shopping and YouTube wait until it ends.");
  let active = false;
  const hit = () => chrome.runtime.sendMessage({ type: "deepwork-hit", domain: location.hostname, kind: "cover" }).catch(() => {});
  // Switching back to an already-covered tab counts as another attempt, and re-raises the cover.
  document.addEventListener("visibilitychange", () => {
    if (top && active && document.visibilityState === "visible" && cover.el) { hit(); cover.raise(); }
  });
  function render() {
    if (active) guard.enable(); else guard.disable();
    if (!top) return;  // subframes only pause media; the cover lives in the top frame
    if (!active) return cover.hide();
    if (cover.show()) hit();
    else cover.raise();
  }
  chrome.storage.local.get("deepwork", (v) => { active = !!(v.deepwork && v.deepwork.active); render(); });
  chrome.storage.onChanged.addListener((ch) => {
    if (ch.deepwork) { active = !!(ch.deepwork.newValue && ch.deepwork.newValue.active); render(); }
  });
  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("load", render);
  if (top) chrome.runtime.sendMessage({ type: "deepwork-refresh" }).catch(() => {});
}
