// Run after extracting SRD 5.2.1 pages 107–175 to tmp/spells.txt using pypdf.
import fs from 'node:fs';
let text=fs.readFileSync('tmp/spells.txt','utf8').replace(/System Reference Document 5\.2\.1\s*\d+\s*/g,'').replace(/�/g,"'");
const pattern=/^([^\n]+)\n(?:(?:Level (\d) (\w+))|(?:(\w+) Cantrip))\s*\(([^)]+)\)\s*\nCasting Time:/gm;
const matches=[...text.matchAll(pattern)], spells=[];
for(let i=0;i<matches.length;i++){
  const m=matches[i];let name=m[1].trim().toLowerCase().replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const body=text.slice(m.index,matches[i+1]?.index||text.length).replace(/\s*-\n\s*/g,'').replace(/(?<!\n)\n(?!\n)/g,' ').replace(/\s+/g,' ').trim();
  const slug=name.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/ /g,'-');
  const get=(a,b)=>body.split(a)[1]?.split(b)[0]?.trim()||'';
  spells.push({id:slug,name,level:Number(m[2]||0),school:m[3]||m[4],classes:m[5].replace(/\s+/g,'').toLowerCase().split(','),time:get('Casting Time:','Range:'),range:get('Range:','Components:'),components:get('Components:','Duration:'),description:body,concentration:body.includes('Duration: Concentration'),ritual:get('Casting Time:','Range:').includes('Ritual'),damage:/\d+d\d+.*?damage/.test(body),attack:/spell attack/.test(body),source:'SRD 5.2.1'});
}
if(spells.length<300)throw Error('Expected 300+ spells; found '+spells.length);
fs.writeFileSync('data/spells.json',JSON.stringify(spells,null,2));console.log('Extracted',spells.length,'spells');
