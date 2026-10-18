const cache=new Map();
const LARGE_AVATAR=200_000;
export function optimizeAvatar(value){
 if(typeof value!=='string'||value.length<=LARGE_AVATAR||!/^data:image\/(png|jpeg|webp);base64,/.test(value))return Promise.resolve(value);
 if(cache.has(value))return cache.get(value);
 const pending=new Promise(resolve=>{
  const image=new Image(),finish=result=>{clearTimeout(timer);image.onload=null;image.onerror=null;resolve(result);};
  const timer=setTimeout(()=>finish(value),10000);
  image.onerror=()=>finish(value);
  image.onload=()=>{
   try{
    if(value.startsWith('data:image/webp;')&&image.naturalWidth<=512&&image.naturalHeight<=512)return finish(value);
    const ratio=Math.min(1,512/image.naturalWidth,512/image.naturalHeight),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)return finish(value);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const compressed=canvas.toDataURL('image/webp',.85);finish(compressed.length<value.length&&compressed.startsWith('data:image/')?compressed:value);
   }catch{finish(value);}
  };
  image.src=value;
 });
 cache.set(value,pending);while(cache.size>4)cache.delete(cache.keys().next().value);return pending;
}
export async function prepareBookPayload(book,optimize=optimizeAvatar){
 if(!Array.isArray(book?.characters))return book;
 let changed=false;
 const characters=await Promise.all(book.characters.map(async c=>{
  if(typeof c.avatar!=='string'||c.avatar.length<=LARGE_AVATAR)return c;
  let avatar;try{avatar=await optimize(c.avatar);}catch{return c;}
  if(typeof avatar!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(avatar)||avatar.length>=c.avatar.length)return c;
  changed=true;return {...c,avatar};
 }));
 return changed?{...book,characters}:book;
}
