import {SwimWorld} from './core.mjs';
import {EXTENDED_BOUNDS,extensionHeight} from './region-extension.mjs?v=2026-11-01-extension-1';
import {REGION,regionHeight} from './exploration-region.mjs?v=2026-11-01-extension-1';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Broad connected planes; collisions and rendered triangles sample the same grid.
export const TERRAIN={minX:-36,minZ:-42.25,step:1,columns:72,rows:72};
function localHeight(x,z){const base=-.24+.006*x-.004*z;const inReef=clamp((1.2-z)/3),east=clamp((x-2.0)/2.6),west=clamp((-x-2.8)/3);let h=base+inReef*(east*.85+west*.55)+clamp((-z-12)/6)*.24;const tongue=clamp((x-.65)/.65)*clamp((5.8-x)/.8)*clamp((-z-.25)/.55)*clamp((z+3.1)/.7);h=Math.max(h,.44*tongue-.24*(1-tongue));const notch=clamp(1-Math.abs(z+2.5+.22*x)/.55);return h-.1*notch*east;}
const authored=(x,z)=>extensionHeight(x,z,regionHeight(x,z,localHeight(x,z)));
export function reefFloor(x,z){const {minX,minZ,step,columns,rows}=TERRAIN;const gx=(x-minX)/step,gz=(z-minZ)/step,ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz,X=minX+ix*step,Z=minZ+iz*step;const a=authored(X,Z),b=authored(X+step,Z),c=authored(X,Z+step),d=authored(X+step,Z+step);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
export function reefCover(x,z){return clamp((reefFloor(x,z)+.1)/.65);}
export class ReefSwimWorld extends SwimWorld{constructor(tuning,{expanded=false}={}){super(tuning);this.bounds=expanded?EXTENDED_BOUNDS:REGION.bounds;}reset(){super.reset();this.position=[...REGION.spawn];}step(dt,input={}){super.step(dt,input);const p=this.position,min=reefFloor(p[0],p[2])+1.35;if(p[1]<min){p[1]=min;if(this.velocity[1]<0)this.velocity[1]=0;}}}

export function clearFollowerSeabed(members){for(const f of members){if(!['joining','following'].includes(f.state))continue;const min=reefFloor(f.position[0],f.position[2])+.32;if(f.position[1]<min){f.position[1]=min;f.velocity[1]=Math.max(0,f.velocity[1]);}}}
