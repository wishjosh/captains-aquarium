import {SPECIES,SLOT_IDS,SLOT_NAMES,SHAPES,stateFor,slotFor,editExhibition} from './exhibition.js?v=2026-10-17-clownfish-lighting-c-1';
export function setupExhibition({snapshot,pause,onCommit,onClose}){
 const $=id=>document.getElementById(id),dialog=$('exhibition-dialog'),place=$('exhibition-place'),shape=$('exhibition-shape'),animal=$('exhibition-species'),preview=$('exhibition-preview'),status=$('exhibition-status');
 const names={fish:'흰동가리'};
 let base=null,pending=null;
 function render(){
  const id=place.value,current=base.exhibition[id];shape.value=current.shape;
  animal.replaceChildren(new Option('빈 수조 · 기존 친구는 관리동으로', ''));
  for(const k of SPECIES){
   const at=slotFor(base,k),s=stateFor(base,k),option=new Option(names[k]+(at?' · '+SLOT_NAMES[at]+' 전시 중':s.admitted?' · 관리동 보관':' · 입수 전'),k);
   option.disabled=!s.admitted||!!at&&at!==id;animal.add(option);
  }
  animal.value=current.kind||'';update();
 }
 function update(){
  try{
   const id=place.value,kind=animal.value||null;pending=editExhibition(base,id,{shape:shape.value,kind});
   const old=base.exhibition[id].kind;
   preview.textContent=SLOT_NAMES[id]+' 수조: '+SHAPES[shape.value]+' · '+(names[kind]||'비어 있음')+(old&&old!==kind?'\n'+names[old]+' → 관리동 보관':'')+'\n관찰·꾸미기 달성과 흰동가리 장식은 유지돼요.';
   status.textContent='아직 적용하지 않았어요. 내용을 확인하고 적용해 주세요.';$('apply-exhibition').disabled=false;
  }catch(e){pending=null;status.textContent=e.message;$('apply-exhibition').disabled=true;}
 }
 place.addEventListener('change',render);shape.addEventListener('change',update);animal.addEventListener('change',update);
 $('cancel-exhibition').addEventListener('click',()=>dialog.close());
 $('apply-exhibition').addEventListener('click',()=>{
  if(!pending)return;
  try{onCommit(pending);dialog.close();}catch{status.textContent='기기에 저장하지 못해 적용하지 않았어요. 기존 전시와 진행은 그대로예요.';}
 });
 dialog.addEventListener('close',()=>{base=null;pending=null;onClose();});
 return {open(id){
  pause();base=snapshot();place.replaceChildren(...SLOT_IDS.map(k=>new Option(SLOT_NAMES[k]+' 수조',k)));place.value=SLOT_IDS.includes(id)?id:SLOT_IDS[0];render();dialog.showModal();
 }};
}
