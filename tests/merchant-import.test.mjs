import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMerchantText,merchantsFromBlocks,normalizeMerchants,csvRows,MERCHANT_TEMPLATE} from '../app/merchant-import.js';
test('JSON import accepts Russian fields and ignores economy and conditions',()=>{
 const r=parseMerchantText(JSON.stringify({экономика:'Скидка 10%',торговцы:[{имя:'Лиора',место:'Дом',товары:[{название:'Зелье',цена:'50 зм',запас:'2; третье после помощи'}]}]}));
 assert.equal(r.economy,undefined);assert.equal(r.merchants[0].items[0].stock,undefined);assert.equal(r.merchants[0].location,'Дом');
 assert.equal(normalizeMerchants(MERCHANT_TEMPLATE).merchants.length,1);
});
test('table groups traders by name and location and reads quoted separators and decimal commas',()=>{
 const r=parseMerchantText('Торговец;Место;Товар;Цена;Запас и условие\nЛиора;Дом;"Зелье; лечения";"2,5 зм";2\n;;Набор;5 зм;1\nЛиора;Рынок;Книга;25 зм;1','shops.csv');
 assert.equal(r.merchants.length,2);assert.equal(r.merchants[0].items.length,2);assert.equal(r.merchants[0].items[0].name,'Зелье; лечения');assert.equal(r.merchants[0].items[0].price,'2,5 зм');
 assert.deepEqual(csvRows('a,b\n"one\ntwo","a""b"'),[['a','b'],['one\ntwo','a"b']]);
});
test('Word blocks import only merchant tables and ignore non-shop sections',()=>{
 const r=merchantsFromBlocks([{type:'paragraph',heading:true,text:'Изменение цен'},{type:'table',rows:[['Состояние','Цена и доступность'],['Розыск','+25%']]},{type:'paragraph',heading:true,text:'Мастер Корвен Далл  Башня'},{type:'table',rows:[['Товар или услуга','Цена','Запас и условие'],['Фокусировка','5–20 зм','На выбор'],['Диагностика','5 зм или услуга','После доверия'],['Оружие','Базовая цена правил','Заказ']]},{type:'paragraph',heading:true,text:'Подпольный посредник'},{type:'table',rows:[['Товар','Цена'],['Пропуск','10–25 зм']]},{type:'paragraph',heading:true,text:'Награды'},{type:'table',rows:[['Награда','Когда'],['Зелье','После боя']]}]);
 assert.equal(r.merchants.length,2);assert.equal(r.merchants[0].name,'Мастер Корвен Далл');assert.equal(r.merchants[0].location,'Башня');assert.equal(r.merchants[0].items[1].price,'5 зм или услуга');assert.equal(r.merchants[0].items[2].price,'Базовая цена правил');assert.equal(r.economy,undefined);assert.equal(r.merchants[0].items[0].stock,undefined);assert.equal(r.warnings.length,1);
});
test('text imports explicit fields and Markdown tables without requiring JSON',()=>{
 const r=parseMerchantText('Имя: Лиора\nМесто: Дом\nТовар | Цена | Запас\nЗелье | 50 зм | 2\n\n## Корвен — Башня\n| Товар | Цена |\n|---|---|\n| Книга | 25 зм |');
 assert.equal(r.merchants.length,2);assert.equal(r.merchants[0].location,'Дом');assert.equal(r.merchants[1].location,'Башня');
 const list=parseMerchantText('Имя: Лиора\nМесто: Дом\nЗелье — 50 зм\nНабор — 5 зм');assert.equal(list.merchants[0].items.length,2);
});
test('ambiguous or incomplete data never receives an invented price or currency',()=>{
 assert.throws(()=>parseMerchantText('Торговец;Товар;Цена\nЛиора;Зелье;','x.csv'),/Строка 2/);
 assert.throws(()=>normalizeMerchants([{name:'Лиора',items:[{name:'Зелье',price:50}]}]),/валюта/);
 assert.throws(()=>parseMerchantText('{broken'),/JSON/);
 assert.throws(()=>parseMerchantText('Торговцы отсутствуют'),/не найдены/);
 assert.throws(()=>csvRows('a,b\n"oops,x'),/кавычка/);
 assert.throws(()=>merchantsFromBlocks([{type:'paragraph',heading:true,text:'Торговец'},{type:'table',rows:[['Товар','Цена'],['Зелье','']]}]),/строка 2/);
 const r=normalizeMerchants([{name:'Лиора',location:'Дом',items:[{name:'Зелье',price:{amount:50,currency:'зм'}}]}]);assert.equal(r.merchants[0].items[0].price,'50 зм');
});
test('import discards visibility and extra fields from untrusted files',()=>{
 const r=normalizeMerchants([{id:'injected',room_id:'other',visible:true,name:'<script>',location:'Дом',items:[{name:'x',price:'1 зм',script:'bad'}]}]);assert.equal(r.merchants[0].visible,undefined);assert.equal(r.merchants[0].room_id,undefined);assert.equal(r.merchants[0].items[0].script,undefined);
});
test('price column selection prefers selling prices and exposes base prices for preview',()=>{
 const r=merchantsFromBlocks([{type:'paragraph',heading:true,text:'Банда'},{type:'table',rows:[['Каталог'],['Наименование','Базовая цена','Цена для незнакомцев','Запас'],['Паёк','5 см','1 зм 5 см','Секрет']]}]);
 assert.equal(r.merchants[0].items[0].price,'1 зм 5 см');assert.equal(r.merchants[0].priceColumn,1);assert.deepEqual(r.merchants[0].priceOptions[0].prices,['5 см']);assert.equal(normalizeMerchants(r).merchants[0].priceOptions,undefined);
});
test('service tables with reference prices and unusual column order are recognized',()=>{
 const r=merchantsFromBlocks([{type:'paragraph',heading:true,text:'Орвин'},{type:'table',rows:[['Условие','Стоимость (зм)','Услуга'],['секрет','5','Ночлег']]}]);assert.equal(r.merchants[0].items[0].name,'Ночлег');assert.equal(r.merchants[0].items[0].price,'5');
});
test('Word paragraphs with explicit merchant name and price list become shop records',()=>{
 const r=merchantsFromBlocks([{type:'paragraph',text:'Торговец: Нора'},{type:'paragraph',text:'Место: Мастерская'},{type:'paragraph',text:'Зелье — 50 зм'},{type:'paragraph',text:'Мазь: 10 зм'}]);assert.equal(r.merchants[0].items.length,2);assert.equal(r.merchants[0].location,'Мастерская');
});
