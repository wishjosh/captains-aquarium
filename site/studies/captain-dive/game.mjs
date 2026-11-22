import{W,H,DURATION,species,clamp,dist,sweptHit,inside,inspectLoop,cleanRecord}from'./rules.mjs?v=1';
import { sprite } from './journey-art.mjs?v=polyone1';
const $=id=>document.getElementById(id),canvas=$('sea'),ctx=canvas.getContext('2d');
const info={
tap:{name:'톡 쏘기',label:'01 · 타이밍 놀이',title:'톡, 물방울을 쏴요',note:'물고기가 지나갈 때 화면을 눌러요.<br>물방울은 선장 앞쪽으로 날아가요.',icon:'↑',tip:'화면 어디든 톡 · PC는 Space',hint:'물고기가 올 자리를 보고 톡!'},
swim:{name:'헤엄치기',label:'02 · 길 고르기',title:'쓱, 친구에게 다가가요',note:'손가락을 좌우로 움직여요.<br>앞의 물방울로 만나면 함께해요.',icon:'↔',tip:'아래쪽에서 좌우로 쓱 · PC는 ← →',hint:'좌우로 움직여 물고기를 만나요.'},
loop:{name:'원 그리기',label:'03 · 감싸기 놀이',title:'빙글, 물고기를 감싸요',note:'손가락으로 작은 고리를 그려요.<br>끝을 시작점에 이어주면 포획!',icon:'◌',tip:'물고기 주위를 빙글 · PC도 드래그',hint:'한두 마리 주위에 작은 원을 그려요.'}
};
function ring(c,x,y,r,color='#e8f2cb',width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
function text(c,s,x,y,size=12,color='#eaf0d2',align='center'){c.font='700 '+size+'px system-ui';c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y);}
let mode='tap',stage='ready',time=0,last=0,idleTime=0,fish=[],rocks=[],effects=[],friends=[],shot=null,counts=[0,0,0],attempts=0,misses=0,spawnIndex=0,nextSpawn=0,rockIndex=0,nextRock=0,trace=[],traceLife=0,traceColor='#ebf1c4',pointer=null,keyboardTrace=false,keys=new Set(),record=cleanRecord(),saved=false,sound=false,audioContext,flash=0;
let player={x:180,y:410,target:180},cursor={x:180,y:230},messageUntil=0;
try{record=cleanRecord(JSON.parse(localStorage.getItem('captain-dive-three-plays-v1')||'null'));}catch{$('save-note').textContent='현재 창에서 수집 기록을 이어가요.';}
function soundCue(kind){
 if(!sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.type='sine';const now=audioContext.currentTime;o.frequency.setValueAtTime(kind==='catch'?660:kind==='miss'?160:400,now);o.frequency.exponentialRampToValueAtTime(kind==='catch'?1100:230,now+.12);g.gain.setValueAtTime(.045,now);g.gain.exponentialRampToValueAtTime(.001,now+.18);o.start();o.stop(now+.2);}catch{}
}
function message(s,seconds=2){$('message').textContent=s;messageUntil=time+seconds;}
function total(){return counts.reduce((a,b)=>a+b,0);}
function updateHud(){$('clock').textContent=Math.max(0,Math.ceil(DURATION-time))+'초';$('count').textContent=total()+'마리';}
function portrait(c,index,known=true){c.clearRect(0,0,c.canvas.width,c.canvas.height);if(known)sprite(c,index,c.canvas.width/2,c.canvas.height/2,4);else{c.fillStyle='#748c7b';c.font='700 28px system-ui';c.textAlign='center';c.fillText('?',c.canvas.width/2,c.canvas.height/2+10);}}
function updateCollection(){
 const data=record[mode];$('collection-mode').textContent=info[mode].name+' · '+data.counts.filter(Boolean).length+' / 3종';$('cards').replaceChildren();
 species.forEach((s,i)=>{const b=document.createElement('button');b.className='card'+(data.counts[i]?'':' unknown');const pc=document.createElement('canvas');pc.width=120;pc.height=64;portrait(pc.getContext('2d'),i,!!data.counts[i]);const title=document.createElement('b');title.textContent=s.name;const sub=document.createElement('small');sub.textContent=data.counts[i]?data.counts[i]+'마리와 함께':'아직 만나기 전';b.append(pc,title,sub);b.setAttribute('aria-label',s.name+' · '+sub.textContent);b.addEventListener('click',()=>showDetail(i));$('cards').append(b);});
 $('best-note').textContent=data.runs?'이 방식으로 '+data.runs+'번 탐사 · 한 판 최고 '+data.best+'마리':'첫 번째 친구를 만나러 가요.';
}
function showDetail(i){if(stage==='running')pause();$('detail-title').textContent=species[i].name;$('detail-note').textContent=record[mode].counts[i]?species[i].note:'아직 이 방식으로 만나지 못했어요. 바다에서 찾아보세요.';portrait($('portrait').getContext('2d'),i,!!record[mode].counts[i]);$('detail').showModal();}
$('close-detail').onclick=$('detail-done').onclick=()=>$('detail').close();
function ready(){
 stage='ready';clearInput();fish=[];rocks=[];friends=[];effects=[];shot=null;time=0;counts=[0,0,0];player={x:180,y:410,target:180};
 $('overlay').hidden=false;$('overlay-label').textContent=info[mode].label;$('gesture').textContent=info[mode].icon;$('gesture').hidden=false;$('overlay-title').textContent=info[mode].title;$('overlay-note').innerHTML=info[mode].note;$('start').textContent='30초 시작';$('next').hidden=true;$('result-fish').replaceChildren();$('pause').disabled=true;$('finish').disabled=true;
 $('mode-name').textContent=info[mode].label.split(' · ')[0]+' '+info[mode].name;$('control-tip').textContent=info[mode].tip;message(info[mode].hint);updateHud();updateCollection();spawnPreview();
}
function select(next){if(stage==='running'||stage==='paused')end();mode=next;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});history.replaceState(null,'','#'+mode);ready();}
function spawnPreview(){fish=[{s:0,x:95,y:170,vx:1,phase:0},{s:1,x:260,y:210,vx:-1,phase:2},{s:2,x:160,y:285,vx:1,phase:4}];}
function spawn(){
 const s=spawnIndex%3,round=Math.floor(spawnIndex/3);spawnIndex++;
 if(mode==='tap'){fish.push({s,x:spawnIndex%2?45:315,y:[225,155,285][s],baseY:[225,155,285][s],vx:(spawnIndex%2?1:-1)*[55,39,73][s],phase:round*2,life:0});}
 else if(mode==='swim'){const x=[86,274,180,274,86,180][(spawnIndex-1)%6];fish.push({s,x,y:spawnIndex===1?205:-25,vx:0,baseX:x,phase:round,life:0});}
 else{const baseX=[103,259,181][s],baseY=[168,226,305][s];fish.push({s,x:baseX,y:baseY,baseX,baseY,vx:s===1?-1:1,phase:round*1.7,life:0});}
}
function start(){
 if(stage==='paused'){stage='running';$('overlay').hidden=true;$('pause').textContent='쉬기';last=performance.now();canvas.focus({preventScroll:true});return;}
 clearInput();fish=[];rocks=[];friends=[];effects=[];shot=null;time=0;counts=[0,0,0];attempts=0;misses=0;saved=false;spawnIndex=0;nextSpawn=mode==='loop'?3:4.5;nextRock=4;rockIndex=0;player={x:180,y:410,target:180};cursor={x:180,y:230};stage='running';spawn();$('overlay').hidden=true;$('pause').disabled=false;$('finish').disabled=false;$('pause').textContent='쉬기';message(info[mode].hint,5);updateHud();last=performance.now();canvas.focus({preventScroll:true});if(sound)soundCue('start');
}
function save(){
 if(saved)return;saved=true;const data=record[mode];data.runs++;data.best=Math.max(data.best,total());data.counts=data.counts.map((n,i)=>n+counts[i]);try{localStorage.setItem('captain-dive-three-plays-v1',JSON.stringify(record));}catch{$('save-note').textContent='현재 창에서 수집 기록을 이어가요.';}updateCollection();
}
function end(){if(stage!=='running'&&stage!=='paused')return;save();stage='result';clearInput();shot=null;$('overlay').hidden=false;$('gesture').hidden=true;$('overlay-label').textContent=info[mode].name+' · 탐사 마침';$('overlay-title').textContent=total()?total()+'마리와 함께!':'다음에는 함께해요';$('overlay-note').textContent=total()?counts.filter(Boolean).length+'종을 만났어요. 아래에서 수집 카드를 열어보세요.':'한 번 더 해보거나 다른 수집 방식을 골라보세요.';$('result-fish').replaceChildren();species.forEach((s,i)=>{if(counts[i]){const span=document.createElement('span');span.textContent=s.short+' '+counts[i];$('result-fish').append(span);}});$('start').textContent='같은 방식 한 번 더';$('next').hidden=false;$('pause').disabled=true;$('finish').disabled=true;$('start').focus({preventScroll:true});}
function pause(){if(stage!=='running')return;stage='paused';clearInput();$('overlay').hidden=false;$('gesture').hidden=false;$('gesture').textContent='Ⅱ';$('overlay-label').textContent='잠깐 쉬는 중';$('overlay-title').textContent='바다가 기다릴게요';$('overlay-note').textContent='남은 시간과 모은 생물은 그대로예요.';$('result-fish').replaceChildren();$('start').textContent='계속하기';$('next').hidden=true;$('pause').textContent='계속';}
function clearInput(){pointer=null;keyboardTrace=false;trace=[];traceLife=0;keys.clear();}
function catchFish(f){
 if(f.caught)return;f.caught=true;counts[f.s]++;effects.push({x:f.x,y:f.y,life:.7,kind:'catch'});friends.push({s:f.s,x:f.x,y:f.y});if(friends.length>5)friends.shift();message(species[f.s].name+'과 함께!');soundCue('catch');updateHud();
}
function fire(){if(stage!=='running'||mode!=='tap'||shot)return;attempts++;shot={x:player.x,y:player.y-28};soundCue('shot');}
function closeLoop(){
 if(!trace.length)return;attempts++;const check=inspectLoop(trace);let caught=0;
 if(check.ok){for(const f of fish)if(!f.caught&&inside(f,check.points)){catchFish(f);caught++;}}
 traceColor=caught?'#f8dda0':'#df9678';traceLife=.65;
 if(!check.ok){message(check.reason,2.5);misses++;soundCue('miss');}else if(!caught){message('고리 밖으로 빠져나갔어요. 한 번 더!');misses++;soundCue('miss');}
}
function toPoint(e){const r=canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width*W,0,W),y:clamp((e.clientY-r.top)/r.height*H,0,H)};}
canvas.addEventListener('pointerdown',e=>{
 if(stage!=='running'||pointer!==null||e.button>0)return;e.preventDefault();canvas.focus({preventScroll:true});
 pointer=e.pointerId;canvas.setPointerCapture(pointer);const p=toPoint(e);
 if(mode==='tap')fire();else if(mode==='swim')player.target=clamp(p.x,27,W-27);else{keyboardTrace=false;trace=[p];traceLife=0;traceColor='#f2e7b4';cursor=p;message('끝을 시작점에 이어주세요.',3);}
});
canvas.addEventListener('pointermove',e=>{
 if(stage!=='running'||e.pointerId!==pointer)return;const p=toPoint(e);if(mode==='swim')player.target=clamp(p.x,27,W-27);
 if(mode==='loop'&&trace.length&&dist(p,trace.at(-1))>3){trace.push(p);cursor=p;}
});
canvas.addEventListener('pointerup',e=>{
 if(e.pointerId!==pointer)return;const p=toPoint(e);pointer=null;if(stage==='running'&&mode==='loop'){trace.push(p);closeLoop();}
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(pointer===e.pointerId){pointer=null;trace=[];}});
canvas.addEventListener('keydown',e=>{
 if(stage!=='running')return;
 if(e.code==='Space'){e.preventDefault();if(e.repeat)return;if(mode==='tap')fire();if(mode==='loop'){keyboardTrace=!keyboardTrace;if(keyboardTrace){trace=[{...cursor}];traceLife=0;traceColor='#f2e7b4';}else closeLoop();}return;}
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();
 if(mode==='swim'){player.target=clamp(player.target+(e.code==='ArrowLeft'?-28:e.code==='ArrowRight'?28:0),27,W-27);}
 if(mode==='loop'){cursor={x:clamp(cursor.x+(e.code==='ArrowLeft'?-16:e.code==='ArrowRight'?16:0),8,W-8),y:clamp(cursor.y+(e.code==='ArrowUp'?-16:e.code==='ArrowDown'?16:0),45,H-55)};if(keyboardTrace)trace.push({...cursor});}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',()=>pause());
$('start').onclick=start;$('pause').onclick=()=>stage==='running'?pause():start();$('finish').onclick=end;
$('next').onclick=()=>select(['tap','swim','loop'][(['tap','swim','loop'].indexOf(mode)+1)%3]);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>select(b.dataset.mode));
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'소리 켜짐':'소리 꺼짐';$('sound').setAttribute('aria-pressed',String(sound));if(sound)soundCue('start');};
function update(dt){
 time=Math.min(DURATION,time+dt);if(time>=DURATION){updateHud();end();return;}
 if(time>=nextSpawn){if(mode!=='loop'||fish.filter(f=>!f.caught).length<3)spawn();nextSpawn=time+(mode==='loop'?3.5:4.5);}
 if(mode==='swim'&&time>=nextRock){rocks.push({x:[180,90,270][rockIndex++%3],y:-40,hit:false});nextRock=time+5.5;}
 player.x+=clamp(player.target-player.x,-300*dt,300*dt);
 for(const f of fish){
 if(f.caught)continue;f.life+=dt;
 if(mode==='tap'){f.x+=f.vx*dt;if(f.x<32){f.x=32;f.vx=Math.abs(f.vx);}if(f.x>328){f.x=328;f.vx=-Math.abs(f.vx);}f.y=f.baseY+Math.sin(time*(f.s===2?2:1)+f.phase)*(f.s===2?12:5);}
 else if(mode==='swim'){f.y+=64*dt;f.x=f.baseX+Math.sin(time*1.4+f.phase)*12;if(dist(f,{x:player.x,y:player.y-33})<35)catchFish(f);}
 else{const previous=f.x;f.x=f.baseX+Math.sin(time*[.7,.45,1][f.s]+f.phase)*[24,16,37][f.s];f.y=f.baseY+Math.cos(time*.7+f.phase)*12;f.vx=f.x-previous;}
 }
 if(shot){const prev={...shot};shot.y-=370*dt;const target=fish.find(f=>!f.caught&&sweptHit(prev,shot,f,f.s===1?23:20));if(target){catchFish(target);shot=null;}else if(shot.y<20){shot=null;misses++;message('물고기가 올 자리를 보고 한 번 더!');soundCue('miss');}}
 if(mode==='swim'){for(const r of rocks){r.y+=64*dt;if(!r.hit&&dist(r,player)<39){r.hit=true;flash=.3;const side=player.x<r.x?-1:1;player.target=clamp(r.x+side*58,27,W-27);message('바위를 옆으로 비켜가요.');soundCue('miss');}}}
 fish=fish.filter(f=>!f.caught&&f.y<H+35);rocks=rocks.filter(r=>r.y<H+50);
 for(const [i,f]of friends.entries()){const target={x:player.x+(i-2)*15,y:player.y+30+Math.sin(time*3+i)*3};f.x+=(target.x-f.x)*Math.min(1,dt*4);f.y+=(target.y-f.y)*Math.min(1,dt*4);}
 effects.forEach(e=>e.life-=dt);effects=effects.filter(e=>e.life>0);if(traceLife>0){traceLife-=dt;if(traceLife<=0)trace=[];}flash=Math.max(0,flash-dt);
 if(time>messageUntil){$('message').textContent=info[mode].hint;messageUntil=Infinity;}
 updateHud();
}
function rock(x,y,size=1,solid=false){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle=solid?'#30595b':'#52796a';ctx.beginPath();ctx.moveTo(-25,17);ctx.lineTo(-29,-1);ctx.lineTo(-13,-21);ctx.lineTo(13,-23);ctx.lineTo(29,-5);ctx.lineTo(24,20);ctx.closePath();ctx.fill();ctx.fillStyle=solid?'#638776':'#749886';ctx.beginPath();ctx.moveTo(-13,-21);ctx.lineTo(13,-23);ctx.lineTo(7,0);ctx.lineTo(-29,-1);ctx.fill();ctx.restore();}
function kelp(x,y,t){ctx.strokeStyle='#3f8170';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+38);for(let k=0;k<5;k++)ctx.lineTo(x+Math.sin(t+k)*6,y+30-k*12);ctx.stroke();ctx.fillStyle='#74a37b';for(let k=0;k<4;k++)ctx.fillRect(x+Math.sin(t+k)*6+(k%2?-9:1),y+17-k*12,10,4);}
function backdrop(){
 const t=stage==='running'||stage==='paused'||stage==='result'?time:idleTime;
 ctx.fillStyle='#9fc5ad';ctx.fillRect(0,0,W,H);ctx.fillStyle='#8ebaa7';ctx.fillRect(0,100,W,130);ctx.fillStyle='#78a897';ctx.fillRect(0,230,W,150);ctx.fillStyle='#63978a';ctx.fillRect(0,380,W,100);
 ctx.fillStyle='#c7d8b447';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(25+i*100,0);ctx.lineTo(65+i*100,0);ctx.lineTo(15+i*100,H);ctx.lineTo(-60+i*100,H);ctx.fill();}
 const scroll=mode==='swim'?t*50:0;
 for(let i=0;i<7;i++){const y=(i*90+scroll)%610-60;rock(i%2?350:8,y,.8);kelp(i%2?337:20,y,t*.9+i);}
 ctx.fillStyle='#bed2ac';for(let i=0;i<17;i++){const x=(i*79+17)%W,y=(i*61+scroll*.35)%H;ctx.fillRect(x,y,2,2);}
 ctx.strokeStyle='#e0ebc533';ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc((i*81+40)%W,((H-i*83-t*7)%H+H)%H,2+i%3,0,7);ctx.stroke();}
}
function draw(){
 backdrop();const t=stage==='ready'?idleTime:time;
 if(mode==='tap'){ctx.setLineDash([4,9]);ctx.strokeStyle='#f4e6a87a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x,player.y-35);ctx.lineTo(player.x,66);ctx.stroke();ctx.setLineDash([]);text(ctx,'↑',player.x,player.y-50,20,'#f6e9b5');}
 for(const r of rocks)rock(r.x,r.y,1,true);
 for(const f of fish){sprite(ctx,f.s,f.x,f.y,3,f.vx<0);if(stage==='running'){text(ctx,species[f.s].short,f.x,f.y-22,9,'#164a4b');}}
 if(mode==='swim'){ring(ctx,player.x,player.y-33,25,'#e9efc8',2);ring(ctx,player.x,player.y-33,20,'#cde6c07a',1);}
 if(mode==='loop'&&stage==='running'&&total()===0&&time<5&&!trace.length&&fish[0]){ctx.setLineDash([4,6]);ring(ctx,fish[0].x,fish[0].y,47,'#eff0ca88');ctx.setLineDash([]);}
 if(trace.length){ctx.strokeStyle=traceColor;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(trace[0].x,trace[0].y);for(const p of trace.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();ring(ctx,trace[0].x,trace[0].y,7,'#fff0bd',2);if(traceLife>0){ctx.globalAlpha=.12;ctx.closePath();ctx.fillStyle=traceColor;ctx.fill();ctx.globalAlpha=1;}}
 if(mode==='loop'&&document.activeElement===canvas){ctx.strokeStyle='#f6e8b7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cursor.x-5,cursor.y);ctx.lineTo(cursor.x+5,cursor.y);ctx.moveTo(cursor.x,cursor.y-5);ctx.lineTo(cursor.x,cursor.y+5);ctx.stroke();}
 if(shot){ring(ctx,shot.x,shot.y,10,'#fbf5d7',2);ctx.fillStyle='#edf4ce77';ctx.beginPath();ctx.arc(shot.x,shot.y,8,0,7);ctx.fill();ctx.fillStyle='#fff9df';ctx.fillRect(shot.x-4,shot.y-5,3,3);}
 for(const e of effects){ring(ctx,e.x,e.y,24+(1-e.life/.7)*20,'#fff1b3',2);for(let i=0;i<6;i++){const a=i*Math.PI/3,rr=(1-e.life/.7)*38;ctx.fillStyle='#f6e8b5';ctx.fillRect(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,3,3);}}
 sprite(ctx,3,player.x,player.y,3,false,flash>0?.45:1);
 for(const f of friends)sprite(ctx,f.s,f.x,f.y,1.25);
 if(mode==='swim'){text(ctx,'‹',48,437,25,'#e0e8c0aa');text(ctx,'›',312,437,25,'#e0e8c0aa');}
}
function frame(now){let dt=Math.min((now-last)/1000||0,.25);last=now;idleTime+=dt;while(stage==='running'&&dt>0){const step=Math.min(dt,.04);update(step);dt-=step;}draw();requestAnimationFrame(frame);}
select(['tap','swim','loop'].includes(location.hash.slice(1))?location.hash.slice(1):'tap');requestAnimationFrame(frame);
