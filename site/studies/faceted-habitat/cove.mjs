import {ROCKS,collisionVolumes} from './habitat-layout.mjs?v=2026-10-31-touch-1';
import {reefFloor} from './reef-terrain.mjs?v=2026-10-31-touch-1';
import {clamp,damp,wrap} from './core.mjs';
import {ANEMONE,REEF_ROCKS,residentRoute,residentIntent} from './habitat.mjs?v=2026-10-31-touch-1';

export const COVE_HOME=[0,2.5,5.7];
export const COVE_FISH=Object.freeze([
 {id:0,place:'말미잘 바위틈',behavior:'말미잘 가장자리에서 짧게 헤엄치고 쉬는 모습',center:[1.35,1.8,.15]},
 {id:1,place:'바위턱',behavior:'바위 가장자리를 돌아오는 움직임',center:[-2.9,2.45,-6.3]},
 {id:2,place:'해초가',behavior:'잎 옆에서 높이를 바꾸는 움직임',center:[3.95,2.85,-8.0]}
]);
// Original rock models, fitted uniformly to each stated width.
export const COVE_ROCKS=Object.freeze([
 {x:-5.1,z:-5.6,r:1.9,kind:1,angle:.24,solid:true},
 {x:-6.8,z:-8.6,r:1.55,kind:0,angle:1.1,solid:true},
 {x:5.8,z:-8.5,r:1.65,kind:1,angle:-.3,solid:true},
 {x:6.4,z:-3.8,r:.95,kind:0,angle:.4,solid:true},
 {x:-1.4,z:-13.8,r:2.0,kind:1,angle:.4,solid:true},
 {x:-7.8,z:-1.9,r:.85,kind:0,angle:1.2,solid:true},
 {x:-11,z:-7.5,r:3.1,kind:1,angle:.2},
 {x:-10.5,z:-13.7,r:2.8,kind:0,angle:.8},
 {x:10.7,z:-5.5,r:2.7,kind:1,angle:.5},
 {x:10.2,z:-13.3,r:3.1,kind:0,angle:-.3},
 {x:-7.1,z:-20.0,r:3.5,kind:0,angle:.4},
 {x:-.7,z:-21.2,r:3.3,kind:1,angle:-.6},
 {x:6.2,z:-20.6,r:3.2,kind:0,angle:.5}
]);
export const coveFloor=reefFloor;
export function coveObstacles(){return collisionVolumes(ROCKS,coveFloor);}
export function coveRegion(p){if(p[2]>-2.8)return '말미잘 바위틈';if(p[0]<-1.4)return '바위턱';if(p[0]>1.6)return '해초가';return '작은 물길';}
export function coveHint(p,found){const region=coveRegion(p);return region==='바위턱'?'바위 가장자리를 돌아오는 움직임을 살펴보세요':region==='해초가'?'해초 옆에서 위아래로 헤엄치는 움직임을 찾아보세요':region==='말미잘 바위틈'?'말미잘 가장자리의 작은 움직임을 살펴보세요':'바위턱과 해초가로 이어지는 물길을 둘러보세요';}
export function wildPath(id,t){
 const c=COVE_FISH[id].center;
 if(id===0)return residentRoute(t).position;
 if(id===1){const a=t*.29+.5;return[c[0]+Math.sin(a)*.62,c[1]+Math.sin(a*1.8)*.12,c[2]+Math.cos(a)*.78];}
 const a=t*.32+.9;return[c[0]+Math.sin(a)*.52,c[1]+Math.sin(t*.53)*.43,c[2]+Math.cos(a)*.53];
}
const length=v=>Math.hypot(...v),copy=p=>p.slice();
export class CoveLife{
 constructor(habitat=ANEMONE){this.habitat=habitat;this.reset();}
 setHabitat(habitat){this.habitat=habitat;this.reset();}
 reset(){this.time=0;this.agents=COVE_FISH.map(({id})=>({id,position:id===0?residentRoute(0,this.habitat).position:wildPath(id,0),velocity:[0,0,0],yaw:Math.PI/2,anchor:null,mode:'roaming',modeAge:0}));}
 step(dt,members,{selected=-1,phase='free',captain=null}={}){
  dt=clamp(dt,0,.05);this.time+=dt;
  for(const f of members){if(f.state!=='wild')continue;const a=this.agents[f.id];
   const mode=f.id===selected&&['approaching','choice','observing'].includes(phase)?phase:'roaming';
   if(mode!==a.mode){if(mode!=='roaming'&&a.mode==='roaming'){a.anchor=f.id===0?null:copy(a.position);a.calmEdge=false;a.velocity=a.velocity.map(v=>v*.35);}if(mode==='roaming')a.anchor=null;a.mode=mode;a.modeAge=0;}
   a.modeAge+=dt;let target;const resident=f.id===0?residentIntent(a,dt,this.time,{mode,captain,habitat:this.habitat}):null;
   if(resident)target=resident.target;
   else if(a.anchor){if(a.calmEdge&&mode!=='observing'){const d=length(ANEMONE.edge.map((v,i)=>v-a.anchor[i]));a.anchor=a.anchor.map((v,i)=>v+(ANEMONE.edge[i]-v)*Math.min(1,.32*dt/Math.max(.001,d)));if(d<.015)a.calmEdge=false;}const u=a.modeAge*(mode==='observing'?.8:.6),p=a.anchor;
    if(mode!=='observing')target=[p[0]+Math.sin(u)*.035,p[1]+Math.sin(u*.8)*.025,p[2]];
    else if(f.id===0){const route=residentRoute(a.modeAge).position,origin=residentRoute(0).position;target=route.map((v,i)=>p[i]+(v-origin[i])*.72);}
    else if(f.id===1)target=[p[0]+Math.sin(u)*.32,p[1]+Math.sin(u*1.4)*.06,p[2]+(Math.cos(u)-1)*.24];
    else target=[p[0]+Math.sin(u*.65)*.18,p[1]+Math.sin(u)*.28,p[2]+(Math.cos(u*.65)-1)*.10];
   }
   else target=resident?.target||wildPath(f.id,this.time);
   const desired=target.map((v,i)=>(v-a.position[i])*4.0);let maximum=mode==='roaming'?.68:mode==='observing'?.48:a.calmEdge?.38:.12;a.response=mode==='roaming'?'natural':'calm';if(resident){maximum=resident.maximum;if(resident.avoiding)a.response='avoiding';}
   if(captain&&mode==='roaming'&&f.id!==0){
    const delta=a.position.map((v,i)=>v-captain.position[i]),d=length(delta),predicted=delta.map((v,i)=>v-(captain.velocity?.[i]||0)*.18),pd=length(predicted);
    if(Math.min(d,pd)<(f.id===0?1.38:2.2)){
     const away=pd<d&&pd>.3?predicted:delta,n=length(away),fallback=[Math.cos(captain.heading||0),.16,Math.sin(captain.heading||0)];
     const unit=n>.001?away.map(v=>v/n):fallback,weight=clamp(((f.id===0?1.38:2.2)-Math.min(d,pd))/(f.id===0?.5:1.3),0,1),side=f.id%2?1:-1;
     const escape=[unit[0]*2.75-unit[2]*side*.85,unit[1]*2.2+.12,unit[2]*2.75+unit[0]*side*.85];
     for(let i=0;i<3;i++)desired[i]=desired[i]*(1-weight)+escape[i]*weight;
     maximum=2.95;a.response='avoiding';
    }
   }
   const speed=length(desired);
   if(speed>maximum)for(let i=0;i<3;i++)desired[i]*=maximum/speed;
   a.velocity=a.velocity.map((v,i)=>damp(v,desired[i],5,dt));a.position=a.position.map((v,i)=>v+a.velocity[i]*dt);
   if(captain&&mode==='roaming'){
    const away=a.position.map((v,i)=>v-captain.position[i]),d=length(away),minimum=1.05;
    if(d<minimum){const unit=d>.001?away.map(v=>v/d):[Math.cos(captain.heading||0),0,Math.sin(captain.heading||0)];a.position=captain.position.map((v,i)=>v+unit[i]*minimum);a.response='avoiding';}
    a.position[1]=clamp(a.position[1],f.id===0?this.habitat.minY:1.2,5.7);
    const vertical=a.position[1]-captain.position[1],dx=a.position[0]-captain.position[0],dz=a.position[2]-captain.position[2],flat=Math.hypot(dx,dz),required=Math.sqrt(Math.max(0,minimum*minimum-vertical*vertical));
    if(flat<required){const ux=flat>.001?dx/flat:Math.cos(captain.heading||0),uz=flat>.001?dz/flat:Math.sin(captain.heading||0);a.position[0]=captain.position[0]+ux*required;a.position[2]=captain.position[2]+uz*required;}

   }
   if(Math.hypot(a.velocity[0],a.velocity[2])>.018){const yaw=Math.atan2(a.velocity[0],a.velocity[2]);a.yaw+=wrap(yaw-a.yaw)*(1-Math.exp(-dt*4));}
   f.position=copy(a.position);f.velocity=copy(a.velocity);f.yaw=a.yaw;
  }
 }
 report(){return this.agents.map(a=>({id:a.id,place:COVE_FISH[a.id].place,mode:a.mode,response:a.response||'natural',activity:a.activity||a.mode,behavior:a.behavior,atRest:!!a.atRest,calmEdge:!!a.calmEdge,position:copy(a.position),velocity:copy(a.velocity)}));}
}
export class CoveDiscovery{
 constructor(){this.reset();}
 reset(){this.seen=new Set();this.dwell=[0,0,0];}
 step(dt,sightings){const events=[];for(const s of sightings){this.dwell[s.id]=s.visible&&s.distance<=(s.id===0?4.3:7.2)?this.dwell[s.id]+dt:0;if(this.dwell[s.id]>.22&&!this.seen.has(s.id)){this.seen.add(s.id);events.push(s.id);}}return events;}
 label(id,distance){return this.seen.has(id)&&distance<=4.8;}
}
