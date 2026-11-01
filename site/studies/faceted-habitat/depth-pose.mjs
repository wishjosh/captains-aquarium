const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*Math.max(0,dt)));
export const DEPTH_PERIOD=1.7;
export function depthStroke(phase){const u=((phase/(2*Math.PI))%1+1)%1;const t=u<.42?u/.42:(1-u)/.58;return t*t*(3-2*t);}
// Actual motion drives strokes; floor clearance limits the head-first pose.
export class DepthPose{
 constructor(){this.rise=0;this.sink=0;this.dive=0;this.trail=0;}
 update(dt,verticalSpeed,cruise,clearance=Infinity){
  const speed=Number.isFinite(verticalSpeed)?verticalSpeed:0;
  const strength=clamp((Math.abs(speed)-.025)/.55,0,1);
  this.rise=smooth(this.rise,speed>0?strength:0,6,dt);
  this.sink=smooth(this.sink,speed<0?strength:0,6,dt);
  const room=clamp((clearance-1.55)/1.05,0,1);
  this.dive=Math.min(room,smooth(this.dive,this.sink*room,4.5,dt));
  this.trail=smooth(this.trail,this.dive,2.4,dt);
  const amount=this.rise+this.sink;
  return {rise:this.rise,sink:this.sink,amount,blend:amount*(1-.48*clamp(cruise,0,1)),dive:this.dive,trail:this.trail,room,strokeRate:amount*2*Math.PI/DEPTH_PERIOD};
 }
}
