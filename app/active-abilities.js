// Activation rules are explicit data. Descriptions never execute as code.
const cost=(resourceId,amount=1)=>({resourceId,amount});
const variant=(id,label,costs=[],extra={})=>({id,label,costs,...extra});
const paid=(id,action='По описанию',effect)=>({action,variants:[variant('use','Применить',[cost(id)],{effect})]});
const RULES={
 'purple-pull':{action:'При попадании / вместо одной атаки',variants:[variant('hit','Притянуть после попадания',[cost('monk-focus')]),variant('held','Притянуть захваченную цель',[cost('monk-focus')])]},
 'inv-pact-blade-trait':{action:'Бонусное действие',variants:[variant('use','Создать или связать оружие')]},
 'inv-pact-chain-trait':{action:'Действие Магия',variants:[variant('use','Призвать фамильяра')]},
 'inv-one-with-shadows-trait':{action:'Действие Магия · тусклый свет или темнота',variants:[variant('use','Невидимость')]},
 'inv-armor-of-shadows-trait':{action:'Действие Магия',variants:[variant('use','Доспех мага',[],{effect:'mage-armor'})]},
 'inv-fiendish-vigor-trait':{action:'Действие Магия',variants:[variant('use','12 временных хитов',[],{effect:'fiendish-vigor'})]},
 'second-wind':paid('second-wind','Бонусное действие','second-wind'),
 'action-surge':paid('action-surge','Без действия'),
 'tactical-mind':{action:'После провала проверки',formulas:['1d10'],note:'Сначала бросьте к10. Заряд тратится только если проверка стала успешной.',variants:[variant('success','Проверка успешна',[cost('second-wind')])]},
 'indomitable':paid('indomitable','После провала спасброска'),
 'wild-shape':paid('wild-shape','Бонусное действие'),
 'symbiotic-entity':{action:'Действие Магия',variants:[variant('use','Применить',[cost('wild-shape')],{effect:'symbiotic'})]},
 'wild-companion':{action:'Действие Магия',variants:[variant('shape','За Дикий облик',[cost('wild-shape')])],slotAlternative:true},
 'wild-resurgence':{action:'Без действия',dynamic:'wild-resurgence'},
 'archdruid':{action:'Без действия',dynamic:'archdruid'},
 'fungal-infestation':paid('fungal-infestation','Реакция'),
 'halo-of-spores':{action:'Реакция',dynamic:'halo'},
 'spreading-spores':{action:'Бонусное действие',variants:[variant('use','Применить')]},
 'magical-cunning':paid('magical-cunning','Ритуал · 1 минута','pact-recovery'),
 'arcane-recovery':{action:'После короткого отдыха',variants:[variant('recover','Выбрать ячейки',[cost('arcane-recovery')],{recovery:true})]},
 'contact-patron':paid('contact-patron','Действие Магия'),
 'stroke-of-luck':paid('stroke-of-luck','После провала испытания к20'),
 'knowledge-from-a-past-life':{...paid('knowledge-from-a-past-life','После броска к20'),formulas:['1d6']},
 'half-orc-endurance':paid('half-orc-endurance','Когда хиты падают до 0','endurance'),
 'luck-points-2024':paid('luck-points-2024','Перед испытанием к20'),
 'mage-slayer-guard':paid('mage-slayer-guard','После провала спасброска'),
 'monk-martial-arts':{action:'Бонусное действие',dynamic:'martial',displayName:'Безоружный удар бонусным действием',note:'Один безоружный удар без расхода концентрации. Не требуется сначала совершать действие Атака. Можно бить рукой, ногой, коленом или локтем: свободная вторая рука не обязательна. Модификатор характеристики добавляется к урону. Шквал ударов — другой вариант того же бонусного действия: 2 удара за 1 очко концентрации (3 удара с 10-го уровня), а не дополнение к этому удару.'},
 'monk-flurry':{action:'Бонусное действие',variants:[variant('use','Шквал ударов',[cost('monk-focus')])]},
 'monk-patient-defense':{action:'Бонусное действие',variants:[variant('free','Отход'),variant('focus','Отход и Уклонение',[cost('monk-focus')],{effect:'patient-defense'})]},
 'monk-step-wind':{action:'Бонусное действие',variants:[variant('free','Рывок'),variant('focus','Рывок и Отход',[cost('monk-focus')])]},
 'monk-deflect':{action:'Реакция',variants:[variant('free','Уменьшить урон'),variant('redirect','Перенаправить',[cost('monk-focus')])],dynamic:'deflect'},
 'monk-metabolism':paid('monk-metabolism','При броске инициативы','metabolism'),
 'monk-perfect-focus':{action:'При броске инициативы',variants:[variant('use','Восстановить до 4',[],{effect:'perfect-focus'})]},
 'monk-slow-fall':{action:'Реакция',variants:[variant('use','Применить')]},
 'monk-self-restoration':{action:'В конце своего хода',variants:[variant('use','Снять состояние')],note:'Выберите снимаемое состояние в блоке состояний листа.'},
 'jackpot':{action:'Реакция · раз за раунд',variants:[variant('use','Джекпот',[cost('elation-ardor',4)],{effect:'jackpot'})]},
 'moment-of-aha-all-in':{...paid('moment-of-aha-all-in','Действие','all-in'),restoreWithPact:true,formulas:['8d6']},
 'cunning-action':{action:'Бонусное действие',variants:[variant('dash','Рывок'),variant('disengage','Отход'),variant('hide','Затаивание')]},
 'steady-aim':{action:'Бонусное действие',variants:[variant('use','Применить')]},
 'uncanny-dodge':{action:'Реакция',variants:[variant('use','Применить')]},
 'fast-hands':{action:'Бонусное действие',variants:[variant('use','Применить')]},
 'sneak-attack':{action:'При попадании · раз за ход',dynamic:'sneak'},
 'cunning-strike':{action:'Вместо костей Скрытой атаки',dynamic:'cunning'},
 'devious-strikes':{action:'Вместо костей Скрытой атаки',dynamic:'devious'},
 'supreme-sneak':{action:'Вместо 1к6 Скрытой атаки',variants:[variant('use','Скрытная атака')],note:'Уберите 1к6 из урона Скрытой атаки этого попадания. Это не заряд отдыха.'},
 'purple-sandu-flow':{action:'При попадании · раз за свой ход',variants:[variant('use','Вместо урона Саньду')]},
 'overchannel':{action:'При сотворении заклинания',dynamic:'overchannel'},
 'healer-battle-medic':{action:'Действие Использование',variants:[variant('use','Применить')],note:'Применение набора целителя и Кость хитов цели расходуются отдельно: выберите реальную цель и её набор.'}
};
const PASSIVE=new Set(['weapon-mastery','extra-attack','two-extra-attacks','three-extra-attacks','monk-focus','monk-heightened','monk-deflect-energy','monk-unarmored-defense','monk-movement','monk-acrobatic','monk-body-mind','purple-inheritor','purple-limits','true-hit','winner-takes-all','aha-expanded-spells','spores-circle-spells','mystic-arcanum','signature-spells','spell-mastery','fey-touched-extra','shadow-touched-extra','half-elf-origin','half-elf-high-heritage','half-elf-wood-heritage','half-elf-drow-magic','half-orc-compatibility','noble-origin','tactical-shift','improved-cunning-strike','tactical-master']);
const clean=s=>String(s||'').replace(/\[f:.*?\|([^\]]+)\]/g,'$1');
const signed=n=>(n>=0?'+':'')+n;
export function activeResourcePool(c,s){return [...s.resources,...(c.customResources||[]).filter(r=>!s.resources.some(x=>x.id===r.id)).map(r=>({...r,remaining:Math.min(Number(r.max),Math.max(0,Number(r.max)-(Number(c.spent[r.id])||0)))}))];}
export function activeAbilities(c,s){
 const pool=activeResourcePool(c,s),abilities=[];
 for(const t of s.traits){
  if(t.active===false||PASSIVE.has(t.id))continue;
  let rule=RULES[t.id];
  if(!rule&&t.resourceId&&Number(t.cost)>0)rule={action:'По описанию',variants:[variant('use','Применить',[cost(t.resourceId,Number(t.cost)),...(t.chargeId?[cost(t.chargeId)]:[])])]};
  if(!rule&&pool.some(r=>r.id===t.id))rule=paid(t.id);
  if(!rule&&(t.active===true||/(?:бонусн[а-яё]* действ|реакцией|(?:^|\n|\.\s+)действием|один раз (?:за|в) (?:каждый )?(?:ваш )?ход|вы можете накладывать)/i.test(t.description)))rule={action:t.activationType||'По описанию',variants:[variant('use','Применить')]};
  if(!rule)continue;
  rule={...rule,variants:(rule.variants||[]).map(v=>({...v,costs:[...v.costs]})),formulas:[...(rule.formulas||[])]};
  if(rule.dynamic==='martial'){const attack=s.classAttacks.find(a=>a.id==='monk-unarmed');if(attack){const modifier=s.mods[attack.ability];rule.variants=[variant('attack','Атака '+signed(modifier+s.prof),[],{roll:'1d20'+signed(modifier+s.prof)}),variant('damage','Урон '+attack.die+signed(modifier),[],{roll:attack.die+signed(modifier)})];}}
  if(rule.dynamic==='sneak'){rule.formulas=[`${Math.ceil(c.level/2)}d6`];rule.variants=[variant('use','Применить')];}
  if(rule.dynamic==='cunning'||rule.dynamic==='devious'){
   const choices=rule.dynamic==='cunning'?[['poison','Отравление',1],['trip','Подсечка',1],['withdraw','Отступление',1]]:[['daze','Шок',2],['knockout','Нокаут',6],['blind','Ослепление',3]];
   rule.variants=choices.filter(([, ,dice])=>dice<=Math.ceil(c.level/2)).map(([id,label,dice])=>variant(id,`${label} · −${dice}к6`,[],{sneakDice:dice}));
   rule.note='Стоимость вычитается из костей урона текущей Скрытой атаки; запас между ходами не расходуется. Сл = 8 + мастерство + Ловкость: '+(8+s.prof+s.mods.dex)+'.';
  }
  if(rule.dynamic==='halo')rule.formulas=[`1d${c.level>=14?10:c.level>=10?8:c.level>=6?6:4}`];
  if(rule.dynamic==='deflect')rule.formulas=[`1d10${signed(s.mods.dex+c.level)}`];
  if(rule.dynamic==='overchannel'){const used=Number(c.spent['active-counter:overchannel'])||0;rule.variants=[1,2,3,4,5].map(level=>variant('spell-'+level,`${level} круг · ${used?level*(used+1)+'к12 урона себе':'без вреда'}`,[],{effect:'overchannel',spellLevel:level}));rule.note='Ячейка самого заклинания расходуется при его сотворении отдельно. Применений до этого: '+used+'. Повторный урон обходит сопротивления и иммунитеты.';}
  if(rule.dynamic==='wild-resurgence'){
   rule.variants=s.slots.map(slot=>variant('shape-'+slot.id,'Ячейка '+slot.level+' → Дикий облик',[],{slotId:slot.id,effect:'restore-shape',requireEmpty:'wild-shape'}));
   rule.variants.push(variant('slot','Дикий облик → ячейка 1',[cost('wild-shape'),cost('wild-resurgence-slot')],{effect:'restore-first-slot'}));
  }
  if(rule.dynamic==='archdruid')rule.variants=[1,2,3,4].filter(n=>2*n<=9).map(n=>variant('slot-'+n,`${n} Диких обликов → ячейка ${2*n}`,[cost('wild-shape',n),cost('archdruid-conversion')],{effect:'restore-specific-slot',restoreLevel:2*n}));
  if(rule.slotAlternative)rule.variants.push(...s.slots.map(slot=>variant(slot.id,'За ячейку '+slot.level,[],{slotId:slot.id})));
  if(rule.restoreWithPact)rule.variants.push(variant('restore','Восстановить за ячейку договора',[],{slotId:'pact',effect:'restore-all-in'}));
  if(t.id==='jackpot')rule.formulas=[c.level>=10?'3d6':'2d6'];
  if(!rule.variants.length)rule.variants=[variant('use','Применить')];
  if(t.active===true&&t.resourceId)rule.variants=[variant('use','Применить',[cost(t.resourceId,Number(t.cost)||1)])];
  const ability={...t,...rule,name:clean(rule.displayName||t.name),id:t.id||t.key};
  ability.variants=ability.variants.map(v=>({...v,disabledReason:activeUseReason(c,s,ability,v,pool)}));
  abilities.push(ability);
 }
 return abilities;
}
function activeUseReason(c,s,a,v,pool=activeResourcePool(c,s)){
 for(const item of v.costs){if(!Number.isInteger(item.amount)||item.amount<=0)return 'Некорректная стоимость способности';const r=pool.find(r=>r.id===item.resourceId);if(!r)return 'Ресурс не настроен: '+item.resourceId;if(r.remaining<item.amount)return 'Недостаточно: '+r.name;}
 if(v.slotId){const slot=s.slots.find(x=>x.id===v.slotId);if(!slot||slot.max<=(c.spent[slot.id]||0))return 'Нет доступной ячейки';}
 if(v.requireEmpty&&pool.find(r=>r.id===v.requireEmpty)?.remaining>0)return 'Сначала потратьте все использования Дикого облика';
 if(v.effect==='restore-first-slot'&&!s.slots.some(x=>x.level===1&&(c.spent[x.id]||0)>0))return 'Нет потраченной ячейки 1-го круга';
 if(v.effect==='restore-specific-slot'&&!s.slots.some(x=>x.level===v.restoreLevel&&(c.spent[x.id]||0)>0))return 'Нет потраченной ячейки этого круга';
 if(v.effect==='restore-all-in'&&pool.find(r=>r.id==='moment-of-aha-all-in')?.remaining>0)return 'Применение уже доступно';
 if(a.id==='monk-martial-arts'&&!s.martialArtsActive)return 'Боевые искусства недоступны в доспехе или со щитом';
 if(a.id==='jackpot'&&c.jackpotUsed)return 'Джекпот уже использован в этом раунде';
 if(a.id==='half-orc-endurance'&&s.hp!==0)return 'Применяется, когда хиты падают до 0';
 return '';
}
export function activeCostLabel(c,s,v){
 const pool=activeResourcePool(c,s),labels=v.costs.map(x=>`${x.amount} · ${pool.find(r=>r.id===x.resourceId)?.name||'неизвестный ресурс'}`);
 if(v.slotId)labels.push('1 ячейка '+(s.slots.find(x=>x.id===v.slotId)?.level||'')+' круга');
 return labels.join(' + ')||(v.sneakDice?'Вычесть из урона':'Без расхода ресурса');
}
export function useActiveAbility(c,s,id,variantId,options={}){
 const ability=activeAbilities(c,s).find(x=>x.id===id),v=ability?.variants.find(v=>v.id===variantId);
 if(!v)throw Error('Способность или вариант применения недоступны.');
 const reason=activeUseReason(c,s,ability,v);if(reason)throw Error(reason);
 const next=structuredClone(c),rolls=[];
 const die=n=>{const random=(options.random||Math.random)();if(!Number.isFinite(random)||random<0||random>=1)throw Error('Не удалось бросить кость.');const result=1+Math.floor(random*n);rolls.push({die:n,result});return result;};
 if(v.recovery){
  const counts=options.slots||{},entries=Object.entries(counts);let total=0;
  for(const [id,n] of entries){const slot=s.slots.find(x=>x.id===id);if(!slot||slot.level>5||!Number.isInteger(n)||n<0||n>(c.spent[id]||0))throw Error('Проверьте восстанавливаемые ячейки.');total+=slot.level*n;}
  if(!total||total>Math.ceil(c.level/2))throw Error('Суммарный уровень ячеек должен быть от 1 до '+Math.ceil(c.level/2)+'.');
  for(const [id,n] of entries)next.spent[id]=(next.spent[id]||0)-n;
 }
 for(const item of v.costs)next.spent[item.resourceId]=(Number(next.spent[item.resourceId])||0)+item.amount;
 if(v.slotId)next.spent[v.slotId]=(next.spent[v.slotId]||0)+1;
 let message='Применено: '+ability.name;
 if(v.effect==='mage-armor')next.mageArmor=true;
 if(v.effect==='fiendish-vigor')next.tempHp=Math.max(next.tempHp||0,12);
 if(v.effect==='second-wind'){const heal=die(10)+c.level;next.damage=Math.max(0,next.damage-heal);message=`Второе дыхание: восстановлено ${Math.min(c.damage,heal)} хитов (бросок ${heal}).`;}
 if(v.effect==='metabolism'){const heal=die(s.martialArtsDie)+c.level;next.spent['monk-focus']=0;next.damage=Math.max(0,next.damage-heal);message=`Концентрация восстановлена; лечение ${heal}.`;}
 if(v.effect==='patient-defense'&&c.level>=10)next.tempHp=Math.max(next.tempHp||0,die(s.martialArtsDie)+die(s.martialArtsDie));
 if(v.effect==='perfect-focus'){const pool=s.resources.find(r=>r.id==='monk-focus');if(pool)next.spent[pool.id]=Math.min(next.spent[pool.id]||0,Math.max(0,pool.max-4));}
 if(v.effect==='endurance')next.damage=s.hpMax-1;
 if(v.effect==='symbiotic')next.tempHp=Math.max(next.tempHp||0,4*c.level);
 if(v.effect==='pact-recovery'){const pact=s.slots.find(x=>x.id==='pact');if(pact)next.spent.pact=Math.max(0,(next.spent.pact||0)-(s.traits.some(t=>t.id==='eldritch-master')?pact.max:Math.ceil(pact.max/2)));}
 if(v.effect==='restore-shape')next.spent['wild-shape']=Math.max(0,(next.spent['wild-shape']||0)-1);
 if(v.effect==='restore-first-slot'){const slot=s.slots.find(x=>x.level===1);next.spent[slot.id]--;}
 if(v.effect==='restore-specific-slot'){const slot=s.slots.find(x=>x.level===v.restoreLevel);next.spent[slot.id]--;}
 if(v.effect==='restore-all-in')next.spent['moment-of-aha-all-in']=Math.max(0,(next.spent['moment-of-aha-all-in']||0)-1);
 if(v.effect==='all-in')next.spent['elation-ardor']=0;
 if(v.effect==='jackpot')next.jackpotUsed=true;
 if(v.effect==='overchannel'){const used=Number(next.spent['active-counter:overchannel'])||0;let damage=0;if(used)for(let i=0;i<v.spellLevel*(used+1);i++)damage+=die(12);next.spent['active-counter:overchannel']=used+1;next.damage=Math.min(s.hpMax,next.damage+damage);message=damage?'Перегрузка: '+damage+' некротического урона себе.':'Первая Перегрузка после долгого отдыха — без вреда.';}
 if(v.sneakDice)message=`${ability.name}: для урона Скрытой атаки осталось ${Math.ceil(c.level/2)-v.sneakDice}к6.`;
 return {character:next,message,rolls};
}

// Add counters only for active traits already present at their actual levels.
export function addActiveAbilityResources(d){
 if(d.id!=='aventurine-party-complete-2024')return;
 const specs={'contact-patron':['Связь с покровителем',1],'wild-resurgence':['Обмен Дикого облика на ячейку',1,'wild-resurgence-slot'],'archdruid':['Природный ворожей',1,'archdruid-conversion']};
 for(const entry of [...d.classes,...d.subclasses])for(const block of [{grants:entry.grants},...(entry.leveledGrants||[])]){
  const grants=block.grants||[];if(entry.id==='fighter'){const mastery=grants.find(g=>g.type==='trait'&&g.id==='weapon-mastery');if(mastery)mastery.description='Вы осваиваете свойства мастерства 3 видов оружия, которыми владеете. На 4-м уровне — 4 вида, на 10-м — 5, на 16-м — 6. После долгого отдыха можно изменить выбранные виды.';}
  for(const [id,[name,max,resourceId=id]] of Object.entries(specs))if(grants.some(g=>g.type==='trait'&&g.id===id)&&!grants.some(g=>g.type==='resource'&&g.id===resourceId))grants.push({type:'resource',id:resourceId,name,max,isLongRest:true});
 }
 function visit(grants,entry){for(const g of grants||[]){if(['spell-fixed','spell-choice'].includes(g.type)&&g.uses&&typeof g.uses==='object'){g.rest=g.uses.per==='short-rest'?'short':'long';g.uses=Number(g.uses.count)||0;if(entry.id==='warlock'&&g.circle>=6)g.slotCast=false;}for(const option of Array.isArray(g.options)?g.options:[])if(typeof option==='object')visit(option.grants,entry);}}
 for(const entry of [...d.classes,...d.subclasses,...d.races,...d.subraces,...d.feats]){visit(entry.grants,entry);for(const l of entry.leveledGrants||[])visit(l.grants,entry);}
}
