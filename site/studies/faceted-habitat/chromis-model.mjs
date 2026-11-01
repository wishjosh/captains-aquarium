import {magicPulse} from './magic-glow.mjs';
import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {chromisShape,CHROMIS} from './chromis-shape.mjs?v=2026-11-01-extension-1';
let shared;
export function createChromis({length=CHROMIS.length}={}){
 if(!shared){const data=chromisShape(),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('color',new T.Float32BufferAttribute(data.color,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.03;shared={g,data};}
 const time={value:0},motion={value:0},clay={value:0},magic={value:0};
 const bend=`float tailWeight=smoothstep(.02,.62,-transformed.z);transformed.x+=sin(chromisTime*4.0+transformed.z*6.0)*.038*tailWeight*chromisMotion;`;
 const patch=s=>{Object.assign(s.uniforms,{chromisTime:time,chromisMotion:motion,chromisClay:clay,chromisMagic:magic});s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float chromisTime,chromisMotion;').replace('#include <begin_vertex>','#include <begin_vertex>\n'+bend);if(s.fragmentShader.includes('#include <color_fragment>'))s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float chromisClay,chromisMagic;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55),chromisClay);');};
 const basePatch=patch;const litPatch=shader=>{basePatch(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float edge=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.8);totalEmissiveRadiance+=vec3(.12,.88,.73)*chromisMagic*edge*.85;`);};
 const material=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.82,side:T.DoubleSide});material.onBeforeCompile=litPatch;material.customProgramCacheKey=()=> 'chromis-facet-v1';
 const mesh=new T.Mesh(shared.g,material);mesh.name='자리돔 · 다각면체 시안';mesh.scale.setScalar(length/shared.data.length);mesh.castShadow=true;
 mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});mesh.customDepthMaterial.onBeforeCompile=patch;
 mesh.userData.magicStrength=magic;mesh.userData.update=(dt,moving=1)=>{time.value+=dt;motion.value=moving;};mesh.userData.setClay=value=>clay.value=value?1:0;
 mesh.userData.inspect=()=>({speciesId:CHROMIS.id,length,triangles:shared.data.triangles,parts:shared.data.parts,drawCalls:1,textures:0,sharedGeometry:true,geometryBytes:shared.g.attributes.position.array.byteLength+shared.g.attributes.color.array.byteLength});return mesh;
}

export function attachChromisGlow(animal){const strength=animal.userData.magicStrength;return{strength,update(dt,fish,time){let target=fish.calmed?.16+.04*Math.sin(time*1.7):0;if(fish.enchanted)target=fish.state==='binding'?Math.min(1,Math.max(0,(fish.age-.35)/.8))*.7:fish.state==='opening'?.7*Math.max(0,1-fish.age):magicPulse(time,fish.id)*.62;strength.value+=(target-strength.value)*(1-Math.exp(-dt*6));if(strength.value<.0001&&target===0)strength.value=0;return strength.value;}};}
