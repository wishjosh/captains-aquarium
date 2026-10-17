import * as T from './vendor/three.module.js?v=2026-10-17-expedition-crew-1';
import {GLTFLoader} from './vendor/GLTFLoader.js?v=2026-10-17-expedition-crew-1';
import {clone} from './vendor/SkeletonUtils.js?v=2026-10-17-expedition-crew-1';
export const loadFish=()=>new GLTFLoader().loadAsync('assets/fish/clownfish-native.glb');
// Source geometry, colours, skin weights and clips stay shared and unmodified.
// Approved white-eye design affects only private eye materials; native and B remain available for comparisons.
const WHITE_EYE_STYLE=Object.freeze({pupilAngle:1.02,forward:2.0,sparkleAngle:.075});
function configureWhiteEye(material){
 const style=WHITE_EYE_STYLE;
 material.roughness=.22;material.envMapIntensity=.035;
 material.userData.eyeDesign='white-eye-v1';
 material.customProgramCacheKey=()=>`white-eye-v1-${style.pupilAngle}-${style.forward}`;
 // Bind this renderer's environment without touching other scene lighting or models.
 material.onBeforeRender=(_renderer,scene)=>{const environment=scene.environment||null;if(material.envMap!==environment){material.envMap=environment;material.needsUpdate=true;}};
 material.onBeforeCompile=shader=>{shader.uniforms.eyePupilAngle={value:style.pupilAngle};shader.uniforms.eyeForward={value:style.forward};shader.uniforms.eyeSparkleAngle={value:style.sparkleAngle};
shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEyeRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEyeRest = position;');
shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vEyeRest;\nuniform float eyePupilAngle;\nuniform float eyeForward;\nuniform float eyeSparkleAngle;').replace('#include <color_fragment>',`#include <color_fragment>
 float eyeSide = vEyeRest.x >= 0.0 ? 1.0 : -1.0;
 vec3 eyeCentre = vec3(eyeSide * 0.853449, 0.2685904, 1.1939076);
 vec3 surfaceDir = normalize((vEyeRest - eyeCentre) / vec3(0.3624862, 0.4281019, 0.3441399));
 vec3 gazeDir = normalize(vec3(eyeSide, 0.025, eyeForward));
 float edge = cos(eyePupilAngle);
 float pupil = smoothstep(edge-0.012, edge+0.012, dot(surfaceDir,gazeDir));
 vec3 sparkleDir = normalize(gazeDir + vec3(0.0,0.30,0.15));
 float sparkle = smoothstep(cos(eyeSparkleAngle+0.018),cos(eyeSparkleAngle),dot(surfaceDir,sparkleDir)) * pupil;
 diffuseColor.rgb = mix(vec3(0.80,0.815,0.80),vec3(0.0035,0.0040,0.0050),pupil);
 diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.97),sparkle);
`);};
 return material;
}
export function createFish(asset,{length=1.6,appearance='white-eye'}={}){
 const model=clone(asset.scene),mixer=new T.AnimationMixer(model),ownedMaterials=new Set();
 const clip=asset.animations.find(c=>c.name.endsWith('Swimming_Normal'));
 if(!clip)throw Error('Official swimming clip missing');
 const action=mixer.clipAction(clip);action.play();mixer.update(0);model.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),offset=new T.Group(),scaled=new T.Group(),pivot=new T.Group();
 offset.position.copy(center).multiplyScalar(-1);offset.add(model);scaled.scale.setScalar(length/size.z);scaled.add(offset);pivot.add(scaled);
 let vertices=0,triangles=0;
 model.traverse(n=>{if(!n.isMesh)return;n.frustumCulled=false;n.castShadow=true;vertices+=n.geometry.attributes.position.count;triangles+=(n.geometry.index?n.geometry.index.count:n.geometry.attributes.position.count)/3;
  if(appearance==='B'||appearance==='white-eye'){const original=n.material,materials=(Array.isArray(original)?original:[original]).map(m=>{if(m.name!=='Eyes')return m;const display=m.clone();if(appearance==='white-eye')configureWhiteEye(display);else display.roughness=.16;ownedMaterials.add(display);return display;});n.material=Array.isArray(original)?materials:materials[0];}
 });
 pivot.userData.update=dt=>mixer.update(dt);
 pivot.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);const skeletons=new Set();model.traverse(n=>{if(n.isSkinnedMesh)skeletons.add(n.skeleton);});skeletons.forEach(s=>s.dispose());ownedMaterials.forEach(m=>m.dispose());};
 pivot.userData.inspect=()=>({species:'clownfish',source:'Quaternius official Clownfish.blend / unmodified Blender glTF export',geometryChanged:false,recoloured:false,vertices,triangles,clip:clip.name,clipTime:action.time,appearance,materialOverrides:appearance==='B'||appearance==='white-eye',bodyRecoloured:false,sourceRecoloured:false,eyeSurfaceDesign:appearance==='white-eye'?'sclera-large-pupil-small-highlight':null,displayEyeRoughness:appearance==='white-eye'?.22:appearance==='B'?.16:.5,eyeReflection:appearance==='white-eye'?'display-only sclera, large pupils and small highlights; original geometry and material preserved':appearance==='B'?'B scene environment; private eye roughness .16; no painted pupil or reflection':'native material; no eye-specific processing',pose:model.getObjectByProperty('isSkinnedMesh',true).skeleton.bones.flatMap(b=>b.quaternion.toArray())});
 return pivot;
}
