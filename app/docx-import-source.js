import {unzipSync,strFromU8} from 'fflate';
import {docxBlocks,merchantsFromBlocks} from './merchant-import.js?v=20261013-05';
export function parseMerchantDocx(bytes){
 if(bytes.byteLength>10000000)throw Error('Файл Word слишком большой (максимум 10 МБ).');
 let xml;try{const files=unzipSync(new Uint8Array(bytes),{filter:file=>{if(file.name!=='word/document.xml')return false;if(file.originalSize>5000000)throw Error('Текст Word слишком большой.');return true;}});if(!files['word/document.xml'])throw Error('Нет документа');xml=strFromU8(files['word/document.xml']);}catch(e){throw Error(e.message==='Текст Word слишком большой.'?e.message:'Не удалось открыть Word. Нужен файл .docx, а не .doc или PDF.');}
 return merchantsFromBlocks(docxBlocks(xml));
}
