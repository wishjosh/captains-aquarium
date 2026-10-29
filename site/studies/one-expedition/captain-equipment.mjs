import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {damp,clamp} from './core.mjs';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function fitCaptainEquipment(swimmer){
 const {actor,tilt,bones}=swimmer,bird=actor.getObjectByName('Ernest'),head=bones.Head,foot=bones.FootR;
 if(!bird?.isSkinnedMesh||!head||!foot)throw Error('Original parrot, head and right prosthetic foot are required');
 swimmer.root.updateMatrixWorld(true);bird.skeleton.update();
 const geo=bird.geometry.clone(),p=geo.attributes.position,v=V();
 for(let i=0;i<p.count;i++){bird.getVertexPosition(i,v);bird.localToWorld(v);tilt.worldToLocal(v);p.setXYZ(i,v.x,v.y,v.z);}geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.computeVertexNormals();geo.computeBoundingBox();const bounds=geo.boundingBox,center=bounds.getCenter(V());geo.translate(-center.x,-bounds.min.y,-center.z);geo.scale(.64,.64,.64);geo.computeBoundingSphere();
 const perch=new T.Group();perch.name='Hat parrot';const parrot=new T.Mesh(geo,bird.material);parrot.name='Original parrot on hat';parrot.castShadow=true;perch.add(parrot);tilt.add(perch);
 // Place the feet on the actual crown surface, in the original upright pose.
 const h=tilt.worldToLocal(head.getWorldPosition(V())),origin=tilt.localToWorld(V(h.x,3,h.z)),down=V(0,-1,0).transformDirection(tilt.matrixWorld),cast=new T.Raycaster(origin,down);const bodies=[];actor.traverse(n=>{if(n.isSkinnedMesh&&n!==bird){n.skeleton.update();bodies.push(n);}});const hit=cast.intersectObjects(bodies,false)[0];if(!hit)throw Error('Hat crown surface not found');const crown=tilt.worldToLocal(hit.point.clone());for(const body of bodies){for(let i=0;i<body.geometry.attributes.position.count;i++){body.getVertexPosition(i,v);body.localToWorld(v);tilt.worldToLocal(v);if(Math.abs(v.x-h.x)<.1&&v.z<h.z-.08&&v.y>crown.y)crown.copy(v);}}perch.position.copy(crown);perch.position.y+=.008;head.attach(perch);const perchBase=perch.quaternion.clone();bird.visible=false;bird.raycast=()=>{};
 actor.traverse(n=>{if(n.isMesh&&!n.visible)n.raycast=()=>{};});
 const brass=new T.MeshStandardMaterial({color:'#b8944e',roughness:.48,metalness:.45}),housing=new T.MeshStandardMaterial({color:'#28585a',roughness:.58,metalness:.25});
 const motor=new T.Group();motor.name='Right peg-leg auxiliary propeller';tilt.add(motor);motor.position.copy(tilt.worldToLocal(foot.getWorldPosition(V())));
 const mesh=(geometry,material,y=0)=>{const n=new T.Mesh(geometry,material);n.position.y=y;n.castShadow=true;motor.add(n);return n;};
 mesh(new T.CylinderGeometry(.048,.052,.13,10),housing,-.015);
 const collar=mesh(new T.TorusGeometry(.052,.012,6,16),brass,.055);collar.rotation.x=Math.PI/2;
 for(const y of [-.052,-.105]){const rim=mesh(new T.TorusGeometry(.123,.014,6,20),housing,y);rim.rotation.x=Math.PI/2;}
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,strut=mesh(new T.BoxGeometry(.018,.055,.085),brass,-.079);strut.position.x=Math.sin(a)*.083;strut.position.z=Math.cos(a)*.083;strut.rotation.y=a;}
 const rotor=new T.Group();rotor.position.y=-.08;motor.add(rotor);
 const shape=new T.Shape();shape.moveTo(.018,-.012);shape.bezierCurveTo(.052,-.045,.093,-.033,.108,-.01);shape.quadraticCurveTo(.08,.022,.025,.015);shape.closePath();const bladeGeo=new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:false,curveSegments:4});bladeGeo.rotateX(Math.PI/2);
 for(let i=0;i<3;i++){const blade=new T.Mesh(bladeGeo,brass);blade.rotation.y=i*Math.PI*2/3;blade.castShadow=true;rotor.add(blade);}
 const hub=new T.Mesh(new T.SphereGeometry(.032,10,6),brass);hub.scale.y=.55;rotor.add(hub);foot.attach(motor);
 let speed=0;const objects=[parrot,...motor.children];
 return{perch,motor,objects,update(dt,w){const target=w.forwardSpeed>.04?20*clamp(w.forwardSpeed/2.3,0,1):0;speed=damp(speed,target,5,dt);if(speed<.025&&target===0)speed=0;rotor.rotation.y=(rotor.rotation.y+speed*dt)%(Math.PI*2);perch.quaternion.copy(perchBase);swimmer.root.updateMatrixWorld(true);},report(){return{parrot:'original mesh, scaled 0.64, attached to hat',prosthetic:'right',parrotPosition:perch.getWorldPosition(V()).toArray(),propellerPosition:motor.getWorldPosition(V()).toArray(),propellerRadiansPerSecond:speed,guardDiameter:.274};}};
}
