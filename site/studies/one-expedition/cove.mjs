import {clamp,damp,wrap} from './core.mjs';

export const COVE_HOME=[0,2.5,5.7];
export const COVE_FISH=Object.freeze([
 {id:0,place:'모래 여울',behavior:'밝은 모래길을 오가는 움직임',center:[1.15,2.15,.15]},
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
export const coveFloor=(x,z)=>-.22+.08*Math.sin(x*.48+z*.22)+.055*Math.cos(z*.55-x*.25);
export function coveObstacles(){return COVE_ROCKS.filter(r=>r.solid).map(r=>[r.x,r.z,r.r,coveFloor(r.x,r.z)+r.r*2*(r.kind ? .301679 : .25582)]);}
export function coveRegion(p){if(p[2]>-2.8)return '모래 여울';if(p[0]<-1.4)return '바위턱';if(p[0]>1.6)return '해초가';return '작은 물길';}
export function coveHint(p,found){const region=coveRegion(p);return region==='바위턱'?'바위 가장자리를 돌아오는 움직임을 살펴보세요':region==='해초가'?'해초 옆에서 위아래로 헤엄치는 움직임을 찾아보세요':region==='모래 여울'&&!found?'모래길 위로 오가는 작은 움직임을 찾아보세요':'바위턱과 해초가로 이어지는 물길을 둘러보세요';}
export function wildPath(id,t){
 const c=COVE_FISH[id].center;
 if(id===0){const a=t*.34;return[c[0]+Math.sin(a)*1.12,c[1]+Math.sin(a*1.4)*.11,c[2]+(Math.cos(a)-1)*.58];}
 if(id===1){const a=t*.29+.5;return[c[0]+Math.sin(a)*.62,c[1]+Math.sin(a*1.8)*.12,c[2]+Math.cos(a)*.78];}
 const a=t*.32+.9;return[c[0]+Math.sin(a)*.52,c[1]+Math.sin(t*.53)*.43,c[2]+Math.cos(a)*.53];
}
const length=v=>Math.hypot(...v),copy=p=>p.slice();
export class CoveLife{
 constructor(){this.reset();}
 reset(){this.time=0;this.agents=COVE_FISH.map(({id})=>({id,position:wildPath(id,0),velocity:[0,0,0],yaw:Math.PI/2,anchor:null,mode:'roaming',modeAge:0}));}
 step(dt,members,{selected=-1,phase='free'}={}){
  dt=clamp(dt,0,.05);this.time+=dt;
  for(const f of members){if(f.state!=='wild')continue;const a=this.agents[f.id];
   const mode=f.id===selected&&['approaching','choice','observing'].includes(phase)?phase:'roaming';
   if(mode!==a.mode){if(mode!=='roaming'&&a.mode==='roaming')a.anchor=copy(a.position);if(mode==='roaming')a.anchor=null;a.mode=mode;a.modeAge=0;}
   a.modeAge+=dt;let target;
   if(a.anchor){const u=a.modeAge*(mode==='observing'?.8:.6),p=a.anchor;
    if(mode!=='observing')target=[p[0]+Math.sin(u)*.035,p[1]+Math.sin(u*.8)*.025,p[2]];
    else if(f.id===0)target=[p[0]+Math.sin(u)*.42,p[1]+Math.sin(u*.7)*.045,p[2]+(Math.cos(u)-1)*.10];
    else if(f.id===1)target=[p[0]+Math.sin(u)*.32,p[1]+Math.sin(u*1.4)*.06,p[2]+(Math.cos(u)-1)*.24];
    else target=[p[0]+Math.sin(u*.65)*.18,p[1]+Math.sin(u)*.28,p[2]+(Math.cos(u*.65)-1)*.10];
   }
   else target=wildPath(f.id,this.time);
   const desired=target.map((v,i)=>(v-a.position[i])*4.0),speed=length(desired),maximum=mode==='roaming'?.68:mode==='observing'?.48:.12;
   if(speed>maximum)for(let i=0;i<3;i++)desired[i]*=maximum/speed;
   a.velocity=a.velocity.map((v,i)=>damp(v,desired[i],5,dt));a.position=a.position.map((v,i)=>v+a.velocity[i]*dt);
   if(Math.hypot(a.velocity[0],a.velocity[2])>.018){const yaw=Math.atan2(a.velocity[0],a.velocity[2]);a.yaw+=wrap(yaw-a.yaw)*(1-Math.exp(-dt*4));}
   f.position=copy(a.position);f.velocity=copy(a.velocity);f.yaw=a.yaw;
  }
 }
 report(){return this.agents.map(a=>({id:a.id,place:COVE_FISH[a.id].place,mode:a.mode,position:copy(a.position),velocity:copy(a.velocity)}));}
}
export class CoveDiscovery{
 constructor(){this.reset();}
 reset(){this.seen=new Set();this.dwell=[0,0,0];}
 step(dt,sightings){const events=[];for(const s of sightings){this.dwell[s.id]=s.visible&&s.distance<=7.2?this.dwell[s.id]+dt:0;if(this.dwell[s.id]>.22&&!this.seen.has(s.id)){this.seen.add(s.id);events.push(s.id);}}return events;}
 label(id,distance){return this.seen.has(id)&&distance<=4.8;}
}
