import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import { GLTFLoader } from './runtime/vendor/GLTFLoader.js?v=2026-10-20-jeju-rov-v1';
import { loadFish } from './runtime/fish.js';
import { Swimmer } from './actor.mjs';
import { createChromis } from './chromis-model.mjs';
import { createGardenResident } from './garden-resident.mjs';
import { eckloniaGeometry } from './jeju-life-geometry.mjs';
import { createReturnSite } from './return-site.mjs';
import { CaptureAudio } from './audio.mjs';

const $ = id => document.getElementById(id);
const vec = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const { clamp } = T.MathUtils;
const castRange = 5;
const fishDepth = 1.5;
const swimHint = '조작부를 위로 밀어 모래 물길을 따라가요.';
const aimModes = {
  assist: { name: '이름으로 조준', help: '물고기 이름을 누르고, 가까이에서 물방울 버튼을 눌러요.' },
  direct: { name: '직접 조준', help: '물속을 눌러 조준하고, 손을 떼면 그 자리에 물방울을 쏴요.' },
};
const species = [
  { id: 'chromis', name: '자리돔', hint: '모래 물길이 처음 굽는 쪽', x: -2.3, z: -4, speed: .65 },
  { id: 'puffer', name: '가시복', hint: '감태숲 안쪽의 바위 곁', x: 2.1, z: -26, speed: .55 },
];
const player = vec(0, 1.65, 13);
const startPosition = player.clone();
const velocity = vec();
const motion = vec();
const follow = player.clone();
const screenPoint = vec();
const castOrigin = vec();
const castTarget = vec();
const aimRay = new T.Raycaster();
const aimPlane = new T.Plane(vec(0, 1, 0), -fishDepth);
const aimScreen = new T.Vector2();
const aimPoint = vec();
const audio = new CaptureAudio();
const storagePrefix = 'captains-aquarium-jeju-quick-dive:';
const collected = new Set();
const portraits = new Map();
const keys = new Set();
let stage = 'intro';
let aimMode = 'assist';
let aimPointer = null;
let heading = 0;
let sceneTime = 0;
let last = 0;
let selected = null;
let shot = null;
let count = 0;
let status = '';
let storageAvailable = true;
let previousPanel;
let previousCard;
let pointer = null;
let swipeX = 0;
let swipeZ = 0;
let returnAlongPath = false;

const scene = new T.Scene();
scene.background = new T.Color('#408989');
scene.fog = new T.FogExp2(scene.background, .055);
const camera = new T.PerspectiveCamera(53, 1, .1, 65);
const renderer = new T.WebGLRenderer({ canvas: $('sea'), antialias: false, powerPreference: 'low-power' });
renderer.setPixelRatio(1);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
scene.add(new T.HemisphereLight('#bcefe7', '#675c46', 2.05));
const sunlight = new T.DirectionalLight('#fff0c4', 2.05);
sunlight.position.set(-4, 12, 5);
scene.add(sunlight);

const placements = [
  [-4.9, 10, 3.1, 1.55], [4.9, 9, 3.2, 1.5], [-5.1, 4.6, 3.5, 1.85], [5.1, 3.4, 3.3, 1.5],
  [-5.15, -.6, 3.9, 1.8], [5.2, -2.4, 3.7, 2.1], [-5.1, -6.4, 3.4, 1.3], [5.15, -8, 3.2, 1.65],
  [-5.15, -11.9, 3.5, 1.55], [5.2, -13.8, 3.9, 1.9], [-5.15, -17.9, 3.6, 1.35],
  [5.25, -20.7, 3.8, 1.65], [-5.3, -23.9, 4.1, 1.6], [5.1, -25.8, 3.5, 2.25], [-4.1, -29.6, 3.9, 1.65], [1.9, -31.5, 4.5, 1.5],
];

function makeSeabed(rocks) {
  const floor = new T.PlaneGeometry(54, 80, 34, 51);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, -.08, -7);
  const points = floor.attributes.position;
  const colors = [];
  const sand = new T.Color('#c3b686');
  const shore = new T.Color('#677c6c');
  for (let i = 0; i < points.count; i += 1) {
    const x = points.getX(i);
    const z = points.getZ(i);
    const middle = Math.sin((z + 2) * .22) * .9;
    const color = sand.clone().lerp(shore, clamp((Math.abs(x - middle) - 1) / 4.5, 0, 1));
    color.multiplyScalar(.91 + .09 * Math.sin(x * 1.6 + z) ** 2);
    colors.push(color.r, color.g, color.b);
  }
  floor.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  scene.add(new T.Mesh(floor, new T.MeshLambertMaterial({ vertexColors: true })));

  const templates = new Map();
  rocks.scene.traverse(object => {
    if (object.isMesh) templates.set(object.name, object.geometry);
  });
  const dummy = new T.Object3D();
  const rockMaterial = new T.MeshLambertMaterial({ color: '#526966' });
  for (const part of [2, 3]) {
    const geometry = templates.get('rocks-' + part).clone();
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(vec());
    const center = geometry.boundingBox.getCenter(vec());
    geometry.translate(-center.x, -geometry.boundingBox.min.y, -center.z);
    geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
    const beds = placements.filter((_, i) => i % 2 === part % 2);
    const batch = new T.InstancedMesh(geometry, rockMaterial, beds.length);
    beds.forEach(([x, z, width, height], i) => {
      dummy.position.set(x, -.18, z);
      dummy.scale.set(width, height, 3.15);
      dummy.rotation.set(0, i * .24, 0);
      dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, new T.Color(i % 2 ? '#d2e2cf' : '#a9cfcc'));
    });
    scene.add(batch);
  }

  const material = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  for (let variant = 0; variant < 2; variant += 1) {
    const plants = placements.filter((_, i) => i % 2 === variant);
    const batch = new T.InstancedMesh(eckloniaGeometry(variant), material, plants.length * 2);
    plants.forEach(([x, z, , height], i) => {
      for (let j = 0; j < 2; j += 1) {
        dummy.position.set(x * .91 + (j - .5) * .7, height * .66, z + (j - .5) * 1.1);
        dummy.scale.setScalar(.92 + (i % 3) * .21 + j * .22);
        dummy.rotation.set(0, i * 1.3 + j, 0);
        dummy.updateMatrix();
        batch.setMatrixAt(i * 2 + j, dummy.matrix);
        batch.setColorAt(i * 2 + j, new T.Color(j ? '#b6c68a' : '#a3bc91'));
      }
    });
    scene.add(batch);
  }
}

const returnSite = createReturnSite(() => 0);
returnSite.root.position.set(-1.7, 0, startPosition.z + 1.1);
scene.add(returnSite.root);

const bubble = new T.Mesh(
  new T.SphereGeometry(.29, 12, 8),
  new T.MeshBasicMaterial({ color: '#a6ffee', wireframe: true, transparent: true, opacity: .7 }),
);
bubble.visible = false;
scene.add(bubble);

const aim = new T.Mesh(
  new T.TorusGeometry(.42, .016, 4, 24),
  new T.MeshBasicMaterial({ color: '#ffde86', transparent: true, opacity: .85 }),
);
aim.visible = false;
scene.add(aim);

const animals = [];
let captain;

function portrait(spec, createModel) {
  const animal = createModel();
  const background = new T.Scene();
  background.background = new T.Color('#418382');
  background.add(new T.HemisphereLight('#d4f6db', '#758481', 2.9));
  const lamp = new T.DirectionalLight('#fff2ca', 1.9);
  lamp.position.set(2, 3, 5);
  background.add(lamp, animal);
  animal.rotation.y = -.97;
  const portraitCamera = new T.PerspectiveCamera(33, 1.55, .05, 6);
  portraitCamera.position.set(0, .13, spec.id === 'puffer' ? 2.15 : 2.25);
  portraitCamera.lookAt(0, 0, 0);
  renderer.setSize(310, 200, false);
  renderer.render(background, portraitCamera);
  portraits.set(spec.id, renderer.domElement.toDataURL('image/webp', .8));
}

function loadRecord() {
  try {
    for (const spec of species) {
      if (localStorage.getItem(storagePrefix + spec.id) === '1') collected.add(spec.id);
    }
  } catch {
    storageAvailable = false;
  }
}

function record(spec) {
  collected.add(spec.id);
  if (!storageAvailable) return;
  try {
    localStorage.setItem(storagePrefix + spec.id, '1');
  } catch {
    storageAvailable = false;
  }
}

function updateStatus(next) {
  if (status === next) return;
  status = next;
  $('status').textContent = next;
}

function resetFish(fish) {
  fish.caught = false;
  fish.root.position.set(fish.spec.x, fishDepth, fish.spec.z);
  fish.root.rotation.y = Math.PI / 2;
}

function attachFish(spec, model) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'target';
  button.textContent = spec.name;
  button.setAttribute('aria-pressed', 'false');
  button.hidden = true;
  const fish = { spec, root: model, button, destination: vec(), caught: false };
  resetFish(fish);
  $('targets').append(button);
  button.addEventListener('click', () => {
    if (stage !== 'dive' || aimMode !== 'assist' || fish.caught) return;
    selected = selected === fish ? null : fish;
    updateStatus(selected ? selected.spec.name + '을 살펴봐요.' : '모래 물길을 따라 더 둘러봐요.');
  });
  animals.push(fish);
  scene.add(model);
}

function adjustView() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = camera.aspect > 1.1 ? 53 : 63;
  camera.updateProjectionMatrix();
}

function positionView(dt) {
  follow.lerp(player, 1 - Math.exp(-dt * 6));
  const wide = camera.aspect > 1.1;
  const nudge = selected ? clamp((selected.root.position.x - follow.x) * .38, -1.3, 1.3) : 0;
  camera.position.set(follow.x + nudge * .72, follow.y + (wide ? 5.2 : 6.25), follow.z + (wide ? 7.2 : 8.6));
  camera.lookAt(follow.x + nudge, follow.y - .35, follow.z - (wide ? 4 : 4.8));
  camera.updateMatrixWorld();
}

function movePlayer(dt) {
  if (stage === 'return') {
    if (!returnAlongPath && Math.abs(player.x) < .10) returnAlongPath = true;
    motion.set(returnAlongPath ? 0 : -Math.sign(player.x), 0, returnAlongPath ? 1 : 0);
  } else {
    const horizontal = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    const depth = Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW'));
    motion.set(swipeX + horizontal, 0, swipeZ + depth).clampLength(0, 1);
  }
  const speed = stage === 'return' ? 1.72 : .97;
  velocity.lerp(motion.multiplyScalar(speed), 1 - Math.exp(-dt * 8));
  player.x = clamp(player.x + velocity.x * dt, -3.15, 3.15);
  player.z = clamp(player.z + velocity.z * dt, -29.5, 13.4);
  const cruise = clamp(velocity.length() / speed, 0, 1);
  const desired = cruise > .055 ? Math.atan2(velocity.x, -velocity.z) : heading;
  const turn = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
  heading += turn * (1 - Math.exp(-dt * 6));
  captain.update(dt, {
    position: player.toArray(), velocity: velocity.toArray(), heading, turnRate: clamp(turn * 1.5, -1.25, 1.25),
    forwardSpeed: velocity.length(), time: sceneTime, cruise, effort: .6 + cruise * .4, state: 'swim',
  });
  if (stage === 'return' && returnAlongPath && player.z >= startPosition.z - .2) finish();
}

function updateFish(dt) {
  const blend = 1 - Math.exp(-dt * 4.4);
  for (const [index, fish] of animals.entries()) {
    const { spec, root, destination, caught } = fish;
    const phase = sceneTime * spec.speed + index * 1.5;
    if (caught) {
      destination.set(player.x + (index ? .85 : -.85), 1.75, player.z + (stage === 'return' ? -.75 : .7));
    } else {
      destination.set(spec.x + Math.sin(phase) * .76, fishDepth + Math.cos(phase) * .13, spec.z + Math.cos(phase) * .40);
    }
    const x = destination.x - root.position.x;
    const z = destination.z - root.position.z;
    if (Math.hypot(x, z) > .035) {
      const desired = Math.atan2(x, z);
      const turn = Math.atan2(Math.sin(desired - root.rotation.y), Math.cos(desired - root.rotation.y));
      root.rotation.y += turn * blend;
    }
    root.position.lerp(destination, blend);
    root.userData.update(dt * (caught ? 1 : .65));
  }
}

function fire() {
  if (aimMode === 'assist' && selected && !selected.caught && !$('shoot').disabled) {
    launch(selected.root.position, selected);
  }
}

function launch(point, target = null) {
  if (stage !== 'dive' || shot || point.distanceTo(player) > castRange) return;
  castOrigin.copy(player);
  castOrigin.y += .18;
  castTarget.copy(point);
  shot = { fish: target, elapsed: 0, time: clamp(castOrigin.distanceTo(castTarget) / 5.4, .21, .87) };
  bubble.scale.setScalar(1);
  bubble.position.copy(castOrigin);
  bubble.visible = true;
  updateStatus('물방울이 날아가고 있어요.');
  audio.cue('shot');
}

function updateShot(dt) {
  if (!shot) return;
  shot.elapsed += dt;
  if (shot.impact) {
    bubble.position.copy(shot.fish.root.position);
    bubble.scale.setScalar(1.65 + (shot.elapsed - shot.time) * .65);
    if (shot.elapsed < shot.time + .40) return;
    shot = null;
    bubble.visible = false;
    return;
  }
  const fraction = Math.min(1, shot.elapsed / shot.time);
  bubble.position.lerpVectors(castOrigin, castTarget, fraction);
  bubble.position.y += Math.sin(fraction * Math.PI) * .30;
  if (fraction < 1) return;
  const candidates = shot.fish ? [shot.fish] : animals;
  const fish = candidates.find(animal => !animal.caught && animal.root.position.distanceTo(castTarget) <= .37);
  if (!fish) {
    shot = null;
    bubble.visible = false;
    audio.cue('miss');
    updateStatus(aimMode === 'direct' ? '빗나갔어요. 물고기가 갈 자리를 조금 앞서 노려봐요.' : '빗나갔어요. 조금 더 가까이에서 다시 노려요.');
    return;
  }
  shot.fish = fish;
  shot.impact = true;
  fish.caught = true;
  count += 1;
  selected = null;
  audio.cue('impact');
  $('companions').textContent = '동행 ' + count + '마리';
  updateStatus(fish.spec.name + '과 함께해요.' + (count < 2 ? ' 더 둘러보거나 배로 돌아가요.' : ' 배로 돌아가 도감을 열어봐요.'));
}

function updateHud() {
  const diving = stage === 'dive';
  $('place').textContent = player.z > 4 ? '감태숲 입구' : player.z > -13 ? '모래 물길' : '감태숲 안쪽';
  for (const fish of animals) {
    screenPoint.copy(fish.root.position);
    if (aimMode === 'assist') screenPoint.y += .47;
    screenPoint.project(camera);
    const visible = diving && !fish.caught && fish.root.position.distanceTo(player) < 11 &&
      screenPoint.z > -1 && screenPoint.z < 1 && Math.abs(screenPoint.x) < .91 && screenPoint.y < .66 && screenPoint.y > -.62;
    fish.button.hidden = !visible;
    if (!visible) continue;
    const labelX = (screenPoint.x + 1) * innerWidth * .5;
    fish.button.style.left = (aimMode === 'direct' ? labelX : clamp(labelX, 55, innerWidth - 55)) + 'px';
    fish.button.style.top = (1 - screenPoint.y) * 50 + '%';
    fish.button.setAttribute('aria-pressed', String(fish === selected));
  }
  if (aimMode === 'direct') {
    $('shoot').hidden = true;
    const point = aimPointer === null ? null : resolveAimPoint();
    aim.visible = diving && !shot && !!point;
    if (aim.visible) {
      aim.position.copy(point);
      aim.quaternion.copy(camera.quaternion);
      aim.material.color.set(point.distanceTo(player) <= castRange ? '#ffde86' : '#ef9a85');
    }
    if (diving && !count && status === swimHint && animals.some(fish => !fish.button.hidden)) {
      updateStatus('물고기 앞을 눌러 조준하고 손을 떼어 쏘세요.');
    }
    return;
  }
  if (selected && (selected.caught || selected.root.position.distanceTo(player) >= 12)) selected = null;
  const distance = selected?.root.position.distanceTo(player) ?? Infinity;
  $('shoot').hidden = !diving || !selected;
  const readyToShoot = diving && distance <= castRange && !shot && !selected.button.hidden;
  $('shoot').disabled = !readyToShoot;
  aim.visible = readyToShoot;
  if (aim.visible) {
    aim.material.color.set('#ffde86');
    aim.position.copy(selected.root.position);
    aim.quaternion.copy(camera.quaternion);
  }
  if (!diving || shot) return;
  if (!selected && !count && animals.some(fish => !fish.button.hidden)) updateStatus('물고기 이름을 눌러 수집 대상을 골라요.');
  if (selected && distance > castRange) updateStatus(selected.spec.name + '에게 조금 더 가까이 가요.');
  if (selected && distance <= castRange && !status.startsWith('빗나갔어요')) {
    updateStatus(selected.spec.name + '이 천천히 움직일 때 물방울을 쏘세요.');
  }
}

function applyAimMode(mode) {
  aimMode = mode;
  $('game').dataset.aim = mode;
  $('mode-label').textContent = aimModes[mode].name;
  $('mode-help').textContent = aimModes[mode].help;
  for (const fish of animals) {
    fish.button.tabIndex = mode === 'direct' ? -1 : 0;
    fish.button.setAttribute('aria-hidden', String(mode === 'direct'));
  }
}

function resolveAimPoint() {
  aimRay.setFromCamera(aimScreen, camera);
  return aimRay.ray.intersectPlane(aimPlane, aimPoint);
}

function updateAimScreen(event) {
  const bounds = $('sea').getBoundingClientRect();
  aimScreen.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
}

function clearInput() {
  aimPointer = null;
  keys.clear();
  pointer = null;
  swipeX = 0;
  swipeZ = 0;
  $('knob').style.transform = '';
}

function start() {
  stage = 'dive';
  count = 0;
  sceneTime = 0;
  selected = null;
  shot = null;
  heading = 0;
  velocity.set(0, 0, 0);
  player.copy(startPosition);
  follow.copy(player);
  bubble.visible = false;
  clearInput();
  for (const fish of animals) resetFish(fish);
  $('intro').hidden = true;
  $('result').hidden = true;
  $('hud').hidden = false;
  $('stick').hidden = false;
  $('return').disabled = false;
  $('companions').textContent = '동행 0마리';
  updateStatus(swimHint);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  audio.unlock();
}

function finish() {
  stage = 'result';
  const caught = animals.filter(fish => fish.caught);
  const newlyCollected = caught.filter(fish => !collected.has(fish.spec.id));
  for (const fish of caught) record(fish.spec);
  $('hud').hidden = true;
  $('result').hidden = false;
  $('result-mode').textContent = '탐사 마침 · ' + aimModes[aimMode].name;
  $('result-title').textContent = count ? count + '마리와 함께 돌아왔어요' : '탐사를 마쳤어요';
  const report = [];
  if (newlyCollected.length) report.push('새 카드 · ' + newlyCollected.map(fish => fish.spec.name).join(', ') + '.');
  if (count && !newlyCollected.length) report.push('이번 동행 · ' + caught.map(fish => fish.spec.name).join(', ') + '.');
  const next = species.find(spec => !collected.has(spec.id));
  if (next) report.push('다음에는 ' + next.hint + '에서 ' + next.name + '을 찾아봐요.');
  else report.push('감태숲의 카드를 모두 모았어요!');
  if (!storageAvailable) report.push('이 브라우저에서는 탭을 열어 둔 동안 카드가 유지돼요.');
  $('result-note').textContent = report.join(' ');
  $('result-dex').focus();
  audio.cue('recovered');
}

function showDex(panel) {
  previousPanel = panel;
  $(panel).hidden = true;
  $('dex').hidden = false;
  $('detail').hidden = true;
  $('collection').hidden = false;
  $('dex-title').textContent = '모은 카드 ' + collected.size + ' / ' + species.length;
  $('cards').replaceChildren();
  for (const spec of species) {
    const known = collected.has(spec.id);
    const button = document.createElement('button');
    button.className = 'card';
    button.type = 'button';
    button.disabled = !known;
    const name = document.createElement('b');
    name.textContent = spec.name;
    const note = document.createElement('span');
    note.textContent = known ? '함께 귀환' : spec.hint;
    if (known) {
      const image = document.createElement('img');
      image.src = portraits.get(spec.id);
      image.alt = '';
      button.append(image);
    }
    button.append(name, note);
    button.addEventListener('click', () => {
      previousCard = button;
      $('detail-title').textContent = spec.name;
      $('detail-image').src = portraits.get(spec.id);
      $('detail-image').alt = spec.name + '의 옆모습';
      $('detail-note').textContent = '이 탐사에서 만나는 곳 · ' + spec.hint;
      $('collection').hidden = true;
      $('detail').hidden = false;
      $('back-to-cards').focus();
    });
    $('cards').append(button);
  }
  $('close-dex').focus();
}

for (const option of document.querySelectorAll('[name="aim-mode"]')) {
  option.addEventListener('change', () => {
    if (option.checked) applyAimMode(option.value);
  });
}
$('change-mode').addEventListener('click', () => {
  stage = 'intro';
  $('result').hidden = true;
  $('intro').hidden = false;
  document.querySelector('[name="aim-mode"]:checked').focus();
});
$('start').addEventListener('click', start);
$('restart').addEventListener('click', start);
$('shoot').addEventListener('click', fire);
$('intro-dex').addEventListener('click', () => showDex('intro'));
$('result-dex').addEventListener('click', () => showDex('result'));
$('close-dex').addEventListener('click', () => {
  $('dex').hidden = true;
  $(previousPanel).hidden = false;
  $(previousPanel === 'result' ? 'result-dex' : 'intro-dex').focus();
});
$('back-to-cards').addEventListener('click', () => {
  $('detail').hidden = true;
  $('collection').hidden = false;
  previousCard.focus();
});
const returnButton = $('return');
function beginReturn() {
  if (stage !== 'dive') return;
  stage = 'return';
  returnAlongPath = false;
  selected = null;
  shot = null;
  bubble.visible = false;
  clearInput();
  $('stick').hidden = true;
  $('return').disabled = true;
  updateStatus('동행과 함께 귀환 밧줄로 돌아가는 중이에요.');
  audio.cue('dock');
}

returnButton.addEventListener('click', beginReturn);
// Chrome can suppress the compatibility click immediately after a drag on the canvas.
let returnTouch = null;
returnButton.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch') returnTouch = event.pointerId;
});
returnButton.addEventListener('pointerup', event => {
  if (event.pointerId !== returnTouch) return;
  returnTouch = null;
  const bounds = returnButton.getBoundingClientRect();
  if (event.clientX >= bounds.left && event.clientX <= bounds.right &&
      event.clientY >= bounds.top && event.clientY <= bounds.bottom) beginReturn();
});
returnButton.addEventListener('pointercancel', () => { returnTouch = null; });

const sea = $('sea');
sea.addEventListener('pointerdown', event => {
  if (stage !== 'dive' || aimMode !== 'direct' || aimPointer !== null || shot || event.button > 0) return;
  aimPointer = event.pointerId;
  updateAimScreen(event);
  sea.setPointerCapture(aimPointer);
});
sea.addEventListener('pointermove', event => {
  if (event.pointerId === aimPointer) updateAimScreen(event);
});
sea.addEventListener('pointerup', event => {
  if (event.pointerId !== aimPointer) return;
  aimPointer = null;
  updateAimScreen(event);
  const point = resolveAimPoint();
  if (point && point.distanceTo(player) <= castRange) launch(point);
  else updateStatus('물방울이 닿기엔 멀어요. 조금 가까이 헤엄쳐요.');
});
for (const type of ['pointercancel', 'lostpointercapture']) {
  sea.addEventListener(type, event => {
    if (event.pointerId === aimPointer) aimPointer = null;
  });
}

const stick = $('stick');
const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
function moveStick(event) {
  const bounds = stick.getBoundingClientRect();
  const radius = bounds.width * .31;
  const x = (event.clientX - bounds.left - bounds.width / 2) / radius;
  const z = (event.clientY - bounds.top - bounds.height / 2) / radius;
  const scale = 1 / Math.max(1, Math.hypot(x, z));
  swipeX = x * scale;
  swipeZ = z * scale;
  $('knob').style.transform = 'translate(' + swipeX * radius + 'px,' + swipeZ * radius + 'px)';
}
stick.addEventListener('pointerdown', event => {
  if (stage !== 'dive' || pointer !== null || event.button > 0) return;
  pointer = event.pointerId;
  stick.setPointerCapture(pointer);
  moveStick(event);
});
stick.addEventListener('pointermove', event => {
  if (event.pointerId === pointer) moveStick(event);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  stick.addEventListener(type, event => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    swipeX = 0;
    swipeZ = 0;
    $('knob').style.transform = '';
  });
}
window.addEventListener('keydown', event => {
  if (stage !== 'dive' || !movementKeys.has(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});
window.addEventListener('resize', () => {
  clearInput();
  adjustView();
  positionView(1);
  renderer.render(scene, camera);
});
$('sea').addEventListener('webglcontextlost', event => {
  event.preventDefault();
  clearInput();
  stage = 'intro';
  $('hud').hidden = true;
  $('intro').hidden = false;
  $('intro-dex').disabled = true;
  $('start').disabled = false;
  $('start').textContent = '다시 열기';
  $('start').removeEventListener('click', start);
  $('start').addEventListener('click', () => location.reload());
  $('intro').querySelector('p').textContent = '바다 화면 연결을 잃었어요. 다시 열어 탐사를 이어갈 수 있어요.';
});

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  if (!['dive', 'return'].includes(stage) || document.hidden) return;
  sceneTime += dt;
  movePlayer(dt);
  updateFish(dt);
  updateShot(dt);
  returnSite.update(sceneTime, stage === 'return');
  positionView(dt);
  updateHud();
  renderer.render(scene, camera);
}

async function boot() {
  loadRecord();
  const loader = new GLTFLoader();
  const [pirate, rocks, puffer] = await Promise.all([
    loader.loadAsync(new URL('./runtime/assets/pirate/captain.gltf', import.meta.url).href),
    loader.loadAsync(new URL('./assets/rock-modules.glb', import.meta.url).href),
    loadFish({ kind: 'puffer' }),
  ]);
  makeSeabed(rocks);
  captain = new Swimmer(pirate, scene);
  const createModels = [
    () => createChromis({ length: .86 }),
    () => createGardenResident(puffer).root,
  ];
  species.forEach((spec, index) => {
    const createModel = createModels[index];
    attachFish(spec, createModel());
    portrait(spec, createModel);
  });
  applyAimMode(document.querySelector('[name="aim-mode"]:checked').value);
  adjustView();
  movePlayer(0);
  positionView(1);
  renderer.render(scene, camera);
  $('start').disabled = false;
  $('intro-dex').disabled = false;
  $('start').textContent = '잠수하기';
  last = performance.now();
  requestAnimationFrame(frame);
}

boot().catch(error => {
  console.error(error);
  $('start').textContent = '다시 열기';
  $('start').disabled = false;
  $('start').removeEventListener('click', start);
  $('start').addEventListener('click', () => location.reload());
  $('intro').querySelector('p').textContent = '바다를 불러오지 못했어요. 연결을 확인한 뒤 다시 열어 주세요.';
});
