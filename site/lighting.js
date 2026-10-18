import {HemisphereLight,DirectionalLight,PMREMGenerator,Scene,Color,Mesh,PlaneGeometry,MeshBasicMaterial,DoubleSide} from './vendor/three.module.js?v=2026-10-18-underwater-four-fish-1';
import {RoomEnvironment} from './vendor/RoomEnvironment.js?v=2026-10-18-underwater-four-fish-1';
export function studioEnvironment(scene,renderer){const room=new RoomEnvironment(),generator=new PMREMGenerator(renderer),target=generator.fromScene(room,.04);scene.environment=target.texture;room.dispose();generator.dispose();return target;}
// Retain C solely for historical/source comparison pages.
export function aquariumLightingC(scene,{keyPosition=[3,6,4]}={}){scene.environment=null;const fill=new HemisphereLight('#ffffff','#a7bdc9',7),key=new DirectionalLight('#ffffff',1);fill.name='aquarium-c-fill';key.name='aquarium-c-key';key.position.set(...keyPosition);scene.add(fill,key);return{fill,key};}
const environments=new WeakMap();
export function portraitEnvironment(renderer){
 if(environments.has(renderer))return environments.get(renderer);
 const room=new Scene();room.background=new Color(.008,.012,.018);
 const add=(w,h,color,intensity,x,y,z,rx=0,ry=0)=>{const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(intensity),side:DoubleSide}),mesh=new Mesh(new PlaneGeometry(w,h),material);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,0);room.add(mesh);};
 add(12,8,'#e2e8e4',4,5,-5,5,-Math.PI/2);add(4,6,'#ffffff',15,5,7,-4,Math.PI/5,-Math.PI/4);add(1.5,2,'#ffffff',100,6,5,7,0,-Math.PI/3);
 const generator=new PMREMGenerator(renderer),target=generator.fromScene(room,.03,.1,100);generator.dispose();room.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});environments.set(renderer,target);return target;
}
// Approved B: same scene-wide reflection cards and lighting as the frozen portrait.
export function aquariumLighting(scene,{renderer,keyPosition=[3,7,5]}={}){
 if(!renderer)throw Error('B lighting requires the scene renderer');
 const target=portraitEnvironment(renderer);scene.environment=target.texture;scene.environmentIntensity=.3;renderer.toneMappingExposure=1.2;
 const fill=new HemisphereLight('#ffffff','#7c99a7',2.5),key=new DirectionalLight('#ffffff',3.5);fill.name='aquarium-b-fill';key.name='aquarium-b-key';key.position.set(...keyPosition);scene.add(fill,key);return{fill,key,environment:target};
}
export function lightingState(scene){
 const b=scene?.getObjectByName('aquarium-b-fill'),fill=b||scene?.getObjectByName('aquarium-c-fill'),key=scene?.getObjectByName(b?'aquarium-b-key':'aquarium-c-key');
 return{preset:fill&&key?(b?'B':'C'):null,environment:!!scene?.environment,environmentIntensity:scene?.environment?scene.environmentIntensity:0,hemisphere:fill?{sky:'#'+fill.color.getHexString(),ground:'#'+fill.groundColor.getHexString(),intensity:fill.intensity}:null,directional:key?{color:'#'+key.color.getHexString(),intensity:key.intensity,position:key.position.toArray()}:null};
}
