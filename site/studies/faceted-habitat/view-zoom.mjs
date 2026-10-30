import {clamp,damp} from './core.mjs';
export const zoomFieldOfView=(scale,base=49)=>2*Math.atan(Math.tan(base*Math.PI/360)/scale)*180/Math.PI;
export class ViewZoom {
 constructor(){this.reset();}
 reset(){this.target=this.value=1;}
 change(logScale){this.target=clamp(this.target*Math.exp(clamp(logScale,-1,1)),.65,3.2);}
 step(dt){this.value=damp(this.value,this.target,10,Math.max(0,dt));return this.value;}
 report(){return{value:this.value,target:this.target};}
}
// Two touches on the look side form a pinch. Joystick + look remains independent.
export class InspectionZoom {
 constructor({surface,active,width,onStart=()=>{},clock=()=>performance.now()}){
  Object.assign(this,{surface,active,width,onStart,clock});this.points=new Map();this.blocked=false;this.delta=0;this.center=null;this.fresh=false;this.suppressUntil=0;
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
  const control=e=>e.target.closest?.('button')&&!e.target.closest?.('.fishTouch');
  surface.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||!active()||control(e)||e.clientX<width()*.4)return;
   if((this.points.size>=2||this.blocked)&&!this.points.has(e.pointerId)){if(this.blocked)stop(e);return;}
   this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(this.points.size===2&&!this.blocked){this.blocked=true;this.onStart();this.measure();this.fresh=true;for(const id of this.points.keys())surface.setPointerCapture(id);}
   if(this.blocked)stop(e);
  },true);
  surface.addEventListener('pointermove',e=>{if(!this.points.has(e.pointerId))return;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!this.blocked)return;stop(e);if(this.points.size===2){const before=this.span;this.measure();if(before>12&&this.span>12)this.delta+=Math.log(this.span/before);}},true);
  for(const type of ['pointerup','pointercancel'])surface.addEventListener(type,e=>{if(!this.points.has(e.pointerId))return;this.points.delete(e.pointerId);if(this.blocked){stop(e);if(!this.points.size){this.blocked=false;this.suppressUntil=this.clock()+350;}}},true);
  surface.addEventListener('click',e=>{if(this.blocked||this.clock()<this.suppressUntil)stop(e);},true);
  surface.addEventListener('wheel',e=>{if(!active()||control(e))return;stop(e);const units=e.deltaMode===1?16:e.deltaMode===2?500:1;this.delta-=clamp(e.deltaY*units,-400,400)*.0018;this.center=[e.clientX,e.clientY];this.fresh=true;},{capture:true,passive:false});
 }
 measure(){const [a,b]=[...this.points.values()];this.span=Math.hypot(a.x-b.x,a.y-b.y);this.center=[(a.x+b.x)/2,(a.y+b.y)/2];}
 consume(){const result={logScale:this.delta,center:this.center,start:this.fresh};this.delta=0;this.fresh=false;return result;}
 clear(){const ids=[...this.points.keys()];this.points.clear();this.blocked=false;this.delta=0;this.fresh=false;for(const id of ids)if(this.surface.hasPointerCapture(id))this.surface.releasePointerCapture(id);}
}
