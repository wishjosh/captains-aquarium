import {clamp,wrap,damp} from './core.mjs';
import {HabitatApproach} from './habitat.mjs';
export const comfortableRadius=aspect=>6.8*Math.max(1,.95/aspect);
export function framingTarget(captain,target,aspect,blend){const p=[...captain];p[1]+=.12;if(!target)return p;const distance=Math.hypot(...target.map((n,i)=>n-captain[i])),weight=(aspect<.7?.48:.34)*clamp((7-distance)/3,0,1)*blend;return p.map((n,i)=>n+(target[i]-captain[i])*weight);}
export class SoftGate{
 constructor(delay=.22,hold=.48){this.delay=delay;this.hold=hold;this.reset();}
 reset(){this.onAge=0;this.offAge=0;this.latched=false;this.value=0;}
 step(dt,blocked){if(blocked){this.onAge+=dt;this.offAge=0;if(this.onAge>=this.delay)this.latched=true;}else{this.onAge=0;this.offAge+=dt;if(this.offAge>=this.hold)this.latched=false;}this.value=damp(this.value,this.latched?1:0,4,dt);return this.value;}
}
export function arrivalOffset(yaw,position,target,obstacles=[]){
 const right=[Math.cos(yaw),-Math.sin(yaw)],near=[Math.sin(yaw),Math.cos(yaw)],side=(position[0]-target[0])*right[0]+(position[2]-target[2])*right[1]>=0?1:-1,candidates=[];
 const blocked=p=>obstacles.some(([x,z,r,height=1])=>p[1]<=height+1.05&&Math.hypot(p[0]-x,p[2]-z)<r+.62);
 for(const sign of [side,-side])for(const depth of [.65,-.65,0,1.05]){const lateral=Math.sqrt(1.9**2-depth**2),offset=[right[0]*lateral*sign+near[0]*depth,0,right[1]*lateral*sign+near[1]*depth],p=target.map((n,i)=>n+offset[i]);if(p[0]<-8.5||p[0]>8.5||p[2]<-13.5||p[2]>6.5||blocked(p))continue;let obstruction=0;for(let i=1;i<=10;i++){const q=p.map((n,j)=>position[j]+(n-position[j])*i/10);if(blocked(q))obstruction++;}candidates.push({offset,score:Math.hypot(p[0]-position[0],p[2]-position[2])+obstruction*8+(sign===side?0:.6)});}
 candidates.sort((a,b)=>a.score-b.score);return candidates[0]?.offset||[near[0]*1.9,0,near[1]*1.9];
}
export class ViewApproach extends HabitatApproach{
 selectView(yaw,w,target){if(!super.select())return false;this.offset=arrivalOffset(yaw,w.position,target,w.obstacles);this.parking=false;return true;}
 control(dt,manual,w,target,{settled=true}={}){
  if(!this.offset||this.phase!=='approaching')return super.control(dt,manual,w,target,{settled});
  if(Math.max(Math.abs(manual.x||0),Math.abs(manual.z||0),Math.abs(manual.y||0))>.015){this.cancel();return manual;}
  this.age+=dt;const point=target.map((n,i)=>n+this.offset[i]),dx=point[0]-w.position[0],dz=point[2]-w.position[2],distance=Math.hypot(dx,dz),fishDistance=Math.hypot(target[0]-w.position[0],target[2]-w.position[2]),dy=target[1]-w.position[1],speed=Math.hypot(...w.velocity);
  if(distance<.32)this.parking=true;if(distance>.8)this.parking=false;
  const heading=this.parking?Math.atan2(target[0]-w.position[0],w.position[2]-target[2]):Math.atan2(dx,-dz),error=wrap(heading-w.heading);
  if(this.age>25){this.cancel();this.message='바위 옆으로 조금 이동한 뒤 다시 터치해 주세요';return {};}
  if(this.parking&&settled&&fishDistance>1.5&&fishDistance<2.5&&Math.abs(dy)<.22&&speed<.18&&Math.abs(error)<.16)this.settle+=dt;else this.settle=0;
  if(this.settle>.28){this.phase='choice';this.events.push('arrived');this.message='흰동가리와 무엇을 할까요?';return {};}
  const z=this.parking?(fishDistance<1.6?-clamp((1.7-fishDistance)*2,0,.6):0):clamp((distance-.1)*.9,0,.85)*Math.max(0,Math.cos(error))**2;
  return{x:clamp(error*1.65),z,y:clamp(dy*1.8,-.65,.65)};
 }
 report(){return{...super.report(),arrivalOffset:this.offset,parking:!!this.parking};}
}
