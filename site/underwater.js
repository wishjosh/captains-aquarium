import * as T from './vendor/three.module.js?v=2026-10-17-clownfish-lighting-c-1';
import {createFish} from './fish.js?v=2026-10-17-clownfish-lighting-c-1';
export const DIVE_START={x:0,y:2.8,z:8,yaw:0,pitch:0};
export const REEF_ROCKS=[[-6,2,1.7],[6,0,2.1],[-8,-7,2],[3,-9,1.7],[9,-11,1.8],[-3,-15,2.1],[-10,8,2],[10,8,1.8]];
export function swimBlocked(x,y,z){return ![x,y,z].every(Number.isFinite)||Math.abs(x)>13||z < -19||z>11||y<.85||y>6.3||REEF_ROCKS.some(([rx,rz,r])=>y<r+0.5&&Math.hypot(x-rx,z-rz)<r+.35);}
export function swimStep(p,x,z,dt){
 const n=Math.hypot(x,z);if(n<.01)return false;
 const strafe=x/n,forward=-z/n,speed=3.6*Math.min(dt,.05),cp=Math.cos(p.pitch);
 const delta={x:(strafe*Math.cos(p.yaw)+forward*Math.sin(p.yaw)*cp)*speed,y:forward*Math.sin(p.pitch)*speed,z:(strafe*Math.sin(p.yaw)-forward*Math.cos(p.yaw)*cp)*speed};
 let moved=false;for(const k of ['x','y','z']){const next={...p,[k]:p[k]+delta[k]};if(!swimBlocked(next.x,next.y,next.z)){p[k]=next[k];moved ||= Math.abs(delta[k])>1e-5;}}return moved;
}
export function createUnderwater(fishAsset,assets){
 const group=new T.Group(),creatures={},kelp=[];
 const mat=(color,extra={})=>new T.MeshLambertMaterial({color,...extra});
 const sand=new T.PlaneGeometry(50,60,48,52),sandColors=[];for(let i=0;i<sand.attributes.position.count;i++){const x=sand.attributes.position.getX(i),z=sand.attributes.position.getY(i),c=new T.Color('#b7b38b');c.multiplyScalar(.84+.16*Math.sin(x*1.6+Math.sin(z*.7))*Math.sin(z*1.9));sandColors.push(c.r,c.g,c.b);}sand.setAttribute('color',new T.Float32BufferAttribute(sandColors,3));
 const floor=new T.Mesh(sand,mat('#ffffff',{vertexColors:true}));floor.rotation.x=-Math.PI/2;floor.position.z=-4;group.add(floor);
 for(const [i,[x,z,r]]of REEF_ROCKS.entries()){
  const model=(i%2?assets.rock:assets.rockB).scene.clone(true),b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),scale=r*2/Math.max(size.x,size.z);model.scale.multiplyScalar(scale);model.position.set(x-(b.min.x+b.max.x)*scale/2,-b.min.y*scale,z-(b.min.z+b.max.z)*scale/2);model.traverse(n=>{if(n.isMesh){const stone=m=>{const c=m.clone();c.color.set('#73847e');c.metalness=0;c.roughness=1;return c;};n.material=Array.isArray(n.material)?n.material.map(stone):stone(n.material);n.castShadow=false;}});group.add(model);
 }
 // Instanced ribbons: authored here, no external texture or heavy transparency layers.
 const leaf=new T.PlaneGeometry(.26,1,1,6);leaf.translate(0,.5,0);
 const pos=leaf.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setX(i,pos.getX(i)*(1-y*.8)+Math.sin(y*5)*.11);pos.setZ(i,Math.sin(y*4)*.08);}leaf.computeVertexNormals();
 const leaves=new T.InstancedMesh(leaf,mat('#50784a',{side:T.DoubleSide}),144),dummy=new T.Object3D();group.add(leaves);
 for(let i=0;i<144;i++){const cluster=Math.floor(i/6),angle=cluster*2.399,x=Math.cos(angle)*(4+cluster%7),z=-4+Math.sin(angle)*(5+cluster%9);kelp.push({x:x+(i%3)*.22,z:z+(i%2)*.2,h:1+(i%7)*.24,a:i*1.7});}
 const surface=new T.Mesh(new T.PlaneGeometry(55,60),mat('#64becd',{side:T.DoubleSide,transparent:true,opacity:.28,depthWrite:false}));surface.rotation.x=Math.PI/2;surface.position.set(0,7,-4);group.add(surface);
 const rope=new T.Mesh(new T.CylinderGeometry(.05,.05,6,8),mat('#ebcd78'));rope.position.set(0,3.2,9);group.add(rope);
 const ring=new T.Mesh(new T.TorusGeometry(.8,.12,8,24),mat('#d34b38'));ring.position.set(0,3.4,9);group.add(ring);
 for(const kind of ['fish']){
  const model=createFish(fishAsset,{length:1.5});
  creatures[kind]=model;group.add(model);
 }
 const motes=new T.BufferGeometry(),xyz=[];for(let i=0;i<70;i++)xyz.push(Math.sin(i*7.1)*13,.6+(i%13)*.43,-17+(i%29));motes.setAttribute('position',new T.Float32BufferAttribute(xyz,3));group.add(new T.Points(motes,new T.PointsMaterial({color:'#b9e6de',size:.045,transparent:true,opacity:.48})));
 const forward=new T.Vector3(),to=new T.Vector3();
 function update(dt,time,p,reduced=false){
  const t=reduced?0:time;
  const positions={fish:[Math.sin(t*.38)*1.1,2.7+Math.sin(t*.5)*.15,1+Math.cos(t*.38)*.4]};
  for(const [kind,model]of Object.entries(creatures)){model.visible=!p.bag&&!p.admitted;model.position.set(...positions[kind]);model.userData.update(reduced?0:dt);model.rotation.y=Math.PI/2+Math.sin(t*.4)*.5;}
  kelp.forEach((k,i)=>{dummy.position.set(k.x,.04,k.z);dummy.rotation.set(Math.sin(t*.85+k.a)*.09,k.a,Math.sin(t+k.a)*.12);dummy.scale.set(1,k.h,1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);});leaves.instanceMatrix.needsUpdate=true;
 }
 function target(p){
  if(Math.hypot(p.x,p.y-2.8,p.z-9)<2.4)return 'return';
  forward.set(Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch));let best=null,dist=3.2;
  for(const [k,n]of Object.entries(creatures)){to.copy(n.position).sub(new T.Vector3(p.x,p.y,p.z));const d=to.length();if(!n.visible||d>=dist||to.normalize().dot(forward)<.4)continue;
   let occluded=false;for(let i=1;i<10;i++){const q=new T.Vector3(p.x,p.y,p.z).lerp(n.position,i/10);if(swimBlocked(q.x,q.y,q.z)){occluded=true;break;}}if(!occluded){best=k;dist=d;}}
  return best;
 }
 update(0,0,{bag:false,admitted:false});
 return {group,creatures,update,target,inspect:()=>({ambient:0,seaweed:144,rocks:REEF_ROCKS.length,creatures:Object.fromEntries(Object.entries(creatures).map(([k,n])=>[k,{...n.position}]))})};
}
