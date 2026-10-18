// A saved hero can be selected without rewriting the entire personal book.
// Only a not-yet-published local hero needs a successful book sync first.
export async function selectPartyCharacter({rpc,syncPersonal,roomId,characterId}){
 const args={target_room:roomId,selected_character:characterId||null};
 try{await rpc('set_party_character',args);}
 catch(error){
  if(!characterId||!String(error.message||'').includes('CHARACTER_NOT_OWNED'))throw error;
  try{await syncPersonal();}catch(cause){throw Object.assign(new Error('PERSONAL_SYNC_REQUIRED'),{cause});}
  await rpc('set_party_character',args);
 }
}
