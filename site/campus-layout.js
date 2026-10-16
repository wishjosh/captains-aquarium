import {blocked as legacyBlocked,SPOTS as legacySpots} from './layout.js';
export const CAMPUS_START={area:'harbor',x:0,z:5.5};
export const DOORS={management:{x:-8,z:1.15,to:'management',label:'관리동 문'},exhibition:{x:7.3,z:-3.35,to:'exhibition',label:'전시관 문'}};
export const EXITS={management:{x:-10.6,z:11.65,to:'harbor',label:'광장으로',dx:0,dz:1},exhibition:{x:0,z:-2.75,to:'harbor',label:'광장으로',dx:0,dz:1}};
export const SPAWNS={management:{x:-10.6,z:10.4},exhibition:{x:0,z:-3.6}};
import {MANAGEMENT,managementBlocked,managementClear,MANAGEMENT_POINTS} from './management-layout.js';
export {MANAGEMENT} from './management-layout.js';
export const COAST={sea:{x:12,z:14.3},'chromis-sea':{x:-11,z:8},'jelly-sea':{x:16,z:6.1}};
export function spotsFor(area){return area==='harbor'?{sea:COAST.sea}:area==='management'?{management:MANAGEMENT.intake}:{fish:legacySpots.fish,chromis:legacySpots.chromis,jelly:legacySpots.jelly};}
export function blocked(area,x,z,exhibition){
 if(!Number.isFinite(x)||!Number.isFinite(z))return true;
 if(area==='management')return managementBlocked(x,z);
 if(area==='exhibition')return x < -5.8||x >5.8||z < -13.3||z > -2.65||legacyBlocked(x,z,exhibition);
 if(x < -18||x >18||z < -12||z >16.3)return true;
 // Only the departure pier extends over the water.
 if(z>8.8 && !(x>10.9&&x<13.1))return true;
 return (Math.abs(x+8)<5.3&&z> -4.1&&z<.35)||(x> -1.7&&x<14.8&&z> -9.9&&z< -4.05);
}
export function normaliseCampus(data){
 const l=data.location;
 if(l?.area==='underwater')return {...data,location:{map:'campus-1',area:'underwater',x:0,z:8}};
 if(l?.map==='campus-1'&&l.area==='management'&&blocked('management',l.x,l.z))return {...data,location:{map:'campus-1',area:'management',...SPAWNS.management}};
 const location=l&&l.map==='campus-1'&&['harbor','management','exhibition'].includes(l.area)&&!blocked(l.area,l.x,l.z,data.exhibition)?{...l}:{map:'campus-1',...CAMPUS_START};
 return {...data,location};
}
export function nearDoor(area,x,z){
 const doors=area==='harbor'?DOORS:{exit:EXITS[area]};
 for(const [id,d] of Object.entries(doors))if(Math.hypot(x-d.x,z-d.z)<(area==='harbor'?1.15:.55))return {...d,id,dx:d.dx??0,dz:d.dz??-1};
 return null;
}
const points={harbor:[[-17,3],[-14,3],[-2.5,3],[0,5.5],[7.3,2],[16,2],[16,6.1],[-11,8],[12,8],[12,14.3],[12,16]],management:MANAGEMENT_POINTS,exhibition:[[0,-3.4],[-3,-3.4],[3,-3.4],[-5.4,-3.4],[5.4,-3.4],[-5.4,-8.3],[5.4,-8.3],[0,-8.1],[-3,-12.7],[3,-12.7]]};
const managementFixed=new Set([...MANAGEMENT_POINTS.map(([x,z])=>x+','+z),MANAGEMENT.intake.x+','+MANAGEMENT.intake.z,EXITS.management.x+','+EXITS.management.z]),managementLinks=new Map();
function clear(area,a,b){if(area==='management'){const ka=a.x+','+a.z,kb=b.x+','+b.z;if(managementFixed.has(ka)&&managementFixed.has(kb)){const key=ka+'>'+kb;if(!managementLinks.has(key))managementLinks.set(key,managementClear(a,b));return managementLinks.get(key);}return managementClear(a,b);}const d=Math.hypot(a.x-b.x,a.z-b.z),n=Math.ceil(d/.18);for(let i=0;i<=n;i++)if(blocked(area,a.x+(b.x-a.x)*i/Math.max(n,1),a.z+(b.z-a.z)*i/Math.max(n,1)))return false;return true;}
export function waypoint(area,x,z,target){
 const destination=target==='management'?'management':['fish','chromis','jelly'].includes(target)?'exhibition':'harbor';
 let end=destination===area?spotsFor(area)[target]:area==='harbor'?DOORS[destination]:EXITS[area];
 if(!end)return null;
 end={...end,label:destination===area?({management:'관리동 입수',fish:'1번 수조',chromis:'2번 수조',jelly:'3번 수조',sea:'바다 탐사','chromis-sea':'바위 해안','jelly-sea':'잔잔한 바다'})[target]:end.label};
 const start={x,z};if(clear(area,start,end))return {...end,final:destination===area};
 const nodes=[start,...points[area].map(([x,z])=>({x,z})),end],costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),visited=new Set();costs[0]=0;
 for(let count=0;count<nodes.length;count++){let i=-1;for(let j=0;j<nodes.length;j++)if(!visited.has(j)&&(i<0||costs[j]<costs[i]))i=j;if(i<0||!Number.isFinite(costs[i]))break;if(i===nodes.length-1)break;visited.add(i);for(let j=1;j<nodes.length;j++)if(!visited.has(j)&&clear(area,nodes[i],nodes[j])){const c=costs[i]+Math.hypot(nodes[i].x-nodes[j].x,nodes[i].z-nodes[j].z);if(c<costs[j]){costs[j]=c;prev[j]=i;}}}
 let at=nodes.length-1;if(prev[at]<0)return null;while(prev[at]>0)at=prev[at];return {...nodes[at],label:end.label,final:at===nodes.length-1&&destination===area};
}
