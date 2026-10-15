import test from 'node:test';
import assert from 'node:assert/strict';
import {createMerchants} from '../app/merchants.js';

test('master loot remains accessible independently of shops, refresh errors and room changes',async()=>{
 const previousDocument=globalThis.document,previousStorage=globalThis.localStorage,events=new Map(),storage=new Map();
 let merchantFailure=false,lootFailure=false,blockedStorage=false;
 const room={id:'one',name:'Room one',master_id:'master'};
 const cloud={user:{id:'master'},client:{from:table=>({select:()=>({eq:()=>({order:async()=>{
  if(table==='party_merchants'&&merchantFailure)throw Error('Catalogue unavailable');
  if(table==='party_loot_overrides'&&lootFailure)throw Error('Loot unavailable');
  return {data:[]};
 }})})})}};
 const rooms={context:()=>({room,rooms:[room]}),subscribe:()=>()=>{}};
 globalThis.document={querySelector:()=>null,addEventListener:(name,fn)=>events.set(name,[...(events.get(name)||[]),fn])};
 globalThis.localStorage={getItem:key=>{if(blockedStorage)throw Error('Blocked');return storage.get(key);},setItem:(key,value)=>{if(blockedStorage)throw Error('Blocked');storage.set(key,value);}};
 const click=async action=>{for(const fn of events.get('click')||[])fn({preventDefault(){},target:{closest:selector=>selector==='[data-merchant-action]'?{dataset:{merchantAction:action}}:null}});await new Promise(resolve=>setImmediate(resolve));};
 try{
  const merchants=createMerchants({cloud,rooms,esc:String,showDialog(){},toast(){}});
  assert.match(merchants.view(),/data-merchant-action="view-loot"/);
  await click('view-loot');
  assert.match(merchants.view(),/id="merchant-loot-root"/);
  assert.match(merchants.view(),/Таблица находок · 100/);
  merchantFailure=true;await merchants.refresh();
  assert.match(merchants.view(),/Таблица находок · 100/,'shop loading must not remove master loot');
  lootFailure=true;await merchants.refresh();
  assert.match(merchants.view(),/Не удалось загрузить изменения таблицы/);
  assert.match(merchants.view(),/Повторить загрузку/);
  lootFailure=false;merchantFailure=false;
  room.id='two';room.name='Room two';await merchants.refresh();
  assert.doesNotMatch(merchants.view(),/id="merchant-loot-root"/,'each room has an independent selected section');
  blockedStorage=true;await click('view-loot');
  assert.match(merchants.view(),/Таблица находок · 100/,'navigation still works without browser storage');
  room.master_id='other';await merchants.refresh();
  assert.doesNotMatch(merchants.view(),/view-loot|merchant-loot-root|Таблица находок/,'players must not receive the master panel');
 }finally{globalThis.document=previousDocument;globalThis.localStorage=previousStorage;}
});
