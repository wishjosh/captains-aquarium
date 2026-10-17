import * as T from './vendor/three.module.js?v=2026-10-17-expedition-crew-1';
import {clone} from './vendor/SkeletonUtils.js?v=2026-10-17-expedition-crew-1';
import {createCaptain} from './pirate.js?v=2026-10-17-expedition-crew-1';
import {createFish} from './fish.js?v=2026-10-17-expedition-crew-1';
export function createCrew(kit,fishAsset,{label,blocked,canStep,surface}){
 const actors={},names={management:'사육 담당',exhibition:'전시 담당',assistant:'운반 조수'};
 for(const [role,key] of [['management','anne'],['exhibition','mako'],['assistant','henry']]){const model=clone(kit[key].scene);model.traverse(n=>{if(n.name.startsWith('Weapon_'))n.visible=false;});const actor=createCaptain({scene:model,animations:kit[key].animations});actor.name='crew-'+role;actor.userData.role=role;actor.userData.asset=key;actors[role]=actor;label(names[role],0,2.7,0,'#263c59',2.1,actor);}
 const group=new T.Group();Object.values(actors).forEach(a=>group.add(a));
 actors.management.position.set(-9.25,.12,9.2);actors.exhibition.position.set(4.5,.12,-4.4);
 const carrier=new T.Group();carrier.name='Living transport tank';const glass=new T.Mesh(new T.BoxGeometry(1.1,.7,.64),new T.MeshStandardMaterial({color:'#92d8e8',transparent:true,opacity:.25,roughness:.6,depthWrite:false}));glass.position.y=.4;carrier.add(glass);const base=new T.Mesh(new T.BoxGeometry(1.16,.08,.7),new T.MeshLambertMaterial({color:'#bd914c'}));base.position.y=.05;carrier.add(base);const fish=createFish(fishAsset,{length:.65});fish.position.y=.42;carrier.add(fish);carrier.position.set(0,.8,.68);actors.assistant.add(carrier);
 let lastArea=null,carrying=false,trail=[],lastPoint=null;
 function update(dt,{area,player,worldPosition,held,climbing=false}){
  actors.management.visible=area==='management';actors.exhibition.visible=area==='exhibition';carrying=!!held;carrier.visible=carrying;
  actors.management.userData.controller.update(dt,false);actors.exhibition.userData.controller.update(dt,false);
  const a=actors.assistant;a.visible=!climbing&&area!=='underwater';carrier.visible=carrying&&a.visible;
  if(lastArea!==area){lastArea=area;trail=[];lastPoint=null;a.position.copy(worldPosition);if(area!=='underwater'){const x=player.x-.9;if(!blocked(area,x,player.z))a.position.x=x;}}
  let walking=false;
  if(area==='underwater'){a.position.copy(worldPosition).add(new T.Vector3(1.65,-1.55,-1.65));a.rotation.y=0;walking=carrying;}
  else{
   if(!lastPoint||Math.hypot(player.x-lastPoint.x,player.z-lastPoint.z)>.22){lastPoint={x:player.x,z:player.z};trail.push({...lastPoint});}
   let length=0;for(let i=1;i<trail.length;i++)length+=Math.hypot(trail[i].x-trail[i-1].x,trail[i].z-trail[i-1].z);
   if(length>1.5&&trail.length){const target=trail[0],dx=target.x-a.position.x,dz=target.z-a.position.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*5.8);if(d<.15)trail.shift();else{const x=a.position.x+dx/d*step,z=a.position.z+dz/d*step;if(area==='management'?canStep(a.position.x,a.position.z,x,z):!blocked(area,x,z)){a.position.x=x;a.position.z=z;a.rotation.y=Math.atan2(dx,dz);walking=true;}}}
   a.position.y=area==='harbor'?1.06:.12+(area==='management'?surface(a.position.x,a.position.z).height:0);
  }
  a.userData.controller.update(dt,walking);if(carrying)fish.userData.update(dt);
 }
 function pick(ray,area){for(const role of ['management','exhibition'])if(role===area&&actors[role].visible&&ray.intersectObject(actors[role],true).some(h=>h.object.isMesh&&h.object.visible))return role;return null;}
 function inspect(){
  const roles={};
  for(const [role,actor] of Object.entries(actors)){let weaponsVisible=0;actor.traverse(n=>{if(n.name.startsWith('Weapon_')&&n.visible)weaponsVisible++;});roles[role]={asset:actor.userData.asset,visible:actor.visible,position:actor.position.toArray(),action:actor.userData.controller.inspect().action,weaponsVisible};}
  return {carrying,carrierVisible:carrier.visible,trailPoints:trail.length,roles};
 }
 function setCargo(kind){carrying=!!kind;carrier.visible=carrying&&actors.assistant.visible;}
 return {group,actors,update,pick,inspect,setCargo};
}
