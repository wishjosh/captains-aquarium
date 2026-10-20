import * as T from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createROV} from './rov-vehicle.js?v=2026-10-20-jeju-rov-v1';
import {createUnderwater,swimStep,swimBlocked,REEF_ROCKS} from './underwater.js?v=2026-10-20-jeju-rov-v1';
import {createFish} from './fish.js?v=2026-10-20-jeju-rov-v1';
import {SPECIES,SPECIES_NAMES,stateFor,fishLength} from './species.js?v=2026-10-20-jeju-rov-v1';
import {aquariumLighting} from './lighting.js?v=2026-10-20-jeju-rov-v1';

const names=SPECIES_NAMES,ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function setupROV({asset,assets,progress,pause,commit,onReturn}){
 const dialog=document.createElement('dialog');dialog.id='rov-dialog';dialog.setAttribute('aria-label','제주 연안 무인탐사정');
 dialog.innerHTML=`<canvas id="rov-world" tabindex="0" aria-label="무인탐사정 조종 화면. 왼쪽을 끌거나 방향키로 이동하고 오른쪽 버튼으로 수심을 조절하세요."></canvas>
 <header class="rov-top"><div><small>선장의 제주 탐사</small><h2 id="rov-title">포구에서 출항 준비</h2></div><span id="rov-stage">출항 → 탐사 → 귀환 → 돌봄</span><button id="rov-close" aria-label="탐사 준비 닫기">닫기</button></header>
 <section id="rov-brief"><small>JEJU · 01</small><h3>오늘 돌볼 친구를<br>만나러 가요.</h3><p>보물을 팔아 세운 수족관.<br>선장과 선원들이 제주 바다의 소중함을 전합니다.</p><p>큰 배에서 무인탐사정을 내려 관찰하고,<br>한 마리씩 이동 수조로 안내해요.</p><button id="rov-launch">제주 연안으로 출항</button><p class="rov-caption">제주 연안의 암반·모래·해조숲에서 영감을 받은 가상 해역입니다.</p></section>
 <div id="rov-camera-label">● 원격 카메라 · 선장은 배에서 조종 중</div>
 <div id="rov-reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
 <div id="rov-joystick" hidden><i></i></div>
 <div id="rov-depth"><button id="rov-up" aria-label="탐사정 상승">↑<small>상승</small></button><span id="rov-depth-label"></span><button id="rov-down" aria-label="탐사정 하강">↓<small>하강</small></button></div>
 <nav id="rov-targets" aria-label="생물 찾기">${SPECIES.map(k=>`<button id="rov-target-${k}" data-kind="${k}">${names[k]}</button>`).join('')}</nav>
 <div id="rov-view-controls"><button id="rov-view">탐사정 보기</button><button id="rov-return">배로 회수</button></div>
 <section class="rov-bottom"><div><strong id="rov-subject">바위 사이를 천천히 살펴보세요.</strong><p id="rov-message" role="status" aria-live="polite"></p><progress id="rov-progress" max="1" value="0" hidden></progress></div><div class="rov-actions"><button id="rov-observe">관찰하기</button><button id="rov-action">이동 수조로 안내</button><button id="rov-cancel">유도 취소</button></div></section>
 <p id="rov-controls">왼쪽 끌기 · 방향키 이동　Q / E 수심　생물을 눌러 선택</p>`;
 document.body.append(dialog);const $=id=>dialog.querySelector('#'+id),canvas=$('rov-world');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const sea=new T.Scene(),deck=new T.Scene();sea.background=new T.Color('#226779');sea.fog=new T.Fog('#226779',13,38);deck.background=new T.Color('#92c5d5');
 aquariumLighting(sea,{renderer});aquariumLighting(deck,{renderer});const camera=new T.PerspectiveCamera(63,1,.05,130);
 const underwater=createUnderwater(asset,assets);sea.add(underwater.group);
 const vehicle=createROV(),deckVehicle=createROV();sea.add(vehicle.root);
 // A larger carrier preserves the approved world size of all four animals.
 vehicle.root.scale.setScalar(1.5);
 const lure=new T.Mesh(new T.SphereGeometry(.055,12,8),new T.MeshBasicMaterial({color:'#ffda89'}));lure.visible=false;sea.add(lure);
 const cargoModels=Object.fromEntries(SPECIES.map(k=>{const f=createFish(asset,{kind:k,length:fishLength(k)});f.visible=false;sea.add(f);return [k,f];}));
 const shipRig=new T.Group();deck.add(shipRig);const boat=assets.ship.scene.clone(true),bounds=new T.Box3().setFromObject(boat),scale=12/(bounds.max.x-bounds.min.x);
 boat.scale.setScalar(scale);boat.position.set(-(bounds.max.x+bounds.min.x)*scale/2,-bounds.min.y*scale,-(bounds.max.z+bounds.min.z)*scale/2);shipRig.add(boat,deckVehicle.root);
 const wood=new T.MeshStandardMaterial({color:'#73523d',roughness:.8}),teal=new T.MeshStandardMaterial({color:'#2b535b'}),brass=new T.MeshStandardMaterial({color:'#b89d68',roughness:.5,metalness:.3});
 function mesh(g,m,x,y,z,parent=shipRig){const n=new T.Mesh(g,m);n.position.set(x,y,z);parent.add(n);return n;}
 function bar(a,b,r,m=teal){const delta=b.clone().sub(a),n=mesh(new T.CylinderGeometry(r,r,delta.length(),10),m,0,0,0);n.position.copy(a).addScaledVector(delta,.5);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return n;}
 mesh(new T.BoxGeometry(2.55,.13,2),wood,.6,3.045,0);
 for(const z of [-.64,.64])mesh(new T.BoxGeometry(2.12,.14,.19),wood,.6,3.18,z);
 for(const x of [-.4,1.6])for(const z of [-.65,.65])bar(new T.Vector3(x,2.17,z),new T.Vector3(x,3.045,z),.075);
 bar(new T.Vector3(.6,3.11,-1.15),new T.Vector3(.6,6.3,-1.15),.12);
 const boom=mesh(new T.BoxGeometry(.19,.2,1),brass,0,0,0),cable=mesh(new T.CylinderGeometry(.018,.018,1,8),teal,0,0,0);
 const water=mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:'#468c9d',transparent:true,opacity:.66,roughness:.45,side:T.DoubleSide}),0,.68,0,deck);water.rotation.x=-Math.PI/2;
 const deckCargo=Object.fromEntries(SPECIES.map(k=>{const f=createFish(asset,{kind:k,length:fishLength(k,'cargo')});f.visible=false;shipRig.add(f);return [k,f];}));
 const coast=new T.Group();deck.add(coast);for(let i=0;i<9;i++){const rock=assets.rock.scene.clone(true);rock.position.set(-9+i*2.6,-.5,-10-Math.sin(i)*1.5);rock.scale.setScalar(1.5+i%3*.5);coast.add(rock);}
 const bubbles=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(Array.from({length:45},(_,i)=>[Math.sin(i*17)*12,1+i%6,Math.cos(i*7)*13]).flat(),3)),new T.PointsMaterial({color:'#afdedb',size:.035,transparent:true,opacity:.35}));sea.add(bubbles);
 const selection=new T.Mesh(new T.RingGeometry(.32,.34,40),new T.MeshBasicMaterial({color:'#efdba4',transparent:true,opacity:.9,side:T.DoubleSide,depthTest:false}));sea.add(selection);
 const tether=mesh(new T.CylinderGeometry(.018,.018,1,8),teal,0,0,0,sea);
 const pos={x:0,y:3.25,z:7,yaw:0,pitch:0},input={x:0,z:0,vertical:0},keys=new Set();
 let mode='closed',elapsed=0,clock=0,selected=null,guide=null,external=false,last=0,paint=0,drag=null,depthPointer=null,notice='',captureCount=0;
 const held=()=>SPECIES.find(k=>stateFor(progress,k).bag)||null;
 const isWater=()=>['exploring','guiding','collected'].includes(mode);
 function endMove(){input.x=input.z=0;drag=null;$('rov-joystick').hidden=true;}
 function resetInput(){endMove();input.vertical=0;keys.clear();depthPointer=null;}
 function setMode(next){mode=next;elapsed=0;resetInput();}
 function deckPose(t){
  let y=4.04,z=0;
  if(t<2)y=T.MathUtils.lerp(4.04,4.65,ease(t/2));
  else if(t<4){y=4.65;z=4.65*ease((t-2)/2);}
  else{y=T.MathUtils.lerp(4.65,-4.45,ease((t-4)/4));z=4.65;}
  deckVehicle.root.position.set(.6,y,z);deckVehicle.update(clock,y<.5,0);deckVehicle.root.updateMatrixWorld(true);for(const [k,f]of Object.entries(deckCargo)){f.visible=k===held();if(f.visible){f.position.set(.62,y-.36,z);f.rotation.y=Math.PI/2;f.userData.update(1/60);}}
  const top=new T.Vector3(.6,6.3,z),bottom=new T.Vector3(.47,y+.88,z),d=bottom.clone().sub(top);
  cable.position.copy(top).addScaledVector(d,.5);cable.scale.y=d.length();cable.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());boom.position.set(.6,6.3,(z-1.15)/2);boom.scale.z=z+1.15;
 }
 function distance(k){const f=underwater.creatures[k];return f?f.position.distanceTo(new T.Vector3(pos.x,pos.y,pos.z)):Infinity;}
 function reachable(k){return underwater.canCollect(k,pos);}
 function select(k){
  if(mode!=='exploring'||!SPECIES.includes(k)||!underwater.creatures[k].visible)return;
  selected=k;
  notice=distance(k)>3.6?'선택한 친구 쪽으로 천천히 다가가세요.':'관찰하거나 이동 수조로 안내할 수 있어요.';refresh();
 }
 function observe(){
  if(mode!=='exploring'||!selected)return;
  if(!reachable(selected)){notice='움직임을 살펴볼 수 있도록 조금 더 가까이 가세요.';refresh();return;}
  progress.discovered[selected]=true;commit();notice=names[selected]+'의 움직임과 무늬를 관찰했어요. 발견 기록에 남겼습니다.';refresh();
 }
 function startGuide(){
  if(mode!=='exploring'||!selected||held()||!reachable(selected))return;
  guide={kind:selected,from:underwater.creatures[selected].position.clone()};
  setMode('guiding');notice='유도등을 켜고 문을 열었어요. 친구가 들어올 때까지 기다려 주세요.';refresh();
 }
 function cancelGuide(){if(mode!=='guiding')return;guide=null;setMode('exploring');notice='유도를 멈췄어요. 친구는 바다에서 계속 헤엄칩니다.';refresh();}
 function recover(){if(!['exploring','collected'].includes(mode))return;guide=null;selected=null;notice='';setMode('recovering');deckPose(8);refresh();}
 function close(){if(!['briefing','closed'].includes(mode))return;setMode('closed');dialog.close();pause();}
 function refresh(){
  const waterMode=isWater(),busy=['guiding','recovering','returning','deploying','sailing'].includes(mode),kind=held();
  $('rov-brief').hidden=mode!=='briefing';$('rov-close').hidden=mode!=='briefing';
  $('rov-camera-label').hidden=!waterMode;$('rov-reticle').hidden=!waterMode||external||mode==='guiding';
  $('rov-depth').hidden=!waterMode||busy;$('rov-targets').hidden=!waterMode||!!kind||busy;
  $('rov-view-controls').hidden=!waterMode||busy;$('rov-controls').hidden=!waterMode||busy;
  $('rov-observe').hidden=mode!=='exploring'||!selected;$('rov-action').hidden=mode!=='exploring'||!selected;
  $('rov-action').disabled=!selected||!reachable(selected)||!!kind;$('rov-observe').disabled=!selected||!reachable(selected);
  $('rov-cancel').hidden=mode!=='guiding';$('rov-progress').hidden=mode!=='guiding';$('rov-progress').value=mode==='guiding'?elapsed/5.8:0;
  $('rov-view').textContent=external?'카메라로 보기':'탐사정 보기';$('rov-return').textContent=kind?'친구와 함께 귀환':'배로 회수';
  $('rov-title').textContent={closed:'',briefing:'포구에서 출항 준비',sailing:'제주 연안으로 이동 중',deploying:'탐사정 진수 · 주변 확인',exploring:pos.z<-5?'해조숲 가장자리':pos.x<-2?'포구 앞 바위길':'모래 물길',guiding:'이동 수조로 안내 중',collected:'수집 완료 · 배로 돌아가요',recovering:'탐사정 회수 중',returning:'포구로 귀항 중'}[mode];
  $('rov-subject').textContent=mode==='guiding'?names[guide.kind]+' · 이동 수조':kind?names[kind]+' · 이동 수조에 탑승':selected?names[selected]+' · '+distance(selected).toFixed(1)+' 거리':mode==='exploring'?'바위 사이를 천천히 살펴보세요.':'제주 연안 · 첫 탐사';
  $('rov-message').textContent=notice||({briefing:'한 번에 한 마리를 데려와 충분히 돌봐 주세요.',sailing:'선원들과 탐사 지점으로 향하고 있어요.',deploying:'크레인으로 배 옆에 내린 뒤 수중 카메라로 전환합니다.',exploring:'생물을 직접 누르거나 이름을 골라 방향을 확인하세요.',collected:'이제 회수해 관리동의 Anne에게 인계해요.',recovering:'수조를 닫고 탐사정을 갑판 거치대로 올립니다.',returning:'조수가 이동 수조를 관리동까지 운반합니다.'}[mode]||'');
  $('rov-depth-label').textContent='수심 '+(7-pos.y).toFixed(1);
  for(const k of SPECIES){const b=$('rov-target-'+k);b.disabled=!underwater.creatures[k].visible;b.setAttribute('aria-pressed',String(selected===k));b.textContent=names[k]+(stateFor(progress,k).admitted?' ✓':progress.discovered[k]?' · 발견':'');}
 }
 function cargoPose(){
  const k=held();for(const [id,f]of Object.entries(cargoModels)){f.visible=id===k;if(f.visible){f.position.copy(vehicle.root.localToWorld(new T.Vector3(.02,-.36,0)));f.rotation.y=vehicle.root.rotation.y+Math.PI/2;f.userData.update(0);}}
 }
 function update(dt){
  if(mode==='closed'||document.hidden)return;clock+=dt;elapsed+=dt;
  if(mode==='sailing'){shipRig.position.x=-3*ease(elapsed/3);coast.position.x=elapsed*2;if(elapsed>=3){shipRig.position.x=0;coast.visible=false;setMode('deploying');}}
  if(mode==='deploying'){deckPose(elapsed);if(elapsed>=8){setMode('exploring');notice='왼쪽을 끌어 이동하고 오른쪽에서 수심을 조절하세요.';}}
  if(mode==='recovering'){deckPose(8-Math.min(8,elapsed));if(elapsed>=8){setMode('returning');coast.visible=true;}}
  if(mode==='returning'){shipRig.position.x=3*ease(elapsed/3);coast.position.x=6*(1-ease(elapsed/3));if(elapsed>=3){setMode('closed');dialog.close();onReturn();return;}}
  if(isWater()){
   if(mode==='exploring'||mode==='collected'){
    const x=input.x+(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);
    const z=input.z+(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
    const y=input.vertical+(keys.has('q')?1:0)-(keys.has('e')?1:0);
    const before={...pos};swimStep(pos,x,z,dt,y);if(pos.y<1.3||pos.y>5.5||REEF_ROCKS.some(([rx,rz,r])=>pos.y<r+1.4&&Math.hypot(pos.x-rx,pos.z-rz)<r+1.25))Object.assign(pos,before);
    if(selected&&underwater.creatures[selected].visible){const p=underwater.creatures[selected].position,want=Math.atan2(p.x-pos.x,pos.z-p.z),turn=Math.atan2(Math.sin(want-pos.yaw),Math.cos(want-pos.yaw));pos.yaw+=T.MathUtils.clamp(turn,-dt*.55,dt*.55);}
   }
   underwater.update(dt,clock,progress,matchMedia('(prefers-reduced-motion: reduce)').matches);
   vehicle.root.position.set(pos.x,pos.y,pos.z);vehicle.root.rotation.y=pos.yaw+Math.PI/2;vehicle.root.updateMatrixWorld(true);vehicle.update(clock,mode!=='guiding',mode==='guiding'?1-ease((elapsed-4.7)/1.1):0);
   lure.visible=mode==='guiding';if(lure.visible){lure.position.copy(vehicle.root.localToWorld(new T.Vector3(1.12,-.32,0)));lure.scale.setScalar(1+Math.sin(clock*4)*.15);}
   if(mode==='guiding'){
    const f=underwater.creatures[guide.kind],entrance=vehicle.root.localToWorld(new T.Vector3(1.2,-.36,0)),inside=vehicle.root.localToWorld(new T.Vector3(.02,-.36,0));
    const t=ease((elapsed-.8)/3.6);f.position.copy(guide.from).lerp(entrance,Math.min(1,t*1.4));if(t>.72)f.position.copy(entrance).lerp(inside,ease((t-.72)/.28));
    const dir=inside.clone().sub(f.position);if(dir.lengthSq()>.001)f.rotation.y=Math.atan2(dir.x,dir.z);
    if(elapsed>=5.8){const k=guide.kind;stateFor(progress,k).bag=true;progress.discovered[k]=true;captureCount++;guide=null;selected=null;commit();setMode('collected');notice=names[k]+'가 수조에 들어왔어요. 문을 닫고 배로 돌아가요.';}
   }
   cargoPose();for(const f of Object.values(cargoModels))if(f.visible)f.userData.update(dt);
   const top=new T.Vector3(0,12,7),bottom=vehicle.root.localToWorld(new T.Vector3(-.13,.77,0)),d=bottom.clone().sub(top);tether.position.copy(top).addScaledVector(d,.5);tether.scale.y=d.length();tether.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
   selection.visible=!!selected&&mode==='exploring';if(selection.visible){selection.position.copy(underwater.creatures[selected].position);selection.lookAt(camera.position);selection.scale.setScalar(Math.max(1,fishLength(selected)*.9));}
  }
  refresh();
 }
 function render(){
  if(mode==='closed')return;const rect=canvas.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);if(!w||!h)return;
  if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const fov=isWater()?63:44;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  if(isWater()){
   const origin=new T.Vector3(pos.x,pos.y,pos.z),fwd=new T.Vector3(Math.sin(pos.yaw),0,-Math.cos(pos.yaw));
   if(mode==='guiding'){
    const mid=origin.clone().lerp(guide.from,.48),approach=guide.from.clone().sub(origin);approach.y=0;approach.normalize();const side=new T.Vector3(approach.z,0,-approach.x);camera.position.copy(mid).addScaledVector(side,5.5).addScaledVector(approach,.8).add(new T.Vector3(0,.1,0));camera.lookAt(mid.x,mid.y-.35,mid.z);vehicle.root.visible=true;
   }else if(external||mode==='collected'){camera.position.copy(origin).addScaledVector(fwd,-3.6).add(new T.Vector3(3.3,.15,0));camera.lookAt(origin.clone().add(new T.Vector3(0,-.45,0)));vehicle.root.visible=true;}
   else{camera.position.copy(origin).addScaledVector(fwd,.55).add(new T.Vector3(0,.35,0));const target=selected?underwater.creatures[selected].position:origin.clone().addScaledVector(fwd,8);camera.lookAt(target);vehicle.root.visible=false;}
   renderer.render(sea,camera);
  }else{camera.position.set(18,11,25);camera.lookAt(.8,.6,1);renderer.render(deck,camera);}
 }
 function screenPoint(k){render();const f=underwater.creatures[k],r=canvas.getBoundingClientRect(),v=f.position.clone().project(camera);return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,visible:f.visible&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}
 function inspect(){return {mode,selected,elapsed,position:{...pos},cargo:held(),captureCount,reachable:selected?reachable(selected):false,guide:guide?{kind:guide.kind,progress:elapsed/5.8}:null,fish:Object.fromEntries(Object.entries(underwater.creatures).map(([k,n])=>[k,{visible:n.visible,position:n.position.toArray()}])),renderCalls:renderer.info.render.calls,external,cableLength:cable.scale.y,source:'2026-10-20-jeju-rov-v1'};}
 $('rov-launch').onclick=()=>{if(mode==='briefing'&&!held()){notice='';setMode('sailing');refresh();}};
 $('rov-close').onclick=close;$('rov-action').onclick=startGuide;$('rov-cancel').onclick=cancelGuide;$('rov-return').onclick=recover;$('rov-observe').onclick=observe;
 $('rov-view').onclick=()=>{external=!external;refresh();render();};
 for(const k of SPECIES)$('rov-target-'+k).onclick=()=>select(k);
 const ray=new T.Raycaster();
 canvas.addEventListener('pointerdown',e=>{if(!['exploring','collected'].includes(mode)||e.button!==0)return;const r=canvas.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,left:e.clientX-r.left<r.width*.53};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});if(drag.left){$('rov-joystick').hidden=false;$('rov-joystick').style.left=Math.max(50,Math.min(r.width-50,e.clientX-r.left))+'px';$('rov-joystick').style.top=Math.max(70,Math.min(r.height-100,e.clientY-r.top))+'px';}});
 canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const dx=e.clientX-drag.x,dz=e.clientY-drag.y,d=Math.hypot(dx,dz);drag.moved||=d>9;if(drag.left){input.x=d>9?dx/Math.max(38,d):0;input.z=d>9?dz/Math.max(38,d):0;$('rov-joystick').firstElementChild.style.transform=`translate(${input.x*24}px,${input.z*24}px)`;}});
 canvas.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;const tap=!drag.moved;endMove();if(tap&&mode==='exploring'){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const k=underwater.pick(ray);if(k)select(k);}});
 for(const t of ['pointercancel','lostpointercapture'])canvas.addEventListener(t,endMove);
 for(const [id,value]of [['rov-up',1],['rov-down',-1]]){const b=$(id);b.addEventListener('pointerdown',e=>{if(depthPointer!==null)return;depthPointer=e.pointerId;input.vertical=value;b.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{if(e.pointerId===depthPointer){input.vertical=0;depthPointer=null;}});}
 dialog.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e'].includes(k)){e.preventDefault();keys.add(k);}});
 dialog.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(mode==='briefing')close();else if(mode==='guiding')cancelGuide();else if(isWater())recover();});
 window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{resetInput();last=0;});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();resetInput();setMode('closed');dialog.close();onReturn();});
 function frame(stamp){const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;update(dt);if(stamp-paint>1000/40){render();paint=stamp;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 const api={dialog,inspect,screenPoint,open(){if(mode!=='closed')return;pause();Object.assign(pos,{x:0,y:3.25,z:7,yaw:0,pitch:0});selected=null;guide=null;external=false;notice='';shipRig.position.x=0;coast.visible=true;coast.position.x=0;underwater.update(0,clock,progress);deckPose(0);setMode(held()?'collected':'briefing');dialog.showModal();refresh();render();}};
 if(new URLSearchParams(location.search).has('harness'))Object.assign(api,{step(seconds,fps=60){const dt=1/Math.max(30,Math.min(120,fps));for(let t=0;t<seconds;t+=dt)update(Math.min(dt,seconds-t));render();},setPosition(x,y,z){if(!swimBlocked(x,y,z)){Object.assign(pos,{x,y,z});render();}},select});
 return api;
}
