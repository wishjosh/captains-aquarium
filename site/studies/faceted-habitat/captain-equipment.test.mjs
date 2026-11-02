import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {GLTFLoader} from './runtime/vendor/GLTFLoader.js';
import {createCaptain} from './runtime/pirate.js';
import {fitCaptainEquipment} from './captain-equipment.mjs';
import {Swimmer} from './captain-swim.mjs';
// CPU checks use the real rig and geometry; texture decoding is unnecessary.
globalThis.ProgressEvent??=class{constructor(type,props){this.type=type;Object.assign(this,props);}};
async function load(){
 const data=JSON.parse(fs.readFileSync(new URL('./runtime/assets/pirate/captain.gltf',import.meta.url),'utf8'));
 delete data.images;delete data.textures;delete data.samplers;
 for(const m of data.materials){if(m.pbrMetallicRoughness){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;}
 return new GLTFLoader().parseAsync(JSON.stringify(data),'');
}
async function rig(armAngle=0){const actor=createCaptain(await load());actor.userData.controller.update(0,false);const root=new T.Group(),tilt=new T.Group(),bones={};root.add(tilt);tilt.add(actor);actor.position.y=-1.06;actor.traverse(n=>{if(n.isBone)bones[n.name]=n;});bones.LowerArmL.rotateZ(armAngle);root.updateMatrixWorld(true);const original=actor.getObjectByName('Ernest'),raw=original.geometry.clone();raw.applyMatrix4(original.matrixWorld);raw.computeBoundingBox();return {root,tilt,actor,bones,raw};}
test('hat parrot preserves the actual authored upright geometry instead of freezing the forearm pose',async()=>{
 const s=await rig(),bounds=s.raw.boundingBox,center=bounds.getCenter(new T.Vector3());
 const expected=s.raw.clone().translate(-center.x,-bounds.min.y,-center.z).rotateY(-Math.PI/2).scale(.64,.64,.64);
 const equipment=fitCaptainEquipment(s),actual=s.actor.getObjectByName('Original parrot on hat').geometry;
 assert.equal(actual.attributes.position.count,944);
 for(let i=0;i<actual.attributes.position.count;i++)assert.ok(new T.Vector3().fromBufferAttribute(actual.attributes.position,i).distanceTo(new T.Vector3().fromBufferAttribute(expected.attributes.position,i))<1e-6);
 actual.computeBoundingBox();const c=actual.boundingBox.getCenter(new T.Vector3());assert.ok(Math.abs(c.x)<1e-6&&Math.abs(c.z)<1e-6);assert.ok(Math.abs(actual.boundingBox.min.y)<1e-6);
 assert.equal(equipment.perch.parent,s.bones.Head);
 const up=new T.Vector3(0,1,0).applyQuaternion(equipment.perch.getWorldQuaternion(new T.Quaternion()));assert.ok(up.distanceTo(new T.Vector3(0,1,0))<1e-5);
});
test('changing the original bird-carrying forearm cannot change the hat bird shape or resting roll',async()=>{
 const a=await rig(),b=await rig(.9);fitCaptainEquipment(a);fitCaptainEquipment(b);
 const ga=a.actor.getObjectByName('Original parrot on hat').geometry.attributes.position,gb=b.actor.getObjectByName('Original parrot on hat').geometry.attributes.position;
 assert.deepEqual([...ga.array],[...gb.array]);
});
test('hat attachment remains stable through rest, turns, ascent and descent while the propeller stays finite',async()=>{
 const s=new Swimmer(await load(),new T.Scene()),seat=s.equipment.perch.position.clone();let time=0;
 for(const [cruise,vertical,turnRate]of [[0,0,0],[1,0,-1.5],[1,0,1.5],[.3,1,0],[.3,-1,0],[0,0,0]])for(let i=0;i<180;i++){
  time+=1/60;s.update(1/60,{time,position:[0,4,0],velocity:[0,vertical,cruise*2.3],forwardSpeed:cruise*2.3,cruise,turnRate,heading:time*.3,state:cruise?'swim':'float'});
  assert.ok(s.equipment.perch.position.distanceTo(seat)<1e-12);
  const r=s.equipment.report();assert.ok([...r.parrotPosition,...r.propellerPosition,r.propellerRadiansPerSecond].every(Number.isFinite));
 }
 assert.equal(s.equipment.perch.parent,s.bones.Head);assert.equal(s.equipment.report().propellerRadiansPerSecond,0);
});
