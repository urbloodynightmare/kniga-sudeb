export const STATS = {str:'Сила',dex:'Ловкость',con:'Телосложение',int:'Интеллект',wis:'Мудрость',cha:'Харизма'};
export const SKILLS = {acrobatics:['Акробатика','dex'],'animal handling':['Уход за животными','wis'],arcana:['Магия','int'],athletics:['Атлетика','str'],deception:['Обман','cha'],history:['История','int'],insight:['Проницательность','wis'],intimidation:['Запугивание','cha'],investigation:['Расследование','int'],medicine:['Медицина','wis'],nature:['Природа','int'],perception:['Внимательность','wis'],performance:['Выступление','cha'],persuasion:['Убеждение','cha'],religion:['Религия','int'],'sleight of hand':['Ловкость рук','dex'],stealth:['Скрытность','dex'],survival:['Выживание','wis']};
export const mod = n=>Math.floor((n-10)/2);
export const signed = n=>(n>=0?'+':'')+n;
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
export const cleanName = s=>String(s||'').replace(/\[f:.*?\|([^\]]+)\]/g,'$1');
export const FULL_SLOTS=[[],[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
// A small arithmetic parser: dataset expressions are data, never executable JavaScript.
export function expression(input, vars={}) {
  const src=String(input??0).replace(/\[([A-Z]+)\]/g,(_,key)=>String(vars[key]??0));
  const tokens=src.match(/\d+(?:\.\d+)?|max|min|ceil|floor|[+*/(),-]/g)||[];
  if(tokens.join('')!==src.replace(/\s/g,''))throw new Error('Неподдерживаемая формула');
  let i=0;
  function atom(){let t=tokens[i++];if(t==='-')return -atom();if(t==='('){let v=sum();if(tokens[i++]!==')')throw Error('Скобка');return v;}if(['max','min','ceil','floor'].includes(t)){if(tokens[i++]!=='(')throw Error('Функция');let a=[sum()];while(tokens[i]===','){i++;a.push(sum());}if(tokens[i++]!==')')throw Error('Скобка');return Math[t](...a);}if(t===undefined||!/^\d/.test(t))throw Error('Число');return Number(t);}
  function product(){let n=atom();while(['*','/'].includes(tokens[i])){const op=tokens[i++],v=atom();n=op==='*'?n*v:n/v;}return n;}
  function sum(){let n=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],v=product();n=op==='+'?n+v:n-v;}return n;}
  const n=sum();if(i!==tokens.length||!Number.isFinite(n))throw Error('Формула');return n;
}
export function normalizeDataset(raw){
  if(!raw||!Array.isArray(raw.classes)||!Array.isArray(raw.feats))throw Error('В файле нет классов и черт. Нужен датасет LSS.');
  const d=structuredClone(raw);
  for(const key of ['classes','subclasses','races','subraces','backgrounds','feats']){
    d[key]??=[];if(!Array.isArray(d[key])||d[key].length>1000)throw Error('Неверный раздел '+key);
    const ids=new Set();for(const entry of d[key]){if(typeof entry.id!=='string'||ids.has(entry.id))throw Error('Повторяющийся или неверный id: '+entry.id);ids.add(entry.id);}
  }
  // Corrections for the supplied 2024 party pack; keep the source file untouched.
  if(d.id==='aventurine-party-complete-2024'){
    for(const id of ['inv-agonizing-blast','inv-repelling-blast','inv-devils-sight','inv-mask-many-faces','inv-misty-visions','inv-otherworldly-leap','inv-fiendish-vigor','inv-lessons-first-ones']){
      const feat=d.feats.find(f=>f.id===id);if(feat){feat.minLevel=2;feat.prerequisite='Колдун 2-го уровня'+(feat.prerequisite?', '+feat.prerequisite:'');}
    }
    const change=(id,description)=>{const f=d.feats.find(x=>x.id===id);if(f?.grants[0])f.grants[0].description=description;};
    change('inv-agonizing-blast','Выберите наносящий урон заговор колдуна. Добавляйте модификатор Харизмы к броскам его урона. Можно выбрать воззвание повторно для другого подходящего заговора.');
    change('inv-repelling-blast','Выберите наносящий урон заговор колдуна с броском атаки. При попадании можете оттолкнуть существо Большого размера или меньше на 10 футов. Можно выбрать воззвание повторно для другого подходящего заговора.');
    change('inv-one-with-shadows','Находясь в тусклом свете или темноте, вы можете сотворить на себя Невидимость без траты ячейки заклинаний.');
    const lessons=d.feats.find(f=>f.id==='inv-lessons-first-ones');
    if(lessons)lessons.grants.push({type:'pick-one',label:'Черта за Уроки первых',options:d.feats.filter(f=>f.category==='origin').map(f=>({label:f.label,grants:[{type:'feat',featId:f.id}]}))});
    const mind=d.feats.find(f=>f.id==='inv-pact-tome');
    if(mind)mind.grants.push({type:'spell-choice',label:'Книга теней: заговоры',count:3,circle:0,spellList:'any'},{type:'spell-choice',label:'Книга теней: ритуалы',count:2,circle:1,spellList:'any',ritual:true});
    for(const id of ['inv-agonizing-blast','inv-repelling-blast']){
      const f=d.feats.find(x=>x.id===id);if(f)f.grants.push({type:'spell-choice',label:'Заговор для воззвания',count:1,circle:0,spellList:'warlock',targetOnly:true,damage:true,attack:id==='inv-repelling-blast'});
    }
    const guard=d.feats.find(f=>f.id==='mage-slayer-2024')?.grants.find(g=>g.type==='resource');
    if(guard)guard.isShortRest=false;
    const human=d.races.find(r=>r.id==='human')?.grants.find(g=>g.id==='resourceful');
    if(human)human.description='Вы получаете Вдохновение героя после завершения Долгого отдыха.';
    for(const c of d.classes){
      if(c.id==='druid'){
        c.grants=c.grants.filter(g=>g.type!=='weapon-prof');c.grants.unshift({type:'weapon-prof',weapons:['weapon-simple']});
        const order=c.grants.find(g=>g.id==='druid-primal-order-choice');
        if(order)order.options=[{id:'magician',label:'Ведун',grants:[{type:'spell-choice',count:1,circle:0,spellList:'druid'},{type:'bonus',target:'skill.arcana',expr:'max(1,[WIS])'},{type:'bonus',target:'skill.nature',expr:'max(1,[WIS])'}]},...order.options.filter(o=>o.id==='warden')];
      }
      if(c.id==='rogue')c.leveledGrants.find(l=>l.level===15)?.grants.push({type:'saving-throw',stats:['wis','cha']});
    }
  }
  return d;
}
export function createCharacter(template={}) {
  return {id:crypto.randomUUID(),name:'Новый герой',level:1,classId:'warlock',raceId:'human',subraceId:'',subclassId:'',backgroundId:'',stats:{str:8,dex:14,con:13,int:10,wis:12,cha:15},choices:{},manualFeatures:[],spells:[],inventory:[],itemOverrides:{},spent:{},customLanguages:[],damage:0,tempHp:0,goldDelta:0,notes:'',appearance:'',backstory:'',allies:'',personality:'',ideals:'',bonds:'',flaws:'',goals:'',avatar:'',armor:'none',shield:false,mageArmor:false,acBonus:0,hpBonus:0,inspiration:false,conditions:[],draft:true,...template};
}
export function partyTemplates(){return [
  createCharacter({name:'Авантюрин',level:4,classId:'warlock',raceId:'human',subclassId:'aha-patron',backgroundId:'professional-gambler',notes:'Покровитель — Аха. Магические фишки, карты и удача.\n\nЭто заготовка: внесите характеристики и выборы со своего листа.'}),
  createCharacter({name:'Воин',classId:'fighter',raceId:'human',subclassId:'champion',stats:{str:15,dex:13,con:14,int:8,wis:12,cha:10}}),
  createCharacter({name:'Волшебник',classId:'wizard',raceId:'elf',subclassId:'evoker',stats:{str:8,dex:14,con:13,int:15,wis:12,cha:10}}),
  createCharacter({name:'Друид',classId:'druid',raceId:'reborn',subclassId:'circle-of-spores',stats:{str:8,dex:14,con:13,int:12,wis:15,cha:10}}),
  createCharacter({name:'Плут',classId:'rogue',raceId:'tiefling',subclassId:'thief',stats:{str:8,dex:15,con:14,int:13,wis:12,cha:10}})
];}
export function sources(c,d){return [
  ['races',c.raceId,1],['subraces',c.subraceId,1],['backgrounds',c.backgroundId,1],['classes',c.classId,1],['subclasses',c.subclassId,d.classes.find(x=>x.id===c.classId)?.subclassLevel||3]
].map(([kind,id,level])=>({kind,entry:d[kind].find(x=>x.id===id),level})).filter(x=>x.entry&&(x.kind!=='subclasses'||x.entry.classId===c.classId)&&(x.kind!=='subraces'||x.entry.raceId===c.raceId));}
export function featReason(f,c,state,ignoreKey=''){
  if(!f)return 'Черта отсутствует в датасете';
  const level=f.minLevel||Number(f.prerequisite?.match(/(\d+)[-‑–]?(?:го|й)/)?.[1])||(f.category==='general'?4:1);
  if(c.level<level)return `Доступно с ${level}-го уровня`;
  if(f.category==='invocation'&&c.classId!=='warlock')return 'Нужен класс Колдун';
  const pre=f.prerequisite||'';
  if(pre.includes('Договор клинка')&&!state.feats.some(x=>x.id==='inv-pact-blade'))return 'Нужен Договор клинка';
  if(pre.includes('Жаждущий клинок')&&!state.feats.some(x=>x.id==='inv-thirsting-blade'))return 'Нужен Жаждущий клинок';
  if(pre.includes('Ловкость 13')&&state.stats.dex<13)return 'Нужна Ловкость 13';
  if(pre.includes('Сила 13')&&state.stats.str<13)return 'Нужна Сила 13';
  if(pre.includes('Мудрость или Харизма 13')&&Math.max(state.stats.wis,state.stats.cha)<13)return 'Нужна Мудрость или Харизма 13';
  if(pre.includes('способность сотворить')&&!['warlock','wizard','druid'].includes(c.classId)&&!state.fixedSpells.length)return 'Нужно уметь сотворить заклинание';
  if(!['asi-general','inv-lessons-first-ones','inv-agonizing-blast','inv-repelling-blast'].includes(f.id)&&state.feats.some(x=>x.id===f.id&&x.key!==ignoreKey))return 'Уже выбрано';
  return '';
}
export function derive(c,d,validationPass=0){
  const level=clamp(c.level,1,20), prof=2+Math.floor((level-1)/4);
  const s={stats:{...c.stats},prof,die:8,saves:new Set(),skills:new Set(),expertise:new Set(),tools:new Set(),languages:new Set(['Общий']),armorProf:new Set(),weaponProf:new Set(),traits:[],resources:[],feats:[],choices:[],equipment:[],gold:0,speed:30,size:'medium',bonuses:[],fixedSpells:[],warnings:[],casting:null};
  const resources=new Map(),traits=new Map(),expanded=new Set();
  function visit(grants,prefix,at,source,depth=0){
    if(depth>12){s.warnings.push('Слишком глубокая цепочка черт');return;}
    (grants||[]).forEach((g,index)=>{
      const key=prefix+'/'+(g.id||index), meta={key,level:at,source};const value=c.choices[key];
      switch(g.type){
        case 'hp-die':s.die=g.die;break;
        case 'saving-throw':g.stats.forEach(x=>s.saves.add(x));break;
        case 'armor-prof':g.armors.forEach(x=>s.armorProf.add(x));break;
        case 'weapon-prof':(g.specific||g.weapons||[]).forEach(x=>s.weaponProf.add(x));break;
        case 'tool-fixed':g.tools.forEach(x=>s.tools.add(x));break;
        case 'language-fixed':g.languages.forEach(x=>s.languages.add(x));break;
        case 'skill-fixed':g.skills.forEach(x=>s.skills.add(x));break;
        case 'speed':s.speed=g.value;break;
        case 'size':s.size=g.value;break;
        case 'gold':s.gold+=g.amount;break;
        case 'equipment-fixed':g.items.forEach((name,i)=>s.equipment.push({id:key+'/'+i,name,qty:1,source}));break;
        case 'trait':traits.set(g.id||key,{...g,...meta,name:cleanName(g.name)});break;
        case 'resource':resources.set(g.id,{...g,...meta});break;
        case 'bonus':s.bonuses.push({...g,...meta});break;
        case 'spellcasting':s.casting=g;break;
        case 'spell-fixed':s.fixedSpells.push({...g,...meta});break;
        case 'feat':{
          const f=d.feats.find(f=>f.id===g.featId);if(!f){s.warnings.push('Не найдена черта '+g.featId);break;}
          const instance=key+':'+f.id;if(expanded.has(instance))break;expanded.add(instance);
          s.feats.push({...f,key});visit(f.grants,key+'/feat-'+f.id,at,f.label,depth+1);break;
        }
        case 'pick-one':{
          const q={...g,...meta,value,complete:false};s.choices.push(q);
          const opt=Array.isArray(g.options)&&g.options[Number(value)];
          if(value!==undefined&&value!==''&&opt){q.complete=true;visit(opt.grants,key+'/option-'+(opt.id||value),at,source,depth+1);}break;
        }
        case 'skill-choice':case 'expertise-choice':case 'tool-choice':case 'language-choice':case 'spell-choice':{
          const chosen=Array.isArray(value)?value:[];
          const valid=chosen.filter(x=>typeof x==='string'&&x.trim()).slice(0,g.count||1);
          const q={...g,...meta,value:chosen,complete:valid.length===(g.count||1)&&new Set(valid).size===valid.length};s.choices.push(q);
          if(g.type==='skill-choice')valid.filter(x=>SKILLS[x]&&(g.options==='any'||!g.options||g.options.includes(x))).forEach(x=>s.skills.add(x));
          if(g.type==='expertise-choice')valid.forEach(x=>s.expertise.add(x));
          if(g.type==='tool-choice')valid.forEach(x=>s.tools.add(x));
          if(g.type==='language-choice')valid.forEach(x=>s.languages.add(x));
          if(g.type==='spell-choice'&&!g.targetOnly)valid.forEach(slug=>s.fixedSpells.push({...g,...meta,slug}));break;
        }
        case 'asi-pool':case 'asi-flexible':{
          const points=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
          const allowed=g.options||g.sets?.[0]?.options||Object.keys(STATS);
          const total=g.total||g.sets.reduce((n,x)=>n+x.count*x.amount,0), max=g.max||(g.distinct===false?total:1);
          const spent=Object.values(points).reduce((n,x)=>n+(Number(x)||0),0);
          const valid=Object.entries(points).every(([k,v])=>allowed.includes(k)&&Number.isInteger(v)&&v>=0&&v<=max&&s.stats[k]+v<=20)&&spent<=total;
          s.choices.push({...g,...meta,value:points,allowed,total,max,complete:valid&&spent===total});
          if(valid)Object.entries(points).forEach(([k,v])=>s.stats[k]=Math.min(20,s.stats[k]+v));break;
        }
        default:s.warnings.push('Неизвестное правило: '+g.type);
      }
    });
  }
  for(const {kind,entry,level:at} of sources(c,d)){
    if(level>=at)visit(entry.grants,kind+'/'+entry.id+'/base',at,entry.label);
    for(const [i,l] of (entry.leveledGrants||[]).entries())if(level>=Math.max(at,l.level))visit(l.grants,kind+'/'+entry.id+'/level-'+l.level+'-'+i,l.level,entry.label);
  }
  for(const language of c.customLanguages||[])if(typeof language==='string'&&language.trim())s.languages.add(language.trim());
  for(const f of c.manualFeatures||[]){
    if(f.featId)visit([{type:'feat',featId:f.featId}],'manual/'+f.id,1,'Добавлено вручную');
    else traits.set(f.id,{...f,source:'Добавлено вручную',level:1});
  }
  const equippedItems=[...s.equipment,...(c.inventory||[])].map(item=>({...item,...(c.itemOverrides?.[item.id]||{})})).filter(item=>!item.removed&&Number(item.qty)>0&&item.equipped);
  s.itemBonuses={ac:0,spellAttack:0,spellDC:0,spellSave:0,attack:0,damage:0,meleeAttack:0,meleeDamage:0,rangedAttack:0,rangedDamage:0};s.weaponItems=[];s.advantageChecks=new Set();
  for(const item of equippedItems){
    const effects=item.effects||{};
    if(item.itemType==='shield')s.itemBonuses.ac+=2;
    for(const key of ['ac','spellAttack','spellDC','spellSave'])s.itemBonuses[key]+=Number(effects[key])||0;
    if(effects.weaponScope==='self')s.weaponItems.push(item);
    else if(effects.weaponScope==='melee'){s.itemBonuses.meleeAttack+=Number(effects.attack)||0;s.itemBonuses.meleeDamage+=Number(effects.damage)||0;}
    else if(effects.weaponScope==='ranged'){s.itemBonuses.rangedAttack+=Number(effects.attack)||0;s.itemBonuses.rangedDamage+=Number(effects.damage)||0;}
    else {s.itemBonuses.attack+=Number(effects.attack)||0;s.itemBonuses.damage+=Number(effects.damage)||0;}
    if(effects.ability&&STATS[effects.ability])s.stats[effects.ability]=Math.min(30,s.stats[effects.ability]+(Number(effects.abilityBonus)||0));
    if(typeof effects.advantage==='string'&&effects.advantage)s.advantageChecks.add(effects.advantage);
    if(item.imbuedSpell?.id&&Number(item.imbuedSpell.uses)>0)s.fixedSpells.push({type:'spell-fixed',slug:item.imbuedSpell.id,source:item.name,itemId:item.id,uses:Number(item.imbuedSpell.uses),rest:item.imbuedSpell.rest||'long',key:'item-spell:'+item.id});
  }
  s.mods=Object.fromEntries(Object.entries(s.stats).map(([k,v])=>[k,mod(v)]));
  const vars={LVL:level,PROF:prof,...Object.fromEntries(Object.entries(s.mods).map(([k,v])=>[k.toUpperCase(),v]))};
  const bonuses={};for(const b of s.bonuses){try{if(b.target==='ac'&&c.armor==='none')continue;bonuses[b.target]=(bonuses[b.target]||0)+(b.expr?expression(b.expr,vars):(b.value||0));}catch{s.warnings.push('Не удалось посчитать '+b.label);}}
  s.traits=[...traits.values()];s.resources=[...resources.values()].map(r=>({...r,max:Math.max(0,Math.floor(r.maxExpr?expression(r.maxExpr,vars):r.max||0))}));
  s.resources.forEach(r=>{r.remaining=clamp(c.spent[r.id]===undefined?(r.id==='elation-ardor'?0:r.max):r.max-c.spent[r.id],0,r.max);});
  s.hpMax=Math.max(1,s.die+s.mods.con+(level-1)*Math.max(1,s.die/2+1+s.mods.con)+(bonuses['hp.max']||0)+(Number(c.hpBonus)||0));
  s.hp=clamp(s.hpMax-c.damage,0,s.hpMax);
  s.initiative=s.mods.dex+(bonuses.initiative||0);s.speed+=bonuses['speed.walk']||0;
  const armor={none:10+s.mods.dex,leather:11+s.mods.dex,studded:12+s.mods.dex,hide:12+Math.min(2,s.mods.dex),'chain-shirt':13+Math.min(2,s.mods.dex),scale:14+Math.min(2,s.mods.dex),breastplate:14+Math.min(2,s.mods.dex),'half-plate':15+Math.min(2,s.mods.dex),ring:14,chain:16,splint:17,plate:18};
  s.ac=(armor[c.armor]??armor.none)+(c.shield?2:0)+(bonuses.ac||0)+(Number(c.acBonus)||0)+s.itemBonuses.ac;
  if(c.mageArmor&&c.armor==='none')s.ac=13+s.mods.dex+(c.shield?2:0)+(Number(c.acBonus)||0)+s.itemBonuses.ac;
  s.skillBonuses=Object.fromEntries(Object.entries(SKILLS).map(([k,[,stat]])=>[k,s.mods[stat]+(s.skills.has(k)?prof:0)+(s.expertise.has(k)&&s.skills.has(k)?prof:0)+(bonuses['skill.'+k]||0)]));
  s.passive=10+s.skillBonuses.perception;
  s.saveBonuses=Object.fromEntries(Object.keys(STATS).map(k=>[k,s.mods[k]+(s.saves.has(k)?prof:0)]));
  s.spellSaveBonuses=Object.fromEntries(Object.keys(STATS).map(k=>[k,s.saveBonuses[k]+s.itemBonuses.spellSave]));
  s.gold+=Number(c.goldDelta)||0;
  s.spellDC=8+prof+(s.mods[s.casting?.ability]||0)+s.itemBonuses.spellDC;s.spellAttack=prof+(s.mods[s.casting?.ability]||0)+s.itemBonuses.spellAttack;
  s.slots=s.casting?.progression==='pact'?[{level:Math.min(5,Math.ceil(level/2)),max:level>=17?4:level>=11?3:level>=2?2:1,id:'pact'}]:s.casting?FULL_SLOTS[level].map((max,i)=>({level:i+1,max,id:'slot-'+(i+1)})):[];
  s.cantrips=s.casting?.cantripsByLevel[level]||0;s.prepared=s.casting?.knownByLevel[level]||0;
  for(const q of s.choices){
    if(q.type==='pick-one'&&q.complete){
      const option=q.options[q.value];for(const g of option.grants||[])if(g.type==='feat'){
        const ownKey=q.key+'/option-'+(option.id||q.value)+'/0';
        const reason=featReason(d.feats.find(f=>f.id===g.featId),c,s,ownKey);if(reason){q.complete=false;q.error=reason;}
      }
    }
    if(q.type==='expertise-choice'&&q.value.some(x=>!s.skills.has(x))){q.complete=false;q.error='Экспертиза требует владения навыком';}
  }
  // A stale choice (for example after lowering a level or replacing a prerequisite)
  // must not keep granting its mechanical effects. Recompute without invalid branches,
  // but keep the original value visible so the player can correct it.
  const invalid=s.choices.filter(q=>q.type==='pick-one'&&q.error);
  if(invalid.length&&validationPass<12){
    const adjusted={...c,choices:{...c.choices}};
    invalid.forEach(q=>delete adjusted.choices[q.key]);
    const corrected=derive(adjusted,d,validationPass+1);
    for(const q of invalid){const visible=corrected.choices.find(x=>x.key===q.key);if(visible)Object.assign(visible,{value:q.value,error:q.error,complete:false});}
    corrected.pending=corrected.choices.filter(q=>!q.complete).length;
    return corrected;
  }
  s.pending=s.choices.filter(q=>!q.complete).length;
  return s;
}
export function rest(c,s,long){
  const next=structuredClone(c);
  for(const r of s.resources){
    if(r.id==='elation-ardor'){next.spent[r.id]=r.max;continue;}
    if(long&&r.isLongRest)next.spent[r.id]=0;
    else if(!long&&r.isShortRest)next.spent[r.id]=r.shortRestRegain?Math.max(0,(next.spent[r.id]||0)-Number(r.shortRestRegain)):0;
  }
  if(long||s.casting?.progression==='pact')s.slots.forEach(slot=>next.spent[slot.id]=0);
  for(const item of [...s.equipment,...(next.inventory||[])].map(entry=>({...entry,...(next.itemOverrides?.[entry.id]||{})})))if(item.imbuedSpell?.id&&(long||item.imbuedSpell.rest==='short'))next.spent['item-spell:'+item.id]=0;
  if(long){next.damage=0;next.tempHp=0;next.spent['hit-dice']=0;for(const k of Object.keys(next.spent))if(k.startsWith('free-spell:'))next.spent[k]=0;if(next.raceId==='human')next.inspiration=true;}
  return next;
}
export function validateSave(data,d){
  if(!data||data.format!=='book-of-fates'||data.version!==1||!Array.isArray(data.characters)||data.characters.length>100)throw Error('Это не файл персонажей Книги судеб.');
  return data.characters.map(raw=>{
    if(!raw||typeof raw.name!=='string'||!d.classes.some(x=>x.id===raw.classId))throw Error('Некорректный персонаж');
    if(!Number.isInteger(raw.level)||raw.level<1||raw.level>20)throw Error('Некорректный уровень');
    for(const k of Object.keys(STATS))if(!Number.isInteger(raw.stats?.[k])||raw.stats[k]<1||raw.stats[k]>30)throw Error('Некорректные характеристики');
    const c=createCharacter(raw);c.id=crypto.randomUUID();
    for(const key of ['manualFeatures','spells','inventory','conditions'])if(!Array.isArray(c[key])||c[key].length>1000)throw Error('Некорректный список '+key);
    for(const key of ['damage','tempHp','goldDelta','acBonus','hpBonus'])if(!Number.isFinite(c[key]))throw Error('Некорректное число '+key);
    for(const entry of [...c.manualFeatures,...c.spells,...c.inventory])if(!entry||typeof entry!=='object'||typeof entry.id!=='string')throw Error('Некорректная запись в листе');
    for(const key of ['choices','spent','itemOverrides'])if(!c[key]||typeof c[key]!=='object'||Array.isArray(c[key]))throw Error('Некорректное поле '+key);
    c.avatar=typeof c.avatar==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(c.avatar)?c.avatar:'';
    return c;
  });
}
