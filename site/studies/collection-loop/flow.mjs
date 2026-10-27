// Screen-peripheral water cues. Spawning depends on actual speed, not input.
export class EdgeFlow{
 constructor(){this.seed=5171;this.particles=[];this.credit=0;this.spawned=0;this.speed=0;}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 clear(){this.particles.length=0;this.credit=0;this.speed=0;}
 update(dt,velocity,{reduced=false,paused=false}={}){
  this.speed=Math.hypot(...velocity);
  if(reduced||paused||this.speed<.02){this.clear();return;}
  const speed=Math.min(1,this.speed/1.65);this.credit+=dt*28*speed;
  while(this.credit>=1){this.credit--;for(const side of [-1,1])if(this.particles.length<64){this.particles.push({side,x:side*(.80+this.random()*.12),y:-.85+this.random()*1.65,age:0,life:.48+this.random()*.35,size:5+this.random()*13,drift:.06+this.random()*.14});this.spawned++;}}
  for(const p of this.particles){p.age+=dt;p.x+=p.side*p.drift*dt*(.6+speed);p.y+=dt*(.25+speed*.4);p.alpha=Math.sin(Math.PI*Math.min(1,p.age/p.life))*.35*speed;}
  this.particles=this.particles.filter(p=>p.age<p.life&&Math.abs(p.x)<1.13&&p.y<1.15);
 }
 report(){return{count:this.particles.length,spawned:this.spawned,speed:this.speed,capacity:64,peripheral:true,positions:this.particles.map(p=>({x:p.x,y:p.y,alpha:p.alpha}))};}
}
