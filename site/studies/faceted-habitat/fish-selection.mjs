export const selectionRadius=halfSize=>Math.max(28,Math.min(56,halfSize+8));
export function pickScreenFish(x,y,candidates){let best=-1,score=Infinity;for(const f of candidates){if(!f.visible||f.distance>8.5)continue;const d=Math.hypot(x-f.x,y-f.y);if(d<=f.radius&&(d<score||(d===score&&f.id<best))){score=d;best=f.id;}}return best;}
export class FishSelection{
 constructor({surface,active,pick,select,drag,clock=()=>performance.now()}){
  Object.assign(this,{surface,active,pick,select,drag,clock});this.pending=null;
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
  surface.addEventListener('pointerdown',e=>{
   if(!active()||this.pending||e.button!==0||e.target.closest?.('#moveZone')||(e.target.closest?.('button')&&!e.target.closest?.('.fishTouch')))return;
   const fish=pick(e.clientX,e.clientY);if(fish<0)return;stop(e);this.pending={fish,id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,at:clock(),dragging:false};surface.setPointerCapture(e.pointerId);
  },true);
  surface.addEventListener('pointermove',e=>{const p=this.pending;if(p?.id!==e.pointerId)return;stop(e);if(!active()){this.clear();return;}const dx=e.clientX-p.lastX,dy=e.clientY-p.lastY;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>9)p.dragging=true;if(p.dragging)drag(dx,dy);p.lastX=e.clientX;p.lastY=e.clientY;},true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{const p=this.pending;if(p?.id!==e.pointerId)return;stop(e);const valid=type==='pointerup'&&active()&&!p.dragging&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<=9&&clock()-p.at<700;this.clear();if(valid)select(p.fish);},true);
 }
 clear(){const p=this.pending;this.pending=null;if(p&&this.surface.hasPointerCapture(p.id))this.surface.releasePointerCapture(p.id);}
 report(){return this.pending?{id:this.pending.fish,dragging:this.pending.dragging}:null;}
}
