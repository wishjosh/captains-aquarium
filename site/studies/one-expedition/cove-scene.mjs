import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {COVE_ROCKS,coveFloor,coveObstacles} from './cove.mjs?v=2026-10-29-habitat-2';

import {stone,rockMaterial,createReefDecor,enhanceSand} from './reef-art.mjs?v=2026-10-29-reef-1';
import {createHabitat} from './habitat-scene.mjs?v=2026-10-29-reef-1';

export function createCoveScene(assets){
 const group=new T.Group();group.name='Small cove: sand path, rock ledge, kelp edge';
 const time={value:0},solids=[],occluders=[],batches=[],plants=[];let clock=0;
 const floorGeo=new T.PlaneGeometry(70,78,64,64);floorGeo.rotateX(-Math.PI/2);floorGeo.translate(0,0,-12);
 const pos=floorGeo.attributes.position,colors=[];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,coveFloor(x,z));
  const path=Math.exp(-Math.pow((x-.55*Math.sin(z*.37))/2.8,2)),depth=T.MathUtils.clamp((-z-1)/25,0,1);
  const c=new T.Color('#798e83').lerp(new T.Color('#c3b898'),path*.87).lerp(new T.Color('#527e7d'),depth*.32);
  colors.push(c.r,c.g,c.b);
 }
 floorGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));floorGeo.computeVertexNormals();
 const floorMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.98});
 enhanceSand(floorMat,time);
 const floor=new T.Mesh(floorGeo,floorMat);floor.receiveShadow=true;floor.name='Sandy passage';group.add(floor);solids.push(floor);occluders.push(floor);
 function fit(asset){asset.scene.updateMatrixWorld(true);const b=new T.Box3().setFromObject(asset.scene),size=b.getSize(new T.Vector3());return{scene:asset.scene,size,matrix:new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2))};}
 function batch(asset,entries,plant=false){
  if(!entries.length)return;const fitted=fit(asset),dummy=new T.Object3D();
  fitted.scene.traverse(n=>{if(!n.isMesh)return;const geo=n.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(fitted.matrix,n.matrixWorld));
   const material=m=>{const clone=m.clone();if(!plant){clone.color.set('#ffffff');clone.roughness=1;clone.metalness=0;}else{
    clone.onBeforeCompile=shader=>{shader.uniforms.coveTime=time;shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
 uniform float coveTime;
 vec2 coveBend(){float p=instanceMatrix[3].x*.19+instanceMatrix[3].z*.11;return vec2(.065*sin(coveTime*.38+p),.035*sin(coveTime*.28+p+.6));}`)
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal.y-=2.0*max(position.y,0.0)*dot(coveBend(),objectNormal.xz);')
    .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.xz+=coveBend()*pow(max(position.y,0.0),2.0);');};clone.customProgramCacheKey=()=> 'small-cove-native-plants-v1';}
    return clone;};
   const mat=Array.isArray(n.material)?n.material.map(material):material(n.material),mesh=new T.InstancedMesh(geo,mat,entries.length);mesh.name=plant?'Native plants, anchored sway':'Original cove rocks';
   entries.forEach((e,i)=>{dummy.position.set(e.x,e.y,e.z);dummy.rotation.set(0,e.angle||0,0);dummy.scale.setScalar(e.height);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(!plant)mesh.setColorAt(i,new T.Color(e.color||'#435e61'));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();if(plant)mesh.boundingSphere.radius+=1;
   group.add(mesh);batches.push(mesh);occluders.push(mesh);if(!plant)solids.push(mesh);
  });
 }
 const habitat=createHabitat(coveFloor);group.add(habitat.group);solids.push(...habitat.solids);occluders.push(...habitat.occluders);
 const rocks=[[],[]];
 for(const r of COVE_ROCKS){const f=fit(r.kind?assets.rockB:assets.rock),height=r.r*2/(Math.max(f.size.x,f.size.z)/f.size.y);rocks[r.kind].push({...r,y:coveFloor(r.x,r.z),height,color:r.z<-15?'#41666a':r.x>2?'#486d68':'#4c6265'});}
 const reefMat=rockMaterial();for(let k=0;k<2;k++){for(const r of rocks[k]){const mesh=stone({...r,height:r.height,seed:Math.abs(r.x*11+r.z*7)},r.y,reefMat);group.add(mesh);solids.push(mesh);occluders.push(mesh);}rocks[k]=[];}
 for(let i=0;i<22;i++){const x=Math.sin(i*2.34)*7.3,z=2-i*.62;if(Math.abs(x)<1.7)continue;rocks[i%2].push({x,z,y:coveFloor(x,z)-.015,height:.045+(i%4)*.023,angle:i*.43,color:'#7b9390'});}
 batch(assets.rock,rocks[0]);batch(assets.rockB,rocks[1]);group.updateMatrixWorld(true);
 const cast=new T.Raycaster(),down=new T.Vector3(0,-1,0),plantEntries=[[],[]];
 function plant(kind,x,z,height,angle=0){cast.set(new T.Vector3(x,10,z),down);const hit=cast.intersectObjects(solids,false)[0];if(!hit)return;const e={x,z,y:hit.point.y+.014,height,angle};plantEntries[kind].push(e);plants.push(e);}
 // Low plants frame the west ledge; taller fronds stay behind the east encounter.
 for(let i=0;i<9;i++)plant(0,-5.2+Math.sin(i*1.9)*.95,-5.7+Math.cos(i*1.7)*.75,.65+(i%3)*.22,i*.75);
 for(let i=0;i<13;i++)plant(i%4===0?0:1,5.95+Math.sin(i*2.1)*1.05,-8.6+Math.cos(i*1.7)*1.2,1.5+(i%4)*.42,i*.63);
 for(let i=0;i<6;i++)plant(1,7.6+Math.sin(i*1.5)*.7,-3.4-i*.8,1.2+(i%3)*.38,i*.4);
 for(let i=0;i<8;i++)plant(i%2,-8.2+i*2.1,-17.1+Math.sin(i)*.8,1.6+(i%3)*.35,i*.55);
 const reef=createReefDecor(solids,coveFloor);group.add(reef.group);occluders.push(...reef.occluders);
 batch(assets.seaweed,plantEntries[0],true);batch(assets.kelp,plantEntries[1],true);
 const surface=new T.Mesh(new T.PlaneGeometry(70,70),new T.MeshLambertMaterial({color:'#82c3bd',transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));surface.rotation.x=Math.PI/2;surface.position.set(0,8.2,-8);group.add(surface);
 for(let i=0;i<3;i++){const beam=new T.Mesh(new T.PlaneGeometry(1.8,14),new T.MeshBasicMaterial({color:'#e4f2ca',transparent:true,opacity:.026,side:T.DoubleSide,depthWrite:false}));beam.position.set(-2.5+i*3.2,5.7,-4.5-i*4);beam.rotation.z=-.3;group.add(beam);}
 const motes=new T.BufferGeometry(),xyz=[];for(let i=0;i<70;i++)xyz.push(Math.sin(i*5.7)*12,.8+(i%19)*.3,4-(i%23)*1.15);motes.setAttribute('position',new T.Float32BufferAttribute(xyz,3));group.add(new T.Points(motes,new T.PointsMaterial({color:'#d7e9d3',size:.018,transparent:true,opacity:.25,depthWrite:false})));
 group.updateMatrixWorld(true);
 return{group,solids,occluders,colliders:coveObstacles(),update(dt){clock+=Math.min(.05,Math.max(0,dt));time.value=clock;habitat.update(dt);reef.update(dt);},inspect(){return{reef:reef.inspect(),habitat:habitat.inspect(),layout:'anemone crevice / west rock ledge / east kelp edge',rocks:COVE_ROCKS.length,plants:plants.length,batches:batches.length,time:clock};}};
}
