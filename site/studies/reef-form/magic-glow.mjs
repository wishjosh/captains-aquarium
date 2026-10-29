import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
// A four-second pulse with a dark half-cycle. IDs stagger the three fish.
export function magicPulse(time,id=0){const wave=Math.max(0,Math.sin((time/4+id/3)*Math.PI*2));return wave*wave;}
export function attachMagicGlow(animal){
 const strength={value:0},owned=[],halos=[],sourceMeshes=[];animal.traverse(n=>{if(n.isMesh)sourceMeshes.push(n);});
 animal.traverse(node=>{if(!node.isMesh)return;const source=node.material;
  const convert=original=>{if(original.name==='Eyes')return original;const material=original.clone(),compile=original.onBeforeCompile,key=original.customProgramCacheKey.bind(original);
   material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.magicStrength=strength;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float magicStrength;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
     float magicFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
     float magicEdge = pow(1.0 - magicFacing, 2.8);
     totalEmissiveRadiance += vec3(0.12, 0.88, 0.73) * magicStrength * magicEdge * 0.85;
    `);
   };material.customProgramCacheKey=()=>key()+'-magic-rim-v1';owned.push(material);return material;};
  node.material=Array.isArray(source)?source.map(convert):convert(source);
 });
 for(const mesh of sourceMeshes){const source=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(source.every(m=>m.name==='Eyes'))continue;
  for(const [width,alpha]of [[.0015,.24],[.0030,.10]]){
   const material=new T.MeshStandardMaterial({color:'#6bc9bf',emissive:'#6bc9bf',emissiveIntensity:.7,transparent:true,opacity:0,side:T.BackSide,depthWrite:false,roughness:1});
   material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec3 magicHaloNormal = normalize(normalMatrix * objectNormal);
    gl_Position.xy += magicHaloNormal.xy * ${width.toFixed(4)} * gl_Position.w;
   `);};material.customProgramCacheKey=()=>`magic-outer-rim-${width}`;
   const halo=mesh.clone(false);halo.name='magic-rim';halo.material=material;halo.frustumCulled=false;halo.castShadow=false;halo.receiveShadow=false;halo.raycast=()=>{};if(mesh.morphTargetInfluences)halo.morphTargetInfluences=mesh.morphTargetInfluences;mesh.parent.add(halo);halos.push({mesh:halo,source:mesh,alpha});owned.push(material);
  }
 }
 return {strength,owned,update(dt,fish,time){let target=0;if(fish.enchanted){if(fish.state==='binding')target=Math.max(0,Math.min(1,(fish.age-.35)/.8))*.7;else if(fish.state==='opening')target=.7*Math.max(0,1-fish.age);else target=magicPulse(time,fish.id)*.62;}strength.value+=(target-strength.value)*(1-Math.exp(-dt*6));if(strength.value<.0001&&target===0)strength.value=0;for(const h of halos){h.mesh.visible=strength.value>.001;h.mesh.material.opacity=strength.value*h.alpha;h.mesh.position.copy(h.source.position);h.mesh.quaternion.copy(h.source.quaternion);h.mesh.scale.copy(h.source.scale);}return strength.value;}};
}
