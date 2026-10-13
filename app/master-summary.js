import {derive,STATS,signed} from './engine.js?v=20261013-03';

// Only these public game values are shared with a room's master.
export function masterSummary(c,dataset){
 const s=derive(c,dataset),label=(kind,id)=>dataset[kind]?.find(x=>x.id===id)?.label||'';
 return {id:c.id,name:c.name,level:c.level,className:label('classes',c.classId),subclassName:c.level>=3?label('subclasses',c.subclassId):'',
 hp:s.hp,hpMax:s.hpMax,tempHp:Number(c.tempHp)||0,ac:s.ac,initiative:s.initiative,prof:s.prof,speed:s.speed,passive:s.passive,
 spellDC:s.casting?s.spellDC:null,spellAttack:s.casting?s.spellAttack:null,castingAbility:s.casting?STATS[s.casting.ability]:null,
 abilities:Object.keys(STATS).map(key=>({key,label:STATS[key],score:s.stats[key],modifier:s.mods[key],save:s.mods[key]+(s.saves.has(key)?s.prof:0)})),
 conditions:[...(c.conditions||[])],updatedAt:new Date().toISOString()};
}

export function masterSummaryHtml(c,esc){
 const tile=(label,value,cls='')=>`<div class="master-stat ${cls}"><small>${label}</small><b>${esc(value??'—')}</b></div>`;
 return `<article class="master-hero"><header><div><h3>${esc(c.name)}</h3><p>${esc(c.className)}${c.subclassName?' · '+esc(c.subclassName):''} · ${esc(c.level)} ур.</p></div><span class="tag">СВОДКА</span></header><div class="master-stats">${tile('Хиты',`${c.hp} / ${c.hpMax}`,'master-hp')}${tile('КД',c.ac)}${tile('Инициатива',signed(Number(c.initiative)||0))}${tile('Мастерство',signed(Number(c.prof)||0))}${tile('Скорость',`${c.speed} фт`)}${tile('Пассивная внимательность',c.passive)}${c.tempHp?tile('Временные хиты',c.tempHp):''}</div>${c.spellDC!==null&&c.spellDC!==undefined?`<div class="master-magic">${tile('Сл заклинаний',c.spellDC)}${tile('Атака заклинанием',signed(Number(c.spellAttack)||0))}${tile('Магическая характеристика',c.castingAbility)}</div>`:''}<div class="master-abilities">${(c.abilities||[]).map(a=>`<div><small>${esc(a.label)}</small><b>${esc(a.score)} <em>${signed(Number(a.modifier)||0)}</em></b><span>Спасбросок ${signed(Number(a.save)||0)}</span></div>`).join('')}</div>${c.conditions?.length?`<p class="master-conditions">Состояния: ${c.conditions.map(esc).join(' · ')}</p>`:''}</article>`;
}
