// Cover: top-layer modal dialog on documentElement, re-raised above later full-screen elements.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const { makeCover } = require("../chrome-ext/overlay.js");

function node(tag) {
  return {
    nodeType: 1, tag, parent: null, open: false, shown: 0, attrs: {}, listeners: {}, dataset: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(t, f) { this.listeners[t] = f; },
    showModal() { if (!this.parent) throw new Error("not connected"); this.open = true; this.shown++; },
    close() { this.open = false; },
    remove() { if (this.parent) this.parent.removeChild(this); },
  };
}
const root = {
  kids: [],
  get lastElementChild() { return this.kids[this.kids.length - 1] || null; },
  appendChild(n) { this.removeChild(n); n.parent = this; this.kids.push(n); },
  removeChild(n) { const i = this.kids.indexOf(n); if (i >= 0) this.kids.splice(i, 1); n.parent = null; },
};
root.kids.push(node("body"));
let cb = null;
const doc = { documentElement: root, body: null, createElement: node };
class Obs { constructor(f) { cb = f; } observe(target, opts) { assert.strictEqual(target, root); assert.ok(opts.childList); } disconnect() { cb = null; } }

const c = makeCover(doc, Obs, "Deep work");
assert.strictEqual(c.show(), true);
const el = c.el;
assert.strictEqual(el.tag, "dialog");
assert.strictEqual(root.lastElementChild, el, "cover attached to documentElement");
assert.ok(el.open && el.shown === 1, "shown as modal (top layer)");
assert.match(el.attrs.style, /z-index:2147483647/);
let prevented = false;
el.listeners.cancel({ preventDefault() { prevented = true; } });
assert.ok(prevented, "Escape cannot dismiss it");

// Another extension appends a full-screen chooser after us.
const chooser = node("div");
root.appendChild(chooser);
cb([{ addedNodes: [chooser] }]);
assert.strictEqual(root.lastElementChild, el, "cover re-appended after the foreign element");
assert.strictEqual(el.shown, 2, "re-shown so it is the newest top-layer entry");

// Our own re-append does not loop.
cb([{ addedNodes: [el] }]);
assert.strictEqual(el.shown, 2);

c.hide();
assert.ok(!root.kids.includes(el) && cb === null, "removed and observer stopped when the session ends");

// Run the content script itself in an already-open tab, with Chrome's storage and the clock under test control.
let clock = 1000;
let onState;
let refreshes = 0;
let paused = 0;
const events = {};
const timers = new Map();
const intervals = new Map();
const video = { paused: false, pause() { paused++; } };
let timerId = 0;
const window = { addEventListener() {} };
window.top = window;
Object.assign(doc, {
  visibilityState: "visible",
  addEventListener(type, listener) { events[type] = listener; },
  querySelector() { return null; },
  querySelectorAll() { return [video]; },
});
vm.runInNewContext(fs.readFileSync(require.resolve("../chrome-ext/overlay.js"), "utf8"), {
  window,
  document: doc,
  location: { href: "https://x.com/home", origin: "https://x.com", hostname: "x.com" },
  Date: { now: () => clock },
  setTimeout(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId; },
  clearTimeout(id) { timers.delete(id); },
  setInterval(fn, ms) { intervals.set(++timerId, { fn, ms }); return timerId; },
  clearInterval(id) { intervals.delete(id); },
  chrome: {
    storage: {
      local: { get(_key, receive) { receive({ deepwork: { active: true, end_ts: 8 } }); } },
      onChanged: { addListener(listener) { onState = listener; } },
    },
    runtime: {
      sendMessage(message) {
        if (message.type === "deepwork-refresh") refreshes++;
        // Keep the page verdict outstanding across session changes.
        return new Promise(() => {});
      },
      onMessage: { addListener() {} },
    },
  },
});
const covered = () => root.lastElementChild.id === "deepwork-block-cover";
const storageUpdate = (newValue) => onState({ deepwork: { newValue } });
assert.ok(covered());
assert.equal(paused, 1);
assert.equal(refreshes, 1);
const activePoll = [...intervals.values()].find(({ ms }) => ms === 2000);
assert.ok(activePoll, "visible active tabs ask for fresh state between alarms");
activePoll.fn();
assert.equal(refreshes, 2);
storageUpdate({ active: false });
assert.ok(!covered(), "early stop removes the cover in the open tab");
assert.equal(intervals.size, 1, "only the URL watcher remains after an early stop");

storageUpdate({ active: true, end_ts: 9 });
assert.ok(covered());
const [deadline] = timers.values();
assert.equal(deadline.ms, 8000);
clock = 9000;
deadline.fn();
assert.ok(!covered(), "scheduled end removes the cover without a storage update");
const pausesAtEnd = paused;
events.play({ target: video });
assert.equal(paused, pausesAtEnd, "the media guard ends with the cover");
storageUpdate({ active: true, end_ts: 9 });
assert.ok(!covered(), "an already-expired snapshot cannot cover the page again");
console.log("cover ok");
