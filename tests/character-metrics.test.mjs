import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive,validateSave} from '../app/engine.js';
import {masterSummary,masterSummaryHtml} from '../app/master-summary.js';
const d=normalizeDataset(JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url))));
test('passive Insight uses the complete skill bonus, expertise and continuous item advantage',()=>{
 const c=createCharacter({level:5,stats:{str:10,dex:14,con:12,int:10,wis:16,cha:10}});
 c.classId='rogue';
 for(const q of derive(c,d).choices.filter(q=>q.type==='skill-choice'))c.choices[q.key]=['insight'];
 for(const q of derive(c,d).choices.filter(q=>q.type==='expertise-choice'))c.choices[q.key]=['insight'];
 let s=derive(c,d);assert.ok(s.skills.has('insight'));assert.ok(s.expertise.has('insight'));assert.equal(s.skillBonuses.insight,s.mods.wis+2*s.prof);assert.equal(s.passiveInsight,10+s.skillBonuses.insight);
 c.inventory=[{id:'ring',name:'Кольцо',qty:1,equipped:true,equipmentSlot:'ring1',effects:{advantage:'skill:insight'}}];
 s=derive(c,d);assert.equal(s.passiveInsight,15+s.skillBonuses.insight);
 c.inventory[0].effects.advantage='saves';s=derive(c,d);assert.equal(s.passiveInsight,10+s.skillBonuses.insight);
});
test('maneuver DC is optional, chooses physical ability independently of spell and attack bonuses',()=>{
 const c=createCharacter({level:5,stats:{str:12,dex:18,con:12,int:10,wis:10,cha:20}});
 assert.equal(derive(c,d).maneuverDC,null);
 c.maneuverAbility='auto';let s=derive(c,d);assert.equal(s.maneuverAbility,'dex');assert.equal(s.maneuverDC,15);
 c.maneuverAbility='str';assert.equal(derive(c,d).maneuverDC,12);
 c.maneuverDCBonus=2;assert.equal(derive(c,d).maneuverDC,14);
 c.inventory=[{id:'ring',name:'Кольцо',qty:1,equipped:true,equipmentSlot:'ring1',effects:{spellDC:5,attack:4}}];
 assert.equal(derive(c,d).maneuverDC,14);assert.equal(derive({...c,level:9},d).maneuverDC,15);
 const summary=masterSummary(c,d);assert.equal(summary.maneuverDC,14);assert.equal(summary.maneuverAbility,'Сила');assert.equal(summary.passiveInsight,10);
 const html=masterSummaryHtml(summary,x=>String(x));assert.ok(html.includes('Пассивная проницательность'));assert.ok(html.includes('Сл манёвров'));
 const restored=validateSave({format:'book-of-fates',version:1,characters:[c]},d)[0];assert.equal(restored.maneuverAbility,'str');assert.equal(restored.maneuverDCBonus,2);
 assert.throws(()=>validateSave({format:'book-of-fates',version:1,characters:[{...c,maneuverAbility:'bad'}]},d));
});
