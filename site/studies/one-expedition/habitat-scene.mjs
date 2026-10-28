import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {ANEMONE,REEF_ROCKS} from './habitat.mjs?v=2026-10-29-habitat-2';
// Authored low-poly rock profiles and swept organic tentacles share the existing scene style.
export function createHabitat(floor){
 const group=new T.Group(),solids=[],occluders=[],time={value:0};group.name='Anemone crevice encounter';
 const rockMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 for(const r of REEF_ROCKS){
  const positions=[],colors=[],N=9,rings=[];
  for(let j=0;j<4;j++){const scale=(r.seed===11?[1,.98,.89,.75]:[1,.94,.74,.38])[j],h=[0,.27,.77,1][j];rings.push(Array.from({length:N},(_,i)=>{const a=i/N*Math.PI*2,noise=1+(r.seed>=11?.2:.09)*Math.sin(i*7.1+r.seed+j*.7);return[Math.cos(a)*r.r*scale*noise+.13*r.r*j/3,r.height*(h+(j?Math.sin(i*3.1+r.seed)*.045:0)),Math.sin(a)*r.r*scale*noise];}));}
  const face=(a,b,c,tint)=>{positions.push(...a,...c,...b);const co=new T.Color(tint);for(let k=0;k<3;k++)colors.push(co.r,co.g,co.b);};
  for(let j=0;j<3;j++)for(let i=0;i<N;i++){const n=(i+1)%N,c=new T.Color(j===2?'#557b70':'#3b6466').multiplyScalar(.84+.2*(.5+.5*Math.sin(i*3+r.seed)));face(rings[j][i],rings[j+1][n],rings[j+1][i],c);face(rings[j][i],rings[j][n],rings[j+1][n],c);}
  for(let i=0;i<N;i++)face(rings[3][i],rings[3][(i+1)%N],[.13*r.r,r.height*1.03,0],'#658779');
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new T.Mesh(geo,rockMaterial);mesh.position.set(r.x,floor(r.x,r.z),r.z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);solids.push(mesh);occluders.push(mesh);
 }
 const bed=new T.Group();bed.position.fromArray(ANEMONE.base);group.add(bed);
 const disk=new T.Mesh(new T.IcosahedronGeometry(.48,2),new T.MeshStandardMaterial({color:'#536342',roughness:.9,flatShading:true}));disk.scale.set(1.3,.22,1.0);disk.position.y=.04;bed.add(disk);occluders.push(disk);
 const vertices=[],colors=[],weights=[],indices=[],segments=11,sides=7;
 const bottom=new T.Color('#405731'),middle=new T.Color('#6c8256'),tip=new T.Color('#c58c6d');
 for(let n=0;n<76;n++){
  const angle=n*2.399963,radius=.55*Math.sqrt((n+.5)/76),length=.38+.33*(.5+.5*Math.sin(n*8.7)),bend=.16+.19*radius/.55,phase=n*1.7;
  const origin=new T.Vector3(Math.cos(angle)*radius*.96,.025+(.55-radius)*.15,Math.sin(angle)*radius*.86),side=new T.Vector3(Math.cos(angle),0,Math.sin(angle));
  const curve=new T.CubicBezierCurve3(origin,origin.clone().add(new T.Vector3(-side.x*.07,length*.45,-side.z*.07)),origin.clone().add(new T.Vector3(side.x*bend,length*.9,side.z*bend)),origin.clone().add(new T.Vector3(side.x*(bend+.05),length,side.z*(bend+.05))));
  const start=vertices.length/3;
  for(let j=0;j<=segments;j++){
   const u=j/segments,p=curve.getPoint(u),tangent=curve.getTangent(u),normal=new T.Vector3(0,0,1).cross(tangent).normalize(),binormal=new T.Vector3().crossVectors(tangent,normal).normalize();
   const width=(.026+.007*Math.sin(n*2.7))*(1-.25*u)+.018*Math.exp(-Math.pow((u-.84)/.13,2)),cap=j===segments?.002:width;
   const co=bottom.clone().lerp(middle,Math.min(1,u*1.6)).lerp(tip,Math.pow(u,4)*(.65+.2*Math.sin(n*3))).multiplyScalar(.94+.06*Math.sin(n));
   for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2,v=p.clone().addScaledVector(normal,Math.cos(a)*cap).addScaledVector(binormal,Math.sin(a)*cap);vertices.push(v.x,v.y,v.z);colors.push(co.r,co.g,co.b);weights.push(u*u,phase);if(j<segments){const next=(k+1)%sides,A=start+j*sides+k,B=start+j*sides+next,C=A+sides,D=B+sides;indices.push(A,B,C,B,D,C);}}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('sway',new T.Float32BufferAttribute(weights,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.1;
 const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.8});
 mat.onBeforeCompile=shader=>{shader.uniforms.habitatTime=time;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 sway;uniform float habitatTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sway.x*(.025*sin(habitatTime*.7+sway.y*.13)+.025*sin(habitatTime*.9));transformed.z+=sway.x*.025*cos(habitatTime*.65+sway.y*.09);');};
 const tentacles=new T.Mesh(geometry,mat);tentacles.name='Curved anemone tentacles';bed.add(tentacles);occluders.push(tentacles);
 // A contact disc rests on the stone rather than floating above the sand.
 const contact=new T.Mesh(new T.CircleGeometry(.66,32),new T.MeshBasicMaterial({color:'#243d38',transparent:true,opacity:.24,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.scale.y=.78;contact.position.y=-.004;bed.add(contact);
 group.updateMatrixWorld(true);
 return{group,solids,occluders,update(dt){time.value+=dt;},inspect(){return{habitat:'anemone-crevice',tentacles:76,rocks:REEF_ROCKS.length,base:ANEMONE.base};}};
}
