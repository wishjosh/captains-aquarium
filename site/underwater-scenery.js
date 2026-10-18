import * as T from './vendor/three.module.js?v=2026-10-18-underwater-four-fish-1';

// Independent of species, care and save data. Source GLBs remain byte-identical.
export const CURRENT_PERIOD=2*Math.PI/.35;
export function seaweedOffset(y,x,z,time){
 const w=Math.max(0,y)**2,phase=x*.13+z*.11;
 return [w*(.085*Math.sin(time*.35+phase)+.025*Math.sin(time*.22+phase*.7)),0,w*.055*Math.sin(time*.35+phase+.65)];
}
export function createUnderwaterScenery(assets,collisionRocks){
 const group=new T.Group();group.name='Jeju inspired rocky seaweed forest';
 let seed=7241,clock=0;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const uniform={value:0},batches=[],allRocks=[],reef=[],plants=[];
 const floorY=(x,z)=>-.15+.11*Math.sin(x*.45+z*.19)+.07*Math.cos(z*.58-x*.22);
 const sand=new T.PlaneGeometry(70,78,64,64);sand.rotateX(-Math.PI/2);sand.translate(0,0,-16);const colors=[],p=sand.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,floorY(x,z));const c=new T.Color('#bcb89b').multiplyScalar(.92+.06*Math.sin(x*.72+z*.26));colors.push(c.r,c.g,c.b);}
 sand.setAttribute('color',new T.Float32BufferAttribute(colors,3));sand.computeVertexNormals();
 const sandMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 sandMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFloor;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFloor=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFloor;').replace('#include <color_fragment>','#include <color_fragment>\nfloat wave=abs(sin(vFloor.x*1.5+sin(vFloor.z*.8))+cos(vFloor.z*1.9+sin(vFloor.x*.5)));diffuseColor.rgb*=1.0+(1.0-smoothstep(.02,.15,wave))*.18;');
 };
 const floor=new T.Mesh(sand,sandMaterial);group.add(floor);
 function fitted(asset,height){
  const scene=asset.scene;scene.updateMatrixWorld(true);const b=new T.Box3().setFromObject(scene),size=b.getSize(new T.Vector3()),s=height/size.y;
  const matrix=new T.Matrix4().makeScale(s,s,s).multiply(new T.Matrix4().makeTranslation(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2));
  return {scene,matrix,size:size.multiplyScalar(s)};
 }
 // Merge repeated original mesh primitives into instanced batches, preserving textures.
 function instances(asset,entries,{plant=false,stone=false}={}){
  const fit=fitted(asset,1),dummy=new T.Object3D();
  fit.scene.traverse(n=>{if(!n.isMesh)return;
   const geometry=n.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(fit.matrix,n.matrixWorld));
   const convert=source=>{const material=source.clone();if(stone){material.color.set('#293a3e');material.metalness=0;material.roughness=1;}
    if(plant){material.onBeforeCompile=shader=>{
     shader.uniforms.uCurrentTime=uniform;
     shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform float uCurrentTime;
      vec2 currentBend(){
       float phase=instanceMatrix[3].x*.13+instanceMatrix[3].z*.11;
       return vec2(.085*sin(uCurrentTime*.35+phase)+.025*sin(uCurrentTime*.22+phase*.7),.055*sin(uCurrentTime*.35+phase+.65));
      }`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec2 bendNormal=currentBend();objectNormal.y-=2.0*max(position.y,0.0)*dot(bendNormal,objectNormal.xz);')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.xz+=currentBend()*pow(max(position.y,0.0),2.0);');
    };material.customProgramCacheKey=()=> 'original-seaweed-current-v1';}
    return material;};
   const material=Array.isArray(n.material)?n.material.map(convert):convert(n.material),batch=new T.InstancedMesh(geometry,material,entries.length);
   batch.name=plant?'Original seaweed with anchored current bend':'Kenney original rock instances';
   entries.forEach((e,i)=>{dummy.position.set(e.x,e.y,e.z);dummy.rotation.set(0,e.angle,0);dummy.scale.setScalar(e.height);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();
   // Account for leaf tips moving beyond their static bounds.
   if(plant)batch.boundingSphere.radius+=1;
   group.add(batch);batches.push(batch);
  });return fit;
 }
 const rockEntries=[[],[]];
 function rock(assetIndex,x,z,width,y,angle,collider=false){
  const f=fitted(assetIndex?assets.rockB:assets.rock,1),height=width/Math.max(f.size.x,f.size.z),entry={x,y,z,height,angle};
  rockEntries[assetIndex].push(entry);allRocks.push({...entry,collider});return entry;
 }
 for(const [i,[x,z,r]]of collisionRocks.entries())reef.push(rock(i%2?0:1,x,z,r*2,0,0,true));
 // Beyond the existing swim boundary: visual depth without new invisible obstacles.
 for(let i=0;i<18;i++){const x=(i%2?-1:1)*(15.5+rnd()*3),z=5-Math.floor(i/2)*3.5;reef.push(rock(i%2,x,z,3.5+rnd()*2.2,floorY(x,z)-.1,rnd()*6));}
 for(let i=0;i<6;i++)reef.push(rock(i%2,-11+i*4.5,-25-rnd()*5,4.2+rnd()*2,floorY(-11+i*4.5,-25)-.1,rnd()*6));
 for(let i=0;i<20;i++){const x=(rnd()-.5)*27,z=5-rnd()*26;if(Math.abs(x)<2.6)continue;rock(i%2,x,z,.25+rnd()*.4,-.22,rnd()*6);}
 instances(assets.rock,rockEntries[0],{stone:true});instances(assets.rockB,rockEntries[1],{stone:true});
 // Ray-cast against the actual instanced rocks so every holdfast sits on stone.
 group.updateMatrixWorld(true);const cast=new T.Raycaster(),down=new T.Vector3(0,-1,0),rocks=[...batches],plantEntries=[[],[]];
 for(let i=0;i<reef.length;i++)for(let j=0;j<(i<8?3:2);j++){
  const r=reef[i],x=r.x+(rnd()-.5)*.85,z=r.z+(rnd()-.5)*.85;
  cast.set(new T.Vector3(x,15,z),down);const hit=cast.intersectObjects(rocks,false)[0];if(!hit)continue;
  const type=j===2||i%5===0?0:1,height=1.1+rnd()*1.45;
  const entry={x,y:hit.point.y+.015,z,height,angle:rnd()*Math.PI*2};plantEntries[type].push(entry);plants.push({...entry,type});
 }
 instances(assets.seaweed,plantEntries[0],{plant:true});instances(assets.kelp,plantEntries[1],{plant:true});
 const surface=new T.Mesh(new T.PlaneGeometry(55,60),new T.MeshLambertMaterial({color:'#64becd',side:T.DoubleSide,transparent:true,opacity:.28,depthWrite:false}));surface.rotation.x=Math.PI/2;surface.position.set(0,7,-4);group.add(surface);
 for(let i=0;i<3;i++){const ray=new T.Mesh(new T.PlaneGeometry(1.4,16),new T.MeshBasicMaterial({color:'#c9f5dc',transparent:true,opacity:.025,side:T.DoubleSide,depthWrite:false}));ray.position.set(-7+i*6,6,-13-i*5);ray.rotation.z=-.36;group.add(ray);}
 const motes=new T.BufferGeometry(),xyz=[];for(let i=0;i<85;i++)xyz.push((rnd()-.5)*29,.6+rnd()*7,5-rnd()*33);motes.setAttribute('position',new T.Float32BufferAttribute(xyz,3));group.add(new T.Points(motes,new T.PointsMaterial({color:'#c2e4dc',size:.026,transparent:true,opacity:.33,depthWrite:false})));
 return {group,update(dt,reduced=false){if(!reduced)clock+=Math.min(.1,Math.max(0,dt));uniform.value=clock;},inspect(){const sample=plants[0];return {style:'Jeju inspired rocky seaweed forest',seaweed:plants.length,rocks:allRocks.length,collisionRocks:collisionRocks.length,batches:batches.length,currentTime:clock,currentPeriod:CURRENT_PERIOD,sourceModels:['Seaweed / Mohabins / CC0','Kelp / Poly by Google / CC BY 3.0'],exactSpecies:false,sample:sample?{anchor:[sample.x,sample.y,sample.z],height:sample.height,baseOffset:seaweedOffset(0,sample.x,sample.z,clock),tipOffset:seaweedOffset(1,sample.x,sample.z,clock)}:null};}};
}
