import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLoop,inside,sweptHit,cleanRecord} from '../site/studies/captain-dive/rules.mjs';
const circle=(cx,cy,r)=>Array.from({length:33},(_,i)=>({x:cx+Math.cos(i/32*Math.PI*2)*r,y:cy+Math.sin(i/32*Math.PI*2)*r}));
test('closed loops accept fish inside, reject open, giant and crossed traces',()=>{
 const c=circle(120,180,55);assert.equal(inspectLoop(c).ok,true);assert.equal(inside({x:120,y:180},c),true);assert.equal(inside({x:230,y:180},c),false);
 assert.equal(inspectLoop(c.slice(0,14)).ok,false);assert.equal(inspectLoop(circle(180,240,155)).ok,false);
 assert.equal(inspectLoop([{x:0,y:0},{x:80,y:100},{x:100,y:0},{x:0,y:80},{x:0,y:0}]).ok,false);
});
test('fast bubbles cannot skip fish between frames; malformed records stay bounded',()=>{
 assert.equal(sweptHit({x:180,y:300},{x:180,y:180},{x:180,y:230},20),true);
 assert.equal(sweptHit({x:180,y:300},{x:180,y:180},{x:240,y:230},20),false);
 const r=cleanRecord({tap:{counts:[-1,'bad',4],runs:-10,best:'NaN'}});assert.deepEqual(r.tap,{counts:[0,0,4],runs:0,best:0});
});
class Element{
 constructor(id=''){this.id=id;this.listeners={};this.children=[];this.dataset={};this.width=360;this.height=480;this.hidden=false;this.textContent='';this.attrs={};this.classList={toggle(){}};}
 setAttribute(k,v){this.attrs[k]=v;} append(...e){this.children.push(...e);}replaceChildren(...e){this.children=e;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}emit(type,data={}){const e={preventDefault(){},button:0,pointerId:1,...data};for(const f of this.listeners[type]||[])f(e);}
 getContext(){return new Proxy({canvas:this},{get:(o,k)=>k in o?o[k]:(()=>{})});}
 getBoundingClientRect(){return{left:0,top:0,width:this.displayWidth||360,height:this.displayHeight||480};}
 setPointerCapture(){}focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;}
}
test('three complete input-to-collection flows, pause, switching, touch scaling and reload',async()=>{
 let clock=0,raf;const saved=new Map();const ids=new Map();const get=id=>{if(!ids.has(id))ids.set(id,new Element(id));return ids.get(id);};
 const modes=['tap','swim','loop'].map(mode=>{const e=new Element();e.dataset.mode=mode;return e;});
 const listeners={};
 globalThis.document={getElementById:get,querySelectorAll:()=>modes,createElement:()=>new Element(),activeElement:null,hidden:false,addEventListener:(k,f)=>listeners[k]=f};
 globalThis.window={addEventListener:(k,f)=>listeners[k]=f};globalThis.history={replaceState(){}};globalThis.location={hash:''};globalThis.performance={now:()=>clock};globalThis.requestAnimationFrame=fn=>raf=fn;
 globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const run=seconds=>{for(let n=0;n<Math.ceil(seconds/.02);n++){clock+=20;raf(clock);}};
 await import('../site/studies/captain-dive/game.mjs?qa=1');
 const sea=get('sea');get('start').onclick();run(2.02);sea.emit('pointerdown',{clientX:180,clientY:420});sea.emit('pointerup',{clientX:180,clientY:420});run(.6);
 assert.equal(get('count').textContent,'1마리','timed shot catches first fish');
 get('pause').onclick();const paused=get('clock').textContent;run(3);assert.equal(get('clock').textContent,paused);get('start').onclick();run(28);assert.equal(get('overlay').hidden,false);assert.match(get('overlay-title').textContent,/1마리/);
 modes[1].onclick();get('start').onclick();sea.displayWidth=180;sea.displayHeight=240;
 sea.emit('pointerdown',{clientX:44,clientY:220,pointerType:'touch'});run(3);sea.emit('pointerup',{clientX:44,clientY:220,pointerType:'touch'});assert.ok(parseInt(get('count').textContent)>0,'scaled mobile dragging captures fish');
 document.hidden=true;listeners.visibilitychange();const hiddenClock=get('clock').textContent;run(4);assert.equal(get('clock').textContent,hiddenClock);document.hidden=false;get('start').onclick();run(28);assert.equal(get('overlay').hidden,false);
 modes[2].onclick();get('start').onclick();run(1);
 const path=circle(120,180,55);sea.emit('pointerdown',{clientX:path[0].x/2,clientY:path[0].y/2,pointerType:'touch'});
 for(const p of path.slice(1))sea.emit('pointermove',{clientX:p.x/2,clientY:p.y/2,pointerType:'touch'});
 sea.emit('pointerup',{clientX:path.at(-1).x/2,clientY:path.at(-1).y/2,pointerType:'touch'});assert.equal(get('count').textContent,'1마리','drawn loop catches fish');
 run(30);const r=JSON.parse(saved.get('captain-dive-three-plays-v1'));for(const m of ['tap','swim','loop']){assert.equal(r[m].runs,1);assert.ok(r[m].counts[0]>=1);}
 const prior=JSON.stringify(r);get('finish').onclick();assert.equal(saved.get('captain-dive-three-plays-v1'),prior,'end cannot duplicate a saved run');
 await import('../site/studies/captain-dive/game.mjs?qa=reload');assert.match(get('collection-mode').textContent,/1 \/ 3종/);
 modes[2].onclick();get('start').onclick();sea.emit('pointerdown',{clientX:20,clientY:20});sea.emit('pointercancel');sea.emit('pointerup',{clientX:20,clientY:20});assert.equal(get('count').textContent,'0마리','cancelled touch never captures');
 get('cards').children[0].listeners.click[0]();assert.equal(get('detail').open,true);assert.equal(get('overlay-title').textContent,'바다가 기다릴게요');
});
