import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive,rest} from '../app/engine.js';
import {activeAbilities,useActiveAbility} from '../app/active-abilities.js';
import {masteryLimit,weaponActivities,learnedMasteries} from '../app/weapon-activities.js';
const d=normalizeDataset(JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url))));
const hero=(classId,level=5,extra={})=>createCharacter({classId,level,...extra});
const use=(c,id,v='use',extra={})=>useActiveAbility(c,derive(c,d),id,v,{random:()=>0,...extra}).character;
const abilities=c=>activeAbilities(c,derive(c,d));

test('class actions are unlocked by actual levels and passive traits stay out',()=>{
 const f=hero('fighter',1);assert.ok(abilities(f).some(a=>a.id==='second-wind'));assert.ok(!abilities(f).some(a=>a.id==='action-surge'));assert.ok(!abilities(f).some(a=>a.id==='weapon-mastery'));
 assert.ok(abilities(hero('fighter',2)).some(a=>a.id==='action-surge'));
 assert.ok(!abilities(hero('monk',1)).some(a=>a.id==='monk-flurry'));
 assert.ok(abilities(hero('monk',2)).some(a=>a.id==='monk-flurry'));
});
test('monk free and paid actions share focus; rejected spending leaves character intact',()=>{
 let c=hero('monk',2);c=use(c,'monk-patient-defense','free');assert.equal(c.spent['monk-focus']||0,0);
 c=use(c,'monk-flurry');c=use(c,'monk-step-wind','focus');assert.equal(c.spent['monk-focus'],2);
 const before=structuredClone(c);assert.throws(()=>use(c,'monk-flurry'),/Недостаточно/);assert.deepEqual(c,before);
 c=use(c,'monk-step-wind','free');assert.equal(c.spent['monk-focus'],2);
 assert.equal(rest(c,derive(c,d),false).spent['monk-focus'],0);
});
test('second wind heals, tactical mind only consumes charge, short rest restores one charge',()=>{
 let c=hero('fighter',5,{damage:20});const before=structuredClone(c);c=use(c,'second-wind');assert.equal(c.damage,14);assert.equal(c.spent['second-wind'],1);assert.equal(before.damage,20);
 c=use(c,'tactical-mind','success');assert.equal(c.damage,14);assert.equal(c.spent['second-wind'],2);
 assert.equal(rest(c,derive(c,d),false).spent['second-wind'],1);
});
test('heightened defense grants temporary hits and metabolism recovers focus with own daily charge',()=>{
 let c=hero('monk',10,{damage:20});c=use(c,'monk-patient-defense','focus');assert.equal(c.tempHp,2);assert.equal(c.spent['monk-focus'],1);
 c.spent['monk-focus']=10;c=use(c,'monk-metabolism');assert.equal(c.spent['monk-focus'],0);assert.equal(c.spent['monk-metabolism'],1);assert.equal(c.damage,9);
 assert.throws(()=>use(c,'monk-metabolism'),/Недостаточно/);
});
test('symbiotic entity and wild shape spend the same pool',()=>{
 let c=hero('druid',5,{subclassId:'circle-of-spores'});c=use(c,'symbiotic-entity');assert.equal(c.spent['wild-shape'],1);assert.equal(c.tempHp,20);c=use(c,'wild-shape');assert.equal(c.spent['wild-shape'],2);
});
test('magical cunning restores pact slots and keeps its daily limit across short rest',()=>{
 let c=hero('warlock',5);c.spent.pact=2;c=use(c,'magical-cunning');assert.equal(c.spent.pact,1);assert.equal(c.spent['magical-cunning'],1);
 assert.equal(rest(c,derive(c,d),false).spent['magical-cunning'],1);assert.equal(rest(c,derive(c,d),true).spent['magical-cunning'],0);
});
test('arcane recovery validates weighted slots atomically',()=>{
 let c=hero('wizard',5);c.spent['slot-1']=2;c.spent['slot-2']=1;
 const before=structuredClone(c);assert.throws(()=>use(c,'arcane-recovery','recover',{slots:{'slot-1':2,'slot-2':1}}));assert.deepEqual(c,before);
 c=use(c,'arcane-recovery','recover',{slots:{'slot-1':1,'slot-2':1}});assert.equal(c.spent['slot-1'],1);assert.equal(c.spent['slot-2'],0);assert.equal(c.spent['arcane-recovery'],1);
 assert.throws(()=>use(c,'arcane-recovery','recover',{slots:{'slot-1':1}}),/Недостаточно/);
});
test('manual abilities spend custom resources and reject fractional or excessive costs',()=>{
 let c=hero('fighter',1,{customResources:[{id:'custom',name:'Заряды',max:3}],manualFeatures:[{id:'ability',name:'Умение',description:'Тест',active:true,resourceId:'custom',cost:2}]});
 c=use(c,'ability');assert.equal(c.spent.custom,2);assert.throws(()=>use(c,'ability'),/Недостаточно/);
 c.manualFeatures[0].cost=0.5;assert.throws(()=>use(c,'ability'),/стоимость/);
 c.manualFeatures[0].active=false;assert.ok(!abilities(c).some(a=>a.id==='ability'));
});
test('weapon mastery follows equipped weapons and never makes them magical',()=>{
 const c=hero('fighter',1),s=derive(c,d),item={id:'axe',name:'Топор',qty:1,equipped:true,effects:{weaponType:'greataxe'}};
 assert.equal(masteryLimit(c,s),3);assert.deepEqual(learnedMasteries(c,s,[item]),['greataxe']);assert.ok(weaponActivities(c,s,[item]).some(a=>a.id==='mastery:axe:cleave'));
 const before=structuredClone(item);weaponActivities(c,s,[item]);assert.deepEqual(item,before);
 assert.ok(!weaponActivities(c,s,[{...item,equipped:false}]).some(a=>a.id.startsWith('mastery:')));
 assert.ok(!weaponActivities({...c,weaponMasteries:[]},s,[item]).some(a=>a.id.startsWith('mastery:')));
 const monk=hero('monk');assert.ok(!weaponActivities(monk,derive(monk,d),[item]).some(a=>a.id.startsWith('mastery:')));
});
test('mastery limits and topple use the actual weapon ability',()=>{
 const c=hero('fighter',16,{stats:{str:18,dex:12,con:14,int:10,wis:10,cha:10}}),s=derive(c,d);
 assert.equal(masteryLimit(c,s),6);const actions=weaponActivities(c,s,[{id:'axe',qty:1,equipped:true,effects:{weaponType:'battleaxe'}}]);
 assert.ok(actions.find(a=>a.id==='mastery:axe:topple').description.includes('Ваша Сл: 17'));
});
test('high level techniques require both focus and daily charge atomically',()=>{
 let c=hero('monk',17,{subclassId:'purple-lightning'});c.spent['monk-focus']=14;const before=structuredClone(c);
 assert.throws(()=>use(c,'purple-storm-form'),/Недостаточно/);assert.deepEqual(c,before);
 c.spent['monk-focus']=13;c=use(c,'purple-storm-form');assert.equal(c.spent['monk-focus'],17);assert.equal(c.spent['purple-storm'],1);
 c.spent['monk-focus']=0;assert.throws(()=>use(c,'purple-storm-form'),/Недостаточно/);
});
test('half orc endurance only works at zero HP and consumes its own long-rest use',()=>{
 let c=hero('fighter',1,{raceId:'half-orc'});assert.throws(()=>use(c,'half-orc-endurance'),/0/);
 c.damage=derive(c,d).hpMax;c=use(c,'half-orc-endurance');assert.equal(derive(c,d).hp,1);assert.equal(c.spent['half-orc-endurance'],1);
});
test('overchannel tracks repeated self damage and resets on long rest',()=>{
 let c=hero('wizard',14,{subclassId:'evoker'});c=use(c,'overchannel','spell-1');assert.equal(c.damage,0);c=use(c,'overchannel','spell-1');assert.equal(c.damage,2);assert.equal(c.spent['active-counter:overchannel'],2);
 c=rest(c,derive(c,d),true);assert.equal(c.spent['active-counter:overchannel'],0);
});
test('intrinsic spell charges normalize and rest independently from slots',()=>{
 const warlock=d.classes.find(x=>x.id==='warlock');const arcanum=warlock.leveledGrants.flatMap(x=>x.grants).find(g=>g.type==='spell-choice'&&g.circle===6);
 assert.equal(arcanum.uses,1);assert.equal(arcanum.rest,'long');assert.equal(arcanum.slotCast,false);
 const c=hero('wizard',20),s=derive(c,d);s.fixedSpells.push({key:'signature',slug:'shield',uses:1,rest:'short'});c.spent['free-spell:signature:shield']=1;c.spent['slot-1']=2;
 const n=rest(c,s,false);assert.equal(n.spent['free-spell:signature:shield'],0);assert.equal(n.spent['slot-1'],2);
});
