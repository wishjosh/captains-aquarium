import {aquariumLighting,lightingState} from './lighting.js?v=2026-10-17-clownfish-lighting-c-1';
import * as THREE from './vendor/three.module.js?v=2026-10-17-clownfish-lighting-c-1';
import {loadFish,createFish} from './fish.js?v=2026-10-17-clownfish-lighting-c-1';
import {savedDecorations,DECOR_KINDS} from './progress.js?v=2026-10-17-clownfish-lighting-c-1';
import {paintDecorations,clearDecorations} from './decorations.js?v=2026-10-17-clownfish-lighting-c-1';
const $=id=>document.getElementById(id),canvas=$('fish-canvas'),tank=canvas.parentElement;
const species='clownfish';
const controls=[$('pause'),$('zoom'),$('speed')];controls.forEach(n=>n.disabled=true);
if(window.self===window.top)$('back-game').hidden=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,paused:reduced.matches,speed:1,zoom:false,time:0,angle:.6};
const companions=[];
let renderer,scene,camera,fish,decorRoot,last=0,gesture=null,disposed=false;
function cameraPose(){const distance=state.zoom?2.6:(decorRoot?.children.length?4.6:3.9);const fitted=distance*Math.max(1,.9/camera.aspect);camera.position.set(Math.cos(state.angle)*fitted,.42,Math.sin(state.angle)*fitted);camera.lookAt(0,0,0);}
function resize(){const {width,height}=tank.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/Math.max(height,1);camera.fov=width/height<.8?48:38;camera.updateProjectionMatrix();cameraPose();renderer.render(scene,camera);}
function buttons(){$('pause').textContent=state.paused?'▶ 움직이기':'Ⅱ 멈추기';$('pause').setAttribute('aria-pressed',String(state.paused));$('zoom').textContent=state.zoom?'− 전체 보기':'＋ 가까이';$('zoom').setAttribute('aria-pressed',String(state.zoom));}
$('pause').onclick=()=>{state.paused=!state.paused;buttons();};$('zoom').onclick=()=>{state.zoom=!state.zoom;cameraPose();buttons();};$('speed').oninput=e=>{state.speed=Number(e.target.value);$('speed-value').textContent=state.speed+'배';};$('retry').onclick=()=>location.reload();
canvas.addEventListener('pointerdown',e=>{if(!state.ready||gesture||!e.isPrimary)return;gesture={id:e.pointerId,x:e.clientX,angle:state.angle};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;state.angle=gesture.angle+(e.clientX-gesture.x)*.008;cameraPose();});
function release(){gesture=null;}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{last=0;release();});
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 scene=new THREE.Scene();aquariumLighting(scene);camera=new THREE.PerspectiveCamera(48,1,.1,40);
 const asset=await loadFish();if(disposed)throw new Error('Viewer closed');fish=createFish(asset,{length:1.65});scene.add(fish);
 const sand=new THREE.Mesh(new THREE.SphereGeometry(1,28,12),new THREE.MeshLambertMaterial({color:'#e6d5a5'}));sand.scale.set(3,.16,3);sand.position.y=-1.2;scene.add(sand);
 decorRoot=new THREE.Group();decorRoot.position.y=-1.04;scene.add(decorRoot);const query=new URLSearchParams(location.search).get('decor'),parts=query?.split(',');const items=species!=='clownfish'?[null,null,null]:parts?.length===3&&parts.every(k=>k===''||DECOR_KINDS.includes(k))?parts.map(k=>k||null):savedDecorations();paintDecorations(decorRoot,items);
 state.ready=true;$('loading').hidden=true;controls.forEach(n=>n.disabled=false);buttons();resize();new ResizeObserver(resize).observe(tank);
 window.aquariumPreview={getState:()=>({...state,lighting:lightingState(scene),fish:fish.userData.inspect(),decorations:decorRoot.children.map(n=>n.name)}),animalsAt:()=>Array.from({length:1},()=>({species,model:'3d'}))};
 function frame(stamp){if(disposed)return;const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;if(!document.hidden){if(!state.paused){state.time+=dt*state.speed;fish.userData.update(dt*state.speed);companions.forEach(n=>n.userData.update(dt*state.speed));fish.position.y=Math.sin(state.time*1.3)*.035;fish.rotation.y=Math.sin(state.time*.45)*.18;}renderer.render(scene,camera);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){if(!disposed){console.error(error);$('loading').hidden=true;$('fish-error').hidden=false;}}
window.addEventListener('pagehide',()=>{disposed=true;if(decorRoot)clearDecorations(decorRoot);fish?.userData.dispose();companions.forEach(n=>n.userData.dispose());renderer?.dispose();});
