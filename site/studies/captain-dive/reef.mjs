import { species, clamp } from "./rules.mjs?v=1";
import {
  HOME,
  RANGE,
  rocks,
  bottom,
  routeDepth,
  blend,
  deltaAngle,
  beachStart,
  waterPose,
  TRACK_RADIUS,
  TRACK_SECONDS,
  swim,
  fishPlace,
  closestHit,
  initialRecord,
  registerReturn,
} from "./reef-motion.mjs?v=coast1";
import { createWorld } from "./reef-world.mjs?v=coast1";
import { CaptureAudio } from "../faceted-habitat/audio.mjs";
import { PageLifecycle } from "../faceted-habitat/page-lifecycle.mjs";

const $ = (id) => document.getElementById(id),
  canvas = $("water"),
  audio = new CaptureAudio();
const key = "captain-dive-jeju-journey-v1";
let memory = initialRecord(null),
  storageOK = true;
function readRecord() {
  try {
    const raw = localStorage.getItem(key);
    return raw ? initialRecord(JSON.parse(raw)) : memory;
  } catch {
    storageOK = false;
    return memory;
  }
}
let record = readRecord(),
  world,
  stage = "loading",
  player = beachStart(),
  shot = null,
  effect = null;
let time = 0,
  last = 0,
  wentOut = false,
  routeShown = false,
  homeDwell = 0,
  landing = 0,
  mode =
    new URLSearchParams(location.search).get("mode") === "follow"
      ? "follow"
      : "bubble",
  tracked = null,
  trackingTime = 0,
  lastTrackPlace = null;
let held = null,
  pointerX = 0,
  pointerZ = 0,
  lastTip = "",
  tipUntil = 0,
  trail = [],
  trailClock = 0;
const keys = new Set(),
  companions = [];
const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
const ui = (el, x, y) => {
  el.style.left = x.toFixed(1) + "px";
  el.style.top = y.toFixed(1) + "px";
};
const say = (s, seconds = 3) => {
  lastTip = s;
  tipUntil = time + seconds;
};
const modeNames = { bubble: "물방울 쏘기", follow: "원 안에서 따라가기" };
const idleTip = () =>
  mode === "bubble"
    ? "물고기가 갈 곳을 톡 눌러요."
    : "한 마리를 원 안에 두고 따라가요.";
function clearInput() {
  held = null;
  pointerX = pointerZ = 0;
  keys.clear();
  $("stick").hidden = true;
  $("reticle").hidden = true;
}
function start(choice) {
  if (!world) return;
  mode = choice;
  $("mode-caption").textContent = "캡틴 다이브 · " + modeNames[mode];
  lastTrackPlace = null;
  tracked = null;
  trackingTime = 0;
  world.radar.visible = false;
  $("track-meter").hidden = true;
  $("place").textContent = "감태 해안";
  $("home-text").hidden = true;
  stage = "diving";
  time = 0;
  wentOut = false;
  homeDwell = landing = 0;
  routeShown = false;
  shot = effect = null;
  record = readRecord();
  clearInput();
  companions.length = 0;
  player = beachStart();
  trail = [{ x: player.x, y: player.y, z: player.z }];
  trailClock = 0;
  world.bubble.visible = false;
  for (const f of world.animals) {
    const p = fishPlace(f.e, 0);
    f.node.position.set(p.x, p.y, p.z);
    f.caught = false;
    f.slot = -1;
    f.bind = 0;
    f.heading = Math.atan2(
      Math.cos(f.e.phase) * f.e.radiusX,
      -Math.sin(f.e.phase) * f.e.radiusZ,
    );
    f.node.rotation.y = f.heading;
  }
  $("intro").hidden = $("rest").hidden = $("result").hidden = true;
  $("hud").hidden = $("pause").hidden = false;
  $("count").textContent = "0종";
  last = performance.now();
  world.follow(player, 0, true);
  say("바다 쪽으로 끌어 물에 들어가요.", 2);
  audio.unlock();
  canvas.focus({ preventScroll: true });
}
function nearestFish(distance, measure) {
  let best = null;
  for (const fish of world.animals) {
    if (fish.caught) continue;
    const d = measure(fish.node.position);
    if (d < distance) {
      best = fish;
      distance = d;
    }
  }
  return best;
}
function launch(x, y) {
  if (stage !== "diving" || shot || effect?.age < 0.12) return;
  if (waterPose(player.x, player.z) < 0.97) return;
  // Depth assistance leaves the horizontal aim in the player's hands.
  const layer = nearestFish(Math.min(90, canvas.clientWidth * 0.22), (p) => {
    const screen = world.project(p);
    return Math.hypot(screen.x - x, screen.y - y);
  });
  const target = world.aimAt(x, y, layer?.node.position.y ?? player.y);
  if (!target) return;
  const origin = { x: player.x, y: player.y + 0.05, z: player.z };
  const dx = target.x - origin.x,
    dz = target.z - origin.z,
    length = Math.hypot(dx, dz);
  if (length < 0.16) {
    say("물고기가 헤엄쳐 갈 곳을 겨냥해요.", 2);
    return;
  }
  const limit = Math.min(length, RANGE);
  shot = {
    origin,
    dx: dx / length,
    dz: dz / length,
    dy: (target.y - origin.y) / length,
    limit,
    progress: 0,
    x: origin.x,
    y: origin.y,
    z: origin.z,
  };
  const orb = world.bubble;
  orb.visible = true;
  orb.scale.setScalar(0.19);
  orb.position.set(origin.x, origin.y, origin.z);
  effect = null;
  audio.cue("shot");
  if (length > RANGE + 0.3) say("물방울의 사거리까지 조금 더 다가가요.", 2.5);
}
function miss(message) {
  shot = null;
  world.bubble.visible = false;
  say(message || "빗나갔어요. 물고기가 갈 곳을 조금 앞서 겨냥해요.", 2.3);
  audio.cue("miss");
}
function capture(f) {
  f.caught = true;
  f.slot = companions.length;
  f.bind = 0.45;
  companions.push(f);
  if (companions.length === 1) {
    routeShown = true;
    $("home-text").hidden = false;
  }
  $("count").textContent = new Set(companions.map((a) => a.s)).size + "종";
  say(species[f.s].name + " 동행! 주황 부표로 돌아가거나 더 둘러봐요.", 3.5);
  effect = { fish: f, age: 0 };
  shot = null;
  audio.cue("impact");
}
function moveShot(dt) {
  const orb = world.bubble;
  if (effect) {
    const f = effect.fish;
    effect.age += dt;
    orb.visible = effect.age < 0.46;
    orb.position.copy(f.node.position);
    orb.scale.setScalar(0.58 + effect.age * 0.45);
    if (!orb.visible) effect = null;
  }
  if (!shot) return;
  const a = { x: shot.x, y: shot.y, z: shot.z };
  shot.progress = Math.min(shot.limit, shot.progress + dt * 8.0);
  shot.y = shot.origin.y + shot.dy * shot.progress;
  shot.x = shot.origin.x + shot.dx * shot.progress;
  shot.z = shot.origin.z + shot.dz * shot.progress;
  const blocked = rocks.some(
    ([x, z, rx, rz, h]) =>
      ((shot.x - x) / rx) ** 2 + ((shot.z - z) / rz) ** 2 < 0.9 &&
      shot.y < bottom(x, z) + h,
  );
  if (blocked) {
    miss("물방울이 바위에 닿았어요. 옆으로 돌아가 봐요.");
    return;
  }
  orb.position.set(shot.x, shot.y, shot.z);
  const f = closestHit(a, shot, world.animals);
  if (f) {
    capture(f);
    return;
  }
  if (shot.progress >= shot.limit) {
    miss();
  }
}
function updateTracking(dt) {
  const active =
    mode === "follow" &&
    waterPose(player.x, player.z) > 0.97 &&
    stage === "diving";
  world.radar.visible = active;
  if (!active) {
    tracked = null;
    trackingTime = 0;
    return;
  }
  // A new encounter starts after the swimmer moves away from the last capture.
  if (lastTrackPlace && dist(player, lastTrackPlace) < TRACK_RADIUS * 0.72)
    return;
  lastTrackPlace = null;
  function range(p) {
    const position = world.onRadarPlane(p, player.y);
    const d = dist(player, position);
    if (d > TRACK_RADIUS) return Infinity;
    const blocked = rocks.some(([x, z, rx, rz, h]) => {
      const ax = (player.x - x) / rx,
        az = (player.z - z) / rz;
      const dx = (p.x - player.x) / rx,
        dz = (p.z - player.z) / rz;
      const t = clamp(-(ax * dx + az * dz) / (dx * dx + dz * dz || 1), 0, 1);
      return (
        (ax + t * dx) ** 2 + (az + t * dz) ** 2 < 0.9 &&
        player.y + (p.y - player.y) * t < bottom(x, z) + h
      );
    });
    return blocked ? Infinity : d;
  }
  tracked ??= nearestFish(TRACK_RADIUS, range);
  if (!tracked) return;
  trackingTime = clamp(
    trackingTime +
      (range(tracked.node.position) <= TRACK_RADIUS ? dt : -dt * 1.8),
    0,
    TRACK_SECONDS,
  );
  if (trackingTime >= TRACK_SECONDS) {
    capture(tracked);
    lastTrackPlace = { x: player.x, z: player.z };
    tracked = null;
    trackingTime = 0;
  } else if (!trackingTime) tracked = null;
}
function addTrail(dt) {
  trailClock += dt;
  const latest = trail[0];
  if (
    trailClock < 0.06 ||
    Math.hypot(player.x - latest.x, player.y - latest.y, player.z - latest.z) <
      0.12
  )
    return;
  trailClock = 0;
  trail.unshift({ x: player.x, y: player.y, z: player.z });
  if (trail.length > 85) trail.length = 85;
}
function updateAnimals(dt) {
  addTrail(dt);
  for (const f of world.animals) {
    let next, approach;
    if (f.caught) {
      f.bind = Math.max(0, f.bind - dt);
      if (f.bind) continue;
      const lag = trail[Math.min(trail.length - 1, 5 + f.slot * 4)];
      const side = f.slot % 2 ? -0.42 : 0.42,
        dx = Math.cos(player.heading) * side,
        dz = Math.sin(player.heading) * side;
      next = {
        x: lag.x + dx,
        y: lag.y + 0.06 + 0.08 * Math.sin(time * 2 + f.slot),
        z: lag.z + dz,
      };
      approach = blend(3.4, dt);
    } else {
      next = fishPlace(f.e, time);
      approach = 1;
    }
    const p = f.node.position,
      dx = next.x - p.x,
      dz = next.z - p.z;
    if (Math.hypot(dx, dz) > 0.0003)
      f.heading += deltaAngle(f.heading, Math.atan2(dx, dz)) * blend(8, dt);
    p.x += dx * approach;
    p.y += (next.y - p.y) * approach;
    p.z += dz * approach;
    f.node.rotation.y = f.heading;
  }
}
function finish() {
  if (stage !== "surfacing") return;
  stage = "result";
  const previous = readRecord(),
    haul = companions.map((f) => f.s),
    ids = [...new Set(haul)];
  memory = registerReturn(previous, haul);
  record = memory;
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    storageOK = false;
  }
  $("result-title").textContent = ids.length
    ? "함께 돌아온 " + ids.map((i) => species[i].name).join(" · ")
    : "부표로 돌아왔어요";
  const newSpecies = ids.filter((i) => !previous.counts[i]);
  $("result-note").textContent =
    (newSpecies.length
      ? "새 도감 카드 · " +
        newSpecies.map((i) => species[i].name).join(", ") +
        ". "
      : ids.length
        ? "작은 수조에서 동행을 만나요. "
        : "다시 잠수해 새로운 생물을 찾아봐요. ") +
    "제주 도감 " +
    record.counts.filter(Boolean).length +
    "/3종" +
    (storageOK ? "" : " · 이 창에서만 기록돼요.");
  $("result-mode").textContent = modeNames[mode] + " · 귀환";
  $("swap").textContent =
    modeNames[mode === "bubble" ? "follow" : "bubble"] + " 해보기";
  $("result").hidden = false;
  $("hud").hidden = $("pause").hidden = true;
  $("open-book").focus({ preventScroll: true });
  audio.cue("recovered");
}
function cues() {
  const homeDistance = dist(player, HOME),
    collected = companions.length > 0;
  const note =
    stage === "surfacing"
      ? "부표 밧줄을 따라 함께 올라가요."
      : homeDwell > 0.05
        ? "부표에 도착했어요 · 함께 올라가는 중"
        : player.z > 7 && !collected
          ? "바다 쪽으로 끌어 물에 들어가요."
          : time < tipUntil
            ? lastTip
            : routeShown
              ? "나침반을 따라 주황 부표로 돌아가요."
              : collected
                ? "동행과 함께 주황 부표로 돌아갈 수 있어요."
                : idleTip();
  if ($("note").textContent !== note) $("note").textContent = note;
  $("place").textContent =
    player.z >= 11.85
      ? "감태 해안"
      : player.z > 9.5
        ? "얕은 물가"
        : player.z > 6.65
          ? "물속으로"
          : player.z > 3
            ? "감태숲 입구"
            : player.z > -4
              ? "모래 물길"
              : player.z > -9
                ? "현무암 바위턱"
                : "감태숲 안쪽";
  $("depth").textContent = Math.max(0, -player.y).toFixed(1) + " m";
  $("home-text").textContent = routeShown
    ? "부표 " + homeDistance.toFixed(0) + " m"
    : "부표 찾기";
  const m = $("home-marker"),
    hp = world.project({ x: HOME.x, y: -0.48, z: HOME.z });
  const width = canvas.clientWidth,
    height = canvas.clientHeight;
  // The arrow points through the world in screen coordinates, just like the swim gesture.
  const wild = world.animals.filter((f) => !f.caught);
  const targetFish =
    wild.find((f) => f.s === record.target) ||
    wild.reduce(
      (nearest, f) =>
        !nearest ||
        dist(player, f.node.position) < dist(player, nearest.node.position)
          ? f
          : nearest,
      null,
    );
  const goal = routeShown
    ? { x: HOME.x, y: player.y, z: HOME.z }
    : targetFish?.node.position;
  const mark = $("waymark");
  mark.hidden =
    stage !== "diving" ||
    !goal ||
    dist(player, goal) < (routeShown ? 1.6 : 3.65);
  if (!mark.hidden) {
    const from = world.project(player),
      to = world.project({ x: goal.x, y: player.y, z: goal.z });
    const dx = to.x - from.x,
      dy = to.y - from.y,
      length = Math.max(1, Math.hypot(dx, dy));
    ui(mark, from.x + (dx / length) * 58, from.y + (dy / length) * 58);
    mark.style.transform =
      "translate(-50%,-50%) rotate(" + Math.atan2(dx, -dy) + "rad)";
    mark.classList.toggle("returning", routeShown);
  }
  m.hidden =
    homeDistance > 8 ||
    hp.x < 32 ||
    hp.x > width - 32 ||
    hp.y < 95 ||
    hp.y > height - 85;
  if (!m.hidden) ui(m, hp.x, hp.y - 12);
  for (const f of world.animals) {
    const p = f.node.position,
      q = world.project(p),
      label = f.label;
    const visible =
      !f.caught &&
      dist(player, p) < 6.2 &&
      q.x > 23 &&
      q.x < width - 23 &&
      q.y > 105 &&
      q.y < height - 90;
    label.hidden = !visible;
    if (!visible) continue;
    label.textContent = species[f.s].name;
    label.classList.toggle("target", record.target === f.s);
    ui(label, q.x, q.y - 18);
  }
}
function update(dt) {
  if (stage === "diving") {
    const ax =
      pointerX +
      Number(keys.has("ArrowRight") || keys.has("KeyD")) -
      Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    const az =
      pointerZ +
      Number(keys.has("ArrowDown") || keys.has("KeyS")) -
      Number(keys.has("ArrowUp") || keys.has("KeyW"));
    const nearest = tracked || nearestFish(RANGE + 0.5, (p) => dist(player, p));
    const autoOffset = nearest
      ? -routeDepth(player.z) - nearest.node.position.y
      : 0;
    player.offset += (autoOffset - player.offset) * blend(4, dt);
    swim(player, ax, az, dt);
    const d = dist(player, HOME);
    if (player.z < HOME.z - 2.8) wentOut = true;
    homeDwell = wentOut && d < 1.16 ? homeDwell + dt : 0;
    if (homeDwell > 0.46) {
      stage = "surfacing";
      $("pause").hidden = true;
      landing = 0;
      clearInput();
      shot = effect = null;
      world.bubble.visible = false;
      audio.cue("dock");
    }
  } else if (stage === "surfacing") {
    landing += dt;
    player.y += (-0.14 - player.y) * blend(3.3, dt);
    player.vy = 0.5;
    player.cruise *= Math.exp(-dt * 5);
    player.vx = player.vz = 0;
    if (landing > 1.25) {
      finish();
      return;
    }
  }
  updateAnimals(dt);
  updateTracking(dt);
  moveShot(dt);
}
function frame(stamp) {
  requestAnimationFrame(frame);
  if (!world || document.hidden) return;
  const dt = Math.min(0.1, Math.max(0.001, (stamp - last) / 1000));
  last = stamp;
  if (stage === "rest" || stage === "result" || stage === "lost") return;
  if (stage === "diving" || stage === "surfacing") {
    // Small steps keep a fast bubble and the rock outlines consistent on slower displays.
    const steps = Math.ceil(dt / 0.025);
    for (let i = 0; i < steps && stage !== "result"; i++) {
      time += dt / steps;
      update(dt / steps);
    }
    if (stage === "result") return;
    world.follow(player, dt);
    cues();
  } else {
    time += dt;
    updateAnimals(dt);
  }
  const meter = $("track-meter");
  meter.hidden = !tracked || stage !== "diving";
  if (!meter.hidden) {
    const point = world.project(tracked.node.position);
    ui(meter, point.x, point.y);
    meter.style.setProperty(
      "--filled",
      (100 * trackingTime) / TRACK_SECONDS + "%",
    );
  }
  world.draw(player, time, dt);
}
function pause() {
  if (stage !== "diving") return;
  stage = "rest";
  clearInput();
  $("rest").hidden = false;
  $("hud").hidden = $("pause").hidden = true;
}
function resume() {
  if (stage !== "rest") return;
  stage = "diving";
  clearInput();
  last = performance.now();
  $("rest").hidden = true;
  $("hud").hidden = $("pause").hidden = false;
  canvas.focus({ preventScroll: true });
}
canvas.addEventListener("pointerdown", (e) => {
  if (stage !== "diving" || held || e.button > 0) return;
  held = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    mode: "pending",
  };
  canvas.setPointerCapture(e.pointerId);
  ui($("reticle"), e.clientX, e.clientY);
  $("reticle").hidden = mode !== "bubble" || player.z > 6.65;
});
canvas.addEventListener("pointermove", (e) => {
  if (!held || held.id !== e.pointerId) return;
  const dx = e.clientX - held.x,
    dy = e.clientY - held.y,
    length = Math.hypot(dx, dy);
  if (held.mode === "pending" && length >= 8) held.mode = "swim";
  if (held.mode === "swim") {
    const radius = 33,
      divisor = Math.max(radius, length);
    pointerX = dx / divisor;
    pointerZ = dy / divisor;
    const pad = $("stick");
    ui(pad, held.x, held.y);
    pad.hidden = false;
    $("reticle").hidden = true;
    pad.firstElementChild.style.transform =
      "translate(" + pointerX * 26 + "px," + pointerZ * 26 + "px)";
  } else ui($("reticle"), e.clientX, e.clientY);
});
canvas.addEventListener("pointerup", (e) => {
  if (!held || held.id !== e.pointerId) return;
  const tap = held.mode === "pending";
  held = null;
  pointerX = pointerZ = 0;
  $("stick").hidden = $("reticle").hidden = true;
  if (tap && mode === "bubble" && stage === "diving")
    launch(e.clientX, e.clientY);
});
for (const ev of ["pointercancel", "lostpointercapture"])
  canvas.addEventListener(ev, (e) => {
    if (held?.id === e.pointerId) {
      held = null;
      pointerX = pointerZ = 0;
      $("stick").hidden = $("reticle").hidden = true;
    }
  });
const movement = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);
window.addEventListener("keydown", (e) => {
  if (stage !== "diving") return;
  if (movement.has(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
  if (e.code === "Escape") pause();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
$("start").onclick = () => start("bubble");
$("follow-start").onclick = () => start("follow");
$("again").onclick = () => start(mode);
$("swap").onclick = () => start(mode === "bubble" ? "follow" : "bubble");
$("pause").onclick = pause;
$("resume").onclick = resume;
new PageLifecycle({
  page: document,
  host: window,
  onPause: pause,
  onBlur: () => keys.clear(),
});
document.addEventListener("visibilitychange", () => {
  last = performance.now();
});
window.addEventListener("resize", () => {
  if (world) {
    world.resize();
    world.follow(player, 0, true);
    world.draw(player, time, 0);
  }
});
function failure(message) {
  stage = "lost";
  clearInput();
  $("hud").hidden =
    $("pause").hidden =
    $("rest").hidden =
    $("result").hidden =
      true;
  $("intro").hidden = false;
  $("follow-start").disabled = true;
  const status = $("load-status");
  status.hidden = false;
  status.textContent = message;
  $("start").textContent = "다시 열기";
  $("start").disabled = false;
  $("start").onclick = () => location.reload();
}
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  failure("화면 연결이 끊겼어요. 다시 열면 도감 기록을 이어갈 수 있어요.");
});
try {
  world = await createWorld(canvas);
  for (const f of world.animals) {
    f.label = document.createElement("span");
    f.label.className = "tag";
    f.label.hidden = true;
    $("name-tags").append(f.label);
  }
  trail = [{ x: player.x, y: player.y, z: player.z }];
  world.follow(player, 0, true);
  stage = "ready";
  $("start").textContent = modeNames.bubble;
  $("follow-start").disabled = false;
  $("start").classList.toggle("primary", mode === "bubble");
  $("follow-start").classList.toggle("primary", mode === "follow");
  $("start").disabled = false;
  last = performance.now();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  failure(
    "바다를 불러오지 못했어요. 연결과 브라우저의 3D 그래픽 지원을 확인해 주세요.",
  );
}
