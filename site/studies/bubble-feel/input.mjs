import {clamp} from './core.mjs?v=2026-10-25-focus-look-1';
// Independent pointer ownership. Releasing one thumb never resets the other.
export class CaptureInput{
 constructor(world,{move,base,knob,look,primary,rise,sink,active,onFire,onGesture,onStop}){
  Object.assign(this,{world,move,base,knob,look,primary,rise,sink,active,onFire,onGesture,onStop});this.keys=new Set();this.stick=null;this.gaze=null;this.action=null;this.depth=null;this.x=this.z=this.y=0;this.keyAction=false;this.chargeAt=0;this.lookX=this.lookY=0;
  move.addEventListener('pointerdown',e=>{if(!active()||this.stick)return;e.preventDefault();const cx=clamp(e.clientX,52,Math.max(53,innerWidth*.4-15)),cy=clamp(e.clientY,100,innerHeight-59);this.stick={id:e.pointerId,x:e.clientX,y:e.clientY};this.x=this.z=0;base.style.left=cx-46+'px';base.style.top=cy-46+'px';base.style.bottom='auto';base.classList.add('active');knob.style.transform='none';move.setPointerCapture(e.pointerId);});
  move.addEventListener('pointermove',e=>{if(!this.stick||e.pointerId!==this.stick.id)return;const dx=e.clientX-this.stick.x,dy=e.clientY-this.stick.y,m=Math.hypot(dx,dy),r=46,s=m>r?r/m:1,n=Math.max(0,(Math.min(1,m/r)-.12)/.88)**1.15;this.x=m?dx/m*n:0;this.z=m?-dy/m*n:0;knob.style.transform=`translate(${dx*s}px,${dy*s}px)`;});
  const endStick=(e,cancel=false)=>{if(this.stick?.id!==e.pointerId)return;this.stick=null;this.x=this.z=0;base.classList.remove('active');knob.style.transform='none';if(cancel)onStop();};
  move.addEventListener('pointerup',e=>endStick(e));for(const type of ['pointercancel','lostpointercapture'])move.addEventListener(type,e=>endStick(e,true));
  look.addEventListener('pointerdown',e=>{if(!active()||this.gaze)return;e.preventDefault();this.gaze={id:e.pointerId,x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId);});
  look.addEventListener('pointermove',e=>{if(this.gaze?.id!==e.pointerId||!active())return;this.queueLook((e.clientX-this.gaze.x)*.0036,(e.clientY-this.gaze.y)*.0036);this.gaze.x=e.clientX;this.gaze.y=e.clientY;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(type,e=>{if(this.gaze?.id===e.pointerId)this.gaze=null;});
  primary.addEventListener('pointerdown',e=>{if(!active()||this.action||!this.canAct())return;e.preventDefault();onGesture();this.chargeAt=world.time;this.action={id:e.pointerId,x:e.clientX,y:e.clientY};primary.setPointerCapture(e.pointerId);});
  primary.addEventListener('pointermove',e=>{if(this.action?.id!==e.pointerId||!active())return;this.queueLook((e.clientX-this.action.x)*.0036,(e.clientY-this.action.y)*.0036);this.action.x=e.clientX;this.action.y=e.clientY;});
  primary.addEventListener('pointerup',e=>{if(this.action?.id!==e.pointerId)return;const q=this.charge();this.action=null;if(active()&&world.phase==='swimming')onFire(q);});
  for(const type of ['pointercancel','lostpointercapture'])primary.addEventListener(type,e=>{if(this.action?.id===e.pointerId)this.action=null;});
  primary.addEventListener('click',e=>{if(e.detail===0&&active()&&world.phase==='swimming'){onGesture();onFire(.05);}});
  for(const [element,sign]of [[rise,1],[sink,-1]]){element.addEventListener('pointerdown',e=>{if(!active()||this.depth)return;e.preventDefault();this.depth={id:e.pointerId,element};this.y=sign;element.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{if(this.depth?.id===e.pointerId){this.depth=null;this.y=0;}});}
  addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!active())return;this.keys.add(e.code);if(e.code==='Space'&&!e.repeat&&!this.keyAction&&this.canAct()){onGesture();this.keyAction=true;this.chargeAt=world.time;}});
  addEventListener('keyup',e=>{this.keys.delete(e.code);if(e.code==='Space'&&this.keyAction){const q=this.charge();this.keyAction=false;if(active()&&world.phase==='swimming')onFire(q);}});
 }
 // Brief input filtering, no auto-aim. Shots use the same view shown on screen.
 queueLook(dx,dy){this.lookX+=dx;this.lookY=clamp(this.lookY+dy,this.world.pitch-.85,this.world.pitch+.85);}
 updateLook(dt){const a=1-Math.exp(-36*dt),dx=this.lookX*a,dy=this.lookY*a;this.lookX-=dx;this.lookY-=dy;this.world.look(dx,dy);}
 canAct(){return['swimming','secured','recovering'].includes(this.world.phase);}
 held(){return!!this.action||this.keyAction;}
 charge(){return this.held()&&this.world.phase==='swimming'?clamp((this.world.time-this.chargeAt)/.65,0,1):0;}
 read(){return{x:this.x+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),z:this.z+(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0),y:this.y+(this.keys.has('KeyE')?1:0)-(this.keys.has('KeyQ')?1:0),reel:this.held()&&['secured','recovering'].includes(this.world.phase)};}
 clear(){const captures=[[this.move,this.stick?.id],[this.look,this.gaze?.id],[this.primary,this.action?.id],[this.depth?.element,this.depth?.id]];this.stick=this.gaze=this.action=this.depth=null;this.keyAction=false;this.lookX=this.lookY=0;this.x=this.y=this.z=0;this.keys.clear();this.base.classList.remove('active');this.knob.style.transform='none';for(const [el,id]of captures)if(el&&id!==undefined&&el.hasPointerCapture(id))el.releasePointerCapture(id);this.onStop();}
 report(){return{...this.read(),charge:this.charge(),held:this.held(),lookPending:{x:this.lookX,y:this.lookY},owners:{move:this.stick?.id??null,look:this.gaze?.id??null,action:this.action?.id??null,depth:this.depth?.id??null},origin:this.stick?{x:this.stick.x,y:this.stick.y}:null};}
}
