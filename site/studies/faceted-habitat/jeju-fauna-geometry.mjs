import * as T from './runtime/vendor/three.module.js';
import {FISH_SPECIES} from './jeju-species.mjs?v=2026-11-10-life-2';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
class Shape {
 constructor(){this.p=[];this.c=[];this.m=[];}
 tri(a,b,c,color,body=0){for(const p of[a,b,c]){this.p.push(...p);this.c.push(...color.toArray());this.m.push(body);}}
 append(g,m,c){const n=g.index?g.toNonIndexed():g;for(let i=0;i<n.attributes.position.count;i++){this.p.push(...V().fromBufferAttribute(n.attributes.position,i).applyMatrix4(m).toArray());this.c.push(...c.toArray());this.m.push(0);}if(n!==g)n.dispose();g.dispose();}
 segment(a,b,r0,r1,c){const d=b.clone().sub(a);this.append(new T.CylinderGeometry(r1,r0,d.length(),5,1),new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(V(0,1,0),d.clone().normalize()),V(1,1,1)),c);}
 finish(name){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setAttribute('coastBody',new T.Float32BufferAttribute(this.m,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData={name,triangles:this.p.length/9,original:true};return g;}
}
function profile(id,x){
 const u=(x+.48)/.99,s=Math.pow(Math.max(0,Math.sin(u*Math.PI)),id==='stripey'?.65:.8);
 return s*(id==='stripey'?(.82+.2*(1-u)):id==='wrasse'?(.93+.08*Math.cos(u*5)):1);
}
function bodyColor(s,x,y){
 const c=new T.Color(s.color),dark=new T.Color('#273b3c');
 let stripe=false;
 if(s.pattern==='bars')stripe=Math.sin((x+.49)*Math.PI*14)> .20;
 if(s.pattern==='diagonal')stripe=Math.sin((y/s.height+x*.48)*Math.PI*5)>-.05;
 if(s.pattern==='line')stripe=Math.abs(y/s.height-.05)<.16;
 if(stripe)c.lerp(dark,s.pattern==='line'?.9:.95);
 if(s.pattern==='blue'&&y<-.08)c.lerp(new T.Color('#6a9cda'),.26);
 if(!stripe&&y<-.02)c.lerp(new T.Color('#e1ddbd'),s.pattern==='blue'?.04:.3);
 if(!stripe&&y>.07)c.multiplyScalar(.83);
 return c;
}
export function coastalFishGeometry(id){
 const s=FISH_SPECIES.find(f=>f.id===id);if(!s)throw Error('Unknown fish '+id);const out=new Shape(),rings=[],steps=30,sides=12;
 for(let i=0;i<=steps;i++){const x=-.48+i*.99/steps,shape=Math.max(.06,profile(id,x)),ring=[];for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;ring.push([x,Math.sin(a)*s.height*shape,Math.cos(a)*s.thickness*shape]);}rings.push(ring);}
 for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const k=(j+1)%sides,a=rings[i][j],b=rings[i+1][j],c=rings[i][k],d=rings[i+1][k];for(const tri of[[a,b,c],[b,d,c]]){const x=tri.reduce((v,p)=>v+p[0],0)/3,y=tri.reduce((v,p)=>v+p[1],0)/3;out.tri(...tri,bodyColor(s,x,y),1);}}
 const fin=new T.Color(id==='blue'?'#e5bd49':id==='wrasse'?'#b98939':s.color).multiplyScalar(.86);
 const polygon=(points,c)=>{for(let i=1;i<points.length-1;i++)out.tri(points[0],points[i],points[i+1],c);};
 const tailY=id==='stripey'?.19:id==='wrasse'?.13:.23;
 polygon([[-.43,0,0],[-.72,tailY,.005],[-.65,s.tail==='fork'?0:tailY*.35,0],[-.72,-tailY,-.005]],fin);
 if(s.tail==='round')polygon([[-.43,0,0],[-.72,-tailY,0],[-.76,0,.015],[-.72,tailY,0]],fin);
 const h=s.height;
 polygon([[.31,h*.67,0],[.19,h*1.22,.015],[-.25,h*1.08,0],[-.45,h*.17,0]],fin);
 polygon([[.01,-h*.92,0],[-.13,-h*1.23,.012],[-.40,-h*.28,0]],fin.clone().multiplyScalar(.92));
 for(const sign of[-1,1]){
  polygon([[.16,-.025,sign*s.thickness*.8],[-.11,-.13,sign*(s.thickness+.13)],[-.035,.055,sign*(s.thickness+.06)]],fin);
  const eye=V(.32,h*.22,sign*(s.thickness*.71+.014)),scale=id==='wrasse'?.031:.044;
  out.append(new T.IcosahedronGeometry(scale,1),new T.Matrix4().compose(eye,new T.Quaternion(),V(1,1,.48)),new T.Color('#e9e0c2'));
  out.append(new T.IcosahedronGeometry(scale*.55,1),new T.Matrix4().compose(eye.clone().add(V(.008,0,sign*.018)),new T.Quaternion(),V(1,1,.35)),new T.Color('#182b2b'));
  out.append(new T.OctahedronGeometry(scale*.17),new T.Matrix4().makeTranslation(eye.x+.014,eye.y+.011,eye.z+sign*.029),new T.Color('#fff9dc'));
 }
 const g=out.finish(s.name);g.userData.features={pattern:s.pattern,bodyHeight:h,bodyThickness:s.thickness,tail:s.tail};return g;
}
export function seaFanGeometry(){
 const s=new Shape(),red=new T.Color('#b65d50'),tips=new T.Color('#dfb595');
 s.segment(V(0,0,0),V(.02,.23,0),.052,.037,red);
 function branch(a,angle,length,depth,phase){const b=a.clone().add(V(Math.sin(angle)*length,Math.cos(angle)*length,Math.sin(phase)*.025));s.segment(a,b,.008+depth*.006,.006+depth*.004,red.clone().multiplyScalar(.85+depth*.03));if(depth>0){branch(b,angle-.40,length*.71,depth-1,phase+1.3);branch(b,angle+.44,length*.72,depth-1,phase+2.1);}else{for(const u of[.4,.85]){const p=a.clone().lerp(b,u);s.append(new T.OctahedronGeometry(.019),new T.Matrix4().makeTranslation(p.x,p.y,p.z),tips);}}}
 for(const [a,l]of[[-.68,.36],[-.25,.4],[.25,.38],[.68,.34]])branch(V(.02,.18,0),a,l,3,a*3);
 const g=s.finish('부채뿔산호 형태 모형');g.userData.features={planarFan:true,branching:true,attachedBase:true};return g;
}
