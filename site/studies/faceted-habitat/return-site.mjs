import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {RETURN_SITE} from './return-site-config.mjs?v=2026-11-01-extension-1';
// Code-native faceted wood, cloth, rope and basalt, with static parts batched by material.
export function createReturnSite(floor){
 const root=new T.Group();root.name='Ship return rope';root.position.set(RETURN_SITE.home[0]+RETURN_SITE.ropeOffset[0],0,RETURN_SITE.home[2]+RETURN_SITE.ropeOffset[2]);
 const ground=floor(root.position.x,root.position.z),parts=new Map(),mats={rope:new T.MeshStandardMaterial({color:'#bca67a',roughness:1,flatShading:true}),wood:new T.MeshStandardMaterial({color:'#8e6036',roughness:.93,flatShading:true}),metal:new T.MeshStandardMaterial({color:'#726957',roughness:.8,metalness:.25,flatShading:true}),stone:new T.MeshStandardMaterial({color:'#4b5b5d',roughness:1,flatShading:true}),light:new T.MeshStandardMaterial({color:'#ecd6a0',emissive:'#bd8634',emissiveIntensity:.65,roughness:.55,flatShading:true})};
 function add(key,geo,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const o=new T.Object3D();o.position.fromArray(pos);o.rotation.set(...rot);o.scale.fromArray(scale);o.updateMatrix();geo.applyMatrix4(o.matrix);const flat=geo.index?geo.toNonIndexed():geo;const list=parts.get(key)||[];list.push(flat);parts.set(key,list);if(flat!==geo)geo.dispose();}
 function rod(key,a,b,r=.035){const av=new T.Vector3(...a),bv=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,av.distanceTo(bv),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),bv.clone().sub(av).normalize()));add(key,g,av.add(bv).multiplyScalar(.5).toArray());}
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,ground+.35,0),new T.Vector3(.01,2.2,0),new T.Vector3(.08,4.5,.04),new T.Vector3(.19,7.4,.10),new T.Vector3(.22,RETURN_SITE.top,.16)]);
 add('rope',new T.TubeGeometry(curve,24,.036,5,false));
 add('stone',new T.IcosahedronGeometry(.68,0),[0,ground+.24,0],[.12,.4,.08],[1.25,.58,.92]);
 add('rope',new T.TorusGeometry(.36,.027,4,10),[0,ground+.30,0],[Math.PI/2,0,0],[1.65,1,1]);
 // An old wooden crosspiece and a handhold, not a platform or a cage.
 rod('wood',[-.49,2.65,0],[.49,2.65,0],.065);
 for(const x of [-.11,.11])add('rope',new T.TorusGeometry(.073,.022,4,8),[x,2.65,0],[0,Math.PI/2,0]);
 add('metal',new T.TorusGeometry(.20,.025,5,12),[-.36,2.36,0]);rod('rope',[-.36,2.64,0],[-.36,2.56,0],.022);
 // Warm navigation lantern: emissive faces, no additional light or shadow map.
 add('light',new T.CylinderGeometry(.115,.14,.25,6),[.27,3.12,0]);
 for(const y of [2.97,3.27])add('wood',new T.CylinderGeometry(.17,.17,.06,6),[.27,y,0]);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;rod('metal',[.27+Math.cos(a)*.13,3.0,Math.sin(a)*.13],[.27+Math.cos(a)*.13,3.25,Math.sin(a)*.13],.012);}
 rod('wood',[0,3.48,0],[.45,3.48,0],.035);rod('rope',[.27,3.48,0],[.27,3.31,0],.018);
 // Swallowtail pennant silhouette, carried by the same rope.
 rod('wood',[-.08,3.9,0],[.79,3.9,0],.025);
 const clothGeo=new T.BufferGeometry();clothGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.83,-.07,.03,.70,-.72,.05,0,0,0,.70,-.72,.05,.36,-.52,.01,0,0,0,.36,-.52,.01,0,-.72,0],3));clothGeo.computeVertexNormals();const cloth=new T.Mesh(clothGeo,new T.MeshStandardMaterial({color:'#c5a05c',side:T.DoubleSide,roughness:1,flatShading:true}));cloth.position.set(.02,3.87,.015);root.add(cloth);
 for(const [key,geos]of parts){const p=[],n=[];for(const g of geos){p.push(...g.attributes.position.array);n.push(...g.attributes.normal.array);g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.computeBoundingSphere();const mesh=new T.Mesh(g,mats[key]);mesh.name='Return '+key;root.add(mesh);}
 let triangles=0;root.traverse(n=>{if(n.isMesh)triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;});
 const marker=[root.position.x+.2,RETURN_SITE.markerHeight,root.position.z];
 return{root,marker,update(t,returning){cloth.rotation.y=Math.sin(t*.45)*.12;cloth.rotation.z=Math.sin(t*.34)*.025;mats.light.emissiveIntensity=returning?.85:.65;},inspect(){return{home:[...RETURN_SITE.home],rope:[root.position.x,ground,root.position.z],marker:[...marker],triangles,drawCalls:root.children.length,boardingDwell:RETURN_SITE.boardingDwell};}};
}
