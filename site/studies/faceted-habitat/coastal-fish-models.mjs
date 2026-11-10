import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createRockBream} from './rock-bream-model.mjs?v=2026-11-10-bream-1';
import {colourSnapper} from './snapper-appearance.mjs';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
export const COASTAL_ART_VERSION='2026-11-10-fish-1';
export const COASTAL_FORMS={
 rockbream:{name:'돌돔',body:'high oval',pattern:'seven vertical bars'},
 stripey:{name:'범돔',body:'deep rounded',pattern:'diagonal black bands'},
 wrasse:{name:'용치놀래기',body:'long low oval',pattern:'female-like lateral stripe and dotted rows'},
 blue:{name:'파랑돔',body:'compact oval',pattern:'blue body and yellow tail'}
};
// Transform the body, eye rims and membranes together; the native rig is retained.
export function coastalPoint(kind,x,y,z){
 if(kind==='stripey')return[x*.84,y*.91,z*1.24];
 if(kind==='wrasse')return[x*.82,y*1.22-.0018*(1-smooth(-.018,-.011,y)),z*.64];
 if(kind==='blue')return[x*.94,y*.94,z*.89];
 return[x,y,z];
}
function bodyMaterial(kind){
 const palettes={stripey:['#9a8545','#e4c56b','#eee1b1','#303b37'],wrasse:['#8b7954','#c6a474','#e6d2ae','#4b4236'],blue:['#28549a','#478fe0','#6bb3d6','#183855']},colors=palettes[kind];
 const m=new T.MeshStandardMaterial({color:'#ffffff',flatShading:true,roughness:.68});m.name=kind+' coastal body';m.customProgramCacheKey=()=>kind+'-coastal-body-1';
 m.onBeforeCompile=s=>{
  ['coastBack','coastSide','coastBelly','coastInk'].forEach((n,i)=>s.uniforms[n]={value:new T.Color(colors[i])});s.uniforms.coastYellow={value:new T.Color('#dec569')};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float breamPart;varying float coastPart;varying vec3 coastRest;').replace('#include <begin_vertex>','#include <begin_vertex>\ncoastRest=position;coastPart=breamPart;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float coastPart;varying vec3 coastRest;uniform vec3 coastBack,coastSide,coastBelly,coastInk,coastYellow;');
  const pattern=kind==='stripey'?`
   float q=(coastRest.y+coastRest.z*.48)/.0071;float aa=max(fwidth(q),.008);float band=1.0-smoothstep(.19-aa,.19+aa,abs(fract(q+.5)-.5));col=mix(col,coastInk,band*.96);`:
   kind==='wrasse'?`
   float center=.0019+.035*coastRest.y;float aa=max(fwidth(coastRest.z),.00008);float band=1.0-smoothstep(.00082-aa,.00082+aa,abs(coastRest.z-center));col=mix(col,coastInk,band*.94);
   vec2 dots=vec2(coastRest.y/.0030,(coastRest.z-center)/.00165);float dotted=1.0-smoothstep(.17,.30,length(fract(dots+.5)-.5));dotted*=smoothstep(.00125,.0017,abs(coastRest.z-center));col=mix(col,vec3(.30,.105,.055),dotted*.37);`:
   `float yellow=smoothstep(.011,.023,coastRest.y)*(1.0-smoothstep(-.002,.006,coastRest.z));col=mix(col,coastYellow,yellow);`;
  const lower=kind==='stripey'?'-.013':kind==='wrasse'?'-.006':'-.009',upper=kind==='stripey'?'.018':kind==='wrasse'?'.008':'.013';
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 col=mix(coastBelly,coastSide,smoothstep(${lower},-.001,coastRest.z));col=mix(col,coastBack,smoothstep(.002,${upper},coastRest.z));${pattern}
   if(coastPart>.5)col=mix(coastSide,coastBack,.42);
   diffuseColor.rgb=col;`);
 };return m;
}
export function createCoastalFish(asset,{kind='rockbream',length=1,appearance='colour'}={}){
 if(!COASTAL_FORMS[kind])throw Error('Unknown coastal species '+kind);
 const root=createRockBream(asset,{length,appearance});if(kind==='rockbream')return root;
 root.userData.setTime(0);const {model,pectoral,fins}=root.userData.validation,owned=[];
 model.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,eye=o.userData.sourceMaterial==='Eyes',eyeBoxes=[new T.Box3(),new T.Box3()];
  if(eye)for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);eyeBoxes[v.x<0?0:1].expandByPoint(v);}const eyeCenters=eye?eyeBoxes.map(b=>b.getCenter(new T.Vector3())):[];
  for(let i=0;i<p.count;i++){
   let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   if(o.userData.sourceMaterial==='RedSnapper_Fins'&&y>.020){
    const spread=Math.min(1,Math.abs(z)/.0093),ratio=(y-.020)/(.0117*(.66+.36*spread));
    // A rounded fan in stripey/wrasse, a distinct fork in blue.
    y=.020+ratio*(kind==='blue'?(.0054+.0064*spread):(.0120-.0032*spread*spread));
   }
   if(eye){const c=eyeCenters[x<0?0:1],next=coastalPoint(kind,c.x,c.y,c.z),scale=kind==='wrasse'?.82:kind==='stripey'?.94:.92;[x,y,z]=[next[0]+(x-c.x)*scale,next[1]+(y-c.y)*scale,next[2]+(z-c.z)*scale];}else [x,y,z]=coastalPoint(kind,x,y,z);p.setXYZ(i,x,y,z);
  }
  // Lower, continuous dorsal and anal membranes on the elongated wrasse.
  if(kind==='wrasse'&&o.name.startsWith('Bream ')&&o.name!=='Bream tail'){
   for(let i=1;i<p.count;i+=2){const a=new T.Vector3().fromBufferAttribute(p,i-1),b=new T.Vector3().fromBufferAttribute(p,i);b.lerp(a,o.name==='Bream dorsal'?.48:.30);p.setXYZ(i,b.x,b.y,b.z);}
  }
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 });
 // Recompute eye shader bounds after the shared shape transform.
 colourSnapper({traverse(fn){model.traverse(o=>{if(o.isMesh&&o.userData.sourceMaterial==='Eyes')fn(o);});}}).forEach(m=>owned.push(m));
 const body=appearance==='clay'?new T.MeshStandardMaterial({color:'#9ba8a6',roughness:.68,flatShading:true}):bodyMaterial(kind);owned.push(body);
 model.traverse(o=>{if(!o.isMesh||o.userData.sourceMaterial==='Eyes')return;if(o.userData.breamBody){o.material=body;return;}if(appearance!=='clay')o.material.color.set(kind==='stripey'?'#c7b261':kind==='wrasse'?'#ba9868':o.userData.sourceMaterial==='RedSnapper_Fins'?'#e5ca64':'#568bc6');});
 for(const f of pectoral){const p=f.mesh.geometry.attributes.position;f.rest=new Float32Array(p.array);f.anchor.fromArray(coastalPoint(kind,f.anchor.x,f.anchor.y,f.anchor.z));}
 for(const f of fins)f.roots=f.roots.map(p=>coastalPoint(kind,...p));
 const inspect=root.userData.inspect,dispose=root.userData.dispose;root.userData.inspect=()=>({...inspect(),kind,form:COASTAL_FORMS[kind],artVersion:COASTAL_ART_VERSION});root.userData.dispose=()=>{dispose();owned.forEach(m=>m.dispose());};root.userData.setTime(0);return root;
}
