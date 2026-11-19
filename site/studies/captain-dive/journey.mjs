import { species, clamp, sweptHit } from "./rules.mjs?v=1";
import { sprite } from "./journey-art.mjs?v=1";
import { initialRecord as clean } from "./reef-motion.mjs";
const $ = (id) => document.getElementById(id);
const sea = $("sea"),
  ctx = sea.getContext("2d"),
  tank = $("aquarium"),
  tc = tank.getContext("2d");
const KEY = "captain-dive-jeju-journey-v1",
  DURATION = 90;
const habitats = [
  "감태 사이의 모래 공터",
  "현무암 바위턱의 깊은 물",
  "감태숲 안쪽 물길",
];
let record = { counts: [0, 0, 0], target: null, runs: 0 },
  saveOk = true;
try {
  record = clean(JSON.parse(localStorage.getItem(KEY) || "null"));
} catch {
  saveOk = false;
}
let stage = "harbor",
  view = "book",
  elapsed = 0,
  animation = 0,
  last = 0,
  fish = [],
  shots = [],
  effects = [],
  haul = [0, 0, 0],
  fresh = new Set(),
  selected = 0,
  pointer = null,
  aim = null,
  cooldown = 0,
  noticeUntil = 0;
const captain = { x: 180, y: 460 };
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
    saveOk = true;
  } catch {
    saveOk = false;
  }
  $("storage-note").textContent = saveOk
    ? "모은 기록은 이 기기·브라우저에 저장돼요."
    : "저장 공간을 사용할 수 없어 현재 창에서만 기록을 이어가요.";
}
function portrait(canvas, index, known = true) {
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, canvas.width, canvas.height);
  if (known) sprite(c, index, canvas.width / 2, canvas.height / 2, 5);
  else {
    c.font = "bold 28px system-ui";
    c.fillStyle = "#bed4c5";
    c.textAlign = "center";
    c.fillText("?", canvas.width / 2, canvas.height / 2 + 10);
  }
}
function renderBook() {
  $("progress").textContent = record.counts.filter(Boolean).length + "/3";
  $("cards").replaceChildren();
  species.forEach((s, i) => {
    const b = document.createElement("button");
    b.className =
      "card" +
      (record.target === i ? " target" : "") +
      (fresh.has(i) ? " new" : "");
    const c = document.createElement("canvas");
    c.width = 110;
    c.height = 72;
    portrait(c, i, record.counts[i] > 0);
    const d = document.createElement("div"),
      title = document.createElement("strong"),
      note = document.createElement("small");
    title.textContent = s.name;
    note.textContent =
      record.target === i
        ? "다음 탐사 목표"
        : record.counts[i]
          ? record.counts[i] + "마리 수집"
          : "아직 수집 전 · 위치 보기";
    d.append(title, note);
    b.append(c, d);
    b.onclick = () => detail(i);
    $("cards").append(b);
  });
  $("target-label").textContent =
    record.target === null
      ? "감태숲의 세 친구를 만나러 가요."
      : "다음 목표 · " +
        species[record.target].name +
        " / " +
        habitats[record.target];
  $("tank-caption").textContent = record.counts.some(Boolean)
    ? record.counts.filter(Boolean).length +
      "종이 함께 헤엄쳐요. 카드를 열어 다음 친구도 찾아봐요."
    : "생물을 모으면 이곳에서 함께 헤엄쳐요.";
}
function harbor(next = "book") {
  stage = "harbor";
  view = next;
  pointer = null;
  aim = null;
  $("harbor").hidden = false;
  $("dive").hidden = true;
  $("result").hidden = true;
  $("book").hidden = next !== "book";
  $("tank").hidden = next !== "tank";
  $("book-tab").setAttribute("aria-pressed", String(next === "book"));
  $("tank-tab").setAttribute("aria-pressed", String(next === "tank"));
  $("book-tab").disabled = false;
  $("tank-tab").disabled = false;
  renderBook();
}
function detail(i) {
  selected = i;
  portrait($("portrait"), i, true);
  $("fish-name").textContent = species[i].name;
  $("fish-note").textContent =
    species[i].note + " 이 구역에서는 " + habitats[i] + "에서 만나요.";
  $("fish-count").textContent = record.counts[i]
    ? "지금까지 " + record.counts[i] + "마리 수집"
    : "다음 탐사에서 첫 만남을 기록해요.";
  $("choose").textContent =
    record.target === i ? "이 생물을 목표로 탐사" : "다음 목표로 선택";
  $("detail").showModal();
}
function feedback(message) {
  $("feedback").textContent = message;
  noticeUntil = elapsed + 3;
}
function start() {
  stage = "dive";
  elapsed = 0;
  haul = [0, 0, 0];
  fresh.clear();
  shots = [];
  effects = [];
  pointer = null;
  aim = null;
  cooldown = 0;
  fish = species.flatMap((_, s) =>
    [0, 1].map((n) => ({
      s,
      x: 75 + n * 200,
      y: [155, 330, 245][s],
      base: [155, 330, 245][s],
      vx: (n ? -1 : 1) * [40, 29, 62][s],
      phase: n * 3 + s,
      caught: false,
      respawn: 0,
    })),
  );
  $("harbor").hidden = true;
  $("dive").hidden = false;
  $("result").hidden = true;
  $("paused").hidden = true;
  $("pause").disabled = false;
  $("pause").textContent = "쉬기";
  $("book-tab").disabled = true;
  $("tank-tab").disabled = true;
  $("dive-target").textContent =
    record.target === null
      ? "감태숲 · 자유 탐사"
      : "목표 · " + species[record.target].name;
  feedback("물고기를 향해 끌고, 놓으면 발사!");
  hud();
  last = performance.now();
  sea.focus({ preventScroll: true });
}
function hud() {
  $("timer").textContent = Math.ceil(Math.max(0, DURATION - elapsed)) + "초";
  $("round-count").textContent = haul.reduce((a, b) => a + b, 0) + "마리";
}
function finish() {
  if (stage !== "dive" && stage !== "paused") return;
  stage = "result";
  pointer = null;
  aim = null;
  record.runs++;
  save();
  $("dive").hidden = true;
  $("result").hidden = false;
  $("book-tab").disabled = false;
  $("tank-tab").disabled = false;
  const total = haul.reduce((a, b) => a + b, 0);
  $("result-title").textContent = total
    ? total + "마리와 함께 돌아왔어요"
    : "바다에서 돌아왔어요";
  $("haul").replaceChildren();
  species.forEach((s, i) => {
    if (haul[i]) {
      const p = document.createElement("p");
      p.textContent =
        s.name + " " + haul[i] + "마리" + (fresh.has(i) ? " · 첫 수집!" : "");
      $("haul").append(p);
    }
  });
  if (!total) {
    const p = document.createElement("p");
    p.textContent = "도감에서 목표 생물의 위치를 확인해 봐요.";
    $("haul").append(p);
  }
  renderBook();
}
function pause() {
  if (stage !== "dive") return;
  stage = "paused";
  pointer = null;
  aim = null;
  $("paused").hidden = false;
  $("pause").disabled = true;
}
function resume() {
  if (stage !== "paused") return;
  stage = "dive";
  $("paused").hidden = true;
  $("pause").disabled = false;
  last = performance.now();
  sea.focus({ preventScroll: true });
}
function point(e) {
  const r = sea.getBoundingClientRect();
  return {
    x: clamp(((e.clientX - r.left) / r.width) * 360, 0, 360),
    y: clamp(((e.clientY - r.top) / r.height) * 520, 0, 520),
  };
}
sea.onpointerdown = (e) => {
  if (stage !== "dive" || pointer !== null || e.button > 0) return;
  e.preventDefault();
  pointer = e.pointerId;
  sea.setPointerCapture(pointer);
  aim = point(e);
};
sea.onpointermove = (e) => {
  if (e.pointerId === pointer) aim = point(e);
};
sea.onpointerup = (e) => {
  if (e.pointerId !== pointer) return;
  const p = point(e);
  pointer = null;
  aim = null;
  fire(p);
};
for (const event of ["pointercancel", "lostpointercapture"])
  sea.addEventListener(event, (e) => {
    if (e.pointerId === pointer) {
      pointer = null;
      aim = null;
    }
  });
function fire(p) {
  if (stage !== "dive" || cooldown > 0) return;
  const dx = p.x - captain.x,
    dy = p.y - (captain.y - 22),
    length = Math.hypot(dx, dy);
  if (length < 20) return;
  cooldown = 0.32;
  shots.push({
    x: captain.x,
    y: captain.y - 22,
    vx: (dx / length) * 420,
    vy: (dy / length) * 420,
  });
}
sea.onkeydown = (e) => {
  if (stage !== "dive") return;
  if (e.code === "Escape") {
    pause();
    return;
  }
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
      e.code,
    )
  ) {
    e.preventDefault();
    aim ??= { x: 180, y: 240 };
    if (e.code === "Space") {
      fire(aim);
      return;
    }
    aim.x = clamp(
      aim.x + (e.code === "ArrowLeft" ? -16 : e.code === "ArrowRight" ? 16 : 0),
      15,
      345,
    );
    aim.y = clamp(
      aim.y + (e.code === "ArrowUp" ? -16 : e.code === "ArrowDown" ? 16 : 0),
      70,
      420,
    );
  }
};
function catchFish(f) {
  if (f.caught) return;
  f.caught = true;
  f.respawn = elapsed + 4;
  haul[f.s]++;
  const first = !record.counts[f.s];
  if (first) fresh.add(f.s);
  record.counts[f.s]++;
  $("progress").textContent = record.counts.filter(Boolean).length + "/3";
  save();
  effects.push({ x: f.x, y: f.y, s: f.s, life: 1 });
  feedback(
    (first ? "첫 만남! " : "") +
      species[f.s].name +
      " 수집" +
      (record.target === f.s ? " · 목표 달성!" : ""),
  );
  hud();
}
function update(dt) {
  elapsed += dt;
  cooldown = Math.max(0, cooldown - dt);
  if (elapsed >= DURATION) {
    finish();
    return;
  }
  for (const f of fish) {
    if (f.caught) {
      if (elapsed >= f.respawn) {
        f.caught = false;
        f.x = f.vx > 0 ? 30 : 330;
      }
      continue;
    }
    f.x += f.vx * dt;
    if (f.x < 30) {
      f.x = 30;
      f.vx = Math.abs(f.vx);
    }
    if (f.x > 330) {
      f.x = 330;
      f.vx = -Math.abs(f.vx);
    }
    f.y =
      f.base +
      Math.sin(elapsed * [1.1, 0.7, 1.8][f.s] + f.phase) * [8, 12, 20][f.s];
  }
  for (const shot of shots) {
    const prev = { x: shot.x, y: shot.y };
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    const hit = fish.find(
      (f) => !f.caught && sweptHit(prev, shot, f, f.s === 1 ? 23 : 20),
    );
    if (hit) {
      catchFish(hit);
      shot.dead = true;
    }
  }
  shots = shots.filter(
    (s) => !s.dead && s.x > -10 && s.x < 370 && s.y > -10 && s.y < 530,
  );
  effects.forEach((e) => (e.life -= dt));
  effects = effects.filter((e) => e.life > 0);
  if (elapsed > noticeUntil)
    $("feedback").textContent = "물고기가 갈 곳을 보고 조준해요 · 놓으면 발사";
  hud();
}
function background(c, w, h, t) {
  const gradient = c.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#408f91");
  gradient.addColorStop(1, "#154d61");
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#9ad7bb12";
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(i * 110, 0);
    c.lineTo(i * 110 + 40, 0);
    c.lineTo(i * 110 - 90, h);
    c.lineTo(i * 110 - 140, h);
    c.fill();
  }
  c.fillStyle = "#789d85";
  c.beginPath();
  c.ellipse(w / 2, h + 16, w, 55, 0, 0, 7);
  c.fill();
  for (let i = 0; i < 9; i++) {
    const x = i % 2 ? 18 : 342,
      y = h - 15 - (i % 3) * 13;
    c.strokeStyle = i % 2 ? "#6bab84" : "#39836b";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(x, y);
    for (let j = 1; j < 6; j++)
      c.lineTo(x + Math.sin(t + j + i) * 9, y - j * 21);
    c.stroke();
  }
  c.fillStyle = "#315b60";
  for (const x of [28, w - 30]) {
    c.beginPath();
    c.moveTo(x - 32, h);
    c.lineTo(x - 28, h - 40);
    c.lineTo(x + 3, h - 56);
    c.lineTo(x + 30, h - 25);
    c.lineTo(x + 34, h);
    c.fill();
  }
  c.fillStyle = "#dcebd56b";
  for (let i = 0; i < 17; i++) {
    c.beginPath();
    c.arc((i * 71 + 20) % w, (((i * 43 - t * 9) % h) + h) % h, 1.5, 0, 7);
    c.fill();
  }
}
function draw() {
  background(ctx, 360, 520, animation);
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.fillStyle = "#b4d5be";
  ctx.fillText("감태숲 가운데 물길", 12, 215);
  ctx.fillText("감태 사이 공터", 12, 110);
  ctx.fillText("현무암 옆 물길", 12, 410);
  for (const f of fish) {
    if (f.caught) continue;
    sprite(ctx, f.s, f.x, f.y, 2.8, f.vx < 0);
    if (record.target === f.s) {
      ctx.strokeStyle = "#f5d584";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 29, 0, 7);
      ctx.stroke();
    }
  }
  for (
    let i = 0;
    i <
    Math.min(
      haul.reduce((a, b) => a + b, 0),
      5,
    );
    i++
  ) {
    const s = haul.flatMap((n, s) => Array(Math.min(n, 5)).fill(s))[i];
    sprite(ctx, s, 110 + i * 33, 492 + Math.sin(animation * 2 + i) * 4, 1.5);
  }
  sprite(ctx, 3, captain.x, captain.y + Math.sin(animation * 2) * 2, 2.3);
  if (aim) {
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "#f4e5af";
    ctx.beginPath();
    ctx.moveTo(captain.x, captain.y - 22);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 13, 0, 7);
    ctx.stroke();
  }
  for (const s of shots) {
    ctx.fillStyle = "#bfece477";
    ctx.strokeStyle = "#ebffef";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9, 0, 7);
    ctx.fill();
    ctx.stroke();
  }
  for (const e of effects) {
    ctx.strokeStyle = "#f5dfa2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 25 + (1 - e.life) * 28, 0, 7);
    ctx.stroke();
    ctx.fillStyle = "#fff2c8";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(species[e.s].name, e.x, e.y - 30 - (1 - e.life) * 18);
  }
}
function drawTank() {
  background(tc, 360, 260, animation);
  record.counts.forEach((n, s) => {
    if (!n) return;
    const x = 180 + Math.sin(animation * [0.45, 0.32, 0.6][s] + s * 2) * 125,
      y = 65 + s * 62 + Math.sin(animation + s) * 8;
    sprite(
      tc,
      s,
      x,
      y,
      3,
      Math.cos(animation * [0.45, 0.32, 0.6][s] + s * 2) < 0,
    );
    tc.font = "12px system-ui";
    tc.textAlign = "center";
    tc.fillStyle = "#e6edcf";
    tc.fillText(species[s].name, x, y + 27);
  });
}
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, 0.05);
  last = now;
  animation += dt;
  if (stage === "dive") update(dt);
  if (stage === "dive" || stage === "paused") draw();
  if (stage === "harbor" && view === "tank") drawTank();
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("blur", pause);
window.addEventListener("storage", (e) => {
  if (e.key === KEY && stage === "harbor") {
    try {
      record = clean(JSON.parse(e.newValue));
      renderBook();
    } catch {}
  }
});

$("depart").onclick = start;
$("pause").onclick = pause;
$("resume").onclick = resume;
$("return").onclick = finish;
$("to-book").onclick = () => harbor("book");
$("to-tank").onclick = () => harbor("tank");
$("book-tab").onclick = () => harbor("book");
$("tank-tab").onclick = () => harbor("tank");
$("close").onclick = () => $("detail").close();
$("choose").onclick = () => {
  record.target = selected;
  save();
  $("detail").close();
  harbor("book");
};
const initialTab = new URLSearchParams(globalThis.location?.search || "").get("view") === "tank" ? "tank" : "book";
window.addEventListener("pageshow", event => {
  if (!event.persisted || stage !== "harbor") return;
  try { record = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch {}
  renderBook();
});
harbor(initialTab);
requestAnimationFrame(frame);
