import * as T from '../../vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {GLTFLoader} from '../../vendor/GLTFLoader.js?v=2026-10-20-jeju-rov-v1';
import {loadFish,createFish} from '../../fish.js';
import {aquariumLighting} from '../../lighting.js';
import {createUnderwaterScenery} from '../../underwater-scenery.js';
import {BubbleWorld,RULES,sub,length} from './core.mjs?v=2026-10-24-bubble-1';

// Rendering-only source imports. This experiment never imports gameplay or saves.
const $=id=>document.getElementById(id),canvas=$('sea'),world=new BubbleWorld();
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#377e8d');scene.fog=new T.FogExp2('#377e8d',.038);
aquariumLighting(scene,{renderer});
const camera=new T.PerspectiveCamera(58,1,.04,95);camera.rotation.order='YXZ';scene.add(camera);
const rocks=[[-4,-5.5,1.25],[3.5,-5,1.2],[-3.7,-11,1.8],[5.3,-12,1.5]];
const ray=new T.Raycaster(),tmp=new T.Vector3(),projected=new T.Vector3();
const input={x:0,z:0,y:0},keys=new Set(),projectiles=new Map(),pops=[],terrainRocks=[],colliders=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let fish,scenery,ready=false,started=false,paused=true,manual=false,accumulator=0,recoil=0,toastUntil=0,reticleUntil=0;
let stickPointer=null,lookPointer=null,stickOrigin=null,lastLook=null,depthPointer=null,depthDirection=0;
let soundEnabled=false,audio;
const zeroInput=()=>{input.x=input.y=input.z=0;keys.clear();stickPointer=lookPointer=depthPointer=null;depthDirection=0;lastLook=null;$('stickKnob').style.transform='none';};
function sound(type){if(!soundEnabled)return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(type==='caught'?520:type==='shot'?310:200,t);o.frequency.exponentialRampToValueAtTime(type==='caught'?1050:100,t+.17);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+.23);o.connect(g);g.connect(audio.destination);o.start();o.stop(t+.25);}catch{soundEnabled=false;$('sound').textContent='소리 꺼짐';$('sound').setAttribute('aria-pressed','false');}}
function message(text,seconds=2){$('toast').textContent=text;toastUntil=world.time+seconds;$('toast').classList.add('show');}
const bubbleGeometry=new T.SphereGeometry(1,28,20);
const bubbleMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{tint:{value:new T.Color('#b5f4ef')}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-mv.xyz;gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.8);float shine=pow(max(0.,dot(normalize(n),normalize(vec3(-.6,.8,1.)))),35.);vec3 c=mix(tint,vec3(1.,.84,.51),rim*.5)+shine*.8;gl_FragColor=vec4(c,.035+rim*.72+shine*.6);}`});
const shell=new T.Mesh(bubbleGeometry,bubbleMaterial);shell.visible=false;scene.add(shell);
const gun=new T.Group();camera.add(gun);gun.scale.setScalar(.7);gun.position.set(.25,-.24,-.64);gun.rotation.set(-.08,-.13,0);
const brass=new T.MeshStandardMaterial({color:'#c29e58',roughness:.44,metalness:.55});
const wood=new T.MeshStandardMaterial({color:'#795437',roughness:.85});
const teal=new T.MeshStandardMaterial({color:'#83bfc2',roughness:.24,metalness:.15});
function mesh(g,m,x,y,z){const a=new T.Mesh(g,m);a.position.set(x,y,z);gun.add(a);return a;}
const barrel=mesh(new T.CylinderGeometry(.055,.075,.25,12),brass,0,0,-.05);barrel.rotation.x=Math.PI/2;
const grip=mesh(new T.BoxGeometry(.075,.18,.075),wood,0,-.085,.035);grip.rotation.x=-.25;
mesh(new T.SphereGeometry(.083,16,10),teal,0,.04,.075);
const muzzle=mesh(new T.TorusGeometry(.066,.012,7,20),brass,0,0,-.18);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
function syncCamera(){camera.position.fromArray(world.player);camera.rotation.set(world.pitch,world.yaw,0);camera.updateMatrixWorld(true);}
function wallDistance(p,d,max){if(!scenery)return Infinity;ray.set(tmp.fromArray(p),new T.Vector3().fromArray(d));ray.near=0;ray.far=max;const hits=ray.intersectObjects(terrainRocks,false);return hits[0]?.distance??Infinity;}
function blocked(p){tmp.fromArray(p);return colliders.some(box=>box.distanceToPoint(tmp)<.25);}
function getInput(){return {x:input.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z:input.z+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),y:depthDirection+(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)};}
function fire(){if(!ready||!started||paused)return false;const fired=world.fire();if(fired){recoil=1;reticleUntil=world.time+.13;sound('shot');}return fired;}
function processEvents(){for(const event of world.drain()){
 if(event.type==='caught'){sound('caught');message('물방울로 감쌌어요! 움직이며 함께 헤엄쳐 보세요.',3);}
 if(event.type==='rock'){sound('pop');message('바위에 닿았어요. 다른 각도로 쏴 보세요.',2);pop(event.p);}
 if(event.type==='miss'){message('살짝 빗나갔어요. 움직일 방향을 보고 다시!',1.6);pop(event.p);}
 if(event.type==='release')message('물방울을 풀었어요. 다시 만날 수 있어요.',2);
}}
function pop(p){const n=new T.Mesh(new T.TorusGeometry(.15,.012,6,24),new T.MeshBasicMaterial({color:'#d7efe3',transparent:true,opacity:.6,depthWrite:false}));n.position.fromArray(p);n.quaternion.copy(camera.quaternion);scene.add(n);pops.push({n,age:0});}
function step(dt){if(!ready||paused)return;accumulator+=Math.min(dt,.25);while(accumulator>=1/120){world.update(1/120,getInput(),blocked,wallDistance);accumulator-=1/120;}
 fish.userData.update(dt);scenery.update(dt,reduced);recoil=Math.max(0,recoil-dt*6);processEvents();
 for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.age+=dt;p.n.scale.setScalar(1+p.age*2.8);p.n.material.opacity=Math.max(0,.6-p.age*1.5);if(p.age>.4){scene.remove(p.n);p.n.geometry.dispose();p.n.material.dispose();pops.splice(i,1);}}
}
function render(){if(!ready)return;syncCamera();
 fish.position.fromArray(world.fish);if(world.phase==='swimming'){const delta=sub(world.fish,world.fishBefore);if(length(delta)>.00001)fish.rotation.y=Math.atan2(delta[0],delta[2]);}else fish.rotation.y=Math.PI/2+Math.sin((world.time-world.caughtAt)*.6)*.6;
 shell.visible=world.phase==='caught';if(shell.visible){shell.position.fromArray(world.shell);const age=world.time-world.caughtAt;shell.scale.setScalar(T.MathUtils.lerp(.18,.43,T.MathUtils.smoothstep(age,0,.5)));}
 for(const [id,n]of projectiles)if(!world.shots.some(s=>s.id===id)){scene.remove(n);projectiles.delete(id);}
 for(const shot of world.shots){if(!projectiles.has(shot.id)){const n=new T.Mesh(bubbleGeometry,bubbleMaterial);n.scale.setScalar(RULES.bubbleRadius);scene.add(n);projectiles.set(shot.id,n);}projectiles.get(shot.id).position.fromArray(shot.p);}
 gun.position.set(.25,-.24-recoil*.015,-.64+recoil*.055);gun.rotation.x=-.08+recoil*.1;
 renderer.render(scene,camera);
 projected.fromArray(world.fish).project(camera);const front=new T.Vector3().fromArray(world.fish).sub(camera.position).dot(camera.getWorldDirection(tmp))>0;
 const visible=front&&Math.abs(projected.x)<.86&&Math.abs(projected.y)<.73;
 $('target').hidden=!visible||world.phase==='caught'||!started;
 $('target').style.left=(projected.x*.5+.5)*innerWidth+'px';$('target').style.top=(-projected.y*.5+.5)*innerHeight-22+'px';
 $('direction').hidden=visible||world.phase==='caught'||!started;
 if(!visible){const local=new T.Vector3().fromArray(world.fish).applyMatrix4(camera.matrixWorldInverse);$('direction').textContent=local.z>0?'친구가 뒤에 있어요 · 돌아보세요':Math.abs(projected.x)>Math.abs(projected.y)?`친구 ${local.x>0?'→':'←'}`:`친구 ${local.y>0?'↑':'↓'}`;}
 $('reticle').classList.toggle('aim',front&&Math.hypot(projected.x*camera.aspect,projected.y)<.11&&world.phase==='swimming');
 $('reticle').classList.toggle('shot',world.time<reticleUntil);
 $('toast').classList.toggle('show',world.time<toastUntil&&started&&!paused);
 $('counter').textContent=`발사 ${world.fired}`;$('caught').hidden=world.phase!=='caught'||paused;
 $('fire').disabled=paused||world.phase==='caught';$('reticle').hidden=world.phase==='caught';gun.visible=world.phase==='swimming';
}
function setPaused(value){paused=!!value;zeroInput();accumulator=0;$('pause').textContent=paused?'계속':'멈춤';$('pause').setAttribute('aria-label',paused?'계속하기':'일시정지');if(started){$('curtain').hidden=!paused;$('curtain').querySelector('h1').textContent='잠시 쉬어 갈까요?';$('start').textContent='계속 헤엄치기';$('loading').textContent='게임 진행과 생물은 그대로 기다리고 있어요.';}if(!paused)canvas.focus({preventScroll:true});render();}
function start(){if(!ready)return;started=true;setPaused(false);$('pause').disabled=false;$('reset').disabled=false;message('움직임을 보고, 물방울을 한 발 쏴 보세요.',3);}
function reset(){world.reset();zeroInput();accumulator=0;recoil=0;for(const p of pops){scene.remove(p.n);p.n.geometry.dispose();p.n.material.dispose();}pops.length=0;if(started)setPaused(false);message('새로운 시도! 거리와 방향을 바꿔 보세요.',2);render();}
$('start').onclick=start;$('pause').onclick=()=>setPaused(!paused);$('reset').onclick=reset;
$('release').onclick=()=>{world.release();processEvents();render();};
$('sound').onclick=()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').textContent=soundEnabled?'소리 켜짐':'소리 꺼짐';$('sound').setAttribute('aria-label',soundEnabled?'효과음 끄기':'효과음 켜기');if(soundEnabled)sound('shot');};
$('fire').addEventListener('pointerdown',e=>{e.preventDefault();fire();});$('fire').addEventListener('click',e=>{if(e.detail===0)fire();});
const stick=$('joystick');
stick.addEventListener('pointerdown',e=>{if(paused||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};stick.setPointerCapture(e.pointerId);});
stick.addEventListener('pointermove',e=>{if(e.pointerId!==stickPointer)return;const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,r=40,mag=Math.hypot(dx,dy),scale=mag>r?r/mag:1;input.x=dx*scale/r;input.z=-dy*scale/r;$('stickKnob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;});
const releaseStick=e=>{if(e.pointerId===stickPointer){input.x=input.z=0;stickPointer=null;$('stickKnob').style.transform='none';}};
for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,releaseStick);
const look=$('lookZone');
look.addEventListener('pointerdown',e=>{if(paused||lookPointer!==null)return;e.preventDefault();lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId);});
look.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||paused)return;world.look((e.clientX-lastLook.x)*.0038,(e.clientY-lastLook.y)*.0038);lastLook={x:e.clientX,y:e.clientY};});
look.addEventListener('pointerup',e=>{if(e.pointerId!==lookPointer)return;lookPointer=null;lastLook=null;fire();});
for(const event of ['pointercancel','lostpointercapture'])look.addEventListener(event,e=>{if(e.pointerId===lookPointer){lookPointer=null;lastLook=null;}});
for(const [id,sign]of [['rise',1],['sink',-1]]){const button=$(id);button.addEventListener('pointerdown',e=>{if(paused||depthPointer!==null)return;e.preventDefault();depthPointer=e.pointerId;depthDirection=sign;button.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{if(depthPointer===e.pointerId){depthPointer=null;depthDirection=0;}});}
addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyP'&&!e.repeat&&started){setPaused(!paused);return;}if(!started||paused)return;keys.add(e.code);if(e.code==='Space'&&!e.repeat)fire();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{if(started&&!paused)setPaused(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)setPaused(true);});
addEventListener('resize',resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setPaused(true);$('error').hidden=false;$('error').textContent='화면 연결이 잠시 끊겼어요. 페이지를 다시 열어 주세요.';});
try{
 const base=new URL('../../',import.meta.url),loader=new GLTFLoader();
 const [animal,entries]=await Promise.all([loadFish(),Promise.all(Object.entries({rock:'assets/nature/rock_largeA.glb',rockB:'assets/nature/rock_largeC.glb',seaweed:'assets/underwater/mohabins-seaweed.glb',kelp:'assets/underwater/google-kelp.glb'}).map(async([key,path])=>[key,await loader.loadAsync(new URL(path,base).href)]))]);
 scenery=createUnderwaterScenery(Object.fromEntries(entries),rocks);scene.add(scenery.group);scenery.group.updateMatrixWorld(true);
 for(const n of scenery.group.children){if(!n.isInstancedMesh||n.material?.color?.getHexString()!=='293a3e')continue;terrainRocks.push(n);n.geometry.computeBoundingBox();for(let i=0;i<n.count;i++){const matrix=new T.Matrix4();n.getMatrixAt(i,matrix);matrix.premultiply(n.matrixWorld);colliders.push(n.geometry.boundingBox.clone().applyMatrix4(matrix));}}
 fish=createFish(animal,{kind:'fish',length:RULES.fishLength,appearance:'white-eye'});scene.add(fish);ready=true;resize();$('start').disabled=false;$('start').textContent='바다로 들어가기';$('loading').textContent='별도 조작 시안 · 실제 게임의 진행과 저장은 유지됩니다.';
 window.bubbleStudy={ready:true,report:()=>({...world.report(),paused,started,inputs:getInput(),pointers:{stick:stickPointer,look:lookPointer,depth:depthPointer},fishScreen:{x:(projected.x*.5+.5)*innerWidth,y:(-projected.y*.5+.5)*innerHeight},fishClip:fish.userData.inspect().clip,fishClipTime:fish.userData.inspect().clipTime,scenery:scenery.inspect(),newImages:0,lighting:'B',saveConnected:false})};
 if(new URLSearchParams(location.search).get('harness')==='1')window.bubbleStudy.harness={setManual(value){manual=!!value;},step(dt){step(dt);render();},reset,aimAt(point){const d=sub(point,world.player),h=Math.hypot(d[0],d[2]);world.yaw=Math.atan2(-d[0],-d[2]);world.pitch=Math.atan2(d[1],h);render();},setPose({player,yaw=0,pitch=0}){world.player=[...player];world.yaw=yaw;world.pitch=pitch;world.velocity=[0,0,0];render();},fire,wallDistance,blocked};
 let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!manual)step(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(e){$('error').hidden=false;$('error').textContent='바다를 불러오지 못했어요. '+e.message;$('loading').textContent='프로젝트 폴더를 제공하는 로컬 서버로 열어 주세요.';throw e;}
