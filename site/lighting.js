import {HemisphereLight,DirectionalLight,PMREMGenerator} from './vendor/three.module.js?v=2026-10-17-clownfish-lighting-c-1';
import {RoomEnvironment} from './vendor/RoomEnvironment.js?v=2026-10-17-clownfish-lighting-c-1';
// Standard neutral viewing environment. No per-fish or per-eye material overrides.
export function studioEnvironment(scene,renderer){const room=new RoomEnvironment(),generator=new PMREMGenerator(renderer),target=generator.fromScene(room,.04);scene.environment=target.texture;room.dispose();generator.dispose();return target;}

// Approved C scene lighting; native fish geometry and materials are never touched.
export function aquariumLighting(scene,{keyPosition=[3,6,4]}={}){
 scene.environment=null;
 const fill=new HemisphereLight('#ffffff','#a7bdc9',7);fill.name='aquarium-c-fill';
 const key=new DirectionalLight('#ffffff',1);key.name='aquarium-c-key';key.position.set(...keyPosition);
 scene.add(fill,key);return {fill,key};
}
export function lightingState(scene){
 const fill=scene?.getObjectByName('aquarium-c-fill'),key=scene?.getObjectByName('aquarium-c-key');
 return {preset:fill&&key?'C':null,environment:!!scene?.environment,hemisphere:fill?{sky:'#'+fill.color.getHexString(),ground:'#'+fill.groundColor.getHexString(),intensity:fill.intensity}:null,directional:key?{color:'#'+key.color.getHexString(),intensity:key.intensity,position:key.position.toArray()}:null};
}
