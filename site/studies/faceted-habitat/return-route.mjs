import {reefFloor} from './reef-terrain.mjs?v=2026-11-01-extension-1';
import {REGION} from './exploration-region.mjs?v=2026-11-01-extension-1';
const flat=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
// Coordinate-only routing survives tile unloading. Search visits local neighbours only.
export function returnRoute(start,home,obstacles=[],bounds=REGION.bounds){
 const rocks=obstacles.map(([x,z,r])=>({x,z,r:r+.85}));
 const clear=p=>reefFloor(p[0],p[2])<4.35&&rocks.every(o=>Math.hypot(p[0]-o.x,p[2]-o.z)>o.r);
 const segment=(a,b,escape=false)=>{const n=Math.max(1,Math.ceil(flat(a,b)/.4));for(let i=0;i<=n;i++){const t=i/n,p=[a[0]+(b[0]-a[0])*t,0,a[2]+(b[2]-a[2])*t];if(reefFloor(p[0],p[2])>=4.35)return false;for(const o of rocks)if(Math.hypot(p[0]-o.x,p[2]-o.z)<=o.r){if(escape&&Math.hypot(a[0]-o.x,a[2]-o.z)<=o.r&&(b[0]-a[0])*(a[0]-o.x)+(b[2]-a[2])*(a[2]-o.z)>=0)continue;return false;}}return true;};
 let points;if(segment(start,home,true))points=[[...home]];else{
 const step=1.5,nodes=[start,home],grid=new Map(),cells=new Map();for(let z=Math.ceil((bounds[2][0]+1)/step);z<=Math.floor((bounds[2][1]-1)/step);z++)for(let x=Math.ceil((bounds[0][0]+1)/step);x<=Math.floor((bounds[0][1]-1)/step);x++){const p=[x*step,0,z*step];if(clear(p)){grid.set(x+':'+z,nodes.length);cells.set(nodes.length,[x,z]);nodes.push(p);}}
 const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),open=new Set([0]),closed=new Set();costs[0]=0;
 while(open.size){let u=-1,score=Infinity;for(const i of open){const f=costs[i]+flat(nodes[i],home);if(f<score){u=i;score=f;}}if(u===1)break;open.delete(u);closed.add(u);const neighbours=[];
 if(u===0){for(let i=2;i<nodes.length;i++)if(flat(start,nodes[i])<3.5)neighbours.push(i);}else{const [x,z]=cells.get(u);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const v=grid.get((x+dx)+':'+(z+dz));if(v!==undefined)neighbours.push(v);}if(flat(nodes[u],home)<3.5)neighbours.push(1);}
 for(const v of neighbours){if(closed.has(v)||!segment(nodes[u],nodes[v],u===0))continue;const cost=costs[u]+flat(nodes[u],nodes[v]);if(cost<costs[v]){costs[v]=cost;previous[v]=u;open.add(v);}}}
 if(!Number.isFinite(costs[1]))return null;const raw=[];for(let i=1;i>0;i=previous[i])raw.unshift(nodes[i]);raw.unshift(start);points=[];let index=0;while(index<raw.length-1){let next=raw.length-1;while(next>index+1&&!segment(raw[index],raw[next],index===0))next--;points.push([...raw[next]]);index=next;}}
 let previous=start;const route=points.map(p=>{let top=-Infinity;const n=Math.max(1,Math.ceil(flat(previous,p)/.5));for(let j=0;j<=n;j++)top=Math.max(top,reefFloor(previous[0]+(p[0]-previous[0])*j/n,previous[2]+(p[2]-previous[2])*j/n));const point=[p[0],Math.max(home[1],top+1.7),p[2]];previous=p;return point;});if(route.length&&Math.abs(route.at(-1)[1]-home[1])>.1)route.push([...home]);else route[route.length-1]=[...home];return route;
}
