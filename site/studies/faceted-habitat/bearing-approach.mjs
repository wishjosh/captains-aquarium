import {clamp,wrap} from './core.mjs';
import {HabitatApproach} from './habitat.mjs?v=2026-11-01-extension-1';
const gap=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const within=(p,b)=>p[0]>=b[0][0]+.5&&p[0]<=b[0][1]-.5&&p[2]>=b[2][0]+.5&&p[2]<=b[2][1]-.5;
// Plan only on selection. Camera orientation never enters the route calculation.
export function bearingRoute(position,target,obstacles=[],heading=0,bounds=[[-21,21],[-.6,7],[-31,18]]){
 const d=gap(position,target),dx=d>.001?(position[0]-target[0])/d:-Math.sin(heading),dz=d>.001?(position[2]-target[2])/d:Math.cos(heading),radius=d>=1.65&&d<=2.25?d:1.9;
 const height=Math.min(position[1],target[1]),rocks=obstacles.filter(o=>height<=(o[3]??1)+1.05).map(([x,z,r])=>({x,z,r:r+.67}));
 const clear=p=>within(p,bounds)&&rocks.every(o=>Math.hypot(p[0]-o.x,p[2]-o.z)>o.r);
 const segment=(a,b)=>rocks.every(o=>{const vx=b[0]-a[0],vz=b[2]-a[2],l=vx*vx+vz*vz,t=l?Math.max(0,Math.min(1,((o.x-a[0])*vx+(o.z-a[2])*vz)/l)):0,dist=Math.hypot(a[0]+vx*t-o.x,a[2]+vz*t-o.z);return dist>o.r||(gap(a,position)<.001&&Math.hypot(a[0]-o.x,a[2]-o.z)<=o.r&&t===0);});
 const goals=[];for(const angle of [0,.2,-.2,.4,-.4,.65,-.65,1,-1]){const c=Math.cos(angle),s=Math.sin(angle),p=[target[0]+(dx*c-dz*s)*radius,target[1],target[2]+(dx*s+dz*c)*radius];if(clear(p))goals.push({p,angle});}
 if(!goals.length)return null;
 // Prefer the original approach ray whenever its arrival point is usable.
 const goal=goals[0].p;if(segment(position,goal))return{points:[goal],goal,detour:false,arrivalAngle:goals[0].angle};
 const nodes=[[...position],goal];for(const o of rocks)for(let i=0;i<16;i++){const angle=i*Math.PI/8,r=(o.r+.14)/Math.cos(Math.PI/16),p=[o.x+Math.cos(angle)*r,target[1],o.z+Math.sin(angle)*r];if(clear(p))nodes.push(p);}
 const costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();costs[0]=0;
 for(let step=0;step<nodes.length;step++){let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||costs[i]<costs[u]))u=i;if(u<0||!Number.isFinite(costs[u]))break;if(u===1)break;done.add(u);for(let v=1;v<nodes.length;v++){if(done.has(v)||v===u||!segment(nodes[u],nodes[v]))continue;const cost=costs[u]+gap(nodes[u],nodes[v]);if(cost<costs[v]){costs[v]=cost;prev[v]=u;}}}
 if(!Number.isFinite(costs[1]))return null;const points=[];for(let i=1;i>0;i=prev[i])points.unshift(nodes[i]);return{points,goal,detour:true,arrivalAngle:goals[0].angle};
}
export class BearingApproach extends HabitatApproach{
 selectView(_yaw,w,target){if(!super.select())return false;this.target=[...target];this.route=bearingRoute(w.position,target,w.obstacles,w.heading,w.bounds);this.waypoint=0;this.parking=false;if(!this.route){this.cancel();this.message='바위 옆으로 조금 이동한 뒤 다시 터치해 주세요';return false;}return true;}
 control(dt,manual,w,target,{settled=true}={}){
  if(this.phase!=='approaching')return super.control(dt,manual,w,target,{settled});
  if(Math.max(...Object.values(manual).map(Math.abs),0)>.015){this.cancel();return manual;}
  this.age+=dt;const points=this.route.points;let point=points[this.waypoint],distance=gap(point,w.position);if(this.waypoint<points.length-1&&distance<.25){point=points[++this.waypoint];distance=gap(point,w.position);}
  const final=this.waypoint===points.length-1,fishDistance=gap(target,w.position),dy=target[1]-w.position[1],speed=Math.hypot(...w.velocity);
  if(final&&distance<.32)this.parking=true;if(distance>.8)this.parking=false;
  const close=final&&fishDistance<1.7,face=this.parking||close?target:point,error=wrap(Math.atan2(face[0]-w.position[0],w.position[2]-face[2])-w.heading);
  if(this.age>25){this.cancel();this.message='바위 옆으로 조금 이동한 뒤 다시 터치해 주세요';return {};}
  if(this.parking&&settled&&fishDistance>1.5&&fishDistance<2.5&&Math.abs(dy)<.22&&speed<.18&&Math.abs(error)<.16)this.settle+=dt;else this.settle=0;
  if(this.settle>.28){this.phase='choice';this.events.push('arrived');this.message='관찰하거나 수집해 보세요';return {};}
  const facing=Math.max(0,Math.cos(error))**4;
  const z=close?-clamp((1.85-fishDistance)*2,0,.7)*facing:this.parking?0:clamp((distance-.08)*.9,0,final?.85:.55)*facing;
  return{x:clamp(error*1.65),z,y:clamp(dy*1.8,-.65,.65)};
 }
 report(){return{...super.report(),approach:'initial-bearing',target:this.target,route:this.route,waypoint:this.waypoint,parking:!!this.parking};}
}
