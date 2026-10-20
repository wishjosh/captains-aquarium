import * as THREE from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {GLTFLoader} from './vendor/GLTFLoader.js?v=2026-10-20-jeju-rov-v1';
const FILES=['wall-tank','column-tank','care-tank','sign','floor'];
export async function loadAquariumKit(){
 const loader=new GLTFLoader(),models=await Promise.all(FILES.map(n=>loader.loadAsync('assets/aquarium/'+n+'.glb')));
 return Object.fromEntries(FILES.map((n,i)=>[n,models[i].scene]));
}
function fit(source,width,height,depth){
 const model=source.clone(true),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const group=new THREE.Group();model.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));group.add(model);group.scale.set(width/size.x,height/size.y,depth/size.z);
 model.traverse(n=>{if(n.isMesh){n.castShadow=!n.material.transparent;n.receiveShadow=true;}});
 return group;
}
export function aquariumModule(kit,shape){
 const fitted=fit(kit[shape==='cylinder'?'column-tank':'wall-tank'],shape==='cylinder'?3.2:3.4,shape==='cylinder'?2.4:2.2,shape==='cylinder'?3.2:2.4);
 const group=new THREE.Group();group.add(fitted);
 // Keep the downloaded geometry intact; hide supplied reef dressing in these
 // instances so the player's own stripey decorations remain readable.
 group.traverse(n=>{if(n.isMesh&&['rock','coral'].includes(n.material.name))n.visible=false;});
 group.updateMatrixWorld(true);
 const glass=new THREE.Box3();
 group.traverse(n=>{if(n.isMesh&&n.material.name==='glass')glass.union(new THREE.Box3().setFromObject(n));});
 const ownedGeometry=[];
 // Open the opaque roof in display instances for the existing overhead camera.
 // Clip only top triangles, using decoded world positions of quantized GLB vertices.
 group.traverse(n=>{
  if(!n.isMesh||!n.visible||n.material.transparent)return;
  const geometry=n.geometry,position=geometry.attributes.position,index=geometry.index,kept=[],point=new THREE.Vector3();
  const count=index?index.count:position.count;
  for(let i=0;i<count;i+=3){
   const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
   if(ids.every(j=>point.fromBufferAttribute(position,j).applyMatrix4(n.matrixWorld).y>glass.max.y-.035))continue;
   kept.push(...ids);
  }
  if(kept.length!==count){n.geometry=geometry.clone();n.geometry.setIndex(kept);ownedGeometry.push(n.geometry);}
 });
 group.userData.ownedGeometry=ownedGeometry;
 return {group,glass};
}
export function aquariumProp(kit,name,{width,height,depth}){
 return fit(kit[name],width,height,depth);
}

export function aquariumFloorGrid(kit,positions){
 const template=fit(kit.floor,2,.06,2),group=new THREE.Group(),matrix=new THREE.Matrix4();
 template.updateMatrixWorld(true);
 template.traverse(n=>{
  if(!n.isMesh)return;
  const batch=new THREE.InstancedMesh(n.geometry,n.material,positions.length);batch.receiveShadow=true;
  positions.forEach(([x,z],i)=>{matrix.makeTranslation(x,.10,z).multiply(n.matrixWorld);batch.setMatrixAt(i,matrix);});group.add(batch);
 });
 return group;
}
