// First-stage discovery trial. Positions are metres; no saved progress or species claim.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const GARDEN_VERSION='2026-11-03-garden-1';
export const GARDEN_PATH=[[0,-5],[-4.7,-7],[-5.8,-10],[-5.8,-14.7],[-2.8,-14.7],[0,-13.5]];
export const GARDEN_WALLS=[
 {id:'front-left',part:3,center:[-1.55,-9.5],size:[3.25,3.8,1.5]},
 {id:'front-right',part:2,center:[1.55,-9.5],size:[3.25,3.8,1.5]},
 {id:'west-shoulder',part:6,center:[-3.8,-11.2],size:[1.8,3.5,3.1]},
 {id:'east',part:3,center:[3.8,-13],size:[2.1,3.5,6.6]},
 {id:'rear-left',part:2,center:[-2.3,-17.5],size:[4.0,3.3,2.0]},
 {id:'rear-right',part:6,center:[1.7,-17.5],size:[4.0,3.5,2.0]}
];
export const insideGarden=p=>Math.abs(p[0])<3.15&&p[2]<-11.3&&p[2]>-16.4;
export class GardenDiscovery {
 constructor(){this.reset();}
 reset(){this.time=0;this.phase='peeking';this.position=[0,2.65,-9.1];this.velocity=[0,0,0];this.clueAge=0;this.clueSeen=false;this.foundAge=0;this.found=false;this.foundAt=null;this.routeUsed=false;this.quiet=0;this.away=0;this.help=false;this.events=[];}
 step(dt,{position,velocity=[0,0,0],visible=false}={}){
  dt=clamp(dt,0,.05);this.time+=dt;
  if(!position)return;
  const inner=insideGarden(position),speed=Math.hypot(...velocity),front=position[2]>-10;
  if(position[0]<-4.4&&position[2]<-12.8&&position[2]>-16.5)this.routeUsed=true;
  if(front&&visible&&!this.clueSeen){this.clueAge+=dt;if(this.clueAge>=.3){this.clueSeen=true;this.events.push('clue');}}
  else if(!this.clueSeen)this.clueAge=0;
  if(this.phase==='peeking'&&(inner||front&&Math.hypot(position[0],position[2]+9.1)<4.6)){this.phase='retreating';this.events.push('retreat');}
  this.quiet=inner&&speed<.2?this.quiet+dt:0;
  if(inner&&this.quiet>.7)this.phase='emerging';
  const target=this.phase==='peeking'?[Math.sin(this.time*1.3)*.06,2.65+Math.sin(this.time*1.8)*.045,-9.1]:this.phase==='emerging'?[Math.sin(this.time*.45)*.55,2.65+Math.sin(this.time*.8)*.12,-13.7]:[1.6,2.65,-15.6];
  const rate=this.phase==='retreating'?1.2:1.8;
  const previous=this.position;this.position=this.position.map((v,i)=>v+(target[i]-v)*(1-Math.exp(-dt*rate)));
  this.velocity=this.position.map((v,i)=>dt?(v-previous[i])/dt:0);
  // A sighting needs proximity, actual view visibility and uninterrupted dwell.
  const near=Math.hypot(...this.position.map((v,i)=>v-position[i]))<6;
  this.foundAge=inner&&near&&visible?this.foundAge+dt:0;
  if(!this.found&&this.foundAge>=1){this.found=true;this.foundAt=this.time;this.events.push('found');}
  this.away=!inner&&Math.hypot(position[0],position[2]+10)>10?this.away+dt:0;
  if(!this.found&&this.away>6){this.phase='peeking';this.away=0;}
 }
 hint(){if(this.found)return '바위 안쪽의 작은 정원을 발견했어요 · 둘러본 뒤 배로 돌아갈 수 있어요';if(!this.help)return '주변의 작은 움직임을 살펴보세요';return this.phase==='peeking'?'무리 너머 바위틈에서 작은 움직임이 보여요':this.routeUsed?'바위 안쪽을 바라보고 잠시 멈춰 보세요':'바위 가장자리를 따라 밝은 모래 길이 이어져요';}
 report(){return{version:GARDEN_VERSION,phase:this.phase,position:[...this.position],clueSeen:this.clueSeen,found:this.found,foundAt:this.foundAt,routeUsed:this.routeUsed,helpUsed:this.help,storage:'memory-only'};}
}

export function gardenSand(x,z){let distance=Infinity;for(let i=1;i<GARDEN_PATH.length;i++){const a=GARDEN_PATH[i-1],b=GARDEN_PATH[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}const v=clamp((1.6-distance)/1.1);return v*v*(3-2*v);}
