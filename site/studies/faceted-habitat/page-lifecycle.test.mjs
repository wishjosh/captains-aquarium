import test from 'node:test';import assert from 'node:assert/strict';
import {PageLifecycle} from './page-lifecycle.mjs';
const target=()=>({listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},emit(type){for(const fn of this.listeners[type]||[])fn();}});
function setup(){const page=target(),host=target(),reasons=[];page.hidden=false;let blurs=0;new PageLifecycle({page,host,onPause:r=>reasons.push(r),onBlur:()=>blurs++});return{page,host,reasons,get blurs(){return blurs;}};}
test('visible focus loss never opens a pause curtain, even during repeated focus changes',()=>{const s=setup();for(let i=0;i<10;i++){s.host.emit('blur');s.host.emit('focus');}assert.equal(s.blurs,10);assert.deepEqual(s.reasons,[]);});
test('actual tab or app hiding requests a pause; returning does not auto resume',()=>{const s=setup();s.page.hidden=true;s.page.emit('visibilitychange');assert.deepEqual(s.reasons,['hidden']);s.page.hidden=false;s.page.emit('visibilitychange');s.host.emit('focus');assert.deepEqual(s.reasons,['hidden']);});
test('page exit requests a pause even if visibility did not change first',()=>{const s=setup();s.host.emit('pagehide');assert.deepEqual(s.reasons,['pagehide']);});
test('a blur after the page is already hidden requests a pause',()=>{const s=setup();s.page.hidden=true;s.host.emit('blur');assert.equal(s.blurs,1);assert.deepEqual(s.reasons,['hidden']);});
