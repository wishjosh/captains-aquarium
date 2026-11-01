import {clamp,damp,wrap} from './core.mjs';
export const CHROMIS_FISH=Object.freeze([0,1,2].map(id=>({id,place:'암반 위 자리돔 무리',behavior:'서로 간격을 두고 바위턱 주변을 오가는 모습'})));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const length=v=>Math.hypot(...v);
export function createChromisHabitat(support=()=>.8){
 // Sample the full living/retreat area once. The animation uses no terrain raycasts.
 let top=-Infinity;for(let x=-1;x<=4.05;x+=.18)for(let z=-3.9;z<=1.55;z+=.18)top=Math.max(top,support(x,z));
 const y=Math.max(2.05,top+.65);return{center:[1.55,y,-1.3],edge:[.45,y+.05,.28],minY:y-.18,maxY:y+.65,radius:2.5};
}
const offsets=[[-.55,-.02,.35],[.40,.18,.05],[.06,-.10,-.58]];
export function shoalTarget(id,t,h){const o=offsets[id%3],slow=t*.21,angle=Math.sin(t*.13)*.48,c=Math.cos(angle),s=Math.sin(angle),pulse=Math.sin(t*.57+id*2.1);return[h.center[0]+Math.sin(slow)*.32+o[0]*c-o[2]*s+pulse*.08,h.center[1]+o[1]+Math.sin(t*.42+id*1.7)*.07,h.center[2]+Math.sin(t*.16)*.24+o[2]*c+o[0]*s+Math.sin(t*.37+id)*.10];}
export class ChromisLife{
 constructor(habitat=createChromisHabitat()){this.setHabitat(habitat);}
 setHabitat(h){this.habitat=h;this.habitats=[h];this.reset();}
 setHabitats(hs){this.habitat=hs[0];this.habitats=hs;this.reset();}
 reset(){this.time=0;this.agents=this.habitats.flatMap((h,index)=>CHROMIS_FISH.map(({id:local})=>{const id=index*3+local;return({id,position:shoalTarget(id,0,h),velocity:[0,0,0],yaw:Math.PI/2,mode:'roaming',modeAge:0,calmEdge:false,anchor:null,retreat:false,clearAge:0,activity:'at-home'});}));}
 step(dt,members,{selected=-1,phase='free',captain=null}={}){
  dt=clamp(dt,0,.05);this.time+=dt;const h=this.habitat;
  for(const f of members)if(f.state!=='wild'){this.agents[f.id].mode='collected';this.agents[f.id].response='magic';this.agents[f.id].activity=f.state;}
  const active=members.filter(f=>f.state==='wild'),before=this.agents.map(a=>({...a,position:[...a.position],velocity:[...a.velocity]}));
  for(const f of active){const h=this.habitats[Math.floor(f.id/3)],a=this.agents[f.id],mode=f.id===selected&&['approaching','choice','observing'].includes(phase)?phase:'roaming';
   if(mode!==a.mode){a.modeAge=0;if(mode==='approaching'){a.anchor=[...a.position];a.calmEdge=true;}if(mode==='roaming'){a.anchor=null;a.calmEdge=false;}a.mode=mode;}
   a.modeAge+=dt;let target=shoalTarget(a.id,this.time,h),maximum=.58;a.response='natural';a.activity='at-home';
   if(mode==='approaching'||mode==='choice'){target=a.anchor||a.position;maximum=.65;a.response='calm';a.activity='calming';if(distance(a.position,target)<.09&&length(a.velocity)<.10){a.calmEdge=false;a.activity='calmed';}else a.calmEdge=true;}
   if(mode==='observing'){a.response='calm';a.activity='rejoining';a.calmEdge=false;maximum=.54;if(distance(a.position,target)<.16)a.activity='at-home';}
   let desired=target.map((v,i)=>(v-a.position[i])*2.4);
   const d=captain?distance(a.position,captain.position):Infinity,velocity=captain?.velocity||[0,0,0],predicted=captain?captain.position.map((v,i)=>v+velocity[i]*.32):null,pd=predicted?distance(a.position,predicted):Infinity;
   if(mode==='roaming'){
    if(Math.min(d,pd)<2.05){a.retreat=true;a.clearAge=0;}
    else if(a.retreat){a.clearAge=d>2.65?a.clearAge+dt:0;if(a.clearAge>1.1)a.retreat=false;}
    if(a.retreat&&captain){a.response='avoiding';a.activity='withdrawing';const from=pd<d?predicted:captain.position,away=a.position.map((v,i)=>v-from[i]),n=length(away);const unit=n>.001?away.map(v=>v/n):[Math.cos(a.id*2),.3,Math.sin(a.id*2)];const weight=clamp((2.8-Math.min(d,pd))/1.6,0,1);maximum=2.9;for(let i=0;i<3;i++)desired[i]=desired[i]*(1-weight)+unit[i]*maximum*weight;desired[1]+=.18*weight;}
   }else{a.retreat=false;a.clearAge=0;}
   // All wild neighbours keep their bodies apart; a calmed target has priority.
   if(mode!=='approaching'&&mode!=='choice')for(const other of active){if(other.id===a.id)continue;const p=before[other.id].position,away=a.position.map((v,i)=>v-p[i]),n=length(away),r=.72;if(n<r){const dir=n>.001?away.map(v=>v/n):[Math.cos(a.id*2),0,Math.sin(a.id*2)];for(let i=0;i<3;i++)desired[i]+=dir[i]*(r-n)*5;}}
   const n=length(desired);if(n>maximum)desired=desired.map(v=>v*maximum/n);
   a.velocity=a.velocity.map((v,i)=>damp(v,desired[i],a.retreat?8:4,dt));a.position=a.position.map((v,i)=>v+a.velocity[i]*dt);
   // The captain's safety distance takes precedence over the soft home boundary.
   if(captain&&mode==='roaming'){const away=a.position.map((v,i)=>v-captain.position[i]),n=length(away);if(n<1.02){const dir=n>.001?away.map(v=>v/n):[Math.cos(a.id*2),0,Math.sin(a.id*2)];a.position=captain.position.map((v,i)=>v+dir[i]*1.02);a.response='avoiding';}}
   a.position[1]=clamp(a.position[1],h.minY,h.maxY);
   // Return gradually from a brief escape, rather than clamping to a visible wall.
   const dx=a.position[0]-h.center[0],dz=a.position[2]-h.center[2],rad=Math.hypot(dx,dz);if(rad>h.radius&&(!captain||d>2.2)){const correction=Math.min(rad-h.radius,dt*.45);a.position[0]-=dx/rad*correction;a.position[2]-=dz/rad*correction;}
   if(Math.hypot(a.velocity[0],a.velocity[2])>.025){const yaw=Math.atan2(a.velocity[0],a.velocity[2]);a.yaw+=wrap(yaw-a.yaw)*(1-Math.exp(-dt*4));}
   f.position=[...a.position];f.velocity=[...a.velocity];f.yaw=a.yaw;
  }
 }
 caption(selected,phase){if(this.agents.every(a=>a.mode==='collected'))return '모두 선장 곁에 모였어요 · 함께 헤엄치거나 배로 돌아가세요';if(phase==='approaching')return '선택한 자리돔이 그 자리에서 안심해요 · 가까이 다가가는 중';if(phase==='choice')return '관찰은 움직임 보기 · 수집은 마법으로 함께하기';if(phase==='observing')return '안심한 자리돔이 무리 곁으로 돌아가요 · 다른 생물의 움직임도 살펴보세요';if(this.agents.some(a=>a.response==='avoiding'))return '가까이 다가가면 물러나요 · 터치하면 한 마리를 마법으로 안심시켜요';return '바위턱 위의 작은 무리를 찾아보세요 · 생물을 터치하면 다가가요';}
 report(){return this.agents.map(a=>({id:a.id,place:'암반 위 자리돔 무리',mode:a.mode,response:a.response||'natural',activity:a.activity,calmEdge:a.calmEdge,position:[...a.position],velocity:[...a.velocity],remainingWild:a.mode!=='collected'}));}
}
