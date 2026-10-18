import {START} from './layout.js?v=2026-10-18-underwater-four-fish-1';
import {defaultExhibition,validExhibition} from './exhibition.js?v=2026-10-18-underwater-four-fish-1';
import {parseSave as parseLegacy} from './save-compat-v6.js?v=2026-10-18-underwater-four-fish-1';
import {SPECIES,NEW_SPECIES,SPECIES_NAMES,stateFor} from './species.js?v=2026-10-18-underwater-four-fish-1';
export {MIGRATION_KEY,EDITOR_MIGRATION_KEY,CAMPUS_BACKUP_KEY,DIVE_BACKUP_KEY} from './save-compat-v6.js?v=2026-10-18-underwater-four-fish-1';
export const SAVE_KEY='seojin-jeju-aquarium-v1',SAVE_VERSION=7;
export const ORIGINAL_COLLECTION_KEY=SAVE_KEY+'-before-clownfish-v7';
export const EXPANDED_COLLECTION_KEY=SAVE_KEY+'-before-jeju-four-fish';
export const DECOR_KINDS=['rock','seaweed'];
export const emptyDecorations=()=>[null,null,null];
const emptySpecies=()=>({bag:false,admitted:false,placed:false,observed:false});
export const emptyProgress=()=>({...emptySpecies(),catalog:'clownfish-1',collection:'jeju-four-1',...Object.fromEntries(NEW_SPECIES.map(k=>[k,emptySpecies()])),decorated:false,decorations:emptyDecorations(),exhibition:defaultExhibition(),care:Object.fromEntries(SPECIES.map(k=>[k,0])),discovered:Object.fromEntries(SPECIES.map(k=>[k,false])),legacyProgress:null});
export const hasStarterDecor=items=>DECOR_KINDS.every(kind=>items.includes(kind));
const validAnimal=s=>s&&['bag','admitted','placed','observed'].every(k=>typeof s[k]==='boolean')&&!(s.bag&&s.admitted)&&!(s.placed&&!s.admitted)&&!(s.observed&&!s.admitted);
export function parseSave(raw){
 const d=JSON.parse(raw);
 if(d?.v>=1&&d.v<=6){const old=parseLegacy(raw);return {...emptyProgress(),v:7,...START,...(old.location?{location:old.location}:{}),legacyProgress:JSON.parse(raw)};}
 if(!d||d.v!==7||d.catalog!=='clownfish-1'||d.collection!==undefined&&d.collection!=='jeju-four-1'||!validAnimal(d)||typeof d.decorated!=='boolean'||d.decorated&&!d.observed||!Number.isFinite(d.x)||!Number.isFinite(d.z))throw Error('Invalid progress');
 if(!Array.isArray(d.decorations)||d.decorations.length!==3||!d.decorations.every(k=>k===null||DECOR_KINDS.includes(k))||!d.observed&&d.decorations.some(Boolean))throw Error('Invalid decorations');
 const p={...emptyProgress(),...Object.fromEntries(['bag','admitted','placed','observed','decorated','x','z'].map(k=>[k,d[k]])),v:7,decorations:[...d.decorations],exhibition:structuredClone(d.exhibition)};
 for(const k of SPECIES){
  if(k!=='fish'){const s=d[k]===undefined?emptySpecies():d[k];if(!validAnimal(s))throw Error('Invalid animal');p[k]=Object.fromEntries(['bag','admitted','placed','observed'].map(f=>[f,s[f]]));}
  const care=k==='fish'?d.care?.[k]:(d.care?.[k]??0),discovered=k==='fish'?d.discovered?.[k]:(d.discovered?.[k]??false),s=stateFor(p,k);
  if(!Number.isInteger(care)||care<0||care>2||care>0&&!s.admitted||typeof discovered!=='boolean'||(s.bag||s.admitted)&&!discovered)throw Error('Invalid care');
  p.care[k]=care;p.discovered[k]=discovered;
 }
 if(SPECIES.filter(k=>stateFor(p,k).bag).length>1)throw Error('Only one animal can be carried');
 if(!validExhibition(p,p.exhibition))throw Error('Invalid exhibition');
 if(d.legacyProgress!==null&&d.legacyProgress!==undefined){if(![1,2,3,4,5,6].includes(d.legacyProgress.v))throw Error('Invalid previous collection');parseLegacy(JSON.stringify(d.legacyProgress));p.legacyProgress=structuredClone(d.legacyProgress);}
 if(d.location!==undefined){const l=d.location;if(!l||l.map!=='campus-1'||!['harbor','management','exhibition','underwater'].includes(l.area)||!Number.isFinite(l.x)||!Number.isFinite(l.z))throw Error('Invalid location');p.location={map:l.map,area:l.area,x:l.x,z:l.z};}
 return p;
}
export function writeSave(storage,progress){
 const next=parseSave(JSON.stringify(progress)),raw=storage.getItem(SAVE_KEY);
 if(raw){let d;try{d=JSON.parse(raw);}catch{}
  if(d?.v<7&&!storage.getItem(ORIGINAL_COLLECTION_KEY))storage.setItem(ORIGINAL_COLLECTION_KEY,raw);
  if(d?.v===7&&d.collection!=='jeju-four-1'&&!storage.getItem(EXPANDED_COLLECTION_KEY))storage.setItem(EXPANDED_COLLECTION_KEY,raw);
 }
 storage.setItem(SAVE_KEY,JSON.stringify(next));return next;
}
export const canCollect=(p,k)=>SPECIES.includes(k);
export function missionFor(p){
 const kind=SPECIES.find(k=>stateFor(p,k).bag)||SPECIES.find(k=>stateFor(p,k).admitted&&p.care[k]<2)||SPECIES.find(k=>!stateFor(p,k).admitted);
 if(!kind)return {kind:null,chapter:4,step:4,total:4,target:null,destination:'자유 탐사와 관찰',title:'네 친구의 첫 돌봄 완료!',detail:'바다를 둘러보고 관리동과 전시관에서 친구를 가까이 관찰해요.'};
 const s=stateFor(p,kind),name=SPECIES_NAMES[kind],obj=name+(kind==='fish'?'를':'을'),step=s.admitted?(p.care[kind]===1?3:2):s.bag?1:0;
 return {kind,chapter:SPECIES.indexOf(kind)+1,step,total:4,target:step===0?'sea':'management',destination:step===0?'부두 · 잠수':'관리동 · 첫 돌봄',title:[obj+' 바다에서 찾아보자!',name+(kind==='fish'?'와':'과')+' 함께 돌아가자!',name+'의 상태를 살펴보자!',name+'에게 첫 먹이를 주자!'][step],detail:['부두에서 잠수해 움직이는 친구에게 가까이 가요.','사다리로 돌아와 관리동에 입수해요.','관리동에서 움직임을 살펴봐요.','먹이를 주고 반응을 확인해요.'][step]};
}
export function savedDecorations(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?parseSave(raw).decorations:emptyDecorations();}catch{return emptyDecorations();}}
