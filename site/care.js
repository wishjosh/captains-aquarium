import {SPECIES,SPECIES_NAMES,stateFor,fishLength} from './species.js?v=2026-10-20-jeju-rov-v1';
import {aquariumLighting,lightingState} from './lighting.js?v=2026-10-20-jeju-rov-v1';
import * as T from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createFish} from './fish.js?v=2026-10-20-jeju-rov-v1';
export function setupCare(asset,{progress,pause,commit}){
 const dialog=document.createElement('dialog');
 dialog.id='care-dialog';
 dialog.className='care-dialog';
 dialog.setAttribute('aria-labelledby','care-title');
 dialog.setAttribute('aria-describedby','care-status');
 dialog.innerHTML='<h2 id="care-title"></h2><div class="care-content"><div class="care-view"><canvas id="care-canvas" aria-label="관리 수조에서 헤엄치는 생물과 먹이 반응"></canvas><span class="care-view-label">관리동 · 적응 수조</span></div><div class="care-guidance"><p class="care-step" id="care-step"></p><ul class="care-cues" aria-label="돌봄 관찰"><li id="care-flow"></li><li id="care-space"></li><li id="care-response"></li></ul><p id="care-status" role="status" aria-live="polite" aria-atomic="true"></p><label class="care-progress-label" for="care-progress">관찰 진행</label><progress id="care-progress" max="1" value="0"></progress></div></div><div class="care-actions"><button id="care-action" type="button"></button><button id="close-care" type="button" class="secondary">관리동으로</button></div>';
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id);
 const renderer=new T.WebGLRenderer({canvas:$('care-canvas'),antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene();
 aquariumLighting(scene,{renderer});
 scene.background=new T.Color('#17475d');
 const camera=new T.PerspectiveCamera(40,1,.1,30);
 camera.position.set(0,.6,4.2);
 camera.lookAt(0,0,0);
 const models=Object.fromEntries((asset.speciesAssets?SPECIES:['fish']).map(kind=>[kind,createFish(asset,{kind,length:fishLength(kind,'care')})]));
 Object.values(models).forEach(n=>scene.add(n));
 const pellets=new T.InstancedMesh(new T.SphereGeometry(.04,6,4),new T.MeshLambertMaterial({color:'#debc76'}),8);
 pellets.visible=false;
 scene.add(pellets);
 const flow=new T.InstancedMesh(new T.SphereGeometry(.021,5,4),new T.MeshBasicMaterial({color:'#8dcbd5',transparent:true,opacity:.3}),12);
 scene.add(flow);
 const dummy=new T.Object3D();
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const CHECK_SECONDS=2.7,FEED_SECONDS=3.4;
 let kind='fish',action='idle',elapsed=0,last=0,clock=0,phase='';
 const busy=()=>action!=='idle';
 const duration=()=>action==='checking'?CHECK_SECONDS:action==='feeding'?FEED_SECONDS:0;
 function setCue(id,text,done=false){
  const cue=$(id);
  cue.textContent=(done?'✓ ':'○ ')+text;
  cue.classList.toggle('is-done',done);
 }
 function refresh(){
  const step=progress.care[kind];
  $('care-title').textContent=SPECIES_NAMES[kind]+' · 첫 돌봄';
  $('care-step').textContent=step===0?'1 / 2 · 새 수조에 적응':step===1?'2 / 2 · 먹이 반응 관찰':'첫 돌봄 완료';
  $('care-status').textContent=step===0?'서두르지 말고 물의 흐름과 헤엄치는 모습을 함께 살펴봐요.':step===1?'준비한 먹이를 조금 주고, 생물이 다가오는 모습을 지켜봐요.':'돌봄을 마쳤어요. 다음 탐사를 떠나거나 전시관에서 소개할 수 있어요.';
  $('care-action').textContent=step===0?'상태 살펴보기':step===1?'먹이 주고 지켜보기':'먹이 반응 다시 보기';
  $('care-action').disabled=false;
  $('close-care').textContent='관리동으로';
  $('care-progress').value=step===2?1:0;
  dialog.dataset.careAction='idle';
  setCue('care-flow',step>0?'물 흐름을 살폈어요':'물 흐름 살펴보기',step>0);
  setCue('care-space',step>0?'헤엄칠 공간을 살폈어요':'헤엄칠 공간 살펴보기',step>0);
  setCue('care-response',step===2?'먹이 반응을 보았어요':'생물의 반응 기다리기',step===2);
 }
 function updatePhase(){
  const next=action==='checking'?(elapsed<.9?'flow':elapsed<1.8?'space':'settle'):(elapsed<1.4?'offer':'response');
  if(next===phase)return;
  phase=next;
  if(next==='flow'){
   $('care-status').textContent='물의 흐름을 살피고 있어요. 작은 물결이 수조를 천천히 지나가요.';
  }else if(next==='space'){
   setCue('care-flow','물 흐름을 살폈어요',true);
   $('care-status').textContent='주변 공간을 살펴요. 생물이 돌아서 헤엄칠 여유가 있어요.';
  }else if(next==='settle'){
   setCue('care-space','헤엄칠 공간을 살폈어요',true);
   $('care-status').textContent='이제 움직임을 지켜봐요. 새 수조를 천천히 둘러보고 있어요.';
  }else if(next==='offer'){
   setCue('care-response','먹이를 조금 건네고 있어요');
   $('care-status').textContent='먹이를 조금 주었어요. 생물이 스스로 다가오기를 기다려요.';
  }else{
   setCue('care-response','다가오는 반응을 지켜봐요');
   $('care-status').textContent='생물이 먹이 쪽으로 다가와요. 먹이를 더 주지 않고 반응을 지켜봐요.';
  }
 }
 function finish(){
  const finished=action;
  action='idle';
  phase='';
  // Persist only a completed action. Closing the dialog leaves the saved step intact.
  const target=finished==='checking'?1:2;
  if(progress.care[kind]<target){progress.care[kind]=target;commit();}
  refresh();
  $('care-progress').value=1;
  $('care-status').textContent=finished==='checking'?'새 수조에서 움직이는 모습을 확인했어요. 이제 첫 먹이 반응을 살펴봐요.':'먹이에 다가오는 모습을 확인했어요. 첫 돌봄을 마쳤어요!';
 }
 function render(ts){
  const dt=last?Math.min(.05,(ts-last)/1000):0;
  last=ts;
  if(dialog.open&&!document.hidden){
   clock+=dt;
   const model=models[kind];
   model.userData.update?.(motion.matches?0:dt);
   if(busy()){
    elapsed=Math.min(duration(),elapsed+dt);
    updatePhase();
    $('care-progress').value=elapsed/duration();
    if(elapsed>=duration())finish();
   }
   const feed=action==='feeding';
   const feedRise=feed?Math.sin(Math.min(elapsed/FEED_SECONDS,1)*Math.PI):0;
   model.position.set(motion.matches?0:Math.sin(clock*.6)*.12,feedRise*(motion.matches ? .1 : .45),0);
   model.rotation.y=Math.PI/2;
   pellets.visible=feed&&elapsed<2.8;
   for(let i=0;i<8;i++){
    const fall=Math.min(1,Math.max(0,(elapsed-i*.06)/2.2));
    dummy.position.set((i%4-1.5)*.14,1.15-fall*.95,Math.sin(i)*.15);
    dummy.scale.setScalar(1-fall*.8);
    dummy.updateMatrix();
    pellets.setMatrixAt(i,dummy.matrix);
   }
   pellets.instanceMatrix.needsUpdate=true;
   for(let i=0;i<12;i++){
    const drift=motion.matches?i/12:((clock*.045+i/12)%1);
    dummy.position.set(-1.7+drift*3.4,-.7+(i%3)*.65,-.75);
    dummy.scale.set(2.5,1,1);
    dummy.updateMatrix();
    flow.setMatrixAt(i,dummy.matrix);
   }
   flow.instanceMatrix.needsUpdate=true;
   const r=$('care-canvas').getBoundingClientRect();
   if(r.width>0&&r.height>0){
    if(renderer.domElement.width!==Math.round(r.width*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(r.height*renderer.getPixelRatio())){
     renderer.setSize(r.width,r.height,false);
     camera.aspect=r.width/r.height;
     camera.updateProjectionMatrix();
    }
    renderer.render(scene,camera);
   }
  }
  requestAnimationFrame(render);
 }
 $('care-action').onclick=()=>{
  if(busy()||!dialog.open)return;
  action=progress.care[kind]===0?'checking':'feeding';
  elapsed=0;
  phase='';
  $('care-action').disabled=true;
  $('close-care').textContent='멈추고 관리동으로';
  $('care-progress').value=0;
  dialog.dataset.careAction=action;
  updatePhase();
 };
 function cancel(){
  action='idle';
  phase='';
  elapsed=0;
  pellets.visible=false;
  last=0;
 }
 $('close-care').onclick=()=>{cancel();dialog.close();};
 dialog.addEventListener('cancel',cancel);
 dialog.addEventListener('close',()=>{if(dialog.open)return;cancel();pause();});
 document.addEventListener('visibilitychange',()=>{last=0;});
 requestAnimationFrame(render);
 return {
  dialog,
  open(k){
   if(!models[k]||dialog.open||!stateFor(progress,k).admitted)return;
   pause();
   kind=k;
   cancel();
   Object.entries(models).forEach(([id,n])=>n.visible=id===k);
   refresh();
   dialog.showModal();
   $('care-action').focus({preventScroll:true});
  },
  inspect:()=>({
   lighting:lightingState(scene),kind,feeding:action==='feeding',checking:action==='checking',
   action,phase,elapsed,duration:duration(),careStep:progress.care[kind],open:dialog.open,
   reducedMotion:motion.matches,paused:document.hidden,model:models[kind].userData.inspect()
  })
 };
}
