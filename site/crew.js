import {equipAnneFeedBucket} from './anne-feed-bucket.js?v=2026-10-20-anne-bucket-1';
import {SPECIES,fishLength} from './species.js?v=2026-10-20-anne-bucket-1';
import * as T from './vendor/three.module.js?v=2026-10-20-anne-bucket-1';
import {clone} from './vendor/SkeletonUtils.js?v=2026-10-20-anne-bucket-1';
import {createCaptain} from './pirate.js?v=2026-10-20-anne-bucket-1';
import {createFish} from './fish.js?v=2026-10-20-anne-bucket-1';
export function createCrew(kit,fishAsset,{label,blocked,canStep,surface}){
 const actors={},names={management:'사육 담당',exhibition:'전시 담당',assistant:'운반 조수'};
 for(const [role,key] of [['management','anne'],['exhibition','mako'],['assistant','henry']]){const model=clone(kit[key].scene);model.traverse(n=>{if(n.name.startsWith('Weapon_'))n.visible=false;});const actor=createCaptain({scene:model,animations:kit[key].animations});actor.name='crew-'+role;actor.userData.role=role;actor.userData.asset=key;actors[role]=actor;if(role==='management')equipAnneFeedBucket(actor);label(names[role],0,2.7,0,'#263c59',2.1,actor);}
 const group=new T.Group();Object.values(actors).forEach(a=>group.add(a));
 actors.management.position.set(-9.25,.12,9.2);actors.exhibition.position.set(4.5,.12,-4.4);
 const carrier=new T.Group();carrier.name='Living transport tank';const glass=new T.Mesh(new T.BoxGeometry(1.1,.7,.64),new T.MeshStandardMaterial({color:'#92d8e8',transparent:true,opacity:.25,roughness:.6,depthWrite:false}));glass.position.y=.4;carrier.add(glass);const base=new T.Mesh(new T.BoxGeometry(1.16,.08,.7),new T.MeshLambertMaterial({color:'#bd914c'}));base.position.y=.05;carrier.add(base);const cargo=Object.fromEntries((fishAsset.speciesAssets?SPECIES:['fish']).map(kind=>{const fish=createFish(fishAsset,{kind,length:fishLength(kind,'cargo')});fish.position.y=.42;fish.visible=false;carrier.add(fish);return [kind,fish];}));carrier.position.set(0,.8,.68);actors.assistant.add(carrier);
 let lastArea=null,carrying=false,trail=[],lastPoint=null,walkGrace=0,cargoKind=null;
 function update(dt,{area,player,worldPosition,held,climbing=false}){
  actors.management.visible=area==='management';actors.exhibition.visible=area==='exhibition';setCargo(held===true?'fish':held);
  actors.management.userData.roleEquipment.setEnabled(actors.management.visible);actors.management.userData.controller.update(dt,false);actors.exhibition.userData.controller.update(dt,false);
  const a=actors.assistant;a.visible=!climbing&&area!=='underwater';carrier.visible=carrying&&a.visible;
  if(lastArea!==area){lastArea=area;trail=[];lastPoint=null;walkGrace=0;a.position.copy(worldPosition);if(area!=='underwater'){const x=player.x-.9;if(!blocked(area,x,player.z))a.position.x=x;}}
  const before=a.position.clone();
  if(area!=='underwater'&&!climbing){
   if(!lastPoint||Math.hypot(player.x-lastPoint.x,player.z-lastPoint.z)>.015){lastPoint={x:player.x,z:player.z};trail.push({...lastPoint});}
   let remaining=trail.length?Math.hypot(a.position.x-trail[0].x,a.position.z-trail[0].z):0;
   for(let i=1;i<trail.length;i++)remaining+=Math.hypot(trail[i].x-trail[i-1].x,trail[i].z-trail[i-1].z);
   let budget=Math.min(dt*5.0,Math.max(0,remaining-1.5));
   // Consume waypoints in the same frame; reaching one is not an idle frame.
   while(budget>.00001&&trail.length){
    const target=trail[0],dx=target.x-a.position.x,dz=target.z-a.position.z,d=Math.hypot(dx,dz);
    if(d<.0001){trail.shift();continue;}
    const step=Math.min(d,budget),x=a.position.x+dx/d*step,z=a.position.z+dz/d*step;
    if(area==='management'?!canStep(a.position.x,a.position.z,x,z):blocked(area,x,z))break;
    a.position.x=x;a.position.z=z;budget-=step;if(step>=d-.00001)trail.shift();
   }
   const dx=a.position.x-before.x,dz=a.position.z-before.z;
   if(Math.hypot(dx,dz)>.001){walkGrace=.16;const target=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(target-a.rotation.y),Math.cos(target-a.rotation.y));a.rotation.y+=turn*(1-Math.exp(-dt*10));}
   else walkGrace=Math.max(0,walkGrace-dt);
   a.position.y=area==='harbor'?1.06:.12+(area==='management'?surface(a.position.x,a.position.z).height:0);
  }else walkGrace=0;
  a.userData.controller.update(dt,walkGrace>0);if(carrying)cargo[cargoKind]?.userData.update(dt);
 }
 function pick(ray,area){for(const role of ['management','exhibition'])if(role===area&&actors[role].visible&&ray.intersectObject(actors[role],true).some(h=>h.object.isMesh&&h.object.visible))return role;return null;}
 function inspect(){
  const roles={};
  for(const [role,actor] of Object.entries(actors)){let weaponsVisible=0;actor.traverse(n=>{if(n.name.startsWith('Weapon_')&&n.visible)weaponsVisible++;});roles[role]={asset:actor.userData.asset,visible:actor.visible,position:actor.position.toArray(),action:actor.userData.controller.inspect().action,weaponsVisible,...(role==='management'?{equipment:actor.userData.roleEquipment.inspect()}:{})};}
  return {carrying,cargoKind,cargoModel:cargo[cargoKind]?.userData.inspect(),carrierVisible:carrier.visible,trailPoints:trail.length,roles};
 }
 function setCargo(kind){cargoKind=kind||null;carrying=!!kind;Object.entries(cargo).forEach(([k,n])=>n.visible=k===cargoKind);carrier.visible=carrying&&actors.assistant.visible;}
 return {group,actors,update,pick,inspect,setCargo};
}
