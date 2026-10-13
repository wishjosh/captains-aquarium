import * as THREE from './vendor/three.module.js';
import { loadPirateKit, createCaptain, placeProp } from './pirate.js';
import { loadFish, createFish } from './fish.js';
import {SAVE_KEY,emptyProgress,parseSave,hasStarterDecor,missionFor} from './progress.js';
import {paintDecorations} from './decorations.js';
import {setupDecorationEditor} from './decorate.js';
import {setupTransfer} from './transfer-ui.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
const viewport = document.querySelector('.world-wrap');
const decor = $('decorate-dialog');
const viewer = $('viewer-dialog');
const help = $('help-dialog');
const transfer = $('transfer-dialog');
const player = { x:0, z:1, angle:0 };
const progress = emptyProgress();
let tankDecor, decorationEditor, chromisSprite, seaChromis, seaJelly, chromisSign, jellySeaSign;
let renderer, scene, camera, avatar, fishSprite, poolFish, jellySprite, marker;
let ready=false, moving=false, nearby=null, toastTimer, time=0, last=0, lastPaint=0, saveOkay=true;
let gesture=null;
const input = { x:0, z:0 };
const keys = new Set();
const clickable = [];
const colliders = [
  {x:-3,z:-4,w:3.6,d:2.6}, {x:3,z:-4,w:3.6,d:2.6},
  {x:-3,z:.8,w:3.6,d:2.6}, {x:0,z:9.5,w:4.8,d:3.8}
];
const spots = { fish:{x:-3,z:-1.6}, jelly:{x:3,z:-1.6}, sea:{x:0,z:6.6},chromis:{x:-3,z:3.2},'chromis-sea':{x:-4,z:9.8},'jelly-sea':{x:4,z:11.5} };
const extraNames={chromis:'자리돔',jelly:'해파리'};
const objectName=kind=>extraNames[kind]+(kind==='chromis'?'을':'를');
const unlocked=kind=>kind==='chromis'?progress.decorated:progress.chromis.observed;
const bagName=()=>progress.bag?'범돔':progress.chromis.bag?'자리돔':progress.jelly.bag?'해파리':null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const direction = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(0,10.5,13.5);

function blocked(x,z) {
  if(x < -5.8 || x > 5.8 || z < -8.7 || z > 12.8) return true;
  return colliders.some(c=>Math.abs(x-c.x)<c.w/2+.44 && Math.abs(z-c.z)<c.d/2+.44);
}
function loadSave() {
  try {
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw)return;
    const data=parseSave(raw);
    for(const key of Object.keys(progress))progress[key]=data[key];
    if(!blocked(data.x,data.z)){player.x=data.x;player.z=data.z;}
  } catch { saveOkay=false;$('save-status').textContent='저장 기록을 읽지 못했어요'; }
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY,JSON.stringify({v:3,...progress,x:player.x,z:player.z}));
    saveOkay=true;$('save-status').textContent='이 기기에 저장됨';
  } catch { saveOkay=false;$('save-status').textContent='저장할 수 없어요 · 기록은 이번 접속만 유지'; }
}
function toast(message) {
  clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;
  toastTimer=setTimeout(()=>$('toast').hidden=true,2800);
}
function stop() {
  const activeId=gesture?.id;
  gesture=null;input.x=0;input.z=0;keys.clear();moving=false;$('drag-guide').hidden=true;
  if(activeId!==undefined && canvas.hasPointerCapture(activeId)) canvas.releasePointerCapture(activeId);
  if(ready)save();
}
function stage() { return progress.decorated?4:progress.observed?3:progress.placed?2:progress.bag?1:0; }
function updateMission() {
  const m=missionFor(progress);
  $('mission-title').textContent=m.title;$('mission-detail').textContent=m.detail;
  $('mission-count').textContent=`${m.step} / ${m.total}`;$('chapter').textContent=m.target?`제주 · ${m.chapter}번째 임무`:'제주 · 수집 완료';
  document.querySelectorAll('.mission-dots i').forEach((dot,i)=>{dot.hidden=i>=m.total;dot.classList.toggle('done',i<m.step);});
  const held=bagName();$('bag-count').textContent=held?`가방 · ${held} 1`:'가방 0';document.querySelector('.bag img').hidden=held&&held!=='범돔';
  $('collection-count').textContent=`수조 친구 ${[progress.placed,progress.chromis.placed,progress.jelly.placed].filter(Boolean).length} / 3종`;
  if(fishSprite)fishSprite.visible=progress.placed;
  if(poolFish)poolFish.visible=!progress.placed&&!progress.bag;
  if(chromisSprite)chromisSprite.visible=progress.chromis.placed;
  if(seaChromis)seaChromis.visible=unlocked('chromis')&&!progress.chromis.bag&&!progress.chromis.placed;
  if(chromisSign)chromisSign.visible=seaChromis.visible;
  if(seaJelly)seaJelly.visible=unlocked('jelly')&&!progress.jelly.bag&&!progress.jelly.placed;
  if(jellySeaSign)jellySeaSign.visible=seaJelly.visible;
  if(jellySprite)jellySprite.visible=progress.jelly.placed||!unlocked('jelly');
  updateNearby(true);
}
function updateNearby(force=false) {
  let target=null,distance=Infinity;
  for(const [name,spot] of Object.entries(spots)){const d=Math.hypot(player.x-spot.x,player.z-spot.z);if(d<2.15&&d<distance){target=name;distance=d;}}
  if(!force&&target===nearby)return;nearby=target;
  const button=$('interact');button.hidden=!target;$('observe').hidden=true;
  let title='바닥을 누르고 끌어 보세요',detail='손을 떼면 멈춰요',label='';
  if(target==='sea'){
    title='제주 바다 탐사';
    if(progress.bag||progress.placed){detail='이곳의 범돔을 이미 만났어요';button.hidden=true;}
    else {detail='노란 줄무늬 친구를 발견했어요';label='범돔 수집하기';}
  }else if(target==='fish'){
    title='범돔 수조';
    if(progress.bag){detail='새 친구의 집을 준비했어요';label='범돔을 수조에 넣기';}
    else if(progress.placed){detail='직접 데려온 범돔 1마리';label=progress.observed?(progress.decorated?'꾸미기 바꾸기':'수조 꾸미기'):'범돔 가까이 보기';$('observe').hidden=!progress.observed;}
    else {detail='바다에서 범돔을 먼저 데려와요';button.hidden=true;}
  }else if(target?.endsWith('-sea')){
    const kind=target.slice(0,-4),name=extraNames[kind],p=progress[kind];title=kind==='chromis'?'왼쪽 바위 해안':'오른쪽 잔잔한 바다';
    if(!unlocked(kind)){detail=kind==='chromis'?'범돔의 집을 꾸미면 탐사가 열려요':'자리돔을 수조에서 관찰하면 탐사가 열려요';button.hidden=true;}
    else if(p.bag||p.placed){detail=objectName(kind)+' 이미 만났어요';button.hidden=true;}
    else {detail=kind==='chromis'?'가슴에 검은 무늬가 있는 친구예요':'둥근 우산을 가진 친구예요';label=name+' 수집하기';}
  }else if(target==='chromis'||target==='jelly'){
    const p=progress[target],name=extraNames[target];title=name+' 수조';
    if(p.bag){detail='새 친구의 집을 준비했어요';label=objectName(target)+' 수조에 넣기';}
    else if(p.placed){detail='직접 데려온 '+name+' 1마리';label=name+' 가까이 보기';}
    else if(target==='jelly'&&!unlocked('jelly')){detail='보름달물해파리 · 관찰용';label='해파리 가까이 보기';}
    else {detail=unlocked(target)?'바다에서 '+objectName(target)+' 먼저 데려와요':'앞선 임무를 마치면 수집할 수 있어요';button.hidden=true;}
  }
  $('nearby-title').textContent=title;$('nearby-detail').textContent=detail;button.textContent=label;
}
function openTank(tank) {
  if(tank==='fish'&&!progress.placed||tank==='chromis'&&!progress.chromis.placed||tank==='jelly'&&!progress.jelly.placed&&unlocked('jelly'))return;
  stop();
  if(tank==='fish')progress.observed=true;
  else if(progress[tank].placed)progress[tank].observed=true;
  save();updateMission();
  const demo=tank==='jelly'&&!progress.jelly.placed;
  $('viewer-title').textContent=tank==='fish'?'범돔 수조':extraNames[tank]+' 수조'+(demo?' · 관찰용':'');
  $('viewer-frame').src=tank==='fish'?`fish-view.html?count=1&decor=${progress.decorations.map(k=>k||'').join(',')}`:tank==='chromis'?'fish-view.html?species=chromis&count=1':`view.html?tank=jelly&count=${demo?3:1}${demo?'':'&exhibit=1'}`;
  viewer.showModal();
}
function interact(target=nearby) {
  if(!ready||viewer.open||help.open||decor.open||transfer.open||!target)return;
  if(target!==nearby){toast('조금 더 가까이 걸어가 보세요.');return;}
  if(target==='sea'&&!progress.bag&&!progress.placed){
    stop();progress.bag=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Wave');toast('범돔을 만났어요! 수조로 데려가요.');
  }else if(target==='fish'){
    if(progress.bag){stop();progress.bag=false;progress.placed=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Yes');toast('범돔이 새집에 도착했어요!');}
    else if(progress.placed){if(progress.observed){stop();decorationEditor.open();}else openTank('fish');}
    else toast('아래쪽 바다에서 범돔을 먼저 만나 보세요.');
  }else if(target.endsWith('-sea')){
    const kind=target.slice(0,-4),p=progress[kind];
    if(!unlocked(kind)||p.bag||p.placed||bagName())return;
    stop();p.bag=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Wave');toast(objectName(kind)+' 만났어요! 수조로 데려가요.');
  }else if(target==='chromis'||target==='jelly'){
    const p=progress[target];
    if(p.bag){stop();p.bag=false;p.placed=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Yes');toast(extraNames[target]+(target==='chromis'?'이':'가')+' 새집에 도착했어요!');}
    else openTank(target);
  }
}

function material(color,extra={}) { return new THREE.MeshLambertMaterial({color,...extra}); }
function box(parent,w,h,d,x,y,z,color,extra={}) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,extra));
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function label(text,x,y,z,color='#235d54',wide=3.1) {
  const image=document.createElement('canvas');image.width=512;image.height=112;
  const ctx=image.getContext('2d');ctx.fillStyle='#fff9e9';ctx.beginPath();ctx.roundRect(2,2,508,108,30);ctx.fill();
  ctx.fillStyle=color;ctx.font='bold 64px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,58,470);
  const texture=new THREE.CanvasTexture(image);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(wide,wide*112/512,1);scene.add(sprite);return sprite;
}
function groundRing(x,z,color,radius=.7) {
  const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.045,radius,36),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,side:THREE.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.18,z);scene.add(mesh);return mesh;
}
function createTank(x,z,kind,texture,fishAsset) {
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  const base=box(group,3.6,.55,2.6,0,.3,0,'#f1ebd6');base.userData.target=kind;clickable.push(base);
  const water=box(group,3.15,.65,2.15,0,.84,0,kind!=='jelly'?'#52b9cb':'#627daf',kind!=='jelly'?{transparent:true,opacity:.24,depthWrite:false}:{});water.userData.target=kind;clickable.push(water);
  box(group,3.4,.05,2.4,0,1.20,0,'#b0e4e3',{transparent:true,opacity:.3});
  // Low clear walls and a solid base keep the miniature readable on a phone.
  for(const side of [-1,1]){box(group,.12,1.18,2.45,side*1.69,1.05,0,'#d6f0e8',{transparent:true,opacity:.5});box(group,3.4,1.18,.10,0,1.05,side*1.18,'#b0e4e3',{transparent:true,opacity:.2,depthWrite:false});}
  for(const side of [-1,1])box(group,.12,1.35,.12,side*1.68,1.08,1.18,'#f4f4df');
  box(group,3.55,.13,.15,0,1.72,1.18,'#f4f4df');
  let sprite;
  if(kind!=='jelly'){
    sprite=createFish(fishAsset,{length:kind==='chromis'?1.4:1.6,variant:kind==='chromis'?'chromis':'stripey'});sprite.position.set(0,.96,0);sprite.rotation.y=Math.PI/2;
  }else{
    sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.position.set(0,1.65,.65);sprite.scale.set(1.25,1.05,1);
  }
  group.add(sprite);
  if(kind==='fish'){tankDecor=new THREE.Group();tankDecor.position.y=.59;tankDecor.scale.set(.72,.55,.72);group.add(tankDecor);paintDecorations(tankDecor,progress.decorations);}
  label(kind==='fish'?'범돔 수조':kind==='chromis'?'자리돔 수조':'해파리 수조',x,2.55,z,'#245c56',2.7);
  groundRing(x,z+2.3,'#d1ab57',.68);
  return sprite;
}
function buildScene(textures,kit,fishAsset) {
  scene=new THREE.Scene();scene.background=new THREE.Color('#cbe6df');scene.fog=new THREE.Fog('#cbe6df',24,48);
  camera=new THREE.OrthographicCamera(-7,7,10,-10,.1,80);
  scene.add(new THREE.HemisphereLight('#fff8ed','#638d87',1.8));
  const sun=new THREE.DirectionalLight('#fff6e8',1.2);sun.position.set(-5,16,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;sun.shadow.bias=-.002;sun.shadow.normalBias=.03;scene.add(sun);scene.add(sun.target);
  // A single canvas texture supplies the tiled floor without dozens of draw calls.
  const tile=document.createElement('canvas');tile.width=128;tile.height=128;const ctx=tile.getContext('2d');ctx.fillStyle='#eee6cd';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#dcd5bb';ctx.lineWidth=2;ctx.strokeRect(1,1,126,126);
  const floorMap=new THREE.CanvasTexture(tile);floorMap.wrapS=floorMap.wrapT=THREE.RepeatWrapping;floorMap.repeat.set(6,7);floorMap.colorSpace=THREE.SRGBColorSpace;
  box(scene,12.8,.2,14,0,-.02,-3,'#fff',{map:floorMap});
  box(scene,13.2,.3,14,0,-.18,-3,'#d9cfa9');
  // The harbor inlet opens into the ocean; sand paths remain on both sides.
  box(scene,4.0,.2,10,-4.4,-.01,9,'#e6d5af');
  box(scene,4.0,.2,10,4.4,-.01,9,'#e6d5af');
  box(scene,80,.15,60,0,-.80,26,'#55b7c3');
  for(let i=0;i<14;i++) {
    const foam=box(scene,1.1+(i%3)*.5,.01,.045,Math.sin(i*4.3)*14,-.14,10+i*.85,'#a9e1dd');
    foam.material.transparent=true;foam.material.opacity=.5;
  }
  box(scene,13,.6,.35,0,.3,-10,'#c5d5bd');
  box(scene,.25,.5,13.5,-6.35,.24,-3,'#c5d5bd');box(scene,.25,.5,13.5,6.35,.24,-3,'#c5d5bd');
  // Back wall is deliberately low, so the camera never hides the player.
  label('제주 아쿠아리움',0,1.75,-8,'#42775f',4.8);
  box(scene,3.4,.03,1.6,0,.10,1.9,'#c0d7b3');
  for(let i=0;i<4;i++)box(scene,.9,.03,.65,0,.105,3.5+i*.8,'#eadfbe');
  fishSprite=createTank(-3,-4,'fish',textures.fish,fishAsset);jellySprite=createTank(3,-4,'jelly',textures.jelly);chromisSprite=createTank(-3,.8,'chromis',null,fishAsset);

  const surface=box(scene,4.8,.03,7,0,-.12,11,'#4eabbc',{transparent:true,opacity:.36,depthWrite:false});surface.userData.target='sea';clickable.push(surface);
  box(scene,4.8,.2,3.6,0,-.01,5.8,'#d8bf8e');
  const pier=placeProp(scene,kit.dock,0,6.95,5.1,'x');pier.scale.z=.38;
  // The original dock's plank top is y=.488; poles extend to y=1.013127.
  // Align the planks, rather than the pole tops, with the walkable sand.
  const pierBounds=new THREE.Box3().setFromObject(pier);pier.position.y+=.18-pierBounds.max.y+(1.013127-.488)*5.1/2.184204;
  placeProp(scene,kit.house,0,-11,4.0,'y',Math.PI);
  for(const [x,z,h] of [[-6.8,3,3.3],[6.8,4,3.6],[-6.7,-7,3.2],[6.7,-7,3.4]])placeProp(scene,kit.palm,x,z,h);
  for(const [x,z,h] of [[-5.7,10,1.2],[5.7,11,1.3],[-6.6,7,.8],[6.6,7.8,1]])placeProp(scene,kit.rock,x,z,h);
  placeProp(scene,kit.barrel,-5.5,3.0,.9);placeProp(scene,kit.barrel,5.5,2.8,.8);
  placeProp(scene,kit.chest,4.9,-7.4,.7);placeProp(scene,kit.anchor,-5.2,6.7,1.3,'x',-.5);
  poolFish=createFish(fishAsset,{length:1.5});poolFish.position.set(0,-.32,9.5);poolFish.rotation.y=Math.PI/2;scene.add(poolFish);
  label('제주 바다 탐사',0,1.9,9.5,'#237d83',3.8);
  groundRing(0,6.6,'#c89e43',.72);
  seaChromis=createFish(fishAsset,{length:1.35,variant:'chromis'});seaChromis.position.set(-2.9,-.32,10);seaChromis.rotation.y=Math.PI/2;scene.add(seaChromis);
  chromisSign=label('자리돔 · 바위 해안',-4,1.8,10,'#537365',3.3);groundRing(-4,9.8,'#c89e43',.65);
  seaJelly=new THREE.Sprite(new THREE.SpriteMaterial({map:textures.jelly,depthWrite:false}));seaJelly.position.set(2.9,.25,12);seaJelly.scale.set(1.15,1,1);scene.add(seaJelly);
  jellySeaSign=label('해파리 · 잔잔한 바다',4,1.9,12,'#537365',3.5);groundRing(4,11.5,'#c89e43',.65);

  for(let i=0;i<8;i++){
    const stone=new THREE.Mesh(new THREE.IcosahedronGeometry(.15+(i%3)*.06,0),material('#c8bb94'));stone.position.set(Math.sin(i*6.4)*5,.1,4.8+i);stone.scale.y=.5;scene.add(stone);
  }
  avatar=createCaptain(kit.captain);scene.add(avatar);
  marker=new THREE.Mesh(new THREE.ConeGeometry(.17,.32,5),new THREE.MeshBasicMaterial({color:'#efbb4e'}));marker.rotation.x=Math.PI;scene.add(marker);
  avatar.position.set(player.x,.12,player.z);avatar.rotation.y=player.angle;
  cameraTarget.set(player.x,0,player.z-1.1);camera.position.copy(cameraTarget).add(cameraOffset);camera.lookAt(cameraTarget);
  decorationEditor=setupDecorationEditor(fishAsset,{getItems:()=>progress.decorations,onCommit:items=>{const completed=progress.decorated;progress.decorations=items;if(hasStarterDecor(items))progress.decorated=true;save();paintDecorations(tankDecor,items);updateMission();toast(!completed&&progress.decorated?'첫 수조 완성! 이제 자리돔을 만나러 가요.':'수조 장식을 바꿨어요.');}});
  updateMission();resize();
}
function resize() {
  if(!renderer||!camera)return;
  const {width,height}=viewport.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(width,height,false);
  const aspect=width/Math.max(height,1),horizontal=aspect<1?5.7:9.2;
  camera.left=-horizontal;camera.right=horizontal;camera.top=horizontal/aspect;camera.bottom=-horizontal/aspect;camera.updateProjectionMatrix();
  if(ready)renderer.render(scene,camera);
}
function move(dt) {
  direction.set(input.x,0,input.z);
  if(keys.size){direction.set((keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),0,(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0));}
  moving=direction.lengthSq()>.001;
  if(!moving)return;
  direction.normalize();const speed=3.35,dx=direction.x*speed*dt,dz=direction.z*speed*dt;
  const oldX=player.x,oldZ=player.z;
  if(!blocked(player.x+dx,player.z))player.x+=dx;
  if(!blocked(player.x,player.z+dz))player.z+=dz;
  const target=Math.atan2(direction.x,direction.z);
  player.angle+=Math.atan2(Math.sin(target-player.angle),Math.cos(target-player.angle))*Math.min(1,dt*13);
  moving=Math.hypot(player.x-oldX,player.z-oldZ)>.0001;
}
function updateWaypoint() {
  const m=missionFor(progress),target=m.target?spots[m.target]:null;
  const node=$('waypoint');node.hidden=!target||Math.hypot(player.x-target.x,player.z-target.z)<2.1;
  if(!node.hidden){const offset=target.z-player.z;const arrow=Math.abs(offset)>.8?(offset>0?'↓':'↑'):(target.x>player.x?'→':'←');node.textContent=`${arrow} ${m.destination}`;node.style.top=offset>0?'64%':'37%';}
  marker.visible=!!target;if(target)marker.position.set(target.x,2.2+(reducedMotion.matches?0:Math.sin(time*3)*.12),target.z);
}
function frame(stamp) {
  const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;
  if(ready&&!document.hidden&&!viewer.open&&!help.open&&!decor.open&&!transfer.open){
    time+=dt;move(dt);updateNearby();updateWaypoint();
    avatar.position.set(player.x,.12,player.z);avatar.rotation.y=player.angle;
    avatar.userData.controller.update(dt,moving);
    desiredTarget.set(player.x,0,player.z-1.1);cameraTarget.lerp(desiredTarget,1-Math.exp(-dt*5));camera.position.copy(cameraTarget).add(cameraOffset);camera.lookAt(cameraTarget);
    if(!reducedMotion.matches){fishSprite.userData.update(dt);poolFish.userData.update(dt);fishSprite.position.x=Math.sin(time*.7)*.45;fishSprite.position.z=Math.cos(time*.7)*.12;fishSprite.rotation.y=Math.atan2(.45*Math.cos(time*.7),-.12*Math.sin(time*.7));poolFish.position.x=Math.sin(time*.7)*.6;poolFish.position.z=9.5+Math.cos(time*.7)*.16;poolFish.rotation.y=Math.atan2(.6*Math.cos(time*.7),-.16*Math.sin(time*.7));jellySprite.position.y=1.65+Math.sin(time*1.6)*.10;jellySprite.scale.set(1.25+Math.sin(time*2.45)*.05,1.05-Math.sin(time*2.45)*.06,1);}
    if(!reducedMotion.matches){
      chromisSprite.userData.update(dt*1.25);seaChromis.userData.update(dt*1.25);
      chromisSprite.position.x=Math.sin(time*1.05)*.5;chromisSprite.position.z=Math.cos(time*1.05)*.18;chromisSprite.rotation.y=Math.atan2(.5*Math.cos(time*1.05),-.18*Math.sin(time*1.05));
      seaChromis.position.z=10+Math.sin(time*.9)*.35;seaChromis.position.x=-2.9+Math.cos(time*.9)*.1;seaChromis.rotation.y=Math.atan2(-.1*Math.sin(time*.9),.35*Math.cos(time*.9));
      seaJelly.position.y=.25+Math.sin(time*1.6)*.12;seaJelly.scale.set(1.15+Math.sin(time*2.45)*.06,1-Math.sin(time*2.45)*.06,1);
    }
    if(stamp-lastPaint>1000/40){renderer.render(scene,camera);lastPaint=stamp;}
  }
  requestAnimationFrame(frame);
}
function tap(event) {
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(clickable,false)[0];
  if(hit){const target=hit.object.userData.target;if(nearby===target&&(target==='fish'&&progress.placed||target==='chromis'&&progress.chromis.placed||target==='jelly'&&progress.jelly.placed))openTank(target);else interact(target);}
}
canvas.addEventListener('pointerdown',event=>{
  if(!ready||viewer.open||help.open||decor.open||transfer.open||gesture||event.button!==0||!event.isPrimary)return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,started:performance.now(),dragged:false};
  canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
});
canvas.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,distance=Math.hypot(dx,dy);
  if(distance<10){input.x=0;input.z=0;return;}
  gesture.dragged=true;input.x=dx/distance;input.z=dy/distance;
  const rect=canvas.getBoundingClientRect();$('drag-guide').hidden=false;$('drag-guide').style.left=`${event.clientX-rect.left}px`;$('drag-guide').style.top=`${event.clientY-rect.top}px`;
});
canvas.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const isTap=!gesture.dragged&&performance.now()-gesture.started<700;
  stop();if(isTap)tap(event);
});
canvas.addEventListener('pointercancel',stop);
canvas.addEventListener('lostpointercapture',()=>{if(gesture)stop();});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur',stop);
document.addEventListener('visibilitychange',()=>{stop();last=0;});
window.addEventListener('pagehide',stop);
window.addEventListener('keydown',event=>{
  if(viewer.open||help.open||decor.open||transfer.open||!ready||event.target.closest('button,input,a'))return;
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){event.preventDefault();keys.add(key);}
  if((key==='Enter'||key===' ')&&!event.repeat){event.preventDefault();interact();}
});
window.addEventListener('keyup',event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;keys.delete(key);if(ready&&keys.size===0)save();});
$('interact').addEventListener('click',()=>interact());
$('observe').addEventListener('click',()=>{if(ready&&nearby==='fish'&&progress.placed&&!viewer.open&&!help.open&&!decor.open&&!transfer.open)openTank('fish');});
decor.addEventListener('close',()=>{stop();last=0;canvas.focus({preventScroll:true});});
$('help').addEventListener('click',()=>{stop();help.showModal();});
$('close-help').addEventListener('click',()=>help.close());
$('close-viewer').addEventListener('click',()=>viewer.close());
viewer.addEventListener('close',()=>{stop();$('viewer-frame').src='about:blank';last=0;canvas.focus({preventScroll:true});});
help.addEventListener('close',()=>{stop();last=0;canvas.focus({preventScroll:true});});
$('retry').addEventListener('click',()=>location.reload());
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();ready=false;$('game-error').hidden=false;});

setupTransfer({
  snapshot:()=>({v:3,...progress,x:player.x,z:player.z}),
  normalise:data=>blocked(data.x,data.z)?{...data,x:0,z:1}:data,
  pause:stop,
  onCommit:data=>{
    for(const key of Object.keys(progress))progress[key]=data[key];
    player.x=data.x;player.z=data.z;saveOkay=true;
    if(tankDecor)paintDecorations(tankDecor,progress.decorations);
    updateMission();$('save-status').textContent='이 기기에 저장됨';
  },
  onClose:()=>{stop();last=0;canvas.focus({preventScroll:true});}
});

loadSave();updateMission();
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const loader=new THREE.TextureLoader();
  const [fish,jelly,kit,fishAsset]=await Promise.all([loader.loadAsync('assets/stripey-flat.png'),loader.loadAsync('assets/moon-jelly-flat.png'),loadPirateKit(),loadFish()]);
  fish.colorSpace=jelly.colorSpace=THREE.SRGBColorSpace;
  buildScene({fish,jelly},kit,fishAsset);ready=true;$('loading').hidden=true;resize();
  new ResizeObserver(resize).observe(viewport);
  if(!saveOkay)toast('저장 기록을 읽지 못해 새 탐험으로 열었어요.');
  // Read-only state and projection let browser checks exercise real input and rendering.
  window.jejuGame={getState:()=>({ready,...progress,decorations:[...progress.decorations],placedDecorations:tankDecor.children.map(n=>n.name),player:{...player},moving,nearby,stage:stage(),saveOkay,dragging:!!gesture,captain:avatar.userData.controller.inspect(),fish:fishSprite.userData.inspect(),chromisModel:chromisSprite.userData.inspect(),mission:missionFor(progress),exhibits:{fish:progress.placed?1:0,chromis:progress.chromis.placed?1:0,jelly:progress.jelly.placed?1:0}}),screenPoint:(name)=>{
    const point=name==='player'?new THREE.Vector3(player.x,.5,player.z):name==='fish-tank'?new THREE.Vector3(-3,1.2,-4):name==='jelly-tank'?new THREE.Vector3(3,1.2,-4):name==='chromis-tank'?new THREE.Vector3(-3,1.2,.8):new THREE.Vector3(spots[name].x,.2,spots[name].z);
    const rect=canvas.getBoundingClientRect();point.project(camera);return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  }};
  requestAnimationFrame(frame);
} catch(error) { console.error(error);$('loading').hidden=true;$('game-error').hidden=false; }
