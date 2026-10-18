import * as T from './vendor/three.module.js?v=2026-10-18-underwater-four-fish-1';
function addEightSkin(shader){
 shader.vertexShader=shader.vertexShader.replace('#include <skinning_pars_vertex>','#include <skinning_pars_vertex>\nattribute vec4 joints_1; attribute vec4 weights_1;');
 const extra='getBoneMatrix(joints_1.x)*weights_1.x+getBoneMatrix(joints_1.y)*weights_1.y+getBoneMatrix(joints_1.z)*weights_1.z+getBoneMatrix(joints_1.w)*weights_1.w';
 shader.vertexShader=shader.vertexShader.replace('#include <skinnormal_vertex>',`#ifdef USE_SKINNING
 mat4 skinMatrix=boneMatX*skinWeight.x+boneMatY*skinWeight.y+boneMatZ*skinWeight.z+boneMatW*skinWeight.w+${extra};
 skinMatrix=bindMatrixInverse*skinMatrix*bindMatrix;objectNormal=vec4(skinMatrix*vec4(objectNormal,0.0)).xyz;
 #ifdef USE_TANGENT
 objectTangent=vec4(skinMatrix*vec4(objectTangent,0.0)).xyz;
 #endif
 #endif`);
 shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#ifdef USE_SKINNING
 vec4 skinVertex=bindMatrix*vec4(transformed,1.0);vec4 skinned=boneMatX*skinVertex*skinWeight.x+boneMatY*skinVertex*skinWeight.y+boneMatZ*skinVertex*skinWeight.z+boneMatW*skinVertex*skinWeight.w;
 skinned+=(${extra})*skinVertex;transformed=(bindMatrixInverse*skinned).xyz;
 #endif`);
}
function eyeParameters(geometry){
 const p=geometry.attributes.position,boxes=[new T.Box3(),new T.Box3()];for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);boxes[v.x<0?0:1].expandByPoint(v);}return boxes.map(b=>({c:b.getCenter(new T.Vector3()),r:b.getSize(new T.Vector3()).multiplyScalar(.5)}));
}
export function speciesMaterial(source,mesh,spec,variant){
 const m=source.clone(),extra=!!mesh.geometry.attributes.joints_1,isEye=source.name==='Eyes',ep=isEye?eyeParameters(mesh.geometry):null;
 const key=source.name;
 m.opacity=1;m.alphaTest=0;m.transparent=false;
 if(variant==='proposed'&&!isEye){if(spec.id==='Puffer'){if(key==='Pufferfish_Main')m.color.set('#a2956b');if(key==='Pufferfish_Light')m.color.set('#efdfb1');if(key==='Puffefish_Black')m.color.set('#343a29');}if(spec.id==='Cowfish'){if(key==='Cowfish_Main')m.color.set('#e5bb45');if(key==='Cowfish_Light')m.color.set('#f4db91');if(key==='Cowfish_Dark')m.color.set('#725a2f');}if(spec.id==='MoorishIdol'){if(key==='MoorishIdol_Main')m.color.set('#fff0cf');if(key==='MoorishIdol_Dark')m.color.set('#26282a');}}
 if(isEye)m.roughness=.22;m.envMapIntensity=isEye?.035:1;
 m.customProgramCacheKey=()=>['jeju-preview',spec.id,key,variant,extra].join('-');
 m.onBeforeCompile=shader=>{
  if(extra)addEightSkin(shader);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRest=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRest;\nfloat cellHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}');
  let paint='';
  if(isEye){shader.uniforms.eyeC0={value:ep[0].c};shader.uniforms.eyeC1={value:ep[1].c};shader.uniforms.eyeR0={value:ep[0].r};shader.uniforms.eyeR1={value:ep[1].r};shader.fragmentShader=shader.fragmentShader.replace('varying vec3 vRest;','varying vec3 vRest;\nuniform vec3 eyeC0,eyeC1,eyeR0,eyeR1;');paint=`float side=vRest.x<0.0?-1.0:1.0;vec3 ec=side<0.0?eyeC0:eyeC1;vec3 er=side<0.0?eyeR0:eyeR1;vec3 sd=normalize((vRest-ec)/er);vec3 gaze=normalize(vec3(side,.025,2.0));float pupil=smoothstep(cos(1.02)-.012,cos(1.02)+.012,dot(sd,gaze));float sparkle=smoothstep(cos(.093),cos(.075),dot(sd,normalize(gaze+vec3(0,.30,.15))))*pupil;diffuseColor.rgb=mix(vec3(.80,.815,.80),vec3(.0035,.004,.005),pupil);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.97),sparkle);`;}
  else if(variant==='proposed'&&spec.id==='Puffer'&&key==='Pufferfish_Main')paint=`vec2 q=vRest.zy*vec2(2.7,3.3);vec2 cell=floor(q);vec2 local=fract(q)-vec2(.5);float dotMask=(1.0-smoothstep(.12,.18,length(local)))*step(.35,cellHash(cell));float blotch=1.0-smoothstep(.3,.7,abs(sin(vRest.z*2.4+vRest.y*.8)));blotch*=smoothstep(-.05,.9,vRest.y);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.045,.055,.03),max(dotMask*.78,blotch*.62));`;
  else if(variant==='proposed'&&spec.id==='Cowfish'&&key==='Cowfish_Main')paint=`vec2 q=vRest.zy*vec2(2.2,3.0);vec2 cell=floor(q);vec2 shift=vec2(cellHash(cell),cellHash(cell+7.0))*.22;float spots=1.0-smoothstep(.09,.15,length(fract(q)-.5-shift));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.82,.74),spots*.82);`;
  else if(variant==='proposed'&&spec.id==='MoorishIdol'&&key==='MoorishIdol_Main')paint=`float gold=smoothstep(.55,1.25,vRest.z)*smoothstep(-.1,.75,vRest.y);gold=max(gold,smoothstep(.6,1.25,vRest.y)*.55);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.90,.60,.10),gold*.75);`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+paint);
 };
 return m;
}
