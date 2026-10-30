import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {SoftGate} from './camera-policy.mjs';
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export class ViewOcclusion{
 constructor(actor,solids,renderer){this.samples=renderer.getContext().getParameter(renderer.getContext().SAMPLES);this.actor=actor;this.rocks=solids.filter(n=>n.name!=='Sandy passage');this.rockSet=new Set(this.rocks);this.actorGate=new SoftGate(.24,.5);this.rockGate=new SoftGate(.08,.65);this.ray=new T.Raycaster();this.from=new T.Vector3();this.body=new T.Vector3();this.fish=new T.Vector3();this.active=false;this.uniforms={clearCamera:{value:this.from},clearBody:{value:this.body},clearFish:{value:this.fish},clearActor:{value:0},clearRock:{value:0},clearSelected:{value:0},clearCoverage:{value:this.samples>0?1:0}};actor.traverse(n=>{if(n.isMesh&&n.visible)this.patch(n,1);});for(const n of this.rocks)this.patch(n,0);}
 patch(mesh,kind){const convert=source=>{const m=source.clone(),previous=source.onBeforeCompile;m.alphaToCoverage=this.samples>0;m.onBeforeCompile=shader=>{previous.call(m,shader);Object.assign(shader.uniforms,this.uniforms);shader.uniforms.clearKind={value:kind};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 clearWorld;').replace('#include <project_vertex>',`#include <project_vertex>
 vec4 clearLocal=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 clearLocal=instanceMatrix*clearLocal;
 #endif
 clearWorld=(modelMatrix*clearLocal).xyz;`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 clearWorld;uniform vec3 clearCamera,clearBody,clearFish;uniform float clearActor,clearRock,clearSelected,clearKind,clearCoverage;
 float clearTube(vec3 p,vec3 end,float radius){vec3 axis=end-clearCamera;float len=length(axis);vec3 dir=axis/max(len,.001);float t=dot(p-clearCamera,dir);float radial=length(p-clearCamera-dir*t);float width=mix(.65,radius,clamp(t/max(len,.001),0.0,1.0));return (1.0-smoothstep(width*.55,width,radial))*smoothstep(-.2,.25,t)*(1.0-smoothstep(len-.35,len-.08,t));}
`).replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
 float clearMask=0.0;
 if(clearKind>.5){clearMask=clearActor*clearTube(clearWorld,clearFish,.55);}
 else {float nearCamera=1.0-smoothstep(.55,1.35,distance(clearWorld,clearCamera));float bodyTube=clearTube(clearWorld,clearBody,1.35);float fishTube=clearSelected*clearTube(clearWorld,clearFish,.62);clearMask=max(nearCamera,clearRock*max(bodyTube,fishTube));}
 // Fixed screen-space coverage: no random time noise, blending order or depth-write changes.
 float coverage=fract(dot(floor(gl_FragCoord.xy),vec2(.754877666,.569840296)));
 if(clearCoverage>.5){diffuseColor.a*=1.0-clearMask*.98;}else if(coverage<clearMask*.98)discard;`);};m.customProgramCacheKey=()=>source.customProgramCacheKey()+':local-view-clear-v2:'+kind;return m;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);}
 hits(from,to,objects){const delta=to.clone().sub(from),len=delta.length();this.ray.set(from,delta.normalize());this.ray.near=.05;this.ray.far=Math.max(.05,len-.24);return this.ray.intersectObjects(objects,true);}
 step(dt,camera,position,target,snap=false){this.from.copy(camera.position);this.body.fromArray(position);this.body.y+=.1;this.active=!!target;if(target)this.fish.fromArray(target);else{this.actorGate.latched=false;this.actorGate.offAge=this.actorGate.hold;}const actorBlocked=!!target&&this.hits(this.from,this.fish,[this.actor]).length>0;const rockBlocked=this.hits(this.body,this.from,this.rocks).length>0||this.hits(this.from,this.body,this.rocks).length>0||!!target&&this.hits(this.from,this.fish,this.rocks).length>0;if(snap){this.actorGate.reset();this.rockGate.reset();}this.uniforms.clearActor.value=this.actorGate.step(dt,actorBlocked);this.uniforms.clearRock.value=this.rockGate.step(dt,rockBlocked);this.uniforms.clearSelected.value=T.MathUtils.damp(this.uniforms.clearSelected.value,target?1:0,4,dt);this.blocked={actor:actorBlocked,rock:rockBlocked};}
 tube(point,end,radius){const axis=end.clone().sub(this.from),len=axis.length(),dir=axis.divideScalar(Math.max(len,.001)),v=point.clone().sub(this.from),t=v.dot(dir),r=v.addScaledVector(dir,-t).length(),width=T.MathUtils.lerp(.65,radius,T.MathUtils.clamp(t/Math.max(len,.001),0,1));return(1-smooth(width*.55,width,r))*smooth(-.2,.25,t)*(1-smooth(len-.35,len-.08,t));}
 clears(hit){let n=hit.object,actor=false;for(let p=n;p;p=p.parent)if(p===this.actor)actor=true;if(actor)return this.active&&this.actorGate.value*this.tube(hit.point,this.fish,.55)>.55;if(!this.rockSet.has(n))return false;const near=1-smooth(.55,1.35,hit.point.distanceTo(this.from)),tube=Math.max(this.tube(hit.point,this.body,1.35),this.active?this.tube(hit.point,this.fish,.62):0);return Math.max(near,this.rockGate.value*tube)>.55;}
 report(){return{coverageSamples:this.samples,actor:this.actorGate.value,rock:this.rockGate.value,blocked:this.blocked,selected:this.active};}
}
