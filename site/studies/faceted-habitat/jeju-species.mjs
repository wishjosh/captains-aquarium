// Game-sized silhouettes and encounter roles, based on the references in ATTRIBUTION.md.
export const BIODIVERSITY_VERSION='2026-11-10-life-3';
export const SPECIES=[
 {id:'chromis',name:'자리돔',role:'대표 만남',where:'모래 물길 끝의 첫 바위턱',note:'작은 무리가 바위턱 위를 오가요. 터치해 관찰하고 함께 귀환할 수 있어요.',color:'#9b9f89'},
 {id:'softcoral',name:'연산호 군락',role:'대표 풍경',where:'바위 안쪽 정원과 동쪽 산호턱',note:'부드러운 가지가 모여 만든 군락이에요. 크기와 빈 공간을 비교해 보세요.',color:'#d4948e'},
 {id:'rockbream',name:'돌돔',where:'동쪽 모자반 바위밭',note:'높고 납작한 몸과 검은 세로 띠를 살펴보세요.',color:'#b9c4bc',count:6,length:.76,height:.30,thickness:.135,tail:'fork',speed:.30,pattern:'bars'},
 {id:'stripey',name:'범돔',where:'동쪽 산호턱',note:'노란 몸의 비스듬한 검은 띠와 둥근 옆모습이 보여요.',color:'#d8b74f',count:8,length:.58,height:.36,thickness:.10,tail:'round',speed:.24,pattern:'diagonal'},
 {id:'wrasse',name:'용치놀래기',where:'감태숲 가장자리',note:'길쭉한 몸과 작은 입, 몸 옆의 짙은 줄을 찾아보세요. 암컷의 띠와 점줄을 단순화해 표현했어요.',color:'#bd944f',count:8,length:.66,height:.14,thickness:.095,tail:'round',speed:.41,pattern:'line'},
 {id:'blue',name:'파랑돔',where:'낮은 암반과 산호 주변',note:'작은 파란 몸과 노란 꼬리를 찾아보세요.',color:'#3877c9',count:14,length:.36,height:.23,thickness:.105,tail:'fork',speed:.38,pattern:'blue'},
 {id:'puffer',name:'가시복',where:'연산호 정원 안쪽',note:'옆길을 돌아 들어가면 만날 수 있어요. 몸의 무늬와 작은 지느러미를 살펴보세요.',color:'#b9ad81'},
 {id:'fan',name:'부채뿔산호',where:'동쪽 암반의 산호턱',note:'붉은 가지가 한 평면에 부채처럼 퍼져 있어요. 가지 사이로 바다가 보여요.',color:'#bb6960'},
 {id:'kelp',name:'감태',where:'서쪽 해조숲',note:'바위에 붙은 밑동과 긴 줄기, 위쪽으로 갈라진 넓은 잎을 살펴보세요.',color:'#6b7848'},
 {id:'sargassum',name:'모자반류',where:'동쪽 낮은 바위밭',note:'작은 잎과 기낭이 달린 여러 갈래의 줄기를 찾아보세요.',color:'#98864a'},
 {id:'urchin',name:'보라성게',where:'양쪽 암반 표면',note:'낮고 둥근 몸에서 가시가 돋아 있어요. 바위 위를 자세히 살펴보세요.',color:'#77536d'}
];
export const FISH_SPECIES=SPECIES.filter(s=>s.count);
export const COAST_GROUPS=[
 {kind:'wrasse',center:[-7.8,3.8],radius:[1.5,2.1],count:4,lift:.55},
 {kind:'wrasse',center:[-8.8,-8],radius:[1.4,2.0],count:4,lift:.6},
 {kind:'rockbream',center:[7.1,1.8],radius:[1.7,2.1],count:3,lift:.95},
 {kind:'rockbream',center:[8.4,-9.0],radius:[1.7,2.1],count:3,lift:1.0},
 {kind:'stripey',center:[8.8,-14.5],radius:[1.3,2.0],count:4,lift:1.2},
 {kind:'stripey',center:[5.0,-22],radius:[1.3,1.7],count:4,lift:1.1},
 {kind:'blue',center:[4.8,-3.0],radius:[1.9,1.1],count:7,lift:.75},
 {kind:'blue',center:[7.9,-17],radius:[1.9,1.2],count:7,lift:.9}
];
export class EncounterBook {
 constructor(){this.seen=new Set();this.ages=new Map();this.last=null;}
 observe(id,visible,dt){if(!SPECIES.some(s=>s.id===id)||this.seen.has(id))return false;const age=visible?(this.ages.get(id)||0)+dt:0;this.ages.set(id,age);if(age<.9)return false;this.seen.add(id);this.last=id;return true;}
 mark(id){if(SPECIES.some(s=>s.id===id))this.seen.add(id);}
 report(){return{seen:[...this.seen],total:SPECIES.length,last:this.last};}
}
