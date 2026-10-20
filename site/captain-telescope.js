import * as T from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js?v=2026-10-20-jeju-rov-v1';
// Frozen from the approved 2026-10-19 motion study at source Idle 0.4 s.
const SOURCE=[[-.4404163360595703,.4438000023365021,.5488030910491943,.5548785328865051],[-.08547022861882801,-.25828564166286144,.22552472346197888,.9354795218400076]];
const HOLD=[[.3748995391963053,-.41721783618109975,-.8071030630224146,-.18429400728475162],[.0003849503163142823,-.051386169417785454,-.36056220179157294,.9313185278965173]];
function telescope(){
 const root=new T.Group();root.name='Captain telescope pose study';
 const navy=new T.MeshStandardMaterial({color:'#284857',roughness:.58}),brass=new T.MeshStandardMaterial({color:'#b7924f',metalness:.65,roughness:.32}),grip=new T.MeshStandardMaterial({color:'#4c3c2d',roughness:.94}),lens=new T.MeshStandardMaterial({color:'#437c89',metalness:.25,roughness:.12});
 function cylinder(r1,r2,h,y,mat){const n=new T.Mesh(new T.CylinderGeometry(r1,r2,h,20),mat);n.position.y=y;root.add(n);return n;}
 // The original cutlass uses local +Y as its axis; reuse its complete grip transform.
 cylinder(.042,.042,.205,.025,grip);
 for(const y of[-.066,-.040,-.014,.012,.038,.064,.09]){const r=new T.Mesh(new T.TorusGeometry(.042,.0016,4,20),grip);r.rotation.x=Math.PI/2;r.position.y=y;root.add(r);}
 cylinder(.048,.048,.018,-.086,brass);cylinder(.033,.033,.045,-.116,navy);cylinder(.036,.036,.018,-.145,brass);
 cylinder(.052,.044,.135,.185,brass);cylinder(.067,.052,.16,.332,navy);cylinder(.071,.071,.025,.42,brass);cylinder(.055,.055,.012,.26,brass);
 cylinder(.063,.063,.008,.432,navy);cylinder(.057,.057,.003,.437,lens);
 root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});return root;
}
function prepareOptics(){
 const tool=telescope(),optics=new T.Group();tool.name='Captain approved telescope';optics.position.y=.05;optics.rotation.z=Math.PI;for(const n of [...tool.children])optics.add(n);tool.add(optics);
 // Merge identical materials once; the approved geometry and local grip remain unchanged.
 tool.updateMatrixWorld(true);const groups=new Map();tool.traverse(n=>{if(!n.isMesh)return;const geometry=n.geometry.clone().applyMatrix4(n.matrixWorld);if(!groups.has(n.material))groups.set(n.material,[]);groups.get(n.material).push(geometry);n.geometry.dispose();});tool.clear();
 for(const[material,geometries]of groups){const mesh=new T.Mesh(mergeGeometries(geometries,false),material);mesh.castShadow=true;mesh.receiveShadow=true;tool.add(mesh);geometries.forEach(g=>g.dispose());}return tool;
}
export function equipCaptainTelescope(actor){
 if(actor.userData.roleEquipment)return actor.userData.roleEquipment;
 const controller=actor.userData.controller,originalUpdate=controller.update.bind(controller);originalUpdate(0,false);
 const bones=['UpperArmR','LowerArmR'].map(n=>actor.getObjectByName(n)),weapon=actor.getObjectByName('Weapon_Cutlass');if(bones.some(n=>!n)||!weapon)throw Error('Captain telescope requires the original captain rig');
 const source=bones.map(n=>n.quaternion.clone()),reference=SOURCE.map(a=>new T.Quaternion().fromArray(a)),authored=HOLD.map(a=>new T.Quaternion().fromArray(a)),identity=new T.Quaternion(),delta=new T.Quaternion(),soft=new T.Quaternion(),weights=[.32,.22];
 const tool=prepareOptics();tool.position.copy(weapon.position);tool.quaternion.copy(weapon.quaternion);tool.scale.copy(weapon.scale);weapon.parent.add(tool);weapon.visible=false;
 let enabled=true,weight=1;
 const normalAction=()=>['Idle','Walk'].includes(controller.inspect().action);
 function restore(){bones.forEach((n,i)=>n.quaternion.copy(source[i]));}
 function apply(){if(!weight)return;bones.forEach((n,i)=>{delta.copy(reference[i]).invert().multiply(source[i]);soft.copy(identity).slerp(delta,weights[i]);const held=delta.copy(authored[i]).multiply(soft).normalize();n.quaternion.copy(source[i]).slerp(held,weight).normalize();});}
 function update(dt,moving){restore();originalUpdate(dt,moving);bones.forEach((n,i)=>source[i].copy(n.quaternion));const holding=enabled&&normalAction();weight=enabled?T.MathUtils.damp(weight,holding?1:0,14,dt):0;if(weight<1e-5)weight=0;if(1-weight<1e-5)weight=1;apply();tool.visible=holding&&weight>.98;}
 const equipment={object:tool,setEnabled(value){const next=!!value;if(next===enabled)return;enabled=next;restore();weight=next&&normalAction()?1:0;apply();tool.visible=next&&normalAction();},inspect(){
  actor.updateWorldMatrix(true,true);const eyepiece=actor.worldToLocal(tool.localToWorld(new T.Vector3(0,.195,0))),objective=actor.worldToLocal(tool.localToWorld(new T.Vector3(0,-.387,0))),grip=tool.getWorldPosition(new T.Vector3()),sourceGrip=weapon.getWorldPosition(new T.Vector3()),box=new T.Box3().setFromObject(tool);let floorClearance=Infinity;for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])floorClearance=Math.min(floorClearance,actor.worldToLocal(new T.Vector3(x,y,z)).y);
  return{role:'captain',tool:tool.name,revision:'2026-10-19-captain-telescope-1',visible:tool.visible,enabled,weight,bone:weapon.parent.name,originalWeaponHidden:!weapon.visible,grip:grip.toArray(),gripError:grip.distanceTo(sourceGrip),floorClearance,eyepiece:eyepiece.toArray(),objective:objective.toArray(),eyepieceForward:eyepiece.z>objective.z,objectiveAft:objective.z<eyepiece.z,sourceActionsPreserved:true,sourceFingerPose:true,holdingArmOverlay:true};
 }};
 controller.update=update;actor.userData.roleEquipment=equipment;apply();return equipment;
}
