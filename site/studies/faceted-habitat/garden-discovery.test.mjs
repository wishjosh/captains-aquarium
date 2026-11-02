import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from './runtime/vendor/three.module.js';
import {GLTFLoader} from './runtime/vendor/GLTFLoader.js';
import {GardenDiscovery,GARDEN_PATH,gardenSand} from './garden-discovery.mjs';
import {createGardenTrial} from './garden-scene.mjs';import {createCoveScene} from './cove-scene.mjs';import {recipe} from './habitat-layout.mjs';
import {ReefSwimWorld,reefFloor,clearFollowerSeabed} from './reef-terrain.mjs';
import {clamp,wrap} from './core.mjs';import {ReturnPilot,companionsReady} from './return-pilot.mjs';import {RETURN_SITE} from './return-site-config.mjs';import {RegionSchool} from './region-school.mjs';
async function load(name){const b=fs.readFileSync(new URL('./assets/'+name,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const pufferBytes=fs.readFileSync(new URL('./runtime/assets/fish/Puffer.glb',import.meta.url));const puffer=await new GLTFLoader().parseAsync(pufferBytes.buffer.slice(pufferBytes.byteOffset,pufferBytes.byteOffset+pufferBytes.byteLength),'');
const assets={rockModules:await load('rock-modules.glb'),softForms:await load('soft-forms.glb'),puffer};
function setup(){const layout=recipe();layout.rocks=layout.rocks.filter(r=>r.z>-5);const scenery=createCoveScene(assets,{layout,sandMask:gardenSand}),garden=createGardenTrial(assets),world=new ReefSwimWorld({maxForward:2.3},{expanded:true});world.obstacles=[...scenery.colliders,...garden.colliders];return{scenery,garden,world};}
function view(p,aspect=16/9){const c=new T.PerspectiveCamera(49,aspect,.05,100);c.position.set(p[0]+.33,p[1]+1.65,p[2]+6.6);c.lookAt(p[0],p[1]+.12,p[2]);c.updateMatrixWorld(true);return c;}
test('discovery requires a sustained visible nearby interior sighting; clues and route are not artificial gates',()=>{
 const m=new GardenDiscovery();for(let i=0;i<180;i++)m.step(1/60,{position:[0,2.5,-13],visible:false});assert.equal(m.found,false);
 for(let i=0;i<40;i++)m.step(1/60,{position:[0,2.5,-13],visible:true});m.step(1/60,{position:[0,2.5,-13],visible:false});assert.equal(m.foundAge,0);
 for(let i=0;i<70;i++)m.step(1/60,{position:[0,2.5,-13],visible:true});assert(m.found);assert.equal(m.clueSeen,false);assert.equal(m.routeUsed,false);assert.equal(m.events.filter(e=>e==='found').length,1);
});
test('a missed glimpse returns after leaving; approaching triggers retreat and quiet interior approach emerges',()=>{
 const m=new GardenDiscovery();for(let i=0;i<30;i++)m.step(1/60,{position:[0,2.5,-4],visible:true});assert(m.clueSeen);m.step(.05,{position:[0,2.5,-5]});assert.equal(m.phase,'retreating');
 for(let i=0;i<420;i++)m.step(1/60,{position:[0,2.5,6]});assert.equal(m.phase,'peeking');
 for(let i=0;i<60;i++)m.step(1/60,{position:[-2,2.5,-14],velocity:[1,0,0]});assert.notEqual(m.phase,'emerging');for(let i=0;i<60;i++)m.step(1/60,{position:[-2,2.5,-14]});assert.equal(m.phase,'emerging');
 m.help=true;m.reset();assert.equal(m.help,false);assert.equal(m.found,false);assert.equal(m.clueSeen,false);assert.equal(m.routeUsed,false);
});
test('ordinary swimming cannot cross the front slit, while the authored side path and its reverse remain traversable',()=>{
 const {world}=setup();world.position=[0,2.5,-5];for(let i=0;i<600;i++)world.step(1/60,{z:1});assert(world.position[2]>-9.5,JSON.stringify(world.position));
 world.position=[0,2.5,-5];world.velocity=[0,0,0];world.heading=0;
 for(const [x,z]of [...GARDEN_PATH.slice(1),...GARDEN_PATH.slice(0,-1).reverse()]){let reached=false;for(let i=0;i<1800;i++){const dx=x-world.position[0],dz=z-world.position[2],d=Math.hypot(dx,dz);if(d<.45){reached=true;break;}const e=wrap(Math.atan2(dx,-dz)-world.heading);world.step(1/60,{x:clamp(e*1.7),z:Math.min(.8,d)*Math.max(0,Math.cos(e))**3,y:clamp((2.5-world.position[1])*1.8)});}assert(reached,JSON.stringify({target:[x,z],position:world.position}));}
});
test('real triangles show the front clue, hide the retreat and reveal the interior in landscape and portrait views',()=>{
 const {scenery,garden}=setup();for(const aspect of [16/9,390/844]){
  garden.proxy.position.set(0,2.65,-9.1);garden.group.updateMatrixWorld(true);assert(garden.visible(view([0,2.5,-4],aspect),scenery.solids));
  garden.proxy.position.set(1.6,2.65,-15.6);garden.group.updateMatrixWorld(true);assert.equal(garden.visible(view([0,2.5,-4],aspect),scenery.solids),false);
  garden.proxy.position.set(.3,2.65,-13.7);garden.group.updateMatrixWorld(true);assert(garden.visible(view([0,2.5,-13.5],aspect),scenery.solids));
  const away=view([0,2.5,-13.5],aspect);away.lookAt(0,2.5,10);away.updateMatrixWorld(true);assert.equal(garden.visible(away,scenery.solids),false);
 }
});
test('the whole input-driven route produces one discovery and a companion return without a collection gate',()=>{
 const {scenery,garden,world}=setup();world.position=[0,2.5,-4];
 const step=(input={})=>{world.step(1/60,input);garden.update(1/60,world,view(world.position),scenery.solids);};
 for(let i=0;i<30;i++)step();for(const [x,z]of GARDEN_PATH){let reached=false;for(let i=0;i<1800;i++){const dx=x-world.position[0],dz=z-world.position[2],d=Math.hypot(dx,dz);if(d<.45){reached=true;break;}const e=wrap(Math.atan2(dx,-dz)-world.heading);step({x:clamp(e*1.7),z:Math.min(.8,d)*Math.max(0,Math.cos(e))**3,y:clamp((2.5-world.position[1])*1.8)});}assert(reached);}
 for(let i=0;i<240;i++)step();assert(garden.model.clueSeen&&garden.model.found&&garden.model.routeUsed);assert.equal(garden.model.help,false);
 const pilot=new ReturnPilot(),school=new RegionSchool(3);school.enchant(0);school.members[0].state='following';school.members[0].position=school.goal(school.members[0],world);pilot.select();for(let i=0;i<8500&&pilot.phase==='approaching';i++){world.step(1/60,{...pilot.control(1/60,{},world,RETURN_SITE.home),speedLimit:1.7});school.step(1/60,world);clearFollowerSeabed(school.members);}assert.equal(pilot.phase,'choice');for(let i=0;i<600;i++){world.step(1/60,{});school.step(1/60,world);}assert(companionsReady(school.members,world.position));
});
test('route coloring changes no terrain geometry; all sampled collider tops come from actual rock triangles',()=>{
 const {scenery,garden}=setup(),plain=createCoveScene(assets),ray=new T.Raycaster();const tiles=scenery.solids.filter(o=>o.name.startsWith('Seabed tile '));
 for(const tile of tiles){const previous=plain.solids.find(o=>o.name===tile.name);assert.deepEqual(tile.geometry.attributes.position.array,previous.geometry.attributes.position.array);}
 assert(gardenSand(-5.8,-11)>.9);assert.equal(gardenSand(20,20),0);
 for(const [x,z,,height]of garden.colliders){ray.set(new T.Vector3(x,12,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(garden.rocks,false)[0];assert(hit);assert(Math.abs(hit.point.y-height)<1e-4);}
 for(const [x,z]of GARDEN_PATH){ray.set(new T.Vector3(x,12,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(tiles,false)[0];assert(Math.abs(hit.point.y-reefFloor(x,z))<1e-5);}
});

test('garden coral roots touch real rock and do not obstruct the authored side route',()=>{
 const {garden}=setup(),ray=new T.Raycaster(),r=garden.inspect();assert.equal(r.corals,7);
 for(const [x,y,z]of r.coralAnchors){ray.set(new T.Vector3(x,12,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(garden.rocks,false)[0];assert(hit);assert(Math.abs(y-(hit.point.y-.03))<1e-5);}
 assert.equal(garden.occluders.length,7);assert.equal(garden.rocks.length,6);
});
test('resident uses original animated geometry with private materials and smooth finite heading through wrap',()=>{
 const {garden}=setup(),r=garden.inspect().resident;assert.equal(r.triangles,2142);assert.equal(r.geometryChanged,false);assert.equal(r.sourceRecoloured,false);assert.match(r.clip,/Swimming_Normal$/);
 const meshes=[];garden.proxy.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});assert(meshes.length>0);
 const source=[];puffer.scene.traverse(o=>{if(o.isSkinnedMesh)source.push(o);});assert.equal(meshes.length,source.length);
 for(let i=0;i<meshes.length;i++){assert.equal(meshes[i].geometry,source[i].geometry);assert.notEqual(meshes[i].material,source[i].material);}
 const seen=new Set();for(let i=0;i<900;i++){const world={position:[0,2.5,-13.5],velocity:[0,0,0]};garden.update(1/60,world,view(world.position),[]);seen.add(garden.model.gesture);assert(garden.proxy.rotation.toArray().slice(0,3).every(Number.isFinite));for(const mesh of meshes){mesh.updateMatrixWorld(true);mesh.skeleton.update();for(let j=0;j<mesh.geometry.attributes.position.count;j+=23){const v=mesh.getVertexPosition(j,new T.Vector3());assert(v.toArray().every(Number.isFinite));}}}
 assert(seen.has('emerge')&&seen.has('watch')&&seen.has('side-swim'));assert(garden.inspect().resident.clipTime>0);garden.reset();assert.equal(garden.model.gesture,'peek');
});
