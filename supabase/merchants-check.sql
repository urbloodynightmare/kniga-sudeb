-- Permission and persistence checks with a complete rollback of disposable data.
begin;
create temporary table merchant_qa(master uuid,player uuid,stranger uuid,room uuid,shop uuid,code text);
insert into merchant_qa(master,player,stranger) values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant all on merchant_qa to authenticated;
insert into auth.users(id) select master from merchant_qa union all select player from merchant_qa union all select stranger from merchant_qa;
select set_config('request.jwt.claim.sub',master::text,true) from merchant_qa;
set local role authenticated;
do $$ declare rid uuid; begin
 rid=public.create_party_room('QA shops','QA master');update merchant_qa set room=rid,code=public.list_party_rooms()->0->>'invite_code';
 perform public.import_party_merchants(rid,'[{"name":"Shop","location":"Town","visible":true,"items":[{"name":"Potion","price":"5–20 gp","stock":"PRIVATE CONDITION"}]}]');
 update merchant_qa set shop=(select id from public.party_merchants where room_id=rid);
 if (select visible from public.party_merchants where room_id=rid) then raise exception 'FAIL imported visibility';end if;
 if (select items::text from public.party_merchants where room_id=rid) like '%PRIVATE CONDITION%' then raise exception 'FAIL extra fields';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',player::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;denied boolean=false; begin
 select * into t from merchant_qa;perform public.join_party_room(t.code,'QA player');
 if exists(select 1 from public.party_merchants) then raise exception 'FAIL hidden shop leaked';end if;
 begin perform public.set_party_merchant_visible(t.room,t.shop,true,1);exception when others then if sqlerrm='MASTER_REQUIRED' then denied=true;else raise;end if;end;
 if not denied then raise exception 'FAIL player publishing';end if;
 denied=false;begin perform public.import_party_merchants(t.room,'[{"name":"Bad","items":[{"name":"X","price":"1 gp"}]}]');exception when others then if sqlerrm='MASTER_REQUIRED' then denied=true;else raise;end if;end;
 if not denied then raise exception 'FAIL player import';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',master::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;denied boolean=false;begin
 select * into t from merchant_qa;perform public.set_party_merchant_visible(t.room,t.shop,true,1);
 perform public.import_party_merchants(t.room,'[{"name":"Shop","location":"Town","items":[{"name":"Potion","price":"50 gp"}]}]');
 if (select count(*) from public.party_merchants where room_id=t.room)<>1 or not (select visible from public.party_merchants where id=t.shop) then raise exception 'FAIL reimport';end if;
 begin perform public.set_party_merchant_visible(t.room,t.shop,false,1);exception when others then if sqlerrm='REVISION_CONFLICT' then denied=true;else raise;end if;end;
 if not denied then raise exception 'FAIL revision conflict';end if;
 -- Invalid second shop rolls back the first; imports cannot leave a partial catalogue.
 denied=false;begin perform public.import_party_merchants(t.room,'[{"name":"Partial","items":[{"name":"X","price":"1 gp"}]},{"name":"Broken","items":[{"name":"X","price":""}]}]');exception when others then if sqlerrm='INVALID_MERCHANT' then denied=true;else raise;end if;end;
 if not denied or exists(select 1 from public.party_merchants where name='Partial') then raise exception 'FAIL atomic import';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',player::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record; denied boolean=false;begin
 select * into t from merchant_qa;
 if (select count(*) from public.party_merchants)<>1 or (select items->0->>'price' from public.party_merchants)<>'50 gp' then raise exception 'FAIL published price';end if;
 begin perform public.delete_party_merchant(t.room,t.shop,3);exception when others then if sqlerrm='MASTER_REQUIRED' then denied=true;else raise;end if;end;
 if not denied then raise exception 'FAIL player deletion';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',stranger::text,true) from merchant_qa;
set local role authenticated;
do $$ begin if exists(select 1 from public.party_merchants) then raise exception 'FAIL outsider';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub',master::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;denied boolean=false;begin
 select * into t from merchant_qa;perform public.change_party_master(t.room,t.player);
 begin perform public.set_party_merchant_visible(t.room,t.shop,false,3);exception when others then if sqlerrm='MASTER_REQUIRED' then denied=true;else raise;end if;end;
 if not denied then raise exception 'FAIL former master';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',player::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;begin
 select * into t from merchant_qa;perform public.set_party_merchant_visible(t.room,t.shop,false,3);perform public.delete_party_merchant(t.room,t.shop,4);
 if exists(select 1 from public.party_merchants) then raise exception 'FAIL deletion';end if;
end $$;
reset role;
rollback;
select 'PASS: hidden catalogue, master-only writes, visible prices, reimport, atomic validation, revision conflicts, outsider isolation and master transfer' as result;
