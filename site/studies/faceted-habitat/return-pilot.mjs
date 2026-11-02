import {returnRoute} from './return-route.mjs?v=2026-11-02-discovery-1';
import {clamp,wrap} from './core.mjs';
export class ReturnPilot {
 constructor(){this.reset();}
 reset(){this.phase='free';this.age=0;this.settle=0;this.stuck=0;this.lastPosition=null;this.message='';this.route=null;this.waypoint=0;}
 select(){this.reset();this.phase='approaching';return true;}
 cancel(){this.phase='free';}
 control(dt,manual,w,target){
  if(Math.max(...Object.values(manual).map(Math.abs),0)>.015){this.cancel();return manual;}
  if(this.phase!=='approaching')return {};
  if(!this.route){this.route=returnRoute(w.position,target,w.obstacles||[],w.bounds);if(!this.route){this.cancel();this.message='바위 옆으로 조금 이동한 뒤 귀환해 주세요';return {};}}
  let point=this.route[this.waypoint];if(this.waypoint<this.route.length-1&&Math.hypot(point[0]-w.position[0],point[2]-w.position[2])<.6)point=this.route[++this.waypoint];
  const final=this.waypoint===this.route.length-1;
  this.age+=dt;const dx=point[0]-w.position[0],dz=point[2]-w.position[2],dy=point[1]-w.position[1],distance=Math.hypot(dx,dz),error=wrap(Math.atan2(dx,-dz)-w.heading),speed=Math.hypot(...w.velocity);
  if(this.lastPosition){const moved=Math.hypot(...w.position.map((v,i)=>v-this.lastPosition[i]));this.stuck=moved<dt*.025&&distance>1.1&&Math.abs(error)<.4?this.stuck+dt:0;}this.lastPosition=[...w.position];
  if(this.age>120||this.stuck>3){this.phase='free';this.message='물길이 막혔어요 · 바위 옆으로 이동한 뒤 다시 돌아가세요';return {};}
  this.settle=final&&distance<.72&&Math.abs(dy)<.18&&speed<.18?this.settle+dt:0;
  if(this.settle>.3){this.phase='choice';return {};}
  return{x:distance>.55?clamp(error*1.7):0,z:clamp((distance-(final?.48:.05))*.9,0,final?.85:.70)*Math.max(0,Math.cos(error))**3,y:clamp(dy*1.8,-.65,.65)};
 }
 report(){return{phase:this.phase,age:this.age,message:this.message,route:this.route,waypoint:this.waypoint};}
}
export function companionsReady(members,position){return members.filter(f=>f.enchanted).every(f=>f.state==='following'&&Math.hypot(...f.position.map((v,i)=>v-position[i]))<3.4);}
