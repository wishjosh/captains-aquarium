// One walkable surface per X/Z: stairs connect the ground to the service deck.
// There is no ground route underneath the deck, so v6 positions need no extra layer field.
export const MANAGEMENT={
 floor:{x:-10.6,z:1.9,width:24,depth:20.8,height:5.6},padding:.44,
 tank:{radius:2.8,height:3.15,water:2.86},
 slots:['fish','chromis','jelly'].map((kind,i)=>({kind,id:kind,wall:'north',x:-18.6+i*8,z:-3.1})),
 deck:{x:-10.6,z:.8,width:22.4,depth:2.4,height:2.25},
 stairs:{x:[-19.9,-1.3],top:2,bottom:6.8,width:1.8,steps:10},
 intake:{x:-10.6,z:9.6},props:[]
};
export function managementSurface(x,z){
 const {deck:d,stairs:s}=MANAGEMENT;
 if(Math.abs(x-d.x)<=d.width/2&&Math.abs(z-d.z)<=d.depth/2)return {kind:'deck',height:d.height};
 for(const sx of s.x)if(Math.abs(x-sx)<=s.width/2&&z>=s.top&&z<=s.bottom)return {kind:'stairs',height:d.height*(s.bottom-z)/(s.bottom-s.top)};
 return {kind:'ground',height:0};
}
export function managementBlocked(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return true;
 const {floor:f,padding:p,tank:t}=MANAGEMENT;
 if(x<f.x-f.width/2+p||x>f.x+f.width/2-p||z<f.z-f.depth/2+p||z>f.z+f.depth/2-p)return true;
 return MANAGEMENT.slots.some(s=>Math.hypot(x-s.x,z-s.z)<t.radius+p);
}
export function managementCanStep(x,z,nx,nz){
 if(managementBlocked(nx,nz))return false;
 const a=managementSurface(x,z),b=managementSurface(nx,nz),s=MANAGEMENT.stairs;
 if(Math.abs(a.height-b.height)>.3)return false;
 if(a.kind==='ground'&&b.kind==='stairs'&&z<s.bottom-.1)return false;
 if(a.kind==='stairs'&&b.kind==='ground'&&nz<s.bottom-.1)return false;
 return true;
}
export function managementClear(a,b){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08));let x=a.x,z=a.z;
 if(managementBlocked(x,z))return false;
 for(let i=1;i<=n;i++){const nx=a.x+(b.x-a.x)*i/n,nz=a.z+(b.z-a.z)*i/n;if(!managementCanStep(x,z,nx,nz))return false;x=nx;z=nz;}
 return true;
}
export const MANAGEMENT_POINTS=[
 ...MANAGEMENT.stairs.x.flatMap(x=>[[x,7.2],[x,6.8],[x,2],[x,.8]]),
 [-10.6,.8],[-18.6,.8],[-2.6,.8],[-10.6,9.6],[-20.9,9.6],[-.3,9.6],[-21.8,-7],[-10.6,-7],[.3,-7],[-21.8,4],[.3,4],[-14.6,-1],[-14.6,-7],[-6.6,-1],[-6.6,-7],[.85,-1],[-22.05,-1],[-22.05,7.2],[-22.05,-7],[.85,7.2],[.85,-7]
];
