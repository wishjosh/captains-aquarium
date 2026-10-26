import * as T from '../../vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {GLTFLoader} from '../../vendor/GLTFLoader.js?v=2026-10-20-jeju-rov-v1';
import {loadFish,createFish} from '../../fish.js';
import {aquariumLighting} from '../../lighting.js';
import {createUnderwaterScenery} from '../../underwater-scenery.js';
import {CaptureWorld,RULES,add,sub,mul,len,unit,clamp} from './core.mjs?v=2026-10-26-touch-recovery-1';
import {CaptureInput} from './input.mjs?v=2026-10-26-touch-recovery-1';
import {EdgeFlow} from './flow.mjs?v=2026-10-26-touch-recovery-1';
import {explorerNose,edgePoints} from './device.mjs?v=2026-10-26-touch-recovery-1';
import {enclosurePose,membranePose,flightPose,ViewMotion} from './motion.mjs?v=2026-10-26-touch-recovery-1';
import {CaptureAudio} from './audio.mjs?v=2026-10-26-touch-recovery-1';
const $=id=>document.getElementById(id),world=new CaptureWorld(),audio=new CaptureAudio(),motion=new ViewMotion(),canvas=$('sea');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#377e8d');scene.fog=new T.FogExp2('#377e8d',.038);aquariumLighting(scene,{renderer});
const camera=new T.PerspectiveCamera(58,1,.04,95);camera.rotation.order='YXZ';scene.add(camera);
const rocks=[[-4,-5.5,1.25],[3.5,-5,1.2],[-3.7,-11,1.8],[5.3,-12,1.5]],terrain=[],colliders=[],shots=new Map(),particles=[],ripples=[];
const ray=new T.Raycaster(),tmp=new T.Vector3(),projected=new T.Vector3(),zAxis=new T.Vector3(0,0,1);
let fish,scenery,ready=false,started=false,paused=true,manual=false,accumulator=0,toastUntil=0,viewPose={roll:0,bob:0,fov:58,gunKick:0,charge:0},particleClock=0;
let dragState=null,dragHover=false,transportDepth=0,displayScale=1;
const controls=new CaptureInput(world,{root:$('game'),drag:{pick:pickBubble,move:moveBubble,end:dropBubble},move:$('moveZone'),base:$('stickBase'),knob:$('stickKnob'),look:$('lookZone'),primary:$('fire'),rise:$('rise'),sink:$('sink'),active:()=>ready&&started&&!paused,onFire:q=>fire(q),onGesture:()=>{canvas.focus({preventScroll:true});audio.unlock();},onStop:()=>world.stop()});
const sphere=new T.SphereGeometry(1,36,24),bubbleMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clock:{value:0},wobble:{value:.025},energy:{value:.3}},vertexShader:`uniform float clock;uniform float wobble;varying vec3 n;varying vec3 v;varying vec3 local;void main(){local=position;float wave=sin(position.x*7.+clock*4.2)*sin(position.y*6.-clock*3.6)*.55+sin(position.z*9.+clock*5.)*.35;vec3 p=position*(1.+wave*wobble);vec4 mv=modelViewMatrix*vec4(p,1.);n=normalize(normalMatrix*normal);v=-mv.xyz;gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float clock;uniform float energy;varying vec3 n;varying vec3 v;varying vec3 local;void main(){vec3 normal=normalize(n);float edge=pow(1.-abs(dot(normal,normalize(v))),2.3);float shine=pow(max(0.,dot(normal,normalize(vec3(-.5,.8,1.)))),48.);float band=.5+.5*sin(local.y*7.+local.x*4.+clock*.7);vec3 color=mix(vec3(.38,.88,.92),vec3(.95,.80,.46),edge*band*.65)+shine*.9;gl_FragColor=vec4(color,.045+edge*.66+shine*.48+energy*.025);}`});
const shell=new T.Mesh(sphere,bubbleMaterial),chargeBubble=new T.Mesh(sphere,bubbleMaterial);scene.add(shell,chargeBubble);shell.visible=chargeBubble.visible=false;
const brass=new T.MeshStandardMaterial({color:'#bd9c59',metalness:.5,roughness:.42}),wood=new T.MeshStandardMaterial({color:'#795437',roughness:.86}),teal=new T.MeshStandardMaterial({color:'#83bfc2',roughness:.24,metalness:.15});
const nose=explorerNose(camera),flow=new EdgeFlow(),flowVisual=edgePoints(scene,flow);
const port=new T.Group();scene.add(port);const ring=new T.Mesh(new T.TorusGeometry(.065,.008,8,36),brass);port.add(ring);
const darkIntake=new T.Mesh(new T.CircleGeometry(.060,32),new T.MeshBasicMaterial({color:'#193b40',transparent:true,opacity:.84}));darkIntake.position.z=-.003;port.add(darkIntake);
const innerRing=new T.Mesh(new T.TorusGeometry(.081,.003,5,36),new T.MeshBasicMaterial({color:'#e9dc9b',transparent:true,opacity:.1,depthWrite:false}));port.add(innerRing);for(const n of port.children){n.material=n.material.clone();n.material.depthTest=false;n.material.depthWrite=false;n.renderOrder=50;}
const smallSphere=new T.SphereGeometry(.015,7,5),particleMaterial=new T.MeshBasicMaterial({color:'#bce8de',transparent:true,opacity:.6,depthWrite:false}),rippleMaterial=new T.MeshBasicMaterial({color:'#e0d7a6',transparent:true,opacity:.55,depthWrite:false});
let seed=9281;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function burst(position,count=10,power=1){for(let i=0;i<count&&particles.length<60;i++){const mesh=new T.Mesh(smallSphere,particleMaterial.clone());mesh.position.fromArray(position);const a=random()*Math.PI*2,rad=.2+random()*.5;const velocity=[Math.cos(a)*rad*power,(random()*.7+.1)*power,Math.sin(a)*rad*power];scene.add(mesh);particles.push({mesh,velocity,age:0,life:.4+random()*.5});}}
function ripple(position,scale=1){const mesh=new T.Mesh(new T.TorusGeometry(.18,.009,5,40),rippleMaterial.clone());mesh.position.fromArray(position);mesh.quaternion.copy(camera.quaternion);scene.add(mesh);ripples.push({mesh,age:0,scale});}
function message(text,seconds=2){$('toast').textContent=text;toastUntil=world.time+seconds;}
function wallDistance(p,d,max){ray.set(tmp.fromArray(p),new T.Vector3().fromArray(d));ray.near=0;ray.far=max;return ray.intersectObjects(terrain,false)[0]?.distance??Infinity;}
function blocked(p){tmp.fromArray(p);return colliders.some(b=>b.distanceToPoint(tmp)<.25);}
function screenPoint(p){const v=new T.Vector3().fromArray(p).project(camera);return{x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,z:v.z};}
function intakeScreen(){return{...screenPoint(world.port()),radius:Math.max(30,Math.min(55,innerHeight*.085))};}
function pickBubble(x,y){
 if(world.phase!=='secured')return false;const center=screenPoint(world.shell),distance=camera.position.distanceTo(new T.Vector3().fromArray(world.shell));
 const radius=Math.max(28,Math.min(112,innerHeight*.43*displayScale/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*distance)));
 if(center.z<-1||center.z>1||Math.hypot(x-center.x,y-center.y)>radius)return false;
 const delta=sub(world.shell,world.player);if(wallDistance(world.player,unit(delta),len(delta))<len(delta)-.15){message('바위가 가리고 있어요. 위치를 바꿔 보세요.',2);return false;}
 if(!world.beginDrag())return false;
 const local=new T.Vector3().fromArray(world.shell).applyMatrix4(camera.matrixWorldInverse),port=intakeScreen();
 transportDepth ||= Math.max(.9,-local.z);
 dragState={offsetX:center.x-x,offsetY:center.y-y,startX:center.x,startY:center.y,depth:Math.max(.9,-local.z),lastX:x,lastY:y,portX:port.x,portY:port.y};dragHover=false;return true;
}
function moveBubble(x,y){
 if(!dragState||world.phase!=='dragging')return;const d=dragState,port=intakeScreen(),cx=x+d.offsetX,cy=y+d.offsetY,dx=port.x-d.startX,dy=port.y-d.startY;
 const progress=clamp(((cx-d.startX)*dx+(cy-d.startY)*dy)/(dx*dx+dy*dy||1),0,1),ease=progress*progress*(3-2*progress),depth=d.depth+(1.08-d.depth)*ease;
 const nx=cx/innerWidth*2-1,ny=1-cy/innerHeight*2,tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));
 const target=new T.Vector3(nx*tan*camera.aspect*depth,ny*tan*depth,-depth).applyMatrix4(camera.matrixWorld);
 d.lastX=x;d.lastY=y;dragHover=Math.hypot(cx-port.x,cy-port.y)<=port.radius;
 if(dragHover)target.lerp(new T.Vector3().fromArray(world.port()),.4);
 world.dragTo(target.toArray());
}
function dropBubble(x,y,cancel){
 if(!dragState)return false;if(!cancel)moveBubble(x,y);const port=intakeScreen(),d=dragState,near=Math.hypot(x+d.offsetX-port.x,y+d.offsetY-port.y)<=port.radius;
 const accepted=world.endDrag(!cancel&&near);dragState=null;dragHover=false;
 if(!accepted&&!cancel)message(world.recoveryBlocked?'바위에 막혔어요. 가까이 다가와 다시 끌어 주세요.':'황동 입구 쪽으로 다시 끌어 주세요.',2);consume();return accepted;
}
function fire(q=0){if(paused||!started||!ready)return false;return world.fire(q);}
function consume(){for(const e of world.drain()){
 audio.cue(e.type,e.power||0);
 if(e.type==='shot'){motion.impulse(.7+(e.power||0)*.4);burst(e.p,8,1);}
 if(e.type==='impact'){motion.impulse(.25);burst(e.p,16,.8);ripple(e.p,1.5);message('물방울이 감싸는 중이에요.',.8);}
 if(e.type==='secured')message('물방울을 직접 잡아 아래 탐사기로 끌어 주세요.',2.8);
 if(e.type==='drag-start')audio.cue('secured');
 if(e.type==='dock'){ripple(world.port(),.7);burst(world.port(),8,.35);}
 if(e.type==='recovered'){message('배로 안전하게 보냈어요. 수집 완료!',3);ripple(world.port(),1);}
 if(e.type==='miss'||e.type==='rock'){burst(e.p,6,.45);ripple(e.p,.7);message(e.type==='rock'?'바위에 닿았어요. 다른 각도를 찾아보세요.':'빗나갔어요. 움직일 방향을 보고 다시!',1.7);}
 if(e.type==='released')message('물방울을 풀었어요. 다시 만날 수 있어요.',2);
}}
function step(dt){if(!ready||paused)return;dt=Math.min(Math.max(dt,0),.25);accumulator+=dt;while(accumulator>=1/120){controls.updateLook(1/120);world.update(1/120,controls.read(),blocked,wallDistance);accumulator-=1/120;}fish.userData.update(dt);scenery.update(dt,reduced);consume();const r=world.report();viewPose=motion.update(dt,r,controls.read(),controls.charge(),reduced);audio.update(controls.charge(),r.dragging);flow.update(dt,r.velocity,{reduced,paused});
 particleClock+=dt;if(r.reeling&&particleClock>.065){particleClock=0;burst(r.shell,1,.12);}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.mesh.position.addScaledVector(new T.Vector3().fromArray(p.velocity),dt);p.velocity[1]+=.22*dt;p.mesh.material.opacity=Math.max(0,.6*(1-p.age/p.life));p.mesh.scale.setScalar(.7+p.age*.6);if(p.age>=p.life){scene.remove(p.mesh);p.mesh.material.dispose();particles.splice(i,1);}}
 for(let i=ripples.length-1;i>=0;i--){const p=ripples[i];p.age+=dt;p.mesh.scale.setScalar(p.scale*(1+p.age*3));p.mesh.material.opacity=Math.max(0,.55-p.age);if(p.age>.55){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();ripples.splice(i,1);}}
}
function render(){if(!ready)return;const r=world.report(),q=controls.charge(),pose=membranePose(r);camera.position.fromArray(r.player);camera.position.y+=viewPose.bob;camera.rotation.set(r.pitch,r.yaw,viewPose.roll);camera.fov=viewPose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const localDepth=-new T.Vector3().fromArray(r.shell).applyMatrix4(camera.matrixWorldInverse).z;displayScale=transportDepth&&r.phase!=='swimming'?clamp(localDepth/transportDepth,.15,1):1;fish.scale.setScalar(displayScale);fish.position.fromArray(r.fish);if(r.phase==='swimming'){const d=sub(r.fish,world.previousFish);if(len(d)>.000001)fish.rotation.y=Math.atan2(d[0],d[2]);}else fish.rotation.y=Math.PI/2+Math.sin(r.time*.6)*.45;
 shell.visible=!['swimming','recovered'].includes(r.phase);const dock= r.phase==='docking'?clamp(r.phaseAge/RULES.dockSeconds,0,1):0;fish.visible=r.phase!=='recovered'&&dock<.7;if(shell.visible){shell.position.fromArray(r.shell);const shrink=1-.86*dock*dock;shell.scale.set(...pose.axes.map(n=>n*pose.radius*shrink*displayScale));}
 bubbleMaterial.uniforms.clock.value=r.time;bubbleMaterial.uniforms.wobble.value=reduced?.012:pose.wobble;bubbleMaterial.uniforms.energy.value=pose.energy;
 chargeBubble.visible=q>0&&r.phase==='swimming'&&!paused;if(chargeBubble.visible){chargeBubble.position.fromArray(world.muzzle());const radius=.045+q*.12;chargeBubble.scale.set(radius*(1+.09*Math.sin(r.time*24)),radius*(1-.07*Math.sin(r.time*24)),radius);}
 for(const [id,n]of shots)if(!r.shots.some(s=>s.id===id)){scene.remove(n);shots.delete(id);}for(const s of r.shots){if(!shots.has(s.id)){const n=new T.Mesh(sphere,bubbleMaterial);scene.add(n);shots.set(s.id,n);}const n=shots.get(s.id),flight=flightPose(s.age,s.power);n.position.fromArray(s.p);n.quaternion.setFromUnitVectors(zAxis,new T.Vector3().fromArray(unit(s.v)));n.scale.set(...flight.axes.map(v=>v*s.radius));}
 nose.update(viewPose,controls.read(),camera.aspect);port.visible=started;port.position.fromArray(r.port);port.quaternion.copy(camera.quaternion);innerRing.material.opacity=dragHover?.9: r.phase==='secured'||r.phase==='dragging'?.35+.14*Math.sin(r.time*5):.08;innerRing.scale.setScalar(dragHover?1.1:1);flowVisual.sync();
 renderer.render(scene,camera);projected.fromArray(r.fish).project(camera);const front=new T.Vector3().fromArray(r.fish).sub(camera.position).dot(camera.getWorldDirection(tmp))>0,visible=front&&Math.abs(projected.x)<.86&&Math.abs(projected.y)<.73;
 $('target').hidden=!visible||r.phase!=='swimming'||!started;$('target').style.left=(projected.x*.5+.5)*innerWidth+'px';$('target').style.top=(-projected.y*.5+.5)*innerHeight-22+'px';$('direction').hidden=visible||r.phase!=='swimming'||!started;
 if(!visible){const local=new T.Vector3().fromArray(r.fish).applyMatrix4(camera.matrixWorldInverse);$('direction').textContent=local.z>0?'친구가 뒤에 있어요':`친구 ${local.x>0?'→':'←'}`;}
 $('reticle').hidden=r.phase!=='swimming';$('reticle').classList.toggle('aim',front&&Math.hypot(projected.x*camera.aspect,projected.y)<.11);$('reticle').style.width=$('reticle').style.height=24+q*12+'px';$('charge').hidden=r.phase!=='swimming'&&r.phase!=='recovering';$('charge').firstElementChild.style.width=(r.phase==='recovering'?r.reelProgress:q)*100+'%';
 $('fire').hidden=r.phase!=='swimming';$('fire').disabled=paused||r.phase!=='swimming';$('actionLabel').textContent=q>.05?'준비':'물방울';$('actionHint').hidden=r.phase!=='swimming';$('charge').hidden=r.phase!=='swimming';
 const bs=screenPoint(r.shell),intake=intakeScreen();$('bubbleHint').hidden=!(r.phase==='secured'||r.phase==='dragging'&&r.recoveryBlocked)||paused||bs.z>1||bs.z< -1;$('bubbleHint').textContent=r.recoveryBlocked?'바위가 가리고 있어요':r.phase==='dragging'?'아래 황동 입구에 놓아 주세요':'물방울을 잡아 아래 탐사기로';$('bubbleHint').style.left=clamp(bs.x,100,innerWidth-100)+'px';$('bubbleHint').style.top=clamp(bs.y-60,70,innerHeight-100)+'px';
 $('intakeHint').hidden=!['secured','dragging'].includes(r.phase)||paused;$('intakeHint').textContent=dragHover?'손을 놓아 주세요':'이곳으로 데려와요';$('intakeHint').classList.toggle('ready',dragHover);$('intakeHint').style.left=intake.x+'px';$('intakeHint').style.top=intake.y-intake.radius-15+'px';
 $('toast').classList.toggle('show',r.time<toastUntil&&!paused&&started&&r.phase!=='dragging');

}
function resize(){controls.clear();renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();render();}
function pause(value){paused=!!value;controls.clear();flow.clear();flowVisual.sync();audio.stopLoops();accumulator=0;$('pause').textContent=paused?'계속':'멈춤';if(started){$('curtain').hidden=!paused;$('curtain').querySelector('h1').textContent='잠시 쉬어 갈까요?';$('start').textContent='계속 헤엄치기';}if(!paused)canvas.focus({preventScroll:true});render();}
function start(){if(!ready)return;audio.unlock();started=true;pause(false);$('pause').disabled=$('reset').disabled=false;message('물방울을 쏜 뒤, 잡힌 방울을 아래로 끌어 주세요.',3);}
function reset(){controls.clear();dragState=null;dragHover=false;transportDepth=0;displayScale=1;flow.clear();audio.stopLoops();world.reset();motion.reset();viewPose={roll:0,bob:0,fov:58,gunKick:0,charge:0};accumulator=0;for(const p of particles){scene.remove(p.mesh);p.mesh.material.dispose();}particles.length=0;for(const p of ripples){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}ripples.length=0;if(started)pause(false);render();}
$('start').onclick=start;$('pause').onclick=()=>pause(!paused);$('reset').onclick=reset;$('sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('sound').setAttribute('aria-pressed',String(audio.enabled));$('sound').textContent=audio.enabled?'소리 켜짐':'소리 꺼짐';};
// An iframe can lose focus while the expedition remains visible. Do not show
// the pause curtain for that. Clear stale input only after a genuine focus loss.
let focusCheck=0;
addEventListener('blur',()=>{clearTimeout(focusCheck);focusCheck=setTimeout(()=>{if(started&&!paused&&!document.hasFocus()){controls.clear();audio.stopLoops();accumulator=0;}},0);});
addEventListener('focus',()=>clearTimeout(focusCheck));
$('game').addEventListener('pointerdown',e=>{if(started&&!paused&&e.target.closest('#moveZone,#lookZone,#fire,#rise,#sink'))canvas.focus({preventScroll:true});},{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)pause(true);});addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat&&started)pause(!paused);});
for(const type of ['contextmenu','selectstart','dragstart'])document.addEventListener(type,e=>e.preventDefault(),{capture:true});document.addEventListener('selectionchange',()=>{if(getSelection()?.rangeCount)getSelection().removeAllRanges();});
addEventListener('resize',resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);$('error').hidden=false;$('error').textContent='화면 연결이 끊겼어요. 페이지를 다시 열어 주세요.';});
try{const base=new URL('../../',import.meta.url),loader=new GLTFLoader();const [animal,entries]=await Promise.all([loadFish(),Promise.all(Object.entries({rock:'assets/nature/rock_largeA.glb',rockB:'assets/nature/rock_largeC.glb',seaweed:'assets/underwater/mohabins-seaweed.glb',kelp:'assets/underwater/google-kelp.glb'}).map(async([key,path])=>[key,await loader.loadAsync(new URL(path,base).href)]))]);scenery=createUnderwaterScenery(Object.fromEntries(entries),rocks);scene.add(scenery.group);scenery.group.updateMatrixWorld(true);for(const n of scenery.group.children){if(!n.isInstancedMesh||n.material?.color?.getHexString()!=='293a3e')continue;terrain.push(n);n.geometry.computeBoundingBox();for(let i=0;i<n.count;i++){const m=new T.Matrix4();n.getMatrixAt(i,m);m.premultiply(n.matrixWorld);colliders.push(n.geometry.boundingBox.clone().applyMatrix4(m));}}
 fish=createFish(animal,{kind:'fish',length:RULES.fishLength,appearance:'white-eye'});scene.add(fish);ready=true;resize();$('start').disabled=false;$('start').textContent='바다로 들어가기';$('loading').textContent='효과음은 시작 후 재생되며 위에서 끌 수 있어요.';
 window.bubbleStudy={ready:true,report:()=>({...world.report(),started,paused,controls:controls.report(),motion:{...viewPose,membrane:membranePose(world.report())},fishScreen:{x:(projected.x*.5+.5)*innerWidth,y:(-projected.y*.5+.5)*innerHeight},fishClip:fish.userData.inspect().clip,fishClipTime:fish.userData.inspect().clipTime,audio:audio.report(),particles:particles.length,ripples:ripples.length,style:'explorer-touch-recovery',bubbleScreen:screenPoint(world.shell),intakeScreen:intakeScreen(),noseBounds:nose.bounds(camera,innerWidth,innerHeight),edgeFlow:flow.report(),dragHover,displayScale,renderCalls:renderer.info.render.calls,fishSource:fish.userData.inspect().source,saveConnected:false}),captureAudio:()=>audio.captureStream()};
 if(new URLSearchParams(location.search).get('harness')==='1')window.bubbleStudy.harness={setManual(v){manual=!!v;},step(dt){step(dt);render();},reset,aimAt(p){const d=sub(p,world.player);controls.lookX=controls.lookY=0;world.yaw=Math.atan2(-d[0],-d[2]);world.pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));render();},setPose({player,yaw=0,pitch=0}){controls.clear();world.player=[...player];world.yaw=yaw;world.pitch=pitch;world.stop();render();},fire,wallDistance,blocked,canvas};
 let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!manual)step(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){$('error').hidden=false;$('error').textContent='시안을 불러오지 못했어요. '+error.message;throw error;}
