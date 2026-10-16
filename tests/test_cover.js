// Cover: top-layer modal dialog on documentElement, re-raised above later full-screen elements.
const assert = require("assert");
const { makeCover } = require("../chrome-ext/overlay.js");

function node(tag) {
  return {
    nodeType: 1, tag, parent: null, open: false, shown: 0, attrs: {}, listeners: {},
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
console.log("cover ok");
