import test from "node:test";
import assert from "node:assert/strict";
import {
  HOME,
  RANGE,
  entries,
  rocks,
  bottom,
  newSwimmer,
  beachStart,
  waterPose,
  swim,
  slideRocks,
  fishPlace,
  inTrackRange,
  newPatrol,
  beginDart,
  advancePatrol,
  closestHit,
  registerReturn,
} from "../site/studies/captain-dive/reef-motion.mjs";
function run(p, x, z, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) swim(p, x, z, 1 / 60);
}
test("the player can stop or turn back on the shore before wading and diving", () => {
  const p = beachStart();
  const start = p.z;
  run(p, 0, 0, 2);
  assert.equal(p.z, start);
  assert.equal(waterPose(p.x, p.z), 0);
  run(p, 0, -1, 1.8);
  const wading = waterPose(p.x, p.z);
  assert.ok(wading > 0 && wading < 1);
  run(p, 0, 0, 1);
  const stopped = p.z;
  run(p, 0, 0, 1);
  assert.ok(Math.abs(p.z - stopped) < 0.001);
  run(p, 0, 1, 2);
  assert.equal(waterPose(p.x, p.z), 0);
  run(p, 0, -1, 4.5);
  assert.equal(waterPose(p.x, p.z), 1);
  assert.ok(p.y < -0.7);
});
test("departure requires swimming into shot range, including at the nearest point of a patrol", () => {
  const p = newSwimmer();
  for (const entry of entries)
    for (let t = 0; t < 18; t += 0.15) {
      const f = fishPlace(entry, t);
      assert.ok(Math.hypot(p.x - f.x, p.z - f.z) > RANGE + 0.53);
    }
  run(p, 0, -1, 1.5);
  assert.ok(p.z < HOME.z - 4);
  const atRelease = p.z;
  run(p, 0, 0, 1);
  assert.ok(atRelease - p.z < 0.23);
  assert.ok(Math.abs(p.vz) < 0.001);
});
test("short depth input and sustained travel change height continuously, leaving space above the bottom", () => {
  const p = newSwimmer();
  run(p, 0, 0, 3);
  const shallow = p.y;
  p.offset = 0.51;
  swim(p, 0, 0, 1 / 60);
  assert.ok(shallow - p.y < 0.04);
  run(p, 0, 0, 2);
  assert.ok(shallow - p.y > 0.48);
  run(p, 0, -1, 7);
  assert.ok(p.y < shallow - 2);
  assert.ok(p.y >= bottom(p.x, p.z) + 0.5);
});
test("basalt blocks a low swimmer and leaves the water above it navigable", () => {
  const [x, z, rx, , h] = rocks[6],
    floor = bottom(x, z);
  const low = { x: x + 0.1, y: floor + 0.55, z };
  slideRocks(low);
  assert.ok(low.x >= x + rx);
  const above = { x: x + 0.1, y: floor + h + 1, z };
  slideRocks(above);
  assert.equal(above.x, x + 0.1);
});
test("a manually aimed bubble strikes the first live fish along its path on the same level", () => {
  const make = (x, y, caught = false) => ({
    s: 0,
    caught,
    node: { position: { x, y, z: 0 } },
  });
  const a = { x: 0, y: -2, z: 0 },
    b = { x: 4, y: -2, z: 0 };
  const close = make(1, -2),
    far = make(2, -2);
  assert.equal(closestHit(a, b, [far, make(0.5, -3.2), close]), close);
  assert.equal(closestHit(a, b, [make(1, -2, true), make(2, -3.2)]), null);
});
test("return preserves the existing guide, its target and previous catches", () => {
  const r = { counts: [2, 0, 1], runs: 4, target: 1 };
  assert.deepEqual(registerReturn(r, [0, 1]), {
    counts: [3, 1, 1],
    runs: 5,
    target: 1,
  });
  assert.deepEqual(r, { counts: [2, 0, 1], runs: 4, target: 1 });
  assert.deepEqual(registerReturn(null, []), {
    counts: [0, 0, 0],
    runs: 1,
    target: null,
  });
});

test("circle includes the rear while both forward sectors rotate with the swimmer", () => {
  assert.ok(inTrackRange("circle", 0, 1.4, 0));
  assert.ok(!inTrackRange("circle", 0, -1.6, 0));
  for (const mode of ["sector", "burst"]) {
    assert.ok(inTrackRange(mode, 0, -2, 0));
    assert.ok(!inTrackRange(mode, 0, 1, 0));
    assert.ok(inTrackRange(mode, 2, 0, Math.PI / 2));
    assert.ok(!inTrackRange(mode, 2.01, 0, Math.PI / 2));
    for (const angle of [-51, -50, 50, 51]) {
      const rad = (angle * Math.PI) / 180;
      assert.equal(
        inTrackRange(mode, Math.sin(rad), -Math.cos(rad), 0),
        Math.abs(angle) <= 50,
      );
    }
  }
});
test("the chromis follows its original curve until approached, then accelerates smoothly round the bend", () => {
  for (const hz of [30, 60, 120]) {
    const p = newPatrol(),
      e = entries[0],
      dt = 1 / hz;
    assert.equal(advancePatrol(p, 4), 4);
    assert.ok(beginDart(p));
    const velocities = [];
    for (let i = 0; i < hz; i++) {
      const a = fishPlace(e, p.time);
      const b = fishPlace(e, advancePatrol(p, dt));
      velocities.push({ x: (b.x - a.x) / dt, z: (b.z - a.z) / dt });
    }
    const speeds = velocities.map((v) => Math.hypot(v.x, v.z));
    assert.ok(
      speeds[0] < 0.77 && Math.max(...speeds) > 2.2 && Math.max(...speeds) < 5,
    );
    assert.ok(
      velocities[0].x * velocities.at(-1).x +
        velocities[0].z * velocities.at(-1).z <
        0,
    );
    assert.ok(Math.abs(p.time - 7.5) < 1e-6);
    assert.equal(beginDart(p), false);
    advancePatrol(p, 3);
    assert.equal(beginDart(p), true);
  }
});
