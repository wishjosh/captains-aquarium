export const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
export const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class SwimWorld {
 constructor({maxForward=1.7,coastRate=3.5,brakeRate=4.4}={}){this.tuning={maxForward,coastRate,brakeRate};this.reset();}
 reset(){this.position=[0,2.5,4];this.velocity=[0,0,0];this.heading=0;this.turnRate=0;this.time=0;this.forwardSpeed=0;this.effort=0;this.cruise=0;this.state='float';this.input={x:0,z:0,y:0};this.obstacles=[[-4,-2,1.1],[4,-5,1.1],[-4,-10,1.2],[5,-12,1.4]];}
 step(dt,input={}){
  dt=clamp(dt,0,.05);this.time+=dt;
  const x=clamp(input.x||0),z=clamp(input.z||0),y=clamp(input.y||0);this.input={x,z,y};
  const priorForward=this.velocity[0]*Math.sin(this.heading)-this.velocity[2]*Math.cos(this.heading);
  const turning=x*(1.65-.65*clamp(Math.abs(priorForward)/1.7,0,1));
  this.turnRate=damp(this.turnRate,turning,8,dt);this.heading=wrap(this.heading+this.turnRate*dt);
  const limit=Math.min(this.tuning.maxForward,Math.max(0,input.speedLimit??this.tuning.maxForward));
  const targetSpeed=z>=0?z*limit:z*.52;
  const rate=z<0&&priorForward>.06?this.tuning.brakeRate:Math.abs(z)<.025?this.tuning.coastRate:2.8;
  const speed=damp(priorForward,targetSpeed,rate,dt);
  // Propulsion follows the captain, never a camera transform. Lateral drift decays.
  const forward=[Math.sin(this.heading),0,-Math.cos(this.heading)],right=[Math.cos(this.heading),0,Math.sin(this.heading)];
  let lateral=this.velocity[0]*right[0]+this.velocity[2]*right[2];lateral=damp(lateral,0,5,dt);
  this.velocity=[forward[0]*speed+right[0]*lateral,damp(this.velocity[1],y*.7,y?3:4,dt),forward[2]*speed+right[2]*lateral];
  if(Math.abs(z)<.025&&Math.hypot(this.velocity[0],this.velocity[2])<.015)this.velocity[0]=this.velocity[2]=0;
  if(!y&&Math.abs(this.velocity[1])<.01)this.velocity[1]=0;
  const p=this.position.map((v,i)=>v+this.velocity[i]*dt);
  for(const [cx,cz,r,height=1.0] of this.obstacles){if(p[1]>height+1.05)continue;const dx=p[0]-cx,dz=p[2]-cz,d=Math.hypot(dx,dz),limit=r+.48;if(d<limit){const nx=d?dx/d:1,nz=d?dz/d:0;p[0]=cx+nx*limit;p[2]=cz+nz*limit;const into=this.velocity[0]*nx+this.velocity[2]*nz;if(into<0){this.velocity[0]-=into*nx;this.velocity[2]-=into*nz;}}}
  const bounds=[[-9,9],[1.2,5.5],[-14,7]];for(let i=0;i<3;i++){const bounded=clamp(p[i],...bounds[i]);if(bounded!==p[i])this.velocity[i]=0;p[i]=bounded;}this.position=p;
  this.forwardSpeed=this.velocity[0]*forward[0]+this.velocity[2]*forward[2];
  const actual=Math.hypot(this.velocity[0],this.velocity[2]);
  this.effort=damp(this.effort,Math.max(Math.abs(z),Math.abs(x)*.5,Math.abs(y)*.6),5,dt);
  this.cruise=damp(this.cruise,clamp(this.forwardSpeed/1.05,0,1),3,dt);
  this.state=z<-.05&&this.forwardSpeed>.08?'brake':this.forwardSpeed<-.04?'reverse':actual>.04?(Math.abs(z)<.025?'coast':actual<.32?'start':'swim'):Math.abs(this.turnRate)>.08?'turn':Math.abs(this.velocity[1])>.03?'depth':'float';
 }
 report(){return {position:[...this.position],velocity:[...this.velocity],heading:this.heading,turnRate:this.turnRate,forwardSpeed:this.forwardSpeed,cruise:this.cruise,state:this.state,time:this.time,input:{...this.input}};}
}

