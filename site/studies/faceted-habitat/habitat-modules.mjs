import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function basis(t){const n=V(0,0,1).cross(t);if(n.length()<.001)n.set(1,0,0);n.normalize();return[n,V().crossVectors(t,n).normalize()];}
function tube(out,curve,r0,r1,steps=4,sides=5,tint=1){const start=out.p.length/3;for(let j=0;j<=steps;j++){const u=j/steps,p=curve.getPoint(u),[a,b]=basis(curve.getTangent(u)),r=T.MathUtils.lerp(r0,r1,u)*(1+.12*Math.sin(u*Math.PI)),shade=.74+.26*u;for(let k=0;k<sides;k++){const angle=k/sides*Math.PI*2,q=p.clone().addScaledVector(a,Math.cos(angle)*r).addScaledVector(b,Math.sin(angle)*r);out.p.push(...q.toArray());out.c.push(shade*tint,shade*tint,shade*tint);if(j<steps){const A=start+j*sides+k,B=start+j*sides+(k+1)%sides;out.i.push(A,B,A+sides,B,B+sides,A+sides);}}}for(const end of [0,steps]){const at=out.p.length/3;out.p.push(...curve.getPoint(end/steps).toArray());out.c.push(1,1,1);for(let k=0;k<sides;k++){const a=start+end*sides+k,b=start+end*sides+(k+1)%sides;out.i.push(...(end?[at,a,b]:[at,b,a]));}}}
function geometry(o){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(o.p,3));g.setAttribute('color',new T.Float32BufferAttribute(o.c,3));g.setIndex(o.i);g=g.toNonIndexed();g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.boundingSphere.radius+=.06;return g;}
const forms=[[[ -.42,.63,.04],[.33,.76,.23],[-.12,.96,-.19],[.44,.57,-.21],[-.26,.72,.35]],[[ -.24,.81,.18],[.24,1.03,.1],[-.1,1.20,-.12],[.3,.74,-.23],[-.30,.63,-.26]],[[ -.52,.55,.12],[.34,.60,.29],[-.2,.79,-.2],[.58,.53,-.19],[-.28,.56,.38]]];
export function coralGeometry(form=0){
 const o={p:[],c:[],i:[]},root=new T.QuadraticBezierCurve3(V(0,-.08,0),V(-.015,.08,.02),V(.025,.23,.01));tube(o,root,.15,.11,3,6);
 for(let k=0;k<5;k++){
  const raw=forms[form%3][k],end=V(raw[0]*.92,raw[1]*.76,raw[2]*.92),start=root.getPoint(.16+k*.15),mid=start.clone().lerp(end,.5);mid.y+=.04;
  const arm=new T.QuadraticBezierCurve3(start,mid,end);tube(o,arm,.115-k*.006,.065-k*.002,5,6);
  for(let j=0;j<2;j++){const u=.52+j*.23,s=arm.getPoint(u),angle=k*2.31+j*2.6+form*.6,dir=V(Math.cos(angle)*.8,.5,Math.sin(angle)*.8).normalize(),len=.15-.025*j,e=s.clone().addScaledVector(dir,len),m=s.clone().lerp(e,.5);m.y+=.025;tube(o,new T.QuadraticBezierCurve3(s,m,e),.078-j*.008,.047,3,6);}
 }
 const g=geometry(o);g.userData={form,kind:'faceted soft-coral study',branches:16};return g;
}
export function anemoneGeometry({rootY=(x,z)=>-.18}={}){
 const o={p:[],c:[],i:[]};
 for(let n=0;n<44;n++){
  const angle=n*2.399963,r=.46*Math.sqrt((n+.5)/44)*(1+.1*Math.sin(n*4.1)),height=.43+.32*(.5+.5*Math.sin(n*8.7)),side=V(Math.cos(angle),0,Math.sin(angle));
  const start=V(side.x*r*.70,rootY(side.x*r*.70,side.z*r),side.z*r),crown=-.18+Math.sin(n*1.7)*.025,end=V(start.x+side.x*(.20+r*.17)+.055*Math.sin(n*2.7),crown+height*.8,start.z+side.z*(.20+r*.18)),mid=V(start.x+side.x*.31,crown+height*.96,start.z+side.z*.31+.055*Math.cos(n)),bend=V(start.x+side.x*.14,crown+height*.40,start.z+side.z*.14);
  tube(o,new T.CubicBezierCurve3(start,bend,mid,end),.034,.014,5,5,.95);
 }
 const g=geometry(o),p=g.attributes.position,weights=[];for(let i=0;i<p.count;i++)weights.push(Math.pow(Math.max(0,p.getY(i)+.18)/.7,2));g.setAttribute('swayWeight',new T.Float32BufferAttribute(weights,1));g.userData={tentacles:44,kind:'rooted anemone without a base or contact disk'};return g;
}
export function swayMaterial({color='#ffffff',time,anemone=false}={}){const m=new T.MeshStandardMaterial({color,vertexColors:true,roughness:.9,metalness:0});m.onBeforeCompile=s=>{s.uniforms.habitatTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float habitatTime;'+(anemone?'\nattribute float swayWeight;':''));s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat amount='+(anemone?'swayWeight':'pow(max(position.y-.12,0.0),2.0)')+';transformed.x+=amount*.025*sin(habitatTime*.65+position.y);transformed.z+=amount*.016*cos(habitatTime*.48);');};m.customProgramCacheKey=()=>anemone?'faceted-anemone-sway-1':'faceted-soft-coral-sway-1';return m;}
