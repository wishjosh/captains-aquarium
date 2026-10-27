import * as T from '../../vendor/three.module.js?v=2026-10-20-jeju-rov-v1';
export function explorerNose(camera){
 const group=new T.Group();camera.add(group);
 const wood=new T.MeshStandardMaterial({color:'#76533b',roughness:.68}),brass=new T.MeshStandardMaterial({color:'#b79a58',metalness:.68,roughness:.34}),dark=new T.MeshStandardMaterial({color:'#253b3d',metalness:.2,roughness:.6});
 const hull=new T.Mesh(new T.SphereGeometry(1,28,16),wood);hull.scale.set(.275,.17,.38);group.add(hull);
 for(const z of [-.17,.12]){const rib=new T.Mesh(new T.TorusGeometry(.24,.012,6,32),brass);rib.rotation.x=Math.PI/2;rib.scale.set(1,1.48,.72);rib.position.set(0,.006,z);group.add(rib);}
 const neck=new T.Mesh(new T.CylinderGeometry(.092,.12,.15,24),brass);neck.rotation.x=Math.PI/2;neck.position.set(0,.108,-.15);group.add(neck);
 const inset=new T.Mesh(new T.SphereGeometry(1,18,12),dark);inset.scale.set(.11,.044,.18);inset.position.set(0,.14,-.04);group.add(inset);
 for(const side of [-1,1])for(const z of [-.12,.1]){const rivet=new T.Mesh(new T.SphereGeometry(.014,8,6),brass);rivet.position.set(side*.19,.11,z);group.add(rivet);}
 return{group,update(pose,input,aspect){group.position.set(0,-.59+Math.min(.006,pose.gunKick*.008),-.9);group.rotation.set(-.025+pose.gunKick*.035,0,-input.x*.018);group.scale.set(Math.min(1,aspect/1.5),1,1);},bounds(camera,w,h){group.updateMatrixWorld(true);const points=[];group.traverse(n=>{if(!n.isMesh)return;const pos=n.geometry.attributes.position;for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld).project(camera);if(v.z>=-1&&v.z<=1&&v.y>=-1&&v.y<=1&&v.x>=-1&&v.x<=1)points.push({x:(v.x*.5+.5)*w,y:(-.5*v.y+.5)*h});}});return{x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:h};}};
}
export function edgePoints(scene,flow){
 const geometry=new T.BufferGeometry(),positions=new Float32Array(64*3),sizes=new Float32Array(64),alphas=new Float32Array(64);geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('size',new T.BufferAttribute(sizes,1));geometry.setAttribute('alpha',new T.BufferAttribute(alphas,1));
 const material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{pixelRatio:{value:Math.min(devicePixelRatio,1.5)}},vertexShader:`attribute float size;attribute float alpha;uniform float pixelRatio;varying float opacity;void main(){opacity=alpha;gl_Position=vec4(position.xy,0.,1.);gl_PointSize=size*pixelRatio;}`,fragmentShader:`varying float opacity;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;if(r>1.)discard;float rim=smoothstep(.55,.85,r)*(1.-smoothstep(.87,1.,r));float shine=exp(-length(p-vec2(-.19,-.2))*24.);gl_FragColor=vec4(.75,.94,.91,opacity*(rim*.7+shine+.025));}`});
 const points=new T.Points(geometry,material);points.frustumCulled=false;points.renderOrder=1000;scene.add(points);
 return{sync(){flow.particles.forEach((p,i)=>{positions[i*3]=p.x;positions[i*3+1]=p.y;sizes[i]=p.size;alphas[i]=p.alpha;});geometry.setDrawRange(0,flow.particles.length);for(const a of Object.values(geometry.attributes))a.needsUpdate=true;}};
}
