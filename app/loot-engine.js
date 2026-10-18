import {DEFAULT_LOOT} from './loot-data.js?v=20261018-3';
export function validateLootItem(item){
 const number=Number(item.number),name=String(item.name??'').trim(),price=String(item.price??'').trim(),description=String(item.description??'').trim();
 if(!Number.isInteger(number)||number<1||number>100)throw Error('Номер находки должен быть от 1 до 100.');
 if(!name||name.length>200)throw Error('Укажите название длиной до 200 символов.');
 if(!price||price.length>100)throw Error('Укажите цену длиной до 100 символов.');
 if(description.length>5000)throw Error('Описание слишком длинное: максимум 5000 символов.');
 return {number,name,price,description};
}
export function mergeLoot(overrides=[]){
 const items=DEFAULT_LOOT.map(x=>({...x,revision:0,custom:false}));
 for(const raw of overrides){const item=validateLootItem(raw);items[item.number-1]={...item,revision:Number(raw.revision)||0,custom:true};}
 return items;
}
const face=random=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Некорректный результат генератора кубика.');return Math.floor(n*10);};
export const rollD10=(random=Math.random)=>face(random)+1;
export function rollPercentile(random=Math.random){const tens=face(random)*10,units=face(random);return {tens,units,total:tens+units||100};}
