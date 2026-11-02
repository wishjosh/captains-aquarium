import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {createCaptain} from './runtime/pirate.js';
import {damp,clamp} from './core.mjs';
import {fitCaptainEquipment} from './captain-equipment.mjs?v=2026-11-01-extension-1';
import {DepthPose} from './depth-pose.mjs?v=2026-11-02-stroke-1';
import {strokePose,STROKE_PERIOD,travelPitch} from './stroke-cycle.mjs?v=2026-11-02-stroke-1';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export class Swimmer{
 constructor(asset,scene,floor=()=>-Infinity){
  this.floor=floor;
  this.actor=createCaptain(asset);this.actor.userData.controller.update(0,false);this.root=new T.Group();this.tilt=new T.Group();this.root.add(this.tilt);this.tilt.add(this.actor);this.actor.position.y=-1.06;scene.add(this.root);this.bones={};this.actor.traverse(n=>{if(n.isBone)this.bones[n.name]=n;});
  this.base=Object.values(this.bones).map(b=>[b,b.position.clone(),b.quaternion.clone()]);this.depthPose=new DepthPose();this.depth={rise:0,sink:0,amount:0,blend:0};this.phase=0;this.stroke=strokePose(0);this.swimAmount=0;this.lean=.16;this.bank=0;this.lastHands={};this.equipment=fitCaptainEquipment(this);
 }
 aim(bone,from,to){const q=bone.getWorldQuaternion(new T.Quaternion()),parent=bone.parent.getWorldQuaternion(new T.Quaternion());const delta=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());bone.quaternion.copy(parent.invert().multiply(delta).multiply(q));this.root.updateMatrixWorld(true);}
 arm(side,target,pole){const upper=this.bones['UpperArm'+side],lower=this.bones['LowerArm'+side],tip=this.bones['Middle1'+side];if(!upper||!lower||!tip)return;
  const a=upper.getWorldPosition(V()),b=lower.getWorldPosition(V()),c=tip.getWorldPosition(V()),l1=a.distanceTo(b),l2=b.distanceTo(c);const direction=target.clone().sub(a),d=clamp(direction.length(),Math.abs(l1-l2)+.02,l1+l2-.02);direction.normalize();const end=a.clone().addScaledVector(direction,d),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));const bend=pole.clone().sub(a);bend.addScaledVector(direction,-bend.dot(direction)).normalize();const elbow=a.clone().addScaledVector(direction,along).addScaledVector(bend,height);
  this.aim(upper,b.sub(a),elbow.clone().sub(a));const now=lower.getWorldPosition(V());this.aim(lower,tip.getWorldPosition(V()).sub(now),end.clone().sub(now));this.lastHands[side]=tip.getWorldPosition(V()).toArray();
 }
 update(dt,w){
  for(const[b,p,q]of this.base){b.position.copy(p);b.quaternion.copy(q);}
  if(dt===0&&w.time===0){this.depthPose=new DepthPose();this.phase=0;this.stroke=strokePose(0);this.swimAmount=0;this.lean=.16;}
  let floor=-Infinity;for(const [dx,dz]of [[0,0],[.8,0],[-.8,0],[0,.8],[0,-.8]])floor=Math.max(floor,this.floor(w.position[0]+dx,w.position[2]+dz));
  const depth=this.depth=this.depthPose.update(dt,w.velocity[1],w.cruise,w.position[1]-floor);
  const swim=w.cruise,reverse=clamp(-w.forwardSpeed/.45,0,1),brake=w.state==='brake'?1:0;
  const active=Math.max(swim,depth.amount);this.swimAmount=damp(this.swimAmount,active,5,dt);
  this.phase+=dt*(2*Math.PI/STROKE_PERIOD)*Math.max(.10,active);const cycle=this.phase%(Math.PI*2),pose=this.stroke=strokePose(this.phase),stroke=pose.kick;
  this.lean=damp(this.lean,(.16+swim*1.32)*(1-depth.dive-depth.rise)+travelPitch(w.forwardSpeed,w.velocity[1])*(depth.dive+depth.rise)-brake*.20-reverse*.12,4,dt);this.bank=damp(this.bank,-w.turnRate*swim*.20,5,dt);
  this.root.position.fromArray(w.position);this.root.position.y+=Math.sin(w.time*1.6)*.018;this.root.rotation.y=Math.PI-w.heading;this.tilt.rotation.set(this.lean,0,this.bank);
  this.bones.Abdomen?.rotateX(-.02*active);this.bones.Torso?.rotateX(-.04*active);
  const forwardLook=swim*(1-.6*depth.amount);
  this.bones.Neck?.rotateX(-.14*forwardLook-.30*depth.rise);this.bones.Head?.rotateX(-.24*forwardLook-.40*depth.rise);
  this.bones.Torso?.rotateX(.12*Math.max(0,depth.dive-depth.trail));this.bones.Torso?.rotateY(-w.turnRate*.06);
  this.root.updateMatrixWorld(true);
  for(const side of ['L','R']){
   const sign=side==='L'?1:-1,upper=this.bones['UpperLeg'+side],lower=this.bones['LowerLeg'+side],foot=this.bones['Foot'+side];if(!upper||!lower||!foot)continue;
   const before=lower.matrixWorld.clone(),footBefore=foot.matrixWorld.clone();
   const kick=pose.kick,flutter=Math.sin(w.time*2.3+(side==='L'?0:Math.PI)),assisted=side==='R';
   upper.rotateX(.12*(1-active)+active*(assisted?.035:.12)*kick+reverse*.10*flutter+w.turnRate*sign*.06);
   upper.rotateZ(sign*(.035+active*(assisted?.025:.12)*kick));
   lower.rotateX(-(.22*(1-active)+active*(assisted?.09:.52)*kick+reverse*.12*(1+flutter)));
   upper.rotateX((depth.trail-depth.dive)*.65);
   this.root.updateMatrixWorld(true);
   // The source rig has root-parented feet: move each with its shin to preserve ankles.
   const delta=lower.matrixWorld.clone().multiply(before.invert()),local=foot.parent.matrixWorld.clone().invert().multiply(delta).multiply(footBefore);local.decompose(foot.position,foot.quaternion,foot.scale);this.root.updateMatrixWorld(true);
   const floatX=.43+Math.sin(w.time*2.1)*.05,floatY=-.22+Math.cos(w.time*2.1)*.04;
   const hand=V(sign*floatX,floatY,.27);
   hand.lerp(V(sign*pose.hand[0],pose.hand[1],pose.hand[2]),this.swimAmount);
   hand.z+=reverse*.12*Math.sin(w.time*3.1)+w.turnRate*sign*.12;hand.x+=sign*Math.abs(w.turnRate)*.05;hand.y+=brake*.12;
   const pole=V(sign*(pose.stage==='recover'?.48:.90),.10+.30*active,.40);this.arm(side,this.tilt.localToWorld(hand),this.tilt.localToWorld(pole));
  }
  this.root.updateMatrixWorld(true);this.equipment.update(dt,w);
 }
 report(){return {equipment:this.equipment.report(),source:'original captain rig',swimPose:'authored reach-catch-pull-glide-recover cycle',stroke:{...this.stroke,period:STROKE_PERIOD,amount:this.swimAmount},lean:this.lean,bank:this.bank,depth:{...this.depth},phase:this.phase,landmarks:Object.fromEntries(['Head','Abdomen','FootL','FootR'].filter(n=>this.bones[n]).map(n=>[n,this.bones[n].getWorldPosition(V()).toArray()])),hands:this.lastHands,bones:Object.keys(this.bones)};}
}



