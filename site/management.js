import {SPECIES,SPECIES_INFO,stateFor,fishLength} from './species.js?v=2026-10-20-jeju-rov-v1';
import * as T from './vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js?v=2026-10-20-jeju-rov-v1';
import {createFish} from './fish.js?v=2026-10-20-jeju-rov-v1';
import {MANAGEMENT as M} from './management-layout.js?v=2026-10-20-jeju-rov-v1';
export function createManagement(asset,progress){
 const group=new T.Group();group.position.set(M.floor.x,.12,M.floor.z);
 const colours={floor:'#b7b1a4',navy:'#344a60',deck:'#576776',steel:'#899597',brass:'#b89b58',tank:'#ced2cd',water:'#28647e'};
 const materials=new Map(),batches=new Map(),indicators={},animals={};
 function material(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.83,metalness:.05}));return materials.get(c);}
 function shape(g,c,x,y,z,rotation){const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),rotation||new T.Quaternion(),new T.Vector3(1,1,1));g.applyMatrix4(matrix);if(!batches.has(c))batches.set(c,[]);batches.get(c).push(g);}
 function box(w,h,d,x,y,z,c){shape(new T.BoxGeometry(w,h,d),c,x,y,z);}
 function rod(a,b,r=.04,c=colours.brass){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),center=new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5);shape(new T.CylinderGeometry(r,r,v.length(),8),c,...center.toArray(),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));}
 function label(s,x,y,z,w=3){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=120;const ctx=canvas.getContext('2d');ctx.fillStyle='#f2e4c5';ctx.beginPath();ctx.roundRect(2,2,764,116,18);ctx.fill();ctx.fillStyle='#253b51';ctx.font='600 58px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,384,60,740);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const o=new T.Sprite(new T.SpriteMaterial({map:tex}));o.position.set(x,y,z);o.scale.set(w,w*120/768,1);group.add(o);}
 box(24,.2,20.8,0,-.12,0,colours.floor);box(24,5.6,.2,0,2.8,-10.4,colours.navy);
 for(const x of [-12,12])box(.18,.8,20.8,x,.4,0,colours.navy);
 for(const x of [-6.85,6.85])box(10.3,.3,.2,x,.15,10.4,colours.navy);
 for(const x of [-1.7,1.7])box(.16,3.2,.2,x,1.6,10.4,colours.brass); // The near doorway lintel is cut away to keep the captain visible.

 label('광장으로',0,.8,10.7,2.6);
 // All static opaque parts are batched by material, including stair treads and railings.
 for(let x=-10;x<=10;x+=2)box(.015,.01,20.6,x,-.008,0,'#a5a397');
 for(let z=-10;z<=10;z+=2)box(23.8,.01,.015,0,-.008,z,'#a5a397');
 for(const [i,slot] of M.slots.entries()){
  const x=slot.x-M.floor.x,z=-5;
  shape(new T.CylinderGeometry(2.85,2.85,.2,48),colours.navy,x,.1,z);
  const wall=new T.LatheGeometry([new T.Vector2(2.64,.15),new T.Vector2(2.64,3.15),new T.Vector2(2.8,3.15),new T.Vector2(2.8,.15)],48);shape(wall,colours.tank,x,0,z);
  const water=new T.Mesh(new T.CircleGeometry(2.63,48),new T.MeshStandardMaterial({color:colours.water,transparent:true,opacity:.58,roughness:.4,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.set(x,2.86,z);group.add(water);
  for(const y of [.28,2.98])shape(new T.TorusGeometry(2.805,.04,6,48),'#8c9b9e',x,y,z,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
  rod([x-2.96,.25,z+.6],[x-2.96,3.5,z+.6],.09,'#9ba8a5');rod([x-2.96,3.5,z+.6],[x-2.1,3.5,z+.6],.09,'#9ba8a5');rod([x-2.1,3.5,z+.6],[x-2.1,3.05,z+.6],.09,'#9ba8a5');
  label(['흰동가리 · 적응 수조','가시복 · 적응 수조','깃대돔 · 뿔복'][i],x,4.05,z-2.6,3.4);
  const indicator=new T.Mesh(new T.BoxGeometry(.5,.13,.1),new T.MeshLambertMaterial({color:'#d8c7a4'}));indicator.position.set(x,2.98,z+2.82);group.add(indicator);indicators[slot.kind]=indicator;

 }
 for(const kind of (asset.speciesAssets?SPECIES:['fish'])){const model=createFish(asset,{kind,length:fishLength(kind)});animals[kind]=model;group.add(model);}
 box(22.4,.18,2.4,0,2.16,-1.1,colours.deck);
 for(let x=-10.6;x<=10.7;x+=3.55)for(const z of [-2.1,-.1])box(.12,2.1,.12,x,1.05,z,colours.navy);
 for(let x=-10.9;x<11;x+=.34)box(.06,.025,2.24,x,2.267,-1.1,colours.steel);
 for(const [a,b] of [[-11.2,-10.3],[-8.3,8.3],[10.3,11.2]]){rod([a,3.15,.14],[b,3.15,.14]);rod([a,2.72,.14],[b,2.72,.14],.025,colours.steel);for(let x=a;x<=b+.01;x+=1.2)rod([x,2.25,.14],[x,3.18,.14],.035,colours.steel);}
 for(const [a,b] of [[-11.2,-10.7],[-5.3,-2.7],[2.7,5.3],[10.7,11.2]]){rod([a,3.15,-2.3],[b,3.15,-2.3]);for(let x=a;x<=b+.01;x+=1.1)rod([x,2.25,-2.3],[x,3.18,-2.3],.035,colours.steel);}
 for(const x of [-9.3,9.3]){
  for(let i=0;i<10;i++){const h=(i+1)*.225,z=4.9-(i+.5)*.48;box(1.8,h,.48,x,h/2,z,colours.deck);box(1.8,.025,.07,x,h+.018,z+.18,colours.brass);}
  for(const side of [-1,1]){const sx=x+side*.95;rod([sx,.95,4.9],[sx,3.18,.1]);for(const z of [4.9,2.5,.1]){const y=2.25*(1-(z-.1)/4.8);rod([sx,y,z],[sx,y+.95,z],.035,colours.steel);}}
 }
 for(const [c,geometries] of batches){const merged=mergeGeometries(geometries,false),o=new T.Mesh(merged,material(c));o.castShadow=true;o.receiveShadow=true;group.add(o);geometries.forEach(g=>g.dispose());}
 function update(dt,time){
  for(const [id,indicator] of Object.entries(indicators))indicator.material.color.set(SPECIES.some(k=>SPECIES_INFO[k].holdingSlot===id&&stateFor(progress,k)?.admitted&&!stateFor(progress,k).placed)?'#c79b51':'#d8c7a4');
  for(const [kind,model] of Object.entries(animals)){const p=stateFor(progress,kind),slot=M.slots.find(s=>s.kind===SPECIES_INFO[kind].holdingSlot),x=slot.x-M.floor.x;model.visible=!!p?.admitted&&!p.placed;if(model.visible){const shared=kind==='moorish'?-1:kind==='cowfish'?1:0;model.position.set(x+shared+Math.sin(time*.6)*.45,2.62+Math.sin(time)*.04,-5+Math.cos(time*.6)*.35);model.userData.update(dt);model.rotation.y=Math.atan2(.45*Math.cos(time*.6),-.35*Math.sin(time*.6));}}
 }
 update(0,0);return {group,update,indicators,inspect:()=>({tanks:M.slots.length,stairs:2,deckHeight:M.deck.height,animals:Object.fromEntries(Object.entries(animals).map(([k,m])=>[k,{visible:m.visible,model:m.userData.inspect?.()}]))})};
}
