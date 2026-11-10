import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {clone} from './runtime/vendor/SkeletonUtils.js?v=2026-10-20-jeju-rov-v1';
import {colourSnapper} from './snapper-appearance.mjs';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
const vec=(x,y,z)=>new T.Vector3(x,y,z);
// Native rest axes: X lateral, +Y tail, +Z back. Warp all attached surfaces together.
export function breamPoint(x,y,z){
 const core=1-smooth(.006,.022,y),face=1-smooth(-.019,-.011,y);
 return [x*(.76+.06*smooth(.010,.022,y)),y+.0012*face,z*(1+.31*core)+.00045*core];
}
function components(g){
 const p=g.attributes.position,keys=[],adj=new Map(),ids=new Map();
 for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(7)).join(',');keys.push(k);if(!adj.has(k)){adj.set(k,new Set());ids.set(k,[]);}ids.get(k).push(i);}
 const idx=g.index?.array||Array.from({length:p.count},(_,i)=>i);
 for(let i=0;i<idx.length;i+=3)for(let a=0;a<3;a++)for(let b=0;b<3;b++)adj.get(keys[idx[i+a]]).add(keys[idx[i+b]]);
 const result=[];while(adj.size){const todo=[adj.keys().next().value],group=[];while(todo.length){const k=todo.pop();if(!adj.has(k))continue;todo.push(...adj.get(k));adj.delete(k);group.push(...ids.get(k));}result.push(group);}return result;
}
function bounds(g,ids){const b=new T.Box3();for(const i of ids)b.expandByPoint(vec(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i)));return b;}
function refresh(g){g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();}
// Interpolate attachment weights on the reshaped body. The membrane and its root share weights.
function skinStrip(model,template,material,{name,x=0,ys,heights,top=false,splay=0,sweep=.28}){
 const body=[];model.traverse(o=>{if(o.isMesh&&o.userData.breamBody)body.push(o);});
 const proxies=body.map(o=>{const m=new T.Mesh(o.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));m.userData.source=o;return m;});
 const pos=[],joints=[],weights=[],uv=[],indices=[],roots=[],attachments=[];
 for(let k=0;k<ys.length;k++){
  const ray=new T.Raycaster(vec(x,ys[k],top?.06:-.06),vec(0,0,top?-1:1)),hit=ray.intersectObjects(proxies,false)[0];
  if(!hit)throw Error(name+' misses body at '+ys[k]);
  const g=hit.object.userData.source.geometry,ids=[hit.face.a,hit.face.b,hit.face.c],bary=T.Triangle.getBarycoord(hit.point,...ids.map(i=>new T.Vector3().fromBufferAttribute(g.attributes.position,i)),new T.Vector3()).toArray();
  const map=new Map();ids.forEach((i,n)=>{for(let j=0;j<4;j++){const joint=g.attributes.skinIndex.array[i*4+j],w=g.attributes.skinWeight.array[i*4+j]*bary[n];map.set(joint,(map.get(joint)||0)+w);}});
  const best=[...map].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,a)=>n+a[1],0);while(best.length<4)best.push([0,0]);
  const z=hit.point.z+(top?-.000025:.000025);roots.push([x,ys[k],z]);attachments.push({body:hit.object.userData.source,ids,bary});
  for(let outer=0;outer<2;outer++){pos.push(x+outer*heights[k]*splay,ys[k]+outer*heights[k]*sweep,z+outer*heights[k]*(top?1:-1));joints.push(...best.map(a=>a[0]));weights.push(...best.map(a=>a[1]/sum));uv.push(k/(ys.length-1),outer);}
 }
 for(let k=0;k<ys.length-1;k++){const a=k*2,b=a+2;if(k)indices.push(a,a+1,b);if(k<ys.length-2)indices.push(a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);refresh(g);
 const mesh=new T.SkinnedMesh(g,material);mesh.name=name;mesh.position.copy(template.position);mesh.quaternion.copy(template.quaternion);mesh.scale.copy(template.scale);template.parent.add(mesh);mesh.bind(template.skeleton,template.bindMatrix.clone());mesh.frustumCulled=false;
 proxies.forEach(p=>p.material.dispose());return {mesh,roots,attachments};
}
function finMaterial(name,clay=false){
 const m=new T.MeshStandardMaterial({color:clay?'#9ba8a6':'#8c9b95',flatShading:true,roughness:.76,metalness:0,side:T.DoubleSide});m.name=name;
 if(clay)return m;
 m.customProgramCacheKey=()=>name+'-bream-fin-1';
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 breamRest; varying vec2 breamUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nbreamRest=position;breamUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 breamRest; varying vec2 breamUV;');
  const coords=name==='Bream tail'?`vec2 d=vec2(max(breamRest.y-.020,.0001),breamRest.z);float reach=clamp(length(d)/.012,0.0,1.0);float ray=atan(d.y,d.x)*3.3;`:`float reach=breamUV.y;float ray=breamUV.x*10.0;`;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${coords}
   float aa=max(fwidth(ray),.012);float rib=smoothstep(.48-aa,.78+aa,cos(ray*6.2831853));
   diffuseColor.rgb*=mix(.62,1.12,reach)*(1.0+.16*rib*smoothstep(.1,.65,reach));
   diffuseColor.rgb*=1.0-.20*smoothstep(.88,1.0,reach);`);
 };return m;
}
function bodyMaterial(clay=false){
 const m=new T.MeshStandardMaterial({color:clay?'#9ba8a6':'#ffffff',flatShading:true,roughness:.68,metalness:0});m.name='Rock bream body';
 if(clay)return m;
 m.customProgramCacheKey=()=> 'rock-bream-body-1';
 m.onBeforeCompile=s=>{
  for(const [name,hex] of Object.entries({breamBack:'#718681',breamSide:'#c1c5b0',breamBelly:'#d6d5bd',breamBar:'#293a3b'}))s.uniforms[name]={value:new T.Color(hex)};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float breamPart; varying float breamPartV; varying vec3 breamRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nbreamRest=position;breamPartV=breamPart;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 breamRest; varying float breamPartV;uniform vec3 breamBack,breamSide,breamBelly,breamBar;');
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 col=mix(breamBelly,breamSide,smoothstep(-.009,-.001,breamRest.z));col=mix(col,breamBack,smoothstep(.002,.014,breamRest.z));
   float y=breamRest.y+.0009*sin(breamRest.z*105.0);float band=0.0;
   for(int i=0;i<7;i++){float c=-.0119+float(i)*.00545;float w=mix(.00118,.00145,float(i)/6.0);float aa=max(fwidth(y),.00008);band=max(band,1.0-smoothstep(w-aa,w+aa,abs(y-c)));}
   col=mix(col,breamBar,band*.94);
   float lip=(1.0-smoothstep(-.0184,-.0165,breamRest.y))*(1.0-smoothstep(.00035,.00105,abs(breamRest.z+.0030)));
   col=mix(col,breamBar,lip*.72);
   if(breamPartV>.5&&breamPartV<1.5)col=mix(breamSide,breamBack,.65);
   diffuseColor.rgb=col;`);
 };return m;
}
export function createRockBream(asset,{length=.85,appearance='colour'}={}){
 const model=clone(asset.scene),ownedGeometry=new Set(),ownedMaterials=new Set(),fins=[],pectoral=[];let template,triangles=0;
 const clay=appearance==='clay';
 model.traverse(o=>{
  if(!o.isMesh)return;const originalName=o.material.name;o.userData.sourceMaterial=originalName;o.geometry=o.geometry.clone();ownedGeometry.add(o.geometry);const g=o.geometry,p=g.attributes.position,part=new Float32Array(p.count);
  if(originalName==='RedSnapper_Main')for(const ids of components(g)){const b=bounds(g,ids);if(ids.length&&b.min.y>-.008&&b.max.y<.008){for(const i of ids)part[i]=1;pectoral.push({mesh:o,ids,side:b.max.x<0?-1:1});}}
  g.setAttribute('breamPart',new T.Float32BufferAttribute(part,1));
  for(let i=0;i<p.count;i++)p.setXYZ(i,...breamPoint(p.getX(i),p.getY(i),p.getZ(i)));
  if(originalName==='RedSnapper_Fins'){
   template=o;const source=o.geometry.index?.array||Array.from({length:p.count},(_,i)=>i),idx=[];
   for(let i=0;i<source.length;i+=3){const t=Array.from(source.slice(i,i+3));if(t.every(j=>p.getY(j)>.019))idx.push(...t);}
   g.setIndex(idx);for(let i=0;i<p.count;i++)if(p.getY(i)>.020){const z=p.getZ(i),spread=Math.min(1,Math.abs(z)/.0096);p.setY(i,.020+(p.getY(i)-.020)*(.66+.36*spread));p.setZ(i,z*.96);}
  }
  o.userData.breamBody=/RedSnapper_(Main|Light)/.test(originalName);refresh(g);o.frustumCulled=false;o.castShadow=true;
 });
 if(!template)throw Error('RedSnapper fins missing');
 // Reuse the established pupil / white / highlight treatment after reshaping the eyes.
 colourSnapper(model,{finDetail:false}).forEach(m=>ownedMaterials.add(m));
 model.traverse(o=>{if(!o.isMesh)return;if(o.userData.sourceMaterial==='Eyes')return;const m=o===template?finMaterial('Bream tail',clay):bodyMaterial(clay);o.material=m;ownedMaterials.add(m);});
 const add=config=>{const m=finMaterial(config.name,clay),f=skinStrip(model,template,m,config);ownedMaterials.add(m);ownedGeometry.add(f.mesh.geometry);fins.push(f);};
 add({name:'Bream dorsal',top:true,ys:[-.010,-.0085,-.007,-.0055,-.004,-.0025,-.001,.0005,.002,.0035,.005,.0065,.008,.010,.012,.014,.016,.018],heights:[0,.0027,.0018,.0040,.0028,.0046,.0035,.0049,.0039,.0050,.0042,.0055,.0067,.0072,.0066,.0049,.0027,0],sweep:.15});
 add({name:'Bream anal',ys:[.001,.003,.005,.007,.009,.011,.013,.015,.017],heights:[0,.0026,.0047,.0062,.0065,.0053,.0038,.0018,0],sweep:.32});
 for(const sign of[-1,1])add({name:'Bream pelvic '+sign,x:sign*.0038,ys:[-.008,-.0065,-.005,-.0035,-.002],heights:[0,.0030,.0054,.0041,0],splay:sign*.38,sweep:.48});
 for(const f of pectoral){const p=f.mesh.geometry.attributes.position;f.rest=new Float32Array(p.array);const root=f.ids.reduce((a,i)=>Math.abs(p.getX(i))<Math.abs(p.getX(a))?i:a,f.ids[0]);f.anchor=vec(p.getX(root),p.getY(root),p.getZ(root));}
 const mixer=new T.AnimationMixer(model),clip=asset.animations.find(a=>a.name.endsWith('Swimming_Normal'));if(!clip)throw Error('Native swim missing');mixer.clipAction(clip).play();mixer.update(0);model.updateMatrixWorld(true);
 // One shared length reference keeps the existing and new fish comparable.
 asset.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(asset.scene),size=box.getSize(new T.Vector3()),offset=new T.Group(),scaled=new T.Group(),root=new T.Group();offset.position.copy(box.getCenter(new T.Vector3())).negate();offset.add(model);scaled.scale.setScalar(length/size.z);scaled.add(offset);root.add(scaled);
 let time=0;
 function setTime(t){time=t;mixer.setTime(t*.72);for(const f of pectoral){const p=f.mesh.geometry.attributes.position,angle=f.side*Math.sin(t*3.6)*.16,c=Math.cos(angle),s=Math.sin(angle);for(const i of f.ids){const x=f.rest[i*3]-f.anchor.x,y=f.rest[i*3+1]-f.anchor.y;p.setXYZ(i,f.anchor.x+x*c-y*s,f.anchor.y+x*s+y*c,f.rest[i*3+2]);}p.needsUpdate=true;f.mesh.geometry.computeVertexNormals();}model.updateMatrixWorld(true);}
 model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 root.userData.setTime=setTime;root.userData.update=dt=>setTime(time+dt);
 root.userData.inspect=()=>({source:'Quaternius RedSnapper / Poly Pizza CC0',length,appearance,triangles,clip:clip.name,rigChanged:false,sourceGeometryModified:false,bodyWarp:true,eyeStyle:'existing chromis white/pupil/highlight',bands:7,pectoralPairs:pectoral.length/2,newFins:fins.map(f=>({name:f.mesh.name,roots:f.roots,triangles:f.mesh.geometry.index.count/3})),time});
 root.userData.validation={model,fins,pectoral,clip,mixer};
 root.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());};setTime(0);return root;
}
