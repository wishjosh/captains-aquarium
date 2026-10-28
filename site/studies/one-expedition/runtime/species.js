// Stable collection IDs: fish is the existing temporary clownfish; old chromis/jelly remain only tank IDs and archived records.
export const SPECIES=Object.freeze(['fish','puffer','moorish','cowfish']);
export const NEW_SPECIES=Object.freeze(SPECIES.slice(1));
export const SPECIES_INFO=Object.freeze({
 fish:Object.freeze({name:'흰동가리',model:'Clownfish',cm:8,description:'작은 주황빛 몸의 밝은 띠무늬와 반짝이는 눈을 살펴보세요.',holdingSlot:'fish'}),
 puffer:Object.freeze({name:'가시복',model:'Puffer',cm:25,description:'둥근 몸의 가시, 어두운 얼룩과 밝은 배를 살펴보세요.',holdingSlot:'chromis'}),
 moorish:Object.freeze({name:'깃대돔',model:'MoorishIdol',cm:20,description:'밝고 어두운 띠무늬와 길게 뻗은 등지느러미를 살펴보세요.',holdingSlot:'jelly'}),
 cowfish:Object.freeze({name:'뿔복',model:'Cowfish',cm:30,description:'노란 몸의 작은 밝은 반점과 머리의 뿔을 살펴보세요.',holdingSlot:'jelly'})
});
export const SPECIES_NAMES=Object.freeze(Object.fromEntries(SPECIES.map(k=>[k,SPECIES_INFO[k].name])));
export const stateFor=(progress,kind)=>kind==='fish'?progress:progress[kind];
// Common scene scale preserves the approved 8:25:20:30 size ratio. Close-up views fit the animal separately.
export function fishLength(kind,context='world'){
 const info=SPECIES_INFO[kind];if(!info)throw Error('Unknown fish kind');
 if(context==='viewer')return 1.65;if(context==='care')return 2.2;
 return info.cm*(context==='cargo'?.018:.05);
}
