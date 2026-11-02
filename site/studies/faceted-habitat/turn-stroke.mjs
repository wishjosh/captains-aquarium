const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class TurnStroke{
 constructor(){this.signed=0;this.phase=0;}
 update(dt,turnRate){
  const target=Math.abs(turnRate)>.04?clamp(turnRate/1.1,-1,1):0;
  this.signed+=(target-this.signed)*(1-Math.exp(-7*Math.max(0,dt)));
  if(target===0&&Math.abs(this.signed)<.001)this.signed=0;
  const amount=Math.abs(this.signed);this.phase=(this.phase+dt*(2*Math.PI/1.6)*amount)%(2*Math.PI);
  return {signed:this.signed,amount,phase:this.phase};
 }
}
export function turnArm(side,turn){
 const sign=side==='L'?1:-1,inside=(side==='R'?1:-1)*turn.signed>0;
 const press=(1-Math.cos(turn.phase))*.5;
 return {role:turn.amount<.001?'idle':inside?'inside':'outside',hand:inside?
  [sign*(.57+.07*Math.sin(turn.phase)),-.10-.16*press,.24+.11*Math.sin(turn.phase)]:
  [sign*(.51+.14*Math.sin(turn.phase)**2),.78-1.12*press,.32-.24*press]};
}
