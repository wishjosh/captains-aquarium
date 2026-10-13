export const START={x:0,z:1};
export const TANKS={
  fish:{x:-3,z:-5.8,shape:'rectangle'},
  chromis:{x:3,z:-5.8,shape:'rectangle'},
  jelly:{x:0,z:-10.4,shape:'cylinder'}
};
export const SPOTS={
  management:{x:-2.9,z:1.9},
  fish:{x:-3,z:-3.4},chromis:{x:3,z:-3.4},jelly:{x:0,z:-8.1},
  sea:{x:0,z:6.6},'chromis-sea':{x:-4,z:9.8},'jelly-sea':{x:4,z:11.5}
};
export const WALLS=[{"x": -4.2, "z": -2, "w": 4.1, "d": 0.25, "zone": "exhibition"}, {"x": 4.2, "z": -2, "w": 4.1, "d": 0.25, "zone": "exhibition"}, {"x": -3.7, "z": -0.7, "w": 4.5, "d": 0.2, "zone": "management"}, {"x": -3.7, "z": 4.5, "w": 4.5, "d": 0.2, "zone": "management"}, {"x": -5.95, "z": 1.9, "w": 0.2, "d": 5.2, "zone": "management"}, {"x": -1.45, "z": 0, "w": 0.2, "d": 1.4, "zone": "management"}, {"x": -1.45, "z": 3.8, "w": 0.2, "d": 1.4, "zone": "management"}];
export const COLLIDERS=[{x:-3,z:-5.8,w:3.6,d:2.6},{x:3,z:-5.8,w:3.6,d:2.6},{x:0,z:-10.4,r:1.65},{x:0,z:9.5,w:4.8,d:3.8},...WALLS,{x:-4.7,z:1.9,w:1.1,d:2.6}];
export function blocked(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x < -5.8||x > 5.8||z < -13.3||z > 12.8)return true;
  return COLLIDERS.some(c=>c.r?Math.hypot(x-c.x,z-c.z)<c.r+.44:Math.abs(x-c.x)<c.w/2+.44&&Math.abs(z-c.z)<c.d/2+.44);
}
export const zoneAt=(x,z)=>z < -2.1?'exhibition':x < -1.45&&z > -.7&&z < 4.5?'management':'harbor';
export const ZONE_NAMES={exhibition:'전시관',management:'관리동',harbor:'선착장·해안'};
export function normalisePosition(data){return blocked(data.x,data.z)?{...data,...START}:data;}

const ROUTE_POINTS=[
 ...Object.entries(SPOTS).map(([name,p])=>({...p,name,label:({management:'관리동 입수',fish:'전시관 · 범돔',chromis:'전시관 · 자리돔',jelly:'전시관 · 해파리',sea:'바다 탐사','chromis-sea':'왼쪽 바위 해안','jelly-sea':'오른쪽 잔잔한 바다'})[name]})),
 {name:'plaza',x:0,z:1.9,label:'광장 중앙'},
 {name:'front-corridor',x:0,z:-1.3,label:'전시관 입구'},
 {name:'care-north',x:-2.9,z:0,label:'관리동 출입문'},
 {name:'care-south',x:-2.9,z:3.85,label:'관리동 출입문'},
 {name:'gallery-left',x:-5.4,z:-8.3,label:'전시관 관람길'},
 {name:'gallery-right',x:5.4,z:-8.3,label:'전시관 관람길'},
 {name:'gallery-rear-left',x:-3,z:-12.7,label:'전시관 관람길'},
 {name:'gallery-rear-right',x:3,z:-12.7,label:'전시관 관람길'},
 {name:'entrance',x:0,z:-3.4,label:'전시관 입구'},
 {name:'left-path',x:-4,z:6.6,label:'왼쪽 모래길'},
 {name:'right-path',x:4,z:6.6,label:'오른쪽 모래길'}
];
function clearSegment(a,b){
 if(blocked(a.x,a.z)||blocked(b.x,b.z))return false;
 const dx=b.x-a.x,dz=b.z-a.z;
 return !COLLIDERS.some(c=>{
  if(c.r){
   const length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.z-a.z)*dz)/length)):0;
   return Math.hypot(a.x+dx*t-c.x,a.z+dz*t-c.z)<=c.r+.44;
  }
  let enter=0,leave=1;
  for(const [value,delta,center,width] of [[a.x,dx,c.x,c.w],[a.z,dz,c.z,c.d]]){
   const min=center-width/2-.44,max=center+width/2+.44;
   if(Math.abs(delta)<1e-10){if(value<min||value>max)return false;continue;}
   const first=(min-value)/delta,last=(max-value)/delta;
   enter=Math.max(enter,Math.min(first,last));leave=Math.min(leave,Math.max(first,last));
   if(enter>leave)return false;
  }
  return enter<=leave;
 });
}
const edges=ROUTE_POINTS.map((a,i)=>ROUTE_POINTS.map((b,j)=>i!==j&&clearSegment(a,b)?Math.hypot(a.x-b.x,a.z-b.z):Infinity));
const routes=new Map();
export function routeWaypoint(x,z,target){
 const end=ROUTE_POINTS.findIndex(p=>p.name===target);if(end<0)return null;
 if(!routes.has(target)){
  const costs=ROUTE_POINTS.map(()=>Infinity),next=ROUTE_POINTS.map(()=>-1),visited=new Set();costs[end]=0;
  for(let round=0;round<ROUTE_POINTS.length;round++){
   let i=-1;for(let j=0;j<costs.length;j++)if(!visited.has(j)&&(i<0||costs[j]<costs[i]))i=j;
   if(i<0||!Number.isFinite(costs[i]))break;visited.add(i);
   for(let j=0;j<costs.length;j++){const cost=costs[i]+edges[i][j];if(cost<costs[j]){costs[j]=cost;next[j]=i;}}
  }
  routes.set(target,{costs,next});
 }
 const {costs,next}=routes.get(target),player={x,z};let best=-1,score=Infinity;
 for(let i=0;i<ROUTE_POINTS.length;i++){
  const value=Math.hypot(x-ROUTE_POINTS[i].x,z-ROUTE_POINTS[i].z)+costs[i];
  if(Number.isFinite(value)&&clearSegment(player,ROUTE_POINTS[i])&&(value<score-.01||Math.abs(value-score)<.01&&costs[i]<costs[best])){
   best=i;score=value;
  }
 }
 if(best<0)return null;
 if(Math.hypot(x-ROUTE_POINTS[best].x,z-ROUTE_POINTS[best].z)<.6&&next[best]>=0&&clearSegment(player,ROUTE_POINTS[next[best]]))best=next[best];
 return {...ROUTE_POINTS[best],final:best===end};
}
