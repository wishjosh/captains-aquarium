import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from './runtime/vendor/three.module.js';
import {GLTFLoader} from './runtime/vendor/GLTFLoader.js';
import {DISCOVERY_PATH,passageX,passageBand,passageHeight,PASSAGE_PATCHES,discoveryPassageHint} from './discovery-route.mjs';
import {createCoveScene} from './cove-scene.mjs';import {reefFloor,ReefSwimWorld,clearFollowerSeabed} from './reef-terrain.mjs';
import {RegionSchool} from './region-school.mjs';import {ReturnPilot,companionsReady} from './return-pilot.mjs';import {RETURN_SITE} from './return-site-config.mjs';
import {clamp,wrap} from './core.mjs';import {Expedition,emptyRecord} from './expedition.mjs';
async function load(name){const b=fs.readFileSync(new URL('./assets/'+name,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const assets={rockModules:await load('rock-modules.glb'),softForms:await load('soft-forms.glb')};
test('the new passage leaves the original close habitat and second/third habitat floors untouched, with continuous ends',()=>{
 for(const z of [-60,-35,-32,-15,-14,-6,12])for(const x of [-20,-6,0,6,20]){assert.equal(passageBand(x,z),0);assert.equal(passageHeight(x,z,1.7),1.7);}
 for(const z of [-31.25,-15])for(let x=-15;x<=5;x++)assert.ok(Math.abs(passageHeight(x,z+1e-4,1.7)-passageHeight(x,z-1e-4,1.7))<1e-5);
 for(let z=-16;z>=-30;z-=.1){const x=passageX(z);assert.ok(Number.isFinite(reefFloor(x,z)));assert.ok(reefFloor(x,z)<.1);}
});
test('first-site guidance follows discovery or observation without requiring collection, and stays out of other places',()=>{
 const p=[1.55,2.5,-1.3];assert.equal(discoveryPassageHint(p),null);
 for(const state of [{discoveries:new Set([1])},{observations:new Set([0])},{members:[{id:2,enchanted:true}]}])assert.match(discoveryPassageHint(p,state),/모래 물길/);
 assert.equal(discoveryPassageHint(p,{discoveries:new Set([4])}),null);assert.equal(discoveryPassageHint([3,3,-59]),null);assert.equal(discoveryPassageHint([19,3,-20]),null);
 const members=Array.from({length:9},(_,id)=>({id,enchanted:id>=3&&id<6}));assert.match(discoveryPassageHint([-2,3,-35],{members}),/모두 함께/);assert.doesNotMatch(discoveryPassageHint([-2,3,-35],{members}),/찾아/);
});
test('new coral cues sit on actual rock triangles and the center passage clears every collision volume',()=>{
 const s=createCoveScene(assets,{streaming:true}),ray=new T.Raycaster();for(let i=0;i<12;i++)s.update(.016,[-5,2.5,-20]);s.group.updateMatrixWorld(true);
 for(const patch of PASSAGE_PATCHES){const coral=s.group.getObjectByName('Corals on '+patch.id);assert(coral);assert.equal(coral.count,patch.corals.length);
  const rocks=s.solids.filter(m=>m.name==='Connected '+patch.id+' reef');assert.equal(rocks.length,patch.rocks.length);
  for(let i=0;i<coral.count;i++){const m=new T.Matrix4();coral.getMatrixAt(i,m);const anchor=new T.Vector3().setFromMatrixPosition(m);coral.localToWorld(anchor);ray.set(new T.Vector3(anchor.x,10,anchor.z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(rocks,false)[0];assert(hit);assert.ok(Math.abs(anchor.y-(hit.point.y-.03))<1e-5);}
 }
 for(let z=-10;z>=-32;z-=.1){const x=passageX(z);assert.ok(s.colliders.every(o=>Math.hypot(x-o[0],z-o[1])>o[2]+.85));}
});
test('the next coral shelf is occluded before the bend and revealed after moving along the passage',()=>{
 const s=createCoveScene(assets,{streaming:true}),ray=new T.Raycaster();
 const visible=z=>{const x=passageX(z),y=2.5;for(let i=0;i<10;i++)s.update(.016,[x,y,z]);s.group.updateMatrixWorld(true);const coral=s.group.getObjectByName('Corals on bend');coral.computeBoundingBox();const target=coral.boundingBox.getCenter(new T.Vector3()),camera=new T.Vector3(x+.33,y+.12+6.8*Math.sin(.22),z+6.8*Math.cos(.22)),delta=target.clone().sub(camera);ray.set(camera,delta.clone().normalize());ray.far=delta.length()-.2;return !ray.intersectObjects(s.solids,false).length;};
 assert.equal(visible(-10),false);assert.equal(visible(-23),true);assert.equal(visible(-29),true);
});
test('the passage triangles match movement samples and its cue meshes regenerate once after unloading',()=>{
 const s=createCoveScene(assets,{streaming:true}),ray=new T.Raycaster();let signatures;
 for(const position of [[-5,2.5,-20],[3,3,-70],[-5,2.5,-20]]){for(let i=0;i<12;i++)s.update(.016,position);s.group.updateMatrixWorld(true);if(position[2]===-70){assert(!s.group.getObjectByName('Corals on passage-entry'));continue;}
  const current=PASSAGE_PATCHES.map(p=>{const matches=[];s.group.traverse(o=>{if(o.name==='Corals on '+p.id)matches.push(o);});assert.equal(matches.length,1);return [...matches[0].instanceMatrix.array];});if(signatures)assert.deepEqual(current,signatures);signatures=current;
  const tiles=s.solids.filter(o=>o.name.startsWith('Seabed tile '));for(let z=-16;z>=-31;z-=.35){const x=passageX(z);ray.set(new T.Vector3(x,12,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(tiles,false)[0];assert(hit);assert.ok(Math.abs(hit.point.y-reefFloor(x,z))<1e-5);}
 }
});
test('a captain can follow the curved route, collect at the second shelf and finish a companion return',()=>{
 const s=createCoveScene(assets,{streaming:true}),w=new ReefSwimWorld({maxForward:2.3},{expanded:true});w.obstacles=s.colliders;w.position=[1.55,2.5,-6];
 for(const [x,z]of DISCOVERY_PATH.slice(1)){let reached=false;for(let i=0;i<1200;i++){const dx=x-w.position[0],dz=z-w.position[2],distance=Math.hypot(dx,dz);if(distance<.6){reached=true;break;}const error=wrap(Math.atan2(dx,-dz)-w.heading);w.step(1/60,{x:clamp(error*1.7),z:Math.min(.8,distance)*Math.max(0,Math.cos(error))**3,y:clamp((2.5-w.position[1])*1.8)});assert.ok(w.position.every(Number.isFinite));assert.ok(w.position[1]>=reefFloor(w.position[0],w.position[2])+1.349);}assert(reached,JSON.stringify({waypoint:[x,z],position:w.position}));}
 const school=new RegionSchool(9),trip=new Expedition(emptyRecord(),{maxCount:9});trip.begin();trip.discover(3);trip.observe(3);school.enchant(3);school.members[3].state='following';school.members[3].position=school.goal(school.members[3],w);
 const pilot=new ReturnPilot();pilot.select();trip.returnToBoat();for(let i=0;i<8400&&pilot.phase==='approaching';i++){w.step(1/60,{...pilot.control(1/60,{},w,RETURN_SITE.home),speedLimit:1.7});school.step(1/60,w);clearFollowerSeabed(school.members);assert.ok(school.members[3].position[1]>=reefFloor(school.members[3].position[0],school.members[3].position[2])+.319);}assert.equal(pilot.phase,'choice');for(let i=0;i<600;i++){w.step(1/60,{});school.step(1/60,w);clearFollowerSeabed(school.members);}assert(companionsReady(school.members,w.position));assert(trip.dock(school.members,w.position));trip.step(2);assert.equal(trip.stage,'complete');assert.equal(trip.record.trips,1);assert.equal(trip.record.collected,1);assert.equal(trip.result.observed,1);
});
