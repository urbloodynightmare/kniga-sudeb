import {derive,featReason} from './engine.js?v=20261027-3';
function choiceContext(character,dataset,key){
 const hero=structuredClone(character);delete hero.choices[key];
 const state=derive(hero,dataset),choice=state.choices.find(q=>q.key===key&&q.type==='pick-one');
 if(!choice)throw Error('Этот выбор больше недоступен.');
 return {hero,state,choice};
}
function inspectOption({hero,state,choice},dataset,key,value){
 if(value===''||value===undefined)return {choice,option:null,reason:''};
 const index=Number(value);
 if(!Number.isInteger(index)||index<0||!choice.options[index])throw Error('Выберите вариант из списка.');
 const option=choice.options[index];let reason='';
 for(const [i,grant] of (option.grants||[]).entries())if(grant.type==='feat'){
  reason=featReason(dataset.feats.find(f=>f.id===grant.featId),hero,state,key+'/option-'+(option.id||index)+'/'+i);if(reason)break;
 }
 return {choice,option,index,reason};
}
export function inspectChoice(character,dataset,key,value){return inspectOption(choiceContext(character,dataset,key),dataset,key,value);}
export function choiceOptions(character,dataset,key){const context=choiceContext(character,dataset,key);return context.choice.options.map((_,i)=>inspectOption(context,dataset,key,i));}
export function confirmChoice(character,dataset,key,value){
 const preview=inspectChoice(character,dataset,key,value);if(preview.reason)throw Error(preview.reason);
 const next=structuredClone(character);
 if(!preview.option)delete next.choices[key];else next.choices[key]=preview.index;
 return next;
}
