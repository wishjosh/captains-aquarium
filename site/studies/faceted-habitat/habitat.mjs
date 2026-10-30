import {clamp,wrap} from './core.mjs';
import {Approach} from './approach.mjs';
// Coordinates are relative to the placed anemone. Solid support is sampled once at load.
export function createResidentHabitat({base=[1.65,.57,-1.1],top=1.22,support=()=>.70}={}){
 const point=(x,y,z)=>{const p=[base[0]+x,top+y,base[2]+z];p[1]=Math.max(p[1],support(p[0],p[2])+.15);return p;};
 const h={base:[...base],top,refuge:point(.02,-.15,.05),entrance:point(-.06,-.035,.27),home:point(-.13,.075,.23),side:point(.14,.065,.1),peek:point(-.23,.11,.43),lookout:point(-.30,.27,.77),edge:point(-.30,.44,1.25)};
 const links=[['refuge','entrance'],['entrance','home'],['home','side'],['home','peek'],['side','peek'],['peek','lookout'],['home','lookout'],['lookout','edge']];
 for(let pass=0;pass<2;pass++)for(const [a,b]of links){let floor=-Infinity;for(let i=0;i<=12;i++){const u=i/12;floor=Math.max(floor,support(h[a][0]*(1-u)+h[b][0]*u,h[a][2]*(1-u)+h[b][2]*u)+.15);}h[a][1]=Math.max(h[a][1],floor);h[b][1]=Math.max(h[b][1],floor);}
 h.minY=Math.min(h.refuge[1],h.entrance[1])-.045;h.links=links;return h;
}
export const ANEMONE=createResidentHabitat();
export const REEF_ROCKS=[
 {x:4.1,z:-1.6,r:1.3,height:3.65,seed:2},
 {x:4.2,z:-3.65,r:1.0,height:2.8,seed:5},
 {x:5.6,z:-2.65,r:1.15,height:3.1,seed:8},
 {x:1.65,z:-1.2,r:.83,height:.84,seed:11},
 {x:2.8,z:-1.85,r:1.05,height:1.13,seed:14}
];
const durations=[2.3,1.2,1.7,1.0,2.1,1.4,1.8,1.3];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function residentRoute(t,h=ANEMONE){
 const points=[h.peek,h.lookout,h.home,h.side];let clock=((t%12.8)+12.8)%12.8,index=0;
 while(clock>=durations[index]&&index<7){clock-=durations[index];index++;}
 const n=Math.floor(index/2),p=points[n],q=points[(n+1)%4],moving=index%2===1,u=moving?clamp(clock/durations[index],0,1):0,s=u*u*(3-2*u);
 return{position:p.map((v,i)=>v+(q[i]-v)*s+(i===1?Math.sin(t*1.9)*.009:0)),activity:moving?'short-swim':'hover'};
}
const episode=[['lookout',.85,'lookout-rest'],['home',1.1,'home-return'],['side',.7,'canopy-shift'],['peek',.9,'canopy-peek'],['lookout',1.0,'canopy-emerged'],['edge',.6,'edge-hover']];
export function residentIntent(a,dt,time,{mode,captain,habitat:h=ANEMONE}){
 const near=p=>distance(a.position,p)<.085;
 if(a.residentMode!==mode){
  const old=a.residentMode;a.residentMode=mode;
  if(mode==='observing'){a.episode=0;a.hold=0;}
  else if(mode!=='roaming'&&!(old==='approaching'&&mode==='choice')){a.calmHold=0;a.calmStage=distance(a.position,h.edge)<.14?2:0;a.calmEdge=true;}
  else if(old){a.returningHome=true;a.roamClock=0;a.calmEdge=false;}
 }
 a.atRest=false;
 if(mode!=='roaming'){
  a.sheltering=false;a.clearTime=0;a.behavior='calmed';
  if(mode==='observing'){
   const [key,hold,behavior]=episode[a.episode];a.behavior=behavior;a.activity='observing';a.atRest=near(h[key]);
   a.hold=a.atRest?a.hold+dt:0;if(a.hold>=hold){a.episode=(a.episode+1)%episode.length;a.hold=0;}
   return{target:h[key],maximum:.46,avoiding:false};
  }
  const path=[h.entrance,h.lookout,h.edge];if(a.calmStage<2&&near(path[a.calmStage]))a.calmStage++;
  a.calmHold=near(h.edge)&&Math.hypot(...a.velocity)<.12?a.calmHold+dt:0;a.calmEdge=a.calmHold<.25;a.activity=a.calmEdge?'emerging':'calmed';
  return{target:path[a.calmStage],maximum:.5,avoiding:false};
 }
 const d=captain?distance(captain.position,h.edge):99,speed=captain?Math.hypot(...captain.velocity):0;
 if(!a.sheltering&&(d<1.95||(d<2.35&&speed>.35))){a.sheltering=true;a.shelterStage=0;a.shelterAge=0;a.peekAge=0;a.quiet=0;a.clearTime=0;a.returningHome=false;}
 if(a.sheltering){
  a.clearTime=d>3?(a.clearTime||0)+dt:0;a.quiet=speed<.2&&d>1.25?(a.quiet||0)+dt:0;
  if(a.clearTime>1.4){a.sheltering=false;a.returningHome=true;a.roamClock=0;}
  else{
   if(a.shelterStage===0&&near(h.entrance))a.shelterStage=1;
   if(a.shelterStage===1&&near(h.refuge))a.shelterAge+=dt;
   if(a.shelterAge>2.1&&a.quiet>1.6){a.shelterStage=2;a.peekAge+=dt;}
   if(a.shelterStage===2&&(speed>.4||d<1.25||a.peekAge>3.2)){a.shelterStage=1;a.shelterAge=0;a.peekAge=0;}
   const target=a.shelterStage===0?h.entrance:a.shelterStage===1?h.refuge:h.peek;
   a.activity=a.shelterStage===2?'peeking':near(h.refuge)?'sheltering':'withdrawing';a.behavior=a.shelterStage===2?'peek-from-cover':'refuge';
   return{target,maximum:a.shelterStage===2?.48:1.0,avoiding:true};
  }
 }
 if(a.returningHome){a.activity='emerging';a.behavior='home-return';if(near(h.home))a.returningHome=false;return{target:h.home,maximum:.52,avoiding:false};}
 a.roamClock=(a.roamClock||0)+dt;const route=residentRoute(a.roamClock,h);a.activity=route.activity;a.behavior='at-home';return{target:route.position,maximum:.95,avoiding:false};
}
export function residentCaption(a){
 if(a.mode==='observing'&&a.behavior==='lookout-rest'&&!a.atRest)return '말미잘 가장자리로 조금 나와요';
 if(a.mode==='observing')return({'lookout-rest':'말미잘 가장자리에서 잠시 쉬고 있어요','home-return':'말미잘 가까이로 돌아가고 있어요','canopy-shift':'촉수 곁에서 자리를 바꾸고 있어요','canopy-peek':'촉수 사이로 살짝 모습을 보여요','canopy-emerged':'다시 가장자리로 나와 주변을 살펴봐요','edge-hover':'가까이에서 천천히 지느러미를 움직여요'}[a.behavior]);
 if(a.sheltering&&a.activity==='withdrawing')return '말미잘 안쪽으로 피하고 있어요 · 잠시 멈춰 지켜보세요';
 if(a.sheltering)return a.activity==='peeking'?'살짝 모습을 보여요 · 터치하면 마법으로 안심시킬 수 있어요':'말미잘 안쪽으로 숨었어요 · 멈춰 기다리거나 조금 물러서 보세요';
 return null;
}

// A resident may emerge toward the observer. Keep body clearance before offering choices.
export class HabitatApproach extends Approach{
 control(dt,manual,w,target,{settled=true}={}){
  const wasApproaching=this.phase==='approaching';let control=super.control(dt,manual,w,target);
  if(!wasApproaching||this.phase==='free')return control;
  const dx=target[0]-w.position[0],dz=target[2]-w.position[2],dy=target[1]-w.position[1],distance=Math.hypot(dx,dz),error=wrap(Math.atan2(dx,-dz)-w.heading);
  if(this.phase==='choice'&&(!settled||distance<1.5)){this.phase='approaching';this.settle=0;this.events=this.events.filter(e=>e!=='arrived');}
  if(this.phase==='approaching'&&distance<1.7&&Math.abs(error)<.85)control={x:clamp(error*1.65),z:-clamp((1.75-distance)*2,0,.85),y:clamp(dy*1.8,-.65,.65)};
  return control;
 }
}
