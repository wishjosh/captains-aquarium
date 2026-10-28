import {clamp,wrap} from './core.mjs';

// Translate a screen-space direction into the existing captain locomotion.
// The basis follows the camera only at rest; the body retains its physical heading.
export class ScreenSteering {
 constructor(){this.reset();}
 reset(yaw=0){this.basisYaw=yaw;this.locked=false;this.target=null;this.oppositeAge=0;this.backstep=false;this.phase='idle';}
 control(dt,raw,w,cameraYaw){
  const x=clamp(raw.x||0),z=clamp(raw.z||0),y=clamp(raw.y||0);
  const hasDirection=Math.max(Math.abs(x),Math.abs(z))>.015;
  if(!hasDirection){
   this.target=null;this.oppositeAge=0;this.backstep=false;this.phase='idle';
   if(Math.hypot(w.velocity[0],w.velocity[2])<.035&&Math.abs(w.turnRate)<.06){this.locked=false;this.basisYaw=cameraYaw;}
   return{x:0,z:0,y};
  }
  if(!this.locked){this.basisYaw=cameraYaw;this.locked=true;}
  const magnitude=Math.min(1,Math.hypot(x,z)),c=Math.cos(this.basisYaw),s=Math.sin(this.basisYaw);
  const direction=[x*c-z*s,0,-x*s-z*c],heading=Math.atan2(direction[0],-direction[2]),error=wrap(heading-w.heading);
  if(this.target===null||Math.abs(wrap(heading-this.target))>.55){this.oppositeAge=0;this.backstep=Math.abs(error)>2.15;}
  this.target=heading;this.oppositeAge+=dt;
  // A short opposite input stands the body up and backs away before a sustained turn.
  if(this.backstep&&this.oppositeAge<.42){this.phase='backstep';return{x:0,z:-Math.min(.75,magnitude),y};}
  const turn=clamp(error*1.8)*Math.min(1,.25+magnitude),alignment=Math.max(0,Math.cos(error));
  this.phase=Math.abs(error)>.25?'turning':'swimming';
  return{x:turn,z:magnitude*alignment*alignment,y};
 }
 report(){return{basisYaw:this.basisYaw,locked:this.locked,target:this.target,phase:this.phase};}
}
