import {clamp,wrap} from './core.mjs';
export class ReturnPilot {
 constructor(){this.reset();}
 reset(){this.phase='free';this.age=0;this.settle=0;this.stuck=0;this.lastPosition=null;this.message='';}
 select(){this.reset();this.phase='approaching';return true;}
 cancel(){this.phase='free';}
 control(dt,manual,w,target){
  if(Math.max(...Object.values(manual).map(Math.abs),0)>.015){this.cancel();return manual;}
  if(this.phase!=='approaching')return {};
  this.age+=dt;const dx=target[0]-w.position[0],dz=target[2]-w.position[2],dy=target[1]-w.position[1],distance=Math.hypot(dx,dz),error=wrap(Math.atan2(dx,-dz)-w.heading),speed=Math.hypot(...w.velocity);
  if(this.lastPosition){const moved=Math.hypot(...w.position.map((v,i)=>v-this.lastPosition[i]));this.stuck=moved<dt*.025&&distance>1.1&&Math.abs(error)<.4?this.stuck+dt:0;}this.lastPosition=[...w.position];
  if(this.age>40||this.stuck>3){this.phase='free';this.message='물길이 막혔어요 · 바위 옆으로 이동한 뒤 다시 돌아가세요';return {};}
  this.settle=distance<.72&&Math.abs(dy)<.18&&speed<.18?this.settle+dt:0;
  if(this.settle>.3){this.phase='choice';return {};}
  return{x:distance>.55?clamp(error*1.7):0,z:clamp((distance-.48)*.9,0,.85)*Math.max(0,Math.cos(error)),y:clamp(dy*1.8,-.65,.65)};
 }
 report(){return{phase:this.phase,age:this.age,message:this.message};}
}
export function companionsReady(members,position){return members.filter(f=>f.enchanted).every(f=>f.state==='following'&&Math.hypot(...f.position.map((v,i)=>v-position[i]))<3.4);}
