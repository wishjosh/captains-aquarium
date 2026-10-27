import {clamp,smooth} from './core.mjs?v=2026-10-27-collection-loop-1';
// Authored animation curves. The animal's original rig/clip is never distorted.
export const MOTION=Object.freeze({anticipation:.65,enclosure:.66,recovery:1.35,docking:.38,maxViewRoll:.018,maxFovKick:1.8});
export function enclosurePose(age){const t=clamp(age/MOTION.enclosure,0,1),spring=1-Math.exp(-7*t)*(Math.cos(13*t)+.54*Math.sin(13*t)),squash=Math.sin(t*Math.PI*2)*Math.exp(-t*3);return {radius:.19+.24*spring,axes:[1+.3*squash,1-.22*squash,1-.08*squash],wobble:.025+.09*(1-t),energy:.4+.6*Math.sin(t*Math.PI)};}
export function membranePose(report){if(report.phase==='enclosing')return enclosurePose(report.phaseAge);const speed=Math.hypot(...report.velocity),pull=report.reeling?.05:0;return{radius:.43,axes:[1+pull,1-pull*.5,1-pull*.5],wobble:.02+Math.min(.025,speed*.01)+pull*.3,energy:report.phase==='docking'?.8:report.phase==='recovered'?.2:.45};}
export function flightPose(age,power){return {axes:[1+.065*Math.sin(age*16),1+.06*Math.cos(age*14),1.35+power*.3],wobble:.045};}
export class ViewMotion{
 constructor(){this.kick=0;this.kickVelocity=0;this.roll=0;this.yaw=0;}
 impulse(amount=1){this.kickVelocity+=amount*4;}
 update(dt,report,input,charge,reduced=false){const d=Math.min(dt,.05);this.kickVelocity+=(-this.kick*90-this.kickVelocity*18)*d;this.kick+=this.kickVelocity*d;const turn=(report.yaw-this.yaw)/Math.max(d,.001);this.yaw=report.yaw;const roll=clamp(-input.x*.012-turn*.002,-MOTION.maxViewRoll,MOTION.maxViewRoll);this.roll+=(roll-this.roll)*(1-Math.exp(-d*11));const speed=Math.hypot(...report.velocity);return{roll:reduced?0:this.roll,bob:reduced?0:Math.sin(report.time*5)*Math.min(.007,speed*.005),fov:58+(reduced?0:clamp(this.kick*7,0,MOTION.maxFovKick)-smooth(charge)*1.2),gunKick:this.kick,charge:clamp(charge,0,1)};}
 reset(){this.kick=this.kickVelocity=this.roll=this.yaw=0;}
}
