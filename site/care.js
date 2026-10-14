import * as T from './vendor/three.module.js';
import {createFish} from './fish.js';
export function setupCare(asset,jellyTexture,{progress,pause,commit}){
 const dialog=document.createElement('dialog');dialog.id='care-dialog';dialog.className='care-dialog';dialog.innerHTML='<h2 id="care-title"></h2><canvas id="care-canvas" aria-label="관리 수조의 생물과 먹이 반응"></canvas><p id="care-status" role="status"></p><div class="care-actions"><button id="care-action"></button><button id="close-care" class="secondary">관리동으로</button></div>';document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id),renderer=new T.WebGLRenderer({canvas:$('care-canvas'),antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const scene=new T.Scene();scene.background=new T.Color('#17475d');scene.add(new T.HemisphereLight('#f4ecd8','#408f9d',3));const light=new T.DirectionalLight('#ffffff',2);light.position.set(2,4,3);scene.add(light);
 const camera=new T.PerspectiveCamera(40,1,.1,30);camera.position.set(0,.6,4.2);camera.lookAt(0,0,0);
 const models={fish:createFish(asset,{length:2.2}),chromis:createFish(asset,{length:2,variant:'chromis'}),jelly:new T.Sprite(new T.SpriteMaterial({map:jellyTexture,depthWrite:false}))};models.jelly.scale.set(2,1.8,1);Object.values(models).forEach(n=>scene.add(n));
 const pellets=new T.InstancedMesh(new T.SphereGeometry(.045,6,4),new T.MeshLambertMaterial({color:'#debc76'}),12);scene.add(pellets);const dummy=new T.Object3D();
 let kind='fish',feeding=false,elapsed=0,last=0,clock=0;
 const names={fish:'범돔',chromis:'자리돔',jelly:'해파리'};
 function refresh(){const step=progress.care[kind];$('care-title').textContent=names[kind]+' · 첫 돌봄';$('care-status').textContent=step===0?'새 수조에서 움직이는 모습을 살펴봐요.':step===1?'상태를 확인했어요. 준비한 먹이를 주고 반응을 살펴봐요.':'첫 돌봄을 마쳤어요. 다시 먹이 반응을 볼 수도 있어요.';$('care-action').textContent=step===0?'상태 확인하기':step===1?'첫 먹이 주기':'먹이 반응 다시 보기';$('care-action').disabled=false;}
 function render(ts){const dt=last?Math.min(.05,(ts-last)/1000):0;last=ts;
  if(dialog.open&&!document.hidden){clock+=dt;const model=models[kind];model.userData.update?.(dt);if(feeding){elapsed+=dt;if(elapsed>=2.8){feeding=false;if(progress.care[kind]<2){progress.care[kind]=2;commit();}refresh();$('care-status').textContent='먹이에 반응하는 모습을 확인했어요. 첫 돌봄 완료!';}}
   model.position.set(feeding?Math.sin(elapsed*2)*.25:Math.sin(clock*.6)*.12,feeding?Math.sin(Math.min(elapsed/2.8,1)*Math.PI)*.55:0,0);model.rotation.y=kind==='jelly'?0:Math.PI/2;
   if(kind==='jelly')model.scale.set(2+Math.sin(clock*2)*.1,1.8-Math.sin(clock*2)*.1,1);
   pellets.visible=feeding;for(let i=0;i<12;i++){dummy.position.set((i%4-1.5)*.16,1.3-((elapsed*.5+i*.06)%1.3),Math.sin(i)*.18);dummy.scale.setScalar(kind==='jelly'?.45:1);dummy.updateMatrix();pellets.setMatrixAt(i,dummy.matrix);}pellets.instanceMatrix.needsUpdate=true;
   const r=$('care-canvas').getBoundingClientRect();if(renderer.domElement.width!==Math.round(r.width*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(r.height*renderer.getPixelRatio())){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}renderer.render(scene,camera);
  }requestAnimationFrame(render);
 }
 $('care-action').onclick=()=>{if(progress.care[kind]===0){progress.care[kind]=1;commit();refresh();}else{feeding=true;elapsed=0;$('care-action').disabled=true;$('care-status').textContent='먹이를 주고 있어요. 친구의 반응을 지켜봐요.';}};
 $('close-care').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{feeding=false;pause();});requestAnimationFrame(render);
 return {dialog,open(k){const s=k==='fish'?progress:progress[k];if(!s.admitted)return;pause();kind=k;feeding=false;Object.entries(models).forEach(([id,n])=>n.visible=id===k);refresh();dialog.showModal();},inspect:()=>({kind,feeding,elapsed,open:dialog.open})};
}
