import {SPECIES,SPECIES_INFO,stateFor} from './species.js?v=2026-10-18-underwater-four-fish-1';
export {SPECIES,stateFor};
export const SLOT_IDS=['fish','chromis','jelly'];
export const SLOT_NAMES={fish:'1번',chromis:'2번',jelly:'3번'};
export const SHAPES={rectangle:'벽면형',cylinder:'기둥형'};
export const defaultExhibition=p=>Object.fromEntries(SLOT_IDS.map(id=>[id,{shape:id==='jelly'?'cylinder':'rectangle',kind:p&&id==='fish'&&stateFor(p,'fish').placed?id:null}]));
export const slotFor=(p,kind)=>SLOT_IDS.find(id=>p.exhibition[id].kind===kind)||null;
export const placementTarget=(p,kind)=>slotFor(p,kind)||(p.exhibition[SPECIES_INFO[kind].holdingSlot].kind===null?SPECIES_INFO[kind].holdingSlot:SLOT_IDS.find(id=>!p.exhibition[id].kind));
export function validExhibition(p,exhibition){
 if(!exhibition||Object.keys(exhibition).length!==3)return false;
 const used=new Set();
 for(const id of SLOT_IDS){
  const s=exhibition[id];
  if(!s||!Object.hasOwn(SHAPES,s.shape)||!(s.kind===null||SPECIES.includes(s.kind)))return false;
  if(s.kind!==null){if(used.has(s.kind)||!stateFor(p,s.kind).admitted)return false;used.add(s.kind);}
 }
 return SPECIES.every(k=>stateFor(p,k).placed===used.has(k));
}
export function editExhibition(p,id,choice){
 if(!SLOT_IDS.includes(id)||!choice||!Object.hasOwn(SHAPES,choice.shape)||!(choice.kind===null||SPECIES.includes(choice.kind)))throw Error('수조와 친구를 다시 골라 주세요.');
 if(choice.kind!==null){
  if(!stateFor(p,choice.kind).admitted)throw Error('관리동 입수를 먼저 마쳐 주세요.');
  const existing=slotFor(p,choice.kind);
  if(existing&&existing!==id)throw Error('다른 자리에 전시 중이에요. 먼저 관리동으로 돌려보내 주세요.');
 }
 const next=structuredClone(p);next.exhibition[id]={shape:choice.shape,kind:choice.kind};
 for(const k of SPECIES)stateFor(next,k).placed=!!slotFor(next,k);
 if(!validExhibition(next,next.exhibition))throw Error('전시 배치를 확인해 주세요.');
 return next;
}
