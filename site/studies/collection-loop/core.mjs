export const RULES=Object.freeze({fishLength:.4,fishRadius:.18,chargeSeconds:.65,encloseSeconds:.66,reelSeconds:1.35,dockSeconds:.48,swimSpeed:1.65,cooldown:.42});
export const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n),len=a=>Math.hypot(...a),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),unit=a=>mul(a,1/(len(a)||1));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function segmentHit(a,b,c,r){const d=sub(b,a),l=dot(d,d),u=l?clamp(dot(sub(c,a),d)/l,0,1):0;return len(sub(add(a,mul(d,u)),c))<=r;}
export const wild=t=>[Math.sin(t*.53+.65)*.94,2+Math.sin(t*.81)*.16,-3.2+Math.sin(t*.36)*.34];
export function cubic(a,b,c,d,t){const s=1-t;return a.map((v,i)=>v*s*s*s+3*b[i]*s*s*t+3*c[i]*s*t*t+d[i]*t*t*t);}
export class CaptureWorld{
 constructor(){this.reset();}
 reset(){this.session=(this.session||0)+1;this.encounter=1;this.encounterAt=0;this.encounterOffset=[0,0,0];this.completed=[];this.nextBlocked=false;this.nextTryAt=0;this.time=0;this.player=[0,2,0];this.velocity=[0,0,0];this.yaw=this.pitch=0;this.phase='swimming';this.fish=this.swimAt(0);this.previousFish=[...this.fish];this.releaseOffset=[0,0,0];this.shell=[...this.fish];this.shellVelocity=[0,0,0];this.shots=[];this.events=[];this.fired=this.missed=0;this.cooldown=0;this.phaseAt=0;this.reelProgress=0;this.nextId=1;this.reeling=false;this.recoveryBlocked=false;this.dragTarget=null;this.dragDistance=0;this.dockStart=null;}
 swimAt(t){return add(wild(t-this.encounterAt),this.encounterOffset);}
 nextEncounter(blocked=()=>false,wallDistance=()=>Infinity){
  if(this.phase!=='recovered')return false;
  const side=this.encounter%2?1:-1,forward=[-Math.sin(this.yaw),0,-Math.cos(this.yaw)],right=this.right();let chosen=null;
  for(const [distance,offset] of [[3.3,side*.55],[2.8,-side*.65],[3.8,0],[2.5,side*1.2],[2.5,-side*1.2]]){
   const p=add(add(this.player,mul(forward,distance)),mul(right,offset));p[0]=clamp(p[0],-7.5,7.5);p[1]=clamp(this.player[1]+.12,1.1,4.6);p[2]=clamp(p[2],-13.5,2);
   const offsetVector=sub(p,wild(0)),delta=sub(p,this.player);if(len(delta)<1.6||blocked(p)||wallDistance(this.player,unit(delta),len(delta))<len(delta)-.25)continue;
   if([0,.5,1,2,3].some(t=>blocked(add(wild(t),offsetVector))))continue;chosen=offsetVector;break;
  }
  if(!chosen){this.nextBlocked=true;this.nextTryAt=this.time+.4;return false;}
  this.encounter++;this.encounterAt=this.time;this.encounterOffset=chosen;this.nextBlocked=false;this.nextTryAt=0;this.releaseOffset=[0,0,0];this.fish=this.swimAt(this.time);this.previousFish=[...this.fish];this.shell=[...this.fish];this.shellVelocity=[0,0,0];this.dragTarget=null;this.dragDistance=0;this.recoveryBlocked=false;this.shots=[];this.reeling=false;this.reelProgress=0;this.transition('swimming','encounter');return true;
 }
 forward(){return[-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch)];}
 right(){return[Math.cos(this.yaw),0,-Math.sin(this.yaw)];}
 muzzle(){const up=[Math.sin(this.yaw)*Math.sin(this.pitch),Math.cos(this.pitch),Math.cos(this.yaw)*Math.sin(this.pitch)];return add(add(add(this.player,mul(this.forward(),.82)),mul(this.right(),0)),mul(up,-.30));}
 port(){const up=[Math.sin(this.yaw)*Math.sin(this.pitch),Math.cos(this.pitch),Math.cos(this.yaw)*Math.sin(this.pitch)];return add(add(add(this.player,mul(this.forward(),1.08)),mul(this.right(),0)),mul(up,-.46));}
 look(dx,dy){this.yaw-=dx;this.pitch=clamp(this.pitch-dy,-.85,.85);}
 beginDrag(){if(this.phase!=='secured')return false;this.dragTarget=[...this.shell];this.dragDistance=0;this.shellVelocity=[0,0,0];this.transition('dragging','drag-start');return true;}
 dragTo(p){if(this.phase!=='dragging')return;this.dragTarget=p.map((v,i)=>clamp(v,i===1?.55:-16,i===1?5.6:16));}
 endDrag(accept=false){if(this.phase!=='dragging')return false;const valid=accept&&!this.recoveryBlocked&&this.dragDistance>.06;this.dragTarget=null;this.shellVelocity=[0,0,0];if(valid){this.dockStart=[...this.shell];this.transition('docking','dock');}else this.transition('secured','drag-stop');return valid;}
 stop(){this.velocity=[0,0,0];}
 transition(phase,event){this.phase=phase;this.phaseAt=this.time;if(phase==='recovered'&&!this.completed.some(c=>c.session===this.session&&c.encounter===this.encounter))this.completed.push({session:this.session,encounter:this.encounter,species:'fish',time:this.time});if(event)this.events.push({type:event,p:[...this.shell]});}
 fire(charge=0){if(this.phase!=='swimming'||this.cooldown>0)return false;const q=clamp(charge,0,1),origin=this.muzzle(),d=unit(sub(add(this.player,mul(this.forward(),3.5)),origin)),speed=5.4+q*1.8;this.shots.push({id:this.nextId++,p:origin,v:mul(d,speed),age:0,power:q,radius:.12+q*.045});this.fired++;this.cooldown=RULES.cooldown;this.events.push({type:'shot',power:q,p:origin});return true;}
 release(){if(this.phase==='swimming')return false;this.releaseOffset=sub(this.fish,this.swimAt(this.time));this.transition('swimming','released');this.shots=[];this.reelProgress=0;this.reeling=false;return true;}
 update(dt,input={},blocked=()=>false,wallDistance=()=>Infinity){
  this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.recoveryBlocked=false;
  // The left stick stays on the horizontal plane, regardless of camera pitch.
  const flat=[-Math.sin(this.yaw),0,-Math.cos(this.yaw)];let wish=add(mul(this.right(),input.x||0),mul(flat,input.z||0));wish[1]=input.y||0;if(len(wish)>1)wish=unit(wish);
  const response=1-Math.exp(-dt*(len(wish)>.001?7:9));for(let i=0;i<3;i++)this.velocity[i]+=(wish[i]*RULES.swimSpeed-this.velocity[i])*response;if(len(this.velocity)<.012)this.stop();
  const next=add(this.player,mul(this.velocity,dt));next[0]=clamp(next[0],-9,9);next[1]=clamp(next[1],.75,5.4);next[2]=clamp(next[2],-15,3.5);for(const axis of [0,2,1]){const p=[...this.player];p[axis]=next[axis];if(!blocked(p))this.player=p;else this.velocity[axis]=0;}
  this.previousFish=[...this.fish];
  if(this.phase==='swimming'){this.releaseOffset=mul(this.releaseOffset,Math.exp(-dt*.8));this.fish=add(this.swimAt(this.time),this.releaseOffset);}
  if(this.phase==='enclosing'&&this.time-this.phaseAt>=RULES.encloseSeconds)this.transition('secured','secured');
  this.reeling=this.phase==='dragging';
  if(this.phase==='dragging'&&this.dragTarget){
   const delta=sub(this.dragTarget,this.shell),distance=len(delta),limit=wallDistance(this.shell,unit(delta),distance+.12);
   this.recoveryBlocked=distance>.001&&limit<distance+.08;
   if(!this.recoveryBlocked){const accel=sub(mul(delta,196),mul(this.shellVelocity,28));this.shellVelocity=add(this.shellVelocity,mul(accel,dt));const p=add(this.shell,mul(this.shellVelocity,dt));if(!blocked(p)){this.dragDistance+=len(sub(p,this.shell));this.shell=p;}else{this.recoveryBlocked=true;this.shellVelocity=[0,0,0];}}
   else this.shellVelocity=[0,0,0];
  }
  if(this.phase==='docking'){const t=clamp((this.time-this.phaseAt)/RULES.dockSeconds,0,1),end=this.port(),start=this.dockStart;this.shell=cubic(start,add(start,[0,.12,0]),add(end,[0,.08,0]),end,smooth(t));if(t>=1)this.transition('recovered','recovered');}
  if(this.phase==='recovered')this.shell=this.port();
  if(this.phase!=='swimming'){const a=this.time;this.fish=add(this.shell,[Math.sin(a*2.3)*.033,Math.sin(a*1.9)*.024,Math.cos(a*1.7)*.027]);}
  const keep=[];
  for(const s of this.shots){const p=add(s.p,mul(s.v,dt)),travel=len(sub(p,s.p));s.age+=dt;const wall=wallDistance(s.p,unit(s.v),travel+s.radius);if(wall<=travel+s.radius){this.missed++;this.events.push({type:'rock',p:add(s.p,mul(unit(s.v),Math.min(wall,travel)))});}
   else if(this.phase==='swimming'&&segmentHit(sub(s.p,this.previousFish),sub(p,this.fish),[0,0,0],RULES.fishRadius+s.radius)){this.shell=[...this.fish];this.shellVelocity=[0,0,0];this.reelProgress=0;this.transition('enclosing','impact');}
   else if(s.age>=2.3){this.missed++;this.events.push({type:'miss',p});}else{s.p=p;keep.push(s);}}
  this.shots=this.phase==='swimming'?keep:[];if(this.phase==='recovered'&&this.time-this.phaseAt>=1.4&&this.time>=this.nextTryAt)this.nextEncounter(blocked,wallDistance);
 }
 drain(){return this.events.splice(0);}
 report(){return {time:this.time,session:this.session,encounter:this.encounter,completed:this.completed.map(c=>({...c})),nextBlocked:this.nextBlocked,phase:this.phase,phaseAge:this.time-this.phaseAt,player:[...this.player],velocity:[...this.velocity],yaw:this.yaw,pitch:this.pitch,fish:[...this.fish],shell:[...this.shell],port:this.port(),reelProgress:this.reelProgress,reeling:this.reeling,recoveryBlocked:this.recoveryBlocked,fired:this.fired,missed:this.missed,cooldown:this.cooldown,shots:this.shots.map(s=>({...s,p:[...s.p],v:[...s.v]})),dragging:this.phase==='dragging',dragDistance:this.dragDistance,collectionComplete:this.phase==='recovered',storageUsed:false};}
}
