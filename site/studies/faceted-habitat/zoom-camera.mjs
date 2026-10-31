import {zoomFieldOfView} from './view-zoom.mjs';
export const REVIEW_ZOOM={min:1/1.3,max:1/.65};
// The subject stays the same size during method changes; perspective changes continuously.
export function zoomProjection(scale,blend=0){const lens=1+(scale-1)*blend;return{fov:zoomFieldOfView(lens),radiusFactor:lens/scale};}
export function fitsFrame(scale,{baseRadius,blend=0,focus,yaw,pitch,aspect,subjects,paddingX=.10,paddingY=.20}){
 const {fov,radiusFactor}=zoomProjection(scale,blend),r=baseRadius*radiusFactor,tv=Math.tan(fov*Math.PI/360),th=tv*aspect;
 const dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)],dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 for(const {position,half}of subjects)for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const p=position.map((v,i)=>v-focus[i]+half[i]*[x,y,z][i]),depth=r-dot(p,dir);if(depth<=.1||Math.abs(dot(p,right))>depth*th*(1-paddingX)||Math.abs(dot(p,up))>depth*tv*(1-paddingY))return false;}
 return true;
}
export function frameScaleLimit(context){if(fitsFrame(REVIEW_ZOOM.max,context))return REVIEW_ZOOM.max;let lo=REVIEW_ZOOM.min,hi=REVIEW_ZOOM.max;if(!fitsFrame(lo,context))return lo;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(fitsFrame(mid,context))lo=mid;else hi=mid;}return lo;}
export function clearanceScale(baseRadius,currentRadius,hitDistance,margin=.38){return baseRadius/Math.max(.5,Math.min(currentRadius,currentRadius-hitDistance+margin));}
