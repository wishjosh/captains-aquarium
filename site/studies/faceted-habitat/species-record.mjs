import {readRecord,emptyRecord,SAVE_KEY} from './expedition.mjs';
export const CHROMIS_ID='chromis-notata',CLOWN_ID='clownfish-study';
export function speciesSaveKey(species){if(species===CLOWN_ID)return SAVE_KEY;if(species===CHROMIS_ID)return SAVE_KEY+':'+CHROMIS_ID;throw Error('Unknown expedition species');}
export function readSpeciesRecord(raw,species){speciesSaveKey(species);if(species===CLOWN_ID)return readRecord(raw);if(!raw)return emptyRecord();const saved=JSON.parse(raw);if(saved?.revision!==2||saved.speciesId!==species)throw Error('Mismatched species record');return readRecord(JSON.stringify(saved.record));}
export function writeSpeciesRecord(record,species){speciesSaveKey(species);const checked=readRecord(JSON.stringify(record));return JSON.stringify(species===CLOWN_ID?checked:{revision:2,speciesId:species,record:checked});}
