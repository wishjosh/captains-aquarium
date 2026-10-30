export class SwimInput {
 constructor({move,look,base,knob,rise,sink,active}){
  Object.assign(this,{move,look,base,knob,active});this.keys=new Set();this.stick=null;this.gaze=null;this.depth=null;this.x=0;this.z=0;this.y=0;this.lookX=0;this.lookY=0;
  move.addEventListener('pointerdown',e=>{if(!active()||this.stick||e.button!==0)return;e.preventDefault();this.stick={id:e.pointerId,x:e.clientX,y:e.clientY};base.style.left=(e.clientX-46)+'px';base.style.top=(e.clientY-46)+'px';base.style.bottom='auto';base.classList.add('active');move.setPointerCapture(e.pointerId);});
  move.addEventListener('pointermove',e=>{if(this.stick?.id!==e.pointerId)return;const dx=e.clientX-this.stick.x,dy=e.clientY-this.stick.y,n=Math.hypot(dx,dy),radius=46,scale=n>radius?radius/n:1,m=Math.max(0,(Math.min(n/radius,1)-.12)/.88);this.x=n?dx/n*m:0;this.z=n?-dy/n*m:0;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])move.addEventListener(type,e=>{if(this.stick?.id!==e.pointerId)return;this.stick=null;this.x=this.z=0;knob.style.transform='';base.classList.remove('active');});
  look.addEventListener('pointerdown',e=>{if(!active()||this.gaze||e.button!==0)return;e.preventDefault();this.gaze={id:e.pointerId,x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId);});
  look.addEventListener('pointermove',e=>{if(this.gaze?.id!==e.pointerId)return;this.lookX+=(e.clientX-this.gaze.x)*.007;this.lookY+=(e.clientY-this.gaze.y)*.004;this.gaze.x=e.clientX;this.gaze.y=e.clientY;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(type,e=>{if(this.gaze?.id===e.pointerId)this.gaze=null;});
  for(const [el,sign] of [[rise,1],[sink,-1]]){el.addEventListener('pointerdown',e=>{if(!active()||this.depth)return;e.preventDefault();this.depth={id:e.pointerId,el};this.y=sign;el.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{if(this.depth?.id===e.pointerId){this.depth=null;this.y=0;}});}
  addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|BUTTON)$/.test(e.target.tagName))return;if(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(active())this.keys.add(e.code);}});addEventListener('keyup',e=>this.keys.delete(e.code));
 }
 read(){const k=(...s)=>s.some(x=>this.keys.has(x))?1:0;return{x:this.x+k('KeyD','ArrowRight')-k('KeyA','ArrowLeft'),z:this.z+k('KeyW','ArrowUp')-k('KeyS','ArrowDown'),y:this.y+k('KeyE')-k('KeyQ')};}
 lookDelta(){const r=[this.lookX,this.lookY];this.lookX=this.lookY=0;return r;}
 clear(){const captures=[[this.move,this.stick?.id],[this.look,this.gaze?.id],[this.depth?.el,this.depth?.id]];this.stick=this.gaze=this.depth=null;this.x=this.z=this.y=this.lookX=this.lookY=0;this.keys.clear();this.knob.style.transform='';this.base.classList.remove('active');for(const [el,id]of captures)if(el&&id!==undefined&&el.hasPointerCapture(id))el.releasePointerCapture(id);}
}
