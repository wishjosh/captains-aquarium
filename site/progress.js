import {START} from './layout.js';
export const SAVE_KEY='seojin-jeju-aquarium-v1';
export const MIGRATION_KEY=SAVE_KEY+'-before-layout-v4';
export const SAVE_VERSION=4;
export const DECOR_KINDS=['rock','seaweed'];
export const emptyDecorations=()=>[null,null,null];
const emptySpecies=()=>({bag:false,admitted:false,placed:false,observed:false});
export const emptyProgress=()=>({...emptySpecies(),decorated:false,decorations:emptyDecorations(),chromis:emptySpecies(),jelly:emptySpecies()});
export const hasStarterDecor=items=>DECOR_KINDS.every(kind=>items.includes(kind));
const validSpecies=(s,v)=>s&&['bag','placed','observed'].every(k=>typeof s[k]==='boolean')&&!(s.bag&&s.placed)&&!(s.observed&&!s.placed)&&(v<4||typeof s.admitted==='boolean'&&!(s.bag&&s.admitted)&&!(s.placed&&!s.admitted));
const species=(s,v)=>({bag:s.bag,admitted:v>=4?s.admitted:s.placed,placed:s.placed,observed:s.observed});
export function parseSave(raw){
 const d=JSON.parse(raw);
 if(!d||![1,2,3,4].includes(d.v)||!validSpecies(d,d.v)||!Number.isFinite(d.x)||!Number.isFinite(d.z))throw new Error('Invalid progress');
 if(d.v>=2&&(typeof d.decorated!=='boolean'||!Array.isArray(d.decorations)||d.decorations.length!==3||!d.decorations.every(k=>k===null||DECOR_KINDS.includes(k))||(d.decorated&&!d.observed)||(!d.placed&&d.decorations.some(Boolean))))throw new Error('Invalid decorations');
 const p={...emptyProgress(),...species(d,d.v),v:SAVE_VERSION,decorated:d.v>=2?d.decorated:false,decorations:d.v>=2?[...d.decorations]:emptyDecorations(),...(d.v<4?START:{x:d.x,z:d.z})};
 if(d.v>=3){
  if(!validSpecies(d.chromis,d.v)||!validSpecies(d.jelly,d.v))throw new Error('Invalid collection');
  for(const k of ['chromis','jelly'])p[k]=species(d[k],d.v);
  if((Object.values(p.chromis).some(Boolean)&&!p.decorated)||(Object.values(p.jelly).some(Boolean)&&!p.chromis.observed)||[p.bag,p.chromis.bag,p.jelly.bag].filter(Boolean).length>1)throw new Error('Invalid mission order');
 }
 return p;
}
export function writeSave(storage,progress){
 const next=parseSave(JSON.stringify(progress)),raw=storage.getItem(SAVE_KEY);
 if(raw){
  let version;try{version=JSON.parse(raw)?.v;}catch{}
  if(version!==SAVE_VERSION&&!storage.getItem(MIGRATION_KEY))storage.setItem(MIGRATION_KEY,raw);
 }
 storage.setItem(SAVE_KEY,JSON.stringify(next));
 return next;
}
export function missionFor(p){
 if(!p.decorated){
  const step=p.observed?4:p.placed?3:p.admitted?2:p.bag?1:0;
  return {chapter:1,step,total:5,target:step===0?'sea':step===1?'management':'fish',destination:step===0?'바다 탐사':step===1?'관리동 입수':'전시관 · 범돔',
   title:['바다에서 범돔을 만나자!','범돔을 관리동으로 데려가자!','범돔을 전시관에 배치하자!','우리 범돔을 관찰하자!','범돔의 집을 꾸며 보자!'][step],
   detail:['아래쪽 항구에서 범돔을 만나 보세요.','광장 왼쪽 관리동의 입수대에서 친구를 등록해요.','위쪽 전시관 입구로 들어가 1번 수조에 배치해요.','전시관의 범돔 수조를 가까이에서 눌러 보세요.','제주 돌과 바다풀을 골라 놓아 주세요.'][step]};
 }
 for(const [k,name,chapter,target,detail]of [['chromis','자리돔',2,'chromis-sea','항구 왼쪽 모래길을 따라 바위 해안으로 가요.'],['jelly','해파리',3,'jelly-sea','항구 오른쪽 모래길 끝의 잔잔한 바다로 가요.']]){
  const object=name+(k==='chromis'?'을':'를'),s=p[k];
  if(!s.observed){
   const step=s.placed?3:s.admitted?2:s.bag?1:0;
   return {chapter,step,total:4,target:step===0?target:step===1?'management':k,destination:step===0?(k==='chromis'?'왼쪽 바위 해안':'오른쪽 잔잔한 바다'):step===1?'관리동 입수':'전시관 · '+name,
    title:[object+' 만나러 가자!',object+' 관리동으로 데려가자!',object+' 전시관에 배치하자!',name+'의 특징을 찾아보자!'][step],
    detail:[detail,'광장 왼쪽 관리동의 입수대에 데려가요.','전시관의 이름이 같은 수조에서 배치해요.',k==='chromis'?'가슴 쪽 검은 무늬와 갈라진 꼬리를 찾아요.':'둥근 우산이 오므라들었다 펴지는 모습을 봐요.'][step]};
  }
 }
 return {chapter:3,step:4,total:4,target:null,destination:'',title:'제주 바다 친구 3종 완성!',detail:'범돔, 자리돔, 해파리가 모두 새집에 왔어요.'};
}
export function savedDecorations(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?parseSave(raw).decorations:emptyDecorations();}catch{return emptyDecorations();}}
