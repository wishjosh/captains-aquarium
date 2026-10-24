// Standalone experiment. Plain numbers, fixed simulation steps, no save access.
export const RULES=Object.freeze({fishLength:.4,fishRadius:.18,bubbleRadius:.13,shotSpeed:5.4,shotLife:2.25,cooldown:.48,swimSpeed:1.65});
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,n)=>a.map(v=>v*n);
export const length=a=>Math.hypot(...a);
export const unit=a=>mul(a,1/(length(a)||1));
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function segmentHit(a,b,center,r){const d=sub(b,a),l=dot(d,d),u=l?clamp(dot(sub(center,a),d)/l,0,1):0;return length(sub(add(a,mul(d,u)),center))<=r;}
export function wildPosition(t){return [Math.sin(t*.53+.65)*.94,2+Math.sin(t*.81)*.16,-3.2+Math.sin(t*.36)*.34];}
export class BubbleWorld{
 constructor(){this.reset();}
 reset(){this.time=0;this.player=[0,2,0];this.velocity=[0,0,0];this.yaw=0;this.pitch=0;this.fish=wildPosition(0);this.fishBefore=[...this.fish];this.releaseOffset=[0,0,0];this.phase='swimming';this.shots=[];this.events=[];this.fired=0;this.missed=0;this.cooldown=0;this.caughtAt=0;this.shell=[...this.fish];this.nextID=1;}
 forward(){return [-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch)];}
 right(){return [Math.cos(this.yaw),0,-Math.sin(this.yaw)];}
 look(dx,dy){this.yaw-=dx;this.pitch=clamp(this.pitch-dy,-.85,.85);}
 fire(){if(this.phase!=='swimming'||this.cooldown>0)return false;const d=this.forward();this.shots.push({id:this.nextID++,p:add(this.player,mul(d,.4)),v:mul(d,RULES.shotSpeed),age:0});this.cooldown=RULES.cooldown;this.fired++;this.events.push({type:'shot'});return true;}
 release(){if(this.phase!=='caught')return false;this.releaseOffset=sub(this.fish,wildPosition(this.time));this.phase='swimming';this.events.push({type:'release'});return true;}
 update(dt,input={},blocked=()=>false,wallDistance=()=>Infinity){
  // The caller advances at 120 Hz: identical trajectories at different render rates.
  this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
  let wish=add(mul(this.right(),input.x||0),mul(this.forward(),input.z||0));wish[1]+=(input.y||0);if(length(wish)>1)wish=unit(wish);
  const response=1-Math.exp(-dt*9);for(let i=0;i<3;i++)this.velocity[i]+=(wish[i]*RULES.swimSpeed-this.velocity[i])*response;
  const next=add(this.player,mul(this.velocity,dt));next[0]=clamp(next[0],-9,9);next[1]=clamp(next[1],.75,5.4);next[2]=clamp(next[2],-15,3.5);
  for(const axis of [0,2,1]){const trial=[...this.player];trial[axis]=next[axis];if(!blocked(trial)){this.player=trial;}else this.velocity[axis]=0;}
  this.fishBefore=[...this.fish];
  if(this.phase==='swimming'){this.releaseOffset=mul(this.releaseOffset,Math.exp(-dt*.8));this.fish=add(wildPosition(this.time),this.releaseOffset);}
  if(this.phase==='caught'){
   const age=this.time-this.caughtAt;
   // Visible enclosure grows at the contact point before gently following the swimmer.
   if(age>.6){const goal=add(add(this.player,mul(this.forward(),1.65)),mul(this.right(),-.58));goal[1]-=.04;this.shell=add(this.shell,mul(sub(goal,this.shell),1-Math.exp(-dt*2.1)));}
   this.fish=add(this.shell,[Math.sin(age*2.3)*.045,Math.sin(age*1.9)*.035,Math.cos(age*1.7)*.04]);
  }
  const survivors=[];
  for(const shot of this.shots){const nextShot=add(shot.p,mul(shot.v,dt)),travel=length(sub(nextShot,shot.p));shot.age+=dt;
   const wall=wallDistance(shot.p,unit(shot.v),travel+RULES.bubbleRadius);
   const relativeA=sub(shot.p,this.fishBefore),relativeB=sub(nextShot,this.fish);
   const hit=this.phase==='swimming'&&segmentHit(relativeA,relativeB,[0,0,0],RULES.fishRadius+RULES.bubbleRadius);
   if(wall<=travel+RULES.bubbleRadius){this.missed++;this.events.push({type:'rock',p:add(shot.p,mul(unit(shot.v),Math.min(wall,travel)))});}
   else if(hit){this.phase='caught';this.caughtAt=this.time;this.shell=[...this.fish];this.velocity=mul(this.velocity,.7);this.events.push({type:'caught',p:[...this.fish]});}
   else if(shot.age>=RULES.shotLife){this.missed++;this.events.push({type:'miss',p:nextShot});}
   else{shot.p=nextShot;survivors.push(shot);}
  }
  this.shots=survivors;
 }
 drain(){return this.events.splice(0);}
 report(){return {time:this.time,phase:this.phase,player:[...this.player],yaw:this.yaw,pitch:this.pitch,fish:[...this.fish],shell:[...this.shell],fired:this.fired,missed:this.missed,cooldown:this.cooldown,shots:this.shots.map(s=>({...s,p:[...s.p],v:[...s.v]})),storageUsed:false};}
}
