import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
// Adapted from Jellyfish by Poly by Google, CC BY 3.0. See assets/jelly/LICENSE.txt.
const TAU=Math.PI*2,PERIOD=2.8,R=28.741913,CZ=12.890625;
const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function jellyStroke(time){
 const phase=((time/PERIOD)%1+1)%1;
 const contraction=phase<.22?smooth(phase/.22):phase<.72?1-smooth((phase-.22)/.5):0;
 const travel=phase<.22?.55*smooth(phase/.22):phase<.72?.55+.30*(phase-.22)/.5:.85+.15*(phase-.72)/.28;
 return {phase,contraction,stage:phase<.22?'contract':phase<.72?'relax':'coast',lift:.16*(travel-phase)};
}
function dome(r,q,under=0){return .04+(.60+.18*q)*Math.sqrt(Math.max(0,1-r*r))-.08*q*r**4-under*.045;}
function radius(r,q){return r*(1-.20*q*smooth((r-.35)/.65));}
// Both positions and normals morph on the GPU; instances share immutable geometry.
function morphGeometry(rest,contracted,indices){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(rest,3));if(indices)g.setIndex(indices);g.computeVertexNormals();
 const target=new T.BufferGeometry();target.setAttribute('position',new T.Float32BufferAttribute(contracted,3));if(indices)target.setIndex(indices);target.computeVertexNormals();
 g.morphAttributes.position=[target.attributes.position];g.morphAttributes.normal=[target.attributes.normal];g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export async function loadJelly(){
 const asset=await new GLTFLoader().loadAsync('assets/jelly/poly-jelly-source.glb');let source;
 asset.scene.traverse(n=>{if(n.isMesh)source=n.geometry;});
 if(!source||source.attributes.position.count!==880)throw Error('Unexpected jellyfish source geometry');
 const p=source.attributes.position,ix=source.index.array;
 // Subdivide the original bell faces, retaining their radial profile and inner shell.
 const descriptors=[],indices=[],lookup=new Map();
 function vertex(v){const len=Math.hypot(v[0],v[1])||1,vv=[v[0]/len,v[1]/len,v[2],v[3]],key=vv.map(n=>n.toFixed(6)).join(',');if(!lookup.has(key)){lookup.set(key,descriptors.length);descriptors.push(vv);}return lookup.get(key);}
 const midpoint=(a,b)=>a.map((v,i)=>(v+b[i])*.5);
 function split(a,b,c,depth){if(!depth){indices.push(vertex(a),vertex(b),vertex(c));return;}const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);split(a,ab,ca,depth-1);split(ab,b,bc,depth-1);split(ca,bc,c,depth-1);split(ab,bc,ca,depth-1);}
 const descriptor=id=>{const x=p.getX(id),z=p.getZ(id)-CZ;return [x/R,z/R,Math.min(1,Math.hypot(x,z)/R),p.getY(id)<49.08?1:0];};
 for(let i=0;i<ix.length;i+=3){const ids=[ix[i],ix[i+1],ix[i+2]];if(ids.every(id=>id>=528&&p.getY(id)>=38.6))split(...ids.map(descriptor),2);}
 const positions=q=>descriptors.flatMap(([x,z,r,u])=>[x*radius(r,q),dome(r,q,u),z*radius(r,q)]);
 const bell=morphGeometry(positions(0),positions(1),indices);
 // Four ruffled ribbons replace the source's single thick central appendage.
 // Their length follows the source appendage; ribbon surfaces are rebuilt for moon jellies.
 const sourceArms=Array.from({length:p.count-528},(_,i)=>i+528).filter(id=>p.getY(id)<38.6),sourceLength=(38.6-Math.min(...sourceArms.map(id=>p.getY(id))))/(2*R);
 const armRest=[],armBent=[],armIndices=[],armLength=Math.min(1.30,sourceLength*.68),rows=36,cols=6;
 for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2,offset=armRest.length/3;
  for(let j=0;j<=rows;j++){const t=j/rows,w=(.12+.09*Math.sin(Math.PI*t))*(1-.70*t*t)*(1+.22*Math.sin(t*TAU*5+k*.6));
   for(let i=0;i<=cols;i++){const u=i/cols*2-1,radial=.12+.14*t+.025*Math.sin(t*TAU*2),across=u*w,ruffle=.045*Math.sin(t*TAU*4+u*1.7)*Math.abs(u)**1.5;
    const fold=.055*Math.sin(t*TAU*3+u*Math.PI*1.4)*Math.sin(Math.PI*t)*Math.cos(u*Math.PI/2);
    const x=Math.cos(a)*(radial+fold)-Math.sin(a)*across,z=Math.sin(a)*(radial+fold)+Math.cos(a)*across,y=.17-armLength*t+ruffle;
    armRest.push(x,y,z);armBent.push(x+.12*t*t*Math.sin(a+.8),y+.10*t*t,z+.14*t*t*Math.cos(a+.8));
   }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const v=offset+j*(cols+1)+i;armIndices.push(v,v+cols+1,v+1,v+1,v+cols+1,v+cols+2);}
 }
 const arms=morphGeometry(armRest,armBent,armIndices);
 // Reposition and shorten the original eight thin tentacles, repeated into a fine fringe.
 const anchors=Array.from({length:8},(_,i)=>{const ids=Array.from({length:66},(_,j)=>i*66+j),top=Math.max(...ids.map(id=>p.getY(id))),at=ids.filter(id=>p.getY(id)>top-.25);return at.reduce((v,id)=>v.add(new T.Vector3().fromBufferAttribute(p,id)),new T.Vector3()).multiplyScalar(1/at.length);});
 const tentacleRest=[],tentacleBent=[];
 for(let copy=0;copy<6;copy++)for(let i=0;i<ix.length;i+=3){const ids=[ix[i],ix[i+1],ix[i+2]];if(!ids.every(id=>id<528))continue;
  for(const id of ids){const anchor=anchors[Math.floor(id/66)],a=Math.atan2(anchor.z-CZ,anchor.x)+copy*TAU/48,t=T.MathUtils.clamp((anchor.y-p.getY(id))/111.2,0,1),bend=(p.getZ(id)-anchor.z)*.002;
   const x=Math.cos(a)*(.99+bend)+(p.getX(id)-anchor.x)*.003,z=Math.sin(a)*(.99+bend),y=.04-t*.27;
   tentacleRest.push(x,y,z);tentacleBent.push(x*.80+.04*t*t,y-.08,z*.80-.04*t*t);
  }
 }
 const tentacles=morphGeometry(tentacleRest,tentacleBent);
 // Each U opens toward the body centre. These are thin internal markings, not raised rings.
 const ringRest=[],ringBent=[],ringIndices=[],openings=[];
 for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2,points=[];
  for(let j=0;j<=28;j++){const t=Math.PI+.55+j/28*(TAU-1.1),u=.145*Math.cos(t),v=.165*Math.sin(t),x=Math.cos(a)*(.32+u)-Math.sin(a)*v,z=Math.sin(a)*(.32+u)+Math.cos(a)*v;points.push(new T.Vector3(x,dome(Math.hypot(x,z),0)-.065,z));}
  openings.push({center:[Math.cos(a)*.32,Math.sin(a)*.32],gap:[-Math.cos(a),-Math.sin(a)]});
  const tube=new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.014,5,false),offset=ringRest.length/3,b=tube.attributes.position;
  for(let i=0;i<b.count;i++){const x=b.getX(i),z=b.getZ(i),r=Math.hypot(x,z),factor=r?radius(r,1)/r:1;ringRest.push(x,b.getY(i),z);ringBent.push(x*factor,b.getY(i)+dome(r,1)-dome(r,0),z*factor);}
  ringIndices.push(...Array.from(tube.index.array,i=>i+offset));tube.dispose();
 }
 const rings=morphGeometry(ringRest,ringBent,ringIndices);
 asset.scene.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material]){m.map?.dispose();m.dispose();}}});
 return {geometries:{bell,arms,tentacles,rings},source:'Poly by Google / Jellyfish',sourceVertices:880,openings,armLength};
}
export function createJelly(asset,{width=1.5}={}){
 const root=new T.Group(),body=new T.Group(),meshes={};root.add(body);root.scale.setScalar(width/2);
 const materials={bell:new T.MeshPhongMaterial({color:'#c7e8ed',emissive:'#09202a',transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false,shininess:75}),arms:new T.MeshPhongMaterial({color:'#dedfe9',transparent:true,opacity:.58,side:T.DoubleSide,depthWrite:false,shininess:30}),tentacles:new T.MeshBasicMaterial({color:'#e1eaf0',transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}),rings:new T.MeshPhongMaterial({color:'#e7cce0',transparent:true,opacity:.78,depthWrite:false,shininess:25})};
 for(const [name,g] of Object.entries(asset.geometries)){const mesh=new T.Mesh(g,materials[name]);mesh.name='moon-jelly-'+name;mesh.renderOrder=name==='bell'?3:2;body.add(mesh);meshes[name]=mesh;}
 let time=0,stroke,appendage;
 function update(dt){time+=dt;stroke=jellyStroke(time);appendage=jellyStroke(time-.18);for(const name of ['bell','tentacles','rings'])meshes[name].morphTargetInfluences[0]=stroke.contraction;meshes.arms.morphTargetInfluences[0]=appendage.contraction;meshes.arms.rotation.y=Math.sin(time*TAU/PERIOD-.65)*.07;body.position.y=stroke.lift;body.rotation.z=Math.sin(time*.65)*.025;}
 update(0);root.userData.update=update;root.userData.dispose=()=>Object.values(materials).forEach(m=>m.dispose());
 root.userData.inspect=()=>({species:'moon-jelly',source:asset.source,sourceVertices:880,geometryChanged:true,shape:'domed-source-bell-morph-ruffled-oral-arms',gonads:4,gapsInward:true,oralArms:4,armLength:asset.armLength,marginalTentacleCopies:48,width,time,stage:stroke.stage,phase:stroke.phase,contraction:stroke.contraction,appendageContraction:appendage.contraction,pulse:[stroke.contraction,appendage.contraction,body.position.y],vertices:Object.values(asset.geometries).reduce((s,g)=>s+g.attributes.position.count,0)});
 return root;
}
