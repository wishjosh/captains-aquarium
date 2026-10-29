import * as T from '../runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {coralBody,coralPolyps} from './reef-forms.mjs?v=2026-10-29-reef-2';
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const noiseGLSL=`
float reefHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float reefNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(reefHash(i),reefHash(i+vec3(1,0,0)),f.x),mix(reefHash(i+vec3(0,1,0)),reefHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(reefHash(i+vec3(0,0,1)),reefHash(i+vec3(1,0,1)),f.x),mix(reefHash(i+vec3(0,1,1)),reefHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function rockMaterial(){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
 m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 reefP;').replace('#include <begin_vertex>','#include <begin_vertex>\nreefP=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 reefP;\n'+noiseGLSL).replace('#include <color_fragment>',`#include <color_fragment>
 float large=reefNoise(reefP*2.3),grain=reefNoise(reefP*38.0);
 float seam=1.0-smoothstep(.015,.055,abs(reefNoise(reefP*vec3(1.6,1.4,1.7))-.48));
 diffuseColor.rgb*=.81+.23*large+.12*grain-seam*.11;
 float crust=smoothstep(.64,.82,reefNoise(reefP*5.5));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,.86,1.04),crust*.32);`);};
 m.customProgramCacheKey=()=> 'jeju-rock-soft-edge-v3';return m;
}
export function rockGeometry(radius,height,seed=1){
 const sides=40,rows=18,positions=[],colors=[],indices=[];
 for(let j=0;j<=rows;j++){const t=j/rows,lat=(t-.5)*Math.PI,y=(Math.sin(lat)+1)*.5,profile=j===0||j===rows?0:Math.pow(Math.max(0,Math.cos(lat)),.62);
  for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,shape=.88+.07*Math.sin(a*3+seed)+.025*Math.sin(a*7+seed*.7),fault=1+.045*Math.sin(a*4+y*5+seed)*Math.sin(Math.PI*y),r=radius*profile*shape*fault;
   let x=Math.cos(a)*r,z=Math.sin(a)*r*(.87+.08*Math.sin(seed));
   const style=Math.floor(seed)%3,shoulder=Math.sin(Math.PI*y),notch=1-.075*Math.sin(a*3+seed)*Math.pow(shoulder,3);
   x*=notch*(1+.13*Math.sin(a*2+seed)*shoulder);z*=notch;
   if(style===0)x=Math.min(x,radius*(.62-.36*y));
   else if(style===1)z=Math.min(z,radius*(.58-.15*y+.1*x/radius));
   else{x=Math.min(x,radius*(.68-.14*y));z=Math.max(z,-radius*(.64+.12*y));}
   x+=radius*.12*Math.sin(seed)*shoulder;z+=radius*.09*Math.cos(seed)*shoulder;
   const flat=Math.hypot(x,z);if(flat>radius*.99){x*=radius*.99/flat;z*=radius*.99/flat;}
   const h=height*(y-.08*shoulder*Math.sin(a*2+seed));positions.push(j===0||j===rows?0:x,h,j===0||j===rows?0:z);const c=new T.Color('#414f52').lerp(new T.Color('#737e70'),y*.52).multiplyScalar(.96+.035*Math.sin(a*3+seed+y*4));colors.push(c.r,c.g,c.b);
   if(j<rows&&i<sides){const A=j*(sides+1)+i,B=A+1,C=A+sides+1,D=C+1;indices.push(A,C,B,B,C,D);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 // Weld the longitude seam's shading without changing the navigation bounds.
 const normals=g.attributes.normal;for(let j=0;j<=rows;j++){const a=j*(sides+1),b=a+sides,n=new T.Vector3().fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function stone(r,base,material){const mesh=new T.Mesh(rockGeometry(r.r,r.height,r.seed||1),material);mesh.position.set(r.x,base,r.z);mesh.name='Weathered reef outcrop';mesh.castShadow=mesh.receiveShadow=true;return mesh;}
function sway(m,time){m.onBeforeCompile=s=>{s.uniforms.reefTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float reefTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
 float bend=pow(max(position.y-.06,0.0),2.0);transformed.x+=.014*sin(reefTime*.55+position.y*.6)*bend;transformed.z+=.009*cos(reefTime*.43)*bend;`);};m.customProgramCacheKey=()=> 'continuous-coral-tissue-v2';}
export function createReefDecor(solids,floor){
 const group=new T.Group(),occluders=[],time={value:0},material=rockMaterial();group.name='Jeju southern reef study';
 const backdrop=[[-13,-3,3.1,3.7],[-13,-10,4.2,5.3],[-10,-20,4.5,7.3],[-3,-25,4.4,4.2],[5,-26,5.1,6.3],[13,-20,4.7,5.1],[14,-10,3.3,3.8],[13,-1,2.7,2.5]];
 for(let i=0;i<backdrop.length;i++){const[x,z,r,height]=backdrop[i],m=stone({x,z,r,height,seed:40+i},floor(x,z)-height*.22,material);m.castShadow=false;group.add(m);}
 const colonies=[{x:3.35,y:1.25,size:.82},{x:4.05,y:2.0,size:.92},{x:4.65,y:1.0,size:.65},{x:5.25,y:1.7,size:.92},{x:5.85,y:.8,size:.62},{x:3.65,y:2.75,size:.66},{x:2.55,y:.63,size:.40},{x:3.15,y:.59,size:.52},{x:4.6,y:1.5,size:.55},{x:3.8,y:1.55,size:.43},{x:4.8,y:2.38,size:.55},{x:5.35,y:.9,size:.5}];
 const ray=new T.Raycaster(),up=new T.Vector3(0,1,0),bodies=[coralBody(0),coralBody(1)];let placed=0,polypCount=0,triangles=0;
 for(let i=0;i<colonies.length;i++){const c=colonies[i];ray.set(new T.Vector3(c.x,c.y,1),new T.Vector3(0,0,-1));ray.near=0;ray.far=8;const hit=ray.intersectObjects(solids,false).find(h=>h.object.name!=='Sandy passage');if(!hit)continue;
  const kind=i%3===1?1:0,body=bodies[kind],palette=i%4===1?['#af687c','#d798a6']:i%4===2?['#b75c4e','#e49c80']:['#b77844','#e4b476'];const mat=new T.MeshStandardMaterial({color:palette[0],roughness:.9});sway(mat,time);
  const colony=new T.Group();colony.name=kind?'Upright lobed coral':'Low lobed coral';colony.position.copy(hit.point).addScaledVector(hit.face.normal,-.025);colony.scale.set(c.size,c.size*(.85+.2*rand(i+4)),c.size);const axis=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).lerp(up,.68).normalize();colony.quaternion.setFromUnitVectors(up,axis);colony.rotateY(i*1.53);group.add(colony);
  const mesh=new T.Mesh(body,mat);mesh.receiveShadow=true;colony.add(mesh);occluders.push(mesh);triangles+=body.attributes.position.count/3;
  const p=coralPolyps(body,i+1,c.size>.6?240:140),polypMat=new T.MeshStandardMaterial({color:palette[1],roughness:1,side:T.DoubleSide});sway(polypMat,time);const tips=new T.Mesh(p.geometry,polypMat);tips.name='Fine surface polyps';colony.add(tips);triangles+=p.geometry.attributes.position.count/3;polypCount+=p.count;placed++;
 }
 return{group,occluders,update(dt){time.value+=dt;},inspect(){return{theme:'Jeju southern soft-coral reef',forms:2,colonies:placed,polyps:polypCount,triangles,backdropRocks:8};}};
}
export function enhanceSand(material,time){
 material.onBeforeCompile=s=>{s.uniforms.reefTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 sandP;').replace('#include <begin_vertex>','#include <begin_vertex>\nsandP=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 sandP;uniform float reefTime;\n'+noiseGLSL).replace('#include <color_fragment>',`#include <color_fragment>
 float ripple=sin(sandP.x*18.0+sin(sandP.z*1.5)*1.3+reefNoise(sandP*1.4)*1.1);
 float grain=reefNoise(sandP*120.0);
 diffuseColor.rgb*=.93+.025*ripple+.08*grain;
 vec2 p=sandP.xz;float n=reefNoise(vec3(p*.8,reefTime*.09));float a=sin(p.x*2.3+sin(p.y*1.8+reefTime*.22)+n*2.0);float b=cos(p.y*2.1+sin(p.x*1.6-reefTime*.18));
 float lines=pow(1.0-abs(a*b),18.0);float rock=smoothstep(2.0+.3*sin(sandP.z*.61),4.3+.3*sin(sandP.z*.61),abs(sandP.x-.7*sin(sandP.z*.24)));
 diffuseColor.rgb*=1.0+lines*mix(.27,.07,rock);
 float bedGrain=reefNoise(sandP*3.2);diffuseColor.rgb*=mix(1.0,.78+.22*bedGrain,rock);`);};material.customProgramCacheKey=()=> 'jeju-sand-ripple-v1';
}
