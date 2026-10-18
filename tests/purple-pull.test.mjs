import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive,rest} from '../app/engine.js';import {activeAbilities,useActiveAbility} from '../app/active-abilities.js';
const raw=JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url))),d=normalizeDataset(raw);
const monk=level=>createCharacter({classId:'monk',subclassId:'purple-lightning',level,stats:{str:8,dex:18,con:14,int:10,wis:16,cha:10}});
test('Purple Pull unlocks at subclass level and Zidian reaches 15 feet',()=>{
 assert.ok(!derive(monk(2),d).traits.some(t=>t.id==='purple-pull'));
 const c=monk(5),s=derive(c,d),ability=activeAbilities(c,s).find(a=>a.id==='purple-pull');
 assert.equal(s.classAttacks.find(a=>a.id==='purple-zidian').reach,15);assert.ok(ability.description.includes('Сл 14'));assert.ok(ability.description.includes('до 10 футов'));assert.equal(ability.variants.length,2);
});
test('both pull variants spend exactly one shared focus, with ordinary rest recovery',()=>{
 let c=monk(3);for(const v of ['hit','held','hit'])c=useActiveAbility(c,derive(c,d),'purple-pull',v).character;
 assert.equal(c.spent['monk-focus'],3);const before=structuredClone(c);assert.throws(()=>useActiveAbility(c,derive(c,d),'purple-pull','held'),/Недостаточно/);assert.deepEqual(c,before);assert.equal(rest(c,derive(c,d),false).spent['monk-focus'],0);
});
test('saved version 1.0 upgrades in place without duplicates or changing other movement distances',()=>{
 const old=structuredClone(raw),sub=old.subclasses.find(s=>s.id==='purple-lightning');sub.info.version='1.0';sub.grants=sub.grants.filter(g=>g.id!=='purple-pull');sub.grants.find(g=>g.id==='purple-zidian').reach=10;
 for(const g of sub.grants)if(g.description)g.description=g.description.replace('досягаемость 15 футов','досягаемость 10 футов').replace('Для Удара молнии, Пурпурного рывка, Оков, Нити спасения и Громовой расправы цель должна быть не дальше 15 футов','Для Удара молнии, Оков, Нити спасения и Громовой расправы цель должна быть не дальше 10 футов');
 const upgraded=normalizeDataset(old),again=normalizeDataset(upgraded),s=derive(monk(6),upgraded);
 assert.equal(sub.grants.find(g=>g.id==='purple-zidian').reach,10,'source stays untouched');assert.equal(s.classAttacks.find(a=>a.id==='purple-zidian').reach,15);assert.equal(s.traits.filter(t=>t.id==='purple-pull').length,1);assert.ok(s.traits.find(t=>t.id==='purple-rescue').description.includes('подтянуть цель на 10 футов'));assert.ok(s.traits.find(t=>t.id==='purple-thunder').description.includes('оттолкните её на 10 футов'));assert.deepEqual(upgraded.subclasses,again.subclasses);
});
test('bonus unarmed strike explicitly rolls full ability damage and spends no focus',()=>{
 const c=monk(5),s=derive(c,d),a=activeAbilities(c,s).find(a=>a.id==='monk-martial-arts');assert.equal(a.name,'Безоружный удар бонусным действием');assert.equal(a.variants.find(v=>v.id==='attack').roll,'1d20+7');assert.equal(a.variants.find(v=>v.id==='damage').roll,'1d8+4');assert.equal(a.variants[0].costs.length,0);assert.equal(useActiveAbility(c,s,a.id,'attack').character.spent['monk-focus']||0,0);
 const armored={...s,martialArtsActive:false};assert.throws(()=>useActiveAbility(c,armored,a.id,'attack'),/доспехе/);
});
