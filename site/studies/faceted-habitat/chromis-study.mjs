import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {GLTFLoader} from './runtime/vendor/GLTFLoader.js?v=2026-10-20-jeju-rov-v1';
import {loadFish,createFish} from './runtime/fish.js';
import {aquariumLighting} from './runtime/lighting.js';
import {Swimmer} from './captain-swim.mjs';
import {createCoveScene} from './cove-scene.mjs';
import {createChromis} from './chromis-model.mjs?v=2026-11-01-shoal-1';
import {ledgePoint} from './chromis-shape.mjs?v=2026-11-01-chromis-1';
import {ViewOcclusion} from './view-occlusion.mjs';
import {ViewZoom,InspectionZoom} from './view-zoom.mjs';
import {FrameAudit} from './frame-audit.mjs';
const $=id=>document.getElementById(id),canvas=$('sea'),renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(),light=aquariumLighting(scene,{renderer});light.fill.intensity=1.7;light.key.intensity=3.2;light.key.castShadow=true;light.key.shadow.mapSize.set(1024,1024);Object.assign(light.key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:25});light.key.shadow.normalBias=.03;
const camera=new T.PerspectiveCamera(44,1,.05,100),target=new T.Vector3(),desiredTarget=new T.Vector3(),ray=new T.Raycaster(),zoom=new ViewZoom({min:.75,max:1.7}),audit=new FrameAudit();let mode='compare',close=false,moving=false,swimming=false,clay=false,yaw=1.38,pitch=.16,ready=false,time=0,prev=performance.now(),frame=0,gaze=null,actor,fish,clown,scenery,clear,center,comparisonFloor,cameraDistance=0;
const w={position:[-.95,1.2,0],heading:-.35,velocity:[0,0,0],forwardSpeed:0,cruise:0,effort:0,state:'float',turnRate:0,time:0};
const gestures=new InspectionZoom({surface:$('viewport'),active:()=>ready,width:()=>canvas.clientWidth,reserved:()=>false,onStart:()=>{gaze=null;}});
canvas.addEventListener('pointerdown',e=>{if(gestures.blocked||gaze)return;gaze={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(gestures.blocked||gaze?.id!==e.pointerId)return;yaw-=(e.clientX-gaze.x)*.007;pitch=T.MathUtils.clamp(pitch+(e.clientY-gaze.y)*.006,-.2,1.3);gaze.x=e.clientX;gaze.y=e.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(gaze?.id===e.pointerId)gaze=null;});
function pressed(id,value){$(id).setAttribute('aria-pressed',String(value));}
function caption(){$('caption').textContent=mode==='compare'?'자리돔 12cm · 흰동가리 8cm의 게임 내 비율. 면의 크기와 납작한 몸·갈라진 꼬리를 비교하세요.':'바위턱 위에 헤엄칠 여백을 두고, 연산호는 옆 경사면에 남겼어요. 둘러보며 가림을 확인하세요.';}
function setMode(value){mode=value;close=false;zoom.reset();time=0;pressed('focus',false);for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));scene.background=new T.Color(mode==='compare'?'#729095':'#246d80');scene.fog=mode==='compare'?null:new T.FogExp2('#246d80',.026);scenery.group.visible=mode==='habitat';comparisonFloor.visible=mode==='compare';clown.visible=mode==='compare';clear.uniforms.clearRock.value=0;place(0);target.copy(desiredTarget);caption();}
function place(dt){
 w.time+=dt;w.cruise=T.MathUtils.damp(w.cruise,swimming?.85:0,4,dt);w.forwardSpeed=w.cruise;w.effort=.5;w.state=swimming?'swim':'float';
 w.position=mode==='compare'?[-.20,1.2,1.18]:[center[0]-1.35,center[1]-.12,center[2]+.8];actor.update(dt,w);
 const p=mode==='compare'?[0,1.4,-.45]:ledgePoint(time,center);fish.position.fromArray(p);fish.rotation.y=moving&&mode==='habitat'?Math.atan2(.52*Math.cos(time*.38),-.32*Math.sin(time*.38)):0;
 fish.userData.update(dt,moving?1:0);clown.position.set(0,.82,-.45);clown.rotation.y=0;if(moving)clown.userData.update(dt*.55);
 desiredTarget.copy(close?fish.position:new T.Vector3().fromArray(w.position).lerp(fish.position,.65));
}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(ready)setMode(b.dataset.mode);};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{[yaw,pitch]={side:[Math.PI/2,.12],front:[0,.12],back:[Math.PI,.12],top:[.7,1.18]}[b.dataset.view];};
$('focus').onclick=()=>{close=!close;zoom.reset();pressed('focus',close);};$('plus').onclick=()=>gestures.nudge(.16);$('minus').onclick=()=>gestures.nudge(-.16);$('reset').onclick=()=>{zoom.reset();yaw=1.38;pitch=.16;};
$('motion').onclick=()=>{moving=!moving;pressed('motion',moving);};$('pose').onclick=()=>{swimming=!swimming;pressed('pose',swimming);};$('clay').onclick=()=>{clay=!clay;fish?.userData.setClay(clay);pressed('clay',clay);};$('mobile').onclick=()=>{document.body.classList.toggle('phone');pressed('mobile',document.body.classList.contains('phone'));};
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();gestures.clear();gaze=null;}new ResizeObserver(resize).observe($('viewport'));addEventListener('resize',resize);
function screenPoint(p){const v=p.clone().project(camera);return[(v.x*.5+.5)*canvas.clientWidth,(-v.y*.5+.5)*canvas.clientHeight,v.z];}
function label(id,mesh,show){const p=screenPoint(mesh.position.clone().add(new T.Vector3(0,mesh===fish?.23:.16,0)));$(id).hidden=!show||p[2]<-1||p[2]>1||p[0]<30||p[0]>canvas.clientWidth-30||p[1]<35||p[1]>canvas.clientHeight;$(id).style.left=p[0]+'px';$(id).style.top=(p[1]-18)+'px';}
async function init(){
 const loader=new GLTFLoader(),base=new URL('./runtime/',import.meta.url);
 const [captain,animal,rockModules,softForms]=await Promise.all([loader.loadAsync(new URL('assets/pirate/captain.gltf',base).href),loadFish(),loader.loadAsync(new URL('./assets/rock-modules.glb',import.meta.url).href),loader.loadAsync(new URL('./assets/soft-forms.glb',import.meta.url).href)]);
 actor=new Swimmer(captain,scene);fish=createChromis();clown=createFish(animal,{kind:'fish',length:.4,appearance:'white-eye'});clown.userData.update(0);scene.add(fish,clown);scenery=createCoveScene({rockModules,softForms});scene.add(scenery.group);const anemone=scenery.group.getObjectByName('Anemone rooted in rock crevice');anemone.visible=false;scenery.clearables.splice(scenery.clearables.indexOf(anemone),1);clear=new ViewOcclusion(actor.root,scenery.clearables,renderer);
 comparisonFloor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:'#668487',roughness:1}));comparisonFloor.rotation.x=-Math.PI/2;comparisonFloor.receiveShadow=true;scene.add(comparisonFloor);
 scenery.group.updateMatrixWorld(true);let max=-Infinity;for(let i=0;i<160;i++){const p=ledgePoint(i/160*Math.PI*2/.38,[1.55,0,-1.3]);ray.set(new T.Vector3(p[0],10,p[2]),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(scenery.solids,false)[0];if(hit)max=Math.max(max,hit.point.y);}
 if(!Number.isFinite(max))throw Error('바위턱의 높이를 확인하지 못했습니다');center=[1.55,max+.63,-1.3];ready=true;setMode('compare');resize();$('loading').hidden=true;
}
init().catch(e=>{$('loading').textContent='장면을 불러오지 못했어요. 새로고침해 주세요.';canvas.dataset.error=e.message;console.error(e);});
function draw(now){const dt=Math.min(.05,(now-prev)/1000);prev=now;if(ready){if(moving)time+=dt;place(dt);scenery.update(moving?dt:0,w.position);zoom.change(gestures.consume().logScale);zoom.step(dt);target.lerp(desiredTarget,1-Math.exp(-dt*5));const minFov=2*Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));const extent=close?.43:mode==='compare'?1.55:1.7;cameraDistance=extent/Math.sin(minFov/2)/zoom.value;camera.position.copy(target).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(cameraDistance));camera.lookAt(target);camera.updateMatrixWorld(true);clear.step(dt,camera,w.position,fish.position.toArray());renderer.render(scene,camera);audit.sample(now,true,renderer.info,renderer.getPixelRatio());label('fishName',fish,true);label('clownName',clown,mode==='compare'&&!close);
 if(frame++%10===0){const p=screenPoint(fish.position),half=fish.geometry.boundingSphere.radius*fish.scale.x;ray.set(camera.position,fish.position.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(fish.position)-half;const blockers=ray.intersectObjects([actor.root,...(mode==='habitat'?scenery.occluders:[])],true);canvas.dataset.inspection=JSON.stringify({ready,mode,close,moving,swimming,clay,yaw,pitch,cameraDistance,zoom:zoom.report(),viewport:[canvas.clientWidth,canvas.clientHeight],model:fish.userData.inspect(),habitat:{center,clearanceAboveMaxRock:.63,routeHorizontalHalfExtent:[.52,.32],environmentTriangles:scenery.inspect().triangles},fishScreen:p,fishPixels:fish.userData.inspect().length/camera.position.distanceTo(fish.position)*canvas.clientHeight/(2*Math.tan(camera.fov*Math.PI/360)),occlusion:{...clear.report(),blockingHits:blockers.length,unclearedHits:blockers.filter(h=>!clear.clears(h)).length},render:{...renderer.info.render},performance:audit.report(),storage:'not used'});}}
 requestAnimationFrame(draw);
}requestAnimationFrame(draw);
