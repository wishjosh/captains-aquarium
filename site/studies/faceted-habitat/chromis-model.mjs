import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {chromisShape,CHROMIS} from './chromis-shape.mjs?v=2026-11-01-chromis-1';
let shared;
export function createChromis({length=CHROMIS.length}={}){
 if(!shared){const data=chromisShape(),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('color',new T.Float32BufferAttribute(data.color,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.03;shared={g,data};}
 const time={value:0},motion={value:0},clay={value:0};
 const bend=`float tailWeight=smoothstep(.02,.62,-transformed.z);transformed.x+=sin(chromisTime*4.0+transformed.z*6.0)*.038*tailWeight*chromisMotion;`;
 const patch=s=>{Object.assign(s.uniforms,{chromisTime:time,chromisMotion:motion,chromisClay:clay});s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float chromisTime,chromisMotion;').replace('#include <begin_vertex>','#include <begin_vertex>\n'+bend);if(s.fragmentShader.includes('#include <color_fragment>'))s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float chromisClay;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55),chromisClay);');};
 const material=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.82,side:T.DoubleSide});material.onBeforeCompile=patch;material.customProgramCacheKey=()=> 'chromis-facet-v1';
 const mesh=new T.Mesh(shared.g,material);mesh.name='자리돔 · 다각면체 시안';mesh.scale.setScalar(length/shared.data.length);mesh.castShadow=true;
 mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});mesh.customDepthMaterial.onBeforeCompile=patch;
 mesh.userData.update=(dt,moving=1)=>{time.value+=dt;motion.value=moving;};mesh.userData.setClay=value=>clay.value=value?1:0;
 mesh.userData.inspect=()=>({speciesId:CHROMIS.id,length,triangles:shared.data.triangles,parts:shared.data.parts,drawCalls:1,textures:0,sharedGeometry:true,geometryBytes:shared.g.attributes.position.array.byteLength+shared.g.attributes.color.array.byteLength});return mesh;
}
