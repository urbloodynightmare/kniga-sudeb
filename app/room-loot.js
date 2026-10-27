import {icon,actionLabel} from './icons.js?v=20261027-2';
import {mergeLoot,validateLootItem,rollD10,rollPercentile} from './loot-engine.js?v=20261027-2';
export function createRoomLoot({cloud,rooms,esc,showDialog,toast,onChange}){
 let overrides=[],error='',loading=false,loaded='',request=0,query='',range=0,expanded=false,last=null,d10=null;
 const ctx=()=>rooms.context(),master=()=>!!cloud.user&&ctx().room?.master_id===cloud.user.id;
 const key=()=>`${cloud.user?.id}:${ctx().room?.id}:${ctx().room?.master_id}`;
 const message=e=>e.message?.includes('REVISION_CONFLICT')?'Эту находку уже изменили в другом окне. Обновите таблицу и повторите правку.':e.message?.includes('MASTER_REQUIRED')?'Таблица доступна только текущему мастеру комнаты.':e.message?.includes('INVALID_LOOT')?'Проверьте название, цену и описание находки.':e.message||'Не удалось сохранить находку. Повторите попытку.';
 function clear(){const dialog=document.querySelector('#dialog');if(dialog?.open&&dialog.querySelector('[data-loot-form]'))dialog.close();request++;overrides=[];loaded='';loading=false;error='';query='';range=0;expanded=false;last=null;d10=null;}
 async function refresh(){
  if(!master()){clear();return;}
  const current=key(),room=ctx().room.id;if(current!==loaded){clear();loaded=current;}
  const token=++request;loading=true;onChange();
  try{const r=await cloud.client.from('party_loot_overrides').select('*').eq('room_id',room).order('number');if(r.error)throw r.error;
   if(token!==request||key()!==current||!master())return;
   mergeLoot(r.data||[]);overrides=r.data||[];error='';
  }catch(e){if(token===request){error='Не удалось загрузить изменения таблицы. Нажмите «Обновить». Броски и редактирование временно недоступны.';}}
  finally{if(token===request){loading=false;onChange();}}
 }
 const rows=()=>mergeLoot(overrides);
 const button=(label,action,extra='',cls='outline')=>`<button type="button" class="button ${cls}" data-loot-action="${action}" ${extra} ${loading||error?'disabled':''}>${actionLabel(label,action)}</button>`;
 function view(){if(!master())return '';if(key()!==loaded)return `<section class="panel room-loot"><h2><span class="heading-icon">${icon('chest')}</span>Случайный лут</h2><p class="hint">Загружаем таблицу выбранной комнаты…</p></section>`;const fold=document.querySelector('.loot-table-fold');if(fold)expanded=fold.open;const entries=rows(),matches=entries.filter(x=>query?(x.name+' '+x.description+' '+x.number).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')):Math.floor((x.number-1)/10)===range),found=last?entries[last.total-1]:null;
  return `<section class="panel room-loot"><div class="panel-title"><div><div class="eyebrow muted">ТОЛЬКО ДЛЯ МАСТЕРА</div><h2><span class="heading-icon">${icon('chest')}</span>Случайный лут</h2></div><span class="tag">d100 · 100 находок</span></div><p class="hint">Находки для тайников и сундуков. Цены — ориентиры выкупа. Изменения сохраняются только в комнате «${esc(ctx().room.name)}».</p><div class="loot-dice-actions">${button('Бросить d100','percentile','','primary')}${button('Бросить d10','d10')}${button('↻ Обновить','refresh')}</div><p class="hint">d100: процентный кубик + единицы; 00 и 0 означают 100. d10 — отдельный бросок от 1 до 10, например для количества.</p>${loading?'<p class="hint" role="status">Загружаем таблицу комнаты…</p>':''}${error?`<p class="merchant-error" role="alert">${esc(error)}</p><button type="button" class="button outline" data-loot-action="refresh">Повторить загрузку</button>`:''}<div class="loot-roll-result" role="status" aria-live="polite">${found?`<article><div class="loot-result-head"><strong>${last.total}</strong><div><small>d% ${String(last.tens).padStart(2,'0')} + единицы ${last.units}</small><h3>${esc(found.name)}</h3></div></div><b class="loot-price">${esc(found.price)}</b>${found.description?`<p>${esc(found.description)}</p>`:''}${button('Изменить эту находку','edit',`data-number="${found.number}"`,'text-button')}</article>`:''}${d10!=null?`<p class="loot-d10-result">Отдельный d10: <strong>${d10}</strong></p>`:''}</div><details class="loot-table-fold" data-loot-fold ${expanded?'open':''}><summary>Таблица находок · 100 <span aria-hidden="true">▾</span></summary><div class="loot-filters"><label>Диапазон<select id="loot-range">${Array.from({length:10},(_,i)=>`<option value="${i}" ${i===range?'selected':''}>${i*10+1}–${i*10+10}</option>`).join('')}</select></label><label>Поиск по всем 100 находкам<input id="loot-search" type="search" placeholder="Название, свойство или номер…" value="${esc(query)}"></label></div><div class="loot-entries">${matches.map(x=>`<article class="loot-entry"><span class="loot-number">${x.number}</span><div class="loot-entry-copy"><b>${esc(x.name)}</b>${x.custom?'<small class="loot-custom">Изменено для комнаты</small>':''}${x.description?`<p>${esc(x.description)}</p>`:''}</div><div class="loot-entry-actions"><strong>${esc(x.price)}</strong>${button('Изменить','edit',`data-number="${x.number}"`,'text-button')}</div></article>`).join('')||'<p class="hint">Находок с таким названием или свойством нет.</p>'}</div></details></section>`;
 }
 function edit(number){const item=rows().find(x=>x.number===number);if(!item)return;
  showDialog(`Находка №${number}`,`<form data-loot-form data-room="${esc(ctx().room.id)}" data-number="${number}" data-revision="${item.revision}"><p class="hint">Правка действует только в комнате «${esc(ctx().room.name)}».</p><label>Название<input name="name" required maxlength="200" value="${esc(item.name)}"></label><label>Цена выкупа<input name="price" required maxlength="100" value="${esc(item.price)}" placeholder="Например: 15 зм"></label><label>Описание и свойства<textarea name="description" maxlength="5000" rows="5">${esc(item.description)}</textarea></label><p class="merchant-error" role="alert"></p><div class="dialog-actions"><button type="submit" class="button primary">Сохранить для комнаты</button><button type="button" class="button outline" data-loot-action="close">Отмена</button></div></form>`,true);
 }
 async function submit(form){const controls=[...form.querySelectorAll('input,textarea,button')];try{
  if(!master())throw Error('MASTER_REQUIRED');if(form.dataset.room!==ctx().room?.id)throw Error('Комната изменилась. Откройте находку заново.');
  const data=validateLootItem({number:Number(form.dataset.number),name:form.elements.namedItem('name').value,price:form.elements.namedItem('price').value,description:form.elements.namedItem('description').value});
  controls.forEach(x=>x.disabled=true);
  const r=await cloud.client.rpc('save_party_loot_item',{target_room:form.dataset.room,loot_number:data.number,loot_data:data,expected_revision:Number(form.dataset.revision)});if(r.error)throw r.error;
  if(form.isConnected)document.querySelector('#dialog').close();await refresh();toast('Находка сохранена для комнаты');
 }catch(e){if(form.isConnected){const el=form.querySelector('.merchant-error');el.textContent=message(e);el.tabIndex=-1;el.scrollIntoView({block:'nearest'});el.focus({preventScroll:true});controls.forEach(x=>x.disabled=false);}}}
 document.addEventListener('click',e=>{const el=e.target.closest('[data-loot-action]');if(!el)return;e.preventDefault();const a=el.dataset.lootAction;if(a==='close'){document.querySelector('#dialog').close();return;}if(!master())return;
  if(a==='refresh'){refresh();return;}if(loading||error)return;
  if(a==='percentile')last=rollPercentile();if(a==='d10')d10=rollD10();if(a==='edit'){edit(Number(el.dataset.number));return;}onChange();
 });
 document.addEventListener('submit',e=>{if(e.target.hasAttribute('data-loot-form')){e.preventDefault();submit(e.target);}});
 document.addEventListener('input',e=>{if(e.target.id==='loot-search'){query=e.target.value;onChange();}});
 document.addEventListener('change',e=>{if(e.target.id==='loot-range'){range=Number(e.target.value);onChange();}});
 document.addEventListener('toggle',e=>{if(e.target.hasAttribute?.('data-loot-fold')&&e.target.isConnected)expanded=e.target.open;},true);
 return {view,refresh,clear};
}
