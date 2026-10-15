// Manual editing can keep an empty shop; file imports still require priced goods.
export function merchantEditorValue(raw){
 const invalid=(message,field,item)=>{const error=new Error(message);error.field=field;error.item=item;throw error;};
 const text=(value,max,field,item,required=true)=>{
  if(typeof value!=='string')invalid('Введите текст.',field,item);
  const result=value.trim();
  if(required&&!result)invalid(field==='name'&&item===undefined?'Укажите имя торговца.':field==='price'?'Укажите цену, например 50 зм.':'Укажите название товара.',field,item);
  if(result.length>max)invalid(`Не больше ${max} символов.`,field,item);
  return result;
 };
 if(!raw||typeof raw!=='object')invalid('Проверьте данные торговца.','name');
 const name=text(raw.name,150,'name'),location=text(raw.location??'',300,'location',undefined,false);
 if(!Array.isArray(raw.items)||raw.items.length>500)invalid('Допускается до 500 товаров.','items');
 const items=raw.items.map((item,i)=>({name:text(item?.name,200,'name',i),price:text(item?.price,300,'price',i)}));
 return {name,location,items};
}
