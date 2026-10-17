import {START} from './layout.js?v=2026-10-17-clownfish-lighting-c-1';
import {defaultExhibition,validExhibition} from './exhibition.js?v=2026-10-17-clownfish-lighting-c-1';
import {parseSave as parseLegacy} from './save-compat-v6.js?v=2026-10-17-clownfish-lighting-c-1';
export {MIGRATION_KEY,EDITOR_MIGRATION_KEY,CAMPUS_BACKUP_KEY,DIVE_BACKUP_KEY} from './save-compat-v6.js?v=2026-10-17-clownfish-lighting-c-1';
export const SAVE_KEY='seojin-jeju-aquarium-v1',SAVE_VERSION=7;
export const ORIGINAL_COLLECTION_KEY=SAVE_KEY+'-before-clownfish-v7';
export const DECOR_KINDS=['rock','seaweed'];
export const emptyDecorations=()=>[null,null,null];
const emptySpecies=()=>({bag:false,admitted:false,placed:false,observed:false});
export const emptyProgress=()=>({...emptySpecies(),catalog:'clownfish-1',decorated:false,decorations:emptyDecorations(),exhibition:defaultExhibition(),care:{fish:0},discovered:{fish:false},legacyProgress:null});
export const hasStarterDecor=items=>DECOR_KINDS.every(kind=>items.includes(kind));
export function parseSave(raw){
 const d=JSON.parse(raw);
 if(d?.v>=1&&d.v<=6){const old=parseLegacy(raw);return {...emptyProgress(),v:7,...START,...(old.location?{location:old.location}:{}),legacyProgress:JSON.parse(raw)};}
 if(!d||d.v!==7||d.catalog!=='clownfish-1'||!['bag','admitted','placed','observed','decorated'].every(k=>typeof d[k]==='boolean')||d.bag&&d.admitted||d.placed&&!d.admitted||d.observed&&!d.admitted||d.decorated&&!d.observed||!Number.isFinite(d.x)||!Number.isFinite(d.z))throw Error('Invalid progress');
 if(!Array.isArray(d.decorations)||d.decorations.length!==3||!d.decorations.every(k=>k===null||DECOR_KINDS.includes(k))||!d.observed&&d.decorations.some(Boolean))throw Error('Invalid decorations');
 if(!Number.isInteger(d.care?.fish)||d.care.fish<0||d.care.fish>2||d.care.fish>0&&!d.admitted||typeof d.discovered?.fish!=='boolean'||(d.bag||d.admitted)&&!d.discovered.fish)throw Error('Invalid care');
 const p={...emptyProgress(),...Object.fromEntries(['bag','admitted','placed','observed','decorated','x','z'].map(k=>[k,d[k]])),v:7,decorations:[...d.decorations],care:{fish:d.care.fish},discovered:{fish:d.discovered.fish},exhibition:structuredClone(d.exhibition)};
 if(!validExhibition(p,p.exhibition))throw Error('Invalid exhibition');
 if(d.legacyProgress!==null&&d.legacyProgress!==undefined){if(![1,2,3,4,5,6].includes(d.legacyProgress.v))throw Error('Invalid previous collection');parseLegacy(JSON.stringify(d.legacyProgress));p.legacyProgress=structuredClone(d.legacyProgress);}
 if(d.location!==undefined){const l=d.location;if(!l||l.map!=='campus-1'||!['harbor','management','exhibition','underwater'].includes(l.area)||!Number.isFinite(l.x)||!Number.isFinite(l.z))throw Error('Invalid location');p.location={map:l.map,area:l.area,x:l.x,z:l.z};}
 return p;
}
export function writeSave(storage,progress){const next=parseSave(JSON.stringify(progress)),raw=storage.getItem(SAVE_KEY);if(raw){let v;try{v=JSON.parse(raw).v;}catch{}if(v<7&&!storage.getItem(ORIGINAL_COLLECTION_KEY))storage.setItem(ORIGINAL_COLLECTION_KEY,raw);}storage.setItem(SAVE_KEY,JSON.stringify(next));return next;}
export const canCollect=(p,k)=>k==='fish';
export function missionFor(p){const step=p.care.fish===2?4:p.admitted?(p.care.fish===1?3:2):p.bag?1:0;return {kind:'fish',chapter:1,step,total:4,target:step===4?null:step===0?'sea':'management',destination:step===0?'부두 · 잠수':'관리동 · 첫 돌봄',title:['흰동가리를 바다에서 찾아보자!','흰동가리와 함께 돌아가자!','흰동가리의 상태를 살펴보자!','흰동가리에게 첫 먹이를 주자!','흰동가리 첫 돌봄 완료!'][step],detail:step===4?'전시관에서 친구를 관찰하고 수조를 꾸며요.':['부두에서 잠수해 움직이는 친구에게 가까이 가요.','귀환 표식으로 돌아와 관리동에 입수해요.','관리동에서 움직임을 살펴봐요.','먹이를 주고 반응을 확인해요.'][step]};}
export function savedDecorations(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?parseSave(raw).decorations:emptyDecorations();}catch{return emptyDecorations();}}
