// Bounded continuation study. A stable seed defines places, not player progress.
export const WORLD_SEED=110126,EXTENDED_BOUNDS=[[-21,21],[-.6,7],[-72,18]];
export function randomAt(x,z,salt=0){let h=(Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^WORLD_SEED^salt)>>>0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},bell=(x,w)=>Math.exp(-x*x/(w*w));
export function extensionHeight(x,z,first){const blend=smooth((-z-24)/10);if(!blend)return first;
 const open=bell(z+59,9),axis=-4+7*Math.sin((-z-26)*.082),floor=-1.05-.14*Math.sin(z*.13),channel=bell(x-axis,4.8+open*4);
 const shoulders=(2.9*bell(x-axis-8-open*3,4)+3.5*bell(x-axis+8+open*2,4.2))*(1-open*.2),gx=Math.floor(x/16),gz=Math.floor(z/16),u=smooth(x/16-gx),v=smooth(z/16-gz),noise=(randomAt(gx,gz)*(1-u)+randomAt(gx+1,gz)*u)*(1-v)+(randomAt(gx,gz+1)*(1-u)+randomAt(gx+1,gz+1)*u)*v,breaks=.14*Math.sin(x*.81+z*.33)*Math.sin(z*.63)+(noise-.5)*.45;
 return first*(1-blend)+(floor+shoulders*(1-channel*.3)+breaks)*blend;
}
export const PLACES=Object.freeze([
 {id:'first',name:'자리돔 바위턱',center:[1.55,-1.3],index:0},
 {id:'bend',name:'굽은 물길의 산호턱',center:[-2,-35],index:1},
 {id:'hollow',name:'능선 뒤 열린 바위뜰',center:[3,-59],index:2}
]);
export const REGION_FISH=Object.freeze(PLACES.flatMap(p=>[0,1,2].map(local=>({id:p.index*3+local,key:`${WORLD_SEED}:${p.id}:${local}`,place:p.name,behavior:'서로 간격을 두고 바위턱 주변을 오가는 모습'}))));
export function extensionPlace(p){return p[2]<-47?PLACES[2]:p[2]<-25?PLACES[1]:PLACES[0];}
export function extensionName(p){if(p[2]<-67)return '먼 능선의 끝';if(p[2]<-47)return PLACES[2].name;if(p[2]<-25)return PLACES[1].name;return null;}
export function extensionHint(p){return p[2]<-67?'이번 탐사는 여기까지예요 · 지나온 물길로 돌아가거나 귀환해 보세요':p[2]<-47?'넓어진 바위뜰에서 작은 무리를 찾아보세요 · 귀환 밧줄까지 길이 이어져요':p[2]<-25?'굽은 물길의 산호턱을 살펴보세요 · 더 안쪽에는 열린 바위뜰이 있어요':'능선 옆 물길을 따라 더 안쪽으로 나아가 보세요';}
export function patchRecipe(place){const [x,z]=place.center,turn=randomAt(place.index,0,7)*.7;
 const spread=place.index===2?1.1:1,rocks=[[-1.9,-1.8,6,.95],[-.95,-1.65,3,.88],[.05,-1.5,2,.82],[1,-1.15,6,.78],[1.8,-.8,3,.66]].map(([dx,dz,part,h],i)=>({part,x:x+dx*spread,z:z+dz,h,angle:turn+i*.37}));
 const corals=[{x:rocks[0].x,z:rocks[0].z,h:.55},{x:rocks[1].x,z:rocks[1].z,h:.28},{x:rocks[2].x,z:rocks[2].z,h:place.index===2?.22:.38},{x:rocks[3].x,z:rocks[3].z,h:.45}];return{id:place.id,rocks,corals};
}
export const EXTENSION_PATCHES=PLACES.slice(1).map(patchRecipe);
// Align every tile to the original triangle lattice, including negative coordinates.
export function tileAt(x,z){return {x:Math.floor((x+12)/24),z:Math.floor((z+18.25)/24)};}
export function tileDescriptor(x,z){return{id:`${WORLD_SEED}:${x}:${z}`,x:-12+x*24,z:-18.25+z*24,size:24,cx:x,cz:z};}
export function desiredTiles(center){const a=[];for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)a.push(tileDescriptor(center.x+x,center.z+z));return a;}
export class TileWindow{
 constructor(position=[0,0,12]){this.center=tileAt(position[0],position[2]);this.loaded=new Map();this.generated=0;this.released=0;this.revision=0;}
 plan(p){const c=this.center,midX=c.x*24,midZ=-6.25+c.z*24;if(Math.abs(p[0]-midX)>15||Math.abs(p[2]-midZ)>15)this.center=tileAt(p[0],p[2]);return desiredTiles(this.center);}
 step(p,create,release,budget=1){const wanted=this.plan(p),ids=new Set(wanted.map(t=>t.id));let made=0;for(const t of wanted)if(!this.loaded.has(t.id)&&made<budget){this.loaded.set(t.id,create(t));this.generated++;made++;this.revision++;}
  // Keep the old edge until the new 3x3 window is complete; never expose a hole.
  if(wanted.every(t=>this.loaded.has(t.id)))for(const [id,value]of this.loaded)if(!ids.has(id)){release(value);this.loaded.delete(id);this.released++;this.revision++;}
  return made;
 }
 inspect(){return{seed:WORLD_SEED,center:{...this.center},tiles:this.loaded.size,generated:this.generated,released:this.released,revision:this.revision,ids:[...this.loaded.keys()]};}
}
