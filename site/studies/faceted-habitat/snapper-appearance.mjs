import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
// Original RedSnapper local axes: X lateral, +Y tail, +Z back.
// Eye treatment follows the existing fish's white/pupil/highlight style, with an adapted gaze axis.
export function colourSnapper(model,{finDetail=false}={}){
 const materials=[];
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const eye=mesh.name==='RedSnapper_2',fin=mesh.name==='RedSnapper_1'||mesh.name.startsWith('Chromis ');
  const m=new T.MeshStandardMaterial({color:fin?'#aaa58e':'#ffffff',roughness:eye?.28:fin?.76:.68,metalness:0,side:T.DoubleSide,flatShading:!eye});
  m.name=eye?'Chromis expressive eyes':fin?'Chromis fins':'Chromis body';
  if(!fin){
   let ep;
   if(eye){const boxes=[new T.Box3(),new T.Box3()],p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);boxes[v.x<0?0:1].expandByPoint(v);}ep=boxes.map(b=>({c:b.getCenter(new T.Vector3()),r:b.getSize(new T.Vector3()).multiplyScalar(.5)}));}
   m.customProgramCacheKey=()=>eye?'snapper-eye-v1':'snapper-body-v1';
   m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFishRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFishRest=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFishRest;');
    let paint;
    if(eye){
     for(let i=0;i<2;i++){shader.uniforms['eyeC'+i]={value:ep[i].c};shader.uniforms['eyeR'+i]={value:ep[i].r};}
     shader.fragmentShader=shader.fragmentShader.replace('varying vec3 vFishRest;','varying vec3 vFishRest; uniform vec3 eyeC0,eyeC1,eyeR0,eyeR1;');
     paint=`float side=vFishRest.x<0.0?-1.0:1.0;vec3 ec=side<0.0?eyeC0:eyeC1;vec3 er=side<0.0?eyeR0:eyeR1;vec3 sd=normalize((vFishRest-ec)/er);vec3 gaze=normalize(vec3(side*1.4,-1.0,.10));float pupil=smoothstep(cos(.94)-.015,cos(.94)+.015,dot(sd,gaze));float glint=smoothstep(cos(.105),cos(.080),dot(sd,normalize(gaze+vec3(0.0,-.10,.28))))*pupil;diffuseColor.rgb=mix(vec3(.80,.815,.80),vec3(.006,.009,.008),pupil);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.98),glint);`;
    }else{
     for(const [name,hex]of Object.entries({back:'#696653',flank:'#999383',belly:'#d2cbb0',spot:'#343a32'}))shader.uniforms[name]={value:new T.Color(hex)};
     shader.fragmentShader=shader.fragmentShader.replace('varying vec3 vFishRest;','varying vec3 vFishRest; uniform vec3 back,flank,belly,spot;');
     paint=`vec3 body=mix(belly,flank,smoothstep(-.010,-.002,vFishRest.z));body=mix(body,back,smoothstep(.001,.010,vFishRest.z));vec2 q=(vFishRest.yz-vec2(-.004,-.0015))/vec2(.0026,.003);float spotMask=(1.0-smoothstep(.45,1.0,length(q)))*smoothstep(.006,.009,abs(vFishRest.x));diffuseColor.rgb=mix(body,spot,spotMask*.9);`;
    }
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+paint);
   };
  }
  if(fin && finDetail){
   const tailAndDorsal=mesh.name==='RedSnapper_1';
   const pelvic=mesh.name.startsWith('Chromis pelvic');
   m.customProgramCacheKey=()=>tailAndDorsal?'chromis-dorsal-tail':pelvic?'chromis-pelvic':'chromis-anal';
   m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 finRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nfinRest=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 finRest;');
    const coordinates=tailAndDorsal?`
     float reach=clamp((finRest.z-.007)/.014,0.0,1.0);
     float ray=(finRest.y-reach*.003)*460.0;
     if(finRest.y>.020){
      vec2 fan=vec2(max(finRest.y-.020,.0001),finRest.z);
      reach=clamp(length(fan)/.018,0.0,1.0);
      ray=atan(fan.y,fan.x)*4.2;
     }`:`
     float reach=clamp((-${pelvic?'.008':'.006'}-finRest.z)/.008,0.0,1.0);
     float ray=(finRest.y-reach*.003)*${pelvic?'650.0':'440.0'};`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
     #include <color_fragment>
     ${coordinates}
     float rayWave=cos(ray*6.2831853);
     float detail=1.0-smoothstep(.16,.48,fwidth(ray));
     float ribs=smoothstep(.35,.93,rayWave)*detail*smoothstep(.04,.25,reach);
     float membrane=mix(.63,1.16,smoothstep(0.0,.78,reach));
     membrane*=1.0-.12*smoothstep(.82,1.0,reach);
     diffuseColor.rgb*=membrane*(1.0+.34*ribs);
    `);
   };
  }
  mesh.material=m;materials.push(m);
 });return materials;
}
