import * as T from './vendor/three.module.js';
import {skinGeometry,skinFins} from './stripey-geometry.js';
// Own simplified Chromis notata surface; only the CC0 source skeleton is reused.
// Morphology reference: https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE09549426
const sections=[[-.022,-.0015,.0015,.0005],[-.019,-.004,.004,.0021],[-.015,-.007,.007,.0036],[-.010,-.009,.009,.0041],[-.004,-.009,.009,.004],[.003,-.0075,.0075,.0032],[.009,-.004,.004,.0018],[.014,-.0016,.0016,.0007]];
function body(){const p=[],idx=[],rings=32,sides=20;for(let i=0;i<=rings;i++){const y=T.MathUtils.lerp(sections[0][0],sections.at(-1)[0],i/rings);let k=0;while(k<sections.length-2&&sections[k+1][0]<y)k++;const a=sections[k],b=sections[k+1],t=(y-a[0])/(b[0]-a[0]),lo=T.MathUtils.lerp(a[1],b[1],t),hi=T.MathUtils.lerp(a[2],b[2],t),w=T.MathUtils.lerp(a[3],b[3],t);for(let j=0;j<=sides;j++){const angle=j/sides*Math.PI*2;p.push(Math.sin(angle)*w,y,(lo+hi)/2+Math.cos(angle)*(hi-lo)/2);}}for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,a+1,b,b,a+1,b+1);}for(const [ring,y,reverse]of [[0,-.022,true],[rings,.014,false]]){const center=p.length/3;p.push(0,y,0);for(let j=0;j<sides;j++){const a=ring*(sides+1)+j;idx.push(center,reverse?a+1:a,reverse?a:a+1);}}return skinGeometry(p,idx);}
function paired(factory){const p=[],idx=[];for(const side of [-1,1]){const g=factory(side),base=p.length/3;p.push(...g.attributes.position.array);idx.push(...Array.from(g.index.array,i=>i+base));g.dispose();}return skinGeometry(p,idx);}
export function chromisParts(){
 const fins=skinFins([[[0,-.012,.007],[0,-.009,.012],[0,-.006,.010],[0,-.003,.0125],[0,.003,.011],[0,.009,.006],[0,.011,.003],[0,.003,.006]],[[0,-.003,-.008],[0,.001,-.013],[0,.007,-.009],[0,.011,-.003],[0,.003,-.006]]]);
 const tail=skinFins([[[0,.013,-.0015],[0,.025,-.009],[0,.021,-.002],[0,.019,0],[0,.021,.002],[0,.025,.009],[0,.013,.0015]],...[-1,1].map(s=>[[s*.0039,-.008,-.001],[s*.0065,-.002,-.006],[s*.0045,.001,-.005],[s*.0037,-.006,.0005]]),[[0,-.008,-.008],[0,-.004,-.014],[0,-.001,-.008]]]);
 const spots=skinFins([-1,1].map(s=>[[s*.0042,-.010,.0025],[s*.0042,-.006,.001],[s*.0042,-.008,-.0025]]));
 const tailBands=skinFins([[[0,.014,-.0015],[0,.025,-.009],[0,.023,-.008],[0,.014,0]],[[0,.014,.0015],[0,.025,.009],[0,.023,.008],[0,.014,0]]]);
 const eyes=paired(s=>{const g=new T.SphereGeometry(.0029,20,14);g.scale(.48,1,1);g.translate(s*.00325,-.015,.001);return g;});
 const eyeRims=paired(s=>{const g=new T.TorusGeometry(.003,.00043,8,24);g.rotateY(Math.PI/2);g.translate(s*.00325,-.015,.001);return g;});
 const glints=paired(s=>{const g=new T.SphereGeometry(.00065,12,10);g.scale(.35,1,1);g.translate(s*.0045,-.01565,.00185);return g;});
 return {body:body(),fins,tail,eyes,eyeRims,glints,spots,tailBands};
}
