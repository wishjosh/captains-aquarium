import * as T from './vendor/three.module.js?v=2026-10-20-anne-bucket-1';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js?v=2026-10-20-anne-bucket-1';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),up=new T.Vector3(0,1,0);
// Frozen from the approved Anne bucket study at source Idle 0.4 seconds.
const CALIBRATION={"hold":[[0.525990655663083,0.33869348228363305,0.6547975662301364,-0.42409987262603005],[0.4767163567497435,0.25019831766749057,-0.33258448275805996,0.7742930938834272]],"initialShoulder":[0.17535362289545597,1.0929671237825627,-0.5001230815710321],"gripAxis":[-0.565281513236853,0.06544737039906644,0.8222976671266671],"position":[0.0077545032214814125,0.08838067935338284,-0.052787549543202805],"quaternion":[-0.34556449724544064,-0.6669376584629201,-0.5597553873883755,-0.3499330599577879],"scale":[0.6986723308946077,0.6986723236541914,0.698672486029487]};
function bucket(axis){
 const root=new T.Group();root.name='Anne approved stainless feeding bucket';
 const steel=new T.MeshStandardMaterial({color:'#bdc8cf',metalness:.88,roughness:.32}),rimSteel=new T.MeshStandardMaterial({color:'#dce4e8',metalness:.95,roughness:.22}),grip=new T.MeshStandardMaterial({color:'#263a40',roughness:.84});
 const mesh=(g,m,p=[0,0,0])=>{const n=new T.Mesh(g,m);n.position.set(...p);n.castShadow=true;n.receiveShadow=true;root.add(n);return n;};
 const rod=(a,b,r,m)=>{const dir=b.clone().sub(a),n=mesh(new T.CylinderGeometry(r,r,dir.length(),16),m,a.clone().add(b).multiplyScalar(.5).toArray());n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return n;};
 const cy=-.37,profile=[[0,-.15],[.145,-.15],[.195,.15],[.184,.15],[.135,-.137],[0,-.137]].map(p=>new T.Vector2(...p));mesh(new T.LatheGeometry(profile,48),steel,[0,cy,0]);
 for(const[y,r]of[[-.15,.145],[.15,.195]]){const rim=mesh(new T.TorusGeometry(r,.009,8,48),rimSteel,[0,cy+y,0]);rim.rotation.x=Math.PI/2;}
 const baseRing=mesh(new T.TorusGeometry(.151,.004,6,48),steel,[0,-.477,0]);baseRing.rotation.x=Math.PI/2;
 mesh(new T.CylinderGeometry(.171,.165,.012,32),new T.MeshStandardMaterial({color:'#68523a',roughness:1}),[0,-.292,0]);
 const grain=new T.MeshStandardMaterial({color:'#ba9362',roughness:.95});for(let i=0;i<29;i++)mesh(new T.IcosahedronGeometry(.014+(i%3)*.002,0),grain,[Math.sin(i*2.4)*.15*Math.sqrt((i+.5)/29),-.28+Math.sin(i)*.005,Math.cos(i*2.4)*.15*Math.sqrt((i+.5)/29)]);
 const horizontal=axis.clone().setY(0).normalize();rod(axis.clone().multiplyScalar(-.105),axis.clone().multiplyScalar(.105),.072,grip);
 for(const sign of[-1,1]){const top=axis.clone().multiplyScalar(.105*sign),end=horizontal.clone().multiplyScalar(.196*sign);end.y=-.245;const curve=new T.CatmullRomCurve3([top,top.clone().add(new T.Vector3(0,-.045,0)),end.clone().add(new T.Vector3(0,.075,0)),end]);mesh(new T.TubeGeometry(curve,24,.009,8,false),rimSteel);mesh(new T.SphereGeometry(.022,12,8),steel,end.toArray());}
 return root;
}

function batch(group){const materials=new Map();for(const n of [...group.children]){if(!n.isMesh)continue;n.updateMatrix();const g=n.geometry.clone().applyMatrix4(n.matrix);if(!materials.has(n.material))materials.set(n.material,[]);materials.get(n.material).push(g);n.removeFromParent();n.geometry.dispose();}for(const[material,geometries]of materials){const geometry=mergeGeometries(geometries,false),n=new T.Mesh(geometry,material);geometry.computeBoundingBox();n.castShadow=true;n.receiveShadow=true;group.add(n);geometries.forEach(g=>g.dispose());}}
export function equipAnneFeedBucket(actor){
 if(actor.userData.roleEquipment)return actor.userData.roleEquipment;
 const controller=actor.userData.controller,originalUpdate=controller.update.bind(controller);originalUpdate(0,false);
 const bones=['UpperArmL','LowerArmL'].map(n=>actor.getObjectByName(n)),hand=actor.getObjectByName('Middle1L'),weapon=actor.getObjectByName('Weapon_DoubleAxe');if(bones.some(n=>!n)||!hand||!weapon)throw Error('Anne bucket requires the original Anne rig');
 const source=bones.map(n=>n.quaternion.clone()),authored=CALIBRATION.hold.map(a=>Q().fromArray(a)),initialShoulder=V().fromArray(CALIBRATION.initialShoulder),gripAxis=V().fromArray(CALIBRATION.gripAxis).normalize(),tool=bucket(gripAxis),suspension=new T.Group();suspension.name='Bucket suspended at hand grip';
 const grip=tool.children.find(n=>n.material?.color?.getHexString()==='263a40');for(const n of [...tool.children])if(n!==grip)suspension.add(n);batch(suspension);tool.add(suspension);tool.position.fromArray(CALIBRATION.position);tool.quaternion.fromArray(CALIBRATION.quaternion);tool.scale.fromArray(CALIBRATION.scale);hand.add(tool);weapon.visible=false;
 const pose={tool},lastPivot=V(),velocity=V(),acceleration=V();let angle=0,angularVelocity=0,initialized=false,hingeTarget=0,enabled=true;
 const normalAction=()=>['Idle','Walk'].includes(controller.inspect().action);
 function restore(){bones.forEach((n,i)=>n.quaternion.copy(source[i]));}
 function apply(){bones.forEach((n,i)=>n.quaternion.copy(authored[i]));solveArm();actor.updateMatrixWorld(true);}
 function resetSwing(){initialized=false;angle=0;angularVelocity=0;hingeTarget=0;velocity.set(0,0,0);acceleration.set(0,0,0);suspension.quaternion.identity();actor.updateMatrixWorld(true);lastPivot.copy(tool.getWorldPosition(V()));}
 function setWorld(bone,rotation){bone.quaternion.copy(bone.parent.getWorldQuaternion(Q()).invert().multiply(rotation));bone.updateWorldMatrix(false,true);}
 function solveArm(){
  const upper=bones[0],lower=bones[1],hand=actor.getObjectByName('Middle1L'),weapon=actor.getObjectByName('Weapon_DoubleAxe');actor.updateMatrixWorld(true);
  const shoulderNow=actor.worldToLocal(upper.getWorldPosition(V())),delta=shoulderNow.clone().sub(initialShoulder),target=actor.localToWorld(new T.Vector3(.56+delta.x*.35,.78+delta.y*.65,-.28+delta.z*.25)),s=upper.getWorldPosition(V()),e=lower.getWorldPosition(V()),w=hand.getWorldPosition(V()),a=s.distanceTo(e),b=e.distanceTo(w),axis=target.clone().sub(s),d=T.MathUtils.clamp(axis.length(),Math.abs(a-b)+.0001,a+b-.0001);axis.normalize();
  const bend=new T.Vector3(0,-1,-.3).applyQuaternion(actor.getWorldQuaternion(Q()));bend.addScaledVector(axis,-bend.dot(axis)).normalize();const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),goalElbow=s.clone().addScaledVector(axis,along).addScaledVector(bend,height),goalWrist=s.clone().addScaledVector(axis,d);
  setWorld(upper,Q().setFromUnitVectors(e.clone().sub(s).normalize(),goalElbow.clone().sub(s).normalize()).multiply(upper.getWorldQuaternion(Q())));const actualE=lower.getWorldPosition(V()),actualW=hand.getWorldPosition(V());setWorld(lower,Q().setFromUnitVectors(actualW.sub(actualE).normalize(),goalWrist.clone().sub(actualE).normalize()).multiply(lower.getWorldQuaternion(Q())));
  const forearm=hand.getWorldPosition(V()).sub(lower.getWorldPosition(V())).normalize(),current=new T.Vector3(0,0,1).applyQuaternion(weapon.getWorldQuaternion(Q())),wanted=new T.Vector3(0,0,1).applyQuaternion(actor.getWorldQuaternion(Q()));current.addScaledVector(forearm,-current.dot(forearm)).normalize();wanted.addScaledVector(forearm,-wanted.dot(forearm)).normalize();const twist=Math.atan2(forearm.dot(current.clone().cross(wanted)),current.dot(wanted));setWorld(lower,Q().setFromAxisAngle(forearm,twist).multiply(lower.getWorldQuaternion(Q())));
 }
 function advanceSwing(dt){
  const pivot=pose.tool.getWorldPosition(V());if(pivot.distanceTo(lastPivot)>1){lastPivot.copy(pivot);velocity.set(0,0,0);acceleration.set(0,0,0);initialized=false;}const nextVelocity=pivot.clone().sub(lastPivot).divideScalar(Math.max(dt,1e-6));
  if(initialized){const raw=nextVelocity.clone().sub(velocity).divideScalar(Math.max(dt,1e-6));raw.clampLength(0,7);acceleration.lerp(raw,1-Math.exp(-dt*9));}else initialized=true;
  velocity.copy(nextVelocity);lastPivot.copy(pivot);
  const rootQ=pose.tool.getWorldQuaternion(Q()),axis=gripAxis.clone().applyQuaternion(rootQ),currentUp=up.clone().applyQuaternion(rootQ),desiredUp=new T.Vector3(acceleration.x*.075,1,acceleration.z*.075).normalize();
  currentUp.addScaledVector(axis,-currentUp.dot(axis)).normalize();desiredUp.addScaledVector(axis,-desiredUp.dot(axis)).normalize();hingeTarget=T.MathUtils.clamp(Math.atan2(axis.dot(currentUp.clone().cross(desiredUp)),currentUp.dot(desiredUp)),-.14,.14);
  const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;for(let i=0;i<steps;i++){angularVelocity+=(64*(hingeTarget-angle)-12.8*angularVelocity)*h;angle+=angularVelocity*h;}
  suspension.quaternion.setFromAxisAngle(gripAxis,angle);actor.updateMatrixWorld(true);
 }

 function update(dt,moving){
  restore();originalUpdate(dt,moving);bones.forEach((n,i)=>source[i].copy(n.quaternion));const active=enabled&&normalAction();tool.visible=active;
  if(!active){resetSwing();return;}apply();if(dt>0)advanceSwing(dt);else resetSwing();
 }
 const equipment={object:tool,suspension,setEnabled(value){const next=!!value;if(next===enabled)return;enabled=next;restore();tool.visible=enabled&&normalAction();if(tool.visible)apply();resetSwing();},inspect(){
  actor.updateMatrixWorld(true);const pivot=tool.getWorldPosition(V()),expected=hand.localToWorld(V().fromArray(CALIBRATION.position)),bucketUp=up.clone().applyQuaternion(suspension.getWorldQuaternion(Q())),inv=actor.matrixWorld.clone().invert();let floorClearance=Infinity,meshCount=0;
  suspension.traverse(n=>{if(!n.isMesh)return;meshCount++;const b=n.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])floorClearance=Math.min(floorClearance,V().set(x,y,z).applyMatrix4(n.matrixWorld).applyMatrix4(inv).y);});
  return{role:'management',tool:tool.name,revision:'2026-10-20-anne-bucket-1',visible:tool.visible,enabled,carrying:true,weight:tool.visible?1:0,bone:hand.name,originalWeaponHidden:!weapon.visible,grip:pivot.toArray(),gripError:pivot.distanceTo(expected),floorClearance,upDot:bucketUp.y,hingeAngle:angle,hingeTarget,meshCount:meshCount+1,sourceActionsPreserved:true,sourceFingerPose:true,holdingArmOverlay:true};
 }};
 controller.update=update;actor.userData.roleEquipment=equipment;apply();resetSwing();return equipment;
}
