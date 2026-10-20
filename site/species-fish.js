import * as T from './vendor/three.module.js?v=2026-10-20-anne-bucket-1';
import {clone} from './vendor/SkeletonUtils.js?v=2026-10-20-anne-bucket-1';
import {SPECIES_INFO} from './species.js?v=2026-10-20-anne-bucket-1';
import {speciesMaterial} from './species-appearance.js?v=2026-10-20-anne-bucket-1';
export function prepareSpeciesAsset(asset,bytes,kind){
 asset.fishKind=kind;const dv=new DataView(bytes),jl=dv.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jl))),bin=28+jl;
 // Preserve the source's additional joint weights; normalizeSkinWeights in GLTFLoader otherwise normalizes only set zero.
 asset.scene.traverse(n=>{if(!n.isMesh||!n.geometry.attributes.joints_1)return;const a=asset.parser.associations.get(n),p=json.meshes[a.meshes].primitives[a.primitives],acc=json.accessors[p.attributes.WEIGHTS_0],bv=json.bufferViews[acc.bufferView];if(acc.componentType!==5126)throw Error('Unsupported weight component');const vals=new Float32Array(bytes,bin+(bv.byteOffset||0)+(acc.byteOffset||0),acc.count*4);n.geometry.attributes.skinWeight.array.set(vals);n.geometry.attributes.skinWeight.needsUpdate=true;});
 return asset;
}
export function createSpeciesFish(asset,{kind,length,appearance='white-eye'}){
 const model=clone(asset.scene),mixer=new T.AnimationMixer(model),clip=asset.animations.find(a=>a.name.endsWith('Swimming_Normal')),owned=new Set();
 if(!clip)throw Error('Original swimming clip missing: '+kind);const action=mixer.clipAction(clip);action.play();mixer.update(0);model.updateMatrixWorld(true);
 const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3()),offset=new T.Group(),scaled=new T.Group(),pivot=new T.Group();offset.position.copy(center).negate();offset.add(model);scaled.scale.setScalar(length/size.z);scaled.add(offset);pivot.add(scaled);
 let triangles=0,vertices=0;const spec={id:SPECIES_INFO[kind].model};
 model.traverse(n=>{if(!n.isMesh)return;n.frustumCulled=false;n.castShadow=true;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;vertices+=n.geometry.attributes.position.count;
 const convert=source=>{const m=speciesMaterial(source,n,spec,appearance==='native'?'original':'proposed');if(source.name==='Eyes')m.userData.eyeDesign='white-eye-v1';owned.add(m);return m;};n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);
 });
 pivot.userData.update=dt=>mixer.update(dt);
 pivot.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);const skeletons=new Set();model.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);});skeletons.forEach(s=>s.dispose());owned.forEach(m=>m.dispose());};
 pivot.userData.inspect=()=>({species:kind,source:'Quaternius '+spec.id+' / approved appearance study',geometryChanged:false,sourceRecoloured:false,bodyRecoloured:appearance!=='native',materialOverrides:true,appearance,length,referenceCm:SPECIES_INFO[kind].cm,vertices,triangles,clip:clip.name,clipTime:action.time,clips:asset.animations.map(a=>a.name),extraJointWeights:kind==='moorish',eyeSurfaceDesign:'sclera-large-pupil-small-highlight',pose:model.getObjectByProperty('isSkinnedMesh',true).skeleton.bones.flatMap(b=>b.quaternion.toArray())});
 return pivot;
}
