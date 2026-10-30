import {clamp,damp,wrap} from './core.mjs';
// Presentation follows actual velocity; no new animation asset or position control.
export function fishPose(pose,velocity,yaw,dt){
 const flat=Math.hypot(velocity[0],velocity[2]),speed=Math.hypot(...velocity),active=clamp(speed/.18,0,1),turn=dt>0?wrap(yaw-(pose.yaw??yaw))/dt:0;
 pose.pitch=damp(pose.pitch||0,-clamp(Math.atan2(velocity[1],Math.max(.06,flat)),-.45,.45)*active,5,dt);
 pose.bank=damp(pose.bank||0,-clamp(turn*.09,-.14,.14)*active,5,dt);pose.yaw=yaw;return pose;
}
