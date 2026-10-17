import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive,rest,spendTechnique,monkWeaponProfile,spellCastingStats,validateSave} from '../app/engine.js';
import {masterSummary} from '../app/master-summary.js';
const raw=JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url)));
const d=normalizeDataset(raw);
const monk=level=>createCharacter({classId:'monk',subclassId:'purple-lightning',raceId:'half-orc',backgroundId:'noble',level,stats:{str:8,dex:18,con:14,int:10,wis:16,cha:12}});

test('new official entries and homebrew appear in old saved party packs, without replacing custom entries',()=>{
 const old=structuredClone(raw);
 for(const [kind,id] of [['classes','monk'],['subclasses','purple-lightning'],['races','half-orc'],['backgrounds','noble']])old[kind]=old[kind].filter(x=>x.id!==id);
 const upgraded=normalizeDataset(old);
 for(const [kind,id] of [['classes','monk'],['subclasses','purple-lightning'],['races','half-orc'],['backgrounds','noble']])assert.equal(upgraded[kind].filter(x=>x.id===id).length,1);
 assert.equal(old.classes.some(x=>x.id==='monk'),false,'do not mutate a saved dataset');
 const custom=structuredClone(upgraded);custom.races.find(x=>x.id==='half-orc').label='Мой полуорк';
 assert.equal(normalizeDataset(custom).races.find(x=>x.id==='half-orc').label,'Мой полуорк');
 const twice=normalizeDataset(upgraded);
 for(const [kind,id] of [['classes','monk'],['subclasses','purple-lightning'],['races','half-orc'],['backgrounds','noble']])assert.deepEqual(twice[kind].find(x=>x.id===id),upgraded[kind].find(x=>x.id===id),'additions are idempotent');
});

test('monk and purple lightning derive correctly at all 20 levels',()=>{
 for(let level=1;level<=20;level++){
  const s=derive(monk(level),d),die=level>=17?12:level>=11?10:level>=5?8:6;
  assert.deepEqual(s.warnings,[],`level ${level}`);
  assert.equal(s.martialArtsDie,die);
  assert.equal(s.resources.find(r=>r.id==='monk-focus')?.max,level>=2?level:undefined);
  assert.equal(s.classAttacks.some(a=>a.id==='purple-zidian'),level>=3);
  assert.equal(s.traits.some(t=>t.id==='purple-thunder'),level>=6);
  assert.equal(s.traits.some(t=>t.id==='purple-judgment'),level>=11);
  assert.equal(s.traits.some(t=>t.id==='purple-storm-form'),level>=17);
  assert.equal(s.traits.some(t=>/\[MA\]|\[TECHNIQUE_DC\]/.test(t.description)),false);
  assert.equal(s.choices.filter(q=>q.id?.startsWith('monk-feat-')).length,[4,8,12,16,19].filter(n=>n<=level).length);
 }
 const s=derive(monk(5),d);
 assert.equal(s.hpMax,38);assert.equal(s.ac,17);assert.equal(s.speed,40);assert.equal(s.techniqueDC,14);assert.equal(s.maneuverDC,14);
 assert.deepEqual(s.classAttacks.filter(a=>a.id.startsWith('purple')).map(a=>[a.ability,a.die]),[['dex','1d8'],['dex','1d8']]);
 assert.equal(s.casting,null);assert.deepEqual(s.slots,[],'techniques are not ordinary spells');
});

test('monk defense and movement respect armor, clothing, shields and Mage Armor',()=>{
 const c=monk(5);c.inventory=[{id:'robe',name:'Одежда',qty:1,equipped:true,itemType:'armor',effects:{armorType:'clothing'}}];
 assert.equal(derive(c,d).ac,17);assert.equal(derive(c,d).speed,40);
 c.mageArmor=true;assert.equal(derive(c,d).ac,17,'alternative base formulas do not stack');
 c.inventory.push({id:'shield',qty:1,equipped:true,itemType:'shield'});
 let s=derive(c,d);assert.equal(s.ac,19);assert.equal(s.speed,30);assert.equal(s.martialArtsActive,false);assert.equal(s.classAttacks.find(a=>a.id==='purple-zidian').die,'1d4');
 c.mageArmor=false;c.inventory[0].effects.armorType='leather';s=derive(c,d);assert.equal(s.ac,17);assert.equal(s.speed,30);
});

test('monk capstone, all saves and room summaries use final values',()=>{
 const c=monk(20),s=derive(c,d);assert.equal(s.stats.dex,22);assert.equal(s.stats.wis,20);assert.equal(s.ac,21);assert.equal(s.speed,60);
 assert.equal(s.saves.size,6);assert.equal(s.techniqueDC,19);
 const summary=masterSummary(c,d);assert.equal(summary.ac,21);assert.equal(summary.maneuverDC,19);assert.equal(summary.className,'Монах');assert.equal(summary.spellDC,null);
 assert.equal(validateSave({format:'book-of-fates',version:1,characters:[c]},d)[0].classId,'monk');
 c.inventory.push({id:'dex-item',qty:1,equipped:true,effects:{ability:'dex',abilityBonus:5}});assert.equal(derive(c,d).stats.dex,27,'capstone precedes equipment bonuses');
});

test('techniques spend the shared pool atomically and rest restores the correct resources',()=>{
 let c=monk(17),s=derive(c,d);const before=structuredClone(c);
 c=spendTechnique(c,s,'purple-storm-form');assert.deepEqual(before.spent,{});
 s=derive(c,d);assert.equal(s.resources.find(r=>r.id==='monk-focus').remaining,13);assert.equal(s.resources.find(r=>r.id==='purple-storm').remaining,0);
 assert.throws(()=>spendTechnique(c,s,'purple-storm-form'),/долгого отдыха/);
 c=spendTechnique(c,s,'purple-thunder');assert.equal(derive(c,d).resources.find(r=>r.id==='monk-focus').remaining,11);
 const short=rest(c,derive(c,d),false),long=rest(c,derive(c,d),true);
 assert.equal(derive(short,d).resources.find(r=>r.id==='monk-focus').remaining,17);
 assert.equal(derive(short,d).resources.find(r=>r.id==='purple-storm').remaining,0);
 assert.equal(derive(long,d).resources.find(r=>r.id==='purple-storm').remaining,1);
 c.spent['monk-focus']=17;const exhausted=structuredClone(c);assert.throws(()=>spendTechnique(c,derive(c,d),'purple-thunder'),/Недостаточно/);assert.deepEqual(c,exhausted);
 assert.throws(()=>spendTechnique(monk(5),derive(monk(5),d),'purple-thunder'),/недоступна/);
});

test('half-orc grants Intimidation, Orc and one endurance use, without legacy ability increases',()=>{
 const c=monk(1),s=derive(c,d);assert.deepEqual(s.stats,c.stats);assert.ok(s.skills.has('intimidation'));assert.ok(s.languages.has('Орочий'));assert.equal(s.speed,30);
 c.spent['half-orc-endurance']=1;
 assert.equal(derive(rest(c,derive(c,d),false),d).resources.find(r=>r.id==='half-orc-endurance').remaining,0);
 assert.equal(derive(rest(c,derive(c,d),true),d).resources.find(r=>r.id==='half-orc-endurance').remaining,1);
});

test('ordinary monk weapons use martial die and ability, other weapons and armor do not',()=>{
 const s=derive(monk(5),d);
 assert.deepEqual(monkWeaponProfile(s,'spear','1d6','str'),{die:'1d8',ability:'dex'});
 assert.deepEqual(monkWeaponProfile(s,'dagger','1d4','dex'),{die:'1d8',ability:'dex'});
 assert.deepEqual(monkWeaponProfile(s,'longbow','1d8','dex'),{die:'1d8',ability:'dex'});
 assert.deepEqual(monkWeaponProfile(s,'longsword','1d8','str'),{die:'1d8',ability:'str'});
 assert.deepEqual(monkWeaponProfile({...s,martialArtsActive:false},'spear','1d6','str'),{die:'1d6',ability:'str'});
 assert.deepEqual(monkWeaponProfile(s,'spear','1d10','str'),{die:'1d10',ability:'dex'});
});

test('noble background applies legal ASI, mixed Skilled choices and equipment without duplication',()=>{
 const c=monk(1);let s=derive(c,d);
 const asi=s.choices.find(q=>q.id==='noble-abilities');c.choices[asi.key]={str:2,cha:1};
 const skilled=s.choices.find(q=>q.allowTools);c.choices[skilled.key]=['perception','tool:Инструменты алхимика','insight'];
 const gaming=s.choices.find(q=>q.id==='noble-gaming');c.choices[gaming.key]=['Игральные карты'];
 const kit=s.choices.find(q=>q.id==='noble-equipment');c.choices[kit.key]=0;s=derive(c,d);
 assert.equal(s.stats.str,10);assert.equal(s.stats.cha,13);assert.ok(s.skills.has('history'));assert.ok(s.skills.has('persuasion'));assert.ok(s.skills.has('perception'));assert.ok(s.skills.has('insight'));assert.ok(s.tools.has('Инструменты алхимика'));assert.ok(s.tools.has('Игральные карты'));assert.equal(s.gold,29);
 c.choices[asi.key]={dex:2,wis:1};s=derive(c,d);assert.equal(s.stats.dex,18);assert.equal(s.choices.find(q=>q.key===asi.key).complete,false);
 c.level=10;assert.equal(derive(c,d).gold,29);assert.equal(derive(c,d).equipment.filter(x=>x.name==='Щегольская одежда').length,1);
});

test('half-elf lineages replace two skills, high heritage grants an Intelligence wizard cantrip',()=>{
 const c=monk(5);c.raceId='half-elf';let s=derive(c,d);
 assert.equal(s.choices.find(q=>q.id==='half-elf-versatility').count,2);assert.ok(s.languages.has('Эльфийский'));
 c.subraceId='half-elf-high';s=derive(c,d);assert.equal(s.choices.some(q=>q.id==='half-elf-versatility'),false);
 const lineage=s.choices.find(q=>q.id==='high-half-elf-heritage');c.choices[lineage.key]=0;s=derive(c,d);
 const cantrip=s.choices.find(q=>q.id==='high-half-elf-cantrip');assert.equal(cantrip.spellList,'wizard');assert.equal(cantrip.circle,0);c.choices[cantrip.key]=['shocking-grasp'];s=derive(c,d);
 const p=s.fixedSpells.find(p=>p.slug==='shocking-grasp');assert.equal(p.ability,'int');assert.deepEqual(spellCastingStats(s,p.ability),{ability:'int',attack:3,dc:11});assert.equal(s.techniqueDC,14,'racial cantrip does not use monk Wisdom');
 assert.equal(masterSummary(c,d).spellAttack,3);assert.equal(masterSummary(c,d).castingAbility,'Интеллект');
 assert.equal(s.cantrips,0,'heritage does not consume class cantrip choices');
 c.choices[lineage.key]=1;s=derive(c,d);assert.equal(s.fixedSpells.some(p=>p.slug==='shocking-grasp'),false);assert.ok(s.weaponProf.has('Длинный лук'));
 c.subraceId='half-elf-wood';s=derive(c,d);const wood=s.choices.find(q=>q.id==='wood-half-elf-heritage');c.choices[wood.key]=0;assert.equal(derive(c,d).speed,45);
 c.subraceId='half-elf-aquatic';s=derive(c,d);assert.equal(s.swimSpeed,30);assert.equal(s.speed,40);assert.equal(s.choices.some(q=>q.id==='half-elf-versatility'),false);
 c.subraceId='';assert.ok(derive(c,d).choices.some(q=>q.id==='half-elf-versatility'));
});

test('half-drow magic unlocks at levels 1/3/5 and keeps separate daily uses',()=>{
 const c=monk(1);c.raceId='half-elf';c.subraceId='half-elf-drow';
 assert.deepEqual(derive(c,d).fixedSpells.map(p=>p.slug),['dancing-lights']);
 c.level=3;assert.deepEqual(derive(c,d).fixedSpells.map(p=>p.slug),['dancing-lights','faerie-fire']);
 c.level=5;const s=derive(c,d);assert.deepEqual(s.fixedSpells.map(p=>p.slug),['dancing-lights','faerie-fire','darkness']);
 for(const p of s.fixedSpells){assert.equal(p.ability,'cha');assert.equal(p.slotCast,false);assert.ok(p.level===1||p.uses===1);}
 assert.ok(s.traits.every(t=>!t.id.includes('sunlight')));assert.equal(s.casting,null);
});
