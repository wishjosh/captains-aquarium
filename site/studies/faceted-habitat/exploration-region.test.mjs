import test from 'node:test';import assert from 'node:assert/strict';
import {REGION,terrainTiles} from './exploration-region.mjs';
import {reefFloor,ReefSwimWorld,clearFollowerSeabed} from './reef-terrain.mjs';
import {ReturnPilot} from './return-pilot.mjs';import {RETURN_SITE} from './return-site-config.mjs';import {coveObstacles} from './cove.mjs';
import {School} from './school.mjs';
const dt=1/60;
test('ridge, gully and return pocket have distinct heights without moving the accepted habitat',()=>{assert(reefFloor(-12,-14)-reefFloor(-4,-14)>2);assert(reefFloor(10,6)-reefFloor(0,6)>1.5);assert(reefFloor(-2.8,12.8)<.5);assert(reefFloor(1.55,-1.3)<1);});
test('swimming crosses the former rectangular limits and stays in this finite region',()=>{const w=new ReefSwimWorld();w.obstacles=[];w.position=[0,2.5,-13];for(let n=0;n<600;n++)w.step(dt,{z:1});assert(w.position[2]<-20);for(let n=0;n<1200;n++)w.step(dt,{z:1});assert(w.position[2]>=REGION.bounds[2][0]);assert(w.position[1]>=reefFloor(w.position[0],w.position[2])+1.35);});
for(const start of [[-9,2,-11],[12,4,-17],[0,3,-27],[-17,4,-5],[17,4,4],[0,2,3]])test('three companions return through the region from '+JSON.stringify(start),()=>{
 const w=new ReefSwimWorld({maxForward:2.3});w.obstacles=coveObstacles();w.position=[...start];w.position[1]=Math.max(start[1],reefFloor(start[0],start[2])+1.35);const p=new ReturnPilot(),s=new School(3);s.members.forEach((f,i)=>{f.enchanted=true;f.state='following';f.position=[w.position[0]+i*.6,w.position[1],w.position[2]+1];});p.select();let minGap=Infinity,maxStep=0;
 for(let n=0;n<7200&&p.phase==='approaching';n++){const before=[...w.position];w.step(dt,{...p.control(dt,{},w,RETURN_SITE.home),speedLimit:1.7});s.step(dt,w);clearFollowerSeabed(s.members);maxStep=Math.max(maxStep,Math.hypot(...w.position.map((v,i)=>v-before[i])));for(const f of s.members)minGap=Math.min(minGap,f.position[1]-reefFloor(f.position[0],f.position[2]));}
 assert.equal(p.phase,'choice',JSON.stringify({position:w.position,pilot:p.report()}));assert(Math.hypot(...w.position.map((v,i)=>v-RETURN_SITE.home[i]))<.75);assert(minGap>=.319);assert(maxStep<.2,String(maxStep));
});
