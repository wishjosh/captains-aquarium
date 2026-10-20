import {SPECIES_NAMES,stateFor} from './species.js?v=2026-10-20-anne-bucket-1';
import {defaultExhibition,SLOT_NAMES,slotFor} from './exhibition.js?v=2026-10-20-anne-bucket-1';
import {SAVE_KEY,SAVE_VERSION,emptyProgress,parseSave,hasStarterDecor,writeSave} from './progress.js?v=2026-10-20-anne-bucket-1';

export const BACKUP_KEY=SAVE_KEY+'-before-import';
export const MAX_SAVE_BYTES=65536;
const GAME='captains-aquarium';
const clean=value=>parseSave(JSON.stringify(value));
export function exportSave(progress,now=new Date()){
  return JSON.stringify({game:GAME,format:1,exportedAt:now.toISOString(),progress:clean(progress)},null,2);
}
export function importSave(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SAVE_BYTES)throw new Error('파일은 64KB 이하의 저장 기록이어야 해요.');
  let data;
  try{data=JSON.parse(text);}catch{throw new Error('저장 파일을 읽지 못했어요. JSON 파일을 골라 주세요.');}
  if(data?.game!==undefined||data?.format!==undefined){
    if(data.game!==GAME||data.format!==1)throw new Error('이 게임에서 지원하는 저장 파일이 아니에요.');
    data=data.progress;
  }
  try{return clean(data);}catch{throw new Error('저장 형식이나 임무 순서가 맞지 않아요. 기존 기록은 바꾸지 않았어요.');}
}
export function progressForStage(stage,decorations=[null,null,null]){if(![0,1,2,3,4,11].includes(stage))throw Error('흰동가리 단계를 골라 주세요.');const p={v:7,...emptyProgress(),x:0,z:1};p.bag=stage===1;p.admitted=stage>=2;p.placed=stage>=2&&stage!==11;p.observed=stage>=3&&stage!==11;p.decorated=stage===4;p.decorations=p.observed?[...decorations]:[null,null,null];p.care.fish=p.admitted?2:0;p.discovered.fish=p.bag||p.admitted;p.exhibition=defaultExhibition(p);return clean(p);}
export function commitSave(storage,incoming,current,now=new Date()){
  const next=clean(incoming),session=clean(current),raw=storage.getItem(SAVE_KEY);
  // Save the current session and untouched original before replacing anything.
  storage.setItem(BACKUP_KEY,JSON.stringify({game:GAME,format:1,savedAt:now.toISOString(),progress:session,original:raw}));
  writeSave(storage,next);
  return next;
}
export function readBackup(storage){
  const data=JSON.parse(storage.getItem(BACKUP_KEY));
  if(data?.game!==GAME||data.format!==1)throw new Error('불러올 교체 전 기록이 없어요.');
  return clean(data.progress);
}
export function describeProgress(p){return Object.entries(SPECIES_NAMES).map(([k,name])=>{const at=slotFor(p,k),s=stateFor(p,k);return name+': '+(at?SLOT_NAMES[at]+' 수조 전시 중':s.admitted?'관리동 보관':s.bag?'운반 중':'미수집')+' · 첫 돌봄 '+p.care[k]+'/2';}).join('\n')+(p.legacyProgress?'\n이전 생물 기록은 별도 보존되어 함께 내보내집니다.':'');}
