export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),len=a=>Math.hypot(...a),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const smooth=t=>t*t*(3-2*t);
export class World{
 constructor(){this.obstructed=()=>false;this.blocked=()=>false;this.reset();}
 reset(){this.mode=this.mode||'screen';this.moveYaw=0;this.time=0;this.player=[0,2.35,2.3];this.velocity=[0,0,0];this.yaw=0;this.bodyYaw=0;this.pitch=0;this.phase='swimming';this.age=0;this.fish=[.25,2.45,-2.6];this.shell=[...this.fish];this.count=0;this.slots=[false,false,false];this.slot=-1;this.charge=0;this.message='흰동가리 가까이 헤엄쳐 가세요';this.dragProgress=0;this.events=[];}
 look(dx,dy){this.yaw-=dx;this.pitch=clamp(this.pitch-dy,-.45,.5);}
 stop(){this.velocity=[0,0,0];}
 local(x,y,z,body=false){const a=body?this.bodyYaw:this.yaw;return add(this.player,[Math.cos(a)*x+Math.sin(a)*z,y,Math.sin(a)*x-Math.cos(a)*z]);}
 field(){return this.local(0,.13,1.42,true);}
 hand(){return this.local(.2,.35,.78,true);}
 slotAt(i){const p=[[.39,1.95,-.85],[-.39,1.95,-.85],[0,2.50,-.88]][i];return this.local(p[0]+Math.sin(this.time*1.4+i)*.035,p[1]+Math.sin(this.time*1.7+i)*.035,p[2],true);}
 radius(q=this.charge){return .18+.66*clamp(q);}
 inField(q=this.charge){return len(sub(this.fish,this.field()))<this.radius(q)-.12&&!this.obstructed(this.field(),this.fish);}
 close(q){if(this.phase!=='swimming')return false;if(q<.3||!this.inField(q)){this.message=q<.3?'조금 더 크게 펼친 뒤 놓아 보세요':'흰동가리가 물방울 안에 들어오면 놓아 주세요';this.events.push('miss');return false;}this.phase='closing';this.age=0;this.from=[...this.field()];this.captureRadius=this.radius(q);this.shell=[...this.from];this.events.push('impact');return true;}
 beginDrag(){if(this.phase!=='secured')return false;this.phase='dragging';this.from=[...this.shell];this.dragProgress=0;return true;}
 drag(t){if(this.phase==='dragging'){this.dragProgress=clamp(t);this.shell=mix(this.from,this.hand(),smooth(this.dragProgress));}}
 endDrag(accept){if(this.phase!=='dragging')return false;this.slot=this.slots.indexOf(false);if(!accept||this.dragProgress<.5||this.slot<0||this.obstructed(this.shell,this.hand())){this.phase='secured';this.age=0;this.message='물방울을 잡아 선장 쪽으로 쓸어 주세요';return false;}this.phase='handoff';this.age=0;this.message='어깨 너머로 살며시 넘기고 있어요';this.from=[...this.shell];this.events.push('dock');return true;}
 step(dt,input={x:0,y:0,z:0},charge=0){
  this.time+=dt;this.age+=dt;this.charge=charge;
  const x=input.x||0,z=input.z||0,n=Math.max(1,Math.hypot(x,z));
  let v;
  if(this.mode==='body'){
   this.bodyYaw+=x*1.7*dt;
   v=[Math.sin(this.bodyYaw)*z,(input.y||0)*.75,-Math.cos(this.bodyYaw)*z];
  }else{
   v=[(Math.cos(this.moveYaw)*x+Math.sin(this.moveYaw)*z)/n,(input.y||0)*.75,(Math.sin(this.moveYaw)*x-Math.cos(this.moveYaw)*z)/n];
   if(Math.hypot(x,z)>.04){const target=Math.atan2(v[0],-v[2]);const d=Math.atan2(Math.sin(target-this.bodyYaw),Math.cos(target-this.bodyYaw));this.bodyYaw+=d*(1-Math.exp(-dt*5));}
  }
  const factor=['dragging','handoff'].includes(this.phase)?.38:charge>0?.6:1;
  this.velocity=mix(this.velocity,mul(v,1.65*factor),1-Math.exp(-dt*(len(v)>0?4.5:6)));if(len(v)===0&&len(this.velocity)<.008)this.stop();
  const next=add(this.player,mul(this.velocity,dt));next[0]=clamp(next[0],-8,8);next[1]=clamp(next[1],1.25,5.2);next[2]=clamp(next[2],-14,4);if(!this.blocked(next))this.player=next;else this.stop();
  if(this.phase==='swimming'){this.fish=[.25+Math.sin(this.time*.58)*.27,2.45+Math.sin(this.time*.83)*.10,-2.6+Math.sin(this.time*.39)*.16];this.shell=[...this.fish];}
  if(this.phase==='closing'){const t=clamp(this.age/.55);this.shell=mix(this.from,this.fish,smooth(t));if(t===1){this.phase='secured';this.age=0;this.message='물방울을 잡아 선장 쪽으로 쓸어 주세요';this.events.push('secured');}}
  if(this.phase==='secured'){this.shell[1]+=Math.sin(this.time*2)*.014*dt;this.fish=[...this.shell];}
  if(this.phase==='dragging')this.fish=[...this.shell];
  if(this.phase==='handoff'){const t=clamp(this.age/1.35),a=this.hand(),b=this.local(.77,1.60,.5,true),c=this.local(.90,2.25,-.25,true),d=this.slotAt(this.slot);this.shell=t<.2?mix(this.from,a,smooth(t/.2)):bezier(a,b,c,d,smooth((t-.2)/.8));this.fish=[...this.shell];if(t===1){this.slots[this.slot]=true;this.count++;this.phase='stored';this.age=0;this.message='등 뒤에 함께 있어요. 헤엄치며 살펴보세요';this.events.push('recovered');}}
  if(this.phase==='stored'){this.shell=this.slotAt(this.slot);this.fish=[...this.shell];}
 }
 report(){return{mode:this.mode,time:this.time,phase:this.phase,age:this.age,player:[...this.player],velocity:[...this.velocity],yaw:this.yaw,bodyYaw:this.bodyYaw,pitch:this.pitch,fish:[...this.fish],shell:[...this.shell],field:this.field(),radius:this.radius(),inField:this.inField(),charge:this.charge,count:this.count,slots:[...this.slots]};}
}
function bezier(a,b,c,d,t){return a.map((v,i)=>v*(1-t)**3+3*b[i]*(1-t)**2*t+3*c[i]*(1-t)*t*t+d[i]*t**3);}
