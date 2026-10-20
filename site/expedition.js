import * as T from './vendor/three.module.js?v=2026-10-20-anne-bucket-1';
import {PIER} from './campus-layout.js?v=2026-10-20-anne-bucket-1';
export const LADDER={x:PIER.x,z:PIER.ladderZ,deck:PIER.deck,waterX:0,waterZ:9,hold:.3,duration:2.6,landingZ:PIER.endZ-.65,bodyZ:PIER.ladderZ+.4};
export const WATER_ORIGIN={x:LADDER.x,y:-7.65,z:LADDER.z-LADDER.waterZ};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function waterWorld(p){return new T.Vector3(p.x+WATER_ORIGIN.x,p.y+WATER_ORIGIN.y,p.z+WATER_ORIGIN.z);}
export function zoomValue(value){return clamp(value,.8,1.65);}
export function autoLook(p,point,dt){const yaw=point?clamp(Math.atan2(point.x-p.x,p.z-point.z),-.48,.48):0,pitch=point?clamp(Math.atan2(point.y-p.y,Math.hypot(point.x-p.x,point.z-p.z)),-.3,.3):0;const blend=1-Math.exp(-dt*3);p.yaw+=(yaw-p.yaw)*blend;p.pitch+=(pitch-p.pitch)*blend;}
export function ladderIntent(area,player,dive,direction,vertical){if(area==='harbor')return Math.hypot(player.x-LADDER.x,player.z-LADDER.z)<1.05&&direction.z>.6;if(area==='underwater')return Math.hypot(dive.x,dive.z-LADDER.waterZ)<1.65&&dive.y>=2.35&&vertical>.25;return false;}
export function createLadder(){const group=new T.Group();group.name='Pier ladder / connected surface and reef';const wood=new T.MeshStandardMaterial({color:'#b3854f',roughness:.85}),metal=new T.MeshStandardMaterial({color:'#e0c888',roughness:.7});for(const x of [-.58,.58]){const rail=new T.Mesh(new T.CylinderGeometry(.075,.075,7.8,8),wood);rail.position.set(x,-1.7,0);group.add(rail);}for(let i=0;i<17;i++){const rung=new T.Mesh(new T.CylinderGeometry(.065,.065,1.15,8),i>12?metal:wood);rung.rotation.z=Math.PI/2;rung.position.set(0,-5.15+i*.43,0);group.add(rung);}group.position.set(LADDER.x,0,LADDER.z);group.traverse(n=>{if(n.isMesh)n.castShadow=true;});return group;}
