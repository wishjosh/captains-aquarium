import {createUnderwaterScenery} from './underwater-scenery.js?v=2026-10-20-jeju-rov-v1';
import {SPECIES,stateFor,fishLength} from './species.js?v=2026-10-20-jeju-rov-v1';
import * as T from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createFish} from './fish.js?v=2026-10-20-jeju-rov-v1';
export const DIVE_START={x:0,y:2.8,z:8,yaw:0,pitch:0};
export const REEF_ROCKS=[[-6,2,1.7],[6,0,2.1],[-8,-7,2],[3,-9,1.7],[9,-11,1.8],[-3,-15,2.1],[-10,8,2],[10,8,1.8]];
export function swimBlocked(x,y,z){return ![x,y,z].every(Number.isFinite)||Math.abs(x)>13||z < -19||z>11||y<.85||y>6.3||REEF_ROCKS.some(([rx,rz,r])=>y<r+0.5&&Math.hypot(x-rx,z-rz)<r+.35);}
export function swimStep(p,x,z,dt,vertical=0){
 const length=Math.hypot(x,z,vertical);if(length<.01)return false;
 const speed=3.6*Math.min(dt,.05)/Math.max(1,length),yaw=p.yaw;
 const delta={x:(x*Math.cos(yaw)-z*Math.sin(yaw))*speed,y:vertical*speed,z:(x*Math.sin(yaw)+z*Math.cos(yaw))*speed};
 let moved=false;for(const k of ['x','y','z']){const next={...p,[k]:p[k]+delta[k]};if(!swimBlocked(next.x,next.y,next.z)){p[k]=next[k];moved ||= Math.abs(delta[k])>1e-5;}}return moved;
}
export function createUnderwater(fishAsset,assets){
 const group=new T.Group(),creatures={};
 const scenery=createUnderwaterScenery(assets,REEF_ROCKS);group.add(scenery.group);
 for(const kind of (fishAsset.speciesAssets?SPECIES:['fish'])){
  const model=createFish(fishAsset,{kind,length:fishLength(kind)});
  creatures[kind]=model;group.add(model);
 }
 const forward=new T.Vector3(),to=new T.Vector3();
 function update(dt,time,p,reduced=false){
  const t=reduced?0:time;
  const positions={fish:[Math.sin(t*.38)*1.1,2.7+Math.sin(t*.5)*.15,1+Math.cos(t*.38)*.4],puffer:[-3+Math.sin(t*.3)*.7,2.8+Math.sin(t*.6)*.12,-3+Math.cos(t*.3)*.4],moorish:[4.5+Math.sin(t*.34)*.8,3.3+Math.sin(t*.4)*.15,-4+Math.cos(t*.34)*.45],cowfish:[-.5+Math.sin(t*.27)*.7,2.6+Math.sin(t*.5)*.12,-8+Math.cos(t*.27)*.4]};
  for(const [kind,model]of Object.entries(creatures)){const state=stateFor(p,kind)||{};model.visible=!state.bag&&!state.admitted;model.position.set(...positions[kind]);model.userData.update(reduced?0:dt);model.rotation.y=Math.PI/2+Math.sin(t*.4)*.5;}
  scenery.update(dt,reduced);
 }
 function target(p){
  if(Math.hypot(p.x,p.y-2.8,p.z-9)<2.4)return 'return';
  forward.set(Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch));let best=null,dist=3.2;
  for(const [k,n]of Object.entries(creatures)){to.copy(n.position).sub(new T.Vector3(p.x,p.y,p.z));const d=to.length();if(!n.visible||d>=dist||to.normalize().dot(forward)<.4)continue;
   let occluded=false;for(let i=1;i<10;i++){const q=new T.Vector3(p.x,p.y,p.z).lerp(n.position,i/10);if(swimBlocked(q.x,q.y,q.z)){occluded=true;break;}}if(!occluded){best=k;dist=d;}}
  return best;
 }
 function canCollect(kind,p){const n=creatures[kind];if(!n?.visible||Math.hypot(p.x-n.position.x,p.y-n.position.y,p.z-n.position.z)>3.6)return false;for(let i=1;i<16;i++){const f=i/16;if(swimBlocked(p.x+(n.position.x-p.x)*f,p.y+(n.position.y-p.y)*f,p.z+(n.position.z-p.z)*f))return false;}return true;}
 function pick(ray){let nearest=null,distance=Infinity;for(const [kind,n] of Object.entries(creatures)){if(!n.visible)continue;const hits=ray.intersectObject(n,true);const center=n.getWorldPosition(new T.Vector3()),along=center.clone().sub(ray.ray.origin).dot(ray.ray.direction);const close=kind==='fish'&&along>0&&ray.ray.distanceToPoint(center)<.24;if((hits.length||close)&&along<distance){nearest=kind;distance=along;}}return nearest;}
 update(0,0,{bag:false,admitted:false});
 return {group,creatures,update,target,pick,canCollect,inspect:()=>({ambient:0,...scenery.inspect(),creatures:Object.fromEntries(Object.entries(creatures).map(([k,n])=>[k,{...n.position}]))})};
}
