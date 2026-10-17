import {START} from './layout.js?v=2026-10-17-clownfish-lighting-c-1';
import {defaultExhibition,validExhibition,placementTarget} from './exhibition-v6.js?v=2026-10-17-clownfish-lighting-c-1';
export const SAVE_KEY='seojin-jeju-aquarium-v1';
export const MIGRATION_KEY=SAVE_KEY+'-before-layout-v4';
export const EDITOR_MIGRATION_KEY=SAVE_KEY+'-before-exhibition-v5';
export const SAVE_VERSION=6;
export const CAMPUS_BACKUP_KEY=SAVE_KEY+'-before-campus-1';
export const DIVE_BACKUP_KEY=SAVE_KEY+'-before-dive-v6';
export const DECOR_KINDS=['rock','seaweed'];
export const emptyDecorations=()=>[null,null,null];
const emptySpecies=()=>({bag:false,admitted:false,placed:false,observed:false});
export const emptyProgress=()=>({...emptySpecies(),decorated:false,decorations:emptyDecorations(),chromis:emptySpecies(),jelly:emptySpecies(),exhibition:defaultExhibition(),care:{fish:0,chromis:0,jelly:0},discovered:{fish:false,chromis:false,jelly:false}});
export const hasStarterDecor=items=>DECOR_KINDS.every(kind=>items.includes(kind));
const validSpecies=(s,v)=>s&&['bag','placed','observed'].every(k=>typeof s[k]==='boolean')&&!(s.bag&&s.placed)&&!(s.observed&&!(v>=5?s.admitted:s.placed))&&(v<4||typeof s.admitted==='boolean'&&!(s.bag&&s.admitted)&&!(s.placed&&!s.admitted));
const species=(s,v)=>({bag:s.bag,admitted:v>=4?s.admitted:s.placed,placed:s.placed,observed:s.observed});
export function parseSave(raw){
 const d=JSON.parse(raw);
 if(!d||![1,2,3,4,5,6].includes(d.v)||!validSpecies(d,d.v)||!Number.isFinite(d.x)||!Number.isFinite(d.z))throw new Error('Invalid progress');
 if(d.v>=2&&(typeof d.decorated!=='boolean'||!Array.isArray(d.decorations)||d.decorations.length!==3||!d.decorations.every(k=>k===null||DECOR_KINDS.includes(k))||(d.decorated&&!d.observed)||(!(d.v>=5?d.observed:d.placed)&&d.decorations.some(Boolean))))throw new Error('Invalid decorations');
 const p={...emptyProgress(),...species(d,d.v),v:SAVE_VERSION,decorated:d.v>=2?d.decorated:false,decorations:d.v>=2?[...d.decorations]:emptyDecorations(),...(d.v<4?START:{x:d.x,z:d.z})};
 if(d.v>=3){
  if(!validSpecies(d.chromis,d.v)||!validSpecies(d.jelly,d.v))throw new Error('Invalid collection');
  for(const k of ['chromis','jelly'])p[k]=species(d[k],d.v);
  if((d.v<6&&((Object.values(p.chromis).some(Boolean)&&!p.decorated)||(Object.values(p.jelly).some(Boolean)&&!p.chromis.observed)))||[p.bag,p.chromis.bag,p.jelly.bag].filter(Boolean).length>1)throw new Error('Invalid mission order');
 }
 for(const k of ['fish','chromis','jelly']){
  const state=k==='fish'?p:p[k];
  if(d.v<6){p.care[k]=state.admitted?2:0;p.discovered[k]=state.bag||state.admitted;}
  else {
   if(!Number.isInteger(d.care?.[k])||d.care[k]<0||d.care[k]>2||d.care[k]>0&&!state.admitted||typeof d.discovered?.[k]!=='boolean'||(state.bag||state.admitted)&&!d.discovered[k])throw Error('Invalid dive progress');
   p.care[k]=d.care[k];p.discovered[k]=d.discovered[k];
  }
 }
 if(d.v>=6&&((p.chromis.bag||p.chromis.admitted)&&p.care.fish!==2||(p.jelly.bag||p.jelly.admitted)&&p.care.chromis!==2))throw Error('Invalid care order');
 p.exhibition=d.v>=5?structuredClone(d.exhibition):defaultExhibition(p);
 if(!validExhibition(p,p.exhibition))throw new Error('Invalid exhibition');
 if(d.location!==undefined){const l=d.location;if(!l||l.map!=='campus-1'||!['harbor','management','exhibition','underwater'].includes(l.area)||!Number.isFinite(l.x)||!Number.isFinite(l.z))throw new Error('Invalid campus location');p.location={map:l.map,area:l.area,x:l.x,z:l.z};}
 return p;
}
export function writeSave(storage,progress){
 const next=parseSave(JSON.stringify(progress)),raw=storage.getItem(SAVE_KEY);
 if(raw){
  let oldLocation;try{oldLocation=JSON.parse(raw)?.location;}catch{}
  if(progress.location&&!oldLocation&&!storage.getItem(CAMPUS_BACKUP_KEY))storage.setItem(CAMPUS_BACKUP_KEY,raw);
  let version;try{version=JSON.parse(raw)?.v;}catch{}
  if(version<6&&!storage.getItem(DIVE_BACKUP_KEY))storage.setItem(DIVE_BACKUP_KEY,raw);
  if(version<4&&!storage.getItem(MIGRATION_KEY))storage.setItem(MIGRATION_KEY,raw);
  if(version<5&&!storage.getItem(EDITOR_MIGRATION_KEY))storage.setItem(EDITOR_MIGRATION_KEY,raw);
 }
 storage.setItem(SAVE_KEY,JSON.stringify(next));
 return next;
}
export const canCollect=(p,k)=>k==='fish'||p.care[k==='chromis'?'fish':'chromis']===2;
export function missionFor(p){
 for(const [i,k]of ['fish','chromis','jelly'].entries()){
  const s=k==='fish'?p:p[k],name={fish:'범돔',chromis:'자리돔',jelly:'해파리'}[k];
  if(p.care[k]===2)continue;
  const step=s.admitted?(p.care[k]===1?3:2):s.bag?1:0;
  return {kind:k,chapter:i+1,step,total:4,target:step===0?'sea':'management',destination:step===0?'부두 · 잠수':'관리동 · 첫 돌봄',
   title:[name+(k==='jelly'?'를':'을')+' 바다에서 찾아보자!',name+(k==='jelly'?'와':'과')+' 함께 돌아가자!',name+'의 상태를 살펴보자!',name+'에게 첫 먹이를 주자!'][step],
   detail:['부두에서 잠수해 움직이는 친구에게 가까이 가요.','귀환 표식으로 돌아와 관리동에 입수해요.','관리동 현황에서 친구를 골라 움직임을 살펴봐요.','먹이를 주고 반응을 확인하면 다음 탐사가 열려요.'][step]};
 }
 return {chapter:3,step:4,total:4,target:null,destination:'',title:'바다 친구 3종 돌봄 완료!',detail:'다시 잠수해 관찰하거나 전시관에서 친구들을 소개해요.'};
}
export function savedDecorations(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?parseSave(raw).decorations:emptyDecorations();}catch{return emptyDecorations();}}
