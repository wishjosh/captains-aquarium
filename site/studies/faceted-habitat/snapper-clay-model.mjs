import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {clone} from './runtime/vendor/SkeletonUtils.js?v=2026-10-20-jeju-rov-v1';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
export function reshapeFinPoint(x,y,z){
 // This FBX-derived asset uses local +Y toward the tail and +Z toward the back.
 if(y>.020){
  const spread=Math.min(1,Math.abs(z)/.0096);
  return [x,.020+(y-.020)*(.43+.66*spread),z*(1+.08*smooth(.020,.029,y))];
 }
 const floor=y<.0034?.0085:T.MathUtils.lerp(.00867,.0063,T.MathUtils.clamp((y-.0034)/.0066,0,1));
 const ceiling=y<-.004?.0155:y<.002?.01493:y<.0078?T.MathUtils.lerp(.01493,.01338,(y-.002)/.0058):T.MathUtils.lerp(.01338,.00925,T.MathUtils.clamp((y-.0078)/.0034,0,1));
 const height=T.MathUtils.clamp((z-floor)/Math.max(.001,ceiling-floor),0,1);
 return [x,y+(-.0025*(1-smooth(-.006,.001,y))+.0055*smooth(-.001,.0112,y))*height,floor+(z-floor)*(1.55+.25*smooth(-.005,.006,y))];
}
function addVentralFin(model,fin,material,{name,x=0,ys,heights,splay=0,sweep=.35}){
 const bodies=[];model.traverse(o=>{if(o.isMesh&&/RedSnapper_(Main|Light)/.test(o.material.name))bodies.push(o);});
 const proxies=bodies.map(o=>{const m=new T.Mesh(o.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));m.userData.source=o;return m;});
 const position=[],joints=[],weights=[],index=[],roots=[],losses=[];

 for(let k=0;k<ys.length;k++){
  const y=ys[k],ray=new T.Raycaster(new T.Vector3(x,y,-.04),new T.Vector3(0,0,1)),hit=ray.intersectObjects(proxies,false)[0];
  if(!hit)throw Error(name+' root missed source body');
  const source=hit.object.userData.source,g=source.geometry,ids=[hit.face.a,hit.face.b,hit.face.c];
  const bary=T.Triangle.getBarycoord(hit.point,...ids.map(i=>new T.Vector3().fromBufferAttribute(g.attributes.position,i)),new T.Vector3()).toArray();
  const influences=new Map();ids.forEach((i,n)=>{for(let j=0;j<4;j++){const bone=g.attributes.skinIndex.array[i*4+j],w=g.attributes.skinWeight.array[i*4+j]*bary[n];influences.set(bone,(influences.get(bone)||0)+w);}});
  const sorted=[...influences].sort((a,b)=>b[1]-a[1]),best=sorted.slice(0,4),sum=best.reduce((v,a)=>v+a[1],0);losses.push(sorted.slice(4).reduce((v,a)=>v+a[1],0));while(best.length<4)best.push([0,0]);
  // A slight root overlap avoids a visible seam while keeping the source body untouched.
  const z=hit.point.z+.00004;roots.push([x,y,z]);
  for(const outer of [false,true]){position.push(x+(outer?heights[k]*splay:0),y+(outer?heights[k]*sweep:0),z-(outer?heights[k]:0));joints.push(...best.map(v=>v[0]));weights.push(...best.map(v=>v[1]/sum));}
 }
 for(let k=0;k<ys.length-1;k++){const a=k*2,b=a+2;if(k>0)index.push(a,a+1,b);if(k<ys.length-2)index.push(a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.setIndex(index);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 const mesh=new T.SkinnedMesh(g,material);mesh.name=name;mesh.position.copy(fin.position);mesh.quaternion.copy(fin.quaternion);mesh.scale.copy(fin.scale);fin.parent.add(mesh);mesh.bind(fin.skeleton,fin.bindMatrix.clone());mesh.frustumCulled=false;mesh.castShadow=true;
 proxies.forEach(m=>m.material.dispose());return {mesh,roots,maxDiscardedWeight:Math.max(...losses)};
}
export function createSnapperClay(asset,{length=.85,variant='proposed'}={}){
 if(!['source','proposed'].includes(variant))throw Error('Unknown clay variant');
 const model=clone(asset.scene),ownedGeometry=new Set(),ownedMaterials=new Set();let fin,originalTriangles=0;
 model.traverse(o=>{if(!o.isMesh)return;originalTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.material.name==='RedSnapper_Fins')fin=o;});
 if(!fin)throw Error('Expected source fin mesh missing');
 const clay=new T.MeshStandardMaterial({color:'#a9ada6',roughness:.83,metalness:0,side:T.DoubleSide,flatShading:true});ownedMaterials.add(clay);
 let anal=null;const pelvic=[];
 if(variant==='proposed'){
  const g=fin.geometry.clone(),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...reshapeFinPoint(p.getX(i),p.getY(i),p.getZ(i)));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();fin.geometry=g;ownedGeometry.add(g);
  anal=addVentralFin(model,fin,clay,{name:'Chromis anal fin / source-weight interpolation',ys:[.003,.006,.009,.012,.015,.018],heights:[0,.0018,.0042,.0047,.0026,0]});ownedGeometry.add(anal.mesh.geometry);
  for(const sign of [-1,1]){const added=addVentralFin(model,fin,clay,{name:'Chromis pelvic '+(sign<0?'left':'right'),x:sign*.0035,ys:[-.008,-.0065,-.005,-.0035,-.002,-.0005],heights:[0,.004,.0065,.006,.003,0],splay:sign*.45,sweep:.6});pelvic.push(added);ownedGeometry.add(added.mesh.geometry);}
 }
 model.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;if(o.material.name==='Eyes'){const eye=new T.MeshStandardMaterial({color:'#464b48',roughness:.7});ownedMaterials.add(eye);o.material=eye;}else o.material=clay;});
 const mixer=new T.AnimationMixer(model),clip=asset.animations.find(a=>a.name.endsWith('Swimming_Normal'));if(!clip)throw Error('Native swim missing');mixer.clipAction(clip).play();mixer.update(0);model.updateMatrixWorld(true);
 // Normalize both variants using unchanged source bounds, so body sizes remain identical.
 asset.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(asset.scene),size=box.getSize(new T.Vector3()),offset=new T.Group(),scaled=new T.Group(),root=new T.Group();offset.position.copy(box.getCenter(new T.Vector3())).negate();offset.add(model);scaled.scale.setScalar(length/size.z);scaled.add(offset);root.add(scaled);
 root.userData.update=dt=>mixer.update(dt);root.userData.setTime=t=>mixer.setTime(t);
 root.userData.inspect=()=>({variant,source:'Quaternius RedSnapper / Poly Pizza',originalTriangles,addedTriangles:[anal,...pelvic].filter(Boolean).reduce((n,f)=>n+f.mesh.geometry.index.count/3,0),pelvicFinCount:pelvic.length,pelvicRoots:pelvic.map(f=>f.roots),bodyChanged:false,rigChanged:false,clip:clip.name,sourceBounds:size.toArray(),analRoots:anal?.roots,maxDiscardedWeight:Math.max(0,...[anal,...pelvic].filter(Boolean).map(f=>f.maxDiscardedWeight))});
 root.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());};
 return root;
}
