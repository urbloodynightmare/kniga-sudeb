// Deterministic import: preserve variable prices instead of guessing numbers.
export const MERCHANT_TEMPLATE={merchants:[{name:'Лиора Фенн',location:'Дом милосердия',items:[{name:'Лечебное зелье',price:'50 зм'},{name:'Перевязка и осмотр',price:'5 см'}]}]};
const text=(v,max=5000)=>{const s=String(v??'').trim();if(s.length>max)throw Error(`Слишком длинное значение (максимум ${max} символов).`);return s;};
const field=(o,...keys)=>{for(const k of keys)if(o?.[k]!==undefined)return o[k];if(o&&typeof o==='object'){const key=Object.keys(o).find(k=>keys.includes(k.trim().toLowerCase()));if(key!==undefined)return o[key];}return undefined;};
export function normalizeMerchants(data){
 const source=Array.isArray(data)?data:field(data,'merchants','traders','торговцы');
 if(!Array.isArray(source)||!source.length)throw Error('Торговцы не найдены. Нужны имя торговца и таблица товаров с ценами.');
 if(source.length>100)throw Error('В одном файле допускается до 100 торговцев.');
 const warnings=[],merchants=source.map((m,i)=>{
  const name=text(field(m,'name','имя','торговец'),150),location=text(field(m,'location','place','место','расположение'),300),items=field(m,'items','goods','товары','предметы');
  if(!name)throw Error(`Торговец ${i+1}: укажите имя.`);
  if(!location)warnings.push(`«${name}»: место не найдено — укажите его в предпросмотре.`);
  if(!Array.isArray(items)||!items.length||items.length>500)throw Error(`«${name}»: нужен список от 1 до 500 товаров.`);
  const goods=items.map((g,j)=>{const name=text(field(g,'name','item','название','товар','предмет'),200),raw=field(g,'price','цена');let price;
   if(raw&&typeof raw==='object'){const amount=field(raw,'amount','value','сумма'),currency=field(raw,'currency','валюта');if(amount===undefined||!currency)throw Error(`«${m.name||m.имя}», товар ${j+1}: укажите сумму и валюту.`);price=`${amount} ${currency}`;}
   else price=text(raw,300);
   if(typeof raw==='number'){const currency=field(g,'currency','валюта');if(!currency)throw Error(`«${name}»: у числовой цены должна быть валюта.`);price=`${raw} ${currency}`;}
   if(!name||!price)throw Error(`«${m.name||m.имя}», товар ${j+1}: нужны название и цена.`);
   return {name,price:text(price,300)};
  });
  return {name,location,items:goods};
 });
 return {merchants,warnings};
}
function delimiter(line){return ['\t',';',','].sort((a,b)=>line.split(b).length-line.split(a).length)[0];}
export function csvRows(source,sep=delimiter(source.split(/\r?\n/)[0])){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else cell+=c;}
  else if(!quoted&&c===sep){row.push(cell.trim());cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;
 }
 if(quoted)throw Error('В таблице не закрыта кавычка.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
const header=v=>String(v).trim().toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');
const priceColumn=v=>/(?:^|\s)(?:цен[аы]|стоимость|price)(?:\s|[(:/]|$)/.test(header(v));
const itemColumn=v=>/^(товар|предмет|название|наименование|услуг[аи]|item|goods|service)/.test(header(v));
// Prefer the actual selling price over a reference/base column; the preview can override it.
function columns(rows){for(let row=0;row<Math.min(rows.length,10);row++){const h=rows[row],ni=h.findIndex(itemColumn),prices=h.map((v,index)=>({label:v,index})).filter(x=>priceColumn(x.label));if(ni>=0&&prices.length){const selected=prices.find(x=>!/(?:базов|base|reference)/i.test(x.label))||prices[0];return {row,ni,pi:selected.index,prices};}}return null;}
export function merchantsFromBlocks(blocks){
 // Word lists with explicit merchant labels are handled just like text lists.
 const expanded=[];let explicit=false,list=null;for(const b of blocks){if(b.type==='paragraph'){if(/^(имя|торговец|merchant)\s*:/i.test(b.text)){explicit=true;list=null;}else if(b.heading){explicit=false;list=null;}const item=b.text.match(/^\s*[-•*]?\s*(.+?)\s*(?:[—–]|:\s*)\s*(\d[\s\S]*?(?:зм|см|мм|пм|эм|gp|sp|cp|pp|ep)(?=\s|$|[.,;])[\s\S]*)$/i);if(explicit&&item){if(!list){list={type:'table',rows:[['Товар','Цена']]};expanded.push(list);}list.rows.push([item[1],item[2]]);continue;}}else list=null;expanded.push(b);}blocks=expanded;
 const merchants=[];let heading='',pendingName='',pendingPlace='';
 for(const block of blocks){
  if(block.type==='paragraph'){
   const s=block.text.trim();if(!s)continue;
   const name=s.match(/^(?:имя|торговец|merchant)\s*:\s*(.+)$/i),place=s.match(/^(?:место|расположение|location)\s*:\s*(.+)$/i);
   if(name){pendingName=name[1];pendingPlace='';heading=s;continue;}if(place){pendingPlace=place[1];continue;}
   if(block.heading){heading=s;pendingName='';pendingPlace='';}
   continue;
  }
  const rows=block.rows||[],cols=columns(rows);if(!cols)continue;const {row,pi,ni,prices}=cols;
  const title=heading.replace(/^\d+[.)]\s*/,''),split=title.split(/\s{2,}|\s+[—–|]\s+/);
  let name=pendingName||split.shift()||'',location=pendingPlace||split.join(' — ');
  if(!name)throw Error('Перед таблицей товаров укажите заголовок с именем торговца.');
  const items=[];
  const dataRows=rows.slice(row+1).filter(r=>r.some(Boolean));
  dataRows.forEach((r,i)=>{if(!r[ni]?.trim()||!r[pi]?.trim())throw Error(`«${name}», строка ${row+i+2}: отсутствует товар или цена.`);items.push({name:r[ni],price:r[pi]});});
  merchants.push({name,location,items,priceOptions:prices.map(p=>({label:p.label,prices:dataRows.map(r=>r[p.index]||'')})),priceColumn:prices.findIndex(p=>p.index===pi)});pendingName='';pendingPlace='';
 }
 const result=normalizeMerchants({merchants});result.merchants.forEach((m,i)=>{if(merchants[i].priceOptions.length>1){m.priceOptions=merchants[i].priceOptions;m.priceColumn=merchants[i].priceColumn;}});return result;
}
function parseCsv(source){
 const rows=csvRows(source),h=rows[0]?.map(header)||[],mi=h.findIndex(v=>/^(торговец|merchant|имя)$/.test(v)),li=h.findIndex(v=>/^(место|location|place)$/.test(v)),ni=h.findIndex(itemColumn),pi=h.findIndex(priceColumn);
 if(mi<0||ni<0||pi<0)throw Error('Нужны столбцы: Торговец, Место, Товар, Цена.');
 const merchants=[],map=new Map();let lastName='',lastPlace='';
 rows.slice(1).forEach((r,i)=>{const name=r[mi]||lastName,location=li<0?'':r[li]||((name===lastName)?lastPlace:'');if(!name||!r[ni]||!r[pi])throw Error(`Строка ${i+2}: нужны торговец, товар и цена.`);lastName=name;lastPlace=location;const key=JSON.stringify([name,location]);if(!map.has(key)){const m={name,location,items:[]};map.set(key,m);merchants.push(m);}map.get(key).items.push({name:r[ni],price:r[pi]});});
 return normalizeMerchants({merchants});
}
export function parseMerchantText(source,filename=''){
 const s=String(source).replace(/^\uFEFF/,'').trim();if(!s)throw Error('Файл пустой.');if(s.length>1000000)throw Error('Текст слишком большой (максимум 1 МБ).');
 if(/^[\[{]/.test(s)||/\.json$/i.test(filename)){let data;try{data=JSON.parse(s);}catch{throw Error('Не удалось прочитать JSON. Проверьте запятые и кавычки.');}return normalizeMerchants(data);}
 if(/\.(csv|tsv)$/i.test(filename)||/^(?:торговец|merchant|имя)[;,\t]/i.test(s))return parseCsv(s);
 const blocks=[];let rows=[];
 const flush=()=>{if(rows.length)blocks.push({type:'table',rows});rows=[];};
 for(const line of s.split(/\r?\n/)){const l=line.trim();if(!l){flush();continue;}
  if(l.includes('|')){const cells=l.replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());if(cells.every(x=>/^:?-+:?$/.test(x)))continue;rows.push(cells);continue;}
  if(rows.length){flush();}
  if(/^#+\s/.test(l)){blocks.push({type:'paragraph',text:l.replace(/^#+\s*/,''),heading:true});continue;}
  const item=l.match(/^[-•*]?\s*(.+?)\s+[—–]\s+(.+)$/);
  if(item&&blocks.at(-1)?.type==='table'&&blocks.at(-1).simple){blocks.at(-1).rows.push([item[1],item[2]]);continue;}
  if(item&&blocks.some(b=>b.type==='paragraph'&&/^(имя|торговец)\s*:/i.test(b.text))){blocks.push({type:'table',simple:true,rows:[['Товар','Цена'],[item[1],item[2]]]});continue;}
  blocks.push({type:'paragraph',text:l.replace(/^#+\s*/,''),heading:/^#+\s/.test(l)});
 }
 flush();return merchantsFromBlocks(blocks);
}
export function docxBlocks(xml,Parser=globalThis.DOMParser,stylesXml=''){
 const doc=new Parser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('Повреждён документ Word.');
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const visibleText=node=>{let s='';const walk=n=>{if(n.namespaceURI===ns&&n.localName==='del')return;if(n.namespaceURI===ns&&n.localName==='t')s+=n.textContent;else if(n.namespaceURI===ns&&n.localName==='tab')s+='  ';else if(n.namespaceURI===ns&&n.localName==='br')s+='\n';else for(const c of n.childNodes||[])walk(c);};walk(node);return s.trim();};
 const body=doc.getElementsByTagNameNS(ns,'body')[0];if(!body)throw Error('В файле не найден текст Word.');
 const styles=new Map();if(stylesXml){const definitions=new Parser().parseFromString(stylesXml,'application/xml');for(const s of definitions.getElementsByTagNameNS(ns,'style'))styles.set(s.getAttributeNS(ns,'styleId'),{name:s.getElementsByTagNameNS(ns,'name')[0]?.getAttributeNS(ns,'val')||'',base:s.getElementsByTagNameNS(ns,'basedOn')[0]?.getAttributeNS(ns,'val'),outline:s.getElementsByTagNameNS(ns,'outlineLvl')[0]?.getAttributeNS(ns,'val')});}
 function isHeading(id,seen=new Set()){if(!id||seen.has(id))return false;seen.add(id);const s=styles.get(id);if(s?.outline!==undefined)return Number(s.outline)<9;return /heading|заголовок/i.test(s?.name||id)||isHeading(s?.base,seen);}
 const blocks=[];const read=node=>{for(const el of node.children){if(el.localName==='p'){const style=el.getElementsByTagNameNS(ns,'pStyle')[0]?.getAttributeNS(ns,'val')||'',outline=el.getElementsByTagNameNS(ns,'outlineLvl')[0]?.getAttributeNS(ns,'val');blocks.push({type:'paragraph',text:visibleText(el),heading:outline!==undefined?Number(outline)<9:isHeading(style)});}else if(el.localName==='tbl'){const rows=[...el.children].filter(n=>n.localName==='tr').map(r=>[...r.children].filter(n=>n.localName==='tc').map(visibleText));blocks.push({type:'table',rows});}else if(['sdt','sdtContent','customXml'].includes(el.localName))read(el);}};read(body);
 return blocks;
}
