import * as T from './runtime/vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
class Shape {
 constructor(){this.p=[];this.c=[];}
 triangle(a,b,c,tint=1){for(const p of[a,b,c]){this.p.push(...p.toArray());this.c.push(tint,tint,tint);}}
 append(geometry,matrix=new T.Matrix4(),tint=1){const g=geometry.index?geometry.toNonIndexed():geometry,a=g.attributes.position;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i).applyMatrix4(matrix);this.p.push(...p.toArray());this.c.push(tint,tint,tint);}if(g!==geometry)g.dispose();geometry.dispose();}
 segment(a,b,r0,r1,tint=1,sides=5){const d=b.clone().sub(a),m=new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(V(0,1,0),d.clone().normalize()),V(1,1,1));this.append(new T.CylinderGeometry(r1,r0,d.length(),sides,1),m,tint);}
 blade(a,b,width,{bend=.1,twist=0,tint=1,steps=5,arch=0}={}){const side=V(Math.cos(twist),0,Math.sin(twist)),rings=[];for(let i=0;i<=steps;i++){const u=i/steps,p=a.clone().lerp(b,u);p.z+=Math.sin(u*Math.PI)*bend;p.y+=Math.sin(u*Math.PI)*arch;const w=Math.pow(Math.sin(u*Math.PI),.7)*width+.003;const ridge=p.clone().add(V(0,.015*Math.sin(u*Math.PI),0));rings.push([p.clone().addScaledVector(side,-w),ridge,p.clone().addScaledVector(side,w)]);}for(let i=0;i<steps;i++){const a=rings[i],b=rings[i+1];this.triangle(a[0],b[0],a[1],tint*.82);this.triangle(a[1],b[0],b[1],tint*.82);this.triangle(a[1],b[1],a[2],tint);this.triangle(a[2],b[1],b[2],tint);}}
 finish(name,features){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.35;g.userData={name,features,triangles:this.p.length/9};return g;}
}
function roots(s){for(let n=0;n<4;n++){const a=n*Math.PI/2;s.segment(V(0,.045,0),V(Math.cos(a)*.13,.005,Math.sin(a)*.13),.035,.012,.65,4);}}
export function eckloniaGeometry(variant=0){
 const s=new Shape();roots(s);s.segment(V(0,.025,0),V(.025,.76,.025),.028,.022,.65,5);
 s.blade(V(.025,.7,.025),V(.08,1.69,.15),.115,{bend:.1,twist:.08,tint:.9,steps:5});
 for(let i=0;i<4;i++)for(const sign of[-1,1]){const y=.8+i*.16,spread=.53-i*.055+(variant?sign*.025:0),a=V(.025,y,.035),b=V(sign*spread,y+.07-i*.025,.13+Math.sin(i+variant)*.08);s.blade(a,b,.07-i*.007,{bend:sign*.055,twist:Math.PI/2+sign*.14,tint:.82+i*.055,steps:4,arch:.12});}
 return s.finish('감태 형태 모형',{holdfast:true,stipe:true,centralBlade:true,lateralBlades:8,style:'faceted interpretation'});
}
export function sargassumGeometry(variant=0){
 const s=new Shape();roots(s);s.segment(V(0,.01,0),V(.015,.91,.03),.022,.007,.66,4);
 for(let branch=0;branch<3;branch++){const angle=branch*2.4+variant*.7,dir=V(Math.cos(angle),0,Math.sin(angle)),a=V(0,.22+branch*.1,0),b=a.clone().addScaledVector(dir,.33).add(V(0,.66-branch*.05,0));s.segment(a,b,.014,.004,.76,4);
  for(let j=0;j<5;j++){const u=.17+j*.15,p=a.clone().lerp(b,u),sign=j%2?1:-1,side=V(-dir.z,0,dir.x),tip=p.clone().addScaledVector(side,sign*(.17+j*.009)).addScaledVector(dir,.06).add(V(0,.09,0));s.blade(p,tip,.036,{twist:angle,bend:.015,tint:.79+j*.04,steps:2});
   if(j===1||j===3){const center=p.clone().addScaledVector(dir,.052).add(V(0,.026,0));s.append(new T.OctahedronGeometry(.033,0),new T.Matrix4().compose(center,new T.Quaternion(),V(.85,1.25,.85)),1.08);}
  }
 }
 return s.finish('모자반류 형태 모형',{branches:3,leaves:15,gasVesicles:6,style:'faceted interpretation'});
}
export function urchinGeometry(){
 const s=new Shape();s.append(new T.IcosahedronGeometry(.12,1),new T.Matrix4().makeScale(1,.67,1),.7);
 for(let i=0;i<38;i++){const y=.1+.88*(i+.5)/38,angle=i*2.39996,r=Math.sqrt(1-y*y),dir=V(Math.cos(angle)*r,y,Math.sin(angle)*r),a=dir.clone().multiplyScalar(.1),b=dir.clone().multiplyScalar(.2+.026*Math.sin(i*3.1));a.y*=.75;b.y*=.8;s.segment(a,b,.011,.001,.83+.15*(i%3)/2,4);}
 const g=s.finish('보라성게 형태 모형',{spines:38,domedTest:true,style:'faceted interpretation'});g.translate(0,.07,0);g.computeBoundingBox();return g;
}
