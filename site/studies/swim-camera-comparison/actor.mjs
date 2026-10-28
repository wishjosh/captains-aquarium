import * as T from '../../vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createCaptain} from '../../pirate.js';
export class Swimmer{
 constructor(asset,scene){
  this.actor=createCaptain(asset);this.root=new T.Group();this.tilt=new T.Group();this.root.add(this.tilt);this.tilt.add(this.actor);this.actor.position.y=-1.06;scene.add(this.root);this.bones={};this.actor.traverse(n=>{if(n.isBone)this.bones[n.name]=n;});this.base=[];this.speed=0;
  this.plate=new T.Mesh(new T.BoxGeometry(.46,.40,.12),new T.MeshStandardMaterial({color:'#705039',roughness:.8}));this.tilt.add(this.plate);this.plate.position.set(0,.20,-.42);
  const mat=new T.MeshStandardMaterial({color:'#bd9c59',metalness:.5,roughness:.4});this.ring=new T.Mesh(new T.TorusGeometry(.15,.035,8,28),mat);this.ring.position.set(0,.28,-.51);this.tilt.add(this.ring);
  this.straps=[];const rope=new T.MeshStandardMaterial({color:'#a18a5d',roughness:.95});for(let i=0;i<8;i++){const radius=i<5?.034:.019;const m=new T.Mesh(new T.CylinderGeometry(radius,radius,1,7),rope);scene.add(m);this.straps.push(m);}
 }
 point(name){return this.bones[name]?.getWorldPosition(new T.Vector3())??new T.Vector3();}
 ik(side,target){const tip=this.bones['Middle1'+side],lower=this.bones['LowerArm'+side],upper=this.bones['UpperArm'+side];if(!tip||!lower||!upper)return;for(let i=0;i<5;i++)for(const bone of [lower,upper]){this.root.updateMatrixWorld(true);const origin=bone.getWorldPosition(new T.Vector3()),a=tip.getWorldPosition(new T.Vector3()).sub(origin).normalize(),b=target.clone().sub(origin).normalize(),delta=new T.Quaternion().setFromUnitVectors(a,b),parent=bone.parent.getWorldQuaternion(new T.Quaternion()),world=bone.getWorldQuaternion(new T.Quaternion());bone.quaternion.copy(parent.invert().multiply(delta).multiply(world));}}
 update(dt,w){
  for(const [b,p,q]of this.base){b.position.copy(p);b.quaternion.copy(q);}this.actor.userData.controller.update(dt,false);this.base=Object.values(this.bones).map(b=>[b,b.position.clone(),b.quaternion.clone()]);
  this.speed+=(Math.hypot(...w.velocity)-this.speed)*(1-Math.exp(-dt*6));this.root.position.fromArray(w.player);this.root.rotation.y=Math.PI-w.bodyYaw;this.tilt.rotation.set(.75+Math.min(.45,this.speed*.3),0,Math.sin(w.time*1.7)*.025);this.root.position.y+=Math.sin(w.time*1.9)*.025;
  this.root.updateMatrixWorld(true);
  for(const side of ['L','R']){const upper=this.bones['UpperLeg'+side],lower=this.bones['LowerLeg'+side],foot=this.bones['Foot'+side];if(!upper||!lower||!foot)continue;const before=lower.matrixWorld.clone(),footBefore=foot.matrixWorld.clone(),kick=Math.sin(w.time*(2.5+this.speed*1.7)+(side==='L'?0:Math.PI))*(.05+this.speed*.065);upper.rotateX(kick);lower.rotateX(Math.max(0,-kick)*.6);this.root.updateMatrixWorld(true);const delta=lower.matrixWorld.clone().multiply(before.invert()),local=foot.parent.matrixWorld.clone().invert().multiply(delta).multiply(footBefore);local.decompose(foot.position,foot.quaternion,foot.scale);}
  const q=w.charge;let left=w.local(-.43,.16,.80,true),right=w.local(.43,.16,.80,true);
  if(q>0){left=w.local(-(.23+q*.45),.18,1.05,true);right=w.local(.23+q*.45,.18,1.05,true);}
  if(['dragging','handoff'].includes(w.phase)){const center=new T.Vector3().fromArray(w.shell);left=center.clone().add(new T.Vector3(-.25,-.12,0)).toArray();right=center.clone().add(new T.Vector3(.25,-.12,0)).toArray();if(w.phase==='handoff'&&w.age>.6)left=w.local(-.43,.16,.8,true);}
  this.ik('L',new T.Vector3().fromArray(left));this.ik('R',new T.Vector3().fromArray(right));this.root.updateMatrixWorld(true);
  const anchor=this.ring.getWorldPosition(new T.Vector3()),knot=new T.Vector3().fromArray(w.local(0,1.48,-.85,true));const points=Array.from({length:6},(_,i)=>{const t=i/5,p=anchor.clone().lerp(knot,t);p.y-=Math.sin(t*Math.PI)*.10;return p;});this.straps.forEach((m,i)=>{const start=i<5?points[i]:knot,end=i<5?points[i+1]:new T.Vector3().fromArray(w.slotAt(i-5));if(i>=5)end.y-=w.slots[i-5]?.36:.32;const d=end.clone().sub(start);m.position.copy(start).add(end).multiplyScalar(.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());});
 }
 report(){return{...this.actor.userData.controller.inspect(),originalRig:true,proceduralPose:true,swimClip:false,bones:Object.keys(this.bones),hands:{left:this.point('Middle1L').toArray(),right:this.point('Middle1R').toArray()}};}
}
