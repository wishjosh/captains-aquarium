import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { clone } from './vendor/SkeletonUtils.js';
import { stripeyParts } from './stripey-geometry.js';
import { chromisParts } from './chromis-geometry.js';
export const loadFish = () => new GLTFLoader().loadAsync('assets/fish/butterfly-source.glb');
function stripeMaterial() {
  const material=new THREE.MeshStandardMaterial({color:'#f5cc48',roughness:.85,metalness:0,flatShading:true,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFishLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFishLocal=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFishLocal;').replace('#include <color_fragment>',`#include <color_fragment>
      float bandPhase=(vFishLocal.z+vFishLocal.y*.26+.0005)/.0057;
      float distanceToBand=abs(fract(bandPhase+.5)-.5);
      float edge=max(fwidth(bandPhase)*.8,.012);
      float stripe=1.-smoothstep(.17-edge,.17+edge,distanceToBand);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025,.031,.029),stripe);
    `);
  };
  material.customProgramCacheKey=()=> 'stripey-cute-detail-v3';
  return material;
}
function chromisMaterial(){
 const m=new THREE.MeshStandardMaterial({color:'#b0a88f',roughness:.8,flatShading:true,side:THREE.DoubleSide});
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHeight=position.z;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vHeight;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(1.12,1.12,1.08),vec3(.48,.52,.53),smoothstep(-.007,.009,vHeight));');};
 m.customProgramCacheKey=()=> 'chromis-v1';return m;
}
function replaceSilhouette(model,variant){
  const original=[];model.traverse(n=>{if(n.isMesh)original.push(n);});
  const template=original.find(n=>n.isSkinnedMesh),parent=template.parent;
  const chromis=variant==='chromis',parts=chromis?chromisParts():stripeyParts(),stripe=chromis?chromisMaterial():stripeMaterial();
  const materials={body:stripe,fins:stripe,tail:new THREE.MeshStandardMaterial({color:'#f9e49c',roughness:.9,side:THREE.DoubleSide}),eyes:new THREE.MeshStandardMaterial({color:'#111b20',roughness:.3}),eyeRims:new THREE.MeshStandardMaterial({color:'#f6da79',roughness:.8,flatShading:true}),glints:new THREE.MeshBasicMaterial({color:'#fff7da'}),finAccents:new THREE.MeshStandardMaterial({color:'#ddad47',roughness:.9,side:THREE.DoubleSide})};
  if(chromis){materials.tail.color.set('#b9b49c');materials.eyeRims.color.set('#cfc7a9');materials.spots=new THREE.MeshStandardMaterial({color:'#252d30',side:THREE.DoubleSide});materials.tailBands=materials.spots;}
  for(const mesh of original)mesh.removeFromParent();
  for(const [name,geometry]of Object.entries(parts)){
    const mesh=new THREE.SkinnedMesh(geometry,materials[name]);mesh.name=(chromis?'Chromis_':'Stripey_')+name;
    mesh.position.copy(template.position);mesh.quaternion.copy(template.quaternion);mesh.scale.copy(template.scale);
    mesh.bind(template.skeleton,template.bindMatrix.clone());parent.add(mesh);
  }
  return new Set(Object.values(materials));
}
export function createFish(asset,{length=1.6,variant='stripey'}={}) {
  const model=clone(asset.scene),owned=['stripey','chromis'].includes(variant)?replaceSilhouette(model,variant):null;
  const mixer=new THREE.AnimationMixer(model);
  const clip=asset.animations.find(c=>c.name.endsWith('Swimming_Normal'));
  if(!clip)throw new Error('Swimming animation is missing');
  const action=mixer.clipAction(clip);action.play();mixer.update(0);
  let skinnedMeshes=0;
  model.traverse(n=>{if(n.isMesh){if(n.isSkinnedMesh)skinnedMeshes++;n.castShadow=true;n.frustumCulled=false;}});
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  const scaled=new THREE.Group();scaled.scale.setScalar(length/size.z);
  const offset=new THREE.Group();offset.position.copy(center).multiplyScalar(-1);offset.add(model);scaled.add(offset);
  const pivot=new THREE.Group();pivot.add(scaled);
  pivot.userData.update=dt=>mixer.update(dt);
  pivot.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);const skeletons=new Set();model.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);if(owned&&n.isMesh)n.geometry.dispose();});skeletons.forEach(s=>s.dispose());owned?.forEach(m=>m.dispose());};
  pivot.userData.inspect=()=>({variant,source:'Quaternius ButterflyFish rig',shape:variant==='stripey'?'stripey-silhouette-v2':variant==='chromis'?'chromis-silhouette-v1':'original',style:variant==='original'?'original':'cute-fish-v3',clip:clip.name,clipTime:action.time,
    skinnedMeshes,pose:model.getObjectByProperty('isSkinnedMesh',true).skeleton.bones.flatMap(b=>b.quaternion.toArray())});
  return pivot;
}
