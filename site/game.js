import * as THREE from './vendor/three.module.js';
import {loadPirateKit,createCaptain,placeProp} from './pirate.js';
import {loadFish,createFish} from './fish.js';
import {SAVE_KEY,SAVE_VERSION,emptyProgress,parseSave,writeSave,hasStarterDecor,missionFor} from './progress.js';
import {START,TANKS,ZONE_NAMES,configureExhibition} from './layout.js';
import {CAMPUS_START,DOORS,EXITS,SPAWNS,COAST,spotsFor,blocked,normaliseCampus,nearDoor,waypoint} from './campus-layout.js';
import {loadCampus,createCampus} from './campus.js';
import {paintDecorations} from './decorations.js';
import {setupDecorationEditor} from './decorate.js';
import {setupTransfer} from './transfer-ui.js';
import {SPECIES,SLOT_IDS,SLOT_NAMES,SHAPES,slotFor,editExhibition} from './exhibition.js';
import {setupExhibition} from './exhibition-ui.js';
import {loadAquariumKit,aquariumModule,aquariumProp,aquariumFloorGrid} from './aquarium-kit.js';

const $=id=>document.getElementById(id),canvas=$('world'),viewport=document.querySelector('.world-wrap');
const decor=$('decorate-dialog'),viewer=$('viewer-dialog'),help=$('help-dialog'),transfer=$('transfer-dialog'),inventory=$('management-dialog');
const exhibitionDialog=$('exhibition-dialog');
const modalOpen=()=>viewer.open||help.open||decor.open||transfer.open||inventory.open||exhibitionDialog.open;
const player={x:CAMPUS_START.x,z:CAMPUS_START.z,angle:.38},progress=emptyProgress();
let area='harbor',campusGroup,managementGroup,galleryGroup,doorHold=0,doorId=null,doorCooldown=0;
const currentSpots=()=>spotsFor(area);
const normalisePosition=data=>normaliseCampus(data);
let aquariumKit,exhibitionEditor,exhibitionKey='',tankDecor,decorationEditor,chromisSprite,seaChromis,seaJelly,chromisSign,jellySeaSign;
let renderer,scene,camera,avatar,fishSprite,poolFish,jellySprite,marker;
let ready=false,moving=false,nearby=null,toastTimer,time=0,last=0,lastPaint=0,saveOkay=true,migrated=false;
let gesture=null;
const input={x:0,z:0},keys=new Set(),clickable=[],holdingCrates={},tanks={};
const names={fish:'범돔',chromis:'자리돔',jelly:'해파리'};
const speciesState=kind=>kind==='fish'?progress:progress[kind];
const heldKind=()=>['fish','chromis','jelly'].find(k=>speciesState(k).bag);
const objectName=kind=>names[kind]+(kind==='jelly'?'를':'을');
const unlocked=kind=>kind==='fish'||(kind==='chromis'?progress.decorated:progress.chromis.observed);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const direction=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),desiredTarget=new THREE.Vector3();
function loadSave(){
 try{
  const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;
  const data=normalisePosition(parseSave(raw));migrated=JSON.parse(raw).v<SAVE_VERSION;
  for(const key of Object.keys(progress))progress[key]=data[key];
  area=data.location.area;player.x=data.location.x;player.z=data.location.z;
 }catch{saveOkay=false;$('save-status').textContent='저장 기록을 읽지 못했어요';}
}
function snapshot(){return {v:SAVE_VERSION,...progress,...START,location:{map:'campus-1',area,x:player.x,z:player.z}};}
function save(){
 try{writeSave(localStorage,snapshot());saveOkay=true;$('save-status').textContent='이 기기에 저장됨';}
 catch{saveOkay=false;$('save-status').textContent='저장할 수 없어요 · 기록은 이번 접속만 유지';}
}
function toast(message){
 clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;
 toastTimer=setTimeout(()=>$('toast').hidden=true,2800);
}
function stop(){
 const activeId=gesture?.id;gesture=null;input.x=0;input.z=0;keys.clear();moving=false;doorHold=0;doorId=null;$('drag-guide').hidden=true;
 if(activeId!==undefined&&canvas.hasPointerCapture(activeId))canvas.releasePointerCapture(activeId);
 if(ready)save();
}
function stage(){return progress.decorated?4:progress.observed?3:progress.placed?2:progress.bag||progress.admitted?1:0;}
const occupant=id=>progress.exhibition[id].kind;
const pendingKind=id=>SPECIES.find(k=>k===id&&speciesState(k).admitted&&!speciesState(k).placed)||SPECIES.find(k=>speciesState(k).admitted&&!speciesState(k).placed);
function refreshInventory(){
 let holding=0,exhibiting=0,registered=0;
 for(const kind of Object.keys(names)){
  const p=speciesState(kind),at=slotFor(progress,kind),status=(at?SLOT_NAMES[at]+' 수조 전시 중':p.admitted?'관리동 보관':p.bag?'탐사 후 운반 중':'아직 만나기 전')+(p.observed?' · 관찰 완료':p.admitted?' · 관찰 전':'');
  $('management-'+kind).textContent=status;
  if(p.admitted)registered++;if(p.placed)exhibiting++;else if(p.admitted)holding++;
  if(holdingCrates[kind])holdingCrates[kind].material.color.set(p.admitted&&!p.placed?'#c79b51':'#d8c7a4');
 }
 $('management-summary').textContent='등록 '+registered+' / 3종 · 관리동 보관 '+holding+' · 전시 '+exhibiting;
}
function updateMission(){
 refreshExhibition();
 const m=missionFor(progress);
 $('mission-title').textContent=m.title;$('mission-detail').textContent=m.detail;
 $('mission-count').textContent=m.step+' / '+m.total;$('chapter').textContent=m.target?'제주 · '+m.chapter+'번째 임무':'제주 · 수집 완료';
 document.querySelectorAll('.mission-dots i').forEach((dot,i)=>{dot.hidden=i>=m.total;dot.classList.toggle('done',i<m.step);});
 const held=heldKind();$('bag-count').textContent=held?'가방 · '+names[held]+' 1':'가방 0';document.querySelector('.bag img').hidden=held&&held!=='fish';
 $('collection-count').textContent='전시 친구 '+Object.keys(names).filter(k=>speciesState(k).placed).length+' / 3종';
 if(fishSprite)fishSprite.visible=progress.placed;
 if(poolFish)poolFish.visible=!progress.admitted&&!progress.bag;
 if(chromisSprite)chromisSprite.visible=progress.chromis.placed;
 if(seaChromis)seaChromis.visible=unlocked('chromis')&&!progress.chromis.bag&&!progress.chromis.admitted;
 if(chromisSign)chromisSign.visible=seaChromis.visible;
 if(seaJelly)seaJelly.visible=unlocked('jelly')&&!progress.jelly.bag&&!progress.jelly.admitted;
 if(jellySeaSign)jellySeaSign.visible=seaJelly.visible;
 if(jellySprite)jellySprite.visible=progress.jelly.placed||!unlocked('jelly')&&!occupant('jelly');
 if(tankDecor)tankDecor.visible=progress.placed;
 refreshInventory();updateNearby(true);
}
function updateNearby(force=false){
 const zone=area;$('area-name').textContent=ZONE_NAMES[zone];
 let target=null,distance=Infinity;
 for(const [name,spot] of Object.entries(currentSpots())){
  if(name==='management'&&zone!=='management'||Object.hasOwn(names,name)&&zone!=='exhibition')continue;
  const d=Math.hypot(player.x-spot.x,player.z-spot.z);
  if(d<2.0&&d<distance){target=name;distance=d;}
 }
 const door=nearDoor(area,player.x,player.z);if(door){target='door';}
 if(!force&&target===nearby)return;nearby=target;
 const button=$('interact'),secondary=$('observe');button.hidden=!target;secondary.hidden=true;$('edit-exhibition').hidden=!Object.hasOwn(names,target);
 let title=ZONE_NAMES[zone],detail=zone==='harbor'?'왼쪽 관리동 · 오른쪽 전시관 · 앞쪽 바다':'왼쪽을 누르고 끌어 이동해요',label='';
 if(target==='door'){title=door.label;detail='문 쪽으로 1초간 걸으면 출입해요';label='문 열기';}
 else if(target==='management'){
  const kind=heldKind();title='관리동 · 입수와 보유 현황';
  detail=kind?names[kind]+'의 입수를 마친 뒤 전시관으로 가요':'입수한 친구와 전시 상태를 살펴봐요';
  label=kind?objectName(kind)+' 관리동에 입수':'관리동 현황 보기';
  secondary.hidden=!kind;secondary.textContent='보유 생물 보기';
 }else if(target==='sea'||target?.endsWith('-sea')){
  const kind=target==='sea'?'fish':target.slice(0,-4),p=speciesState(kind);
  title=kind==='fish'?'제주 바다 탐사':kind==='chromis'?'왼쪽 바위 해안':'오른쪽 잔잔한 바다';
  if(!unlocked(kind)){detail=kind==='chromis'?'범돔의 집을 꾸미면 탐사가 열려요':'자리돔을 관찰하면 탐사가 열려요';button.hidden=true;}
  else if(p.bag||p.admitted){detail=objectName(kind)+' 이미 만났어요';button.hidden=true;}
  else{detail=kind==='fish'?'노란 줄무늬 친구를 발견했어요':kind==='chromis'?'가슴에 검은 무늬가 있는 친구예요':'둥근 우산을 가진 친구예요';label=names[kind]+' 수집하기';}
 }else if(Object.hasOwn(names,target)){
  const kind=occupant(target),pending=pendingKind(target);
  title='전시관 · '+SLOT_NAMES[target]+' '+SHAPES[progress.exhibition[target].shape]+' 수조';
  if(kind){
   const p=speciesState(kind);detail=names[kind]+' 전시 중'+(p.observed?' · 관찰 완료':' · 관찰 전');
   label=kind==='fish'&&p.observed?(p.decorated?'꾸미기 바꾸기':'수조 꾸미기'):names[kind]+' 가까이 보기';
   if(kind==='fish'&&p.observed){secondary.hidden=false;secondary.textContent='범돔 가까이 보기';}
  }else if(pending){detail='관리동에서 입수를 마쳤어요';label=objectName(pending)+' 전시관에 배치';}
  else if(target==='jelly'&&!unlocked('jelly')){detail='보름달물해파리 · 관찰용';label='해파리 가까이 보기';}
  else{detail='전시 편집에서 수조와 입수한 친구를 골라요';button.hidden=true;}
 }
 $('nearby-title').textContent=title;$('nearby-detail').textContent=detail;button.textContent=label;
}
function openManagement(){stop();refreshInventory();inventory.showModal();}
function openTank(tank){
 const p=speciesState(tank);if(!p.placed&&!(tank==='jelly'&&!unlocked('jelly')))return;
 stop();if(p.placed)p.observed=true;save();updateMission();
 const demo=tank==='jelly'&&!p.placed;
 $('viewer-title').textContent=names[tank]+' 수조'+(demo?' · 관찰용':'');
 $('viewer-frame').src=tank==='fish'?'fish-view.html?count=1&decor='+progress.decorations.map(k=>k||'').join(','):tank==='chromis'?'fish-view.html?species=chromis&count=1':'view.html?tank=jelly&count='+(demo?3:1)+(demo?'':'&exhibit=1');
 viewer.showModal();
}
function interact(target=nearby){
 if(!ready||modalOpen()||!target)return;
 if(target!==nearby){toast('조금 더 가까이 걸어가 보세요.');return;}
 if(target==='door'){const door=nearDoor(area,player.x,player.z);if(door)changeArea(door);return;}
 if(target==='management'){
  const kind=heldKind();if(!kind){openManagement();return;}
  stop();const p=speciesState(kind);p.bag=false;p.admitted=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Yes');
  toast(names[kind]+' 입수 완료! 전시관의 수조에 배치해요.');return;
 }
 if(target==='sea'||target.endsWith('-sea')){
  const kind=target==='sea'?'fish':target.slice(0,-4),p=speciesState(kind);
  if(!unlocked(kind)||p.bag||p.admitted||heldKind())return;
  stop();p.bag=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Wave');toast(objectName(kind)+' 만났어요! 관리동으로 데려가요.');return;
 }
 if(Object.hasOwn(names,target)){
  const kind=occupant(target),pending=pendingKind(target);
  if(kind){if(kind==='fish'&&progress.observed){stop();decorationEditor.open();}else openTank(kind);}
  else if(pending){
   stop();try{commitExhibition(editExhibition(snapshot(),target,{...progress.exhibition[target],kind:pending}));toast(names[pending]+' 전시를 준비했어요. 가까이 관찰해요.');}catch{toast('기기에 저장하지 못해 배치하지 않았어요.');}
  }else if(target==='jelly'&&!unlocked('jelly'))openTank('jelly');
 }
}

function material(color,extra={}) { return new THREE.MeshLambertMaterial({color,...extra}); }
function box(parent,w,h,d,x,y,z,color,extra={}) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,extra));
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function label(text,x,y,z,color='#263c59',wide=3.1,parent=galleryGroup||scene) {
  const image=document.createElement('canvas');image.width=512;image.height=112;
  const ctx=image.getContext('2d');ctx.fillStyle='#f3e2bc';ctx.beginPath();ctx.roundRect(2,2,508,108,30);ctx.fill();
  ctx.fillStyle=color;ctx.font='bold 64px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,58,470);
  const texture=new THREE.CanvasTexture(image);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(wide,wide*112/512,1);parent.add(sprite);return sprite;
}
function groundRing(x,z,color,radius=.7,parent=galleryGroup||scene) {
  const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.045,radius,36),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,side:THREE.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.18,z);parent.add(mesh);return mesh;
}
function setTankBody(id){
 const t=tanks[id],shape=progress.exhibition[id].shape;
 if(t.body){
  const old=new Set();t.body.traverse(n=>old.add(n));
  for(let i=clickable.length-1;i>=0;i--)if(old.has(clickable[i]))clickable.splice(i,1);
  t.body.removeFromParent();for(const g of t.body.userData.ownedGeometry||[])g.dispose();t.water.geometry.dispose();t.water.material.dispose();
 }
 const {group,glass}=aquariumModule(aquariumKit,shape),size=glass.getSize(new THREE.Vector3()),center=glass.getCenter(new THREE.Vector3());
 const water=new THREE.Mesh(shape==='cylinder'?new THREE.CylinderGeometry(size.x*.45,size.x*.45,size.y*.85,24):new THREE.BoxGeometry(size.x*.93,size.y*.85,size.z*.88),material('#399caf',{transparent:true,opacity:.14,depthWrite:false}));
 water.position.copy(center);group.add(water);
 const sign=aquariumProp(aquariumKit,'sign',{width:.48,height:.55,depth:.28});sign.position.set(1.1,0,.55);group.add(sign);
 group.position.set(TANKS[id].x,.13,TANKS[id].z);
 group.traverse(n=>{if(n.isMesh&&n.visible){n.userData.target=id;clickable.push(n);}});
 galleryGroup.add(group);t.body=group;t.water=water;t.glass={bottom:glass.min.y,center:center.y};t.shape=shape;
 t.host.position.y=.13+center.y;
}
function refreshExhibition(){
 if(!aquariumKit||!tanks.fish||!tanks.chromis||!tanks.jelly)return;
 const key=JSON.stringify(progress.exhibition);if(key===exhibitionKey)return;
 exhibitionKey=key;configureExhibition(progress.exhibition);guide=null;guideTarget=null;
 for(const id of SLOT_IDS){
  const t=tanks[id],choice=progress.exhibition[id];if(t.shape!==choice.shape)setTankBody(id);
  if(t.sign){t.sign.removeFromParent();t.sign.material.map.dispose();t.sign.material.dispose();}
  t.sign=label(SLOT_NAMES[id]+' · '+(names[choice.kind]||'빈 수조'),TANKS[id].x,3.1,TANKS[id].z,'#263c59',2.9);
 }
 for(const kind of SPECIES){
  const id=slotFor(progress,kind)||(kind==='jelly'&&!unlocked('jelly')&&!occupant('jelly')?'jelly':null);
  const sprite=({fish:fishSprite,chromis:chromisSprite,jelly:jellySprite})[kind];
  if(id&&sprite)tanks[id].host.add(sprite);
 }
 const stripey=slotFor(progress,'fish');
 if(stripey){tanks[stripey].body.add(tankDecor);tankDecor.position.set(0,tanks[stripey].glass.bottom+.02,0);}
}
function commitExhibition(next){
 const data=normalisePosition(next);writeSave(localStorage,data);
 for(const key of Object.keys(progress))progress[key]=data[key];
 area=data.location.area;player.x=data.location.x;player.z=data.location.z;saveOkay=true;$('save-status').textContent='이 기기에 저장됨';updateMission();applyArea();
}
function createTank(x,z,kind,texture,fishAsset){
 const host=new THREE.Group();host.position.set(x,1,z);galleryGroup.add(host);
 tanks[kind]={host};setTankBody(kind);
 let sprite;
 if(kind!=='jelly'){sprite=createFish(fishAsset,{length:kind==='chromis'?1.4:1.6,variant:kind==='chromis'?'chromis':'stripey'});sprite.rotation.y=Math.PI/2;}
 else{sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(1.25,1.05,1);}
 host.add(sprite);
 if(kind==='fish'){tankDecor=new THREE.Group();tankDecor.scale.set(.72,.55,.72);paintDecorations(tankDecor,progress.decorations);}
 groundRing(spotsFor('exhibition')[kind].x,spotsFor('exhibition')[kind].z,'#d1ab57',.68);
 return sprite;
}
function buildFacilities(){
 managementGroup=new THREE.Group();galleryGroup=new THREE.Group();scene.add(managementGroup,galleryGroup);
 const floorPositions=[];for(let x=-5;x<=5;x+=2)for(let z=-3;z>=-13;z-=2)floorPositions.push([x,z]);
 galleryGroup.add(aquariumFloorGrid(aquariumKit,floorPositions));
 box(galleryGroup,12.3,.2,12.1,0,0,-8,'#b8a990');
 box(galleryGroup,12.3,1.3,.2,0,.65,-14,'#384963');
 for(const x of [-6.1,6.1])box(galleryGroup,.2,.5,12,x,.25,-8,'#bbab8c');
 box(galleryGroup,1.3,.02,9,0,.13,-7,'#c5ac77');
 label('바다 친구 전시관',0,2.8,-13.6,'#263c59',4.5,galleryGroup);
 label('광장으로',0,1.3,-2.6,'#263c59',2.3,galleryGroup);
 groundRing(0,-2.75,'#d1ab57',.55,galleryGroup);
 box(managementGroup,4.6,.2,5.2,-3.7,0,1.9,'#d6c4a0');
 box(managementGroup,4.6,1.2,.2,-3.7,.6,-.7,'#384963');
 box(managementGroup,.2,.65,5.2,-5.95,.3,1.9,'#384963');
 label('관리동 · 입수',-3.7,2.3,-.45,'#263c59',3.4,managementGroup);
 label('광장으로',-1.75,1.2,3.25,'#263c59',2,managementGroup);
 for(const [i,kind] of Object.keys(names).entries()){
  const care=aquariumProp(aquariumKit,'care-tank',{width:.82,height:.92,depth:.74});care.rotation.y=Math.PI/2;care.position.set(-4.7,.13,.95+i*.95);managementGroup.add(care);
  holdingCrates[kind]=box(managementGroup,.08,.09,.25,-4.27,.82,.95+i*.95,'#d8c7a4');
 }
 groundRing(-2.9,1.9,'#bd914c',.65,managementGroup);
}
function applyArea(){
 campusGroup.visible=area==='harbor';managementGroup.visible=area==='management';galleryGroup.visible=area==='exhibition';
 scene.background.set(area==='harbor'?'#94c9ed':area==='management'?'#3e536b':'#314c65');
 scene.fog=new THREE.Fog(area==='harbor'?'#94c9ed':'#314c65',area==='harbor'?90:35,area==='harbor'?230:70);
 avatar.scale.setScalar(area==='harbor'?1.2:1);avatar.position.set(player.x,area==='harbor'?1.06:.12,player.z);
 guide=null;guideTarget=null;nearby=null;updateNearby(true);updateCamera(true);resize();
}
function changeArea(door){
 const previous=area;stop();area=door.to;
 const at=area==='harbor'?{x:DOORS[previous].x,z:DOORS[previous].z+1.55}:SPAWNS[area];
 player.x=at.x;player.z=at.z;player.angle=area==='harbor'?0:Math.PI;doorCooldown=.8;doorHold=0;doorId=null;
 applyArea();save();toast(area==='harbor'?'해안 광장으로 나왔어요':ZONE_NAMES[area]+'에 들어왔어요');
}
function updateDoor(dt){
 doorCooldown=Math.max(0,doorCooldown-dt);const door=nearDoor(area,player.x,player.z);
 if(!door||doorCooldown||direction.lengthSq()<.01||direction.x*door.dx+direction.z*door.dz<.65){doorHold=0;doorId=null;return;}
 if(doorId!==door.id){doorId=door.id;doorHold=0;}doorHold+=dt;
 $('nearby-detail').textContent='문 열기 '+Math.min(100,Math.floor(doorHold*100))+'%';
 if(doorHold>=1)changeArea(door);
}
function updateCamera(snap=false){
 if(area==='harbor'){camera.position.set(18,16,40);camera.lookAt(0,3.4,-1);return;}
 desiredTarget.set(area==='management'?-3.7:player.x,1,area==='management'?1.8:player.z-1.1);
 if(snap)cameraTarget.copy(desiredTarget);else cameraTarget.lerp(desiredTarget,.12);
 camera.position.copy(cameraTarget).add(new THREE.Vector3(0,area==='management'?5.3:7,area==='management'?7.3:10));camera.lookAt(cameraTarget);
}
function buildScene(textures,kit,fishAsset,facilityKit,campusAssets){
 aquariumKit=facilityKit;scene=new THREE.Scene();scene.background=new THREE.Color('#94c9ed');
 camera=new THREE.PerspectiveCamera(39,1,.1,300);
 scene.add(new THREE.HemisphereLight('#fff5da','#687d8b',2.1));
 const sun=new THREE.DirectionalLight('#fff3d4',2.7);sun.position.set(-18,40,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:110});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;scene.add(sun);
 campusGroup=createCampus(kit,campusAssets);scene.add(campusGroup);buildFacilities();
 fishSprite=createTank(TANKS.fish.x,TANKS.fish.z,'fish',textures.fish,fishAsset);jellySprite=createTank(TANKS.jelly.x,TANKS.jelly.z,'jelly',textures.jelly);chromisSprite=createTank(TANKS.chromis.x,TANKS.chromis.z,'chromis',null,fishAsset);
 poolFish=createFish(fishAsset,{length:1.5});poolFish.position.set(9.8,-.3,15.5);campusGroup.add(poolFish);
 seaChromis=createFish(fishAsset,{length:1.35,variant:'chromis'});seaChromis.position.set(-11,-.2,11);campusGroup.add(seaChromis);
 seaJelly=new THREE.Sprite(new THREE.SpriteMaterial({map:textures.jelly,depthWrite:false}));seaJelly.position.set(19,.25,7);seaJelly.scale.set(1.15,1,1);campusGroup.add(seaJelly);
 label('바다 탐사',12,2.1,14.3,'#294a67',3,campusGroup);
 chromisSign=label('자리돔 · 바위 해안',-11,2,10,'#294a67',3.3,campusGroup);
 jellySeaSign=label('해파리 · 잔잔한 바다',18,2,7,'#294a67',3.3,campusGroup);
 for(const spot of Object.values(COAST)){const ring=groundRing(spot.x,spot.z,'#c89e43',.65,campusGroup);ring.position.y=1.1;}
 avatar=createCaptain(kit.captain);scene.add(avatar);
 marker=new THREE.Mesh(new THREE.ConeGeometry(.17,.32,5),new THREE.MeshBasicMaterial({color:'#efbb4e'}));marker.rotation.x=Math.PI;scene.add(marker);
 decorationEditor=setupDecorationEditor(fishAsset,{getItems:()=>progress.decorations,onCommit:items=>{const completed=progress.decorated;progress.decorations=items;if(hasStarterDecor(items))progress.decorated=true;save();paintDecorations(tankDecor,items);updateMission();toast(!completed&&progress.decorated?'첫 수조 완성! 이제 자리돔을 만나러 가요.':'수조 장식을 바꿨어요.');}});
 updateMission();applyArea();
}
let viewportSize="";
function resize() {
  if(!renderer||!camera)return;
  const {width,height}=viewport.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(width,height,false);
  const size=width+':'+height;
  if(viewportSize&&viewportSize!==size)stop();viewportSize=size;
  const aspect=width/Math.max(height,1);camera.aspect=aspect;camera.fov=area==='harbor'?(aspect<1?68:39):48;camera.updateProjectionMatrix();
  if(ready)renderer.render(scene,camera);
}
function move(dt) {
  direction.set(input.x,0,input.z);
  if(keys.size){direction.set((keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),0,(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0));}
  moving=direction.lengthSq()>.001;
  if(!moving)return;
  direction.normalize();if(area==='harbor'){const x=direction.x,z=direction.z;direction.set(x*.916+z*.401,0,-x*.401+z*.916);}
  const speed=area==='harbor'?5.5:3.35;let dx=direction.x*speed*dt,dz=direction.z*speed*dt;
  const door=nearDoor(area,player.x,player.z);if(door&&direction.x*door.dx+direction.z*door.dz>.65){if(door.dx)dz=0;else dx=0;}
  const oldX=player.x,oldZ=player.z;
  if(!blocked(area,player.x+dx,player.z))player.x+=dx;
  if(!blocked(area,player.x,player.z+dz))player.z+=dz;
  const target=Math.atan2(direction.x,direction.z);
  player.angle+=Math.atan2(Math.sin(target-player.angle),Math.cos(target-player.angle))*Math.min(1,dt*13);
  moving=Math.hypot(player.x-oldX,player.z-oldZ)>.0001;
}
let guide=null,guideTarget=null,guideTime=-1;
function updateWaypoint(){
 const m=missionFor(progress);
 if(guideTarget!==m.target||time-guideTime>.25||!guide){guide=m.target?waypoint(area,player.x,player.z,m.target):null;guideTarget=m.target;guideTime=time;}
 const target=guide,node=$('waypoint');
 node.hidden=!target||target.final&&Math.hypot(player.x-target.x,player.z-target.z)<2.1;
 if(!node.hidden){
  const dx=target.x-player.x,dz=target.z-player.z,arrow=Math.abs(dz)>Math.abs(dx)?(dz>0?'↓':'↑'):(dx>0?'→':'←');
  node.textContent=arrow+' '+target.label;node.style.top=dz>0?'64%':'37%';
 }
 marker.visible=!!target;if(target)marker.position.set(target.x,2.2+(reducedMotion.matches?0:Math.sin(time*3)*.12),target.z);
}
function frame(stamp) {
  const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;
  if(ready&&!document.hidden&&!modalOpen()){
    time+=dt;move(dt);updateNearby();updateDoor(dt);updateWaypoint();
    avatar.position.set(player.x,area==='harbor'?1.06:.12,player.z);avatar.rotation.y=player.angle;
    avatar.userData.controller.update(dt,moving);
    updateCamera();
    if(!reducedMotion.matches){fishSprite.userData.update(dt);poolFish.userData.update(dt);fishSprite.position.x=Math.sin(time*.7)*.45;fishSprite.position.z=Math.cos(time*.7)*.12;fishSprite.rotation.y=Math.atan2(.45*Math.cos(time*.7),-.12*Math.sin(time*.7));poolFish.position.x=9.8+Math.sin(time*.7)*.6;poolFish.position.z=15.5+Math.cos(time*.7)*.16;poolFish.rotation.y=Math.atan2(.6*Math.cos(time*.7),-.16*Math.sin(time*.7));jellySprite.position.y=Math.sin(time*1.6)*.10;jellySprite.scale.set(1.25+Math.sin(time*2.45)*.05,1.05-Math.sin(time*2.45)*.06,1);}
    if(!reducedMotion.matches){
      chromisSprite.userData.update(dt*1.25);seaChromis.userData.update(dt*1.25);
      chromisSprite.position.x=Math.sin(time*1.05)*.5;chromisSprite.position.z=Math.cos(time*1.05)*.18;chromisSprite.rotation.y=Math.atan2(.5*Math.cos(time*1.05),-.18*Math.sin(time*1.05));
      seaChromis.position.z=11+Math.sin(time*.9)*.35;seaChromis.position.x=-11+Math.cos(time*.9)*.1;seaChromis.rotation.y=Math.atan2(-.1*Math.sin(time*.9),.35*Math.cos(time*.9));
      seaJelly.position.y=.25+Math.sin(time*1.6)*.12;seaJelly.scale.set(1.15+Math.sin(time*2.45)*.06,1-Math.sin(time*2.45)*.06,1);
    }
    if(stamp-lastPaint>1000/40){renderer.render(scene,camera);lastPaint=stamp;}
  }
  requestAnimationFrame(frame);
}
function tap(event) {
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=area==='exhibition'?raycaster.intersectObjects(clickable,false)[0]:null;
  if(hit){const target=hit.object.userData.target,kind=Object.hasOwn(names,target)?occupant(target):null;if(nearby===target&&kind)openTank(kind);else if(nearby===target)toast('오른쪽 행동 버튼을 눌러 주세요.');}
}
// One captured pointer owns movement; a second finger can use the action buttons.
canvas.addEventListener('pointerdown',event=>{
  if(!ready||modalOpen()||gesture||event.button!==0||!event.isPrimary)return;
  const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,started:performance.now(),dragged:false,move:x<rect.width*.54};
  canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
  if(gesture.move){
    const guide=$('drag-guide');guide.hidden=false;
    guide.style.left=`${Math.max(52,Math.min(rect.width-52,x))}px`;
    guide.style.top=`${Math.max(52,Math.min(rect.height-52,y))}px`;
    guide.firstElementChild.style.transform='translate(0px,0px)';
  }
});
canvas.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,distance=Math.hypot(dx,dy);
  if(distance>=10)gesture.dragged=true;
  if(!gesture.move)return;
  const amount=Math.min(32,distance),scale=distance?amount/distance:0;
  $('drag-guide').firstElementChild.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
  input.x=distance<10?0:dx/distance;input.z=distance<10?0:dy/distance;
});
canvas.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const isTap=!gesture.dragged&&performance.now()-gesture.started<700;
  stop();if(isTap)tap(event);
});
canvas.addEventListener('pointercancel',event=>{if(event.pointerId===gesture?.id)stop();});
canvas.addEventListener('lostpointercapture',event=>{if(event.pointerId===gesture?.id)stop();});
// Stop before the button's click: its nearby target cannot change under the second finger.
for(const id of ['interact','observe','edit-exhibition','help']){
 const button=$(id);let press=null,ignoreClickUntil=0;
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||press)return;
  stop();if(event.pointerType!=='touch')return;
  press={id:event.pointerId,x:event.clientX,y:event.clientY};
  button.setPointerCapture(event.pointerId);event.preventDefault();
 });
 button.addEventListener('pointerup',event=>{
  if(event.pointerId!==press?.id)return;
  const start=press;press=null;const rect=button.getBoundingClientRect();
  if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
  ignoreClickUntil=performance.now()+700;event.preventDefault();
  if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<18)button.click();
 });
 button.addEventListener('pointercancel',()=>{press=null;ignoreClickUntil=performance.now()+700;});
 button.addEventListener('lostpointercapture',()=>{press=null;});
 // Synthetic click above has detail 0; suppress the browser's later compatibility click.
 button.addEventListener('click',event=>{if(event.detail&&performance.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
}
canvas.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur',stop);
document.addEventListener('visibilitychange',()=>{stop();last=0;});
window.addEventListener('pagehide',stop);
window.addEventListener('keydown',event=>{
  if(modalOpen()||!ready||event.target.closest('button,input,a'))return;
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){event.preventDefault();keys.add(key);}
  if((key==='Enter'||key===' ')&&!event.repeat){event.preventDefault();interact();}
});
window.addEventListener('keyup',event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;keys.delete(key);if(ready&&keys.size===0)save();});
$('interact').addEventListener('click',()=>interact());
$('observe').addEventListener('click',()=>{if(!ready||modalOpen())return;if(nearby==='management')openManagement();else if(Object.hasOwn(names,nearby)&&occupant(nearby)==='fish')openTank('fish');});
decor.addEventListener('close',()=>{stop();last=0;canvas.focus({preventScroll:true});});
$('help').addEventListener('click',()=>{stop();help.showModal();});
$('close-help').addEventListener('click',()=>help.close());
$('close-management').addEventListener('click',()=>inventory.close());
inventory.addEventListener('close',()=>{stop();last=0;canvas.focus({preventScroll:true});});
$('close-viewer').addEventListener('click',()=>viewer.close());
viewer.addEventListener('close',()=>{stop();$('viewer-frame').src='about:blank';last=0;canvas.focus({preventScroll:true});});
help.addEventListener('close',()=>{stop();last=0;canvas.focus({preventScroll:true});});
$('retry').addEventListener('click',()=>location.reload());
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();ready=false;$('game-error').hidden=false;});

setupTransfer({
  snapshot,
  normalise:normalisePosition,
  pause:stop,
  onCommit:data=>{
    for(const key of Object.keys(progress))progress[key]=data[key];
    area=data.location.area;player.x=data.location.x;player.z=data.location.z;saveOkay=true;guide=null;guideTarget=null;
    if(tankDecor)paintDecorations(tankDecor,progress.decorations);
    updateMission();applyArea();$('save-status').textContent='이 기기에 저장됨';
  },
  onClose:()=>{stop();last=0;canvas.focus({preventScroll:true});}
});

exhibitionEditor=setupExhibition({snapshot,pause:stop,onCommit:commitExhibition,onClose:()=>{stop();last=0;canvas.focus({preventScroll:true});}});
$('edit-exhibition').addEventListener('click',()=>{if(ready&&!modalOpen()&&Object.hasOwn(names,nearby))exhibitionEditor.open(nearby);});
loadSave();configureExhibition(progress.exhibition);updateMission();
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const loader=new THREE.TextureLoader();
  const [fish,jelly,kit,fishAsset,facilityKit,campusAssets]=await Promise.all([loader.loadAsync('assets/stripey-flat.png'),loader.loadAsync('assets/moon-jelly-flat.png'),loadPirateKit(),loadFish(),loadAquariumKit(),loadCampus()]);
  fish.colorSpace=jelly.colorSpace=THREE.SRGBColorSpace;
  buildScene({fish,jelly},kit,fishAsset,facilityKit,campusAssets);ready=true;$('loading').hidden=true;resize();
  new ResizeObserver(resize).observe(viewport);
  if(!saveOkay)toast('저장 기록을 읽지 못해 새 탐험으로 열었어요.');else if(migrated)toast('기존 친구와 장식, 달성 기록을 이어왔어요.');
  // Read-only state and projection let browser checks exercise real input and rendering.
  window.jejuGame={getState:()=>({ready,zone:area,doorHold,guide,doors:area==='harbor'?DOORS:EXITS,location:snapshot().location,drawCalls:renderer.info.render.calls,tankShapes:Object.fromEntries(Object.entries(progress.exhibition).map(([k,t])=>[k,t.shape])),aquariumKit:{source:'Public Aquarium and Marine Centre',slots:Object.keys(tanks),care:3},decorationSlot:slotFor(progress,'fish'),decorationWorld:tankDecor.getWorldPosition(new THREE.Vector3()),renderedSpecies:Object.fromEntries([['fish',fishSprite],['chromis',chromisSprite],['jelly',jellySprite]].map(([kind,model])=>[kind,{visible:model.visible,position:model.getWorldPosition(new THREE.Vector3())}])),...progress,decorations:[...progress.decorations],placedDecorations:tankDecor.children.map(n=>n.name),player:{...player},moving,nearby,stage:stage(),saveOkay,dragging:!!gesture,controls:{side:gesture?(gesture.move?"move":"tap"):null,input:{...input}},captain:avatar.userData.controller.inspect(),fish:fishSprite.userData.inspect(),chromisModel:chromisSprite.userData.inspect(),mission:missionFor(progress),exhibits:{fish:progress.placed?1:0,chromis:progress.chromis.placed?1:0,jelly:progress.jelly.placed?1:0}}),screenPoint:(name)=>{
    const kind=name.endsWith('-tank')?name.slice(0,-5):null;const point=name==='player'?new THREE.Vector3(player.x,.5,player.z):kind?new THREE.Vector3(TANKS[kind].x,1.2,TANKS[kind].z):new THREE.Vector3((currentSpots()[name]||DOORS[name]).x,area==='harbor'?1.1:.2,(currentSpots()[name]||DOORS[name]).z);
    const rect=canvas.getBoundingClientRect();point.project(camera);return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  }};
  requestAnimationFrame(frame);
} catch(error) { console.error(error);$('loading').hidden=true;$('game-error').hidden=false; }
