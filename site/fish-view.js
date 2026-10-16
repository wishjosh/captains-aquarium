import {loadJelly,createJelly} from './jelly.js';
import * as THREE from './vendor/three.module.js';
import {loadFish,createFish} from './fish.js';
import {savedDecorations,DECOR_KINDS} from './progress.js';
import {paintDecorations,clearDecorations} from './decorations.js';
const $=id=>document.getElementById(id),canvas=$('fish-canvas'),tank=canvas.parentElement;
const requested=new URLSearchParams(location.search).get('species'),species=['chromis','jelly'].includes(requested)?requested:'stripey';
if(species==='chromis'){document.title='자리돔 수조 · 가까이 보기';$('species-name').textContent='자리돔';document.querySelector('header>p').textContent='가슴 쪽 검은 무늬와 두 갈래 꼬리를 찾아보세요.';tank.setAttribute('aria-label','자리돔을 가까이 관찰하는 수조');canvas.setAttribute('aria-label','헤엄치는 자리돔. 화면을 끌면 다른 방향에서 볼 수 있어요.');$('loading').textContent='자리돔을 만나고 있어요…';document.querySelector('.study-note').textContent='무료 키트의 원래 몸체와 움직임에 자리돔 색상·무늬를 입혔어요.';}
if(species==='jelly'){document.body.classList.add('jelly-viewer');if(window.self===window.top)document.body.classList.add('standalone');document.title='보름달물해파리 · 가까이 보기';$('species-name').textContent='보름달물해파리';document.querySelector('header>p').textContent='반투명 우산 안에 네 개의 말굽 모양 무늬가 보여요.';tank.setAttribute('aria-label','보름달물해파리를 가까이 관찰하는 수조');canvas.setAttribute('aria-label','우산을 오므렸다 펴는 보름달물해파리. 화면을 끌면 다른 방향에서 볼 수 있어요.');$('loading').textContent='보름달물해파리를 만나고 있어요…';document.querySelector('.study-note').innerHTML='Jellyfish · <a href="https://poly.pizza/m/5PxIqPamrag" target="_blank" rel="noopener">Poly by Google</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a> · 형태·색상·움직임 수정';}
const controls=[$('pause'),$('zoom'),$('speed')];controls.forEach(n=>n.disabled=true);
if(window.self===window.top)$('back-game').hidden=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,paused:reduced.matches,speed:1,zoom:false,time:0,angle:.22};
const jellyCount=species==='jelly'&&new URLSearchParams(location.search).get('count')==='3'?3:1,companions=[];
let renderer,scene,camera,fish,decorRoot,last=0,gesture=null,disposed=false;
function cameraPose(){const distance=jellyCount===3?(state.zoom?5.8:7.5):state.zoom?2.6:(decorRoot?.children.length?4.6:3.9);camera.position.set(Math.cos(state.angle)*distance,species==='jelly'?1.55:.42,Math.sin(state.angle)*distance);camera.lookAt(0,0,0);}
function resize(){const {width,height}=tank.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/Math.max(height,1);camera.fov=width/height<.8?48:38;camera.updateProjectionMatrix();cameraPose();renderer.render(scene,camera);}
function buttons(){$('pause').textContent=state.paused?'▶ 움직이기':'Ⅱ 멈추기';$('pause').setAttribute('aria-pressed',String(state.paused));$('zoom').textContent=state.zoom?'− 전체 보기':'＋ 가까이';$('zoom').setAttribute('aria-pressed',String(state.zoom));}
$('pause').onclick=()=>{state.paused=!state.paused;buttons();};$('zoom').onclick=()=>{state.zoom=!state.zoom;cameraPose();buttons();};$('speed').oninput=e=>{state.speed=Number(e.target.value);$('speed-value').textContent=state.speed+'배';};$('retry').onclick=()=>location.reload();
canvas.addEventListener('pointerdown',e=>{if(!state.ready||gesture||!e.isPrimary)return;gesture={id:e.pointerId,x:e.clientX,angle:state.angle};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;state.angle=gesture.angle+(e.clientX-gesture.x)*.008;cameraPose();});
function release(){gesture=null;}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{last=0;release();});
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 scene=new THREE.Scene();if(species==='jelly')scene.background=new THREE.Color('#17475e');camera=new THREE.PerspectiveCamera(48,1,.1,40);scene.add(new THREE.HemisphereLight('#fff9e7','#578da3',2.3));const light=new THREE.DirectionalLight('#fff6dc',1.8);light.position.set(3,6,4);scene.add(light);
 const asset=await (species==='jelly'?loadJelly():loadFish());if(disposed)throw new Error('Viewer closed');fish=species==='jelly'?createJelly(asset,{width:1.85}):createFish(asset,{length:1.65,variant:species});scene.add(fish);if(jellyCount===3){for(const side of [-1,1]){const jelly=createJelly(asset,{width:1.15});jelly.position.set(side*1.45,side*.18,-.25);companions.push(jelly);scene.add(jelly);}}
 const sand=new THREE.Mesh(new THREE.SphereGeometry(1,28,12),new THREE.MeshLambertMaterial({color:'#e6d5a5'}));sand.scale.set(3,.16,3);sand.position.y=-1.2;if(species!=='jelly')scene.add(sand);
 decorRoot=new THREE.Group();decorRoot.position.y=-1.04;scene.add(decorRoot);const query=new URLSearchParams(location.search).get('decor'),parts=query?.split(',');const items=species!=='stripey'?[null,null,null]:parts?.length===3&&parts.every(k=>k===''||DECOR_KINDS.includes(k))?parts.map(k=>k||null):savedDecorations();paintDecorations(decorRoot,items);
 state.ready=true;$('loading').hidden=true;controls.forEach(n=>n.disabled=false);buttons();resize();new ResizeObserver(resize).observe(tank);
 window.aquariumPreview={getState:()=>({...state,fish:fish.userData.inspect(),decorations:decorRoot.children.map(n=>n.name)}),animalsAt:()=>Array.from({length:jellyCount},()=>({species,model:'3d'}))};
 function frame(stamp){if(disposed)return;const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;if(!document.hidden){if(!state.paused){state.time+=dt*state.speed;fish.userData.update(dt*state.speed);companions.forEach(n=>n.userData.update(dt*state.speed));fish.position.y=Math.sin(state.time*1.3)*.035;fish.rotation.y=Math.sin(state.time*.45)*.18;}renderer.render(scene,camera);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){if(!disposed){console.error(error);$('loading').hidden=true;$('fish-error').hidden=false;}}
window.addEventListener('pagehide',()=>{disposed=true;if(decorRoot)clearDecorations(decorRoot);fish?.userData.dispose();companions.forEach(n=>n.userData.dispose());renderer?.dispose();});
