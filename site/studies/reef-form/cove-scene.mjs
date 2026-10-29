import * as T from './runtime/vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
import {reefFloor,reefCover} from './reef-terrain.mjs?v=2026-10-29-clay-1';
import {coveObstacles} from './cove.mjs?v=2026-10-29-clay-1';
import {createReefDecor} from './reef-art.mjs?v=2026-10-29-clay-1';
import {createHabitat} from './habitat-scene.mjs?v=2026-10-29-clay-1';
export function createCoveScene(){
 const group=new T.Group(),solids=[],occluders=[];group.name='Continuous inclined reef with rock ledges';
 const groundMeshes=[],floorMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide});let terrainTriangles=0;
 // The same continuous surface is spatially tiled so visibility rays reject distant triangles.
 for(let tz=0;tz<8;tz++)for(let tx=0;tx<8;tx++){
  const geo=new T.PlaneGeometry(8,8,32,32);geo.rotateX(-Math.PI/2);geo.translate(-28+tx*8,0,-38+tz*8);const p=geo.attributes.position,colors=[],normals=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=reefFloor(x,z);p.setY(i,h);const c=new T.Color('#747474').lerp(new T.Color('#646464'),reefCover(x,z));colors.push(c.r,c.g,c.b);const n=new T.Vector3((reefFloor(x-.25,z)-reefFloor(x+.25,z))/.5,1,(reefFloor(x,z-.25)-reefFloor(x,z+.25))/.5).normalize();normals.push(n.x,n.y,n.z);}
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();geo.computeBoundingBox();const floor=new T.Mesh(geo,floorMaterial);floor.name='Continuous reef surface '+tx+':'+tz;floor.receiveShadow=true;group.add(floor);solids.push(floor);occluders.push(floor);groundMeshes.push(floor);terrainTriangles+=geo.index.count/3;
 }
 const habitat=createHabitat(reefFloor);group.add(habitat.group);solids.push(...habitat.solids);occluders.push(...habitat.occluders);
 const reef=createReefDecor(reefFloor);group.add(reef.group);occluders.push(...reef.occluders);
 group.updateMatrixWorld(true);
 return{group,solids,get occluders(){return[...groundMeshes,...habitat.occluders,...reef.occluders];},groundMeshes,colliders:coveObstacles(),setMode:mode=>reef.setMode(mode),update(dt){habitat.update(dt);reef.update(dt);},inspect(){return{reef:reef.inspect(),habitat:habitat.inspect(),layout:'one continuous inclined bedrock with three ledges, no column objects',terrainTriangles};}};
}
