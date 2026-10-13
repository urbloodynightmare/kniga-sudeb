import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDataset,createCharacter,derive} from '../app/engine.js';
import {masterSummary,masterSummaryHtml} from '../app/master-summary.js';
const d=normalizeDataset(JSON.parse(fs.readFileSync(new URL('../data/party.json',import.meta.url))));
test('master summary reflects derived equipment bonuses without publishing private fields',()=>{
 const c=createCharacter({level:4,classId:'warlock',subclassId:'aha-patron',raceId:'human'});
 c.notes='PRIVATE NOTES';c.backstory='PRIVATE STORY';c.inventory=[{id:'ring',name:'PRIVATE ITEM NAME',qty:1,equipped:true,equipmentSlot:'ring1',effects:{ac:2,spellDC:2,spellAttack:1}}];c.damage=3;c.tempHp=5;
 const s=derive(c,d),summary=masterSummary(c,d);
 assert.equal(summary.ac,s.ac);assert.equal(summary.spellDC,s.spellDC);assert.equal(summary.spellAttack,s.spellAttack);assert.equal(summary.hp,s.hp);assert.equal(summary.tempHp,5);assert.equal(summary.abilities.length,6);
 assert.ok(!JSON.stringify(summary).includes('PRIVATE'));assert.equal(summary.inventory,undefined);assert.equal(summary.choices,undefined);assert.equal(summary.notes,undefined);
});
test('non-caster summary omits magic tiles and escapes player-controlled names',()=>{
 const c=createCharacter({classId:'fighter',raceId:'human',name:'<script>bad</script>'}),summary=masterSummary(c,d);
 assert.equal(summary.spellDC,null);
 const html=masterSummaryHtml(summary,v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;'));
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('Сл заклинаний'));assert.ok(html.includes('Спасбросок'));
});
