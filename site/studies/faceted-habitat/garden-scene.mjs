import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {reefFloor} from './reef-terrain.mjs?v=2026-11-02-discovery-1';
import {GARDEN_PATH,GARDEN_WALLS,GardenDiscovery} from './garden-discovery.mjs?v=2026-11-03-garden-1';
// Reuse the authored rock shapes. Only the target is an explicitly temporary mesh.
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
 const proxy=new T.Group();proxy.name='Temporary garden creature';
 const body=new T.Mesh(new T.IcosahedronGeometry(.25,1),new T.MeshStandardMaterial({color:'#dfb86c',roughness:.8,flatShading:true}));body.scale.set(1,.9,1.25);proxy.add(body);
 const finMaterial=new T.MeshStandardMaterial({color:'#b58352',roughness:1,side:T.DoubleSide});
 const fins=[];for(const side of [-1,1]){const fin=new T.Mesh(new T.ConeGeometry(.1,.24,3),finMaterial);fin.rotation.z=side*Math.PI/2;fin.position.set(side*.29,0,-.02);proxy.add(fin);fins.push(fin);}
 for(const x of [-.12,.12]){const eye=new T.Mesh(new T.SphereGeometry(.041,7,5),new T.MeshStandardMaterial({color:'#242f32',roughness:.7}));eye.position.set(x,.085,.255);proxy.add(eye);}group.add(proxy);
 const model=new GardenDiscovery();proxy.position.fromArray(model.position);group.updateMatrixWorld(true);
 const sightRay=new T.Raycaster(),clip=new T.Vector3(),delta=new T.Vector3();
 function visible(camera,occluders=[]){clip.copy(proxy.position).project(camera);if(clip.z<=-1||clip.z>=1||Math.abs(clip.x)>.88||Math.abs(clip.y)>.72)return false;delta.copy(proxy.position).sub(camera.position);sightRay.set(camera.position,delta.clone().normalize());sightRay.near=.05;sightRay.far=Math.max(.05,delta.length()-.2);return !sightRay.intersectObjects([...rocks,...occluders],true).length;}
 return{group,rocks,colliders,proxy,model,visible,
  reset(){model.reset();proxy.position.fromArray(model.position);proxy.rotation.set(0,0,0);group.updateMatrixWorld(true);},
  update(dt,world,camera,occluders){const canSee=visible(camera,occluders);model.step(dt,{position:world.position,velocity:world.velocity,visible:canSee});proxy.position.fromArray(model.position);const v=model.velocity;if(Math.hypot(v[0],v[2])>.06)proxy.rotation.y=T.MathUtils.lerp(proxy.rotation.y,Math.atan2(v[0],v[2]),1-Math.exp(-dt*5));else proxy.rotation.y+=Math.atan2(Math.sin(Math.atan2(world.position[0]-proxy.position.x,world.position[2]-proxy.position.z)-proxy.rotation.y),Math.cos(Math.atan2(world.position[0]-proxy.position.x,world.position[2]-proxy.position.z)-proxy.rotation.y))*(1-Math.exp(-dt*2));fins.forEach((f,i)=>f.rotation.y=Math.sin(model.time*9+i)*.3);group.updateMatrixWorld(true);},
  inspect(){return{...model.report(),rocks:rocks.length,colliders:colliders.length,proxy:'temporary-faceted-body',routePoints:GARDEN_PATH};}
 };
}
