import test from 'node:test';
import assert from 'node:assert/strict';
import {DepthPose,DEPTH_PERIOD} from './depth-pose.mjs';
const run=(p,speed,cruise=0,seconds=1)=>{let r;for(let t=0;t<seconds;t+=1/60)r=p.update(1/60,speed,cruise);return r;};
test('stationary ascent and descent engage independently of forward swimming',()=>{
 for(const speed of [.7,-.7]){const r=run(new DepthPose(),speed);assert.ok(r.blend>.99);assert.ok((speed>0?r.rise:r.sink)>.99);assert.equal(speed>0?r.sink:r.rise,0);}
});
test('direction reversal blends without a discontinuity or excessive total strength',()=>{
 const p=new DepthPose();run(p,.7);let before=p.rise;
 for(let i=0;i<120;i++){const r=p.update(1/60,-.7,0);assert.ok(r.amount<=1.000001);assert.ok(Math.abs(r.rise-before)<.1);before=r.rise;}
 assert.ok(p.sink>.99&&p.rise<.001);
});
test('coasting comes to rest and blocked motion does not sustain an animation',()=>{
 const p=new DepthPose();run(p,.7);const r=run(p,0,0,2);assert.ok(r.amount<.00001);assert.equal(run(new DepthPose(),.01).amount,0);
});
test('forward motion retains a controlled depth contribution',()=>{
 const r=run(new DepthPose(),.7,1);assert.ok(r.blend>.51&&r.blend<.53);
});
test('blend is independent of frame rate and zero time preserves the pose',()=>{
 const a=new DepthPose(),b=new DepthPose();for(let i=0;i<60;i++)a.update(1/60,.7,0);for(let i=0;i<30;i++)b.update(1/30,.7,0);assert.ok(Math.abs(a.rise-b.rise)<1e-12);const value=a.rise;a.update(0,-.7,0);assert.equal(a.rise,value);
});

test('depth motion uses the same 2.4 second period as the authored cycle',()=>{const r=run(new DepthPose(),-.7);const period=2*Math.PI/r.strokeRate;assert.ok(period>=2.4&&period<2.42);assert.equal(DEPTH_PERIOD,2.4);});
test('head-first turn leads the legs then both settle',()=>{const p=new DepthPose();let r;for(let i=0;i<30;i++)r=p.update(1/60,-.7,0,4);assert.ok(r.dive>r.trail+.1);for(let i=0;i<240;i++)r=p.update(1/60,-.7,0,4);assert.ok(r.dive>.99&&r.trail>.99);});
test('nearby seabed limits diving even on a sudden clearance change',()=>{const p=new DepthPose();run(p,-.7);let r=p.update(1/60,-.7,0,1.4);assert.equal(r.dive,0);for(let i=0;i<180;i++)r=p.update(1/60,0,0,1.4);assert.ok(r.trail<.001&&r.amount<.001);});
