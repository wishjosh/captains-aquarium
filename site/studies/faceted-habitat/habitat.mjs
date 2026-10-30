import {clamp,wrap} from './core.mjs';
import {Approach} from './approach.mjs';
// One art-directed encounter; a stylised habitat, not a species simulation.
export const ANEMONE={base:[1.65,.57,-1.1],edge:[1.35,1.80,.15],refuge:[1.65,1.08,-.91]};
export const REEF_ROCKS=[
 {x:4.1,z:-1.6,r:1.3,height:3.65,seed:2},
 {x:4.2,z:-3.65,r:1.0,height:2.8,seed:5},
 {x:5.6,z:-2.65,r:1.15,height:3.1,seed:8},
 {x:1.65,z:-1.2,r:.83,height:.84,seed:11},
 {x:2.8,z:-1.85,r:1.05,height:1.13,seed:14}
];
const points=[[1.35,1.8,.15],[1.9,1.71,-.12],[1.65,1.64,-.64],[1.03,1.77,-.12]];
const durations=[2.3,1.2,1.7,1.0,2.1,1.4,1.8,1.3];
export function residentRoute(t){
 let clock=((t%12.8)+12.8)%12.8,index=0;
 while(clock>=durations[index]&&index<7){clock-=durations[index];index++;}
 const n=Math.floor(index/2),p=points[n],q=points[(n+1)%4],moving=index%2===1,u=moving?clamp(clock/durations[index],0,1):0,s=u*u*(3-2*u);
 return{position:p.map((v,i)=>v+(q[i]-v)*s+(i===1?Math.sin(t*1.9)*.012:0)),activity:moving?'short-swim':'hover'};
}
export function residentIntent(a,dt,time,{mode,captain}){
 const natural=mode==='roaming';
 if(!natural){a.sheltering=false;a.clearTime=0;a.activity=mode==='observing'?residentRoute(a.modeAge).activity:'calmed';return null;}
 const delta=captain?a.position.map((v,i)=>v-captain.position[i]):[99,99,99];
 const distance=Math.hypot(...delta),predicted=captain?Math.hypot(...delta.map((v,i)=>v-(captain.velocity?.[i]||0)*.3)):distance;
 if(Math.min(distance,predicted)<2.25){a.sheltering=true;a.clearTime=0;}
 else if(a.sheltering){a.clearTime=(a.clearTime||0)+dt;if(captain&&Math.hypot(...captain.position.map((v,i)=>v-ANEMONE.edge[i]))<3.0)a.clearTime=0;if(a.clearTime>1.4)a.sheltering=false;}
 if(a.sheltering){a.activity=Math.hypot(...a.position.map((v,i)=>v-ANEMONE.refuge[i]))<.16?'sheltering':'withdrawing';return{target:ANEMONE.refuge,maximum:1.25,avoiding:true};}
 const route=residentRoute(time);a.activity=route.activity;return{target:route.position,maximum:.95,avoiding:false};
}

// A resident may emerge toward the observer. Keep body clearance before offering choices.
export class HabitatApproach extends Approach{
 control(dt,manual,w,target,{settled=true}={}){
  const wasApproaching=this.phase==='approaching';let control=super.control(dt,manual,w,target);
  if(!wasApproaching||this.phase==='free')return control;
  const dx=target[0]-w.position[0],dz=target[2]-w.position[2],dy=target[1]-w.position[1],distance=Math.hypot(dx,dz),error=wrap(Math.atan2(dx,-dz)-w.heading);
  if(this.phase==='choice'&&(!settled||distance<1.5)){this.phase='approaching';this.settle=0;this.events=this.events.filter(e=>e!=='arrived');}
  if(this.phase==='approaching'&&distance<1.7&&Math.abs(error)<.85)control={x:clamp(error*1.65),z:-clamp((1.75-distance)*2,0,.85),y:clamp(dy*1.8,-.65,.65)};
  return control;
 }
}
