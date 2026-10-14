import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LOOT} from '../app/loot-data.js';
import {mergeLoot,validateLootItem,rollD10,rollPercentile} from '../app/loot-engine.js';
test('all 100 loot numbers have a name, positive value and preserved magic properties',()=>{
 assert.equal(DEFAULT_LOOT.length,100);
 assert.deepEqual(DEFAULT_LOOT.map(x=>x.number),Array.from({length:100},(_,i)=>i+1));
 for(const x of DEFAULT_LOOT){assert.equal(validateLootItem(x).name,x.name);assert.ok(Number(x.price.split(' ')[0])>0);}
 assert.equal(DEFAULT_LOOT[7].name,'Медный браслет с серебряной застёжкой');
 assert.equal(DEFAULT_LOOT[11].price,'15 зм');assert.ok(DEFAULT_LOOT[80].description.includes('2к4 + 2'));
});
test('room overrides replace one entry without mutating another room or the base table',()=>{
 const change={...DEFAULT_LOOT[70],name:'Комнатная свеча',price:'30 зм',description:'Особое свойство',revision:3};
 const a=mergeLoot([change]),b=mergeLoot();assert.equal(a[70].name,'Комнатная свеча');assert.equal(a[70].revision,3);assert.ok(a[70].custom);
 assert.equal(b[70].name,'Свеча тихого света');a[0].name='changed';assert.equal(mergeLoot()[0].name,DEFAULT_LOOT[0].name);
 for(const x of [{...change,number:101},{...change,name:''},{...change,price:''},{...change,description:'x'.repeat(5001)}])assert.throws(()=>validateLootItem(x));
});
test('percentile tens and units map 00+0 to 100 and cover every table entry exactly once',()=>{
 const totals=[];for(let t=0;t<10;t++)for(let u=0;u<10;u++){const values=[(t+.1)/10,(u+.1)/10],r=rollPercentile(()=>values.shift());assert.equal(r.tens,t*10);assert.equal(r.units,u);totals.push(r.total);}
 assert.deepEqual(totals.sort((a,b)=>a-b),Array.from({length:100},(_,i)=>i+1));
 assert.equal(rollD10(()=>0),1);assert.equal(rollD10(()=>.999),10);assert.throws(()=>rollD10(()=>1));
});
