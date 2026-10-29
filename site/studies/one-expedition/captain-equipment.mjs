import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {damp,clamp} from './core.mjs';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function fitCaptainEquipment(swimmer){
 const {actor,tilt,bones}=swimmer,bird=actor.getObjectByName('Ernest'),head=bones.Head,foot=bones.FootR;
 if(!bird?.isSkinnedMesh||!head||!foot)throw Error('Original parrot, head and right prosthetic foot are required');
 swimmer.root.updateMatrixWorld(true);bird.skeleton.update();
 const geo=bird.geometry.clone(),p=geo.attributes.position,v=V();
 for(let i=0;i<p.count;i++){bird.getVertexPosition(i,v);bird.localToWorld(v);tilt.worldToLocal(v);p.setXYZ(i,v.x,v.y,v.z);}geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.computeVertexNormals();geo.computeBoundingBox();const bounds=geo.boundingBox,feet=V();let footCount=0;for(let i=0;i<p.count;i++)if(p.getY(i)<bounds.min.y+.03){feet.x+=p.getX(i);feet.z+=p.getZ(i);footCount++;}feet.divideScalar(footCount||1);geo.translate(-feet.x,-bounds.min.y,-feet.z);geo.scale(.64,.64,.64);geo.computeBoundingSphere();
 const perch=new T.Group();perch.name='Hat parrot';const parrot=new T.Mesh(geo,bird.material);parrot.name='Original parrot on hat';parrot.castShadow=true;perch.add(parrot);tilt.add(perch);
 // Place the feet on the actual crown surface, in the original upright pose.
 const h=tilt.worldToLocal(head.getWorldPosition(V())),origin=tilt.localToWorld(V(h.x,3,h.z)),down=V(0,-1,0).transformDirection(tilt.matrixWorld),cast=new T.Raycaster(origin,down);const bodies=[];actor.traverse(n=>{if(n.isSkinnedMesh&&n!==bird){n.skeleton.update();bodies.push(n);}});const hit=cast.intersectObjects(bodies,false)[0];if(!hit)throw Error('Hat crown surface not found');const crown=tilt.worldToLocal(hit.point.clone());perch.position.copy(crown);perch.position.y+=.008;head.attach(perch);const perchBase=perch.quaternion.clone();bird.visible=false;bird.raycast=()=>{};
 actor.traverse(n=>{if(n.isMesh&&!n.visible)n.raycast=()=>{};});
 // Reuse the prosthetic's actual palette and rough finish, not a separate metal material.
 const body=bodies.find(n=>n.visible&&n.skeleton.bones.includes(foot)),wood=body.material.clone(),uv=body.geometry.attributes.uv,weights=body.geometry.attributes.skinWeight,indices=body.geometry.attributes.skinIndex,footIndex=body.skeleton.bones.indexOf(foot);let best=-1,woodVertex=0;
 for(let i=0;i<weights.count;i++){let influence=0;for(let j=0;j<4;j++)if(indices.getComponent(i,j)===footIndex)influence+=weights.getComponent(i,j);if(influence>best){best=influence;woodVertex=i;}}
 const woodUV=new T.Vector2(uv.getX(woodVertex),uv.getY(woodVertex));wood.metalness=0;wood.roughness=1;
 const wooden=geometry=>{const tex=geometry.attributes.uv;for(let i=0;i<tex.count;i++)tex.setXY(i,woodUV.x,woodUV.y);const n=new T.Mesh(geometry,wood);n.castShadow=true;return n;};
 const motor=new T.Group();motor.name='Right peg-leg auxiliary propeller';tilt.add(motor);motor.position.copy(tilt.worldToLocal(foot.getWorldPosition(V())));
 const spindle=wooden(new T.CylinderGeometry(.035,.03,.065,7));spindle.position.y=-.025;motor.add(spindle);
 const rotor=new T.Group();rotor.position.y=-.065;rotor.rotation.y=.45;motor.add(rotor);
 // Three swept blades: a real spanwise twist and shallow cup, with rounded tips.
 const radial=12,across=8,stride=across+1,layer=(radial+1)*stride,positions=[],texcoords=[],triangles=[];
 for(let face=0;face<2;face++)for(let i=0;i<=radial;i++)for(let j=0;j<=across;j++){
  const u=i/radial,v=j/across*2-1,r=.025+.137*u,width=.010*(1-u)+.044*Math.pow(Math.sin(Math.PI*u),.65),t=v*width,pitch=.67-.31*u,sweep=.042*u*u;
  const cup=.010*Math.sin(Math.PI*u)*(1-v*v),thickness=.006*(.7+.3*Math.sin(Math.PI*u))*(face===0?1:-1);
  positions.push(r,t*Math.sin(pitch)+cup+thickness,t*Math.cos(pitch)+sweep);texcoords.push(0,0);
 }
 for(let face=0;face<2;face++)for(let i=0;i<radial;i++)for(let j=0;j<across;j++){const a=face*layer+i*stride+j,b=a+stride;if(face===0)triangles.push(a,a+1,b,a+1,b+1,b);else triangles.push(a,b,a+1,a+1,b,b+1);}
 const edge=[];for(let j=0;j<=across;j++)edge.push(j);for(let i=1;i<=radial;i++)edge.push(i*stride+across);for(let j=across-1;j>=0;j--)edge.push(radial*stride+j);for(let i=radial-1;i>0;i--)edge.push(i*stride);
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];triangles.push(a,a+layer,b,b,a+layer,b+layer);}
 const bladeGeo=new T.BufferGeometry();bladeGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));bladeGeo.setAttribute('uv',new T.Float32BufferAttribute(texcoords,2));bladeGeo.setIndex(triangles);bladeGeo.computeVertexNormals();bladeGeo.computeBoundingSphere();
 for(let i=0;i<3;i++){const blade=wooden(bladeGeo);blade.rotation.y=i*Math.PI*2/3;rotor.add(blade);}
 const hub=wooden(new T.CylinderGeometry(.037,.032,.032,8));rotor.add(hub);foot.attach(motor);
 let speed=0;const objects=[parrot,...motor.children];
 return{perch,motor,objects,update(dt,w){const target=w.forwardSpeed>.04?2.4*clamp(w.forwardSpeed/2.3,0,1):0;speed=damp(speed,target,5,dt);if(speed<.025&&target===0)speed=0;rotor.rotation.y=(rotor.rotation.y+speed*dt)%(Math.PI*2);perch.quaternion.copy(perchBase);swimmer.root.updateMatrixWorld(true);},report(){return{parrot:'original mesh, scaled 0.64, feet on central crown',prosthetic:'right',parrotPosition:perch.getWorldPosition(V()).toArray(),propellerPosition:motor.getWorldPosition(V()).toArray(),propellerRadiansPerSecond:speed,guardDiameter:0,bladeCount:3,bladeShape:"swept, twisted, rounded tip",bladeRadius:.168,woodPaletteUV:woodUV.toArray(),maxTurnsPerSecond:2.4/(Math.PI*2)};}};
}
