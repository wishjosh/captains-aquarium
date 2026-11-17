import test from "node:test";
import assert from "node:assert/strict";
class Element {
  constructor(id = "") {
    this.id = id;
    this.listeners = {};
    this.children = [];
    this.dataset = {};
    this.width = 360;
    this.height = 480;
    this.hidden = false;
    this.textContent = "";
    this.attrs = {};
    this.classList = { toggle() {} };
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  append(...e) {
    this.children.push(...e);
  }
  replaceChildren(...e) {
    this.children = e;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }
  emit(type, data = {}) {
    const e = { preventDefault() {}, button: 0, pointerId: 1, ...data };
    for (const f of this.listeners[type] || []) f(e);
  }
  getContext() {
    return new Proxy(
      { canvas: this, createLinearGradient: () => ({ addColorStop() {} }) },
      { get: (o, k) => (k in o ? o[k] : () => {}) },
    );
  }
  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.displayWidth || 360,
      height: this.displayHeight || 480,
    };
  }
  setPointerCapture() {}
  focus() {
    document.activeElement = this;
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
}

test("journey collection, target, tank, pause, cancellation, timeout and reload", async () => {
  let clock = 0,
    raf;
  const saved = new Map(),
    ids = new Map(),
    listeners = {};
  const get = (id) => {
    if (!ids.has(id)) ids.set(id, new Element(id));
    return ids.get(id);
  };
  globalThis.document = {
    getElementById: get,
    createElement: () => new Element(),
    hidden: false,
    addEventListener: (k, f) => (listeners[k] = f),
  };
  globalThis.window = { addEventListener: (k, f) => (listeners[k] = f) };
  globalThis.performance = { now: () => clock };
  globalThis.requestAnimationFrame = (fn) => (raf = fn);
  globalThis.localStorage = {
    getItem: (k) => saved.get(k) || null,
    setItem: (k, v) => saved.set(k, v),
  };
  const run = (seconds) => {
    for (let i = 0; i < Math.ceil(seconds / 0.02); i++) {
      clock += 20;
      raf(clock);
    }
  };
  await import("../site/studies/captain-dive/journey.mjs?test=1");
  assert.equal(get("cards").children.length, 3);
  get("cards").children[1].onclick();
  get("choose").onclick();
  assert.match(get("target-label").textContent, /가시복/);
  get("depart").onclick();
  assert.match(get("dive-target").textContent, /가시복/);
  const sea = get("sea");
  sea.displayHeight = 520;
  const event = (type, x, y) =>
    sea["on" + type]({
      pointerId: 1,
      button: 0,
      clientX: x,
      clientY: y,
      preventDefault() {},
    });
  for (let i = 0; i < 80; i++) {
    const x = 40 + ((i * 43) % 280),
      y = 140 + (i % 3) * 95;
    event("pointerdown", 180, 460);
    event("pointerup", x, y);
    run(0.6);
  }
  const data = JSON.parse(saved.get("captain-dive-jeju-journey-v1"));
  assert.ok(
    data.counts.every((n) => n > 0),
    "normal aim inputs capture all species",
  );
  get("pause").onclick();
  const paused = get("timer").textContent;
  run(5);
  assert.equal(get("timer").textContent, paused);
  get("resume").onclick();
  event("pointerdown", 180, 460);
  sea.emit("pointercancel");
  const count = get("round-count").textContent;
  event("pointerup", 180, 150);
  run(0.5);
  assert.equal(get("round-count").textContent, count);
  document.hidden = true;
  listeners.visibilitychange();
  const hidden = get("timer").textContent;
  run(3);
  assert.equal(get("timer").textContent, hidden);
  document.hidden = false;
  get("resume").onclick();
  run(95);
  assert.equal(get("result").hidden, false);
  assert.equal(JSON.parse(saved.get("captain-dive-jeju-journey-v1")).runs, 1);
  get("return").onclick();
  assert.equal(JSON.parse(saved.get("captain-dive-jeju-journey-v1")).runs, 1);
  get("to-tank").onclick();
  assert.equal(get("tank").hidden, false);
  run(0.2);
  await import("../site/studies/captain-dive/journey.mjs?test=reload");
  assert.equal(get("progress").textContent, "3/3");
  assert.match(get("target-label").textContent, /가시복/);
  saved.set(
    "captain-dive-jeju-journey-v1",
    JSON.stringify({ counts: [-3, "bad", Infinity], target: 7, runs: -1 }),
  );
  await import("../site/studies/captain-dive/journey.mjs?test=malformed");
  assert.equal(get("progress").textContent, "0/3");
  get("depart").onclick();
  assert.match(get("dive-target").textContent, /자유 탐사/);
});
