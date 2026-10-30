import {SwimWorld} from './core.mjs';
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bevel=(a,b,v)=>{let t=Math.max(0,Math.min(1,(v-a)/(b-a)));const e=.10;if(t<e)return t*t/(2*e)/(1-e);if(t>1-e)return (1-e-(1-t)*(1-t)/(2*e))/(1-e);return (t-e/2)/(1-e);};
const triangle=x=>Math.abs(((x%2)+2)%2-1);
export function shelfEdge(z){const knots=[[-24,3.3],[-12,3.6],[-9,3.8],[-7,3.65],[-5.5,2.9],[-4.2,3.2],[-3.1,2.35],[-2.0,2.85],[-.8,2.5],[.5,3.8],[2,5.4],[16,5.4]];for(let i=1;i<knots.length;i++){const[a,x]=knots[i-1],[b,y]=knots[i];if(z<=b)return x+(y-x)*Math.max(0,Math.min(1,(z-a)/(b-a)));}return 5.4;}
export function reefCover(x,z){return Math.max(smooth(shelfEdge(z)-.9,shelfEdge(z)+.1,x)*smooth(1.8,-1.1,z),smooth(-3,-6,x));}
export function reefFloor(x,z){
 const edge=shelfEdge(z),front=smooth(1.8,-1.1,z),base=-.19+.025*Math.sin(x*.31+z*.23);
 // Broad inclined beds with three bevelled breaks. No circular mounds or freestanding columns.
 const lower=.73*bevel(edge-.95,edge+.05,x);
 const middle=(.88+.22*triangle(z*.41))*bevel(edge+.48+.55*triangle(z*.35+1),edge+1.42+.55*triangle(z*.35+1),x);
 const upper=(.76+.23*triangle(z*.29))*bevel(edge+1.85+.9*triangle(z*.47),edge+3.04+.9*triangle(z*.47),x);
 const tilt=.09*triangle(z*.62+x*.19)*smooth(edge,edge+1,x);
 const fissure=.085*Math.exp(-Math.pow((z+2.75+.22*x)/.14,2))*smooth(edge+.15,edge+1.15,x);
 const shelf=base+front*(lower+middle+upper+tilt-fissure);
 const west=base+.65*smooth(-3.5,-6.3,x)+.28*smooth(-10,-15,z);
 // A low tongue of the same bedrock supports the anemone; its front stays below the resident's route.
 const tongueX=smooth(.78,1.30,x)*smooth(4.2,3.1,x),tongueZ=smooth(-.62,-1.02,z)*smooth(-2.45,-1.95,z);
 const tongue=base+(.69-base)*tongueX*tongueZ;
 return Math.max(shelf,west,tongue);
}
export class ReefSwimWorld extends SwimWorld{
 constructor(options){super(options);this.floor=reefFloor;}
 step(dt,input={}){super.step(dt,input);const p=this.position,minimum=this.floor(p[0],p[2])+1.35;if(p[1]<minimum){p[1]=minimum;if(this.velocity[1]<0)this.velocity[1]=0;}}
}
