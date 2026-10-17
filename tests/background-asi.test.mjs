import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive,setBackgroundAsiMode,validateSave} from '../app/engine.js';
const d=normalizeDataset(JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url))));
const hero=()=>createCharacter({classId:'monk',raceId:'half-elf',backgroundId:'noble',stats:{str:8,dex:14,con:14,int:10,wis:14,cha:10}});
const asi=c=>derive(c,d).choices.find(q=>q.backgroundAsi);

test('background defaults to its own abilities and a character can opt into all six',()=>{
 let c=hero(),q=asi(c);assert.deepEqual(q.allowed,['str','int','cha']);assert.equal(q.freeDistribution,false);
 c.choices[q.key]={dex:2,wis:1};assert.equal(asi(c).complete,false);assert.equal(derive(c,d).stats.dex,14);
 c=setBackgroundAsiMode(c,d,q.key,true);q=asi(c);assert.equal(q.allowed.length,6);assert.equal(q.complete,true);
 assert.equal(derive(c,d).stats.dex,16);assert.equal(derive(c,d).stats.wis,15);assert.equal(q.total,3);assert.equal(q.max,2);
 const another=hero();assert.equal(asi(another).freeDistribution,false,'mode belongs to one character');
});

test('free mode rejects overspending, +3 in one score, fractions, negatives and scores over 20',()=>{
 let c=hero();const key=asi(c).key;c=setBackgroundAsiMode(c,d,key,true);
 for(const points of [{dex:2,wis:2},{dex:3},{dex:1.5,wis:1.5},{dex:-1,wis:2},{dex:2,wis:1,invalid:0}]){
  c.choices[key]=points;assert.equal(asi(c).complete,false,JSON.stringify(points));assert.equal(derive(c,d).stats.dex,14,'invalid allocations give no bonuses');
 }
 c.stats.dex=19;c.choices[key]={dex:2,wis:1};assert.equal(asi(c).complete,false);assert.equal(derive(c,d).stats.dex,19);
 c.choices[key]={dex:1,wis:1,con:1};assert.equal(asi(c).complete,true);assert.equal(derive(c,d).stats.dex,20);
});

test('returning to standard mode keeps allowed bonuses and removes only out-of-list bonuses',()=>{
 let c=hero();const key=asi(c).key;c=setBackgroundAsiMode(c,d,key,true);c.choices[key]={dex:2,cha:1};
 const before=structuredClone(c);c=setBackgroundAsiMode(c,d,key,false);
 assert.deepEqual(before.choices[key],{dex:2,cha:1},'mode change is immutable');
 assert.deepEqual(c.choices[key],{cha:1});assert.equal(derive(c,d).stats.dex,14);assert.equal(derive(c,d).stats.cha,11);assert.equal(asi(c).complete,false);
 c.choices[key]={str:2,cha:1};assert.equal(asi(c).complete,true);
});

test('free background choice survives backup round trip and level up but does not unlock feat ASIs',()=>{
 let c=hero();const key=asi(c).key;c=setBackgroundAsiMode(c,d,key,true);c.choices[key]={dex:2,wis:1};
 const [copy]=validateSave({format:'book-of-fates',version:1,characters:[c]},d);assert.equal(asi(copy).freeDistribution,true);assert.equal(asi(copy).complete,true);
 copy.level=4;assert.equal(derive(copy,d).stats.dex,16);
 const feat=derive(copy,d).choices.find(q=>q.id==='monk-feat-4');copy.choices[feat.key]=0;
 const featAsi=derive(copy,d).choices.find(q=>q.type==='asi-flexible');assert.equal(featAsi.backgroundAsi,false);
 assert.throws(()=>setBackgroundAsiMode(copy,d,featAsi.key,true),/недоступно/);
 copy.backgroundId='sage';assert.equal(asi(copy).freeDistribution,false,'another background keeps its standard mode');
});
