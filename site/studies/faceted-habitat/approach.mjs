import {clamp,wrap} from './core.mjs';
export class Approach {
 constructor(){this.reset();}
 reset(){this.phase='free';this.message='흰동가리를 터치해 다가가 보세요';this.settle=0;this.age=0;this.stuck=0;this.events=[];this.cancellations=0;}
 select(){if(['capturing','captured'].includes(this.phase))return false;this.phase='approaching';this.age=this.settle=this.stuck=0;this.lastPosition=null;this.message='다가가고 있어요 · 조이스틱으로 취소';this.events.push('selected');return true;}
 cancel(){if(this.phase==='free')return;this.phase='free';this.message='직접 헤엄치고 있어요 · 다시 터치해 다가가기';this.cancellations++;this.events.push('cancelled');}
 choose(action){if(this.phase!=='choice')return false;if(action==='observe'){this.phase='observing';this.message='흰동가리의 움직임을 살펴보세요';}else if(action==='collect'){this.phase='capturing';this.age=0;this.message='물방울로 감싸고 있어요';}else return false;this.events.push(action);return true;}
 control(dt,manual,w,target){
  const moving=Math.max(Math.abs(manual.x||0),Math.abs(manual.z||0),Math.abs(manual.y||0))>.015;
  if(moving){this.cancel();return manual;}
  this.age+=dt;
  if(this.phase==='capturing'&&this.age>1.25){this.phase='captured';this.message='물방울로 감쌌어요 · 이번 시안은 여기까지예요';this.events.push('captured');}
  if(this.phase!=='approaching')return manual;
  const dx=target[0]-w.position[0],dz=target[2]-w.position[2],dy=target[1]-w.position[1],distance=Math.hypot(dx,dz),error=wrap(Math.atan2(dx,-dz)-w.heading),speed=Math.hypot(...w.velocity);
  if(this.lastPosition){const moved=Math.hypot(...w.position.map((n,i)=>n-this.lastPosition[i]));this.stuck=moved<dt*.025&&distance>2&&Math.abs(error)<.4?this.stuck+dt:0;}this.lastPosition=[...w.position];
  if(this.stuck>3||this.age>25){this.phase='free';this.message='바위 옆으로 조금 이동한 뒤 다시 터치해 주세요';this.events.push('blocked');return {};}
  if(distance<1.95&&Math.abs(dy)<.22&&speed<.24&&Math.abs(error)<.14)this.settle+=dt;else this.settle=0;
  if(this.settle>.22){this.phase='choice';this.message='흰동가리와 무엇을 할까요?';this.events.push('arrived');return {};}
  const forward=clamp((distance-1.7)*.85,0,.85)*Math.max(0,Math.cos(error));
  return {x:clamp(error*1.65),z:forward,y:clamp(dy*1.8,-.65,.65)};
 }
 report(){return{phase:this.phase,message:this.message,age:this.age,cancellations:this.cancellations};}
}
