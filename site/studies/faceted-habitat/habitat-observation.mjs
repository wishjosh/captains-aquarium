// A witnessed episode, separate from merely choosing the observation mode.
export class HabitatObservation{
 constructor(){this.reset();}
 reset(){this.home=false;this.emerged=false;this.dwell=0;this.previous='';}
 step(dt,{observing,visible,behavior,atRest}){
  const eligible=observing&&visible&&atRest;
  if(!eligible||this.previous!==behavior)this.dwell=0;
  this.previous=behavior;if(!eligible)return;
  this.dwell+=dt;if(this.dwell<.3)return;
  if(['home-return','canopy-shift','canopy-peek'].includes(behavior))this.home=true;
  if(this.home&&behavior==='canopy-emerged')this.emerged=true;
 }
 get note(){return this.emerged?'말미잘 가까이로 돌아왔다가 가장자리로 나오는 모습을 봤어요.':'';}
 report(){return{home:this.home,emerged:this.emerged,note:this.note};}
}
