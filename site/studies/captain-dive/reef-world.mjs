import * as T from "../faceted-habitat/runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1";
import { GLTFLoader } from "../faceted-habitat/runtime/vendor/GLTFLoader.js?v=2026-10-20-jeju-rov-v1";
import { Swimmer } from "../faceted-habitat/captain-swim.mjs?v=2026-11-02-parrot-1";
import { createChromis } from "../faceted-habitat/chromis-model.mjs";
import { createGardenResident } from "../faceted-habitat/garden-resident.mjs";
import { loadFish } from "../faceted-habitat/runtime/fish.js";
import { createCoastalFish } from "../faceted-habitat/coastal-fish-models.mjs";
import { eckloniaGeometry } from "../faceted-habitat/jeju-life-geometry.mjs";
import {
  bottom,
  rocks,
  entries,
  HOME,
  blend,
  fishPlace,
  coastMix,
  waterPose,
  TRACK_RADIUS,
  SECTOR_REACH,
  SECTOR_HALF_ANGLE,
  isSector,
} from "./reef-motion.mjs?v=shoal1";

export { T };
const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const asset = (name) =>
  new URL("../faceted-habitat/" + name, import.meta.url).href;
const seed = (i) => {
  const x = Math.sin(i * 78.233 + 19.31) * 43758.5453;
  return x - Math.floor(x);
};
const mat = (color) => new T.MeshLambertMaterial({ color, flatShading: true });
function mesh(root, geometry, material, x, y, z) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  root.add(m);
  return m;
}
function batch(scene, geometry, material, items) {
  const instances = new T.InstancedMesh(geometry, material, items.length),
    o = new T.Object3D();
  items.forEach(([x, y, z, sx, sy, sz, angle, color], i) => {
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.rotation.y = angle;
    o.updateMatrix();
    instances.setMatrixAt(i, o.matrix);
    if (color) instances.setColorAt(i, new T.Color(color));
  });
  scene.add(instances);
  return instances;
}
function makeFloor(scene) {
  const g = new T.PlaneGeometry(56, 64, 65, 78);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -4);
  const p = g.attributes.position,
    colors = [],
    beach = new T.Color("#e7c183"),
    sand = new T.Color("#b9d5bd"),
    outer = new T.Color("#347d78"),
    deep = new T.Color("#7fbcb3"),
    c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    p.setY(i, bottom(x, z));
    const lane = Math.abs(x - 0.77 * Math.sin(z * 0.32));
    c.copy(sand)
      .lerp(deep, T.MathUtils.smoothstep(-z, 1, 16) * 0.9)
      .lerp(outer, T.MathUtils.smoothstep(lane, 0.8, 5.2));
    c.lerp(beach, coastMix(z));
    c.multiplyScalar(
      0.94 + 0.06 * Math.sin(z * 0.92 + x * 0.5) + seed(i) * 0.045,
    );
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const floorMat = new T.MeshLambertMaterial({ vertexColors: true });
  const time = { value: 0 };
  floorMat.onBeforeCompile = (s) => {
    s.uniforms.waterTime = time;
    s.vertexShader =
      "varying vec2 sandXZ;\n" +
      s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nsandXZ=position.xz;",
      );
    s.fragmentShader =
      "uniform float waterTime;varying vec2 sandXZ;\n" +
      s.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat waves=sin(sandXZ.x*2.55+sin(sandXZ.y*2.0+waterTime*.46))+sin(sandXZ.y*2.15+sin(sandXZ.x*2.55-waterTime*.28));diffuseColor.rgb*=.97+.135*smoothstep(1.46,1.91,waves)*(1.-smoothstep(9.,13.,sandXZ.y));",
      );
  };
  scene.add(new T.Mesh(g, floorMat));
  return time;
}
function makeCliffs(scene, rockAsset) {
  const templates = [];
  rockAsset.scene.traverse((n) => {
    if (n.isMesh && ["rocks-2", "rocks-3"].includes(n.name))
      templates.push(n.geometry);
  });
  const darks = ["#515f68", "#606d70", "#465c63", "#586a6f"];
  for (const [i, source] of templates.entries()) {
    const g = source.clone();
    g.computeBoundingBox();
    const box = g.boundingBox,
      center = box.getCenter(v()),
      size = box.getSize(v());
    g.translate(-center.x, -box.min.y, -center.z);
    g.scale(1 / size.x, 1 / size.y, 1 / size.z);
    const items = [];
    rocks.forEach(([x, z, rx, rz, h], j) => {
      if (j % 2 !== i) return;
      items.push([
        x,
        bottom(x, z) - 0.12,
        z,
        rx * 2,
        h,
        rz * 2,
        0,
        darks[j % 4],
      ]);
      const a = (j % 2 ? 1 : -1) * 0.72,
        xx = x + a * rx,
        zz = z + 0.64 * rz;
      items.push([
        xx,
        bottom(xx, zz) - 0.1,
        zz,
        rx * 0.88,
        h * 0.42,
        rz * 0.9,
        0.31,
        darks[(j + 1) % 4],
      ]);
    });
    batch(scene, g, mat("#ffffff"), items);
  }
}
function makeKelp(scene) {
  const tint = ["#49784c", "#63874b", "#437968", "#779453"];
  const time = { value: 0 },
    captain = { value: v() };
  for (let kind = 0; kind < 2; kind++) {
    const plant = new T.MeshLambertMaterial({
      color: "#ffffff",
      side: T.DoubleSide,
      vertexColors: true,
    });
    plant.onBeforeCompile = (s) => {
      s.uniforms.kelpClock = time;
      s.uniforms.swimmerAt = captain;
      s.vertexShader =
        "uniform float kelpClock;uniform vec3 swimmerAt;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvec3 rootPos=instanceMatrix[3].xyz;vec2 away=rootPos.xz-swimmerAt.xz;float tip=max(position.y,0.0);transformed.x+=tip*tip*.068*sin(kelpClock*1.2+rootPos.z+rootPos.x*.4);float nearPlayer=(1.0-smoothstep(.2,1.5,length(away)))*(1.0-smoothstep(.7,2.5,abs(rootPos.y+1.0-swimmerAt.y)));transformed.xz+=normalize(away+.0001)*tip*tip*.18*nearPlayer;",
        );
    };
    const items = [];
    for (let j = 0; j < 81; j++) {
      const z = -18 + seed(j * 5 + kind) * 30,
        side = j % 2 ? 1 : -1;
      const x = side * (2.55 + seed(j * 5 + 2 + kind) * 5.15);
      const h = 0.53 + seed(j * 9 + 4 + kind) * 0.83;
      const onRock = rocks.some(
        ([rx, rz, w, d]) => ((x - rx) / w) ** 2 + ((z - rz) / d) ** 2 < 0.74,
      );
      if (!onRock && bottom(x, z) < -1.8)
        items.push([
          x,
          bottom(x, z) - 0.04,
          z,
          h,
          h * (1 + seed(j + kind) * 0.34),
          h,
          seed(j * 3 + kind) * 6.28,
          tint[j % 4],
        ]);
    }
    batch(scene, eckloniaGeometry(kind), plant, items);
  }
  return { time, captain };
}
function makeBuoy(scene) {
  const buoy = new T.Group();
  scene.add(buoy);
  buoy.position.set(HOME.x, 0, HOME.z);
  const orange = mat("#ff8652"),
    cream = mat("#fff1d2"),
    dark = mat("#3b5259");
  const float = new T.Group();
  buoy.add(float);
  mesh(float, new T.SphereGeometry(0.42, 12, 8), orange, 0, -0.05, 0).scale.y =
    0.9;
  mesh(
    float,
    new T.CylinderGeometry(0.408, 0.408, 0.13, 12),
    cream,
    0,
    -0.03,
    0,
  );
  mesh(float, new T.CylinderGeometry(0.025, 0.025, 0.86, 6), cream, 0, 0.63, 0);
  const flag = mesh(
    float,
    new T.PlaneGeometry(0.5, 0.27),
    new T.MeshBasicMaterial({ color: "#ff8956", side: T.DoubleSide }),
    0.23,
    0.89,
    0,
  );
  flag.rotation.y = -0.25;
  const low = bottom(0, HOME.z);
  mesh(
    buoy,
    new T.CylinderGeometry(0.028, 0.033, -low, 7),
    mat("#ba945f"),
    0,
    low / 2,
    0,
  );
  mesh(
    buoy,
    new T.DodecahedronGeometry(0.43),
    dark,
    0,
    low + 0.15,
    0,
  ).scale.set(1, 0.48, 0.8);
  const zone = mesh(
    buoy,
    new T.TorusGeometry(1.02, 0.036, 5, 54),
    new T.MeshBasicMaterial({
      color: "#fff0a5",
      transparent: true,
      opacity: 0.76,
    }),
    0,
    low + 0.16,
    0,
  );
  zone.rotation.x = -Math.PI / 2;
  return { float, zone };
}
function shadow(scene) {
  const m = mesh(
    scene,
    new T.CircleGeometry(1, 20),
    new T.MeshBasicMaterial({
      color: "#154c56",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    0,
    0,
    0,
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}
function shoreline(scene) {
  const water = mesh(
    scene,
    new T.PlaneGeometry(55, 56),
    new T.MeshBasicMaterial({
      color: "#47bbbd",
      transparent: true,
      depthWrite: false,
      opacity: 0.36,
    }),
    0,
    0.012,
    -7,
  );
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 1;
  const surfaceTime = { value: 0 };
  water.material.onBeforeCompile = (shader) => {
    shader.uniforms.surfaceTime = surfaceTime;
    shader.vertexShader =
      "varying vec2 waveXY;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nwaveXY = position.xy;",
      );
    shader.fragmentShader =
      "varying vec2 waveXY; uniform float surfaceTime;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
       float crest = sin(waveXY.y*5.2 + sin(waveXY.x*1.1 + surfaceTime*.5) + surfaceTime*1.2);
       float rippleMask = sin(waveXY.x*2.1 + waveXY.y*.7) + sin(waveXY.y*1.3 - surfaceTime*.4);
       float glint = smoothstep(.94,.995,crest)*smoothstep(.6,1.5,rippleMask);
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.70,.96,.92), glint*.85);`,
      );
  };
  const foam = new T.Group();
  scene.add(foam);
  const foamMat = new T.MeshBasicMaterial({
    color: "#fffae5",
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  for (let i = 0; i < 27; i++) {
    const x = (i - 13) * 0.87;
    const lip = mesh(
      foam,
      new T.CircleGeometry(1, 12),
      foamMat,
      x,
      0.045,
      11.85 + Math.sin(x * 0.7) * 0.13,
    );
    lip.rotation.x = -Math.PI / 2;
    lip.scale.set(0.48 + seed(i) * 0.3, 0.055 + seed(i + 1) * 0.035, 1);
    lip.renderOrder = 2;
  }
  const pebbles = [];
  for (let i = 0; i < 37; i++) {
    const x = (seed(i + 21) - 0.5) * 18,
      z = 12.4 + seed(i + 84) * 5;
    const size = 0.1 + seed(i + 43) * 0.23;
    pebbles.push([
      x,
      bottom(x, z) + 0.07,
      z,
      size * 1.5,
      size * 0.8,
      size,
      i,
      "#655d59",
    ]);
  }
  batch(scene, new T.DodecahedronGeometry(1), mat("#ffffff"), pebbles);
  const post = mat("#98663f"),
    cap = mat("#fff0c9");
  for (const x of [-2.1, 2.2]) {
    const z = 13.4,
      y = bottom(x, z);
    mesh(
      scene,
      new T.CylinderGeometry(0.092, 0.11, 0.82, 8),
      post,
      x,
      y + 0.39,
      z,
    );
    mesh(
      scene,
      new T.CylinderGeometry(0.098, 0.098, 0.11, 8),
      cap,
      x,
      y + 0.68,
      z,
    );
  }
  const ring = mesh(
    scene,
    new T.TorusGeometry(0.28, 0.07, 8, 24),
    mat("#f07b47"),
    -2.1,
    bottom(-2.1, 13.4) + 0.4,
    13.46,
  );
  ring.rotation.y = 0.15;
  const wakes = [0, 1].map(() => {
    const wake = mesh(
      scene,
      new T.RingGeometry(0.93, 1, 24),
      new T.MeshBasicMaterial({
        color: "#e4fff9",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      0,
      0.048,
      0,
    );
    wake.rotation.x = -Math.PI / 2;
    wake.renderOrder = 2;
    return wake;
  });
  return { water, foam, wakes, surfaceTime };
}
function makeSector(parent) {
  const fan = new T.Group();
  parent.add(fan);
  const arc = [];
  for (let i = 0; i <= 48; i++) {
    const angle = SECTOR_HALF_ANGLE * ((2 * i) / 48 - 1);
    arc.push(
      v(SECTOR_REACH * Math.sin(angle), 0, -SECTOR_REACH * Math.cos(angle)),
    );
  }
  const points = [v(), ...arc];
  const surface = new T.BufferGeometry().setFromPoints(points);
  const indices = [];
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  surface.setIndex(indices);
  mesh(
    fan,
    surface,
    new T.MeshBasicMaterial({
      color: "#fff1a0",
      transparent: true,
      opacity: 0.15,
      side: T.DoubleSide,
      depthWrite: false,
    }),
    0,
    0,
    0,
  );
  const edge = new T.LineLoop(
    new T.BufferGeometry().setFromPoints(points),
    new T.LineBasicMaterial({
      color: "#fff2a0",
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    }),
  );
  edge.renderOrder = 2;
  fan.add(edge);
  return fan;
}
export async function createWorld(canvas, singleChromis = false) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color("#55adba");
  scene.fog = new T.Fog("#5aa6b4", 14, 39);
  const camera = new T.OrthographicCamera(-5, 5, 9, -9, 0.1, 85),
    center = v(),
    projected = v(),
    view = v(),
    aimRay = new T.Raycaster();
  scene.add(new T.HemisphereLight("#d9ffff", "#88a29b", 1.65));
  const light = new T.DirectionalLight("#fff4d2", 1.92);
  light.position.set(-6, 13, 2.5);
  scene.add(light);
  const loader = new GLTFLoader();
  const [pirate, stones, puffer, snapper] = await Promise.all([
    loader.loadAsync(asset("runtime/assets/pirate/captain.gltf")),
    loader.loadAsync(asset("assets/rock-modules.glb")),
    singleChromis ? null : loadFish({ kind: "puffer" }),
    singleChromis
      ? null
      : loader.loadAsync(asset("assets/RedSnapper-source.glb")),
  ]);
  const floorTime = makeFloor(scene);
  makeCliffs(scene, stones);
  const shore = shoreline(scene);
  const radar = new T.Group();
  scene.add(radar);
  const ring = mesh(
    radar,
    new T.RingGeometry(TRACK_RADIUS - 0.038, TRACK_RADIUS, 64),
    new T.MeshBasicMaterial({
      color: "#fff2a0",
      transparent: true,
      opacity: 0.9,
      side: T.DoubleSide,
      depthWrite: false,
    }),
    0,
    0,
    0,
  );
  ring.rotation.x = -Math.PI / 2;
  const sector = makeSector(radar);
  sector.visible = false;
  radar.visible = false;
  const kelp = makeKelp(scene),
    buoy = makeBuoy(scene);
  const pebbles = [];
  for (let i = 0; i < 130; i++) {
    const x = seed(i * 3) * 16 - 8,
      z = seed(i * 3 + 1) * 30 - 19,
      k = 0.045 + 0.12 * seed(i * 3 + 2);
    pebbles.push([
      x,
      bottom(x, z) + k * 0.18,
      z,
      k * 1.5,
      k * 0.45,
      k,
      i,
      ["#909b84", "#bac2a3", "#68928a"][i % 3],
    ]);
  }
  batch(scene, new T.DodecahedronGeometry(1, 0), mat("#ffffff"), pebbles);
  const particles = new Float32Array(96 * 3);
  for (let i = 0; i < 96; i++) {
    particles[i * 3] = seed(i * 3) * 18 - 9;
    particles[i * 3 + 1] = -seed(i * 3 + 1) * 5.6;
    particles[i * 3 + 2] = seed(i * 3 + 2) * 33 - 21;
  }
  const dustGeo = new T.BufferGeometry();
  dustGeo.setAttribute("position", new T.BufferAttribute(particles, 3));
  const dust = new T.Points(
    dustGeo,
    new T.PointsMaterial({
      color: "#d7ffff",
      size: 0.04,
      transparent: true,
      opacity: 0.57,
      depthWrite: false,
    }),
  );
  scene.add(dust);
  const captain = new Swimmer(pirate, scene, bottom),
    captainShadow = shadow(scene);
  const walkPose = captain.base.map(([bone]) => ({
    bone,
    position: v(),
    rotation: new T.Quaternion(),
  }));
  const seaTint = new T.Color("#5aa6b4"),
    skyTint = new T.Color("#a2dccc");
  const animals = (singleChromis ? entries.slice(0, 1) : entries).map(
    (e, i) => {
      const node =
        e.s === 0
          ? createChromis({ length: 1.04 })
          : e.s === 1
            ? createGardenResident(puffer).root
            : createCoastalFish(snapper, { kind: "wrasse", length: 1.17 });
      if (e.s === 1) node.scale.multiplyScalar(1.45);
      const p = fishPlace(e, 0);
      node.position.set(p.x, p.y, p.z);
      scene.add(node);
      return {
        e,
        s: e.s,
        i,
        node,
        shadow: shadow(scene),
        caught: false,
        slot: -1,
        heading: 0,
        bind: 0,
      };
    },
  );
  const sphere = new T.SphereGeometry(1, 12, 9);
  const bubbleMaterial = new T.MeshPhongMaterial({
    color: "#b2f9ff",
    emissive: "#348d9d",
    shininess: 90,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const bubble = mesh(scene, sphere, bubbleMaterial, 0, 0, 0);
  bubble.visible = false;
  const edge = mesh(
    bubble,
    new T.TorusGeometry(0.93, 0.043, 5, 32),
    new T.MeshBasicMaterial({
      color: "#dcffff",
      transparent: true,
      opacity: 0.88,
    }),
    0,
    0,
    0,
  );
  function resize() {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    const aspect = w / Math.max(h, 1),
      sy = T.MathUtils.clamp(9.65 / aspect, 9.9, 21.6);
    camera.left = (-sy * aspect) / 2;
    camera.right = -camera.left;
    camera.top = sy / 2;
    camera.bottom = -sy / 2;
    camera.updateProjectionMatrix();
  }
  function follow(p, dt, snap = false) {
    view.set(p.x + 0.12 * p.vx, p.y, p.z - 0.56 + 0.15 * p.vz);
    if (snap) center.copy(view);
    else center.lerp(view, blend(8, dt));
    camera.position.copy(center).add(offset);
    camera.lookAt(center);
    camera.updateMatrixWorld();
  }
  const offset = v(0, 13.6, 13.0);
  function project(pos) {
    projected.set(pos.x, pos.y, pos.z).project(camera);
    return {
      x: ((projected.x + 1) * canvas.clientWidth) / 2,
      y: ((1 - projected.y) * canvas.clientHeight) / 2,
    };
  }
  const shotPlane = new T.Plane(v(0, 1, 0), 0),
    hit = v(),
    cursor = new T.Vector2();
  function aimAt(x, y, height) {
    cursor.set(
      (2 * x) / canvas.clientWidth - 1,
      1 - (2 * y) / canvas.clientHeight,
    );
    aimRay.setFromCamera(cursor, camera);
    shotPlane.constant = -height;
    if (!aimRay.ray.intersectPlane(shotPlane, hit)) return null;
    return { x: hit.x, y: hit.y, z: hit.z };
  }
  function shadowAt(s, p, length, width, heading) {
    s.position.set(p.x, bottom(p.x, p.z) + 0.048, p.z);
    s.rotation.z = heading;
    s.scale.set(width, length, 1);
  }
  function draw(p, t, dt) {
    floorTime.value = t;
    kelp.time.value = t;
    kelp.captain.value.set(p.x, p.y, p.z);
    buoy.float.position.y = Math.sin(t * 1.7) * 0.075;
    buoy.float.rotation.z = Math.sin(t * 0.96) * 0.06;
    buoy.zone.scale.setScalar(1 + Math.sin(t * 2) * 0.035);
    dust.position.y = Math.sin(t * 0.22) * 0.24;
    const swimPose = waterPose(p.x, p.z);
    const submerge = T.MathUtils.smoothstep(-p.y, 0.15, 1.4);
    scene.fog.color.copy(skyTint).lerp(seaTint, submerge);
    scene.fog.near = 25 - 11 * submerge;
    scene.background.copy(scene.fog.color);
    shore.surfaceTime.value = t;
    shore.water.material.opacity = 0.52 * (1 - submerge);
    shore.water.visible = submerge < 0.99;
    shore.foam.position.z = 0.18 * Math.sin(t * 1.4);
    shore.foam.visible = submerge < 0.94;
    for (const [i, wake] of shore.wakes.entries()) {
      const phase = (t * 1.1 + i * 0.5) % 1;
      wake.visible = swimPose > 0.02 && submerge < 0.8 && p.cruise > 0.06;
      if (wake.visible) {
        wake.position.set(
          p.x - p.vx * phase * 0.2,
          0.052,
          p.z - p.vz * phase * 0.2,
        );
        wake.scale.setScalar(0.23 + 0.74 * phase);
        wake.material.opacity = (1 - phase) * p.cruise * 0.45 * (1 - submerge);
      }
    }
    dust.visible = submerge > 0.25;
    radar.position.set(p.x, p.y, p.z);
    radar.rotation.y = -p.heading;
    if (swimPose < 1) {
      captain.actor.userData.controller.update(dt, p.cruise > 0.09);
      for (const joint of walkPose) {
        joint.position.copy(joint.bone.position);
        joint.rotation.copy(joint.bone.quaternion);
      }
    }
    captain.update(dt, {
      position: [p.x, p.y, p.z],
      velocity: [p.vx, p.vy, p.vz],
      heading: p.heading,
      turnRate: p.turn,
      forwardSpeed: Math.hypot(p.vx, p.vz),
      time: t,
      cruise: p.cruise,
      effort: 0.65 + p.cruise * 0.35,
      state: "swim",
    });
    if (swimPose < 1) {
      captain.tilt.rotation.x *= swimPose;
      captain.tilt.rotation.z *= swimPose;
      for (const joint of walkPose) {
        joint.bone.position.lerp(joint.position, 1 - swimPose);
        joint.bone.quaternion.slerp(joint.rotation, 1 - swimPose);
      }
    }
    shadowAt(captainShadow, p, 0.51, 0.31, p.heading);
    for (const f of animals) {
      shadowAt(f.shadow, f.node.position, 0.36, 0.2, f.heading);
      f.node.userData.update?.(dt * (f.patrol?.darting && !f.caught ? 2.2 : 1));
    }
    if (bubble.visible) edge.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
  }
  resize();
  const onRadarPlane = (p, y) => ({
    x: p.x,
    z: p.z + ((y - p.y) * offset.z) / offset.y,
  });
  return {
    animals,
    bubble,
    radar,
    setRangeMode(mode) {
      sector.visible = isSector(mode);
      ring.visible = !sector.visible;
    },
    onRadarPlane,
    follow,
    resize,
    draw,
    project,
    aimAt,
  };
}
