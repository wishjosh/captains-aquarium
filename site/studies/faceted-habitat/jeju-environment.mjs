import * as T from './runtime/vendor/three.module.js';
import {reefFloor} from './reef-terrain.mjs?v=2026-11-02-discovery-1';
import {eckloniaGeometry,sargassumGeometry,urchinGeometry} from './jeju-life-geometry.mjs?v=2026-11-10-jeju-2';
import {JEJU_ENVIRONMENT_VERSION,ROCK_BEDS,plantCandidates,jejuGroundBlend,jejuZone,jejuHint,seeded,routeDistance} from './jeju-habitat-layout.mjs?v=2026-11-10-jeju-2';
export {jejuZone,jejuHint} from './jeju-habitat-layout.mjs?v=2026-11-10-jeju-2';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function animateMaterial(material,time,player,{vegetation=false}={}){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{previous?.(shader);shader.uniforms.jejuTime=time;shader.uniforms.jejuPlayer=player;
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float jejuTime; uniform vec3 jejuPlayer; varying vec3 vJejuWorld;');
 if(vegetation)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 rootAt=vec4(0.0,0.0,0.0,1.0);
 #ifdef USE_INSTANCING
 rootAt=instanceMatrix*rootAt;
 #endif
 rootAt=modelMatrix*rootAt;
 float stemWeight=pow(clamp(position.y/1.5,0.0,1.0),1.65);
 float waterPhase=jejuTime*.58+rootAt.x*.23+rootAt.z*.16;
 vec2 away=rootAt.xz-jejuPlayer.xz; float d=length(away);
 vec2 bend=away/max(d,.01)*max(0.0,1.35-d)*.12;
 transformed.x+=stemWeight*(sin(waterPhase+position.y*.8)*.16+bend.x);
 transformed.z+=stemWeight*(cos(waterPhase*.77+position.y)*.09+bend.y);`);
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 jejuWorld=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 jejuWorld=instanceMatrix*jejuWorld;
 #endif
 vJejuWorld=(modelMatrix*jejuWorld).xyz;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float jejuTime; varying vec3 vJejuWorld;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`vec2 waterUV=vJejuWorld.xz;
 float waveA=sin(waterUV.x*1.65+sin(waterUV.y*1.1+jejuTime*.27));
 float waveB=sin(waterUV.y*1.7+sin(waterUV.x*.9-jejuTime*.21));
 float caustic=pow(max(0.0,1.0-abs(waveA+waveB)*2.8),7.0);
 gl_FragColor.rgb+=vec3(.10,.14,.105)*caustic*.33;
 #include <dithering_fragment>`);
 };
 material.customProgramCacheKey=()=>vegetation?'jeju-algae-water-1':'jeju-ground-light-1';material.needsUpdate=true;return material;
}
export function createJejuEnvironment({assets,scene,scenery,garden,lighting}){
 const group=new T.Group();group.name='Jeju rocky coast and sea forest';const time={value:0},player={value:V()},dummy=new T.Object3D(),random=seeded(20261110),rocks=[],anchors=[],urchinAnchors=[],allPlants=[],colliders=[];
 scene.background.set('#226d7a');scene.fog.color.set('#226d7a');scene.fog.density=.023;lighting.fill.intensity=1.35;lighting.fill.color.set('#baded6');lighting.fill.groundColor.set('#254950');lighting.key.color.set('#ffe8bd');lighting.key.intensity=3.0;scene.environmentIntensity=.18;
 const visitedMaterials=new Set();for(const root of[scenery.group,garden.group])root.traverse(o=>{if(!o.isMesh)return;if(o.name==='Passable seaweed'){o.visible=false;return;}
  if(o.name.startsWith('Seabed tile')||o.name==='Distant seabed continuation'){const pos=o.geometry.attributes.position,col=o.geometry.attributes.color;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),blend=jejuGroundBlend(x,z),c=new T.Color('#526c64').lerp(new T.Color('#bec5a9'),blend.sand).lerp(new T.Color('#314c50'),blend.rock*.75);c.multiplyScalar(.94+.06*Math.sin(x*2.7+z*1.3));col.setXYZ(i,c.r,c.g,c.b);}col.needsUpdate=true;}
  if(/rock|reef slab/i.test(o.name)&&o.material?.color)o.material.color.set('#3d5356');
  if(!visitedMaterials.has(o.material)&&o.material?.isMeshStandardMaterial&&!o.isInstancedMesh&&/Seabed tile|Distant seabed continuation|Garden rock|Connected low reef slab/.test(o.name)){visitedMaterials.add(o.material);animateMaterial(o.material,time,player);}
 });
 const templates=new Map();assets.rockModules.scene.traverse(o=>{if(o.isMesh)templates.set(o.name,o.geometry);});const rockMaterial=animateMaterial(new T.MeshStandardMaterial({color:'#3b5155',roughness:.98,flatShading:true}),time,player);
 for(const part of[2,3,6]){const geometry=templates.get('rocks-'+part).clone();geometry.computeBoundingBox();const b=geometry.boundingBox,size=b.getSize(V()),center=b.getCenter(V());geometry.translate(-center.x,-b.min.y,-center.z);geometry.scale(1/size.x,1/size.y,1/size.z);const beds=ROCK_BEDS.filter(b=>b.part===part),batch=new T.InstancedMesh(geometry,rockMaterial,beds.length);batch.name='Jeju basalt shelves '+part;
  beds.forEach((b,i)=>{dummy.position.set(b.x,reefFloor(b.x,b.z)-.12,b.z);dummy.scale.fromArray(b.size);dummy.rotation.set(0,b.angle,0);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);batch.setColorAt(i,new T.Color().setRGB(.88+random()*.14,.91+random()*.12,.94+random()*.08));});batch.receiveShadow=true;batch.castShadow=true;batch.computeBoundingSphere();group.add(batch);rocks.push(batch);
 }
 group.updateMatrixWorld(true);const ray=new T.Raycaster(),support=(x,z,targets=rocks)=>{ray.set(V(x,15,z),V(0,-1,0));return ray.intersectObjects(targets,false)[0];};
 for(const b of ROCK_BEDS)for(let x=b.x-b.size[0]*.65;x<b.x+b.size[0]*.65;x+=.65)for(let z=b.z-b.size[2]*.65;z<b.z+b.size[2]*.65;z+=.65){const hit=support(x,z);if(hit&&hit.point.y>reefFloor(x,z)+.08)colliders.push([x,z,.38,hit.point.y]);}
 for(const kind of['kelp','sargassum'])for(let variant=0;variant<2;variant++){
  const placements=plantCandidates(kind).filter(p=>p.variant===variant).flatMap(p=>{const h=support(p.x,p.z);return h?[{...p,y:h.point.y-.025}]:[];});
  const geometry=kind==='kelp'?eckloniaGeometry(variant):sargassumGeometry(variant),material=animateMaterial(new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.89,side:T.DoubleSide}),time,player,{vegetation:true});
  const mesh=new T.InstancedMesh(geometry,material,placements.length);mesh.name=kind==='kelp'?'Rooted Ecklonia canopy':'Rooted Sargassum shrubs';
  placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color((kind==='kelp'?['#506346','#5e6d46','#4d5c39','#6b7848']:['#897b3d','#98864a','#72723b'])[i%(kind==='kelp'?4:3)]));anchors.push({...p,substrate:'rock',routeClearance:routeDistance(p.x,p.z)});});mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.4;group.add(mesh);allPlants.push(mesh);
 }
 const ug=urchinGeometry(),um=new T.MeshStandardMaterial({color:'#4b354c',vertexColors:true,roughness:.93}),ur=[];
 for(const index of[0,1,2,3,4,5,7,8,9,10,11,12]){const b=ROCK_BEDS[index];for(const offset of[.1]){const x=b.x+offset,z=b.z+.15,hit=support(x,z);if(hit)ur.push({x,y:hit.point.y-.012,z,angle:random()*6.28,scale:.75+random()*.25});}}
 const urchins=new T.InstancedMesh(ug,um,ur.length);urchins.name='Purple sea urchins on basalt';ur.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();urchins.setMatrixAt(i,dummy.matrix);urchinAnchors.push(p);});urchins.receiveShadow=true;urchins.computeBoundingSphere();group.add(urchins);
 // A light surface, sparse suspended particles and broad shafts give depth without texture downloads.
 const surface=new T.Mesh(new T.PlaneGeometry(150,150),new T.MeshBasicMaterial({color:'#9dcbbc',transparent:true,opacity:.21,side:T.DoubleSide,depthWrite:false}));surface.name='Distant water surface';surface.rotation.x=-Math.PI/2;surface.position.y=8.35;group.add(surface);
 const particles=new Float32Array(210*3);for(let i=0;i<210;i++){particles[i*3]=(random()-.5)*38;particles[i*3+1]=.7+random()*6.5;particles[i*3+2]=18-random()*48;}const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(particles,3));const pm=new T.ShaderMaterial({uniforms:{time},transparent:true,depthWrite:false,vertexShader:`uniform float time;void main(){vec3 p=position;p.x+=sin(time*.17+p.z)*.15;p.y+=sin(time*.11+p.x)*.07;vec4 v=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(18./max(.2,-v.z),1.,2.5);gl_Position=projectionMatrix*v;}`,fragmentShader:`void main(){float d=length(gl_PointCoord-vec2(.5));float a=(1.-smoothstep(.1,.5,d))*.2;gl_FragColor=vec4(.74,.9,.82,a);}`});const motes=new T.Points(pg,pm);motes.name='Slow suspended sea particles';group.add(motes);
 const shaftGeo=new T.BufferGeometry();shaftGeo.setAttribute('position',new T.Float32BufferAttribute([-1,8,0,1,8,0,5,-.3,0,-1,8,0,5,-.3,0,1.4,-.3,0],3));const shaftMat=new T.MeshBasicMaterial({color:'#b4dfc3',transparent:true,opacity:.022,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});for(const [x,z,angle]of[[-7,5,.1],[1,-6,.3],[-8,-17,-.1]]){const beam=new T.Mesh(shaftGeo,shaftMat);beam.position.set(x,0,z);beam.rotation.y=angle;beam.name='Soft shaft of daylight';group.add(beam);}
 scene.add(group);group.updateMatrixWorld(true);scenery.solids.push(...rocks);scenery.colliders.push(...colliders);scenery.occluders.push(...rocks);
 let triangles=0;group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
 const report={version:JEJU_ENVIRONMENT_VERSION,authoredRegion:true,rockShelves:ROCK_BEDS.length,plants:anchors.reduce((a,p)=>(a[p.kind]=(a[p.kind]||0)+1,a),{}),urchins:ur.length,additionalTriangles:triangles,additionalTextureBytes:0,vegetationPassable:true,routeMinimumPlantClearance:Math.min(...anchors.map(a=>a.routeClearance)),anchors,urchinAnchors,colliders:colliders.length};
 return{group,rocks,colliders,zone:jejuZone,hint:jejuHint,update(dt,position){time.value+=dt;player.value.fromArray(position);},inspect(){return{...report,zone:jejuZone(player.value.toArray()),time:time.value};}};
}
