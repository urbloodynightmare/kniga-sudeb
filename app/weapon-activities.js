// SRD 5.2.1, Weapon Mastery. Only owned features and equipped weapons grant mastery actions.
export const WEAPON_MASTERY={
 club:['Дубинка','slow'],dagger:['Кинжал','nick'],greatclub:['Палица','push'],handaxe:['Ручной топор','vex'],javelin:['Метательное копьё','slow'],lightHammer:['Лёгкий молот','nick'],mace:['Булава','sap'],quarterstaff:['Боевой посох','topple'],sickle:['Серп','nick'],spear:['Копьё','sap'],dart:['Дротик','vex'],lightCrossbow:['Лёгкий арбалет','slow'],shortbow:['Короткий лук','vex'],sling:['Праща','slow'],battleaxe:['Боевой топор','topple'],flail:['Цеп','sap'],glaive:['Глефа','graze'],greataxe:['Двуручный топор','cleave'],greatsword:['Двуручный меч','graze'],halberd:['Алебарда','cleave'],lance:['Пика','topple'],longsword:['Длинный меч','sap'],maul:['Молот','topple'],morningstar:['Моргенштерн','sap'],pike:['Клевец','push'],rapier:['Рапира','vex'],scimitar:['Скимитар','nick'],shortsword:['Короткий меч','vex'],trident:['Трезубец','topple'],warhammer:['Боевой молот','push'],warPick:['Боевой молоток','sap'],whip:['Кнут','slow'],blowgun:['Духовая трубка','vex'],handCrossbow:['Ручной арбалет','vex'],heavyCrossbow:['Тяжёлый арбалет','push'],longbow:['Длинный лук','slow'],musket:['Мушкет','slow'],pistol:['Пистолет','vex']
};
const SIMPLE=new Set(['club','dagger','greatclub','handaxe','javelin','lightHammer','mace','quarterstaff','sickle','spear','dart','lightCrossbow','shortbow','sling']);
const RANGED=new Set(['dart','lightCrossbow','shortbow','sling','blowgun','handCrossbow','heavyCrossbow','longbow','musket','pistol']);
const FINESSE=new Set(['dagger','dart','rapier','scimitar','shortsword','whip']);
export const MASTERY_RULES={
 cleave:['Рассечение','При попадании ближней атакой оружием можете атаковать другое существо в пределах 5 футов от первой цели и своей досягаемости. При попадании нанесите обычный урон оружия, но не добавляйте положительный модификатор характеристики к урону. Дополнительная атака доступна только один раз за ход.'],
 graze:['Касательный удар','При промахе атакой этим оружием нанесите урон, равный использованному модификатору характеристики. Тип урона — как у оружия. Этот урон увеличивается только повышением самого модификатора, другие бонусы к нему не добавляются.'],
 nick:['Быстрый удар','Дополнительную атаку за свойство «Лёгкое» можно выполнить как часть действия Атака, а не бонусным действием. Всё ещё нужна атака другим лёгким оружием; такая дополнительная атака — только один раз за ход. Это не ещё одна атака поверх той же атаки лёгким оружием.'],
 push:['Отталкивание','При попадании этим оружием можно оттолкнуть цель не больше Большого на расстояние до 10 футов прямо от себя. Спасбросок не требуется.'],
 sap:['Ослабление','При попадании этим оружием цель получает помеху на следующий бросок атаки, совершённый до начала вашего следующего хода.'],
 slow:['Замедление','При попадании с нанесением урона скорость цели уменьшается на 10 футов до начала вашего следующего хода. Повторные попадания этим свойством не увеличивают снижение сверх 10 футов.'],
 topple:['Опрокидывание','При попадании этим оружием цель совершает испытание Телосложения. Сл = 8 + мастерство + модификатор характеристики этой атаки. При провале цель получает состояние Опрокинутый.'],
 vex:['Досаждение','При попадании этим оружием с нанесением урона следующий ваш бросок атаки по этой цели до конца вашего следующего хода совершается с преимуществом.']
};
export function masteryLimit(c,s){if(!s.traits.some(t=>t.id==='weapon-mastery'))return 0;return c.classId==='fighter'?(c.level>=16?6:c.level>=10?5:c.level>=4?4:3):2;}
export function eligibleMasteryWeapons(s){return Object.entries(WEAPON_MASTERY).filter(([id,[label]])=>s.weaponProf.has('weapon-martial')||SIMPLE.has(id)&&s.weaponProf.has('weapon-simple')||s.weaponProf.has(label));}
export function learnedMasteries(c,s,equipment){
 const available=new Set(eligibleMasteryWeapons(s).map(([id])=>id)),limit=masteryLimit(c,s);
 return [...new Set(Array.isArray(c.weaponMasteries)?c.weaponMasteries:equipment.filter(x=>x.equipped).map(x=>x.effects?.weaponType))].filter(id=>available.has(id)).slice(0,limit);
}
export function weaponActivities(c,s,equipment){
 const actions=[{id:'grapple',name:'Захват',source:'Безоружный приём',description:`Вместо урона безоружного удара попытайтесь схватить цель не более чем на один размер больше вас. Нужна свободная рука. Цель выбирает испытание Силы или Ловкости, Сл ${8+s.prof+(s.martialArtsActive?Math.max(s.mods.str,s.mods.dex):s.mods.str)}. При провале она Схвачена.`,action:'Вместо урона безоружного удара'},
 {id:'shove',name:'Толчок',source:'Безоружный приём',description:`Вместо урона безоружного удара толкните цель не более чем на один размер больше вас. Цель выбирает испытание Силы или Ловкости, Сл ${8+s.prof+(s.martialArtsActive?Math.max(s.mods.str,s.mods.dex):s.mods.str)}. При провале оттолкните её на 5 футов или опрокиньте.`,action:'Вместо урона безоружного удара'}];
 const learned=learnedMasteries(c,s,equipment);
 for(const item of equipment.filter(i=>i.equipped&&Number(i.qty)>0&&!i.removed)){
  const type=item.effects?.weaponType;if(!learned.includes(type))continue;
  const variants=[WEAPON_MASTERY[type][1],...(s.traits.some(t=>t.id==='tactical-master')?['push','sap','slow']:[])];
  const stat=RANGED.has(type)?s.mods.dex:FINESSE.has(type)?Math.max(s.mods.str,s.mods.dex):s.mods.str;
  for(const property of new Set(variants)){const [name,text]=MASTERY_RULES[property];actions.push({id:'mastery:'+item.id+':'+property,name,source:item.name||WEAPON_MASTERY[type][0],action:property==='graze'?'При промахе':'Мастерство оружия',description:text+(property==='topple'?` Ваша Сл: ${8+s.prof+stat}.`:'')});}
 }
 return actions;
}
