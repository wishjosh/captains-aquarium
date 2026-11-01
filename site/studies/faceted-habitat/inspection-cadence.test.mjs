import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InspectionCadence,setText} from './inspection-cadence.mjs';
test('expensive snapshots stay at four per second at both 60 and 120 render Hz',()=>{
 for(const hz of [60,120]){const c=new InspectionCadence();let built=0;for(let i=0;i<hz*10;i++)if(c.due(i*1000/hz,'exploring'))built++;assert.equal(built,40);assert.equal(c.frames,hz*10);}
});
test('pause, choice and resume are published immediately, without catch-up after a gap',()=>{
 const c=new InspectionCadence();assert(c.due(0,'exploring'));assert(!c.due(10,'exploring'));assert(c.due(15,'choice'));assert(c.due(20,'paused'));assert(!c.due(30,'paused'));assert(c.due(30000,'paused'));assert(!c.due(30001,'paused'));assert(c.due(30002,'choice'));assert.equal(c.snapshots,5);
});
test('unchanged text preserves its text node while a real state change is written',()=>{
 let value='다가가는 중',writes=0;const el={get textContent(){return value;},set textContent(v){value=v;writes++;}};
 for(let i=0;i<600;i++)setText(el,'다가가는 중');assert.equal(writes,0);assert(setText(el,'관찰 중'));assert.equal(writes,1);assert.equal(value,'관찰 중');
});
