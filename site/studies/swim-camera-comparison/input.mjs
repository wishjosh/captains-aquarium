import {CaptureInput as BaseInput} from '../bubble-feel/input.mjs';
// Capture on the actual scene object has priority over background look/move.
export class CaptureInput extends BaseInput{
 constructor(world,options){
  super(world,options);this.bubble=null;this.drag=options.drag;const root=options.root;
  root.addEventListener('pointerdown',e=>{
   if(!options.active()||this.bubble||e.button!==0||e.target.closest('button'))return;
   if(!this.drag.pick(e.clientX,e.clientY))return;
   e.preventDefault();e.stopImmediatePropagation();this.onGesture();this.lookX=this.lookY=0;
   this.bubble={id:e.pointerId,element:e.target};e.target.setPointerCapture(e.pointerId);
  },{capture:true});
  root.addEventListener('pointermove',e=>{if(this.bubble?.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();this.drag.move(e.clientX,e.clientY);},{capture:true});
  const finish=(e,cancel)=>{if(this.bubble?.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const b=this.bubble;this.bubble=null;this.drag.end(e.clientX,e.clientY,cancel);if(b.element.hasPointerCapture(b.id))b.element.releasePointerCapture(b.id);};
  root.addEventListener('pointerup',e=>finish(e,false),{capture:true});
  for(const type of ['pointercancel','lostpointercapture'])root.addEventListener(type,e=>finish(e,true),{capture:true});
 }
 canAct(){return this.world.phase==='swimming';}
 read(){return{...super.read(),reel:false};}
 clear(){if(this.bubble){const b=this.bubble;this.bubble=null;this.drag.end(0,0,true);if(b.element.hasPointerCapture(b.id))b.element.releasePointerCapture(b.id);}super.clear();}
 report(){const r=super.report();return{...r,owners:{...r.owners,bubble:this.bubble?.id??null}};}
}
