export function seaweedPlacements(floor){return Array.from({length:12},(_,i)=>{const x=3.50+(i%4)*.18,z=-8.1+Math.floor(i/4)*.2;return{position:[x,floor(x,z),z],angle:i*2.1,scale:.6+(i%3)*.13};});}
export function seaweedBend(leaf,captain,time){
 const wave=.025*Math.sin(time*.45+leaf.angle),p=leaf.position;if(!captain)return{x:0,z:wave};
 const dx=p[0]-captain[0],dz=p[2]-captain[2],distance=Math.hypot(dx,dz),middle=p[1]+leaf.scale*.55,bodyY=Math.max(captain[1]-.85,Math.min(captain[1]+.5,middle)),vertical=Math.abs(middle-bodyY),strength=Math.max(0,1-distance/.8)*Math.max(0,1-vertical/.5)*.55;
 const n=Math.max(.08,distance),lx=(Math.cos(leaf.angle)*dx-Math.sin(leaf.angle)*dz)/n,lz=(Math.sin(leaf.angle)*dx+Math.cos(leaf.angle)*dz)/n;
 return{x:lz*strength,z:wave-lx*strength};
}
