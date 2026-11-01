// Throttle inspection snapshots only; simulation, rendering and input keep every frame.
export class InspectionCadence {
 constructor(intervalMs=250){this.intervalMs=intervalMs;this.last=-Infinity;this.key=null;this.frames=0;this.snapshots=0;}
 due(now,key){this.frames++;if(key===this.key&&now-this.last<this.intervalMs)return false;this.last=now;this.key=key;this.snapshots++;return true;}
 report(){return{intervalMs:this.intervalMs,frames:this.frames,snapshots:this.snapshots,atMs:this.last};}
}
export function setText(element,value){if(element.textContent===value)return false;element.textContent=value;return true;}
