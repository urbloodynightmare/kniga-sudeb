import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCharacter,normalizeDataset,derive,rest,validateSave} from '../app/engine.js';
import {SUMMONS,summonForms,summonStats,addSummon,summonWithCost,endSummonConcentration} from '../app/summons.js';
import {confirmChoice} from '../app/choice-selection.js';
const d=normalizeDataset(JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url))));
const hero=extra=>createCharacter({classId:'wizard',level:11,stats:{str:8,dex:14,con:14,int:18,wis:12,cha:16},spells:[{id:'find-familiar',prepared:true},{id:'summon-aberration',prepared:true}],...extra});
const add=(c,spellId,form,level=SUMMONS[spellId].level,extra={})=>addSummon(c,derive(c,d),{spellId,form,level,...extra});
const last=c=>summonStats(c.summons.at(-1),derive(c,d));
test('aberration scales by actual slot, not character level, with distinct 2024 forms',()=>{
 const c=hero(),s=derive(c,d);let n=add(c,'summon-aberration','slaad',6);assert.equal(last(n).hp,60);assert.equal(last(n).ac,17);assert.equal(last(n).multi,3);assert.equal(last(n).attacks[0].damage,'1d10+9');assert.equal(last(n).regen,5);assert.equal(last(n).bonus,s.prof+s.mods.int);assert.equal(last(n).dc,8+s.prof+s.mods.int);
 n=add(c,'summon-aberration','mindflayer',4);assert.ok(last(n).traits.some(t=>t.includes('Шепчущая аура')));assert.equal(last(n).regen,0);assert.ok(!last(n).speed.includes('полёт'));assert.equal(last(add(c,'summon-aberration','beholderkin')).attacks[0].range,150);
});
test('ordinary familiar has 2024 animal stats, cannot attack, and chain alone unlocks eight special forms',()=>{
 const c=hero();assert.equal(summonForms('find-familiar').length,11);assert.equal(summonForms('find-familiar',{chain:true}).length,19);
 const n=add(c,'find-familiar','owl');assert.equal(last(n).hp,1);assert.equal(last(n).passive,15);assert.equal(last(n).canAttack,false);assert.equal(last(n).concentration,false);
 assert.throws(()=>add(c,'find-familiar','imp'),/форму/);assert.equal(last(add(c,'find-familiar','imp',1,{chain:true})).hp,21);
 assert.equal(last(add(c,'find-familiar','cat')).saves.dex,4);
});
test('spirit variants and high slots retain their own HP, defenses, attacks and daily powers',()=>{
 const c=hero();assert.equal(last(add(c,'summon-beast','air',4)).hp,30);assert.equal(last(add(c,'summon-beast','land',4)).hp,40);
 assert.equal(last(add(c,'summon-undead','skeletal',5)).hp,40);assert.equal(last(add(c,'summon-undead','putrid',5)).hp,50);
 assert.equal(last(add(c,'summon-celestial','defender',5)).ac,18);assert.equal(last(add(c,'summon-celestial','avenger',5)).ac,16);
 assert.equal(last(add(c,'giant-insect','spider',4)).hp,30);assert.equal(last(add(c,'giant-insect','spider',5)).hp,40);
 assert.equal(last(add(c,'summon-fiend','devil',8)).hp,70);assert.equal(last(add(c,'summon-fiend','yugoloth',8)).hp,90);
 assert.ok(last(add(c,'find-steed','fey',4)).speed.includes('полёт 60'));assert.ok(!last(add(c,'find-steed','fey',3)).speed.includes('полёт'));
 assert.equal(last(add(c,'summon-dragon','2',7)).multi,3);
});
test('one familiar, one steed and one concentration summon coexist; replacement and rest preserve only valid companions',()=>{
 let c=add(hero(),'find-familiar','owl');c=add(c,'find-steed','fey');c=add(c,'summon-aberration','slaad');assert.equal(c.summons.length,3);
 c=add(c,'summon-beast','land');assert.equal(c.summons.length,3);assert.ok(!c.summons.some(p=>p.spellId==='summon-aberration'));
 c=add(c,'find-familiar','cat');assert.equal(c.summons.length,3);assert.equal(c.summons.find(p=>p.spellId==='find-familiar').form,'cat');
 c=rest(c,derive(c,d),false);assert.equal(c.summons.length,2);
 c=add(c,'find-familiar','owl',1,{wild:true});c=rest(c,derive(c,d),true);assert.equal(c.summons.length,1);assert.equal(c.summons[0].spellId,'find-steed');
 endSummonConcentration(c);assert.equal(c.summons.length,1);
});
test('resource spending and creation are atomic, exhausted slots and wrong forms never change the hero',()=>{
 const c=hero(),s=derive(c,d),slot=s.slots.find(x=>x.level===6),context={spellId:'summon-aberration',form:'beholderkin',level:6,source:{slot:slot.id}};
 assert.throws(()=>summonWithCost(c,s,{...context,form:'invalid'}),/форму/);assert.deepEqual(c.spent,{});assert.deepEqual(c.summons,[]);
 const n=summonWithCost(c,s,context);assert.equal(n.spent[slot.id],1);assert.equal(last(n).hp,60);assert.throws(()=>summonWithCost(n,derive(n,d),context),/закончились/);assert.equal(n.summons.length,1);
 const ritual=summonWithCost(c,s,{spellId:'find-familiar',form:'owl',level:1,source:{ritual:true}});assert.deepEqual(ritual.spent,{});assert.equal(ritual.summons.length,1);
});
test('wild companion spends real wild shape or slot and cannot use chain forms',()=>{
 const c=hero({classId:'druid',level:3}),s=derive(c,d),context={spellId:'find-familiar',form:'cat',level:1,source:{active:'wild-companion',variant:'shape'}};
 const n=summonWithCost(c,s,context);assert.equal(n.spent['wild-shape'],1);assert.equal(n.summons[0].wild,true);assert.equal(n.summons[0].chain,false);
 assert.throws(()=>summonWithCost(c,s,{...context,form:'imp',chain:true}),/форму/);assert.deepEqual(c.spent,{});
 const slot=s.slots[0],m=summonWithCost(c,s,{...context,source:{active:'wild-companion',variant:slot.id}});assert.equal(m.spent[slot.id],1);assert.equal(m.spent['wild-shape']||0,0);
});
test('confirmed Pact of the Chain summons special forms without a slot; an absent invocation cannot',()=>{
 let c=hero({classId:'warlock',level:3});const q=derive(c,d).choices.find(q=>Array.isArray(q.options)&&q.options.some(o=>o.grants?.some(g=>g.featId==='inv-pact-chain'))),index=q.options.findIndex(o=>o.grants?.some(g=>g.featId==='inv-pact-chain'));
 const context={spellId:'find-familiar',form:'imp',level:1,source:{active:'inv-pact-chain-trait',variant:'use'}};
 assert.throws(()=>summonWithCost(c,derive(c,d),context));c=confirmChoice(c,d,q.key,index);const n=summonWithCost(c,derive(c,d),context);assert.deepEqual(n.spent,{});assert.equal(n.summons[0].chain,true);assert.equal(last(n).hp,21);assert.equal(last(n).canAttack,true);
});
test('long familiar casting ends previous concentration but the fast wild companion shortcut preserves it',()=>{
 const c=add(hero(),'summon-aberration','slaad');const n=summonWithCost(c,derive(c,d),{spellId:'find-familiar',form:'owl',level:1,source:{ritual:true}});assert.deepEqual(n.summons.map(p=>p.spellId),['find-familiar']);
 const druid=add(hero({classId:'druid',level:7}),'summon-beast','land');const m=summonWithCost(druid,derive(druid,d),{spellId:'find-familiar',form:'owl',level:1,source:{active:'wild-companion',variant:'shape'}});assert.equal(m.summons.length,2);
});
test('item uses, HP and companion daily charges survive backup; long rest resets living companions',()=>{
 const c=hero(),s=derive(c,d);s.fixedSpells.push({slug:'summon-aberration',key:'item-spell:ring:spell',uses:1,ability:'cha'});
 let n=summonWithCost(c,s,{spellId:'summon-aberration',form:'slaad',level:4,ability:'cha',source:{free:'item-spell:ring:spell'}});assert.equal(n.spent['item-spell:ring:spell'],1);assert.equal(last(n).bonus,s.prof+s.mods.cha);
 n=add(n,'find-familiar','sphinx',1,{chain:true});n.summons.at(-1).damage=7;n.summons.at(-1).used.ingenuity=1;
 const imported=validateSave({format:'book-of-fates',version:1,characters:[n]},d)[0];assert.equal(imported.summons.at(-1).damage,7);assert.equal(imported.summons.at(-1).used.ingenuity,1);
 const rested=rest(imported,derive(imported,d),true);assert.equal(rested.summons.length,1);assert.equal(rested.summons[0].damage,0);assert.deepEqual(rested.summons[0].used,{});
});
