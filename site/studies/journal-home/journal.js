import * as T from '../../vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {loadFish,createFish} from '../../fish.js?v=2026-10-20-jeju-rov-v1';
import {SPECIES,SPECIES_INFO,fishLength} from '../../species.js?v=2026-10-20-jeju-rov-v1';
import {aquariumLighting} from '../../lighting.js?v=2026-10-20-jeju-rov-v1';

// A standalone navigation study. Records live only in this document's memory.
// Original gameplay, v7, storage APIs and the public repository are never imported.
const $=id=>document.getElementById(id),frame=$('sea'),models=new Map(),sizes=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready=false,view='home',selected='fish',mode='fresh',records=emptyRecords(),recent=null,observing=false,poll=null,expeditionOpen=false,missionRecorded=false;
let renderer,scene,camera,lastPaint=0,renderRequested=true;
function emptyRecords(){return Object.fromEntries(SPECIES.map(id=>[id,{discovered:false,collected:false,place:null,method:null}]));}
const counts=()=>({discovered:SPECIES.filter(k=>records[k].discovered).length,collected:SPECIES.filter(k=>records[k].collected).length});
const name=id=>SPECIES_INFO[id].name;
const announce=text=>$('announcement').textContent=text;
function svg(viewBox){return `<svg viewBox="${viewBox}" aria-hidden="true"><image href="./assets/journal.png?v=2026-10-25-journal-home-1" width="1024" height="1536"/></svg>`;}
function makeCard(id,{home=false}={}){
 const r=records[id],known=r.discovered,card=document.createElement('button');card.className='record-card';card.dataset.kind=id;
 card.setAttribute('aria-label',home&&!known?'바다 도감에서 첫 기록 살펴보기':known?`${name(id)} · ${r.collected?'수집 완료':'발견 기록'} 상세 보기`:`미발견 카드 ${SPECIES.indexOf(id)+1} 상세 보기`);
 card.innerHTML=svg('208 252 608 932');
 const title=document.createElement('strong');title.className='name';title.textContent=known?name(id):home?'첫 만남의 기록':'미발견';card.append(title);
 if(known){const canvas=document.createElement('canvas');canvas.dataset.kind=id;canvas.width=240;canvas.height=200;canvas.setAttribute('aria-label',name(id)+' 원본 모습');card.append(canvas);}
 else{const mark=document.createElement('span');mark.className='unknown';mark.textContent='?';mark.setAttribute('aria-hidden','true');const copy=document.createElement('span');copy.className='unknown-copy';copy.textContent=home?'오늘의 첫 만남을 이곳에 남겨 보세요.':'아직 만나지 못한 바다의 친구';card.append(mark,copy);}
 const caption=document.createElement('span');caption.className='caption';caption.textContent=known?(r.collected?'물방울 수집 완료':'발견한 친구'):'첫 만남을 기다려요';card.append(caption);
 card.onclick=()=>{if(home&&!known)navigate('dex');else{selected=id;navigate('detail');}};return card;
}
function replaceCard(container,id,options){$(container).replaceChildren(makeCard(id,options));}
function render(){
 for(const b of document.querySelectorAll('[data-action=sail]'))b.disabled=!ready;
 const c=counts();$('progressTop').textContent=`발견 ${c.discovered} · 수집 ${c.collected}`;$('navCount').textContent=`${c.collected}/4`;
 $('dexCount').textContent=`발견 ${c.discovered} / 4 · 수집 ${c.collected} / 4`;
 $('dexHint').textContent=c.discovered===0?'먼저 바다에서 친구를 만나 보세요.':c.collected===0?'발견한 친구에게 물방울을 쏴 보세요.':'한 장의 기록이 다음 만남으로 이어져요.';
 $('homeNote').textContent=records.fish.collected?'새 수집 카드를 도감에서 살펴보세요.':'흰동가리의 첫 기록을 남겨 보세요.';
 $('recentLabel').textContent=recent?'최근 만난 친구':'첫 기록을 기다리는 자리';$('homeHint').textContent=recent?'카드를 눌러 만남의 기록을 펼쳐 보세요.':'첫 만남이 이곳에 남습니다.';
 replaceCard('homeCard',recent||'fish',{home:true});$('cardGrid').replaceChildren(...SPECIES.map(id=>makeCard(id)));
 for(const id of ['home','dex','detail'])$(id).hidden=id!==view;
 for(const b of document.querySelectorAll('[data-page]'))b.setAttribute('aria-current',b.dataset.page===(view==='detail'?'dex':view)?'page':'false');
 renderDetail();$('fresh').setAttribute('aria-pressed',String(mode==='fresh'));$('example').setAttribute('aria-pressed',String(mode==='example'));
 $('sampleLabel').textContent=mode==='example'?'시안 예시 기록 · 실제 수집 진행과 무관합니다.':'이번 페이지 안에서만 기록됩니다.';
 renderRequested=true;paint();
}
function renderDetail(){
 const r=records[selected];replaceCard('detailCard',selected);
 $('detailState').textContent=r.collected?'수집한 친구':r.discovered?'발견한 친구':'아직 만나지 못한 친구';
 $('detailTitle').textContent=r.discovered?name(selected):'첫 만남을 기다려요.';
 $('detailDescription').textContent=r.discovered?SPECIES_INFO[selected].description:'바다에서 만나면 모습과 기록이 이 카드에 채워집니다.';
 const rows=r.discovered?[['만난 곳',r.place||'해조숲 가장자리'],['수집 기록',r.collected?'물방울로 만났어요.':'아직 수집하지 않았어요.'],['항해 기록',mode==='example'?'화면 검토용 예시 기록':'이번 페이지의 탐사 기록']]:[['발견 기록','아직 없어요.'],['다음 만남','바다를 탐사해 보세요.']];
 $('facts').replaceChildren(...rows.flatMap(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;return[dt,dd];}));
 $('swim').hidden=!r.discovered;$('swim').textContent=observing?'움직임 멈추기':'움직임 살펴보기';
}
function navigate(next){view=next;observing=false;render();window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});const h=$(next).querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
function setMode(next){endExpedition(false);mode=next;records=emptyRecords();recent=null;if(next==='example'){for(const id of SPECIES)records[id]={discovered:true,collected:id==='fish',place:'해조숲 가장자리',method:id==='fish'?'bubble':null};recent='fish';}selected='fish';navigate('home');announce(next==='example'?'예시 기록을 보여 줍니다.':'처음 시작하는 화면으로 돌아왔습니다.');}
function markDiscovered(){if(records.fish.discovered)return;records.fish.discovered=true;records.fish.place='해조숲 가장자리';recent='fish';render();}
function markCollected(){const first=!records.fish.collected;markDiscovered();records.fish.collected=true;records.fish.method='bubble';recent='fish';$('newCard').hidden=false;$('newCard').textContent=first?'새 카드 보기':'수집 카드 보기';$('missionStatus').textContent=first?'새 수집 카드가 도감에 남았어요.':'흰동가리의 수집 카드를 볼 수 있어요.';announce('흰동가리 수집 기록을 확인할 수 있습니다.');render();}
function syncExpedition(){if(!expeditionOpen)return;try{const report=frame.contentWindow?.bubbleStudy?.report();if(!report)return;if(report.started){const d=report.fish.map((n,i)=>n-report.player[i]),f=[-Math.sin(report.yaw)*Math.cos(report.pitch),Math.sin(report.pitch),-Math.cos(report.yaw)*Math.cos(report.pitch)];if(Math.hypot(...d)<3.6&&d.reduce((s,n,i)=>s+n*f[i],0)>0)markDiscovered();}if(report.phase==='caught'&&!missionRecorded){missionRecorded=true;markCollected();}}catch{ /* Same-origin frame can be between its old and new document. */ }}
function startExpedition(){
 if(!ready)return;expeditionOpen=true;missionRecorded=false;$('expedition').hidden=false;document.body.style.overflow='hidden';$('newCard').hidden=true;$('missionStatus').textContent='물방울로 흰동가리를 만나세요.';
 const harness=new URLSearchParams(location.search).get('harness')==='1';frame.src='../bubble-capture/?v=2026-10-24-bubble-1'+(harness?'&harness=1':'');clearInterval(poll);poll=setInterval(syncExpedition,150);$('endExpedition').focus();
}
function endExpedition(goHome=true){if(expeditionOpen)syncExpedition();clearInterval(poll);poll=null;expeditionOpen=false;$('expedition').hidden=true;document.body.style.overflow='';frame.src='about:blank';if(goHome)navigate('home');}
for(const b of document.querySelectorAll('[data-action=sail]'))b.onclick=startExpedition;
for(const b of document.querySelectorAll('[data-action=dex]'))b.onclick=()=>navigate('dex');
for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>navigate(b.dataset.page);
$('brand').onclick=e=>{e.preventDefault();navigate('home');};$('backDex').onclick=()=>navigate('dex');$('fresh').onclick=()=>setMode('fresh');$('example').onclick=()=>setMode('example');
$('swim').onclick=()=>{observing=!observing;$('swim').textContent=observing?'움직임 멈추기':'움직임 살펴보기';};
$('endExpedition').onclick=()=>endExpedition();$('newCard').onclick=()=>{endExpedition(false);selected='fish';navigate('detail');};
addEventListener('keydown',e=>{if(e.code!=='Escape')return;if(expeditionOpen)endExpedition();else if(view==='detail')navigate('dex');else if(view==='dex')navigate('home');});
frame.addEventListener('load',()=>{if(!expeditionOpen)return;try{frame.contentWindow.addEventListener('keydown',e=>{if(e.code==='Escape')endExpedition();});}catch{}});
function paint(){if(!ready||expeditionOpen)return;const visible=[...document.querySelectorAll('.page canvas')].filter(c=>!c.closest('.page').hidden);if(!visible.length)return;
 for(const canvas of visible){const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)continue;const model=models.get(canvas.dataset.kind);if(!model)continue;for(const m of models.values())m.visible=m===model;
  const ratio=Math.min(devicePixelRatio,1.5),w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}renderer.setSize(w,h,false);camera.aspect=w/h;
  const size=sizes.get(canvas.dataset.kind),extent=Math.max(size.y,size.x/camera.aspect),distance=extent*1.34/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)));camera.position.set(0,size.y*.05,distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(renderer.domElement,0,0,w,h);
 }
 renderRequested=false;
}
addEventListener('resize',()=>{renderRequested=true;paint();});
render();
try{
 const [asset]=await Promise.all([loadFish({collection:true}),new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=()=>reject(Error('항해일지 그래픽 로딩 실패'));im.src=new URL('./assets/journal.png?v=2026-10-25-journal-home-1',import.meta.url).href;})]);
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 scene=new T.Scene();camera=new T.PerspectiveCamera(28,1,.01,30);aquariumLighting(scene,{renderer});
 for(const id of SPECIES){const model=createFish(asset,{kind:id,length:fishLength(id),appearance:'white-eye'});model.rotation.y=1.05;model.userData.update(.35);scene.add(model);models.set(id,model);sizes.set(id,new T.Box3().setFromObject(model).getSize(new T.Vector3()));}
 ready=true;$('load').textContent='항해일지 시안 · 실제 게임 저장과 분리';render();
 let last=performance.now();function frameLoop(now){const dt=Math.min(.05,(now-last)/1000);last=now;const animate=!reduced&&!document.hidden&&!expeditionOpen&&(view==='home'&&recent||view==='detail'&&observing);if(animate){const id=view==='home'?recent:selected;models.get(id)?.userData.update(dt);if(now-lastPaint>33){paint();lastPaint=now;}}else if(renderRequested)paint();requestAnimationFrame(frameLoop);}requestAnimationFrame(frameLoop);
 window.journalStudy={ready:true,report:()=>({view,selected,mode,records:structuredClone(records),counts:counts(),recent,observing,expeditionOpen,storageUsed:false,saveConnected:false,sourceSpecies:[...models.keys()],style:'B 항해 기록',publicVersionUnchanged:'2026-10-24-bubble-1'})};
}catch(error){$('load').textContent='시안을 불러오지 못했어요. '+error.message;throw error;}
