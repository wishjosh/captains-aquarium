// One authored discovery passage; it adds no progress gates or saved state.
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const DISCOVERY_PATH=Object.freeze([[1.55,-6],[-3,-10],[-4.2,-15],[-5.8,-20],[-6.5,-24],[-5.2,-27],[-2.5,-31],[-2,-33]]);
export function passageX(z){for(let i=1;i<DISCOVERY_PATH.length;i++){const a=DISCOVERY_PATH[i-1],b=DISCOVERY_PATH[i];if(z>=b[1])return a[0]+(b[0]-a[0])*smooth((a[1]-z)/(a[1]-b[1]));}return DISCOVERY_PATH.at(-1)[0];}
export function passageBand(x,z){const ends=smooth((-z-15)/4)*smooth((z+31.25)/4),offset=(x-passageX(z))/3.2;return ends*Math.exp(-offset*offset);}
export function passageHeight(x,z,base){const band=passageBand(x,z),ends=smooth((-z-15)/4)*smooth((z+31.25)/4),shoulder=2.8*Math.exp(-(((x+2.3)/3)**2+((z+23.5)/4.8)**2))*ends,raised=base+shoulder;return raised+(Math.min(raised,-.65)-raised)*band;}
export const PASSAGE_PATCHES=Object.freeze([
 {id:'passage-entry',rocks:[{part:6,x:-.9,z:-16.8,h:.82,angle:.5},{part:2,x:-.2,z:-17.6,h:.58,angle:.8}],corals:[{x:-.9,z:-16.8,h:.34},{x:-.2,z:-17.6,h:.22}]},
 {id:'passage-notch',rocks:[{part:3,x:-1.1,z:-24.8,h:1.25,angle:.35},{part:6,x:.1,z:-25.7,h:.90,angle:.6},{part:6,x:-11,z:-23.8,h:1.10,angle:-.3}],corals:[{x:-1.1,z:-24.8,h:.48},{x:.1,z:-25.7,h:.28},{x:-11,z:-23.8,h:.24}]}
]);
const hasGroup=(set,start)=>[start,start+1,start+2].some(id=>set?.has(id));
export function discoveryPassageHint(position,{discoveries,observations,members=[]}={}){
 const [x,,z]=position;if(z>3||z< -41||Math.abs(x-passageX(z))>9)return null;
 const metFirst=hasGroup(discoveries,0)||hasGroup(observations,0)||members.some(f=>f.id<3&&f.enchanted);
 if(z> -11)return metFirst?'바위턱 왼편의 밝은 모래 물길이 안쪽으로 이어져요 · 더 둘러보거나 귀환해 보세요':null;
 if(z> -20)return '굽은 모래 물길을 따라가 보세요 · 암반 가장자리에 작은 산호가 보여요';
 if(z> -29)return '암반 사이로 밝은 틈이 이어져요 · 틈 너머도 둘러보세요';
 if(members.filter(f=>f.id>=3&&f.id<6).length===3&&members.filter(f=>f.id>=3&&f.id<6).every(f=>f.enchanted))return '이 산호턱의 자리돔이 모두 함께해요 · 더 둘러보거나 귀환해 보세요';
 return hasGroup(discoveries,3)?'산호턱에서 만난 무리예요 · 관찰하거나 함께 돌아갈 수 있어요':'틈 너머의 산호턱을 살펴보세요 · 바위 위의 작은 움직임을 찾아보세요';
}
