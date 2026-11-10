import {createGardenResident} from './garden-resident.mjs?v=2026-11-03-garden-2';
import {createMotion,clayMaterial,depthMaterial} from './body-material.mjs?v=2026-10-31-touch-4';
import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {reefFloor} from './reef-terrain.mjs?v=2026-11-02-discovery-1';
import {GARDEN_PATH,GARDEN_WALLS,GardenDiscovery} from './garden-discovery.mjs?v=2026-11-03-garden-2';
// Reuse authored rocks, soft coral and the existing animated CC0 puffer.
export function createGardenTrial(assets){
 const group=new T.Group();group.name='Small garden discovery trial';
 const rocks=[],colliders=[],templates=new Map();assets.rockModules.scene.traverse(o=>{if(o.isMesh)templates.set(o.name,o.geometry);});
 const material=new T.MeshStandardMaterial({color:'#52666a',roughness:.96,flatShading:true});
 for(const wall of GARDEN_WALLS){
  const geo=templates.get('rocks-'+wall.part).clone();geo.computeBoundingBox();const size=geo.boundingBox.getSize(new T.Vector3()),center=geo.boundingBox.getCenter(new T.Vector3());
  geo.translate(-center.x,-geo.boundingBox.min.y,-center.z);geo.scale(wall.size[0]/size.x,wall.size[1]/size.y,wall.size[2]/size.z);geo.computeBoundingBox();geo.computeBoundingSphere();
  const mesh=new T.Mesh(geo,material);mesh.name='Garden rock '+wall.id;mesh.position.set(wall.center[0],reefFloor(...wall.center)-.12,wall.center[1]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);rocks.push(mesh);
  // Sample actual cross-sections rather than filling the rock's bounding rectangle.
 }
 group.updateMatrixWorld(true);
 const probe=new T.Raycaster();for(const rock of rocks){const b=new T.Box3().setFromObject(rock);for(let x=b.min.x+.2;x<b.max.x;x+=.4)for(let z=b.min.z+.2;z<b.max.z;z+=.4){probe.set(new T.Vector3(x,12,z),new T.Vector3(0,-1,0));const hit=probe.intersectObject(rock,false)[0];if(hit)colliders.push([x,z,.22,hit.point.y]);}}
 const water=createMotion();water.strength.value=.6;
 const coralGeometry=assets.softForms.scene.children[0].geometry.clone();
 const colonies=[{x:-2.8,z:-17.3,h:.52},{x:-1.8,z:-17.4,h:.36},{x:-2.3,z:-17.1,h:.25},{x:1.3,z:-17.3,h:.65},{x:2.1,z:-17.1,h:.38},{x:2.9,z:-14.8,h:.45},{x:-3.8,z:-11.8,h:.28}];
 coralGeometry.setAttribute('colonyPhase',new T.InstancedBufferAttribute(new Float32Array(colonies.map((c,i)=>i*.31)),1));
 const corals=new T.InstancedMesh(coralGeometry,clayMaterial(true,water,{color:'#ffffff'}),colonies.length),dummy=new T.Object3D(),palette=['#c98983','#c3a491','#ad99b8'];
 corals.name='Small garden soft coral';const anchors=[];
 colonies.forEach((c,i)=>{probe.set(new T.Vector3(c.x,12,c.z),new T.Vector3(0,-1,0));const hit=probe.intersectObjects(rocks,false)[0];if(!hit)throw Error('Garden coral misses rock '+i);dummy.position.set(c.x,hit.point.y-.03,c.z);dummy.rotation.y=i*1.3;dummy.scale.setScalar(c.h);dummy.updateMatrix();corals.setMatrixAt(i,dummy.matrix);corals.setColorAt(i,new T.Color(palette[i%3]));anchors.push(dummy.position.toArray());});
 corals.instanceMatrix.needsUpdate=true;corals.castShadow=corals.receiveShadow=true;corals.computeBoundingSphere();corals.boundingSphere.radius+=.1;corals.customDepthMaterial=depthMaterial(true,water);group.add(corals);
 const resident=createGardenResident(assets.puffer),proxy=resident.root;group.add(proxy);
 const model=new GardenDiscovery();proxy.position.fromArray(model.position);group.updateMatrixWorld(true);
 const sightRay=new T.Raycaster(),clip=new T.Vector3(),delta=new T.Vector3();
 function visible(camera,occluders=[]){clip.copy(proxy.position).project(camera);if(clip.z<=-1||clip.z>=1||Math.abs(clip.x)>.88||Math.abs(clip.y)>.72)return false;delta.copy(proxy.position).sub(camera.position);sightRay.set(camera.position,delta.clone().normalize());sightRay.near=.05;sightRay.far=Math.max(.05,delta.length()-.2);return !sightRay.intersectObjects([...rocks,corals,...occluders],true).length;}
 return{group,rocks,occluders:[...rocks,corals],colliders,proxy,model,visible,
  reset(){proxy.visible=true;model.reset();resident.reset();water.time.value=0;proxy.position.fromArray(model.position);group.updateMatrixWorld(true);},
  update(dt,world,camera,occluders,{held=false,captured=false}={}){proxy.visible=!captured;if(captured){water.time.value+=dt;return;}const canSee=visible(camera,occluders);if(!held)model.step(dt,{position:world.position,velocity:world.velocity,visible:canSee});proxy.position.fromArray(model.position);water.time.value+=dt;resident.update(dt,{velocity:model.velocity,phase:model.phase,gesture:model.gesture,captain:world.position});group.updateMatrixWorld(true);},
  inspect(){return{...model.report(),rocks:rocks.length,colliders:colliders.length,proxy:'animated-puffer',resident:resident.inspect(),corals:colonies.length,coralAnchors:anchors,routePoints:GARDEN_PATH};}
 };
}
