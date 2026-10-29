import * as T from '../runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
const smoothUnion=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
// Two authored continuous tissue silhouettes, sampled once. No trunk and terminal flower meshes.
function lobes(kind){return kind===0?[
 [0,.12,0,.20,.20,.18],[0,.32,0,.33,.25,.24],[-.26,.44,.03,.20,.25,.17],[.24,.47,.06,.21,.26,.18],[-.09,.56,-.12,.22,.24,.18],[.04,.61,.17,.19,.22,.17],[-.35,.60,-.04,.14,.18,.13],[.29,.66,.02,.14,.18,.13],[-.12,.72,-.1,.15,.16,.13],[.07,.75,.14,.13,.15,.13]
 ]:[
 [0,.14,0,.18,.23,.16],[.02,.34,0,.24,.25,.19],[-.16,.51,.01,.19,.26,.17],[.2,.55,-.05,.17,.25,.16],[.03,.62,.12,.17,.28,.17],[-.24,.73,.03,.13,.23,.12],[.24,.78,-.07,.12,.23,.12],[.04,.88,.13,.13,.23,.12],[-.34,.83,.01,.10,.15,.10],[.32,.91,-.05,.10,.15,.10],[.03,1.04,.12,.10,.12,.10]
 ];}
function fieldFor(kind){const shapes=lobes(kind);return(x,y,z)=>{let d=9;for(const[a,b,c,rx,ry,rz]of shapes){const q=(Math.hypot((x-a)/rx,(y-b)/ry,(z-c)/rz)-1)*Math.min(rx,ry,rz);d=smoothUnion(d,q,.07);}return d+.003*Math.sin(x*29+y*19)*Math.sin(z*31-y*17);};}
export function coralBody(kind=0){
 const field=fieldFor(kind),positions=[],normals=[],min=[-.62,-.10,-.46],max=[.62,1.25,.46],n=18,points=[],values=[],side=n+1,index=(x,y,z)=>(z*side+y)*side+x;
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const p=[min[0]+x/n*(max[0]-min[0]),min[1]+y/n*(max[1]-min[1]),min[2]+z/n*(max[2]-min[2])];points.push(p);values.push(field(...p));}
 const normal=p=>new T.Vector3(field(p[0]+.001,p[1],p[2])-field(p[0]-.001,p[1],p[2]),field(p[0],p[1]+.001,p[2])-field(p[0],p[1]-.001,p[2]),field(p[0],p[1],p[2]+.001)-field(p[0],p[1],p[2]-.001)).normalize();
 const corner=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 function edge(a,b){const u=values[a]/(values[a]-values[b]);return points[a].map((v,i)=>v+(points[b][i]-v)*u);}
 function tri(a,b,c){const na=normal(a),nb=normal(b),nc=normal(c),cross=new T.Vector3().subVectors(new T.Vector3(...b),new T.Vector3(...a)).cross(new T.Vector3().subVectors(new T.Vector3(...c),new T.Vector3(...a)));if(cross.dot(na)<0){[b,c]=[c,b];[nb.x,nc.x]=[nc.x,nb.x];[nb.y,nc.y]=[nc.y,nb.y];[nb.z,nc.z]=[nc.z,nb.z];}positions.push(...a,...b,...c);normals.push(...na.toArray(),...nb.toArray(),...nc.toArray());}
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const ids=corner.map(([a,b,c])=>index(x+a,y+b,z+c));for(const t of tetra){const inside=t.map(i=>ids[i]).filter(i=>values[i]<0),outside=t.map(i=>ids[i]).filter(i=>values[i]>=0);if(!inside.length||!outside.length)continue;if(inside.length===1)tri(...outside.map(b=>edge(inside[0],b)));else if(inside.length===3)tri(...inside.map(a=>edge(a,outside[0])));else{const[a,b]=inside,[c,d]=outside,A=edge(a,c),B=edge(a,d),C=edge(b,c),D=edge(b,d);tri(A,B,C);tri(B,D,C);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.04;return g;
}
// Tiny forks on exposed tissue give a fine pile; all vertices share the body's sway space.
export function coralPolyps(body,seed=1,count=260){
 const pos=body.attributes.position,nor=body.attributes.normal,vertices=[],n=new T.Vector3(),up=new T.Vector3(0,1,0),axis=new T.Vector3(),side=new T.Vector3();let made=0;
 for(let k=0;k<count*7&&made<count;k++){const i=(Math.floor(k*7919+seed*101)%Math.floor(pos.count/3))*3,p=new T.Vector3().fromBufferAttribute(pos,i);n.fromBufferAttribute(nor,i);if(p.y<.28||n.y<-.25)continue;axis.copy(Math.abs(n.y)>.92?new T.Vector3(1,0,0):up).cross(n).normalize();side.crossVectors(n,axis);const scale=.013+.007*(.5+.5*Math.sin(k*6.37+seed));
  const root=p.clone().addScaledVector(n,-.002),tip=p.clone().addScaledVector(n,scale);for(let j=0;j<5;j++){const a=j*Math.PI*2/5,dir=axis.clone().multiplyScalar(Math.cos(a)).addScaledVector(side,Math.sin(a)),end=tip.clone().addScaledVector(dir,scale*.58).addScaledVector(n,scale*.28),left=tip.clone().addScaledVector(side,.0028),right=tip.clone().addScaledVector(side,-.0028);vertices.push(...root.toArray(),...left.toArray(),...end.toArray(),...root.toArray(),...end.toArray(),...right.toArray());}made++;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();g.computeBoundingSphere();if(g.boundingSphere)g.boundingSphere.radius+=.04;return{geometry:g,count:made};
}
