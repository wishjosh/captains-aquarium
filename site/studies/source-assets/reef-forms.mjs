import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
const TAU=Math.PI*2,rand=n=>{const v=Math.sin(n*127.1+41.3)*43758.5453;return v-Math.floor(v);};
// Stereonephthya-like branching study after the labelled Munseom photographs.
// Short stalk -> unequal primary arms -> lateral branchlets -> fine polyp-bearing twigs.
// The morphology is an interpretation, not a taxonomic reconstruction.
export function coralSkeleton(seed=1){
 const branches=[];
 function add(a,b,c,r0,r1,order,parent=-1){const curve=new T.QuadraticBezierCurve3(a,b,c),item={curve,r0,r1,order,parent,id:branches.length};branches.push(item);return item;}
 const root=add(new T.Vector3(0,-.045,0),new T.Vector3(-.025,.12,.01),new T.Vector3(.025,.34,.025),.095,.061,0);
 const arms=[[-.49,.79,.12], [.44,.88,-.05],[-.17,1.17,-.18],[.19,1.26,.13],[-.36,.91,-.38],[.25,.92,.43],[.02,1.38,-.08]];
 for(let k=0;k<arms.length;k++){
  const v=new T.Vector3(...arms[k]);v.x+=.055*(rand(seed*31+k)-.5);v.z+=.06*(rand(seed*47+k)-.5);v.y*=.93+.13*rand(seed*71+k);
  const origin=root.curve.getPoint(.34+.083*k),middle=origin.clone().lerp(v,.51);middle.y-=.045;const main=add(origin,middle,v,.075-k*.003,.016,1,root.id);
  for(let j=0;j<4;j++){
   const u=.28+j*.185,o=main.curve.getPoint(u),tan=main.curve.getTangent(u),angle=k*2.38+j*2.67+seed*.31;
   const outward=new T.Vector3(Math.cos(angle)*.75,.42+rand(k*21+j+seed)*.35,Math.sin(angle)*.75).normalize();
   const length=(.31-.039*j)*(.83+.25*rand(seed*7+k*13+j)),end=o.clone().addScaledVector(outward,length).addScaledVector(tan,.07),m=o.clone().lerp(end,.56).addScaledVector(tan,.02);
   const child=add(o,m,end,.034-j*.003,.009,2,main.id);
   for(let t=0;t<3;t++){
    const q=.34+t*.23,start=child.curve.getPoint(q),a=angle+(t%2?1.2:-1.3),dir=new T.Vector3(Math.cos(a)*.72,.54,Math.sin(a)*.72).normalize(),len=(.13-t*.019)*(.85+.3*rand(k*19+j*3+t+seed));
    add(start,start.clone().addScaledVector(dir,len*.55).add(new T.Vector3(0,.015,0)),start.clone().addScaledVector(dir,len),.014-t*.001,.004,3,child.id);
   }
  }
 }
 return branches;
}
function basis(t){const u=new T.Vector3(Math.abs(t.y)>.9?1:0,Math.abs(t.y)>.9?0:1,0).cross(t).normalize();return[u,new T.Vector3().crossVectors(t,u).normalize()];}
export function coralBody(seed=1){
 const skeleton=coralSkeleton(seed),positions=[],indices=[],sides=9,steps=6;
 for(const b of skeleton){const start=positions.length/3;for(let j=0;j<=steps;j++){const u=j/steps,p=b.curve.getPoint(u),[n,v]=basis(b.curve.getTangent(u)),r=T.MathUtils.lerp(b.r0,b.r1,u)*(1+.035*Math.sin(u*8+b.id));for(let k=0;k<sides;k++){const a=k/sides*TAU,q=p.clone().addScaledVector(n,Math.cos(a)*r).addScaledVector(v,Math.sin(a)*r);positions.push(q.x,q.y,q.z);if(j<steps){const A=start+j*sides+k,B=start+j*sides+(k+1)%sides,C=A+sides,D=B+sides;indices.push(A,B,C,B,D,C);}}}for(const end of [0,steps]){const center=positions.length/3,q=b.curve.getPoint(end/steps);positions.push(q.x,q.y,q.z);for(let k=0;k<sides;k++){const a=start+end*sides+k,c=start+end*sides+(k+1)%sides;indices.push(...(end?[center,c,a]:[center,a,c]));}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.04;g.userData.skeleton=skeleton;return g;
}
export function coralPolyps(body,seed=1){
 const positions=[],skeleton=body.userData.skeleton;let count=0;
 for(const b of skeleton){const per=b.order===0?20:b.order===1?96:b.order===2?34:15;
  for(let k=0;k<per;k++){const u=.12+.84*(k+.5)/per,p=b.curve.getPoint(u),tan=b.curve.getTangent(u),[a,c]=basis(tan),angle=k*2.39996+b.id*1.71+seed,normal=a.multiplyScalar(Math.cos(angle)).addScaledVector(c,Math.sin(angle)),radius=T.MathUtils.lerp(b.r0,b.r1,u),base=p.addScaledVector(normal,radius*.92),stem=.025+.012*rand(k*13+b.id+seed),tip=base.clone().addScaledVector(normal,stem),[side,up]=basis(normal);
   // Small fleshy polyp cups carry the tentacles, including along the thick branches.
   const cup=.010+.005*rand(k+b.id*8+seed),rim=base.clone().addScaledVector(normal,stem*.64);
   for(let n=0;n<5;n++){const a=n*TAU/5,b=(n+1)*TAU/5,A=base.clone().addScaledVector(side,Math.cos(a)*cup*.65).addScaledVector(up,Math.sin(a)*cup*.65),B=base.clone().addScaledVector(side,Math.cos(b)*cup*.65).addScaledVector(up,Math.sin(b)*cup*.65),C=rim.clone().addScaledVector(side,Math.cos(a)*cup).addScaledVector(up,Math.sin(a)*cup),D=rim.clone().addScaledVector(side,Math.cos(b)*cup).addScaledVector(up,Math.sin(b)*cup);positions.push(...A.toArray(),...B.toArray(),...C.toArray(),...B.toArray(),...D.toArray(),...C.toArray());}
   // Eight fine tentacles change the silhouette; no spherical terminal buds.
   for(let n=0;n<8;n++){const theta=n*TAU/8,dir=side.clone().multiplyScalar(Math.cos(theta)).addScaledVector(up,Math.sin(theta)),outer=tip.clone().addScaledVector(dir,stem*.86).addScaledVector(normal,stem*.1),l=tip.clone().addScaledVector(dir,.0025).addScaledVector(up,.002),r=tip.clone().addScaledVector(dir,-.0025).addScaledVector(up,-.002);positions.push(...l.toArray(),...r.toArray(),...outer.toArray());}count++;
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.04;return{geometry:g,count};
}
