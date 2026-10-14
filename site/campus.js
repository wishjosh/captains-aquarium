import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
export async function loadCampus(){const l=new GLTFLoader();const paths={large:'assets/pirate/house1.gltf',small:'assets/pirate/house3.gltf',rock:'assets/nature/rock_largeA.glb',rockB:'assets/nature/rock_largeC.glb'};return Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[k,await l.loadAsync(p)])));}
export function createCampus(kit,assets){const scene=new T.Group(),a={...kit,...assets};
const mat=(c,extra={})=>new T.MeshStandardMaterial({color:c,roughness:.88,...extra});
const materials={wood:mat('#80513a'),plank:mat('#b28153'),navy:mat('#263c59'),sand:mat('#ddc899'),stone:mat('#d7cbb2'),grass:mat('#7f9b48'),glass:mat('#57afc6',{metalness:.22,roughness:.15,transparent:true,opacity:.72})};
function box(w,h,d,x,y,z,m,parent=scene){const n=new T.Mesh(new T.BoxGeometry(w,h,d),typeof m==='string'?mat(m):m);n.position.set(x,y,z);n.castShadow=n.receiveShadow=true;parent.add(n);return n;}
function ground(points,y,depth,material){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});g.rotateX(-Math.PI/2);const mesh=new T.Mesh(g,material);mesh.position.y=y-depth;mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh;}
const coast=[[-180,-180],[180,-180],[180,-10],[25,-10],[23,-3],[20,3],[15,7],[11,8],[7,10],[2,11],[-4,10],[-10,12],[-17,10],[-24,8],[-31,2],[-90,-5],[-180,-7]];
ground(coast,.9,2,materials.sand);
ground(coast.map(([x,z])=>[x*.98,z>0?z-2:z]),1,1.3,materials.grass);
ground([[-17,-11],[17,-12],[19,-5],[16,3],[10,6],[4,8],[-5,8],[-13,6],[-17,1]],1.03,.1,materials.stone);
// Sparse paving seams keep the circulation visible without dense detail.
const paving=new T.InstancedMesh(new T.BoxGeometry(1.96,.025,1.96),mat('#d7c8aa'),105);let tileIndex=0;const tileMatrix=new T.Matrix4();
for(let x=-14;x<=14;x+=2)for(let z=-8;z<=5;z+=2){tileMatrix.makeTranslation(x,1.045,z);paving.setMatrixAt(tileIndex++,tileMatrix);}paving.receiveShadow=true;scene.add(paving);
const wg=new T.PlaneGeometry(260,260,130,130);wg.rotateX(-Math.PI/2);const pos=wg.attributes.position,colors=[];
for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,-.65+Math.sin(x*.6+z*.32)*.035);const c=new T.Color().setHSL(.585,.72,.23+Math.sin(x*1.37+z*.71)*.012);colors.push(c.r,c.g,c.b);}wg.setAttribute('color',new T.Float32BufferAttribute(colors,3));wg.computeVertexNormals();const water=new T.Mesh(wg,new T.MeshStandardMaterial({vertexColors:true,roughness:.4,flatShading:true,metalness:.05}));water.receiveShadow=true;scene.add(water);
// Small foam strokes at the front of the shoreline.
for(let i=0;i<35;i++){const x=-23+i*1.25,z=12.8+Math.sin(x*.22)*1.3;const n=box(.5+(i%4)*.3,.025,.11,x,-.55,z,'#b2e9e4');n.rotation.y=Math.sin(i)*.4;n.castShadow=false;}
function fit(asset,size,axis='y'){const model=asset.scene.clone(true);const bounds=new T.Box3().setFromObject(model),extent=bounds.getSize(new T.Vector3()),scale=size/extent[axis];model.scale.multiplyScalar(scale);model.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*scale/2);const group=new T.Group();group.add(model);model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});return group;}
function place(asset,size,x,z,y=1,axis='y',angle=0){const n=fit(asset,size,axis);n.position.set(x,y,z);n.rotation.y=angle;scene.add(n);return n;}
 // Kenney GLBs export terrain as metallic; use non-metal terrain instances under this lighting.
 for(const key of ['rock','rockB'])a[key].scene.traverse(n=>{if(n.isMesh){const adjust=m=>{const c=m.clone();c.metalness=0;c.roughness=1;return c;};n.material=Array.isArray(n.material)?n.material.map(adjust):adjust(n.material);}});
 // User-selected complete building units: retain original doors, roofs and stairs.
 const small=place(a.small,10,-8,-1.5,1.06,'x',0);small.name='Quaternius House3 / proposed management';
 const large=place(a.large,17,6,-7,1.06,'x',0);large.name='Quaternius House1 / proposed exhibition';
 // Quaternius dock remains the separate departure point.
 // Align plank tops (original y=.488), not the bottom of the submerged posts.
 const dockBounds=new T.Box3().setFromObject(a.dock.scene),dockScale=4/(dockBounds.max.z-dockBounds.min.z);
 const dockY=1.06-(.488-dockBounds.min.y)*dockScale;
 for(let i=0;i<6;i++)place(a.dock,4,12,8+i*1.65,dockY,'z',0);
 place(a.barrel,1.3,10.2,6.7);place(a.chest,.8,-13,1.5);
 for(const [x,z,h] of [[-17,-1,5],[-15,7,4.5],[-2,-9,4.8],[18,-6,5],[18,4,4.8],[-20,-14,5.5]])place(a.palm,h,x,z,1,'y',x*.7);
 for(const [x,z,size] of [[-25,-10,5],[-22,-9,4],[-25,-5,4],[24,-9,4],[23,-3,3],[20,2,3]])place(a.rockB,size,x,z,.7,'x',x*.1);
 for(let i=0;i<16;i++){const x=-26+i*3.0,z=10+Math.sin(x*.21)*1.3;if(x>9&&x<16)continue;place(i%2?a.rock:a.rockB,2.5+(i%3)*.5,x,z,-.2,'x',i*.83);}

 // Jeju-inspired rounded hills. Trails share the exact terrain height function.
 const hills=[[-25,-29,7,19,17],[-4,-36,11,20,18],[22,-32,8,18,16],[43,-43,10,24,20]];
 function height(x,z){return 1.05+hills.reduce((h,[cx,cz,peak,rx,rz])=>h+peak*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2)*1.8),0);}
 const terrain=new T.PlaneGeometry(150,85,80,48);terrain.rotateX(-Math.PI/2);terrain.translate(0,0,-48);const tp=terrain.attributes.position,tc=[];
 for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i),h=height(x,z);tp.setY(i,h);const c=new T.Color().setHSL(.22+(h/70),.48,.115+h*.004);tc.push(c.r,c.g,c.b);}
 terrain.setAttribute('color',new T.Float32BufferAttribute(tc,3));terrain.computeVertexNormals();const land=new T.Mesh(terrain,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));land.receiveShadow=true;scene.add(land);
 const trail=new T.CatmullRomCurve3([new T.Vector3(-19,0,-12),new T.Vector3(-23,0,-21),new T.Vector3(-15,0,-25),new T.Vector3(-8,0,-30),new T.Vector3(-12,0,-35),new T.Vector3(-3,0,-39),new T.Vector3(6,0,-36),new T.Vector3(17,0,-29),new T.Vector3(27,0,-31)]);
 const vertices=[],indices=[];for(let i=0;i<=180;i++){const t=i/180,p=trail.getPoint(t),dir=trail.getTangent(t),nx=-dir.z*.42,nz=dir.x*.42;for(const side of [-1,1]){const x=p.x+nx*side,z=p.z+nz*side;vertices.push(x,height(x,z)+.045,z);}if(i<180){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(vertices,3));tg.setIndex(indices);tg.computeVertexNormals();scene.add(new T.Mesh(tg,new T.MeshStandardMaterial({color:'#bdab7f',roughness:1,side:T.DoubleSide})));
 scene.name='Coastal campus with oreum hills and footpath';return scene;
}
