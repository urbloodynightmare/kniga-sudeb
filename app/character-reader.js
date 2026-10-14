// A separate read-only surface: no foreign character enters the private book.
export function readOnlyFragment(html,spellDescriptions={}){
 const template=document.createElement('template');template.innerHTML=html;
 for(const row of template.content.querySelectorAll('.spell-row')){const id=row.querySelector('.spell-info')?.dataset.id;if(!id||!spellDescriptions[id])continue;const detail=document.createElement('details');detail.className='reader-spell-description';detail.innerHTML='<summary>Описание заклинания</summary><div>'+spellDescriptions[id]+'</div>';row.append(detail);}
 template.content.querySelector('#spell-search')?.closest('.filter-bar')?.remove();
 template.content.querySelectorAll('.sheet-menu,.sheet-menu-return,.choice-banner,#sheet-dice,.health-quick,.health-adjust,.rest-buttons,.wallet-controls,.wallet-hint,.item-actions,.rich-toolbar,.editor-save-hint,.notes-only .section-heading .tag,.aha-actions,.spell-filters,.equipment-collapse,.section-heading .tag,.section-heading .hint,#sheet-skills .panel-title small').forEach(e=>e.remove());
 const displayActions=new Set(['roll','slot','inspiration','equipment-slot','spell-detail','free-spell','container-toggle']);
 for(const hint of template.content.querySelectorAll('.stat-tile small'))if(hint.textContent.includes('БРОСИТЬ'))hint.remove();
 for(const button of template.content.querySelectorAll('button')){
  if(!displayActions.has(button.dataset.action)&&!button.matches('.equipment-slot,.spell-info,.spell-circle')){button.remove();continue;}
  button.disabled=true;button.tabIndex=-1;
 }
 for(const input of template.content.querySelectorAll('input,select,textarea'))input.disabled=true;
 for(const el of template.content.querySelectorAll('*')){
  for(const attr of [...el.attributes])if(attr.name.startsWith('data-')||attr.name.startsWith('on')||attr.name==='contenteditable')el.removeAttribute(attr.name);
 }
 return template.innerHTML;
}

export function createCharacterReader({esc,showDialog}){
 let view=null;
 function content(){return `<p class="reader-caption">Полный лист · только просмотр</p><nav class="reader-tabs" aria-label="Разделы полного листа">${view.sections.map(s=>`<button type="button" data-reader-section="${s.id}" aria-pressed="${s.id===view.selected}">${esc(s.label)}</button>`).join('')}</nav><div class="reader-content">${view.sections.find(s=>s.id===view.selected)?.html||''}</div>`;}
 function open({name,identity,portrait='',sections,spellDescriptions={}}){
  view={sections:sections.map(s=>({...s,html:readOnlyFragment(s.html,spellDescriptions)})),selected:sections[0].id};
  showDialog(esc(name),`<div class="character-reader"><div class="reader-hero">${portrait}<p class="reader-identity">${esc(identity)}</p></div><div id="character-reader-content">${content()}</div></div>`,true);
  document.querySelector('#dialog').dataset.characterReader='true';
 }
 function close(){const dialog=document.querySelector('#dialog');if(dialog?.dataset.characterReader==='true'){dialog.close();dialog.innerHTML='';}view=null;}
 document.addEventListener('click',e=>{const button=e.target.closest('[data-reader-section]');if(!button||!view)return;e.preventDefault();if(!view.sections.some(s=>s.id===button.dataset.readerSection))return;view.selected=button.dataset.readerSection;document.querySelector('#character-reader-content').innerHTML=content();});
 document.querySelector('#dialog')?.addEventListener('close',()=>{view=null;delete document.querySelector('#dialog').dataset.characterReader;});
 return {open,close};
}
