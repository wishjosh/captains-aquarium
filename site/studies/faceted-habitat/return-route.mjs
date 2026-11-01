import {reefFloor} from './reef-terrain.mjs';
const flat=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
// Planned once per return. Grid is bounded to this region; no frame-time graph search.
export function returnRoute(start,home,obstacles=[]){
 const rocks=obstacles.map(([x,z,r])=>({x,z,r:r+.85}));
 const clear=p=>reefFloor(p[0],p[2])<4.35&&rocks.every(o=>Math.hypot(p[0]-o.x,p[2]-o.z)>o.r);
 const segment=(a,b,escape=false)=>{
  const n=Math.ceil(flat(a,b)/.4);for(let i=0;i<=n;i++){const t=n?i/n:0,p=[a[0]+(b[0]-a[0])*t,0,a[2]+(b[2]-a[2])*t];
   if(reefFloor(p[0],p[2])>=4.35)return false;
   for(const o of rocks)if(Math.hypot(p[0]-o.x,p[2]-o.z)<=o.r){if(escape&&Math.hypot(a[0]-o.x,a[2]-o.z)<=o.r){const dx=b[0]-a[0],dz=b[2]-a[2];if(dx*(a[0]-o.x)+dz*(a[2]-o.z)>=0)continue;}return false;}
  }return true;
 };
 let points;
 if(segment(start,home,true))points=[[...home]];
 else {
  const nodes=[start,home],step=1.5;for(let z=-30;z<=16.5;z+=step)for(let x=-19.5;x<=19.5;x+=step){const p=[x,0,z];if(clear(p))nodes.push(p);}
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),open=new Set([0]),closed=new Set();costs[0]=0;
  while(open.size){let u=-1,score=Infinity;for(const i of open){const f=costs[i]+flat(nodes[i],home);if(f<score){u=i;score=f;}}if(u===1)break;open.delete(u);closed.add(u);
   for(let v=1;v<nodes.length;v++){if(closed.has(v)||v===u)continue;const d=flat(nodes[u],nodes[v]);if(d>(u===0||v===1?3.5:2.15)||!segment(nodes[u],nodes[v],u===0))continue;const cost=costs[u]+d;if(cost<costs[v]){costs[v]=cost;previous[v]=u;open.add(v);}}
  }
  if(!Number.isFinite(costs[1]))return null;const raw=[];for(let i=1;i>0;i=previous[i])raw.unshift(nodes[i]);raw.unshift(start);points=[];let index=0;
  while(index<raw.length-1){let next=raw.length-1;while(next>index+1&&!segment(raw[index],raw[next],index===0))next--;points.push([...raw[next]]);index=next;}
 }
 let previous=start;
 const route=points.map((p,i)=>{let top=-Infinity;const n=Math.max(1,Math.ceil(flat(previous,p)/.5));for(let j=0;j<=n;j++)top=Math.max(top,reefFloor(previous[0]+(p[0]-previous[0])*j/n,previous[2]+(p[2]-previous[2])*j/n));const y=Math.max(home[1],top+1.7);const point=[p[0],y,p[2]];previous=p;return point;});
 // The final pocket has a separate low, stationary arrival after travel clearance.
 if(route.length&&Math.abs(route.at(-1)[1]-home[1])>.1)route.push([...home]);else route[route.length-1]=[...home];
 return route;
}
