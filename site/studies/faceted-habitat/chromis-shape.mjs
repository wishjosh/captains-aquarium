// Original low-poly interpretation. +Z is the nose; no image textures.
export const CHROMIS={id:'chromis-notata',name:'자리돔',length:.60,source:'https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10001'};
export function chromisShape(){
 const position=[],color=[],parts={};
 const palette={back:[.055,.085,.075],side:[.17,.22,.18],belly:[.37,.39,.29],fin:[.115,.16,.12],eye:[.025,.033,.032],iris:[.77,.74,.56],spot:[.12,.18,.18]};
 const tri=(a,b,c,tint,part)=>{position.push(...a,...b,...c);for(let i=0;i<3;i++)color.push(...tint);parts[part]=(parts[part]||0)+1;};
 const rings=[[.43,.025,.025],[.36,.068,.115],[.24,.094,.207],[.06,.107,.244],[-.12,.094,.218],[-.28,.058,.137],[-.38,.029,.055],[-.43,.024,.043]];
 const point=(r,j)=>{const a=j*Math.PI/5;return[Math.sin(a)*r[1],Math.cos(a)*r[2],r[0]];};
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<10;j++){
  const a=point(rings[k],j),b=point(rings[k+1],j),c=point(rings[k+1],j+1),d=point(rings[k],j+1),y=(a[1]+b[1]+c[1])/3;
  const base=y>.12?palette.back:y<-.11?palette.belly:palette.side,tint=base.map(v=>v*(1+((k*7+j*3)%5-2)*.025));tri(a,b,c,tint,'body');tri(a,c,d,tint,'body');
 }
 for(let j=0;j<10;j++){tri([0,0,.439],point(rings[0],j),point(rings[0],j+1),palette.side,'body');tri([0,0,-.435],point(rings.at(-1),j+1),point(rings.at(-1),j),palette.fin,'body');}
 // Folded, shallow ridges: a continuous dorsal rather than separate sticks.
 const dorsal=[[.29,.17],[.20,.29],[.08,.31],[-.06,.30],[-.20,.25],[-.32,.16],[-.38,.07]];
 for(let j=0;j<dorsal.length-1;j++){const a=dorsal[j],b=dorsal[j+1],base=[0,.09,(a[0]+b[0])*.5];tri(base,[.009,a[1],a[0]],[.009,b[1],b[0]],palette.fin,'dorsal');tri(base,[-.009,b[1],b[0]],[-.009,a[1],a[0]],palette.fin,'dorsal');}
 for(const s of [-1,1]){
  tri([0,0,-.40],[s*.013,.19,-.67],[s*.018,.035,-.57],palette.fin,'tail');tri([0,0,-.40],[s*.018,.035,-.57],[s*.014,-.035,-.57],palette.side,'tail');tri([0,0,-.40],[s*.014,-.035,-.57],[s*.013,-.19,-.67],palette.fin,'tail');
  tri([0,-.13,-.16],[s*.012,-.26,-.30],[0,-.06,-.40],palette.fin,'anal');
  tri([s*.092,-.025,.14],[s*.17,-.09,-.04],[s*.079,-.12,.02],palette.fin,'pectoral');
  // Dark axil at pectoral base, with restrained eyes on both sides.
  tri([s*.100,-.005,.155],[s*.108,-.056,.10],[s*.102,.005,.08],palette.spot,'axil');
  for(const [rad,x,tint,part] of [[.052,.080,palette.iris,'iris'],[.038,.084,palette.eye,'eye']])for(let j=0;j<8;j++){
   const a=j*Math.PI/4,b=(j+1)*Math.PI/4;tri([s*x,.068,.325],[s*x,.068+Math.sin(a)*rad,.325+Math.cos(a)*rad],[s*x,.068+Math.sin(b)*rad,.325+Math.cos(b)*rad],tint,part);
  }
 }
 return{position,color,parts,triangles:position.length/9,length:1.109};
}
export function ledgePoint(t,center){return[center[0]+Math.sin(t*.38)*.52,center[1]+Math.sin(t*.57)*.055,center[2]+Math.cos(t*.38)*.32];}
