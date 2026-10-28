export const SAVE_KEY='captains-aquarium-one-expedition-preview';
export const emptyRecord=()=>({revision:1,trips:0,collected:0,discovered:false,observed:false,lastCount:0});
export function readRecord(raw){if(!raw)return emptyRecord();const r=JSON.parse(raw);if(r?.revision!==1||!['trips','collected','lastCount'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)||r.lastCount>3||r.collected<r.lastCount||typeof r.discovered!=='boolean'||typeof r.observed!=='boolean'||r.observed&&!r.discovered||r.collected>0&&!r.discovered)throw Error('Invalid expedition record');return{revision:1,trips:r.trips,collected:r.collected,discovered:r.discovered,observed:r.observed,lastCount:r.lastCount};}
export class Expedition {
 constructor(record=emptyRecord()){this.record=readRecord(JSON.stringify(record));this.stage='briefing';this.elapsed=0;this.stageAge=0;this.observations=new Set();this.discoveries=new Set();this.result=null;this.pending=[];this.committed=false;}
 begin(){if(!['briefing','complete'].includes(this.stage))return false;this.stage='exploring';this.elapsed=this.stageAge=0;this.observations.clear();this.discoveries.clear();this.result=null;this.pending=[];this.committed=false;return true;}
 discover(id){if(this.stage==='exploring')this.discoveries.add(id);}
 observe(id){if(this.stage==='exploring'){this.observations.add(id);this.discoveries.add(id);}}
 returnToBoat(){if(this.stage!=='exploring')return false;this.stage='returning';this.stageAge=0;return true;}
 cancelReturn(){if(this.stage!=='returning')return false;this.stage='exploring';this.stageAge=0;return true;}
 dock(members,leader){if(this.stage!=='returning')return false;const companions=members.filter(f=>f.enchanted);if(companions.some(f=>f.state!=='following'||leader&&Math.hypot(...f.position.map((v,i)=>v-leader[i]))>4))return false;this.pending=companions.map(f=>f.id);this.stage='closing';this.stageAge=0;return true;}
 step(dt){if(['exploring','returning'].includes(this.stage))this.elapsed+=dt;this.stageAge+=dt;if(this.stage==='closing'&&this.stageAge>1.8){this.stage='complete';this.stageAge=0;this.commit();}}
 commit(){if(this.stage!=='complete'||this.committed)return false;this.committed=true;this.result={count:this.pending.length,observed:this.observations.size,discovered:this.discoveries.size,seconds:Math.round(this.elapsed)};this.record={revision:1,trips:this.record.trips+1,collected:this.record.collected+this.pending.length,discovered:this.record.discovered||this.discoveries.size>0||this.pending.length>0,observed:this.record.observed||this.observations.size>0,lastCount:this.pending.length};return true;}
 inspect(){return{stage:this.stage,elapsed:this.elapsed,stageAge:this.stageAge,result:this.result,record:{...this.record}};}
}
