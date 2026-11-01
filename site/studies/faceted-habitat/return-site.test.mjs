import test from 'node:test';import assert from 'node:assert/strict';
import {ReturnPilot,companionsReady} from './return-pilot.mjs';
import {RETURN_SITE} from './return-site-config.mjs';
import {ReefSwimWorld} from './reef-terrain.mjs';
import {School} from './school.mjs';
import {Expedition} from './expedition.mjs';
const dt=1/60,home=RETURN_SITE.home;
for(let i=0;i<8;i++)test('return pocket settles within reach from direction '+i,()=>{
 const w=new ReefSwimWorld();w.obstacles=[];w.position=[home[0]+Math.sin(i*Math.PI/4)*2,2.8,home[2]+Math.cos(i*Math.PI/4)*2];w.heading=.8;const p=new ReturnPilot();p.select();
 for(let n=0;n<2400&&p.phase==='approaching';n++)w.step(dt,{...p.control(dt,{},w,home),speedLimit:1.7});
 assert.equal(p.phase,'choice');assert(Math.hypot(...w.position.map((v,j)=>v-home[j]))<.75);assert(Math.hypot(...w.velocity)<.18);
});
test('return can be cancelled without repositioning the captain',()=>{const p=new ReturnPilot(),w=new ReefSwimWorld();p.select();const before=[...w.position],control={x:.7};assert.equal(p.control(dt,control,w,home),control);assert.equal(p.phase,'free');assert.deepEqual(w.position,before);});
for(const count of [0,1,3])test('return with '+count+' companions waits for following, then commits once',()=>{
 const w=new ReefSwimWorld();w.obstacles=[];w.position=[1,2.5,-.5];const school=new School(3),p=new ReturnPilot(),trip=new Expedition();trip.begin();for(let i=0;i<count;i++)school.enchant(i);trip.returnToBoat();p.select();let wait=0,arrived=false;
 for(let n=0;n<2400&&trip.stage!=='complete';n++){
  const c=p.control(dt,{},w,home);w.step(dt,{...c,speedLimit:1.7});school.step(dt,w);
  if(p.phase==='choice'&&trip.stage==='returning'){arrived=true;wait=companionsReady(school.members,w.position)?wait+dt:0;if(wait>=RETURN_SITE.boardingDwell)assert(trip.dock(school.members,w.position));}
  trip.step(dt);
 }
 assert(arrived);assert.equal(trip.stage,'complete');assert.equal(trip.result.count,count);assert.equal(trip.record.trips,1);assert.equal(trip.commit(),false);
});
test('binding and distant companions cannot trigger departure',()=>{assert(!companionsReady([{enchanted:true,state:'opening',position:[...home]}],home));assert(!companionsReady([{enchanted:true,state:'following',position:[home[0]+5,home[1],home[2]]}],home));});
