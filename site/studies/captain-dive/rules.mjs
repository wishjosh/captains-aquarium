export const W=360,H=480,DURATION=30;
export const species=[
{id:'chromis',name:'자리돔',short:'자리돔',color:'#e7c477',note:'통통한 몸과 갈라진 꼬리. 제주 연안을 대표하는 작은 물고기예요.'},
{id:'puffer',name:'가시복',short:'가시복',color:'#e4d99b',note:'둥근 몸에 작은 가시가 있어요. 이 놀이에서는 느긋하게 헤엄쳐요.'},
{id:'wrasse',name:'용치놀래기',short:'용치놀래기',color:'#ea9672',note:'길쭉한 몸과 알록달록한 무늬. 이 놀이에서는 방향을 바꾸며 헤엄쳐요.'}
];
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function sweptHit(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<=r;}
export function inside(p,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))yes=!yes;}return yes;}
function cross(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;}
export function inspectLoop(input){
 const points=input.filter((p,i)=>i===0||dist(p,input[i-1])>1);
 if(points.length<5||dist(points[0],points.at(-1))>42)return{ok:false,reason:'고리의 끝을 시작점에 이어주세요.'};
 const p=points.slice();if(dist(p[0],p.at(-1))<2)p.pop();
 let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a.x*b.y-b.x*a.y;}
 area=Math.abs(area)/2;
 if(area<850)return{ok:false,reason:'물고기가 들어가게 조금 크게 그려요.'};
 const xs=p.map(v=>v.x),ys=p.map(v=>v.y);
 if(area>28000||Math.max(...xs)-Math.min(...xs)>230||Math.max(...ys)-Math.min(...ys)>230)return{ok:false,reason:'고리가 너무 커요. 한두 마리만 감싸봐요.'};
 for(let i=0;i<p.length;i++)for(let j=i+2;j<p.length;j++){if(i===0&&j===p.length-1)continue;if(intersects(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length]))return{ok:false,reason:'선이 겹치지 않게 한 바퀴 그려요.'};}
 return{ok:true,points:p,area};
}
export function cleanRecord(raw){
 const r={tap:{runs:0,best:0,counts:[0,0,0]},swim:{runs:0,best:0,counts:[0,0,0]},loop:{runs:0,best:0,counts:[0,0,0]}};
 for(const mode of Object.keys(r)){const v=raw?.[mode];if(!v)continue;r[mode].runs=clamp(Math.floor(Number(v.runs)||0),0,999999);r[mode].best=clamp(Math.floor(Number(v.best)||0),0,9999);r[mode].counts=r[mode].counts.map((_,i)=>clamp(Math.floor(Number(v.counts?.[i])||0),0,999999));}return r;
}
