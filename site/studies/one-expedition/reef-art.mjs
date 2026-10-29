import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const noiseGLSL=`
float reefHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float reefNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(reefHash(i),reefHash(i+vec3(1,0,0)),f.x),mix(reefHash(i+vec3(0,1,0)),reefHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(reefHash(i+vec3(0,0,1)),reefHash(i+vec3(1,0,1)),f.x),mix(reefHash(i+vec3(0,1,1)),reefHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function rockMaterial(){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
 m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 reefP;').replace('#include <begin_vertex>','#include <begin_vertex>\nreefP=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 reefP;\n'+noiseGLSL).replace('#include <color_fragment>',`#include <color_fragment>
 float grain=reefNoise(reefP*42.0),large=reefNoise(reefP*2.4),fine=reefNoise(reefP*115.0);
 float vein=1.0-smoothstep(.025,.08,abs(sin(reefP.y*15.0+reefNoise(reefP*.7)*4.0)));
 diffuseColor.rgb*=.80+.27*large+.13*grain+.035*fine;
 diffuseColor.rgb*=1.0-vein*.10;
 float crust=smoothstep(.65,.81,reefNoise(reefP*5.0));
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,.85,1.04),crust*.25);`);};
 m.customProgramCacheKey=()=> 'jeju-fractured-stone-v2';return m;
}
// Closed, bounded, layered forms. A fractured volcanic-rock study, not a geological survey mesh.
export function rockGeometry(radius,height,seed=1){
 const n=11,levels=[0,.24,.69,1],profile=height/radius<1.5?[.88,1,.91,.78]:[.91,.97,.83,.61],rings=[],verts=[],col=[];
 for(let j=0;j<levels.length;j++)rings.push(Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2+.05*Math.sin(seed+i*3),facet=.81+.18*rand(i*4+seed),breakage=1+.05*Math.sin(i*5+j*2+seed),fault=j===0?0:(j===3?.07:.12)*Math.sin(i*1.5+seed);return[Math.cos(a)*radius*profile[j]*facet*breakage+radius*.08*levels[j]*Math.sin(seed),height*Math.max(0,Math.min(1.035,levels[j]+fault)),Math.sin(a)*radius*profile[j]*facet*breakage+radius*.10*levels[j]*Math.cos(seed)];}));
 function face(a,b,c,tone){verts.push(...a,...b,...c);const co=new T.Color(tone);for(let k=0;k<3;k++)col.push(co.r,co.g,co.b);}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n,shade=.88+.18*rand(i*13+seed+j*37),co=new T.Color(j===1?'#424f50':'#58615b').lerp(new T.Color('#7d8071'),j/levels.length*.46).multiplyScalar(shade);face(rings[j][i],rings[j+1][i],rings[j+1][k],co);face(rings[j][i],rings[j+1][k],rings[j][k],co);}
 for(let i=0;i<n;i++){face(rings.at(-1)[i],[radius*.10,height,0],rings.at(-1)[(i+1)%n],'#818575');face(rings[0][(i+1)%n],[0,0,0],rings[0][i],'#37494b');}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function stone(r,base,material){const mesh=new T.Mesh(rockGeometry(r.r,r.height,r.seed||1),material);mesh.position.set(r.x,base,r.z);mesh.name='Fractured reef stone';mesh.castShadow=mesh.receiveShadow=true;return mesh;}
function coralGeometry(seed,palette){
 const positions=[],colors=[],indices=[],buds=[];const dark=new T.Color(palette[0]),light=new T.Color(palette[1]);
 function branch(a,b,radius,level){const start=positions.length/3,steps=5,sides=7,dir=b.clone().sub(a),right=new T.Vector3(0,0,1).cross(dir).normalize(),other=new T.Vector3().crossVectors(dir,right).normalize();
  for(let j=0;j<=steps;j++){const u=j/steps,p=a.clone().lerp(b,u);p.x+=Math.sin(u*Math.PI)*.025*Math.sin(seed+level);const rad=radius*(1-u*.43),co=dark.clone().lerp(light,Math.min(1,(p.y*.7+level*.12)));
   for(let k=0;k<sides;k++){const angle=k/sides*Math.PI*2,v=p.clone().addScaledVector(right,Math.cos(angle)*rad).addScaledVector(other,Math.sin(angle)*rad);positions.push(v.x,v.y,v.z);colors.push(co.r,co.g,co.b);if(j<steps){const A=start+j*sides+k,B=start+j*sides+(k+1)%sides,C=A+sides,D=B+sides;indices.push(A,B,C,B,D,C);}}
  }
 }
 const top=new T.Vector3(.04, .48, .01);branch(new T.Vector3(),top,.08,0);
 for(let i=0;i<7;i++){
  const a=new T.Vector3(.04,.20+i*.035,.01),ang=i*2.399+seed*.3,len=.28+.18*rand(i+seed),b=new T.Vector3(Math.cos(ang)*len,.55+.23*rand(i*9+seed),Math.sin(ang)*len*.65);branch(a,b,.060,1);
  for(let j=0;j<3;j++){const angle=ang+(j-1)*.8,end=b.clone().add(new T.Vector3(Math.cos(angle)*(.07+.07*rand(seed+i+j)),.10+.13*rand(seed+i*6+j),Math.sin(angle)*.10));branch(b,end,.034,2);
   for(let k=0;k<7;k++){const t=k*2.399,scale=.047+.021*rand(seed+i+j+k);buds.push({p:end.clone().add(new T.Vector3(Math.cos(t)*.038,rand(k+seed)*.07,Math.sin(t)*.038)),scale});}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.08;return{g,buds};
}
function sway(m,time){m.onBeforeCompile=s=>{s.uniforms.reefTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float reefTime;').replace('#include <project_vertex>',`#include <project_vertex>`).replace('#include <begin_vertex>',`#include <begin_vertex>
 #ifdef USE_INSTANCING
 float stemHeight=instanceMatrix[3].y;transformed.x+=.016*sin(reefTime*.65)*stemHeight/length(instanceMatrix[0].xyz);transformed.z+=.012*cos(reefTime*.52)*stemHeight/length(instanceMatrix[0].xyz);
 #else
 transformed.x+=.016*sin(reefTime*.65)*position.y;transformed.z+=.012*cos(reefTime*.52)*position.y;
 #endif`);};m.customProgramCacheKey=()=> 'jeju-soft-coral-sway-v1';}
export function createReefDecor(solids,floor){
 const group=new T.Group(),occluders=[],time={value:0},material=rockMaterial();group.name='Jeju southern reef study';
 // Distant relief is outside the swimming bounds; it frames open water without blocking a route.
 const backdrop=[[-13,-3,3.1,3.7],[-13,-10,4.2,5.3],[-10,-20,4.5,7.3],[-3,-25,4.4,4.2],[5,-26,5.1,6.3],[13,-20,4.7,5.1],[14,-10,3.3,3.8],[13,-1,2.7,2.5]];
 for(let i=0;i<backdrop.length;i++){const [x,z,r,height]=backdrop[i];const m=stone({x,z,r,height,seed:40+i},floor(x,z)-.3,material);m.castShadow=false;group.add(m);}
 const colonies=[{x:3.35,y:1.2,size:.90},{x:4.05,y:2.15,size:1.1},{x:4.65,y:.75,size:.75},{x:5.25,y:1.65,size:1.05},{x:5.85,y:.6,size:.70},{x:3.6,y:2.85,size:.65},{x:2.55,y:.53,size:.45},{x:3.15,y:.46,size:.56},{x:4.6,y:1.13,size:.63},{x:-4.8,y:.65,z:-2.5,size:1.05},{x:-5.4,y:.9,z:-2.5,size:.78},{x:5.4,y:.68,z:-5.5,size:1.0}];
 const ray=new T.Raycaster(),matrix=new T.Object3D(),up=new T.Vector3(0,1,0);let placed=0,polypCount=0,triangles=0;
 for(let i=0;i<colonies.length;i++){const c=colonies[i];ray.set(new T.Vector3(c.x,c.y,c.z??1),new T.Vector3(0,0,-1));ray.near=0;ray.far=8;const hit=ray.intersectObjects(solids,false).find(h=>h.object.name!=='Sandy passage');if(!hit)continue;
  const palette=i%3===1?['#744c68','#c78eaf']:i%3===2?['#a54c43','#e6a47f']:['#a54f27','#f2ba78'];const {g,buds}=coralGeometry(i+3,palette),mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.83});sway(mat,time);
  const colony=new T.Group();colony.name='Soft coral colony';colony.position.copy(hit.point).addScaledVector(hit.face.normal,.02);colony.scale.setScalar(c.size);const axis=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).lerp(up,.8).normalize();colony.quaternion.setFromUnitVectors(up,axis);group.add(colony);
  const branches=new T.Mesh(g,mat);branches.castShadow=false;branches.receiveShadow=true;colony.add(branches);occluders.push(branches);triangles+=g.index.count/3;
  const budMat=new T.MeshStandardMaterial({color:palette[1],roughness:.85});sway(budMat,time);const tips=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),budMat,buds.length);tips.name='Soft coral polyp clusters';
  buds.forEach((b,j)=>{matrix.position.copy(b.p);matrix.rotation.set(j*.51,j*.21,0);matrix.scale.set(b.scale,b.scale*.8,b.scale);matrix.updateMatrix();tips.setMatrixAt(j,matrix.matrix);tips.setColorAt(j,new T.Color(j%5===0?'#efe3ca':palette[1]));});tips.instanceMatrix.needsUpdate=true;tips.instanceColor.needsUpdate=true;tips.computeBoundingSphere();tips.boundingSphere.radius+=.08;colony.add(tips);polypCount+=buds.length;triangles+=buds.length*20;placed++;
 }
 return{group,occluders,update(dt){time.value+=dt;},inspect(){return{theme:'Jeju southern soft-coral reef',colonies:placed,polyps:polypCount,triangles,backdropRocks:backdrop.length};}};
}
export function enhanceSand(material,time){
 material.onBeforeCompile=s=>{s.uniforms.reefTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 sandP;').replace('#include <begin_vertex>','#include <begin_vertex>\nsandP=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 sandP;uniform float reefTime;\n'+noiseGLSL).replace('#include <color_fragment>',`#include <color_fragment>
 float ripple=sin(sandP.x*18.0+sin(sandP.z*1.5)*1.3+reefNoise(sandP*1.4)*1.1);
 float grain=reefNoise(sandP*120.0);
 diffuseColor.rgb*=.93+.025*ripple+.08*grain;
 vec2 p=sandP.xz;float n=reefNoise(vec3(p*.8,reefTime*.09));float a=sin(p.x*2.3+sin(p.y*1.8+reefTime*.22)+n*2.0);float b=cos(p.y*2.1+sin(p.x*1.6-reefTime*.18));
 float lines=pow(1.0-abs(a*b),18.0);diffuseColor.rgb*=1.0+lines*.27;`);};material.customProgramCacheKey=()=> 'jeju-sand-ripple-v1';
}
