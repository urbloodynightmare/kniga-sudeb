// Shared room state is separate from private player books and their save queue.
export function createRooms({cloud,esc,safeRich,showDialog,toast,personalJournal,characterPreview}){
 let rooms=[],roomId='',members=[],notes=[],sheets=[],error='',loading=false,channel=null,timer=null,userId=null,refreshing=false,refreshAgain=false,editor=null;
 const room=()=>rooms.find(r=>r.id===roomId),key=()=>`book-of-fates-room:${cloud.user?.id||'local'}`;
 const draftKey=(id='new')=>`${key()}:draft:${roomId}:${id}`;
 const rpc=async(name,args={})=>{const result=await cloud.client.rpc(name,args);if(result.error)throw result.error;return result.data;};
 const translate=e=>e.message?.includes('REVISION_CONFLICT')?'Запись уже изменил другой участник. Ваш текст сохранён в черновике.':e.message?.includes('INVITE_NOT_FOUND')?'Приглашение не найдено или уже заменено.':e.message?.includes('MASTER_REQUIRED')?'Просмотр карточек доступен только текущему мастеру.':e.message?.includes('OWNER_CANNOT_LEAVE')?'Создатель комнаты не может выйти из неё.':e.message?.includes('TRANSFER_MASTER_FIRST')?'Сначала передайте роль мастера другому участнику.':e.message?.includes('NOT_ALLOWED')?'Нет доступа к этой комнате.':e.message?.includes('PGRST202')||e.code==='42P01'?'Комнаты пока не подключены к базе. Требуется выполнить миграцию rooms.sql.':'Не удалось связаться с комнатой. Попробуйте ещё раз; черновики сохранены на устройстве.';
 function paint(){const root=document.querySelector('#party-room-root');if(root)root.innerHTML=view();const personal=document.querySelector('.personal-journal');if(personal&&!personal.querySelector('[data-room-action="note-import"]')&&room())personal.insertAdjacentHTML('beforeend',button('Перенести в общий дневник','note-import'));}
 function stop(){if(channel)cloud.client?.removeChannel(channel);channel=null;clearInterval(timer);timer=null;}
 function attach(){stop();if(!roomId)return;const selectedRoom=roomId;channel=cloud.client.channel(`party:${selectedRoom}`).on('postgres_changes',{event:'*',schema:'public',table:'party_notes',filter:`room_id=eq.${selectedRoom}`},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'party_members',filter:`room_id=eq.${selectedRoom}`},()=>refresh()).subscribe();timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},12000);}
 async function refresh(){
  if(!cloud.user||refreshing){refreshAgain=refreshing;return;}
  refreshing=true;const expectedUser=cloud.user.id,expectedRoom=roomId;
  try{
   const nextRooms=await rpc('list_party_rooms');if(cloud.user?.id!==expectedUser||roomId!==expectedRoom)return;
   rooms=nextRooms||[];if(!room()){roomId=rooms[0]?.id||'';attach();}
   if(roomId){const selected=roomId;const results=await Promise.all([cloud.client.from('party_members').select('user_id,display_name').eq('room_id',selected).order('joined_at'),cloud.client.from('party_notes').select('*').eq('room_id',selected).order('updated_at',{ascending:false})]);
    for(const r of results)if(r.error)throw r.error;
    if(cloud.user?.id!==expectedUser||roomId!==selected)return;
    members=results[0].data||[];notes=results[1].data||[];
    if(room()?.master_id===expectedUser){const nextSheets=await rpc('party_character_sheets',{target_room:selected});if(cloud.user?.id!==expectedUser||roomId!==selected)return;sheets=nextSheets||[];}else sheets=[];
   }else{members=[];notes=[];sheets=[];}
   error='';loading=false;paint();
  }catch(e){if(cloud.user?.id===expectedUser){error=translate(e);loading=false;paint();}}
  finally{refreshing=false;if(refreshAgain){refreshAgain=false;queueMicrotask(refresh);}}
 }
 async function start(){if(userId===cloud.user?.id)return;stop();editor=null;rooms=[];members=[];notes=[];sheets=[];error='';userId=cloud.user?.id||null;if(!userId){paint();return;}roomId=localStorage.getItem(key())||'';loading=true;await refresh();attach();if(new URL(location.href).searchParams.has('party'))roomDialog('join');}
 const button=(text,action,extra='',cls='outline')=>`<button type="button" class="button ${cls}" data-room-action="${action}" ${extra}>${text}</button>`;
 const who=id=>members.find(m=>m.user_id===id)?.display_name||'Участник';
 const date=value=>new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 function view(){
  if(!cloud.user)return `<section class="panel"><h2>Общая комната партии</h2><p>Войдите в свой аккаунт, чтобы создать комнату или присоединиться к партии.</p></section>`;
  const r=room(),isMaster=r?.master_id===cloud.user.id,canManage=r&&(r.owner_id===cloud.user.id||isMaster);
  return `<section class="panel room-launch"><div><h2>Комната партии</h2><p class="hint">Общие записи участников и карточки героев для мастера.</p></div><div class="room-actions">${button('Создать комнату','create')}${button('Присоединиться','join')}</div></section>${error?`<section class="panel room-error" role="alert">${esc(error)} ${button('Повторить','refresh')}</section>`:''}${loading?'<p class="hint">Загружаем комнату…</p>':''}${rooms.length?`<label class="room-selector">Ваша комната<select id="party-room-select">${rooms.map(x=>`<option value="${x.id}" ${x.id===roomId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:''}${r?`<section class="panel room-overview"><div class="panel-title"><div><div class="eyebrow muted">${isMaster?'ВЫ МАСТЕР':'ВЫ ИГРОК'}</div><h2>${esc(r.name)}</h2></div>${button('↻ Обновить','refresh')}</div><p class="hint">Мастер: <b>${esc(who(r.master_id))}</b>. Мастер просматривает карточки всех участников; каждый игрок редактирует своих героев.</p><div class="room-members">${members.map(m=>`<span>${esc(m.display_name)} ${m.user_id===r.master_id?'<b>МАСТЕР</b>':''}${m.user_id===cloud.user.id?' · вы':''}</span>`).join('')}</div><div class="room-actions">${canManage?button('Приглашение и участники','manage'):''}${r.owner_id!==cloud.user.id?button('Выйти из комнаты','leave','','subtle danger'):''}</div></section><section class="panel"><div class="panel-title"><h2>Общий дневник</h2>${button('+ Новая запись','note-new','','primary')}</div><p class="hint">Изменения видны всей комнате. При одновременном редактировании ваш вариант сохраняется в черновике.</p><div class="room-notes">${notes.filter(n=>!n.archived).map(n=>`<article class="room-note"><div class="room-note-heading"><div><h3>${esc(n.title)}</h3><small>${esc(who(n.editor_id))} · ${date(n.updated_at)} · версия ${n.revision}</small></div><div class="room-actions">${button('Изменить','note-edit',`data-id="${n.id}"`)}${button('История','note-history',`data-id="${n.id}"`,'subtle')}${button('В архив','note-archive',`data-id="${n.id}"`,'subtle')}</div></div><div class="room-note-body">${safeRich(n.body)}</div></article>`).join('')||'<p class="empty-text">Пока нет общих записей. Добавьте первую или перенесите личный дневник ниже.</p>'}</div>${notes.some(n=>n.archived)?`<details class="room-archive"><summary>Архив (${notes.filter(n=>n.archived).length})</summary>${notes.filter(n=>n.archived).map(n=>`<div class="resource"><b>${esc(n.title)}</b>${button('Восстановить','note-restore',`data-id="${n.id}"`)}</div>`).join('')}</details>`:''}</section>${isMaster?`<section class="panel"><div class="panel-title"><h2>Карточки участников</h2><span class="tag">ТОЛЬКО ПРОСМОТР</span></div><div class="room-characters">${sheets.map(book=>`<div><h3>${esc(book.display_name)}</h3>${book.characters.map(c=>button(`${esc(c.name)} · ${c.level} ур.`,'character',`data-user="${book.user_id}" data-id="${esc(c.id)}"`)).join('')||'<p class="hint">Персонажей пока нет.</p>'}</div>`).join('')}</div></section>`:''}`:''}`;
 }
 function input(label,name,value='',attrs=''){return `<label>${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;}
 function roomDialog(mode){showDialog(mode==='create'?'Создать комнату':'Присоединиться к партии',`<form data-room-form="${mode}">${mode==='create'?input('Название партии','room_name','','required maxlength="100"'):input('Код или ссылка приглашения','code',new URL(location.href).searchParams.get('party')||'','required')} ${input('Как вас зовут в комнате','member_name','','required maxlength="80"')}<p class="hint">Присоединяясь, вы открываете текущему мастеру комнаты доступ к просмотру своих карточек персонажей. Общие записи доступны всем участникам.</p>${mode==='create'?'<p class="hint">Вы станете первым мастером. Роль можно передать участнику; в комнате всегда один мастер.</p>':''}<p class="room-form-error" role="alert"></p><div class="dialog-actions"><button type="submit" class="button primary">${mode==='create'?'Создать':'Присоединиться'}</button></div></form>`);}
 function manage(){const r=room();if(!r)return;const url=new URL(location.origin+location.pathname);url.searchParams.set('party',r.invite_code);showDialog('Приглашение и участники',`<label>Ссылка приглашения<input id="party-invite-link" readonly value="${esc(url.href)}"></label><p class="hint">По этой ссылке игрок входит в комнату после входа в свой аккаунт.</p><div class="room-actions">${button('Скопировать ссылку','copy-invite')}${button('Заменить приглашение','rotate')}</div><hr><label>Единственный мастер<select id="party-master-select">${members.map(m=>`<option value="${m.user_id}" ${m.user_id===r.master_id?'selected':''}>${esc(m.display_name)}</option>`).join('')}</select></label><p class="hint">После передачи новый мастер увидит карточки, прежний потеряет доступ к чужим листам.</p>${button('Передать роль мастера','master')}<hr>${members.filter(m=>m.user_id!==r.owner_id&&m.user_id!==r.master_id&&m.user_id!==cloud.user.id).map(m=>`<div class="resource"><b>${esc(m.display_name)}</b>${button('Исключить','remove-member',`data-user="${m.user_id}"`,'subtle danger')}</div>`).join('')}`);}
 function noteEditor(note=null,bodyOverride=null){
  const id=note?.id||'new';let draft=null;try{draft=JSON.parse(localStorage.getItem(draftKey(id))||'null');}catch{}
  editor={id:note?.id||null,draftId:id,revision:draft?.revision??note?.revision??0,roomId};
  showDialog(note?'Изменить общую запись':'Новая общая запись',`<form data-room-form="note">${input('Заголовок','title',draft?.title||note?.title||'','required maxlength="150"')}<div class="room-format">${[['bold','Ж'],['italic','К'],['underline','Ч'],['insertUnorderedList','• Список'],['insertOrderedList','1. Список']].map(([cmd,label])=>button(label,'format',`data-command="${cmd}"`,'outline')).join('')}</div><div class="room-note-editor" contenteditable="true" role="textbox" aria-label="Текст общей записи" aria-multiline="true">${safeRich(draft?.body??bodyOverride??note?.body??'')}</div><p class="hint">${draft?'Восстановлен ваш черновик.':'Черновик сохраняется на этом устройстве при наборе.'}</p><p class="room-form-error" role="alert"></p><div class="dialog-actions"><button type="submit" class="button primary">Сохранить для партии</button>${button('Закрыть','close')}</div></form>`,true);
 }
 function saveDraft(){const form=document.querySelector('[data-room-form="note"]');if(!form||!editor)return;const value={title:form.elements.title.value,body:safeRich(form.querySelector('.room-note-editor').innerHTML),revision:editor.revision};try{localStorage.setItem(draftKey(editor.draftId),JSON.stringify(value));}catch{form.querySelector('.room-form-error').textContent='Не удалось сохранить черновик на устройстве. Скопируйте текст перед закрытием.';}}
 async function history(id){const result=await cloud.client.from('party_note_history').select('*').eq('note_id',id).order('revision',{ascending:false});if(result.error)throw result.error;showDialog('История записи',result.data.map(n=>`<details class="room-history"><summary>Версия ${n.revision} · ${esc(who(n.editor_id))} · ${date(n.saved_at)}</summary><h3>${esc(n.title)}</h3><div class="room-note-body">${safeRich(n.body)}</div></details>`).join('')||'<p>История пуста.</p>',true);}
 async function action(el){
  const a=el.dataset.roomAction;try{
   if(a==='create'||a==='join')return roomDialog(a);
   if(a==='refresh')return refresh();
   if(a==='manage')return manage();
   if(a==='close'){saveDraft();document.querySelector('#dialog').close();return;}
   if(a==='format'){const area=document.querySelector('.room-note-editor');area?.focus();document.execCommand(el.dataset.command,false);saveDraft();return;}
   if(a==='note-new')return noteEditor();
   if(a==='note-import')return noteEditor(null,personalJournal());
   if(a==='note-edit')return noteEditor(notes.find(n=>n.id===el.dataset.id));
   if(a==='note-history')return await history(el.dataset.id);
   if(a==='note-archive'||a==='note-restore'){const n=notes.find(n=>n.id===el.dataset.id);await rpc('archive_party_note',{target_room:roomId,note_id:n.id,expected_revision:n.revision,archive_value:a==='note-archive'});await refresh();return;}
   if(a==='copy-invite'){await navigator.clipboard.writeText(document.querySelector('#party-invite-link').value);toast('Приглашение скопировано');return;}
   if(a==='rotate'){await rpc('rotate_party_invite',{target_room:roomId});await refresh();manage();return;}
   if(a==='master'){const next=document.querySelector('#party-master-select').value;await rpc('change_party_master',{target_room:roomId,new_master:next});document.querySelector('#dialog').close();await refresh();toast('Роль мастера передана');return;}
   if(a==='leave'||a==='remove-member'){await rpc('leave_party_room',{target_room:roomId,target_user:a==='leave'?cloud.user.id:el.dataset.user});document.querySelector('#dialog').close();await refresh();return;}
   if(a==='character'){const book=sheets.find(b=>b.user_id===el.dataset.user),c=book?.characters.find(c=>c.id===el.dataset.id);if(c)characterPreview(c,book.dataset,book.display_name);return;}
  }catch(e){toast(translate(e));}
 }
 async function submit(form){
  const mode=form.dataset.roomForm,button=form.querySelector('[type="submit"]'),target=roomId,noteContext=editor,accountKey=key();button.disabled=true;form.querySelector('.room-form-error').textContent='';
  try{
   const data=new FormData(form);
   if(mode==='note'){
    saveDraft();const title=data.get('title').trim();if(!title)throw Error('INVALID_NAME');
    const body=safeRich(form.querySelector('.room-note-editor').innerHTML);form.elements.title.disabled=true;form.querySelector('.room-note-editor').contentEditable='false';
    const result=await rpc('save_party_note',{target_room:noteContext.roomId,note_id:noteContext.id,note_title:title,note_body:body,expected_revision:noteContext.revision});
    const savedDraftKey=`${accountKey}:draft:${noteContext.roomId}:${noteContext.draftId}`;try{const draft=JSON.parse(localStorage.getItem(savedDraftKey)||'null');if(draft&&draft.body===body&&draft.title.trim()===title)localStorage.removeItem(savedDraftKey);}catch{}if(editor===noteContext){editor=null;document.querySelector('#dialog').close();}await refresh();toast('Запись сохранена для партии');return result;
   }
   if(mode==='create')roomId=await rpc('create_party_room',{room_name:data.get('room_name').trim(),member_name:data.get('member_name').trim()});
   if(mode==='join'){let code=data.get('code').trim();try{code=new URL(code).searchParams.get('party')||code;}catch{}roomId=await rpc('join_party_room',{code,member_name:data.get('member_name').trim()});const url=new URL(location.href);url.searchParams.delete('party');historyReplace(url);}
   localStorage.setItem(key(),roomId);document.querySelector('#dialog').close();await refresh();attach();paint();
  }catch(e){if(mode==='note'){form.elements.title.disabled=false;form.querySelector('.room-note-editor').contentEditable='true';}form.querySelector('.room-form-error').textContent=e.message?.includes('INVALID_NAME')?'Введите название.':translate(e);if(mode==='note'&&e.message?.includes('REVISION_CONFLICT')){
    const notice=document.createElement('p');notice.className='hint';notice.textContent='Ваш черновик остаётся здесь. Можно сохранить его отдельной записью, а актуальную версию проверить в дневнике.';form.querySelector('.room-form-error').append(notice);
    if(!form.querySelector('[data-room-action="conflict-copy"]'))form.querySelector('.dialog-actions').insertAdjacentHTML('beforeend',buttonHtmlCopy());
   }else roomId=target;button.disabled=false;}
 }
 function buttonHtmlCopy(){return button('Сохранить отдельной записью','conflict-copy');}
 function historyReplace(url){window.history.replaceState(null,'',url.href);}
 document.addEventListener('mousedown',e=>{if(e.target.closest('[data-room-action="format"]'))e.preventDefault();});
 document.addEventListener('input',e=>{if(e.target.closest('[data-room-form="note"]'))saveDraft();});
 document.addEventListener('click',e=>{const el=e.target.closest('[data-room-action]');if(!el)return;e.preventDefault();if(el.dataset.roomAction==='conflict-copy'){saveDraft();const form=el.closest('form');editor.id=null;editor.revision=0;submit(form);return;}action(el);});
 document.addEventListener('submit',e=>{if(e.target.dataset.roomForm){e.preventDefault();submit(e.target);}});
 document.addEventListener('change',async e=>{if(e.target.id==='party-room-select'){roomId=e.target.value;localStorage.setItem(key(),roomId);members=[];notes=[];sheets=[];await refresh();attach();}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&userId)refresh();});
 return {start,view,hasRoom:()=>!!room(),refresh,join:()=>roomDialog('join')};
}
