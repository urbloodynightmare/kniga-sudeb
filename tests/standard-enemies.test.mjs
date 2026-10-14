import test from 'node:test';
import assert from 'node:assert/strict';
import {STANDARD_ENEMIES,scaleStandardEnemy} from '../app/standard-enemies.js';
import {normalizeMonsters,adjustCombatHp} from '../app/combat-engine.js';

test('every role scales monotonically across all supported group levels and imports into the pool',()=>{
 assert.equal(new Set(STANDARD_ENEMIES.map(t=>t.id)).size,STANDARD_ENEMIES.length);
 for(const t of STANDARD_ENEMIES){let previous=null;for(let level=1;level<=20;level++){
  const m=scaleStandardEnemy(t.id,level),normalized=normalizeMonsters([m])[0];
  assert.equal(normalized.hpMax,m.hpMax);assert.equal(normalized.ac,m.ac);
  assert.equal(Object.keys(m.abilities).length,6);
  assert.ok(!JSON.stringify(m).match(/\{(?:dc|damage|extra|heal|blast|guard)\}/));
  assert.ok(m.hpMax>0&&m.ac>=10&&m.ac<=21);
  if(previous){assert.ok(m.hpMax>=previous.hpMax);assert.ok(m.ac>=previous.ac);assert.ok(m.features.length>=previous.features.length);}
  previous=m;
 }}
});
test('tier changes unlock multiattacks and new abilities, while invalid levels are rejected',()=>{
 const at=n=>scaleStandardEnemy('mercenary',n);
 assert.ok(!at(4).features.some(f=>f.name==='Несколько атак'));
 assert.ok(at(5).features.some(f=>f.body.includes('2 атаки')));
 assert.ok(at(17).features.some(f=>f.body.includes('3 атаки')));
 assert.ok(!at(6).features.some(f=>f.name==='Слаженная атака'));
 assert.ok(at(7).features.some(f=>f.name==='Слаженная атака'));
 assert.ok(at(13).features.some(f=>f.name==='Опытный противник'));
 for(const n of [0,21,NaN,3.5,'5'])assert.throws(()=>at(n));
 assert.throws(()=>scaleStandardEnemy('unknown',5));
});
test('changing catalogue level and HP does not modify saved or existing combat copies',()=>{
 const first=scaleStandardEnemy('bandit',3),copy=structuredClone(first),second=scaleStandardEnemy('bandit',15);
 const wounded=adjustCombatHp({...copy,hp:copy.hpMax},-10);
 assert.equal(copy.hpMax,first.hpMax);assert.notEqual(second.hpMax,copy.hpMax);
 assert.equal(wounded.hp,first.hpMax-10);assert.equal(first.features.length,2);
 second.features[0].body='manual edit';assert.notEqual(scaleStandardEnemy('bandit',15).features[0].body,'manual edit');
});

