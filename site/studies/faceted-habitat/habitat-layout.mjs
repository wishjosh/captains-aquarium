// Metres. Recipes reference the same small rock and coral geometry library.
export const ROCKS=[
 {part:2,x:1.02,z:-1.35,h:.36,angle:.24},{part:3,x:2.30,z:-1.40,h:.39,angle:-.3},{part:3,x:1.65,z:-1.10,h:.50,angle:1.6},
 {part:2,x:3.30,z:-1.85,h:.70,angle:.1},{part:6,x:4.65,z:-2.65,h:.71,angle:.5},{part:3,x:4.35,z:-4.00,h:.73,angle:.2},
 {part:5,x:3.15,z:-3.12,h:.40,angle:1.1},{part:2,x:5.12,z:-4.85,h:.64,angle:-.2},{part:1,x:3.30,z:-4.52,h:.52,angle:1.3},
 {part:2,x:-3.8,z:-6.3,h:.52,angle:.8},{part:6,x:-5.0,z:-6.8,h:.62,angle:.2},{part:3,x:-4.3,z:-8.3,h:.45,angle:-.7},
 {part:2,x:5.15,z:-8.4,h:.60,angle:.4},{part:3,x:6.2,z:-9.2,h:.51,angle:1.2},
 {part:6,x:-8.5,z:-13,h:1.05,angle:.2},{part:2,x:8.4,z:-15,h:.95,angle:.7},{part:3,x:1.4,z:-17,h:.82,angle:.1}];
export const CORALS=[
 {x:3.04,z:-1.76,h:.88,form:0,angle:.2},{x:3.63,z:-1.95,h:.52,form:2,angle:1.5},{x:4.58,z:-2.58,h:1.05,form:1,angle:2.4},
 {x:4.08,z:-3.73,h:.62,form:0,angle:-.7},{x:4.72,z:-4.07,h:.85,form:2,angle:.8},{x:5.15,z:-4.86,h:.43,form:0,angle:1.9},
 {x:3.27,z:-3.10,h:.36,form:1,angle:-.2},{x:3.38,z:-4.50,h:.42,form:2,angle:2.1},
 {x:2.78,z:-1.97,h:.27,form:1,angle:1.2},{x:4.70,z:-2.8,h:.34,form:0,angle:2.9},
 {x:4.43,z:-3.90,h:.29,form:2,angle:.3}];
export const PALETTE=['#c9848b','#c69a87','#b29ab0'];
export function recipe(style='crevice'){
 const rocks=ROCKS.map(r=>({...r,...(style==='ledge'&&r.x>2.7&&r.z>-5?{angle:r.angle+.35,h:r.h*.88}:{})}));
 const corals=CORALS.map(c=>({...c,...(style==='ledge'?{angle:c.angle+.65,h:c.h*.9}:{})}));
 return {style,rocks,corals};
}

export function collisionVolumes(rocks,floor){return rocks.map(r=>[r.x,r.z,r.h*(r.part===2||r.part===3?1.05:.72),floor(r.x,r.z)+r.h*.86]);}
