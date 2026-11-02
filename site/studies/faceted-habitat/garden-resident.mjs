import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createFish} from './runtime/fish.js';
export const GARDEN_SPECIES={name:'가시복',scientific:'Diodon holocanthus',source:'https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000005487',length:.72};
// Reuse the existing CC0 skinned model and approved private display materials.
// Looking at the captain / pausing to show its side are game staging, not ethology.
export function createGardenResident(asset){
 if(!asset?.scene)throw Error('Garden puffer asset missing');
 const root=createFish(asset,{kind:'puffer',length:GARDEN_SPECIES.length,appearance:'white-eye'});
 root.name='가시복 · 작은 정원';let age=0,rate=.45,pitch=0,bank=0;
 const originalUpdate=root.userData.update,originalInspect=root.userData.inspect;
 function reset(){age=0;rate=.45;pitch=bank=0;root.rotation.set(0,0,0);}
 function update(dt,{velocity=[0,0,0],phase='peeking',gesture='peek',captain=[0,2.5,0]}={}){
  const speed=Math.hypot(...velocity);age+=dt;const factor=1-Math.exp(-dt*4);
  rate+=(Math.max(.4,Math.min(1.8,.4+speed*1.1))-rate)*factor;originalUpdate(dt*rate);
  let desiredYaw=speed>.055?Math.atan2(velocity[0],velocity[2]):Math.atan2(captain[0]-root.position.x,captain[2]-root.position.z);
  if(gesture==='watch')desiredYaw=Math.atan2(captain[0]-root.position.x,captain[2]-root.position.z);
  const turn=Math.atan2(Math.sin(desiredYaw-root.rotation.y),Math.cos(desiredYaw-root.rotation.y));root.rotation.y+=turn*(1-Math.exp(-dt*(phase==='retreating'?5:2.6)));
  const desiredPitch=-Math.atan2(velocity[1],Math.max(.12,Math.hypot(velocity[0],velocity[2])));
  pitch+=(T.MathUtils.clamp(desiredPitch,-.16,.16)-pitch)*factor;bank+=(T.MathUtils.clamp(-turn*.055,-.09,.09)-bank)*factor;
  root.rotation.order='YXZ';root.rotation.x=pitch;root.rotation.z=bank;
 }
 return{root,update,reset,inspect:()=>({...originalInspect(),name:GARDEN_SPECIES.name,scientific:GARDEN_SPECIES.scientific,animationRate:rate,gameStaging:true})};
}
