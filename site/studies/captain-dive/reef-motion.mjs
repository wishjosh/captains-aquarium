import { clamp } from "./rules.mjs?v=1";

export const HOME = { x: 0, z: 6 };
export const RANGE = 4.9;
export const entries = [
  {
    s: 0,
    x: 0.78,
    z: -0.34,
    radiusX: 1.0,
    radiusZ: 0.58,
    pace: 0.75,
    phase: 0.3,
    offset: 0,
  },
  {
    s: 0,
    x: -0.8,
    z: -1.45,
    radiusX: 0.82,
    radiusZ: 0.48,
    pace: 0.67,
    phase: 2.0,
    offset: 0.02,
  },
  {
    s: 1,
    x: -0.85,
    z: -6.45,
    radiusX: 0.62,
    radiusZ: 0.6,
    pace: 0.52,
    phase: 0.82,
    offset: 0.88,
  },
  {
    s: 2,
    x: 1.0,
    z: -11.8,
    radiusX: 1.4,
    radiusZ: 0.65,
    pace: 0.97,
    phase: 2.4,
    offset: -0.22,
  },
];
// Each basalt cluster has the same footprint in the scenery and in the swim rules.
export const rocks = [
  [-4.5, 7, 1.65, 1.8, 1.42],
  [4.9, 5.6, 1.62, 2.1, 1.72],
  [-4.15, 2.4, 1.4, 2.1, 1.65],
  [4.7, 0.8, 1.55, 1.8, 1.4],
  [-4.7, -2.15, 1.65, 1.84, 1.95],
  [4.15, -3.6, 1.55, 1.9, 1.85],
  [-3.55, -7.65, 1.6, 1.62, 2.4],
  [3.15, -8.25, 1.28, 1.72, 2.1],
  [-4.72, -11.5, 1.78, 2.0, 1.6],
  [4.9, -12.4, 1.7, 2.2, 1.5],
  [-2.9, -16.1, 2.05, 1.7, 2.1],
  [1.4, -16.8, 2.45, 1.65, 2.23],
];
const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
export const blend = (rate, dt) => 1 - Math.exp(-rate * dt);
export const routeDepth = (z) => 1.38 + 2.13 * smooth((4 - z) / 16);
const seabed = (x, z) =>
  -routeDepth(z) -
  1.83 +
  0.15 * Math.sin(x * 1.2 + z * 0.47) +
  0.09 * Math.cos(z * 0.9 - x * 0.62);
// A continuous foreshore joins the dry beach to the familiar kelp route.
export const coastMix = (z) => smooth((z - 5.8) / 8.0);
export const bottom = (x, z) => {
  const shore = coastMix(z);
  return seabed(x, z) * (1 - shore) + (0.42 + 0.046 * (z - 13.8)) * shore;
};
export const waterPose = (x, z) => smooth((-bottom(x, z) - 0.12) / 1.62);
export function beachStart() {
  return { ...newSwimmer(), x: 0.45, z: 14.4, y: bottom(0.45, 14.4) + 1.06 };
}
export const TRACK_RADIUS = 1.5;
export const TRACK_SECONDS = 1.2;
export const deltaAngle = (a, b) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function newSwimmer() {
  return {
    x: HOME.x + 0.72,
    z: HOME.z - 0.17,
    y: -0.35,
    vx: 0,
    vz: 0,
    vy: 0,
    heading: 0,
    turn: 0,
    offset: 0,
    cruise: 0,
    verticalTime: 0,
  };
}
export function fishPlace(e, time) {
  const a = time * e.pace + e.phase,
    z = e.z + e.radiusZ * Math.cos(a);
  return {
    x: e.x + e.radiusX * Math.sin(a),
    y: -routeDepth(z) - e.offset + 0.09 * Math.sin(a * 1.34),
    z,
  };
}
export function slideRocks(p, padding = 0.31) {
  for (const [x, z, rx, rz, h] of rocks) {
    if (p.y - 0.25 > bottom(x, z) + h) continue;
    const dx = (p.x - x) / (rx + padding),
      dz = (p.z - z) / (rz + padding),
      l = Math.hypot(dx, dz);
    if (l >= 1) continue;
    if (l < 0.0001) {
      p.x = x + rx + padding;
      continue;
    }
    p.x = x + (dx * (rx + padding)) / l;
    p.z = z + (dz * (rz + padding)) / l;
  }
}
export function swim(p, axisX, axisZ, dt) {
  const norm = Math.max(1, Math.hypot(axisX, axisZ)),
    speed = 2.25 + 0.8 * waterPose(p.x, p.z);
  const wx = (axisX / norm) * speed,
    wz = (axisZ / norm) * speed;
  const k = blend(Math.abs(wx) + Math.abs(wz) > 0.01 ? 10.8 : 15, dt);
  p.vx += (wx - p.vx) * k;
  p.vz += (wz - p.vz) * k;
  const oldX = p.x,
    oldZ = p.z,
    oldY = p.y;
  p.x = clamp(p.x + p.vx * dt, -5.0, 5.0);
  p.z = clamp(p.z + p.vz * dt, -15.1, 15.8);
  slideRocks(p);
  const submerged = clamp(
    -routeDepth(p.z) - p.offset,
    bottom(p.x, p.z) + 0.53,
    -0.52,
  );
  const swimming = waterPose(p.x, p.z);
  const desired =
    (bottom(p.x, p.z) + 1.06) * (1 - swimming) + submerged * swimming;
  p.y += clamp((desired - p.y) * 3.4, -1.45, 1.45) * dt;
  p.vy = (p.y - oldY) / dt;
  p.verticalTime =
    Math.abs(p.vy) > 0.31
      ? p.verticalTime + dt
      : Math.max(0, p.verticalTime - dt * 2);
  const travelled = Math.hypot(p.x - oldX, p.z - oldZ) / dt;
  p.cruise += (Math.min(1, travelled / speed) - p.cruise) * blend(5, dt);
  const heading = Math.hypot(wx, wz) > 0.09 ? Math.atan2(wx, -wz) : p.heading;
  const angle = deltaAngle(p.heading, heading);
  p.turn = clamp(angle * 1.6, -1.3, 1.3);
  p.heading += angle * blend(11, dt);
}
export function closestHit(a, b, animals) {
  const x = b.x - a.x,
    y = b.y - a.y,
    z = b.z - a.z,
    len = x * x + y * y + z * z;
  let best = null,
    first = 2;
  for (const fish of animals) {
    if (fish.caught) continue;
    const p = fish.node.position,
      u = clamp(
        ((p.x - a.x) * x + (p.y - a.y) * y + (p.z - a.z) * z) / (len || 1),
        0,
        1,
      );
    if (u >= first) continue;
    const radius = fish.s === 1 ? 0.58 : 0.53;
    if (
      Math.hypot(p.x - a.x - u * x, p.y - a.y - u * y, p.z - a.z - u * z) <=
      radius
    ) {
      first = u;
      best = fish;
    }
  }
  return best;
}
export function initialRecord(value) {
  const number = (n) =>
    Number.isFinite(n) ? clamp(Math.floor(n), 0, 999999) : 0;
  return {
    counts: [0, 1, 2].map((i) => number(value?.counts?.[i])),
    runs: number(value?.runs),
    target: [0, 1, 2].includes(value?.target) ? value.target : null,
  };
}
export function registerReturn(previous, companions) {
  const next = initialRecord(previous);
  for (const s of companions)
    next.counts[s] = Math.min(999999, next.counts[s] + 1);
  next.runs = Math.min(999999, next.runs + 1);
  return next;
}
