import {aquariumLighting,lightingState} from './lighting.js?v=2026-10-17-clownfish-lighting-c-1';
import * as T from './vendor/three.module.js?v=2026-10-17-clownfish-lighting-c-1';
import {createFish} from './fish.js?v=2026-10-17-clownfish-lighting-c-1';
import {DECOR_SLOTS,DECOR_NAMES,paintDecorations} from './decorations.js?v=2026-10-17-clownfish-lighting-c-1';
import {hasStarterDecor} from './progress.js?v=2026-10-17-clownfish-lighting-c-1';
export function setupDecorationEditor(asset,{getItems,onCommit}){
 const $=id=>document.getElementById(id),dialog=$('decorate-dialog'),canvas=$('decor-canvas');
 let renderer,scene,camera,fish,root,ready=false,draft=[],selected='rock',pointer=null,last=0;
 const ray=new T.Raycaster(),hitTargets=[];
 function resize(){if(!renderer)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.fov=camera.aspect<.8?47:38;camera.updateProjectionMatrix();renderer.render(scene,camera);}
 function renderDraft(){if(root)paintDecorations(root,draft);document.querySelectorAll('[data-decor-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.decorKind===selected)));document.querySelectorAll('[data-decor-slot]').forEach(b=>{const i=Number(b.dataset.decorSlot),name=draft[i]?DECOR_NAMES[draft[i]]:'빈 자리';b.querySelector('small').textContent=name;b.setAttribute('aria-label',DECOR_SLOTS[i].label+' 자리 · '+name);});$('decor-status').textContent=hasStarterDecor(draft)?'제주 돌과 바다풀을 놓았어요! 저장해 볼까요?':'제주 돌과 바다풀을 하나씩 놓아 주세요.';if(renderer)renderer.render(scene,camera);}
 function place(i){if(!ready)return;draft[i]=selected==='erase'?null:selected;renderDraft();}
 document.querySelectorAll('[data-decor-kind]').forEach(b=>b.onclick=()=>{selected=b.dataset.decorKind;renderDraft();});
 document.querySelectorAll('[data-decor-slot]').forEach(b=>b.onclick=()=>place(Number(b.dataset.decorSlot)));
 $('cancel-decor').onclick=()=>dialog.close();$('save-decor').onclick=()=>{if(ready){onCommit([...draft]);dialog.close();}};
 canvas.addEventListener('pointerdown',e=>{if(!ready||!e.isPrimary||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointerup',e=>{const start=pointer;pointer=null;if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)return;const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);const hit=ray.intersectObjects(hitTargets)[0];if(hit)place(hit.object.userData.slot);});
 canvas.addEventListener('pointercancel',()=>pointer=null);dialog.addEventListener('close',()=>{pointer=null;last=0;});
 function init(){renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;scene=new T.Scene();aquariumLighting(scene);camera=new T.PerspectiveCamera(40,1,.1,40);camera.position.set(4.3,2.6,.8);camera.lookAt(0,-.4,0);
  const sand=new T.Mesh(new T.CylinderGeometry(1.7,1.8,.15,32),new T.MeshLambertMaterial({color:'#e6d5a5'}));sand.position.y=-1.13;scene.add(sand);root=new T.Group();root.position.y=-1.04;scene.add(root);fish=createFish(asset,{length:1.5});fish.position.y=-.1;scene.add(fish);
  DECOR_SLOTS.forEach((slot,i)=>{const ring=new T.Mesh(new T.RingGeometry(.28,.33,32),new T.MeshBasicMaterial({color:'#e5ac3e',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(slot.x,-1.049,slot.z);scene.add(ring);const target=new T.Mesh(new T.SphereGeometry(.4,16,8),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));target.position.set(slot.x,-.85,slot.z);target.userData.slot=i;hitTargets.push(target);scene.add(target);});
  ready=true;new ResizeObserver(resize).observe(canvas.parentElement);function frame(stamp){const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;if(dialog.open&&!document.hidden){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)fish.userData.update(dt);renderer.render(scene,camera);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 }
 window.decorPreview={getState:()=>({ready,lighting:lightingState(scene),open:dialog.open,draft:[...draft],selected,placements:root?.children.map(n=>n.name)||[]}),screenPoint:i=>{const slot=DECOR_SLOTS[i],p=new T.Vector3(slot.x,-.85,slot.z);p.project(camera);const r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}};
 return {open(){draft=[...getItems()];selected='rock';dialog.showModal();try{if(!renderer)init();$('decor-error').hidden=true;$('save-decor').disabled=false;renderDraft();resize();}catch(e){console.error(e);$('decor-error').hidden=false;$('save-decor').disabled=true;}}};
}
