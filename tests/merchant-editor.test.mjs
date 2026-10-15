import test from 'node:test';
import assert from 'node:assert/strict';
import {merchantEditorValue} from '../app/merchant-editor.js';

test('manual shops allow empty stock and keep variable prices as text',()=>{
 assert.deepEqual(merchantEditorValue({name:' Лиора ',location:' ',items:[]}),{name:'Лиора',location:'',items:[]});
 const raw={name:'Лиора',location:'Рынок',visible:true,revision:99,room_id:'another',items:[{name:' Зелье ',price:' 5–10 зм или услуга ',hidden:true}]};
 assert.deepEqual(merchantEditorValue(raw),{name:'Лиора',location:'Рынок',items:[{name:'Зелье',price:'5–10 зм или услуга'}]});
 assert.equal(raw.items[0].name,' Зелье ');
});
test('invalid manual fields identify the precise row without dropping incomplete goods',()=>{
 assert.throws(()=>merchantEditorValue({name:' ',items:[]}),e=>e.field==='name'&&e.item===undefined);
 assert.throws(()=>merchantEditorValue({name:'Shop',items:[{name:'Potion',price:''}]}),e=>e.field==='price'&&e.item===0);
 assert.throws(()=>merchantEditorValue({name:'Shop',items:[{name:'',price:'5 зм'}]}),e=>e.field==='name'&&e.item===0);
 assert.throws(()=>merchantEditorValue({name:'Shop',items:[{name:'Potion',price:5}]}),e=>e.field==='price'&&e.item===0);
 assert.throws(()=>merchantEditorValue({name:'Shop',items:Array.from({length:501},()=>({name:'a',price:'1 зм'}))}),e=>e.field==='items');
 assert.throws(()=>merchantEditorValue({name:'Shop',items:[{name:'x'.repeat(201),price:'1 зм'}]}),e=>e.field==='name'&&e.item===0);
});
