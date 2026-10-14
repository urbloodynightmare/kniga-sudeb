import {derive,STATS,SKILLS,signed} from './engine.js?v=20261014-21';

// Only these public game values are shared with a room's master.
export function masterSummary(c,dataset){
 const s=derive(c,dataset),label=(kind,id)=>dataset[kind]?.find(x=>x.id===id)?.label||'';
 return {id:c.id,name:c.name,level:c.level,className:label('classes',c.classId),subclassName:c.level>=3?label('subclasses',c.subclassId):'',
 hp:s.hp,hpMax:s.hpMax,tempHp:Number(c.tempHp)||0,ac:s.ac,initiative:s.initiative,prof:s.prof,speed:s.speed,passive:s.passive,passiveInsight:s.passiveInsight,maneuverDC:s.maneuverDC,maneuverAbility:s.maneuverAbility?STATS[s.maneuverAbility]:null,
 spellDC:s.casting?s.spellDC:null,spellAttack:s.casting?s.spellAttack:null,castingAbility:s.casting?STATS[s.casting.ability]:null,
 abilities:Object.keys(STATS).map(key=>({key,label:STATS[key],score:s.stats[key],modifier:s.mods[key],save:s.mods[key]+(s.saves.has(key)?s.prof:0)})),
 skills:Object.entries(SKILLS).map(([key,[label,ability]])=>({key,label,ability,bonus:s.skillBonuses[key],proficient:s.skills.has(key),expertise:s.skills.has(key)&&s.expertise.has(key)})),
 conditions:[...(c.conditions||[])],updatedAt:new Date().toISOString()};
}

export function masterSummaryHtml(c,esc,skillsFold={}){
 const tile=(label,value,cls='')=>`<div class="master-stat ${cls}"><small>${label}</small><b>${esc(value??'—')}</b></div>`;
 return `<article class="master-hero"><header><div><h3>${esc(c.name)}</h3><p>${esc(c.className)}${c.subclassName?' · '+esc(c.subclassName):''} · ${esc(c.level)} ур.</p></div><span class="tag">СВОДКА</span></header><div class="master-stats">${tile('Хиты',`${c.hp} / ${c.hpMax}`,'master-hp')}${tile('КД',c.ac)}${tile('Инициатива',signed(Number(c.initiative)||0))}${tile('Мастерство',signed(Number(c.prof)||0))}${tile('Скорость',`${c.speed} фт`)}${tile('Пассивная внимательность',c.passive)}${tile('Пассивная проницательность',c.passiveInsight??(c.skills?.some(x=>x.key==='insight')?10+(Number(c.skills.find(x=>x.key==='insight').bonus)||0):null))}${c.maneuverDC!=null?tile('Сл манёвров',c.maneuverDC):''}${c.tempHp?tile('Временные хиты',c.tempHp):''}</div>${c.spellDC!==null&&c.spellDC!==undefined?`<div class="master-magic">${tile('Сл заклинаний',c.spellDC)}${tile('Атака заклинанием',signed(Number(c.spellAttack)||0))}${tile('Магическая характеристика',c.castingAbility)}</div>`:''}<div class="master-abilities">${(c.abilities||[]).map(a=>`<div><small>${esc(a.label)}</small><b>${esc(a.score)} <em>${signed(Number(a.modifier)||0)}</em></b><span>Спасбросок ${signed(Number(a.save)||0)}</span></div>`).join('')}</div>${masterSkillsHtml(c,esc,true,skillsFold)}${c.conditions?.length?`<p class="master-conditions">Состояния: ${c.conditions.map(esc).join(' · ')}</p>`:''}</article>`;
}

export function masterSkillsHtml(c,esc,collapsible=false,{key='',open=false}={}){
 const skills=Array.isArray(c.skills)?c.skills:[];
 const tag=collapsible?'details':'section';
 return `<${tag} class="master-skills" ${collapsible?`${key?`data-room-skills="${esc(key)}"`:""} ${open?"open":""}`:""}>${collapsible?'<summary class="master-skills-toggle"><h3>Навыки</h3><span aria-hidden="true">▾</span></summary>':'<h3>Навыки</h3>'}${skills.length?`<p class="hint">● Владение · ◆ Экспертиза</p><table><thead><tr><th scope="col">Навык</th><th scope="col">Бонус</th></tr></thead><tbody>${skills.map(a=>`<tr class="${a.proficient?'proficient':''}"><th scope="row"><span class="master-skill-mark" aria-label="${a.expertise?'Экспертиза':a.proficient?'Владение':'Без владения'}">${a.expertise?'◆':a.proficient?'●':'○'}</span>${esc(a.label)}</th><td>${esc(Number.isFinite(Number(a.bonus))?signed(Number(a.bonus)):'—')}</td></tr>`).join('')}</tbody></table>`:'<p class="hint">Игроку нужно открыть обновлённый сайт, чтобы опубликовать навыки своего персонажа.</p>'}</${tag}>`;
}
