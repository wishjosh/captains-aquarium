import * as T from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
export function createROV(){
 const root=new T.Group(),propellers=[],m={
  cream:new T.MeshStandardMaterial({color:'#e1d5ad',roughness:.62}),
  teal:new T.MeshStandardMaterial({color:'#285661',roughness:.55,metalness:.2}),
  brass:new T.MeshStandardMaterial({color:'#b89961',roughness:.38,metalness:.42}),
  rubber:new T.MeshStandardMaterial({color:'#17353e',roughness:.76}),
  red:new T.MeshStandardMaterial({color:'#87463e',roughness:.65}),
  glass:new T.MeshStandardMaterial({color:'#a2d9de',transparent:true,opacity:.12,roughness:.16,metalness:.08,side:T.DoubleSide,depthWrite:false}),
  lens:new T.MeshStandardMaterial({color:'#264c66',roughness:.1,metalness:.65}),
  lamp:new T.MeshBasicMaterial({color:'#ffdf9d'})
 };
 const add=(g,mat,x=0,y=0,z=0,p=root)=>{const n=new T.Mesh(g,mat);n.position.set(x,y,z);p.add(n);return n;};
 const box=(w,h,d,x,y,z,mat=m.teal,p=root)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z,p);
 const rod=(a,b,r=.035,mat=m.brass,p=root)=>{const d=b.clone().sub(a),n=add(new T.CylinderGeometry(r,r,d.length(),12),mat,0,0,0,p);n.position.copy(a).addScaledVector(d,.5);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return n;};
 // Rounded original code geometry, with a simple silhouette readable on a phone.
 const shape=new T.Shape(),w=1.76,d=1.16,r=.24;shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
 const cover=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.08,bevelThickness:.09});cover.rotateX(-Math.PI/2);add(cover,m.cream,-.05,.22,0);
 box(.12,.015,1.02,-.49,.615,0,m.red);box(.12,.015,1.02,-.27,.615,0,m.red);
 for(const z of [-.64,.64]){rod(new T.Vector3(-.91,.05,z),new T.Vector3(.83,.05,z),.055,m.teal);rod(new T.Vector3(-.7,.05,z),new T.Vector3(-.7,-.65,z),.04);rod(new T.Vector3(.6,.05,z),new T.Vector3(.6,-.65,z),.04);rod(new T.Vector3(-1,-.72,z),new T.Vector3(.95,-.72,z),.065,m.teal);rod(new T.Vector3(.95,-.72,z),new T.Vector3(1.08,-.55,z),.055,m.teal);}
 for(const x of [-.7,.6])rod(new T.Vector3(x,-.65,-.64),new T.Vector3(x,-.65,.64),.045,m.teal);
 // Single forward camera, two lamps: clearly unmanned, no passenger window.
 const camera=add(new T.CylinderGeometry(.225,.225,.29,32),m.brass,.94,.24,0);camera.rotation.z=Math.PI/2;
 const lens=add(new T.SphereGeometry(.19,32,20),m.lens,1.11,.24,0);lens.scale.set(.35,1,1);
 add(new T.SphereGeometry(.038,12,8),m.lamp,1.178,.3,.055);
 for(const z of [-.43,.43]){add(new T.CylinderGeometry(.12,.12,.2,24),m.teal,.92,.2,z).rotation.z=Math.PI/2;add(new T.CylinderGeometry(.091,.091,.016,24),m.lamp,1.027,.2,z).rotation.z=Math.PI/2;}
 // Ring guards echo the metal hoops and barrels on the existing ship.
 function thruster(x,y,z,vertical=false){
  const g=new T.Group();g.position.set(x,y,z);if(vertical)g.rotation.z=Math.PI/2;root.add(g);
  const ring=add(new T.TorusGeometry(.21,.055,10,32),m.brass,0,0,0,g);ring.rotation.y=Math.PI/2;
  const shroud=add(new T.CylinderGeometry(.255,.255,.23,32,1,true),m.teal,0,0,0,g);shroud.rotation.z=Math.PI/2;
  const hub=new T.Group();g.add(hub);add(new T.SphereGeometry(.065,12,8),m.brass,0,0,0,hub);
  for(let i=0;i<3;i++){const p=new T.Group();p.rotation.x=i*Math.PI*2/3;hub.add(p);const blade=box(.035,.19,.07,0,.105,0,m.cream,p);blade.rotation.y=.28;}
  propellers.push(hub);
 }
 for(const x of [-.6,.53])for(const z of [-.79,.79])thruster(x,.03,z);
 for(const z of [-.38,.38])thruster(-.67,.63,z,true);
 // Transparent removable transport tank beneath the body. The game places a separately animated animal inside.
 const tank=new T.Group();tank.position.set(.02,-.36,0);root.add(tank);
 box(1.3,.49,.86,0,0,0,m.glass,tank);box(1.32,.045,.88,0,-.25,0,m.teal,tank);
 for(const x of [-.65,.65])for(const z of [-.43,.43])rod(new T.Vector3(x,-.25,z),new T.Vector3(x,.25,z),.025,m.brass,tank);
 for(const y of [-.25,.25])for(const z of [-.43,.43])rod(new T.Vector3(-.65,y,z),new T.Vector3(.65,y,z),.025,m.brass,tank);
 const door=new T.Group();door.position.set(.69,0,-.43);tank.add(door);box(.025,.47,.84,0,0,.42,m.glass,door);
 rod(new T.Vector3(0,-.24,0),new T.Vector3(0,.24,0),.028,m.brass,door);rod(new T.Vector3(0,-.24,.84),new T.Vector3(0,.24,.84),.028,m.brass,door);
 for(const y of [-.24,.24])rod(new T.Vector3(0,y,0),new T.Vector3(0,y,.84),.025,m.brass,door);
 // Short tool arm works beside the tank rather than reaching for a creature.
 for(const [a,b] of [[[.48,.02,.61],[.89,-.1,.71]],[[.89,-.1,.71],[1.04,-.36,.49]]]){rod(new T.Vector3(...a),new T.Vector3(...b),.045,m.teal);add(new T.SphereGeometry(.072,16,12),m.brass,...b);}
 for(const dy of [-.045,.045])rod(new T.Vector3(1.04,-.36,.49),new T.Vector3(1.1,-.36+dy,.4),.018,m.brass);
 const lift=add(new T.TorusGeometry(.115,.026,10,32),m.brass,-.13,.77,0);lift.rotation.y=Math.PI/2;
 function update(time,active,open=0){for(const p of propellers)p.rotation.x=time*(active?13:0);door.rotation.y=-open*1.6;}
 return {root,update,inspect:()=>({length:2.4,width:2.1,height:1.63,tankEmpty:true,cameraCount:1,lights:2,thrusters:6,crew:0})};
}
