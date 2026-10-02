import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive,rest,expression,validateSave,partyTemplates} from '../app/engine.js';
const raw=JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url)));
const d=normalizeDataset(raw);
const warlock=level=>createCharacter({level,classId:'warlock',raceId:'human',subclassId:'aha-patron'});
const invocations=s=>s.choices.filter(q=>q.type==='pick-one'&&q.options.some(o=>o.grants?.some(g=>g.category==='invocation')));
test('2024 warlock choices appear at their actual levels, including nested feat ASI',()=>{
  for(const [level,count] of [[1,1],[2,3],[4,3],[5,5],[7,6],[9,7],[12,8],[15,9],[18,10]])assert.equal(invocations(derive(warlock(level),d)).length,count);
  const c=warlock(4);let s=derive(c,d);const feat=s.choices.find(q=>q.label==='Общая черта или улучшение характеристик');assert.ok(feat);
  c.choices[feat.key]=0;s=derive(c,d);const asi=s.choices.find(q=>q.type==='asi-flexible');assert.ok(asi);
  c.choices[asi.key]={cha:2};assert.equal(derive(c,d).stats.cha,17);
  c.level=3;assert.equal(derive(c,d).stats.cha,15);c.level=4;assert.equal(derive(c,d).stats.cha,17);
});
test('all five classes and subclasses derive at every level without missing feat refs',()=>{
  for(const c of partyTemplates())for(let level=1;level<=20;level++){c.level=level;const s=derive(c,d);assert.equal(s.warnings.length,0,c.classId+' '+level);assert.ok(s.hpMax>0);assert.equal(s.prof,2+Math.floor((level-1)/4));}
});
test('subclasses unlock at level 3, never at level 1',()=>{
  assert.ok(!derive(warlock(2),d).resources.find(x=>x.id==='elation-ardor'));
  assert.equal(derive(warlock(3),d).resources.find(x=>x.id==='elation-ardor').remaining,0);
});
test('equipment and gold persist across level changes without duplication',()=>{
  const c=warlock(1),q=derive(c,d).choices.find(q=>q.type==='pick-one'&&!q.label);c.choices[q.key]=0;
  const before=derive(c,d);assert.equal(before.equipment.length,6);assert.equal(before.gold,15);
  c.level=4;assert.deepEqual(derive(c,d).equipment,before.equipment);assert.equal(derive(c,d).gold,15);
  c.choices[q.key]=1;assert.equal(derive(c,d).equipment.length,0);assert.equal(derive(c,d).gold,100);
});
test('short rest: pact slots restore, ordinary slots do not, partial class resources recover 1',()=>{
  const w=warlock(4);w.spent.pact=2;w.spent['magical-cunning']=1;w.damage=6;
  const restored=rest(w,derive(w,d),false);assert.equal(restored.spent.pact,0);assert.equal(restored.spent['magical-cunning'],1);assert.equal(restored.damage,6);
  const f=createCharacter({classId:'fighter',level:4});f.spent['second-wind']=3;f.spent['action-surge']=1;
  const r=rest(f,derive(f,d),false);assert.equal(r.spent['second-wind'],2);assert.equal(r.spent['action-surge'],0);
  const wiz=createCharacter({classId:'wizard',level:4});wiz.spent['slot-1']=3;assert.equal(rest(wiz,derive(wiz,d),false).spent['slot-1'],3);
});
test('resources use modifiers, later resource grants replace earlier ones',()=>{
  const c=createCharacter({classId:'druid',raceId:'reborn',subclassId:'circle-of-spores',level:17});const s=derive(c,d);
  assert.equal(s.resources.filter(x=>x.id==='wild-shape').length,1);assert.equal(s.resources.find(x=>x.id==='wild-shape').max,4);assert.equal(s.resources.find(x=>x.id==='knowledge-from-a-past-life').max,6);
});
test('safe arithmetic rejects executable code and computes supported expressions',()=>{
  assert.equal(expression('max(1,[WIS])',{WIS:-1}),1);assert.equal(expression('[LVL]*2',{LVL:4}),8);
  assert.throws(()=>expression('process.exit()'));assert.throws(()=>expression('1/0'));
});
test('backup round trip validates input and assigns fresh IDs',()=>{
  const c=warlock(4);c.notes='Сессия 1\nАха смеётся';c.inventory.push({id:'loot',name:'Старая корона',qty:1,forSale:true});const [copy]=validateSave({format:'book-of-fates',version:1,characters:[c]},d);assert.notEqual(copy.id,c.id);assert.equal(copy.notes,c.notes);assert.equal(copy.inventory[0].forSale,true);
  assert.throws(()=>validateSave({format:'book-of-fates',version:1,characters:[{...c,level:99}]},d));
});
test('conditional Defense fighting style and Mage Armor calculations',()=>{
  const c=warlock(4);c.manualFeatures.push({id:'defense',featId:'fs-defense'});c.armor='none';assert.equal(derive(c,d).ac,12);
  c.mageArmor=true;assert.equal(derive(c,d).ac,15);c.armor='leather';assert.equal(derive(c,d).ac,14);
});
test('long rest resets accumulated Aha ardor to zero',()=>{
  const c=warlock(4);c.spent['elation-ardor']=0;const r=rest(c,derive(c,d),true);assert.equal(derive(r,d).resources.find(x=>x.id==='elation-ardor').remaining,0);
});
test('illegal future invocation is visible as invalid, but does not grant effects',()=>{
  const c=warlock(1),q=invocations(derive(c,d))[0];c.choices[q.key]=q.options.findIndex(o=>o.grants.some(g=>g.featId==='inv-devils-sight'));
  const s=derive(c,d);assert.equal(s.feats.some(f=>f.id==='inv-devils-sight'),false);assert.ok(s.choices.find(x=>x.key===q.key).error);
});
test('duplicate non-repeatable invocations do not add duplicate features',()=>{
  const c=warlock(4),qs=invocations(derive(c,d));for(const q of qs)c.choices[q.key]=0;
  const s=derive(c,d);assert.ok(s.feats.filter(f=>f.id==='inv-armor-of-shadows').length<=1);assert.ok(s.pending>0);
});
test('Eldritch Blast invocations expose their linked combat effects',()=>{
  const c=warlock(4),qs=invocations(derive(c,d));
  const select=(q,id)=>{c.choices[q.key]=q.options.findIndex(o=>o.grants.some(g=>g.featId===id));};
  select(qs[0],'inv-agonizing-blast');select(qs[1],'inv-repelling-blast');
  let state=derive(c,d);
  for(const q of state.choices.filter(q=>q.type==='spell-choice'&&q.targetOnly))c.choices[q.key]=['eldritch-blast'];
  state=derive(c,d);
  assert.deepEqual(state.spellEnhancements['eldritch-blast'].map(x=>x.id).sort(),['inv-agonizing-blast','inv-repelling-blast']);
  assert.match(state.spellEnhancements['eldritch-blast'][0].effect,/Харизмы/);
  assert.match(state.spellEnhancements['eldritch-blast'][1].effect,/10 футов/);
});
test('ASI does not silently exceed 20',()=>{
  const c=warlock(4);c.stats.cha=20;let s=derive(c,d);const q=s.choices.find(x=>x.label==='Общая черта или улучшение характеристик');c.choices[q.key]=0;s=derive(c,d);const asi=s.choices.find(q=>q.type==='asi-flexible');c.choices[asi.key]={cha:2};s=derive(c,d);assert.equal(s.stats.cha,20);assert.equal(s.choices.find(x=>x.key===asi.key).complete,false);
});

test('equipped magic items apply bonuses, grant spells, and recover charges',()=>{
  const c=warlock(4),base=derive(c,d),spellId='magic-missile';
  c.inventory.push({id:'ring-test',name:'Кольцо испытаний',qty:1,equipped:true,effects:{ac:1,spellAttack:2,spellDC:1,spellSave:2,ability:'cha',abilityBonus:1,attack:1,damage:1,advantage:'skills'},imbuedSpell:{id:spellId,uses:3,rest:'short'}});
  const state=derive(c,d);
  assert.equal(state.ac,base.ac+1);
  assert.equal(state.stats.cha,base.stats.cha+1);
  assert.equal(state.spellAttack,base.spellAttack+3);
  assert.equal(state.spellDC,base.spellDC+2);
  assert.equal(state.spellSaveBonuses.dex,state.saveBonuses.dex+2);
  assert.equal(state.itemBonuses.attack,1);
  assert.equal(state.itemBonuses.damage,1);
  assert.equal(state.advantageChecks.has('skills'),true);
  assert.equal(state.fixedSpells.some(x=>x.slug===spellId&&x.uses===3&&x.key==='item-spell:ring-test'),true);
  c.spent['item-spell:ring-test']=2;
  assert.equal(rest(c,state,false).spent['item-spell:ring-test'],0);
  c.inventory[0].equipped=false;
  assert.equal(derive(c,d).fixedSpells.some(x=>x.key==='item-spell:ring-test'),false);
  assert.equal(derive(c,d).advantageChecks.size,0);
});

test('equipped items can grant advantage to saving throws and individual skills',()=>{
  const c=warlock(4);
  c.inventory.push({id:'cloak-test',name:'Плащ испытаний',qty:1,equipped:true,effects:{advantage:'saves'}});
  c.inventory.push({id:'lens-test',name:'Линза наблюдения',qty:1,equipped:true,effects:{advantage:'skill:perception'}});
  const state=derive(c,d);
  assert.equal(state.advantageChecks.has('saves'),true);
  assert.equal(state.advantageChecks.has('skill:perception'),true);
});

test('equipment slots apply shields and remove weapon attacks when unequipped',()=>{
  const c=warlock(4),base=derive(c,d);
  c.inventory.push({id:'shield-slot',name:'Щит стража',qty:1,equipped:true,equipmentSlot:'meleeOff',itemType:'shield',effects:{ac:1}});
  c.inventory.push({id:'sword-slot',name:'Длинный меч +1',qty:1,equipped:true,equipmentSlot:'meleeMain',itemType:'meleeWeapon',effects:{weaponScope:'self',weaponType:'longsword',attack:1,damage:1}});
  let state=derive(c,d);
  assert.equal(state.ac,base.ac+3);
  assert.equal(state.weaponItems.some(x=>x.id==='sword-slot'),true);
  c.inventory[1].equipped=false;
  state=derive(c,d);
  assert.equal(state.weaponItems.some(x=>x.id==='sword-slot'),false);
});

test('weapon bonuses can target one equipped weapon without affecting every attack',()=>{
  const c=warlock(4);
  c.inventory.push({id:'blade-test',name:'Рапира дуэлянта',qty:1,equipped:true,effects:{attack:2,damage:1,weaponScope:'self',weaponType:'rapier'}});
  c.inventory.push({id:'gloves-test',name:'Перчатки лучника',qty:1,equipped:true,effects:{attack:1,damage:2,weaponScope:'ranged'}});
  c.inventory.push({id:'belt-test',name:'Пояс фехтовальщика',qty:1,equipped:true,effects:{attack:3,damage:4,weaponScope:'melee'}});
  const state=derive(c,d);
  assert.equal(state.itemBonuses.attack,0);
  assert.equal(state.itemBonuses.damage,0);
  assert.equal(state.itemBonuses.rangedAttack,1);
  assert.equal(state.itemBonuses.rangedDamage,2);
  assert.equal(state.itemBonuses.meleeAttack,3);
  assert.equal(state.itemBonuses.meleeDamage,4);
  assert.equal(state.weaponItems.length,1);
  assert.equal(state.weaponItems[0].id,'blade-test');
});

test('2024 warlock has the complete level 3 spell list',()=>{
  const spells=JSON.parse(fs.readFileSync(new URL('../data/spells.json',import.meta.url)));
  const level3=spells.filter(spell=>spell.level===3&&spell.classes.includes('warlock'));
  assert.equal(level3.length,14);
  for(const id of ['hunger-of-hadar','summon-fey','summon-undead'])assert.ok(level3.some(spell=>spell.id===id&&spell.descriptionRu));
});

test('2024 spell lists are complete for every spellcasting class in the party',()=>{
  const spells=JSON.parse(fs.readFileSync(new URL('../data/spells.json',import.meta.url)));
  assert.equal(spells.filter(spell=>spell.classes.includes('warlock')).length,91);
  assert.equal(spells.filter(spell=>spell.classes.includes('druid')).length,135);
  const required=['thorn-whip','thunderclap','beast-sense','summon-beast','aura-of-vitality','elemental-weapon','feign-death','fount-of-moonlight','grasping-vine','summon-elemental','blade-ward','friends','mind-sliver','toll-the-dead','armor-of-agathys','arms-of-hadar','witch-bolt','cloud-of-daggers','crown-of-madness','summon-aberration','jallarzis-storm-of-radiance','synaptic-static','arcane-gate','summon-fiend','tashas-bubbling-cauldron'];
  for(const id of required){
    const spell=spells.find(item=>item.id===id);
    assert.ok(spell?.nameRu&&spell?.descriptionRu,`${id} must have a Russian name and description`);
  }
  assert.ok(spells.some(spell=>spell.id==='thunderclap'&&spell.classes.includes('wizard')));
});
