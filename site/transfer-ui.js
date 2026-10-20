import {exportSave,importSave,progressForStage,commitSave,readBackup,describeProgress,MAX_SAVE_BYTES,BACKUP_KEY} from './save-transfer.js?v=2026-10-20-jeju-rov-v1';

import {MIGRATION_KEY,EDITOR_MIGRATION_KEY,CAMPUS_BACKUP_KEY,DIVE_BACKUP_KEY,ORIGINAL_COLLECTION_KEY} from './progress.js?v=2026-10-20-jeju-rov-v1';

export function setupTransfer({snapshot,normalise,onCommit,pause,onClose}){
  const $=id=>document.getElementById(id),dialog=$('transfer-dialog'),status=$('transfer-status'),preview=$('transfer-preview'),apply=$('apply-transfer');
  let pending=null,ticket=0;
  const message=text=>{status.textContent=text;};
  function clear(){pending=null;apply.disabled=true;preview.hidden=true;preview.textContent='';}
  function prepare(data,source){
    pending=normalise(data);preview.textContent=(source==='manual'?'직접 선택한 상태를 복원합니다.\n':source==='backup'?'교체 전 기록을 불러옵니다.\n':'저장 파일을 가져옵니다.\n')+describeProgress(pending);
    preview.hidden=false;apply.disabled=false;
    message(source==='manual'?'원본 파일의 정확한 이전이 아닌, 선택한 달성 상태 복원이에요. 내용을 확인해 주세요.':'아직 기존 기록을 바꾸지 않았어요. 내용을 확인해 주세요.');
  }
  function open(){
    pause();$('help-dialog').close();clear();ticket++;$('import-save').value='';
    message('파일을 내보내거나 가져올 수 있어요. 기록은 서버에 보내지 않아요.');
    try{$('export-before-dive').disabled=!localStorage.getItem(DIVE_BACKUP_KEY);$('export-before-campus').disabled=!localStorage.getItem(CAMPUS_BACKUP_KEY);$('export-before-exhibition').disabled=!localStorage.getItem(EDITOR_MIGRATION_KEY);$('restore-backup').disabled=!localStorage.getItem(BACKUP_KEY);$('export-previous-map').disabled=!localStorage.getItem(MIGRATION_KEY);}catch{$('export-before-dive').disabled=true;$('export-before-campus').disabled=true;$('export-before-exhibition').disabled=true;$('restore-backup').disabled=true;$('export-previous-map').disabled=true;}
    dialog.showModal();
  }
  const previous=document.createElement('button');previous.id='export-original-collection';previous.className='secondary';previous.textContent='개편 전 생물 기록 내보내기';dialog.append(previous);previous.onclick=()=>{try{const raw=localStorage.getItem(ORIGINAL_COLLECTION_KEY)||JSON.stringify(snapshot().legacyProgress);if(!raw||raw==='null')throw Error('No previous collection');download(raw,'captains-aquarium-before-clownfish.json');message('개편 전 원본 생물 기록을 내보냈어요.');}catch{message('보관된 이전 생물 기록이 없어요.');}};
  $('open-transfer').addEventListener('click',open);
  $('close-transfer').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{ticket++;clear();onClose();});
  function download(text,name){
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('export-before-dive').addEventListener('click',()=>{try{const raw=localStorage.getItem(DIVE_BACKUP_KEY);if(!raw)throw Error('Missing backup');download(raw,'captains-aquarium-before-dive-v6.json');message('수중 탐사 도입 전 원본 기록을 내보냈어요.');}catch{message('이전 기록을 읽지 못했어요.');}});
  $('export-before-campus').addEventListener('click',()=>{try{const raw=localStorage.getItem(CAMPUS_BACKUP_KEY);if(!raw)throw Error('Missing backup');download(raw,'captains-aquarium-before-campus.json');message('해안 단지 개편 전 원본 기록을 내보냈어요.');}catch{message('이전 기록을 읽지 못했어요.');}});
  $('export-before-exhibition').addEventListener('click',()=>{
try{const raw=localStorage.getItem(EDITOR_MIGRATION_KEY);if(!raw)throw Error('Missing backup');download(raw,'captains-aquarium-before-exhibition-v5.json');message('전시 편집 도입 전 원본 기록 다운로드를 요청했어요.');}catch{message('이전 기록을 읽지 못했어요. 현재 진행은 그대로예요.');}
});
  $('export-previous-map').addEventListener('click',()=>{
    try{const raw=localStorage.getItem(MIGRATION_KEY);if(!raw)throw new Error('Missing backup');
      download(raw,'captains-aquarium-before-layout-v4.json');message('개편 전 원본 기록 다운로드를 요청했어요. 기기의 다운로드 목록에서 확인해 주세요.');
    }catch{message('개편 전 기록을 읽지 못했어요. 현재 진행은 그대로예요.');}
  });
  $('export-save').addEventListener('click',()=>{
    try{
      download(exportSave(snapshot()),'captains-aquarium-save-'+new Date().toISOString().slice(0,10)+'.json');
      message('저장 파일 다운로드를 요청했어요. 기기의 다운로드 목록에서 확인해 주세요.');
    }catch{message('저장 파일을 만들지 못했어요. 현재 진행은 그대로예요.');}
  });
  $('import-save').addEventListener('change',async event=>{
    const request=++ticket;clear();const file=event.target.files?.[0];if(!file)return;
    if(file.size>MAX_SAVE_BYTES){message('파일이 너무 커요. 64KB 이하의 저장 파일을 골라 주세요.');return;}
    try{const text=await file.text();if(request!==ticket||!dialog.open)return;prepare(importSave(text),'file');}
    catch(error){if(request===ticket)message(error.message);}
  });
  const stage=$('restore-stage'),slots=[0,1,2].map(i=>$('restore-slot-'+i));
  function updateSlots(){
    const value=({11:1,12:5,13:8})[Number(stage.value)]??Number(stage.value);slots.forEach((slot,i)=>{slot.disabled=value<3;slot.value=value>=4?['rock','','seaweed'][i]:'';});
  }
  stage.addEventListener('change',()=>{ticket++;clear();updateSlots();message('단계와 장식을 고른 뒤 복원 내용 보기를 눌러 주세요.');});
  for(const slot of slots)slot.addEventListener('change',()=>{ticket++;clear();message('장식을 바꿨어요. 복원 내용을 다시 확인해 주세요.');});
  updateSlots();
  $('manual-restore').addEventListener('submit',event=>{
    event.preventDefault();ticket++;clear();
    try{prepare(progressForStage(Number(stage.value),slots.map(s=>s.value||null)),'manual');}catch(error){message(error.message);}
  });
  $('restore-backup').addEventListener('click',()=>{
    ticket++;clear();try{prepare(readBackup(localStorage),'backup');}catch{message('교체 전 기록을 읽지 못했어요. 현재 진행은 그대로예요.');}
  });
  apply.addEventListener('click',()=>{
    if(!pending)return;
    try{
      const saved=commitSave(localStorage,pending,snapshot());onCommit(saved);clear();$('restore-backup').disabled=false;
      message('기록을 적용하고 이 기기에 저장했어요. 이전 기록은 교체 전 기록 불러오기로 되돌릴 수 있어요.');
    }catch{message('기기에 백업하거나 저장하지 못해 적용하지 않았어요. 현재 진행은 그대로예요.');}
  });
  return {open};
}
