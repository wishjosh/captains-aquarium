import * as THREE from './vendor/three.module.js?v=2026-10-17-expedition-crew-1';
import { GLTFLoader } from './vendor/GLTFLoader.js?v=2026-10-17-expedition-crew-1';

const loader = new GLTFLoader();
const names = ['captain','anne','henry','mako','dock','house','palm','rock','anchor','barrel','chest'];
export async function loadPirateKit() {
  const loaded = await Promise.all(names.map(name => loader.loadAsync(`assets/pirate/${name}.gltf`)));
  return Object.fromEntries(names.map((name,i) => [name,loaded[i]]));
}
function prepare(root) {
  root.traverse(node => { if(node.isMesh) { node.castShadow=true; node.receiveShadow=true; } });
}
function fit(model, size, dimension='y') {
  const bounds=new THREE.Box3().setFromObject(model);
  const extent=bounds.getSize(new THREE.Vector3());
  const scale=size/extent[dimension];
  const offset=new THREE.Group();
  offset.scale.setScalar(scale);
  offset.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*scale/2);
  offset.add(model);
  const pivot=new THREE.Group();pivot.add(offset);prepare(model);return pivot;
}
export function createCaptain(asset) {
  const model=asset.scene;
  const pivot=fit(model,2.15);
  // Preserve the original asset and rig; the aquarium captain carries no sword.
  const cutlass=model.getObjectByName('Weapon_Cutlass');
  if(cutlass)cutlass.visible=false;
  const mixer=new THREE.AnimationMixer(model);
  const actions=Object.fromEntries(asset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  if(!actions.Idle||!actions.Walk) throw new Error('Captain requires Idle and Walk clips');
  let current=actions.Idle, oneShot=false;
  current.play();
  function switchTo(next,duration=.18) {
    if(current===next)return;
    const previous=current;current=next;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    previous.crossFadeTo(next,duration,false);
  }
  mixer.addEventListener('finished',event=>{if(event.action===current)oneShot=false;});
  pivot.userData.controller={
    update(dt,moving) {
      if(moving&&oneShot)oneShot=false;
      if(!oneShot) switchTo(moving?actions.Walk:actions.Idle);
      mixer.update(dt);
    },
    celebrate(name='Wave') {
      const action=actions[name];if(!action)return;
      action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
      oneShot=true;switchTo(action);
    },
    inspect() {
      let skins=0;const pose=[];
      model.traverse(n=>{if(n.isSkinnedMesh)skins++;if(n.isBone&&pose.length<32)pose.push(...n.quaternion.toArray());});
      return {source:'Quaternius Pirate Kit',clips:asset.animations.map(c=>c.name),skinnedMeshes:skins,action:current.getClip().name,time:current.time,pose};
    }
  };
  return pivot;
}
export function placeProp(scene,asset,x,z,size,dimension='y',angle=0) {
  const pivot=fit(asset.scene.clone(true),size,dimension);
  pivot.position.set(x,.12,z);pivot.rotation.y=angle;scene.add(pivot);return pivot;
}
