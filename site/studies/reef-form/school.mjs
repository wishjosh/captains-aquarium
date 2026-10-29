import {clamp,wrap,damp} from './core.mjs';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export class School {
 constructor(count=1){this.reset(count);}
 reset(count=1){this.time=0;this.members=Array.from({length:count},(_,i)=>({id:i,state:'wild',age:0,position:[[.65,2.5,-.35],[1.45,2.85,-.7],[2.2,2.2,-.45]][i].slice(),velocity:[0,0,0],yaw:Math.PI/2,enchanted:false,rank:null}));}
 enchant(i){const f=this.members[i];if(!f||f.state!=='wild')return false;f.state='binding';f.age=0;f.enchanted=true;f.rank=this.members.filter(q=>q!==f&&q.enchanted).length;return true;}
 goal(f,w){const slots=[[1.3,.22,.8],[1.7,-.24,-.08],[2.4,.22,.42]],p=slots[f.rank??0],c=Math.cos(w.heading),s=Math.sin(w.heading),bob=Math.sin(this.time*1.3+f.id*2)*.055;return[w.position[0]+c*p[0]+s*p[2],w.position[1]+p[1]+bob,w.position[2]+s*p[0]-c*p[2]];}
 step(dt,w){dt=clamp(dt,0,.05);this.time+=dt;
  for(const f of this.members){f.age+=dt;
   if(f.state==='wild'){const bases=[[.65,2.5,-.35],[1.45,2.85,-.7],[2.2,2.2,-.45]],b=bases[f.id];f.position=[b[0]+Math.sin(this.time*.4+f.id)*.055,b[1]+Math.sin(this.time*.7+f.id)*.045,b[2]];continue;}
   if(f.state==='binding'&&f.age>=1.15){f.state='opening';f.age=0;}
   if(f.state==='opening'&&f.age>=1){f.state='joining';f.age=0;}
   if(['binding','opening'].includes(f.state))continue;
   const goal=this.goal(f,w),desired=goal.map((v,i)=>(v-f.position[i])*2.3+(f.state==='following'?w.velocity[i]*.7:0));
   // Avoid the captain in world space; fish are never parented to the rig.
   let away=f.position.map((v,i)=>v-w.position[i]),d=Math.hypot(...away);if(d<1.2){const a=(1.2-d)*5/Math.max(.02,d);for(let i=0;i<3;i++)desired[i]+=away[i]*a;}
   for(const other of this.members){if(other===f||!other.enchanted)continue;away=f.position.map((v,i)=>v-other.position[i]);d=Math.hypot(...away);if(d<.7){const a=(.7-d)*6/Math.max(.02,d);for(let i=0;i<3;i++)desired[i]+=away[i]*a;}}
   for(const [x,z,r,h=1]of w.obstacles){if(f.position[1]>h+.3)continue;const dx=f.position[0]-x,dz=f.position[2]-z,dist=Math.hypot(dx,dz);if(dist<r+.9){const a=(r+.9-dist)*5/Math.max(.01,dist);desired[0]+=dx*a;desired[2]+=dz*a;desired[1]+=.8;}}
   const maximum=2.8,length=Math.hypot(...desired);if(length>maximum)for(let i=0;i<3;i++)desired[i]*=maximum/length;
   f.velocity=f.velocity.map((v,i)=>damp(v,desired[i],4,dt));f.position=f.position.map((v,i)=>v+f.velocity[i]*dt);
   // Project after movement, including rapid turns where a goal crosses the captain.
   away=f.position.map((v,i)=>v-w.position[i]);d=Math.hypot(...away);if(d<.9&&d>0)f.position=f.position.map((v,i)=>w.position[i]+away[i]*.9/d);
   f.position[1]=clamp(f.position[1],.6,6.1);
   const speed=Math.hypot(f.velocity[0],f.velocity[2]);if(speed>.045){const yaw=Math.atan2(f.velocity[0],f.velocity[2]);f.yaw+=wrap(yaw-f.yaw)*(1-Math.exp(-dt*4));}
   if(f.state==='joining'&&distance(f.position,goal)<.3){f.state='following';f.age=0;}
  }
 }
 report(){return this.members.map(f=>({id:f.id,state:f.state,age:f.age,position:[...f.position],velocity:[...f.velocity],yaw:f.yaw,enchanted:f.enchanted}));}
}
