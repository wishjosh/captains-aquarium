export const STROKE_PERIOD=2.4;
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],ease(t)));
const reach=[.24,1.12,.42],catchPose=[.65,.63,.26],hip=[.29,-.47,.07],chest=[.22,.40,.34];
// Authored underwater pullout-inspired loop; timing is a game adaptation.
export function strokePose(phase){
 const u=((phase/(2*Math.PI))%1+1)%1;
 let stage,hand;
 if(u<.14){stage='reach';hand=[...reach];}
 else if(u<.28){stage='catch';hand=lerp(reach,catchPose,(u-.14)/.14);}
 else if(u<.43){stage='pull';hand=lerp(catchPose,hip,(u-.28)/.15);}
 else if(u<.72){stage='glide';hand=[...hip];}
 else if(u<.89){stage='recover';hand=lerp(hip,chest,(u-.72)/.17);}
 else{stage='extend';hand=lerp(chest,reach,(u-.89)/.11);}
 const kick=u>.30&&u<.60?Math.sin(Math.PI*(u-.30)/.30)**2:0;
 return {stage,u,hand,kick,gliding:stage==='glide'||stage==='reach'};
}
export function travelPitch(forward,vertical){
 return Math.max(.03,Math.min(2.62,Math.PI/2-Math.atan2(vertical,Math.max(.05,Math.abs(forward)))));
}
