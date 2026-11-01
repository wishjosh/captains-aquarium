// First authored region. Coordinates and height rules do not depend on loaded meshes.
export const REGION=Object.freeze({id:'jeju-ridge-01',spawn:[0,2.5,12],bounds:[[-21,21],[-.6,7],[-31,18]],tileSize:24});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const bell=(x,width)=>Math.exp(-(x*x)/(width*width));
export function regionHeight(x,z,oldHeight){
 // Preserve the accepted close habitat; connect its shoulder into the larger seabed.
 const outside=Math.max(Math.max(0,Math.abs(x)-6)/4,Math.max(0,-11-z)/5,Math.max(0,z-3)/5);
 const blend=smooth(outside);if(!blend)return oldHeight;
 const north=smooth((-z-6)/13),westAxis=-12+Math.sin((z+8)*.12)*2,eastAxis=10+Math.sin(z*.11)*1.7;
 const west=bell(x-westAxis,4.6)*(2.9+.65*Math.sin(z*.23+.5));
 const east=bell(x-eastAxis,5.5)*(2.35+.65*Math.sin(z*.19));
 const cross=bell(z+25,6)*bell(x-3,12)*2.9;
 const channel=bell(x+4+Math.sin(z*.11)*2,3.6)*north*.9;
 const raw=west+east+cross;
 // Broad broken shelves, not pillars or many individual boulders.
 const shelf=Math.floor(raw/.65)*.65+Math.min(.65,(raw%.65)*1.55);
 const fracture=(Math.sin(x*1.13+z*.42)*Math.sin(z*.93-x*.27))*.16*clamp(raw);
 const h=-.25-north*.65-channel+shelf+fracture;
 return oldHeight*(1-blend)+h*blend;
}
export function regionName(p){const[x,,z]=p;if(z>8)return '귀환 밧줄 · 모래 물길';if(x<-6&&z<-4)return '능선 사이 골짜기';if(z<-14)return '이어지는 암반 능선';if(Math.abs(x)>7)return '암반 경사면';if(z>2)return '서식처로 이어지는 물길';return '자리돔 바위턱';}
export function regionHint(p){const name=regionName(p);if(p[2]>3)return '모래 물길을 따라 앞쪽 암반 턱을 살펴보세요';if(name==='능선 사이 골짜기')return '능선 사이로 길이 이어져요 · 귀환을 누르면 밧줄로 돌아가요';if(name==='이어지는 암반 능선')return '능선 너머는 다음 탐사 구역이에요 · 이번에는 골짜기를 돌아 둘러보세요';return '바위턱의 작은 무리를 찾아보거나 왼쪽 골짜기를 둘러보세요';}
export function regionEdge(p){return Math.max(Math.abs(p[0])/21,Math.abs(p[2]+6.5)/24.5);}
export function terrainTiles(){const a=[];for(let z=0;z<3;z++)for(let x=0;x<3;x++)a.push({id:`${REGION.id}:${x}:${z}`,x:-36+x*24,z:-42.25+z*24,size:24});return a;}
