import {clamp,damp} from './core.mjs';
export const zoomFieldOfView=(scale,base=49)=>2*Math.atan(Math.tan(base*Math.PI/360)/scale)*180/Math.PI;
export class ViewZoom {
 constructor({min=.65,max=3.2}={}){this.min=min;this.max=max;this.reset();}
 reset(){this.target=this.value=1;}
 change(logScale){this.target=clamp(this.target*Math.exp(clamp(logScale,-1,1)),this.min,this.max);}
 step(dt){this.value=damp(this.value,this.target,10,Math.max(0,dt));return this.value;}
 report(){return{value:this.value,target:this.target};}
}
// Only the actual joystick pad reserves a touch. Free scene touches work across the centre.
export class InspectionZoom {
 constructor({surface,active,width,onStart=()=>{},reserved=e=>!!e.target.closest?.('#moveZone'),clock=()=>performance.now()}){
  Object.assign(this,{surface,active,width,onStart,reserved,clock});this.points=new Map();this.held=new Set();this.blocked=false;this.delta=0;this.center=null;this.fresh=false;this.suppressUntil=0;
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
  const control=e=>e.target.closest?.('button')&&!e.target.closest?.('.fishTouch');
  surface.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||!active())return;
   if(this.blocked){this.held.add(e.pointerId);surface.setPointerCapture(e.pointerId);stop(e);return;}
   this.suppressUntil=0;if(control(e)||reserved(e))return;
   this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.held.add(e.pointerId);
   if(this.points.size===2){this.blocked=true;this.transferring=true;this.onStart();this.measure();this.fresh=true;for(const id of this.held)surface.setPointerCapture(id);this.transferring=false;this.onTrace?.('pinch-start',{});stop(e);}
  },true);
  surface.addEventListener('pointermove',e=>{if(this.blocked){if(this.points.has(e.pointerId)){this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.points.size===2){const before=this.span;this.measure();if(before>12&&this.span>12){const delta=Math.log(this.span/before);this.delta+=delta;this.onTrace?.('pinch-change',{delta});}}}stop(e);}else if(this.points.has(e.pointerId))this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});},true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{
   if(type==='lostpointercapture'&&(this.transferring||surface.hasPointerCapture(e.pointerId)))return;
   if(!this.held.has(e.pointerId))return;if(this.blocked&&type==='pointercancel')this.onTrace?.('touch-cancel',{});this.held.delete(e.pointerId);this.points.delete(e.pointerId);
   if(this.blocked){stop(e);if(!this.held.size){this.blocked=false;this.suppressUntil=this.clock()+350;this.onTrace?.('pinch-end',{reason:type});}}
  },true);
  surface.addEventListener('click',e=>{if(this.blocked||this.clock()<this.suppressUntil)stop(e);},true);
  surface.addEventListener('wheel',e=>{if(!active()||control(e)||this.blocked)return;stop(e);const units=e.deltaMode===1?16:e.deltaMode===2?500:1;this.delta-=clamp(e.deltaY*units,-400,400)*.0018;this.fresh=true;},{capture:true,passive:false});
 }
 measure(){const[a,b]=[...this.points.values()];this.span=Math.hypot(a.x-b.x,a.y-b.y);this.center=[(a.x+b.x)/2,(a.y+b.y)/2];}
 nudge(logScale){this.delta+=logScale;this.fresh=true;}
 consume(){const result={logScale:this.delta,center:this.center,start:this.fresh};this.delta=0;this.fresh=false;return result;}
 clear(){if(this.blocked)this.onTrace?.('pinch-end',{reason:'reset'});const ids=[...this.held];this.points.clear();this.held.clear();this.blocked=false;this.delta=0;this.fresh=false;for(const id of ids)if(this.surface.hasPointerCapture(id))this.surface.releasePointerCapture(id);}
 report(){return{pinching:this.blocked,touches:this.points.size,held:this.held.size};}
}
