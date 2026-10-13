import * as T from './vendor/three.module.js';

// Species silhouette: deep compressed body, sloping forehead, spiny dorsal,
// short snout and an only slightly emarginate caudal fin. The source rig is reused.
// Shape reference (viewed, not embedded): https://fishdb.sinica.edu.tw/taxon/381916-fishdb
// https://minna-museum.jp/data/1757 (Hokkaido University Museum specimen).
const sections = [
  [-.0212,-.0048,-.0031,.00045],[-.0195,-.0061,-.0002,.0015],
  [-.0165,-.0079,.0036,.0030],[-.012,-.0095,.0090,.0041],
  [-.008,-.0102,.0111,.0044],[-.002,-.0102,.0110,.0041],
  [.004,-.0087,.0096,.0031],[.009,-.0057,.0064,.0020],
  [.013,-.0022,.0025,.0010],[.015,-.0016,.0017,.00065]
];
const joints=[-.016677,-.003306,.003487,.008495,.013310,.017642];
function sample(y){let i=0;while(i<sections.length-2&&sections[i+1][0]<y)i++;const a=sections[i],b=sections[i+1],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);return [T.MathUtils.lerp(a[1],b[1],t),T.MathUtils.lerp(a[2],b[2],t),T.MathUtils.lerp(a[3],b[3],t)];}
function geometry(positions,indices){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
 const skin=[],weights=[];
 for(let k=0;k<positions.length;k+=3){const y=positions[k+1];let i=0;while(i<joints.length-2&&y>joints[i+1])i++;const t=T.MathUtils.clamp((y-joints[i])/(joints[i+1]-joints[i]),0,1);skin.push(i,i+1,0,0);weights.push(1-t,t,0,0);}
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skin,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.computeVertexNormals();g.computeBoundingBox();return g;
}
function body(){const p=[],idx=[],rings=36,sides=24;for(let i=0;i<=rings;i++){const y=T.MathUtils.lerp(sections[0][0],sections.at(-1)[0],i/rings),[bottom,top,width]=sample(y);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;p.push(Math.sin(a)*width,y,(top+bottom)/2+Math.cos(a)*(top-bottom)/2);}}for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,a+1,b,b,a+1,b+1);}const front=p.length/3;p.push(0,sections[0][0],-.004);const back=p.length/3;p.push(0,sections.at(-1)[0],0);for(let j=0;j<sides;j++){idx.push(front,j+1,j);const a=rings*(sides+1)+j;idx.push(back,a,a+1);}return geometry(p,idx);}
function fins(polygons){const p=[],idx=[];for(const polygon of polygons){const base=p.length/3;for(const v of polygon)p.push(...v);const contour=polygon.map(v=>new T.Vector2(v[1],v[2]));for(const tri of T.ShapeUtils.triangulateShape(contour,[]))idx.push(...tri.map(i=>i+base));}return geometry(p,idx);}
// Larger, protruding dark eyes and a golden rim keep the Cute Fish visual language.
const eyeY=-.0158,eyeZ=-.0010,eyeX=.00365;
function eyes(){const p=[],idx=[];for(const side of [-1,1]){const sphere=new T.SphereGeometry(.0029,20,14);sphere.scale(.48,1,1);sphere.translate(side*eyeX,eyeY,eyeZ);const start=p.length/3;p.push(...sphere.attributes.position.array);idx.push(...Array.from(sphere.index.array,i=>i+start));sphere.dispose();}return geometry(p,idx);}
function eyeRims(){const p=[],idx=[];for(const side of [-1,1]){const ring=new T.TorusGeometry(.00302,.00048,8,24);ring.rotateY(Math.PI/2);ring.translate(side*eyeX,eyeY,eyeZ);const start=p.length/3;p.push(...ring.attributes.position.array);idx.push(...Array.from(ring.index.array,i=>i+start));ring.dispose();}return geometry(p,idx);}
function details(){const p=[],idx=[];
 for(const side of [-1,1]){const sphere=new T.SphereGeometry(.00065,12,10);sphere.scale(.35,1,1);sphere.translate(side*.00492,eyeY-.00065,eyeZ+.00085);const start=p.length/3;p.push(...sphere.attributes.position.array);idx.push(...Array.from(sphere.index.array,i=>i+start));sphere.dispose();}
 return geometry(p,idx);
}
function finAccents(){const p=[],idx=[];
 // A few broad golden rays add volume cues without changing the fin silhouette.
 for(const side of [-1,1])for(const endZ of [-.0048,0,.0048]){
  const base=p.length/3,x=side*.00006;
  p.push(x,.0165,-.00022,x,.0165,.00022,x,.0247,endZ+.00016,x,.0247,endZ-.00016);
  idx.push(base,base+1,base+2,base,base+2,base+3);
 }
 return geometry(p,idx);
}
export function stripeyParts(){
 const dorsal=[ [0,-.013,.007], [0,-.011,.0138], [0,-.010,.0100], [0,-.0088,.0165], [0,-.0074,.0111], [0,-.0052,.0170], [0,-.0042,.0111], [0,-.0018,.0163], [0,-.0008,.0108], [0,.0017,.0150], [0,.0025,.0101], [0,.0048,.0136], [0,.0053,.0092], [0,.0074,.0116], [0,.008,.0080], [0,.010,.0090], [0,.0118,.0065], [0,.0105,.0048], [0,.006,.0065], [0,0,.0092], [0,-.008,.0095] ];
 const anal=[[0,-.002,-.0086],[0,.0002,-.0130],[0,.001,-.0090],[0,.0035,-.0133],[0,.0068,-.0130],[0,.010,-.0100],[0,.012,-.0060],[0,.010,-.0044],[0,.006,-.0068]];
 const tail=[[0,.0137,-.0018],[0,.0178,-.0040],[0,.0258,-.0070],[0,.0250,-.0035],[0,.0245,0],[0,.0250,.0035],[0,.0258,.0070],[0,.018,.0042],[0,.0137,.0018]];
 const pelvic=[[0,-.008,-.0095],[0,-.0055,-.0146],[0,-.0029,-.0100]];
 const bodyG=body(),finG=fins([dorsal,anal]),tailG=fins([tail,pelvic]);
 // Add paired pectoral fins with a slight thickness away from the body.
 for(const side of [-1,1]){const f=geometry([side*.0037,-.010,-.0035, side*.0060,-.0048,-.0073, side*.0047,-.0022,-.0064, side*.0036,-.0072,-.0024],[0,1,2,0,2,3]);
 const old=tailG,offset=old.attributes.position.count;
 const positions=[...old.attributes.position.array,...f.attributes.position.array],indices=[...old.index.array,...Array.from(f.index.array,i=>i+offset)];
 const replacement=geometry(positions,indices);old.dispose();f.dispose();
 // Keep a single owned geometry for the pale fins.
 tailG.copy(replacement);replacement.dispose();}
 return {body:bodyG,fins:finG,tail:tailG,eyes:eyes(),eyeRims:eyeRims(),glints:details(),finAccents:finAccents()};
}

export {geometry as skinGeometry,fins as skinFins};
