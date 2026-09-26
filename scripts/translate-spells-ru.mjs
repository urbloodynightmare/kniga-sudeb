import fs from 'node:fs';
import {spellNames} from '../app/spell-names.js';

const source=JSON.parse(fs.readFileSync('data/spells.json','utf8'));
fs.mkdirSync('tmp',{recursive:true});
const progressFile='tmp/spells-ru-progress.json';
const progress=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile,'utf8')):{};
async function translate(spell,attempt=1){
  try{
    const request=async q=>{const body=new URLSearchParams({client:'gtx',sl:'en',tl:'ru',dt:'t',q}),response=await fetch('https://translate.googleapis.com/translate_a/single',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},body});if(!response.ok)throw Error(`HTTP ${response.status}`);const json=await response.json();return json[0].map(x=>x[0]).join('');};
    const [nameRu,schoolRu,timeRu,rangeRu,componentsRu,descriptionRu]=await Promise.all([spellNames[spell.id]||request(spell.name),request(spell.school),request(spell.time),request(spell.range),request(spell.components),request(spell.description)]);
    return {nameRu,schoolRu,timeRu,rangeRu,componentsRu,descriptionRu};
  }catch(error){
    if(attempt>=4)throw error;
    await new Promise(resolve=>setTimeout(resolve,500*attempt));
    return translate(spell,attempt+1);
  }
}

let cursor=0,completed=0;
async function worker(){
  while(cursor<source.length){
    const spell=source[cursor++];
    if(progress[spell.id])continue;
    progress[spell.id]=await translate(spell);
    completed++;
    if(completed%10===0){fs.writeFileSync(progressFile,JSON.stringify(progress,null,2));console.log(`Translated ${Object.keys(progress).length}/${source.length}`);}
  }
}
await Promise.all(Array.from({length:6},worker));
fs.writeFileSync(progressFile,JSON.stringify(progress,null,2));
const result=source.map(spell=>({...spell,...progress[spell.id]}));
if(result.some(x=>!x.nameRu||!x.descriptionRu))throw Error('Translation is incomplete');
fs.writeFileSync('data/spells.json',JSON.stringify(result,null,2)+'\n');
console.log(`Translated ${result.length} spells to Russian`);
