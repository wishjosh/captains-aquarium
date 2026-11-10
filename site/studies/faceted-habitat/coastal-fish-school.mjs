import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createCoastalFish,COASTAL_ART_VERSION} from './coastal-fish-models.mjs?v=2026-11-10-fish-1';
export const SWIM_FRAMES=24;
// Bake one native swim per species. Thirty-six animals share sixteen draw batches;
// their animation phase remains independent, without thirty-six skeleton updates.
export function createCoastalSchool(asset,{kind,count,time={value:0}}){
 const started=performance.now(),root=createCoastalFish(asset,{kind,length:1}),groups=new Map(),{model,clip,pectoral}=root.userData.validation,period=clip.duration/.72;
 model.traverse(mesh=>{if(!mesh.isMesh)return;const key=mesh.userData.breamBody?'body':mesh.userData.sourceMaterial==='Eyes'?'eyes':mesh.userData.sourceMaterial==='RedSnapper_Fins'?'tail':'membrane';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);});
 const definitions=[];
 for(const [key,meshes] of groups){
  const position=[],normal=[],uv=[],part=[],index=[],references=[];
  for(const mesh of meshes){const g=mesh.geometry,map=new Map(),source=g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i);
   for(const old of source){if(!map.has(old)){map.set(old,references.length);references.push({mesh,index:old});position.push(g.attributes.position.getX(old),g.attributes.position.getY(old),g.attributes.position.getZ(old));normal.push(0,1,0);uv.push(g.attributes.uv?.getX(old)||0,g.attributes.uv?.getY(old)||0);part.push(g.attributes.breamPart?.getX(old)||0);}index.push(map.get(old));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('breamPart',new T.Float32BufferAttribute(part,1));geometry.setAttribute('coastVertex',new T.Float32BufferAttribute(references.map((_,i)=>i),1));geometry.setAttribute('coastPhase',new T.InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>(i*.381966)%1),1));geometry.setIndex(index);
  const width=references.length,data=new Float32Array(width*SWIM_FRAMES*2*4),deformed=new T.BufferGeometry();deformed.setIndex(index);deformed.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(width*3),3));definitions.push({key,geometry,material:meshes[0].material,references,width,data,deformed});
 }
 const point=new T.Vector3();
 for(let frame=0;frame<SWIM_FRAMES;frame++){
  root.userData.setTime(frame/SWIM_FRAMES*period);
  // The supplementary pectoral stroke closes exactly at the native cycle boundary.
  for(const f of pectoral){const p=f.mesh.geometry.attributes.position,angle=f.side*Math.sin(frame/SWIM_FRAMES*Math.PI*2)*.16,c=Math.cos(angle),s=Math.sin(angle);for(const i of f.ids){const x=f.rest[i*3]-f.anchor.x,y=f.rest[i*3+1]-f.anchor.y;p.setXYZ(i,f.anchor.x+x*c-y*s,f.anchor.y+x*s+y*c,f.rest[i*3+2]);}}
  root.updateMatrixWorld(true);
  for(const d of definitions){const p=d.deformed.attributes.position;d.references.forEach((r,i)=>{point.fromBufferAttribute(r.mesh.geometry.attributes.position,r.index);r.mesh.applyBoneTransform(r.index,point).applyMatrix4(r.mesh.matrixWorld);p.setXYZ(i,point.x,point.y,point.z);const at=(frame*d.width+i)*4;d.data.set([point.x,point.y,point.z,1],at);});d.deformed.computeVertexNormals();const n=d.deformed.attributes.normal;for(let i=0;i<d.width;i++)d.data.set([n.getX(i),n.getY(i),n.getZ(i),0],((frame+SWIM_FRAMES)*d.width+i)*4);}
 }
 const group=new T.Group();group.name=kind+' native-style school';const meshes=[],textures=[];let textureBytes=0,triangles=0;
 for(const d of definitions){
  const texture=new T.DataTexture(d.data,d.width,SWIM_FRAMES*2,T.RGBAFormat,T.FloatType);texture.minFilter=T.NearestFilter;texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;textures.push(texture);textureBytes+=d.data.byteLength;
  const material=d.material.clone(),paint=d.material.onBeforeCompile.bind(d.material),cache=d.material.customProgramCacheKey();material.customProgramCacheKey=()=>cache+'-coastal-vat-1';
  material.onBeforeCompile=(s,renderer)=>{paint(s,renderer);s.uniforms.coastalTime=time;s.uniforms.coastalAtlas={value:texture};s.uniforms.coastalWidth={value:d.width};s.uniforms.coastalPeriod={value:period};s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
   uniform float coastalTime,coastalWidth,coastalPeriod;uniform sampler2D coastalAtlas;attribute float coastVertex,coastPhase;
   vec3 coastalPose(float row){float frame=fract(coastalTime/coastalPeriod+coastPhase)*${SWIM_FRAMES}.0;float a=floor(frame),b=mod(a+1.0,${SWIM_FRAMES}.0);vec2 uv=vec2((coastVertex+.5)/coastalWidth,(a+row+.5)/${SWIM_FRAMES*2}.0);vec2 uv2=vec2(uv.x,(b+row+.5)/${SWIM_FRAMES*2}.0);return mix(texture2D(coastalAtlas,uv).xyz,texture2D(coastalAtlas,uv2).xyz,fract(frame));}
  `).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nobjectNormal=normalize(coastalPose(${SWIM_FRAMES}.0));`).replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=coastalPose(0.0);');};
  const mesh=new T.InstancedMesh(d.geometry,material,count);mesh.name=kind+' '+d.key;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh);triangles+=d.geometry.index.count/3*count;d.deformed.dispose();
 }
 const report={artVersion:COASTAL_ART_VERSION,kind,count,batches:meshes.length,triangles,frames:SWIM_FRAMES,period,textureBytes,bakeMs:performance.now()-started};
 return{group,meshes,report,validation:{definitions,root},setMatrixAt(i,m){meshes.forEach(o=>o.setMatrixAt(i,m));},commit(){meshes.forEach(o=>o.instanceMatrix.needsUpdate=true);},dispose(){meshes.forEach(o=>{o.geometry.dispose();o.material.dispose();});textures.forEach(t=>t.dispose());root.userData.dispose();}};
}
