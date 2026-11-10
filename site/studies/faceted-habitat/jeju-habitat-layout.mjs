import {GARDEN_PATH,gardenSand} from './garden-discovery.mjs?v=2026-11-03-garden-2';
export const JEJU_ENVIRONMENT_VERSION='2026-11-10-life-2';
export const OPEN_ROUTE=[[0,12],[0,3],...GARDEN_PATH];
export const ROCK_BEDS=[
 {x:-8.4,z:5,size:[5.5,.65,4.3],part:3,angle:.3},
 {x:-9.5,z:.5,size:[5.8,.85,5.2],part:2,angle:-.2},
 {x:-11.6,z:-4.5,size:[5.6,1.0,5.8],part:6,angle:.2},
 {x:-11.3,z:-9.2,size:[5.1,.72,5.4],part:3,angle:-.3},
 {x:-10.8,z:-14.5,size:[4.3,.65,4.5],part:2,angle:.3},
 {x:-11.6,z:-19.5,size:[6.0,.9,5.3],part:6,angle:.6},
 {x:-5.9,z:-22.3,size:[4.8,.7,4.7],part:3,angle:-.4},
 {x:9.2,z:4.6,size:[5.0,.6,4.2],part:2,angle:.2},
 {x:10.7,z:.3,size:[5.7,.85,5.3],part:6,angle:-.4},
 {x:11.0,z:-5.8,size:[5.8,.9,5.6],part:3,angle:.25},
 {x:10.0,z:-11.4,size:[5.7,1.0,5.0],part:2,angle:-.2},
 {x:8.8,z:-17.4,size:[5.3,1.25,5.5],part:6,angle:.5},
 {x:7.7,z:-22,size:[4.9,1.2,4.6],part:3,angle:.2},
 {x:1.8,z:-25,size:[6.5,1.25,4.6],part:2,angle:-.1},
 {x:-16,z:0,size:[7,1.4,7],part:6,angle:.4},
 {x:-17,z:-12,size:[6.8,1.6,8.1],part:3,angle:-.2},
 {x:17,z:-7,size:[6,1.8,7],part:2,angle:.2},
 {x:15,z:-23,size:[6,2.3,7],part:6,angle:.4}
];
export const KELP_BEDS=[0,1,2,3,4,5,6,14,15];
export const SARGASSUM_BEDS=[7,8,9,16];
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function seeded(seed=63011){let a=seed>>>0;return()=>{a=(1664525*a+1013904223)>>>0;return a/4294967296;};}
export function routeDistance(x,z){let best=Infinity;for(let i=1;i<OPEN_ROUTE.length;i++){const a=OPEN_ROUTE[i-1],b=OPEN_ROUTE[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}return best;}
export function plantCandidates(kind){const random=seeded(kind==='kelp'?73:191),beds=kind==='kelp'?KELP_BEDS:SARGASSUM_BEDS,result=[];for(const bed of beds){const b=ROCK_BEDS[bed],count=kind==='kelp'?10:12;for(let i=0;i<count;i++){const theta=i*2.39996+random()*.5,r=Math.sqrt((i+.5)/count)*.39,x=b.x+Math.cos(theta)*b.size[0]*r,z=b.z+Math.sin(theta)*b.size[2]*r;if(routeDistance(x,z)<1.85)continue;result.push({kind,bed,x,z,angle:random()*Math.PI*2,scale:kind==='kelp'?.72+random()*.55:.6+random()*.5,variant:i%2,phase:random()*6.28});}}return result;}
export function jejuGroundBlend(x,z){const lane=Math.max(gardenSand(x,z),Math.exp(-((routeDistance(x,z)/1.6)**2)));const shelves=clamp((Math.abs(x)-4)/4);return{sand:clamp(lane*.9+(1-shelves)*.4),rock:shelves*(1-lane)};}
export function jejuZone(p){const[x,,z]=p;if(Math.abs(x)<3.2&&z<-11.3&&z>-16.5)return '연산호 정원';if(x<-6)return '감태숲 가장자리';if(x>5&&z<=-10)return '연산호와 부채산호 암반';if(x>6&&z>-10)return '모자반 바위밭';if(z>5)return '빛이 드는 모래 물길';if(z<-19)return '먼 바다를 향한 암반턱';return '자리돔 바위턱';}
export function jejuHint(p){const zone=jejuZone(p);if(zone==='감태숲 가장자리')return '줄기 위로 갈라진 감태 잎이 흔들려요 · 바위 표면의 보라성게도 찾아보세요';if(zone==='연산호와 부채산호 암반')return '부채처럼 펼친 산호 사이로 범돔과 파랑돔이 오가요';if(zone==='모자반 바위밭')return '작은 잎과 둥근 기낭이 달린 모자반류를 살펴보세요';if(zone==='빛이 드는 모래 물길')return '밝은 모래 길 끝에는 자리돔, 왼편에는 해조숲이 있어요';if(zone==='먼 바다를 향한 암반턱')return '능선 너머로 바다가 이어져요 · 귀환하면 탐사 기록을 볼 수 있어요';return null;}
