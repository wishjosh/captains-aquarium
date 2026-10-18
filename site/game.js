import {SPECIES_INFO,SPECIES_NAMES,fishLength} from './species.js?v=2026-10-18-underwater-four-fish-1';
import {WATER_ORIGIN,LADDER,waterWorld,zoomValue,autoLook,ladderIntent,createLadder,clamp} from './expedition.js?v=2026-10-18-underwater-four-fish-1';
import {createCrew} from './crew.js?v=2026-10-18-underwater-four-fish-1';
import {aquariumLighting,lightingState} from './lighting.js?v=2026-10-18-underwater-four-fish-1';
import {createManagement} from './management.js?v=2026-10-18-underwater-four-fish-1';
import {managementSurface,managementCanStep} from './management-layout.js?v=2026-10-18-underwater-four-fish-1';
import {DIVE_START,createUnderwater,swimStep} from './underwater.js?v=2026-10-18-underwater-four-fish-1';
import {setupCare} from './care.js?v=2026-10-18-underwater-four-fish-1';
import * as THREE from './vendor/three.module.js?v=2026-10-18-underwater-four-fish-1';
import {loadPirateKit,createCaptain,placeProp} from './pirate.js?v=2026-10-18-underwater-four-fish-1';
import {loadFish,createFish} from './fish.js?v=2026-10-18-underwater-four-fish-1';
import {SAVE_KEY,SAVE_VERSION,emptyProgress,parseSave,writeSave,hasStarterDecor,missionFor,canCollect} from './progress.js?v=2026-10-18-underwater-four-fish-1';
import {START,TANKS,ZONE_NAMES,configureExhibition} from './layout.js?v=2026-10-18-underwater-four-fish-1';
import {CAMPUS_START,DOORS,EXITS,SPAWNS,COAST,MANAGEMENT,spotsFor,blocked,normaliseCampus,nearDoor,waypoint} from './campus-layout.js?v=2026-10-18-underwater-four-fish-1';
import {loadCampus,createCampus} from './campus.js?v=2026-10-18-underwater-four-fish-1';
import {paintDecorations} from './decorations.js?v=2026-10-18-underwater-four-fish-1';
import {setupDecorationEditor} from './decorate.js?v=2026-10-18-underwater-four-fish-1';
import {setupTransfer} from './transfer-ui.js?v=2026-10-18-underwater-four-fish-1';
import {SPECIES,SLOT_IDS,SLOT_NAMES,SHAPES,slotFor,editExhibition} from './exhibition.js?v=2026-10-18-underwater-four-fish-1';
import {setupExhibition} from './exhibition-ui.js?v=2026-10-18-underwater-four-fish-1';
import {loadAquariumKit,aquariumModule,aquariumProp,aquariumFloorGrid} from './aquarium-kit.js?v=2026-10-18-underwater-four-fish-1';

const $=id=>document.getElementById(id),canvas=$('world'),viewport=document.querySelector('.world-wrap');
const decor=$('decorate-dialog'),viewer=$('viewer-dialog'),help=$('help-dialog'),transfer=$('transfer-dialog'),inventory=$('management-dialog');
const exhibitionDialog=$('exhibition-dialog');
let underwater,careUI,lookGesture=null,managementFacility,crew,ladderModel;
const view={zoom:1,selected:null,focusX:0,focusZ:0,accessBlend:0,accessZoom:1},worldPointers=new Map();let pinch=null,depthGesture=null,ladder=null,ladderHold=0,ladderCooldown=0,doorApproach=null;
const dive={...DIVE_START};
const modalOpen=()=>careUI?.dialog.open||viewer.open||help.open||decor.open||transfer.open||inventory.open||exhibitionDialog.open;
const player={x:CAMPUS_START.x,z:CAMPUS_START.z,angle:.38},progress=emptyProgress();
let area='harbor',campusGroup,managementGroup,galleryGroup,doorHold=0,doorId=null,doorCooldown=0;
const currentSpots=()=>spotsFor(area);
const normalisePosition=data=>normaliseCampus(data);
let aquariumKit,exhibitionEditor,exhibitionKey='',tankDecor,decorationEditor;
let renderer,scene,camera,avatar,fishSprite,marker;
let ready=false,moving=false,nearby=null,toastTimer,time=0,last=0,lastPaint=0,saveOkay=true,migrated=false;
let gesture=null;
const input={x:0,z:0,vertical:0},keys=new Set(),clickable=[],holdingCrates={},tanks={};
const names=SPECIES_NAMES,fishModels={};
const speciesState=kind=>kind==='fish'?progress:progress[kind];
const heldKind=()=>SPECIES.find(k=>speciesState(k).bag);
const objectName=kind=>names[kind]+(kind==='fish'?'를':'을');
const unlocked=kind=>canCollect(progress,kind);
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
 doorApproach=null;worldPointers.clear();pinch=null;input.vertical=0;depthGesture=null;$('depth-control')?.classList.remove('active');
 const lookId=lookGesture?.id;lookGesture=null;if(lookId!==undefined&&canvas.hasPointerCapture(lookId))canvas.releasePointerCapture(lookId);
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
  $('view-'+kind).disabled=!p.admitted;const careButton=$('care-'+kind);if(careButton){careButton.disabled=!p.admitted;careButton.textContent=p.admitted?names[kind]+' · '+['첫 돌봄','돌봄 이어가기','다시 돌보기'][progress.care[kind]]:'입수 후 돌보기';}
  if(p.admitted)registered++;if(p.placed)exhibiting++;else if(p.admitted)holding++;
  if(holdingCrates[kind])holdingCrates[kind].material.color.set(p.admitted&&!p.placed?'#c79b51':'#d8c7a4');
 }
 $('management-summary').textContent='등록 '+registered+' / 4종 · 관리동 보관 '+holding+' · 전시 '+exhibiting;
}
function updateMission(){
 crew?.setCargo(heldKind());
 refreshExhibition();
 const m=missionFor(progress);
 $('mission-title').textContent=m.title;$('mission-detail').textContent=m.detail;
 $('mission-count').textContent=m.step+' / '+m.total;$('chapter').textContent=m.target?'제주 · '+m.chapter+'번째 임무':'제주 · 수집 완료';
 document.querySelectorAll('.mission-dots i').forEach((dot,i)=>{dot.hidden=i>=m.total;dot.classList.toggle('done',i<m.step);});
 const held=heldKind();$('bag-count').textContent=held?'가방 · '+names[held]+' 1':'가방 0';
 $('collection-count').textContent='전시 친구 '+Object.keys(names).filter(k=>speciesState(k).placed).length+' / 4종';
 for(const [kind,model] of Object.entries(fishModels))model.visible=speciesState(kind).placed;
 if(tankDecor)tankDecor.visible=progress.placed;
 refreshInventory();updateNearby(true);
}
function updateNearby(force=false){
 if(area==='underwater'){
  const target=underwater?.target(dive);nearby=target?'dive-'+target:null;
  $('area-name').textContent='얕은 바다 · 수중 탐사';$('mission-detail').textContent=heldKind()?'사다리에 접근해 상승하면 부두로 돌아가요.':'생물에 가까이 가서 직접 눌러 수집해요.';$('edit-exhibition').hidden=true;$('observe').hidden=true;$('interact').hidden=true;
  let title='해초와 바위 사이를 살펴봐요',detail='왼쪽 수평 이동 · 오른쪽 수심 조절 · 생물을 눌러 수집';
  if(Math.hypot(dive.x,dive.z-LADDER.waterZ)<1.8){title='부두 사다리';detail=dive.y<2.35?'조금 올라가 사다리 아래쪽에 접근해요':'상승을 계속하면 사다리를 타고 올라가요';}
  else if(target&&target!=='return'){title=names[target];detail=heldKind()?'조수가 생물을 운반하고 있어요':underwater.canCollect(target,dive)?'친구를 직접 눌러 데려가요':'조금 더 가까이 가 보세요';if(!progress.discovered[target]){progress.discovered[target]=true;save();}}
  $('nearby-title').textContent=title;$('nearby-detail').textContent=detail;return;
 }
 const zone=area;$('area-name').textContent=ZONE_NAMES[zone];
 let target=null,distance=Infinity;
 for(const [name,spot] of Object.entries(currentSpots())){
  if(name==='management'&&zone!=='management'||SLOT_IDS.includes(name)&&zone!=='exhibition')continue;
  const d=Math.hypot(player.x-spot.x,player.z-spot.z);
  if(d<2.0&&d<distance){target=name;distance=d;}
 }
 if(area==='management'&&managementSurface(player.x,player.z).kind==='deck'){
  const slot=MANAGEMENT.slots.find(s=>Math.hypot(player.x-s.x,player.z-MANAGEMENT.deck.z)<2);
  if(slot){const kind=SPECIES.find(k=>SPECIES_INFO[k].holdingSlot===slot.kind&&speciesState(k).admitted&&!speciesState(k).placed)||SPECIES.find(k=>SPECIES_INFO[k].holdingSlot===slot.kind&&speciesState(k).admitted);target=heldKind()?'management':kind?'care-'+kind:'management';}
 }

 const staff=crew?.actors[area];if(staff&&Math.hypot(player.x-staff.position.x,player.z-staff.position.z)<2.2)target='staff-'+area;
 const door=nearDoor(area,player.x,player.z);if(door){target='door';}
 if(!force&&target===nearby)return;nearby=target;
 const button=$('interact'),secondary=$('observe');button.hidden=!target;secondary.hidden=true;$('edit-exhibition').hidden=!SLOT_IDS.includes(target);
 let title=ZONE_NAMES[zone],detail=zone==='harbor'?'왼쪽 관리동 · 오른쪽 전시관 · 앞쪽 바다':'왼쪽을 누르고 끌어 이동해요',label='';
 if(target==='door'){title=door.label;detail='문 쪽으로 1초간 걸으면 출입해요';label='문 열기';}
 else if(target?.startsWith('care-')){const kind=target.slice(5);title=names[kind]+' · 관리 수조';detail='작업 데크에서 상태와 먹이 반응을 살펴봐요';label=names[kind]+' 돌보기';}
 else if(target==='management'||target==='staff-management'){
  const kind=heldKind();title='관리동 · 입수와 보유 현황';
  detail=kind?names[kind]+'의 입수를 마친 뒤 첫 돌봄을 시작해요':'입수한 친구를 고르고 첫 돌봄을 이어가요';
  label=kind?objectName(kind)+' 관리동에 입수':'관리동 현황 보기';
  secondary.hidden=!kind;secondary.textContent='보유 생물 보기';
 }else if(target==='staff-exhibition'){title='전시 담당';detail='입수한 친구의 전시 위치와 수조를 골라요';label='전시 준비하기';
 }else if(target==='sea'){
  title='부두 · 바다 사다리';detail='부두 끝 사다리 쪽으로 계속 걸어 내려가요';button.hidden=true;
 }else if(SLOT_IDS.includes(target)){
  const kind=occupant(target),pending=pendingKind(target);
  title='전시관 · '+SLOT_NAMES[target]+' '+SHAPES[progress.exhibition[target].shape]+' 수조';
  if(kind){
   const p=speciesState(kind);detail=names[kind]+' 전시 중'+(p.observed?' · 관찰 완료':' · 관찰 전');
   label=kind==='fish'&&p.observed?(p.decorated?'꾸미기 바꾸기':'수조 꾸미기'):names[kind]+' 가까이 보기';
   if(kind==='fish'&&p.observed){secondary.hidden=false;secondary.textContent='흰동가리 가까이 보기';}
  }else if(pending){detail='관리동에서 입수를 마쳤어요';label=objectName(pending)+' 전시관에 배치';}
  else{detail='전시 편집에서 수조와 입수한 친구를 골라요';button.hidden=true;}
 }
 $('nearby-title').textContent=title;$('nearby-detail').textContent=detail;button.textContent=label;
}
function openManagement(){stop();refreshInventory();inventory.showModal();}
function openTank(tank){
 if(!SPECIES.includes(tank))return;const p=speciesState(tank);if(!p.admitted)return;
 stop();p.observed=true;save();updateMission();
 const demo=false;
 $('viewer-title').textContent=names[tank]+' 수조'+(demo?' · 관찰용':'');
 $('viewer-frame').src='fish-view.html?v=2026-10-18-underwater-four-fish-1&kind='+tank+'&count=1&decor='+(tank==='fish'?progress.decorations.map(k=>k||'').join(','):',,');
 viewer.showModal();
}
function interact(target=nearby){
 if(!ready||modalOpen()||!target)return;
 if(target!==nearby){toast('조금 더 가까이 걸어가 보세요.');return;}
 if(target.startsWith('dive-')){if(target!=='dive-return')collectFish(target.slice(5));return;}
 if(target==='door'){const door=nearDoor(area,player.x,player.z);if(door){stop();doorApproach={door,elapsed:0};}return;}
 if(target.startsWith('care-')){stop();careUI.open(target.slice(5));return;}
 if(target==='management'||target==='staff-management'){
  const kind=heldKind();if(!kind){openManagement();return;}
  stop();const p=speciesState(kind);p.bag=false;p.admitted=true;save();updateMission();canvas.focus({preventScroll:true});avatar.userData.controller.celebrate('Yes');
  toast(names[kind]+' 입수 완료! 관리동에서 첫 돌봄을 시작해요.');careUI.open(kind);return;
 }
 if(target==='sea'){toast('부두 끝의 사다리를 향해 계속 걸어가 보세요.');return;}
 if(target==='staff-exhibition'){stop();exhibitionEditor.open('fish');return;}
 if(SLOT_IDS.includes(target)){
  const kind=occupant(target),pending=pendingKind(target);
  if(kind){if(kind==='fish'&&progress.observed){stop();decorationEditor.open();}else openTank(kind);}
  else if(pending){
   stop();try{commitExhibition(editExhibition(snapshot(),target,{...progress.exhibition[target],kind:pending}));toast(names[pending]+' 전시를 준비했어요. 가까이 관찰해요.');}catch{toast('기기에 저장하지 못해 배치하지 않았어요.');}
  }
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
  const id=slotFor(progress,kind);
  const sprite=fishModels[kind];
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
function createTank(x,z,kind,fishAsset){
 const host=new THREE.Group();host.position.set(x,1,z);galleryGroup.add(host);
 tanks[kind]={host};setTankBody(kind);
 let sprite;
 if(kind==='fish'){sprite=createFish(fishAsset,{kind,length:fishLength(kind)});fishModels.fish=sprite;sprite.rotation.y=Math.PI/2;}else sprite=new THREE.Group();
 host.add(sprite);
 if(kind==='fish'){tankDecor=new THREE.Group();tankDecor.scale.set(.72,.55,.72);paintDecorations(tankDecor,progress.decorations);}
 groundRing(spotsFor('exhibition')[kind].x,spotsFor('exhibition')[kind].z,'#d1ab57',.68);
 return sprite;
}
function buildFacilities(fishAsset){
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
 managementFacility=createManagement(fishAsset,progress);managementGroup.add(managementFacility.group);Object.assign(holdingCrates,managementFacility.indicators);
 managementGroup.userData.floorTileCount=0;

}
let accessPoint=null;
function applyZoom(){if(camera){camera.zoom=Math.max(view.zoom,view.accessZoom);camera.updateProjectionMatrix();}}
function setZoom(value){view.zoom=zoomValue(value);applyZoom();}
function updateAccessCamera(dt){
 let point=null;
 if(doorApproach)point=doorApproach.door;
 else if(ladder)point={x:LADDER.x,z:LADDER.z};
 else if(area==='harbor'){
  const door=nearDoor(area,player.x,player.z);
  if(door&&(doorHold>0||direction.x*door.dx+direction.z*door.dz>.5))point=door;
  else if(Math.hypot(player.x-LADDER.x,player.z-LADDER.z)<2&&direction.z>.5)point={x:LADDER.x,z:LADDER.z};
 }else if(area==='underwater'){
  const vertical=input.vertical+(keys.has('q')?1:0)-(keys.has('e')?1:0);
  if(Math.hypot(dive.x,dive.z-LADDER.waterZ)<2&&dive.y>2.1&&vertical>.2)point={x:LADDER.x,z:LADDER.z};
 }else{const door=nearDoor(area,player.x,player.z);if(door&&(doorHold>0||direction.x*door.dx+direction.z*door.dz>.5))point=door;}
 const blend=1-Math.exp(-dt*6);view.accessBlend+=((point?1:0)-view.accessBlend)*blend;view.accessZoom=1+view.accessBlend;
 if(point)accessPoint={...point};else if(view.accessBlend<.001)accessPoint=null;applyZoom();
}
function collectFish(kind){
 if(area!=='underwater'||ladder||!underwater.creatures[kind]?.visible)return;
 view.selected=kind;if(!underwater.canCollect(kind,dive)){toast('선택했어요. 생물 가까이에서 다시 눌러 주세요.');return;}
 const p=speciesState(kind);if(!unlocked(kind)||p.bag||p.admitted||heldKind())return;
 stop();p.bag=true;progress.discovered[kind]=true;view.selected=null;underwater.update(0,time,progress,reducedMotion.matches);save();updateMission();toast(objectName(kind)+' 만났어요. 조수와 사다리로 돌아가요.');
}
function settleLadder(inWater){
 area=inWater?'underwater':'harbor';Object.assign(dive,DIVE_START);player.x=inWater?dive.x:LADDER.x;accessPoint=inWater?null:{x:LADDER.x,z:LADDER.z};player.z=inWater?dive.z:LADDER.landingZ;player.angle=Math.PI;
 ladder=null;ladderHold=0;ladderCooldown=.8;view.selected=null;applyArea();save();updateMission();toast(inWater?'왼쪽은 수평 이동, 오른쪽은 상승·하강이에요.':'사다리를 올라 부두로 돌아왔어요.');
}
function beginLadder(enter){
 if(ladder)return;stop();ladder={enter,elapsed:0,startY:dive.y};ladderHold=0;
 $('ladder-message').hidden=false;$('ladder-message').textContent=enter?'사다리를 타고 내려가요':'사다리를 타고 올라가요';$('depth-control').hidden=true;
 if(!enter){area='harbor';player.x=LADDER.x;player.z=LADDER.landingZ;applyArea();avatar.visible=false;camera.position.set(-18,16,40);camera.lookAt(LADDER.x,.8,LADDER.z);}
}
function updateLadder(dt){
 if(!ladder)return false;const a=ladder;a.elapsed+=dt;const t=clamp(a.elapsed/LADDER.duration,0,1),smooth=n=>n*n*(3-2*n);
 if(a.enter){
  if(t<.42){const q=t/.42;player.x=LADDER.x;player.z=LADDER.landingZ;avatar.visible=q<.88;avatar.position.set(LADDER.x,LADDER.deck-4.01*q,LADDER.bodyZ);camera.position.set(-18,16,40);camera.lookAt(avatar.position.x,avatar.position.y+1.4,avatar.position.z);}
  else{const q=(t-.42)/.58;if(area!=='underwater'){area='underwater';applyArea();}dive.x=0;dive.z=9.3-1.3*q;dive.y=6.3-3.5*q;dive.yaw=0;dive.pitch=0;player.x=dive.x;player.z=dive.z;avatar.visible=false;camera.position.copy(waterWorld(dive));camera.lookAt(camera.position.x,camera.position.y,camera.position.z-1);}
 }else{
  // A third-person view keeps the camera out of the ladder rungs during ascent.
  const bottom=Math.min(-2.95,a.startY+WATER_ORIGIN.y),height=bottom+(LADDER.deck-bottom)*smooth(t);
  avatar.position.set(LADDER.x,height,LADDER.bodyZ);avatar.visible=height+2.5>-.65;
  camera.position.set(-18,16,40);camera.lookAt(LADDER.x,Math.max(-.2,height+1.4),LADDER.z);
 }
 avatar.rotation.y=Math.PI;avatar.userData.controller.update(dt,false);
 if(t===1){$('ladder-message').hidden=true;settleLadder(a.enter);}return true;
}
function updateLadderIntent(dt){
 ladderCooldown=Math.max(0,ladderCooldown-dt);const vertical=input.vertical+(keys.has('q')?1:0)-(keys.has('e')?1:0);
 if(!ladderCooldown&&ladderIntent(area,player,dive,direction,vertical)){ladderHold+=dt;if(ladderHold>=LADDER.hold)beginLadder(area==='harbor');}else ladderHold=0;
}
function applyArea(){
 underwater.group.visible=area==='underwater';avatar.visible=area!=='underwater';
 if(area==='underwater'){player.x=dive.x;player.z=dive.z;}

 campusGroup.visible=area==='harbor';managementGroup.visible=area==='management';galleryGroup.visible=area==='exhibition';
 scene.background.set(area==='underwater'?'#226779':area==='harbor'?'#94c9ed':area==='management'?'#3e536b':'#314c65');
 scene.fog=new THREE.Fog(area==='harbor'?'#94c9ed':'#314c65',area==='harbor'?90:35,area==='harbor'?230:70);
 if(area==='underwater')scene.fog=new THREE.Fog('#226779',10,34);
 avatar.scale.setScalar(area==='harbor'?1.2:1);avatar.position.set(player.x,area==='harbor'?1.06:area==='management'?.12+managementSurface(player.x,player.z).height:.12,player.z);
 $('depth-control').hidden=area!=='underwater'||!!ladder;document.querySelector('.move-hint').textContent=area==='underwater'?'왼쪽 이동 · 생물을 눌러 수집 · 두 손가락 확대':'왼쪽 이동 · 두 손가락 확대';
 guide=null;guideTarget=null;nearby=null;updateNearby(true);updateCamera(true);resize();
}
function changeArea(door){
 const previous=area;stop();accessPoint=null;area=door.to;
 const at=area==='harbor'?{x:DOORS[previous].x,z:DOORS[previous].z+1.55}:SPAWNS[area];
 player.x=at.x;player.z=at.z;player.angle=area==='harbor'?0:Math.PI;doorCooldown=.8;doorHold=0;doorId=null;
 applyArea();save();toast(area==='harbor'?'해안 광장으로 나왔어요':ZONE_NAMES[area]+'에 들어왔어요');
}
function updateDoor(dt){
 if(area==='underwater')return;
 doorCooldown=Math.max(0,doorCooldown-dt);const door=nearDoor(area,player.x,player.z);
 if(!door||doorCooldown||direction.lengthSq()<.01||direction.x*door.dx+direction.z*door.dz<.65){doorHold=0;doorId=null;return;}
 if(doorId!==door.id){doorId=door.id;doorHold=0;}doorHold+=dt;
 $('nearby-detail').textContent='문 열기 '+Math.min(100,Math.floor(doorHold*100))+'%';
 if(doorHold>=1)changeArea(door);
}
function updateCamera(snap=false){
 if(ladder)return;
 if(area==='underwater'){const at=waterWorld(dive);camera.position.copy(at);camera.lookAt(at.x+Math.sin(dive.yaw)*Math.cos(dive.pitch),at.y+Math.sin(dive.pitch),at.z-Math.cos(dive.yaw)*Math.cos(dive.pitch));return;}
 const point=nearby==='staff-management'?crew?.actors.management.position:nearby==='staff-exhibition'?crew?.actors.exhibition.position:SLOT_IDS.includes(nearby)?TANKS[nearby]:null;
 const desiredX=clamp((point?.x??player.x)*.12,-2.2,2.2),desiredZ=clamp(((point?.z??player.z)-2)*.1,-1.4,1.4),blend=snap?1:.04;
 view.focusX+=(desiredX-view.focusX)*blend;view.focusZ+=(desiredZ-view.focusZ)*blend;
 if(area==='harbor'){camera.position.set(-18,16,40);const target=new THREE.Vector3(view.focusX,3.4,-1+view.focusZ);if(accessPoint)target.lerp(new THREE.Vector3(accessPoint.x,2.3,accessPoint.z),view.accessBlend);camera.lookAt(target);return;}
 desiredTarget.set(player.x-(area==='management'?1.5:0),1+(area==='management'?managementSurface(player.x,player.z).height:0),player.z-1.1);
 if(snap)cameraTarget.copy(desiredTarget);else cameraTarget.lerp(desiredTarget,.12);
 camera.position.copy(cameraTarget).add(new THREE.Vector3(0,area==='management'?8.4:7,area==='management'?12:10));camera.lookAt(cameraTarget.x+view.focusX*.25,cameraTarget.y,cameraTarget.z+view.focusZ*.25);
}
function buildScene(textures,kit,fishAsset,facilityKit,campusAssets){
 aquariumKit=facilityKit;scene=new THREE.Scene();scene.background=new THREE.Color('#94c9ed');
 camera=new THREE.PerspectiveCamera(39,1,.1,300);
 const {key:sun}=aquariumLighting(scene,{renderer,keyPosition:[-18,40,25]});sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:110});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;scene.add(sun);
 campusGroup=createCampus(kit,campusAssets);scene.add(campusGroup);buildFacilities(fishAsset);
 underwater=createUnderwater(fishAsset,campusAssets);underwater.group.position.set(WATER_ORIGIN.x,WATER_ORIGIN.y,WATER_ORIGIN.z);scene.add(underwater.group);ladderModel=createLadder();scene.add(ladderModel);
 careUI=setupCare(fishAsset,{progress,pause:stop,commit:()=>{save();updateMission();refreshInventory();}});
 fishSprite=createTank(TANKS.fish.x,TANKS.fish.z,'fish',fishAsset);createTank(TANKS.jelly.x,TANKS.jelly.z,'jelly',fishAsset);createTank(TANKS.chromis.x,TANKS.chromis.z,'chromis',fishAsset);
 for(const kind of SPECIES.filter(k=>k!=='fish')){const model=createFish(fishAsset,{kind,length:fishLength(kind)});model.visible=false;fishModels[kind]=model;galleryGroup.add(model);}
 label('바다 사다리',LADDER.x,2.1,LADDER.z,'#294a67',3,campusGroup);
 for(const spot of Object.values(COAST)){const ring=groundRing(spot.x,spot.z,'#c89e43',.65,campusGroup);ring.position.y=1.1;}
 avatar=createCaptain(kit.captain);scene.add(avatar);crew=createCrew(kit,fishAsset,{label,blocked,canStep:managementCanStep,surface:managementSurface});scene.add(crew.group);
 marker=new THREE.Mesh(new THREE.ConeGeometry(.17,.32,5),new THREE.MeshBasicMaterial({color:'#efbb4e'}));marker.rotation.x=Math.PI;scene.add(marker);
 decorationEditor=setupDecorationEditor(fishAsset,{getItems:()=>progress.decorations,onCommit:items=>{const completed=progress.decorated;progress.decorations=items;if(hasStarterDecor(items))progress.decorated=true;save();paintDecorations(tankDecor,items);updateMission();toast(!completed&&progress.decorated?'첫 수조를 꾸몄어요!':'수조 장식을 바꿨어요.');}});
 updateMission();applyArea();
}
let viewportSize="";
function resize() {
  if(!renderer||!camera)return;
  const {width,height}=viewport.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(width,height,false);
  const size=width+':'+height;
  if(viewportSize&&viewportSize!==size)stop();viewportSize=size;
  const aspect=width/Math.max(height,1);camera.aspect=aspect;camera.fov=area==='underwater'?68:area==='harbor'?(aspect<1?68:39):48;camera.updateProjectionMatrix();
  if(ready)renderer.render(scene,camera);
}
function move(dt) {
  direction.set(input.x,0,input.z);
  if(keys.size){direction.set((keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),0,(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0));}
  if(area==='underwater'){const vertical=clamp(input.vertical+(keys.has('q')?1:0)-(keys.has('e')?1:0),-1,1);moving=swimStep(dive,direction.x,direction.z,dt,vertical);player.x=dive.x;player.z=dive.z;$('depth-value').textContent=(7-dive.y).toFixed(1)+'m';$('depth-control').setAttribute('aria-valuenow',dive.y.toFixed(1));return;}
  moving=direction.lengthSq()>.001;
  if(!moving)return;
  direction.normalize();if(area==='harbor'){const x=direction.x,z=direction.z;direction.set(x*.916-z*.401,0,x*.401+z*.916);}
  const speed=area==='harbor'?5.5:3.35;let dx=direction.x*speed*dt,dz=direction.z*speed*dt;
  const door=nearDoor(area,player.x,player.z);if(door&&direction.x*door.dx+direction.z*door.dz>.65){if(door.dx)dz=0;else dx=0;}
  const oldX=player.x,oldZ=player.z;
  if(area==='management'?managementCanStep(player.x,player.z,player.x+dx,player.z):!blocked(area,player.x+dx,player.z))player.x+=dx;
  if(area==='management'?managementCanStep(player.x,player.z,player.x,player.z+dz):!blocked(area,player.x,player.z+dz))player.z+=dz;
  const target=Math.atan2(direction.x,direction.z);
  player.angle+=Math.atan2(Math.sin(target-player.angle),Math.cos(target-player.angle))*Math.min(1,dt*13);
  moving=Math.hypot(player.x-oldX,player.z-oldZ)>.0001;
}
let guide=null,guideTarget=null,guideTime=-1;
function updateWaypoint(){
 if(area==='underwater'){
  const target=heldKind()?{x:0,z:9,label:'부두 사다리'}:null;marker.visible=false;
  const node=$('waypoint');node.hidden=false;
  const m=missionFor(progress),wanted=m.kind;
  const bearing=Math.atan2(-dive.x,dive.z-9)-dive.yaw,side=Math.sin(bearing),front=Math.cos(bearing),arrow=front>.7?'↑':front<-.7?'↶':side>0?'→':'←';
  node.textContent=target?arrow+' 사다리까지 '+Math.round(Math.hypot(dive.x,dive.z-9))+'m · 입구 쪽으로':wanted?'찾을 친구 · '+names[wanted]:'자유 탐사 · 바다 친구 관찰';
  node.style.top='32%';guide=null;return;
 }

 const m=missionFor(progress);
 if(guideTarget!==m.target||time-guideTime>.25||!guide){guide=m.target?waypoint(area,player.x,player.z,m.target):null;guideTarget=m.target;guideTime=time;}
 const target=guide,node=$('waypoint');
 node.hidden=!target||target.final&&Math.hypot(player.x-target.x,player.z-target.z)<2.1;
 if(!node.hidden){
  const dx=target.x-player.x,dz=target.z-player.z,arrow=Math.abs(dz)>Math.abs(dx)?(dz>0?'↓':'↑'):(dx>0?'→':'←');
  node.textContent=arrow+' '+target.label;node.style.top=dz>0?'64%':'37%';
 }
 marker.visible=!!target;if(target)marker.position.set(target.x,(area==='management'?managementSurface(target.x,target.z).height:0)+2.2+(reducedMotion.matches?0:Math.sin(time*3)*.12),target.z);
}
function frame(stamp) {
  const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;
  if(ready&&!document.hidden&&!modalOpen()){
    time+=dt;updateAccessCamera(dt);
    if(doorApproach){doorApproach.elapsed+=dt;if(doorApproach.elapsed>=.65){const door=doorApproach.door;doorApproach=null;changeArea(door);}}
    const climbing=updateLadder(dt);
    if(!climbing){if(doorApproach){moving=false;direction.set(0,0,0);}else move(dt);if(area==='management')managementFacility.update(reducedMotion.matches?0:dt,time);if(area==='underwater'){underwater.update(dt,time,progress,reducedMotion.matches);const target=view.selected&&underwater.creatures[view.selected]?.visible?underwater.creatures[view.selected].position:null;autoLook(dive,target,dt);}updateNearby();updateDoor(dt);updateLadderIntent(dt);updateWaypoint();
     avatar.position.set(player.x,area==='harbor'?1.06:area==='management'?.12+managementSurface(player.x,player.z).height:.12,player.z);avatar.rotation.y=player.angle;avatar.userData.controller.update(dt,moving);updateCamera();}
    ladderModel.visible=area==='harbor'||area==='underwater';crew.update(dt,{area,player,worldPosition:area==='underwater'?waterWorld(dive):avatar.position,held:heldKind(),climbing:!!ladder});
    if(!reducedMotion.matches)for(const model of Object.values(fishModels)){if(!model.visible)continue;model.userData.update(dt);model.position.x=Math.sin(time*.7)*.45;model.position.z=Math.cos(time*.7)*.12;model.rotation.y=Math.atan2(.45*Math.cos(time*.7),-.12*Math.sin(time*.7));}
    if(stamp-lastPaint>1000/40){renderer.render(scene,camera);lastPaint=stamp;}
  }
  requestAnimationFrame(frame);
}
function tap(event) {
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  if(area==='underwater'){const kind=underwater.pick(raycaster);if(kind)collectFish(kind);return;}
  const role=crew.pick(raycaster,area);if(role){const actor=crew.actors[role];if(Math.hypot(player.x-actor.position.x,player.z-actor.position.z)<2.3){nearby='staff-'+role;interact(nearby);}else toast('담당자 가까이로 걸어가 보세요.');return;}
  const hit=area==='exhibition'?raycaster.intersectObjects(clickable,false)[0]:null;
  if(hit){const target=hit.object.userData.target,kind=SLOT_IDS.includes(target)?occupant(target):null;if(nearby===target&&kind)openTank(kind);else if(nearby===target)toast('오른쪽 행동 버튼을 눌러 주세요.');}
}
// Two pointers on the world zoom; the separate depth slider can be used with movement.
canvas.addEventListener('pointerdown',event=>{
 if(!ready||modalOpen()||ladder||doorApproach||event.button!==0)return;
 worldPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
 if(worldPointers.size>=2){const [a,b]=[...worldPointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:view.zoom};gesture=null;depthGesture=null;keys.clear();input.x=input.z=input.vertical=0;$('drag-guide').hidden=true;return;}
 if(pinch)return;const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
 gesture={id:event.pointerId,x:event.clientX,y:event.clientY,started:performance.now(),dragged:false,move:x<rect.width*.54};
 if(gesture.move){const guide=$('drag-guide');guide.hidden=false;guide.style.left=`${clamp(x,52,rect.width-52)}px`;guide.style.top=`${clamp(y,52,rect.height-52)}px`;guide.firstElementChild.style.transform='translate(0px,0px)';}
});
canvas.addEventListener('pointermove',event=>{
 if(worldPointers.has(event.pointerId))worldPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pinch){if(worldPointers.size>=2){const [a,b]=[...worldPointers.values()];setZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance));}return;}
 if(!gesture||event.pointerId!==gesture.id)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,distance=Math.hypot(dx,dy);if(distance>=10)gesture.dragged=true;if(!gesture.move)return;
 const amount=Math.min(32,distance),scale=distance?amount/distance:0;$('drag-guide').firstElementChild.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;input.x=distance<10?0:dx/distance;input.z=distance<10?0:dy/distance;
});
canvas.addEventListener('pointerup',event=>{
 worldPointers.delete(event.pointerId);
 if(pinch){if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(!worldPointers.size){pinch=null;gesture=null;save();}return;}
 if(!gesture||event.pointerId!==gesture.id)return;const isTap=!gesture.dragged&&performance.now()-gesture.started<700;stop();if(isTap)tap(event);
});
canvas.addEventListener('pointercancel',stop);
canvas.addEventListener('lostpointercapture',event=>{if(gesture?.id===event.pointerId&&!pinch)stop();});
canvas.addEventListener('wheel',event=>{if(!ready||modalOpen()||ladder)return;event.preventDefault();setZoom(view.zoom*Math.exp(-event.deltaY*.001));},{passive:false});
const depthControl=$('depth-control');
depthControl.addEventListener('pointerdown',event=>{if(area!=='underwater'||ladder||depthGesture)return;event.preventDefault();const r=depthControl.getBoundingClientRect();depthGesture={id:event.pointerId,y:r.top+r.height/2};input.vertical=clamp((depthGesture.y-event.clientY)/38,-1,1);depthControl.setPointerCapture(event.pointerId);depthControl.classList.add('active');});
depthControl.addEventListener('pointermove',event=>{if(event.pointerId===depthGesture?.id)input.vertical=clamp((depthGesture.y-event.clientY)/38,-1,1);});
function endDepth(event){if(event.pointerId!==depthGesture?.id)return;depthGesture=null;input.vertical=0;depthControl.classList.remove('active');save();}
for(const type of ['pointerup','pointercancel','lostpointercapture'])depthControl.addEventListener(type,endDepth);
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
  if(key==='Escape'&&doorApproach){stop();return;}
  if(key==='Escape'&&ladder){const inWater=ladder.elapsed/LADDER.duration>.5?ladder.enter:!ladder.enter;$('ladder-message').hidden=true;settleLadder(inWater);return;}
  if(key==='+'||key==='='){setZoom(view.zoom*1.12);return;}if(key==='-'){setZoom(view.zoom/1.12);return;}if(key==='0'){setZoom(1);return;}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','q','e'].includes(key)){event.preventDefault();keys.add(key);}
  if((key==='Enter'||key===' ')&&!event.repeat){event.preventDefault();interact();}
});
window.addEventListener('keyup',event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;keys.delete(key);if(ready&&keys.size===0)save();});
$('interact').addEventListener('click',()=>interact());
$('observe').addEventListener('click',()=>{if(!ready||modalOpen())return;if(nearby==='management')openManagement();else if(SLOT_IDS.includes(nearby)&&occupant(nearby))openTank(occupant(nearby));});
decor.addEventListener('close',()=>{stop();last=0;canvas.focus({preventScroll:true});});
$('help').addEventListener('click',()=>{stop();help.showModal();});
$('close-help').addEventListener('click',()=>help.close());
for(const k of Object.keys(names)){ $('care-'+k).addEventListener('click',()=>{inventory.close();careUI.open(k);});$('view-'+k).addEventListener('click',()=>{inventory.close();openTank(k);}); }
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
    area=data.location.area;if(area==='underwater')Object.assign(dive,DIVE_START);ladder=null;$('ladder-message').hidden=true;player.x=data.location.x;player.z=data.location.z;saveOkay=true;guide=null;guideTarget=null;
    if(tankDecor)paintDecorations(tankDecor,progress.decorations);
    updateMission();applyArea();$('save-status').textContent='이 기기에 저장됨';
  },
  onClose:()=>{stop();last=0;canvas.focus({preventScroll:true});}
});

exhibitionEditor=setupExhibition({snapshot,pause:stop,onCommit:commitExhibition,onClose:()=>{stop();last=0;canvas.focus({preventScroll:true});}});
$('edit-exhibition').addEventListener('click',()=>{if(ready&&!modalOpen()&&SLOT_IDS.includes(nearby))exhibitionEditor.open(nearby);});
loadSave();configureExhibition(progress.exhibition);updateMission();
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const [kit,fishAsset,facilityKit,campusAssets]=await Promise.all([loadPirateKit(),loadFish({collection:true}),loadAquariumKit(),loadCampus()]);
  buildScene({},kit,fishAsset,facilityKit,campusAssets);ready=true;$('loading').hidden=true;resize();
  new ResizeObserver(resize).observe(viewport);
  if(!saveOkay)toast('저장 기록을 읽지 못해 새 탐험으로 열었어요.');else if(migrated)toast('이전 생물 기록을 보관했어요. 흰동가리의 새 탐험을 시작해요.');
  // Read-only state and projection let browser checks exercise real input and rendering.
  window.jejuGame={getState:()=>({ready,doorApproach:doorApproach?{progress:doorApproach.elapsed/.65}:null,view:{...view},crew:crew.inspect(),ladder:ladder?{enter:ladder.enter,progress:ladder.elapsed/LADDER.duration}:null,ladderHold,depthInput:input.vertical,camera:{position:camera.position.toArray(),zoom:camera.zoom,direction:camera.getWorldDirection(new THREE.Vector3()).toArray()},lighting:lightingState(scene),managementRoom:MANAGEMENT,managementFacility:managementFacility.inspect(),surface:managementSurface(player.x,player.z),dive:{...dive},underwater:underwater.inspect(),careView:careUI.inspect(),zone:area,doorHold,guide,doors:area==='harbor'?DOORS:EXITS,location:snapshot().location,drawCalls:renderer.info.render.calls,tankShapes:Object.fromEntries(Object.entries(progress.exhibition).map(([k,t])=>[k,t.shape])),aquariumKit:{source:'Public Aquarium and Marine Centre',slots:Object.keys(tanks),care:1,managementProps:MANAGEMENT.props.map(p=>p.name),managementFloorTiles:managementGroup.userData.floorTileCount},decorationSlot:slotFor(progress,'fish'),decorationWorld:tankDecor.getWorldPosition(new THREE.Vector3()),renderedSpecies:Object.fromEntries(Object.entries(fishModels).map(([kind,model])=>[kind,{visible:model.visible,position:model.getWorldPosition(new THREE.Vector3()),model:model.userData.inspect()}])),...progress,decorations:[...progress.decorations],placedDecorations:tankDecor.children.map(n=>n.name),player:{...player},moving,nearby,stage:stage(),saveOkay,dragging:!!gesture,looking:!!lookGesture,controls:{side:gesture?(gesture.move?"move":"tap"):null,input:{...input}},captain:avatar.userData.controller.inspect(),fish:fishSprite.userData.inspect(),mission:missionFor(progress),exhibits:Object.fromEntries(SPECIES.map(k=>[k,speciesState(k).placed?1:0]))}),screenPoint:(name)=>{
    const kind=name.endsWith('-tank')?name.slice(0,-5):null;const creature=name.startsWith('dive-')?underwater.creatures[name.slice(5)]:null;const staff=name==='staff-management'?crew.actors.management:name==='staff-exhibition'?crew.actors.exhibition:null;const point=creature?creature.getWorldPosition(new THREE.Vector3()):staff?staff.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1.2,0)):name==='player'?new THREE.Vector3(player.x,.5,player.z):kind?new THREE.Vector3(TANKS[kind].x,1.2,TANKS[kind].z):new THREE.Vector3((currentSpots()[name]||DOORS[name]).x,area==='harbor'?1.1:.2,(currentSpots()[name]||DOORS[name]).z);
    const rect=canvas.getBoundingClientRect();point.project(camera);return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  }};
  requestAnimationFrame(frame);
} catch(error) { console.error(error);$('loading').hidden=true;$('game-error').hidden=false; }
