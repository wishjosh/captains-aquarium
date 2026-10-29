// A composed bedrock shelf and sediment channel; not a surveyed Jeju bathymetry.
import {SwimWorld} from './core.mjs';
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function reefCover(x,z){const axis=.7*Math.sin(z*.24),distance=Math.abs(x-axis),edge=2.0+.3*Math.sin(z*.61);return smooth(edge,edge+2.3,distance);}
export function reefFloor(x,z){
 const old=-.22+.08*Math.sin(x*.48+z*.22)+.055*Math.cos(z*.55-x*.25);
 const cover=reefCover(x,z),depth=smooth(2,-14,z),ridges=1.20+.34*Math.sin(z*.43+x*.19)+.24*Math.cos(x*.65-z*.3);
 const back=smooth(-9,-18,z)*(.38+.16*Math.sin(x*.7));
 // The encounter's small sand pocket preserves its existing anemone and fish elevations.
 const pocket=Math.exp(-((x-1.65)**2/3.4+(z+1.2)**2/4.8));
 const kelpPocket=Math.exp(-((x-4.0)**2/2.5+(z+8.0)**2/3.5));
 return old+cover*(ridges+back)*(1-pocket*.95)*(1-kelpPocket*.48)-.26*depth*(1-cover)*(1-pocket);
}
export class ReefSwimWorld extends SwimWorld{
 step(dt,input={}){super.step(dt,input);const p=this.position,minimum=reefFloor(p[0],p[2])+1.35;if(p[1]<minimum){p[1]=minimum;if(this.velocity[1]<0)this.velocity[1]=0;}}
}
