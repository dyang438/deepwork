// Media guard: pauses existing and new media, re-pauses on play, never resumes.
const assert = require("assert");
const { makeMediaGuard } = require("../chrome-ext/overlay.js");

function media() { return { paused: false, played: 0, pause() { this.paused = true; }, play() { this.paused = false; this.played++; } }; }
const listeners = {};
let observerCb = null;
const els = [media(), media()];
const doc = {
  documentElement: {},
  querySelectorAll: () => els,
  addEventListener: (t, f, cap) => { assert.strictEqual(cap, true); (listeners[t] = listeners[t] || []).push(f); },
};
class FakeObserver { constructor(cb) { observerCb = cb; } observe() {} disconnect() { observerCb = null; } }
const fire = (t, target) => (listeners[t] || []).forEach((f) => f({ target }));

const g = makeMediaGuard(doc, FakeObserver);
fire("play", els[0]);
assert.strictEqual(els[0].paused, false, "inactive guard must not pause");
g.enable();
assert.ok(els.every((m) => m.paused), "existing media paused on enable");
els[0].play(); fire("play", els[0]);
assert.strictEqual(els[0].paused, true, "re-paused on play");
els[1].play(); fire("playing", els[1]);
assert.strictEqual(els[1].paused, true, "re-paused on playing");
const late = media(); els.push(late); observerCb([]);
assert.strictEqual(late.paused, true, "new media paused via MutationObserver");
g.disable();
assert.ok(els.every((m) => m.paused), "nothing resumed on disable");
assert.strictEqual(observerCb, null, "observer disconnected");
els[0].play(); fire("play", els[0]);
assert.strictEqual(els[0].paused, false, "after the session, play works again");
console.log("media ok");
