import * as T from './runtime/vendor/three.module.js';
import {reefFloor} from './reef-terrain.mjs?v=2026-11-02-discovery-1';
import {ROCK_BEDS} from './jeju-habitat-layout.mjs?v=2026-11-11-companions-1';
import {SPECIES,FISH_SPECIES,COAST_GROUPS,EncounterBook,BIODIVERSITY_VERSION} from './jeju-species.mjs?v=2026-11-11-companions-1';
import {seaFanGeometry} from './jeju-fauna-geometry.mjs?v=2026-11-11-companions-1';
import {createCoastalSchool} from './coastal-fish-school.mjs?v=2026-11-10-fish-1';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function createJejuBiodiversity({scene,environment,scenery,garden,assets}){
 const group=new T.Group();group.name='Jeju coastal biodiversity';const book=new EncounterBook(),time={value:0},dummy=new T.Object3D(),batches=new Map(),agents=[],staticTargets=[],probe=new T.Raycaster(),heightCache=new Map();
 const rockTargets=[...environment.rocks,...garden.rocks,...scenery.rockMeshes];
 const surface=(x,z)=>{probe.set(V(x,14,z),V(0,-1,0));return probe.intersectObjects(rockTargets,false)[0]?.point.y??reefFloor(x,z);};
 const floor=(x,z)=>{let y=reefFloor(x,z);for(const dx of[0,1])for(const dz of[0,1]){const cx=Math.floor(x)+dx,cz=Math.floor(z)+dz,key=cx+':'+cz;if(!heightCache.has(key))heightCache.set(key,surface(cx,cz));y=Math.max(y,heightCache.get(key));}return y;};
 for(const s of FISH_SPECIES){
  const school=createCoastalSchool(assets.coastalFish,{kind:s.id,count:s.count,time});group.add(school.group);batches.set(s.id,school);
 }
 for(const [gi,g]of COAST_GROUPS.entries())for(let i=0;i<g.count;i++){const species=FISH_SPECIES.find(s=>s.id===g.kind);agents.push({kind:g.kind,group:gi,index:i,phase:i*2.399+gi*.8,scale:species.length*(.88+(i%4)*.065),position:null,previous:null,direction:0});}
 const coralAnchors=[];
 for(const [kind,indices]of[['fan',[9,10,11,12,13,17]],['softcoral',[10,11,12,13,16,17]]]){
  const geometry=kind==='fan'?seaFanGeometry():assets.softForms.scene.children[0].geometry.clone(),material=new T.MeshStandardMaterial({vertexColors:kind==='fan',color:'#ffffff',roughness:.9,side:T.DoubleSide});
  const placements=indices.map((idx,i)=>{const b=ROCK_BEDS[idx],x=b.x+(kind==='fan'?-.5:.5),z=b.z+(i%2?-.45:.45);return{kind,x,y:surface(x,z)-.025,z,scale:kind==='fan'?(i%2?.88:1.15):(.55+(i%3)*.18),angle:i*.9+.3};});
  const mesh=new T.InstancedMesh(geometry,material,placements.length);mesh.name=kind==='fan'?'Jeju fan coral colonies':'Jeju soft coral hillside';mesh.receiveShadow=true;
  placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(kind==='fan'?'#ffffff':['#c69486','#bc8ea8','#cda58a'][i%3]));staticTargets.push({id:kind,position:[p.x,p.y+(kind==='fan'?.65:.4)*p.scale,p.z]});coralAnchors.push(p);});mesh.computeBoundingSphere();group.add(mesh);
 }
 const er=environment.inspect();
 for(const a of er.anchors)staticTargets.push({id:a.kind,position:[a.x,a.y+(a.kind==='kelp'?.95:.55)*a.scale,a.z]});
 for(const a of er.urchinAnchors)staticTargets.push({id:'urchin',position:[a.x,a.y+.14,a.z]});
 for(const p of garden.inspect().coralAnchors)staticTargets.push({id:'softcoral',position:[p[0],p[1]+.35,p[2]]});
 scene.add(group);let age=0,lastNew=null;
 function update(dt,captain=[0,2.5,12],held=null){
  time.value+=dt;const indices={};
  for(const a of agents){
   if(a.captured)continue;
   if(a!==held){const g=COAST_GROUPS[a.group],s=FISH_SPECIES.find(s=>s.id===a.kind),angle=time.value*s.speed+a.phase*.18,spacing=(a.index-(g.count-1)/2)*.34;
   let x=g.center[0]+Math.cos(angle)*g.radius[0]+spacing,z=g.center[1]+Math.sin(angle)*g.radius[1]+Math.sin(a.phase)*.4;
   const dx=x-captain[0],dz=z-captain[2],dist=Math.hypot(dx,dz);if(dist<2){const away=(2-dist)*.6;x+=dx/Math.max(.1,dist)*away;z+=dz/Math.max(.1,dist)*away;}
   const target=[x,floor(x,z)+g.lift+.12*Math.sin(time.value*.6+a.phase),z];if(!a.position)a.position=[...target];a.previous=[...a.position];const blend=dt===0?1:1-Math.exp(-dt*2.8);for(let j=0;j<3;j++)a.position[j]+=(target[j]-a.position[j])*blend;
   // The floor changes at grid boundaries; a second clamp prevents interpolation through a shelf.
   a.position[1]=Math.max(a.position[1],floor(a.position[0],a.position[2])+.37);
   const vx=a.position[0]-a.previous[0],vz=a.position[2]-a.previous[2];if(Math.hypot(vx,vz)>.00001)a.direction=Math.atan2(-vz,vx);else if(dt===0)a.direction=Math.atan2(-Math.cos(angle)*g.radius[1],-Math.sin(angle)*g.radius[0]);}
   dummy.position.fromArray(a.position);dummy.rotation.set(0,a.direction+Math.PI/2,Math.sin(time.value*.5+a.phase)*.035);dummy.scale.setScalar(a.scale);dummy.updateMatrix();const i=indices[a.kind]||0;batches.get(a.kind).setMatrixAt(i,dummy.matrix);indices[a.kind]=i+1;
  }
  for(const [kind,batch] of batches){
   for(const mesh of batch.meshes)mesh.count=indices[kind]||0;
   batch.commit();
  }
 }
 const sightRay=new T.Raycaster(),clip=V(),delta=V();
 function visible(target,camera,position){
  if(Math.hypot(...target.map((v,i)=>v-position[i]))>6.5)return false;
  clip.fromArray(target).project(camera);if(clip.z< -1||clip.z>1||Math.abs(clip.x)>.84||Math.abs(clip.y)>.68)return false;
  delta.fromArray(target).sub(camera.position);sightRay.set(camera.position,delta.clone().normalize());sightRay.near=.06;sightRay.far=Math.max(.06,delta.length()-.24);
  return !sightRay.intersectObjects(scenery.solids,false).some(h=>h.distance<delta.length()-.24);
 }
 function observe(dt,{camera,position,chromis=false,puffer=false,active=true}){
  if(!active)return;age+=dt;if(age<.32)return;const elapsed=age;age=0;
  if(chromis)book.mark('chromis');if(puffer)book.mark('puffer');
  for(const s of SPECIES){if(book.seen.has(s.id)||['chromis','puffer'].includes(s.id))continue;
   const targets=[...agents.filter(a=>a.kind===s.id&&!a.captured).map(a=>a.position),...staticTargets.filter(a=>a.id===s.id).map(a=>a.position)].sort((a,b)=>Math.hypot(...a.map((v,i)=>v-position[i]))-Math.hypot(...b.map((v,i)=>v-position[i])));
   const seen=targets.slice(0,3).some(p=>visible(p,camera,position));if(book.observe(s.id,seen,elapsed))lastNew=s.id;
  }
 }
 update(0);let triangles=0;group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
 return{group,book,agents,coralAnchors,update,observe,takeNew(){const id=lastNew;lastNew=null;return id?SPECIES.find(s=>s.id===id):null;},inspect(){return{version:BIODIVERSITY_VERSION,ambientFish:agents.length,fishKinds:FISH_SPECIES.map(s=>({id:s.id,count:s.count})),fanColonies:6,additionalSoftCorals:6,additionalTriangles:triangles,additionalDrawBatches:[...batches.values()].reduce((n,b)=>n+b.report.batches,2),additionalTextureBytes:0,runtimeAnimationTextureBytes:[...batches.values()].reduce((n,b)=>n+b.report.textureBytes,0),art:[...batches.values()].map(b=>b.report),book:book.report(),fish:agents.map(a=>({kind:a.kind,captured:!!a.captured,position:[...a.position],floor:floor(a.position[0],a.position[2])})),coralAnchors};}};
}
