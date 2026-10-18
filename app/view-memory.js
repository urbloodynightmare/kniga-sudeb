const PAGES=new Set(['party','character','library','journal','merchants','combat']);
const SECTIONS=new Set(['sheet','growth','spells','inventory','story','notes']);
export const viewKey=v=>v.page==='character'?`character:${v.selected}:${v.section}`:v.page;
export function rememberView(memory,view,snapshot){
 if(!PAGES.has(view.page))return;
 memory.views??={};memory.views[viewKey(view)]=structuredClone(snapshot);
 if(view.page==='character'){
  memory.characters??={};memory.characters[view.selected]=SECTIONS.has(view.section)?view.section:'sheet';
  memory.heroes={page:'character',selected:view.selected,section:memory.characters[view.selected]};
 }else if(view.page==='party')memory.heroes={page:'party'};
}
export function resolveView(memory,target,characters,{selected,section}={}){
 const exists=id=>characters.some(c=>c.id===id);
 if(target==='character')return exists(selected)?{page:'character',selected,section:SECTIONS.has(section)?section:memory.characters?.[selected]||'sheet'}:{page:'party'};
 if(target==='heroes'){
  const previous=memory.heroes;
  return previous?.page==='character'&&exists(previous.selected)?resolveView(memory,'character',characters,previous):{page:'party'};
 }
 return {page:PAGES.has(target)?target:'party'};
}

// Folding hides existing nodes instead of replacing them, preserving editors and form state.
export function prepareCollapsibleBlocks(root,folds,onToggle){
 for(const block of root.querySelectorAll('section.panel,section.active-abilities-section,section.active-weapon-section,section.active-spell-book')){
  if(block.dataset.foldKey)continue;
  const heading=[...block.children].find(el=>el.matches('h2,h3')||el.querySelector('h2,h3'));
  const title=heading?.matches('h2,h3')?heading:heading?.querySelector('h2,h3');
  if(!title||title.closest('section')!==block||heading.matches('details')||heading.querySelector('[aria-expanded]'))continue;
  const label=title.textContent.trim();
  const context=block.closest('[data-room-id],[data-room]');
  const key=block.id||block.querySelector('[data-rich-note]')?.dataset.richNote||`${context?.dataset.roomId||context?.dataset.room||''}:${title.textContent.trim()}`;
  block.dataset.foldKey=key;heading.classList.add('block-fold-heading');
  const button=document.createElement('button');button.type='button';button.className='block-fold-toggle';
  const sync=()=>{const collapsed=folds[key]===true;block.classList.toggle('block-is-folded',collapsed);button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',(collapsed?'Развернуть: ':'Свернуть: ')+label);button.textContent=collapsed?'Развернуть ▾':'Свернуть ▴';};
  button.addEventListener('click',()=>{folds[key]=!block.classList.contains('block-is-folded');sync();onToggle();});heading.append(button);sync();
 }
}
