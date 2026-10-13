import {SAVE_KEY,emptyProgress,parseSave,hasStarterDecor} from './progress.js';

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
export function progressForStage(stage,decorations=[null,null,null]){
  if(!Number.isInteger(stage)||stage<0||stage>10)throw new Error('완료한 임무를 골라 주세요.');
  const p={v:3,...emptyProgress(),x:0,z:1};
  p.bag=stage===1;p.placed=stage>=2;p.observed=stage>=3;p.decorated=stage>=4;
  p.decorations=stage>=3?[...decorations]:[null,null,null];
  if(stage===3&&hasStarterDecor(p.decorations))throw new Error('돌과 바다풀을 모두 놓았다면 범돔 꾸미기 완료를 골라 주세요.');
  p.chromis={bag:stage===5,placed:stage>=6,observed:stage>=7};
  p.jelly={bag:stage===8,placed:stage>=9,observed:stage>=10};
  return clean(p);
}
export function commitSave(storage,incoming,current,now=new Date()){
  const next=clean(incoming),session=clean(current),raw=storage.getItem(SAVE_KEY);
  // Save the current session and untouched original before replacing anything.
  storage.setItem(BACKUP_KEY,JSON.stringify({game:GAME,format:1,savedAt:now.toISOString(),progress:session,original:raw}));
  storage.setItem(SAVE_KEY,JSON.stringify(next));
  return next;
}
export function readBackup(storage){
  const data=JSON.parse(storage.getItem(BACKUP_KEY));
  if(data?.game!==GAME||data.format!==1)throw new Error('불러올 교체 전 기록이 없어요.');
  return clean(data.progress);
}
export function describeProgress(p){
  const lines=[['범돔',p],['자리돔',p.chromis],['해파리',p.jelly]].map(([name,s])=>name+': '+(s.observed?'관찰 완료':s.placed?'수조 입수 완료':s.bag?'운반 중':'미수집'));
  lines.push('범돔 꾸미기: '+(p.decorated?'달성 기록 있음':'아직 완료 전'));
  const names={rock:'제주 돌',seaweed:'바다풀'};
  lines.push('장식 (왼쪽 / 뒤쪽 / 오른쪽): '+p.decorations.map(k=>names[k]||'빈 자리').join(' / '));
  return lines.join('\n');
}
