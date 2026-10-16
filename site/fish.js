import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
export async function loadFish(){
 const loader=new GLTFLoader();const [butterfly,clown]=await Promise.all([loader.loadAsync('assets/fish/butterfly-source.glb'),loader.loadAsync('assets/fish/clown-source.glb')]);
 return {...butterfly,variants:{stripey:butterfly,chromis:clown}};
}
function recolour(model,variant){
 const bounds=new THREE.Box3();model.traverse(n=>{if(n.isMesh){n.geometry.computeBoundingBox();bounds.union(n.geometry.boundingBox);}});
 const size=bounds.getSize(new THREE.Vector3()),owned=new Set();
 model.traverse(n=>{if(!n.isMesh)return;
  const paint=source=>{
   const m=source.clone();owned.add(m);m.metalness=0;m.roughness=.78;
   if(source.name==='Eyes'||variant==='chromis'&&source.name==='Outline')return m;
   m.color.set(variant==='chromis'?'#a9a69b':'#f1ce67');
   m.onBeforeCompile=shader=>{
    shader.uniforms.patternMin={value:bounds.min};shader.uniforms.patternSize={value:size};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPattern;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPattern=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPattern;uniform vec3 patternMin;uniform vec3 patternSize;');
    const pattern=variant==='chromis'?`vec3 p=(vPattern-patternMin)/patternSize;diffuseColor.rgb*=mix(vec3(1.1),vec3(.55,.58,.61),smoothstep(.3,.9,p.z));float spot=1.-smoothstep(.055,.095,length(vec2(p.y-.34,(p.z-.46)*1.5)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025),spot);`:`vec3 p=(vPattern-patternMin)/patternSize;float phase=p.y*5.2+p.z*.15;float distanceToBand=abs(fract(phase+.5)-.5);float edge=max(fwidth(phase),.006);float band=1.-smoothstep(.14-edge,.14+edge,distanceToBand);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025,.027,.025),band);`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+pattern);
   };
   m.customProgramCacheKey=()=> 'source-colour-only-'+variant+'-1';return m;
  };
  n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material);
 });return owned;
}
export function createFish(asset,{length=1.6,variant='stripey'}={}){
 const source=asset.variants?.[variant]||asset,model=clone(source.scene),owned=variant==='original'?null:recolour(model,variant);
 const mixer=new THREE.AnimationMixer(model),clip=source.animations.find(c=>c.name.endsWith('Swimming_Normal'))||source.animations.find(c=>/swim/i.test(c.name));
 if(!clip)throw Error('Swimming animation is missing');const action=mixer.clipAction(clip);action.play();mixer.update(0);
 let skinnedMeshes=0,vertices=0;model.traverse(n=>{if(n.isMesh){if(n.isSkinnedMesh)skinnedMeshes++;vertices+=n.geometry.attributes.position.count;n.castShadow=true;n.frustumCulled=false;}});
 model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const scaled=new THREE.Group();scaled.scale.setScalar(length/size.z);const offset=new THREE.Group();offset.position.copy(center).multiplyScalar(-1);offset.add(model);scaled.add(offset);const pivot=new THREE.Group();pivot.add(scaled);
 pivot.userData.update=dt=>mixer.update(dt);
 pivot.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);const skeletons=new Set();model.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);});skeletons.forEach(s=>s.dispose());owned?.forEach(m=>m.dispose());};
 pivot.userData.inspect=()=>({variant,source:variant==='chromis'&&asset.variants?'Quaternius ClownFish':'Quaternius ButterflyFish',shape:'source-mesh-colour-only',style:'original-cute-fish',geometryChanged:false,vertices,skinnedMeshes,clip:clip.name,clipTime:action.time,pose:model.getObjectByProperty('isSkinnedMesh',true).skeleton.bones.flatMap(b=>b.quaternion.toArray())});return pivot;
}
