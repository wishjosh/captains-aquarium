// Focus changes are not proof that a phone has left the game.
// Preserve captured touch gestures while the page is visible. Clear stale keys on blur;
// actual hiding/page exit still pauses and lets the game release every input capture.
export class PageLifecycle {
 constructor({page,host,onPause,onBlur=()=>{}}){
  host.addEventListener('blur',()=>{onBlur();if(page.hidden)onPause('hidden');});
  page.addEventListener('visibilitychange',()=>{if(page.hidden)onPause('hidden');});
  host.addEventListener('pagehide',()=>onPause('pagehide'));
 }
}
