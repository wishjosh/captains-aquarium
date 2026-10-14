const $ = id => document.getElementById(id);
const panel = $('tank-panel');
const canvas = $('animals');
const water = $('water');
const background = water.getContext('2d', { alpha: false });
const controls = [...document.querySelectorAll('button'), $('speed')];
controls.forEach(control => control.disabled = true);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
const fishCount = params.get('count') === '1' ? 1 : 3;
if(params.get('exhibit')==='1'){document.querySelector('.tank-tabs').hidden=true;document.querySelector('.edition').textContent='직접 데려온 친구';}
const state = { tank: params.get('tank') === 'jelly' ? 'jelly' : 'fish', paused: reducedMotion.matches, speed: 1, zoom: false, time: 0, ready: false };
let width = 1, height = 1, ratio = 1, last = 0, lastPaint = 0, backgroundTime = -99;
let renderer;
let disposed = false;
const imageAspect = { fish: 2/3, jelly: 1190/1322 };

const vertexSource = `
attribute vec2 a_uv;
uniform vec2 u_resolution;
uniform vec4 u_rect;
uniform float u_time;
uniform float u_kind;
uniform float u_facing;
uniform float u_angle;
varying vec2 v_uv;
void main(){
  vec2 q = a_uv;
  if(u_kind < 0.5){
    float tail = smoothstep(0.70, 1.0, q.x);
    float beat = sin(u_time * 7.8 - q.x * 5.0);
    q.y += beat * 0.040 * tail;
    q.x += sin(u_time * 7.8) * 0.032 * tail;
    float dorsal = (1.0 - smoothstep(0.18,0.39,q.y)) * smoothstep(0.17,0.30,q.x) * (1.0-smoothstep(0.70,0.85,q.x));
    q.y += sin(u_time*7.8+q.x*9.0) * 0.012 * dorsal;
    float pectoral = exp(-pow((q.x-0.40)/0.11,2.0)-pow((q.y-0.61)/0.14,2.0));
    q.x += sin(u_time*9.0) * 0.012 * pectoral;
    q.y += cos(u_time*9.0) * 0.013 * pectoral;
  } else {
    float pulse = sin(u_time * 2.45);
    float bell = 1.0 - smoothstep(0.45,0.67,q.y);
    q.x = 0.5 + (q.x-0.5) * (1.0 + 0.065 * pulse * bell);
    q.y += (q.y-0.15) * (-0.12 * pulse) * bell;
    float arms = smoothstep(0.55,0.94,q.y);
    q.x += sin(u_time*2.45 - q.y*8.0) * 0.022 * arms;
    q.y += pulse * 0.015 * arms;
  }
  vec2 p = (q-0.5) * u_rect.zw;
  p.x *= u_facing;
  float c=cos(u_angle), s=sin(u_angle);
  p = vec2(c*p.x-s*p.y,s*p.x+c*p.y)+u_rect.xy;
  gl_Position = vec4((p/u_resolution*2.0-1.0)*vec2(1.0,-1.0),0.0,1.0);
  v_uv = a_uv;
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D u_image;
varying vec2 v_uv;
void main(){
  vec4 color=texture2D(u_image,v_uv);
  if(color.a < 0.005) discard;
  gl_FragColor=color;
}`;

function createRenderer(images) {
  const gl = canvas.getContext('webgl', { alpha:true, premultipliedAlpha:false, antialias:true, preserveDrawingBuffer:true });
  if(!gl) return createFallback(images);
  function shader(type, source) {
    const result=gl.createShader(type);
    gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program=gl.createProgram();
  const vertex=shader(gl.VERTEX_SHADER,vertexSource), fragment=shader(gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const grid=[];
  const columns=38,rows=28;
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const x0=x/columns,x1=(x+1)/columns,y0=y/rows,y1=(y+1)/rows;
    grid.push(x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1);
  }
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(grid),gl.STATIC_DRAW);
  const uv=gl.getAttribLocation(program,'a_uv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','rect','time','kind','facing','angle','image'].map(name=>[name,gl.getUniformLocation(program,'u_'+name)]));
  const textures={};
  for(const [key,image] of Object.entries(images)){
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    textures[key]=texture;
  }
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1i(uniforms.image,0);
  return {
    kind:'webgl',
    draw(animals){
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.resolution,width,height);
      for(const a of animals){
        gl.bindTexture(gl.TEXTURE_2D,textures[state.tank]);
        gl.uniform4f(uniforms.rect,a.x,a.y,a.w,a.h);gl.uniform1f(uniforms.time,a.phase);
        gl.uniform1f(uniforms.kind,state.tank==='fish'?0:1);gl.uniform1f(uniforms.facing,a.facing);gl.uniform1f(uniforms.angle,a.angle);
        gl.drawArrays(gl.TRIANGLES,0,grid.length/2);
      }
    }
  };
}

function createFallback(images) {
  const replacement=document.createElement('canvas');
  replacement.id=canvas.id;replacement.setAttribute('role','img');replacement.setAttribute('aria-label',canvas.getAttribute('aria-label'));
  canvas.replaceWith(replacement);
  const ctx=replacement.getContext('2d');
  return {kind:'canvas2d',canvas:replacement,draw(animals){
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const image=images[state.tank];
    for(const a of animals){
      ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle);ctx.scale(a.facing,1);
      if(state.tank==='fish'){
        const slices=36,sw=image.width/slices;
        for(let i=0;i<slices;i++){
          const u=i/(slices-1),tail=Math.max(0,(u-.70)/.30);
          const offset=Math.sin(a.phase*7.8-u*5)*a.h*.04*tail;
          ctx.drawImage(image,i*sw,0,sw,image.height,-a.w/2+i*a.w/slices,-a.h/2+offset,a.w/slices+.5,a.h);
        }
      } else {
        const pulse=Math.sin(a.phase*2.45);ctx.scale(1+.04*pulse,1-.05*pulse);
        ctx.drawImage(image,-a.w/2,-a.h/2,a.w,a.h);
      }
      ctx.restore();
    }
  }};
}

const fish=[{lane:.35,size:.49,period:24,offset:.13,phase:0},{lane:.58,size:.39,period:29,offset:.63,phase:1.6},{lane:.77,size:.27,period:20,offset:.37,phase:3.1}];
const jellies=[{x:.33,y:.35,size:.57,phase:0},{x:.73,y:.62,size:.40,phase:1.8},{x:.31,y:.81,size:.31,phase:3.5}];

function animalsAt(time) {
  if(state.zoom){
    const w=Math.min(width*(state.tank==='fish'?.91:.86),height*.78/imageAspect[state.tank]);
    return [{x:width*.5,y:height*.48,w,h:w*imageAspect[state.tank],facing:1,angle:state.tank==='fish'?Math.sin(time*.65)*.025:Math.sin(time*.4)*.06,phase:time}];
  }
  if(state.tank==='fish')return fish.slice(0,fishCount).map((f,i)=>{
    const orbit=(time/f.period+f.offset)*Math.PI*2;
    const w=Math.min(width,height*.75/imageAspect.fish)*f.size;
    // The closed ellipse brings each fish around slowly, without an edge teleport.
    const facing=Math.cos(orbit)>=0?-1:1;
    return {x:width*(.5+Math.sin(orbit)*(.47-f.size*.5)),y:height*(f.lane+Math.cos(orbit)*.045+Math.sin(time*.9+i)*.009),w,h:w*imageAspect.fish,facing,angle:Math.sin(time*.7+i)*.025,phase:time+f.phase};
  });
  return jellies.slice(0,fishCount).map(j=>{
    const phase=time+j.phase,pulse=Math.sin(phase*2.45);
    const w=Math.min(width,height*.75/imageAspect.jelly)*j.size;
    return {x:width*(j.x+Math.sin(phase*.32)*.055),y:height*(j.y+Math.sin(phase*.28)*.038-pulse*.009),w,h:w*imageAspect.jelly,facing:1,angle:Math.sin(phase*.36)*.075,phase};
  });
}

function drawRock(ctx,x,y,w,h) {
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#577e86';ctx.strokeStyle='#345e6c';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-w*.5,0);ctx.bezierCurveTo(-w*.62,-h*.65,-w*.32,-h*1.08,0,-h);ctx.bezierCurveTo(w*.3,-h*1.16,w*.62,-h*.5,w*.5,0);ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<5;i++){
    const px=Math.sin(i*12.39)*w*.33,py=-h*(.18+((i*7)%11)/15);
    ctx.fillStyle='#365e6b';ctx.beginPath();ctx.ellipse(px,py,w*(.014+(i%3)*.009),h*.045,-.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawPlant(ctx,x,y,h,t) {
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<3;i++){
    const tipX=(i-2)*h*.13+Math.sin(t*.55+i*.8)*h*.08,tipY=-h*(.68+Math.sin(i*1.7)*.18);
    ctx.fillStyle=['#459d80','#65b48a','#83c598'][i];ctx.strokeStyle='#337d70';ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(tipX-h*.18,tipY*.3,tipX-h*.08,tipY*.8,tipX,tipY);ctx.bezierCurveTo(tipX+h*.09,tipY*.62,tipX+h*.15,tipY*.25,0,0);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
function drawWater(t) {
  const ctx=background;ctx.setTransform(ratio,0,0,ratio,0,0);
  const jelly=state.tank==='jelly';
  const gradient=ctx.createLinearGradient(0,0,width*.4,height);
  gradient.addColorStop(0,jelly?'#4c6eaf':'#91dedb');gradient.addColorStop(.5,jelly?'#34538c':'#65c4d2');gradient.addColorStop(1,jelly?'#233b70':'#3e9fbc');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  ctx.save();
  for(let i=0;i<5;i++){
    const x=width*(i*.27-.12)+Math.sin(t*.15+i)*width*.03;
    ctx.save();ctx.translate(x,0);ctx.rotate(-.13);
    const ray=ctx.createLinearGradient(-width*.055,0,width*.075,0);ray.addColorStop(0,'#c6ffff00');ray.addColorStop(.5,jelly?'#a1e2ff0c':'#e1ffff20');ray.addColorStop(1,'#c6ffff00');ctx.fillStyle=ray;
    ctx.fillRect(-width*.055,0,width*.13,height*1.1);ctx.restore();
  }
  ctx.restore();
  for(let i=0;i<12;i++){
    const x=width*((Math.sin(i*14.21)*.5+.5+Math.sin(t*.12+i)*.025+1)%1);
    const y=height*((i*.173-t*.003*(1+i%3)+10)%1);
    ctx.fillStyle=jelly?'#bddfff30':'#e8ffff36';ctx.beginPath();ctx.arc(x,y,i%4===0?1.6:.8,0,Math.PI*2);ctx.fill();
  }
  if(!jelly){
    ctx.fillStyle='#eadbb7';
    ctx.beginPath();ctx.moveTo(0,height*.88);ctx.bezierCurveTo(width*.28,height*.86,width*.6,height*.94,width,height*.88);ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();
    for(let i=0;i<16;i++){ctx.fillStyle='#ccb98b';ctx.beginPath();ctx.ellipse((Math.sin(i*15.1)*.5+.5)*width,height*(.91+((i*3)%17)/200),2.3,1.3,0,0,Math.PI*2);ctx.fill();}
    drawPlant(ctx,width*.06,height*.96,height*.22,t);drawPlant(ctx,width*.94,height*.97,height*.25,t+2);
    drawRock(ctx,width*.08,height*1.02,width*.26,height*.18);drawRock(ctx,width*.24,height*1.01,width*.18,height*.09);drawRock(ctx,width*.91,height*1.02,width*.28,height*.16);drawRock(ctx,width*.79,height*1.01,width*.16,height*.08);
  }
}

function resize() {
  const box=panel.getBoundingClientRect();width=box.width;height=box.height;
  ratio=Math.min(devicePixelRatio||1,2);
  for(const target of [water,renderer?.canvas||canvas]){target.width=Math.round(width*ratio);target.height=Math.round(height*ratio);}
  backgroundTime=-99;if(state.ready)paint(true);
}
function paint(force=false) {
  if(force||Math.abs(state.time-backgroundTime)>.07){drawWater(state.time);backgroundTime=state.time;}
  renderer.draw(animalsAt(state.time));
}
function frame(stamp) {
  if(disposed)return;
  const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;
  if(!state.paused&&!document.hidden)state.time+=dt*state.speed;
  if(state.ready&&!document.hidden&&(!state.paused||lastPaint===0)&&stamp-lastPaint>=1000/40){paint();lastPaint=stamp;}
  requestAnimationFrame(frame);
}
function updateControls(announce=true) {
  $('pause').setAttribute('aria-pressed',String(state.paused));$('pause-text').textContent=state.paused?'움직임 시작':'움직임 멈추기';$('pause-icon').textContent=state.paused?'▷':'Ⅱ';
  $('live-label').textContent=state.paused?'잠시 멈춤':state.tank==='fish'?'헤엄치는 중':'떠다니는 중';
  $('zoom').setAttribute('aria-pressed',String(state.zoom));$('zoom-text').textContent=state.zoom?'수조 전체 보기':'가까이 보기';$('view-label').textContent=state.zoom?'가까이 관찰':'수조 전체';
  panel.dataset.tank=state.tank;panel.setAttribute('aria-labelledby',params.get('exhibit')==='1'?'species-name':state.tank==='fish'?'fish-tab':'jelly-tab');
  document.querySelectorAll('[data-tank]').forEach(button=>{if(button.tagName==='BUTTON')button.setAttribute('aria-selected',String(button.dataset.tank===state.tank));});
  $('tank-name').textContent=state.tank==='fish'?'바위·모래 수조':'해파리 수조';$('species-name').textContent=state.tank==='fish'?'범돔':'보름달물해파리';
  $('animal-note').textContent=state.tank==='fish'?'노란 몸에 검은 줄무늬가 있는 친구':'몸을 오므렸다 펴며 천천히 떠올라요';
  (renderer?.canvas||canvas).setAttribute('aria-label',state.tank==='fish'?'범돔이 꼬리와 지느러미를 움직이며 헤엄치는 수조':'보름달물해파리가 몸을 수축하고 입 주변 부위를 흔들며 떠다니는 수조');
  if(announce)$('screen-status').textContent=`${$('species-name').textContent}, ${$('live-label').textContent}, ${$('view-label').textContent}`;
  backgroundTime=-99;if(state.ready)paint(true);
}

document.querySelectorAll('.tank-tabs button').forEach(button=>{
  button.addEventListener('click',()=>{state.tank=button.dataset.tank;state.zoom=false;updateControls();});
  button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'fish-tab':event.key==='End'?'jelly-tab':state.tank==='fish'?'jelly-tab':'fish-tab';$(next).focus();$(next).click();}});
});
$('pause').addEventListener('click',()=>{state.paused=!state.paused;updateControls();});
$('zoom').addEventListener('click',()=>{state.zoom=!state.zoom;updateControls();});
$('speed').addEventListener('input',event=>{
  state.speed=Number(event.target.value);
  const label=state.speed<1?'천천히':state.speed>1?'빠르게':'보통';
  $('speed-value').textContent=`${label} · ${state.speed}배`;event.target.setAttribute('aria-valuetext',`${label}, ${state.speed}배`);
});
document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden&&state.ready)paint(true);});
reducedMotion.addEventListener('change',event=>{if(event.matches){state.paused=true;updateControls();}});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.paused=true;$('load-error').hidden=false;$('load-error').textContent='수조를 다시 열어 주세요. 새로고침하면 친구들이 돌아와요.';});
window.addEventListener('pagehide',()=>{disposed=true;});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;last=0;requestAnimationFrame(frame);}});

function loadImage(src) {return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Image failed: '+src));image.src=src;});}
try {
  const [fishImage,jellyImage]=await Promise.all([loadImage('assets/stripey-flat.png'),loadImage('assets/moon-jelly-flat.png')]);
  imageAspect.fish=fishImage.height/fishImage.width;imageAspect.jelly=jellyImage.height/jellyImage.width;
  renderer=createRenderer({fish:fishImage,jelly:jellyImage});
  state.ready=true;controls.forEach(control=>control.disabled=false);$('loading').hidden=true;
  resize();updateControls(false);new ResizeObserver(resize).observe(panel);requestAnimationFrame(frame);
  // This small read-only hook supports checks of the actual rendering and controls.
  window.aquariumPreview={getState:()=>({...state,width,height,renderer:renderer.kind}),animalsAt};
} catch(error) {
  console.error(error);$('loading').hidden=true;$('load-error').hidden=false;
}
