-- Disposable rooms and users: the complete test is rolled back.
begin;
create temporary table merchant_qa(master_id uuid,player_id uuid,room_a uuid,room_b uuid,shop uuid,private_shop uuid,invite text);
insert into merchant_qa(master_id,player_id) values(gen_random_uuid(),gen_random_uuid());
grant all on merchant_qa to authenticated;
insert into auth.users(id) select master_id from merchant_qa union all select player_id from merchant_qa;
select set_config('request.jwt.claim.sub',master_id::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;rid uuid;sid uuid;denied boolean=false;begin
 rid:=public.create_party_room('Merchant QA A','Master');update merchant_qa set room_a=rid,invite=public.list_party_rooms()->0->>'invite_code';
 rid:=public.create_party_room('Merchant QA B','Master');update merchant_qa set room_b=rid;select * into t from merchant_qa;
 sid:=public.create_party_merchant(t.room_a,'{"name":"Shop","location":"Market","items":[]}');update merchant_qa set shop=sid;
 if not exists(select 1 from public.party_merchants where id=sid and not visible and jsonb_array_length(items)=0) then raise exception 'FAIL empty hidden creation';end if;
 begin perform public.create_party_merchant(t.room_a,'{"name":"shop","location":"market","items":[{"name":"Overwrite","price":"1 zm"}]}');exception when unique_violation then denied:=true;end;
 if not denied or not exists(select 1 from public.party_merchants where id=sid and revision=1 and jsonb_array_length(items)=0) then raise exception 'FAIL duplicate must not overwrite';end if;
 perform public.save_party_merchant(t.room_a,sid,'{"name":"Renamed","location":"Road","items":[{"name":"Potion","price":"5-10 zm"}]}',1);
 perform public.save_party_merchant(t.room_a,sid,'{"name":"Renamed","location":"Road","items":[]}',2);
 denied=false;begin perform public.save_party_merchant(t.room_a,sid,'{"name":"Stale","items":[]}',2);exception when others then if sqlerrm='REVISION_CONFLICT' then denied:=true;else raise;end if;end;if not denied then raise exception 'FAIL stale update';end if;
 denied=false;begin perform public.save_party_merchant(t.room_b,sid,'{"name":"Wrong room","items":[]}',3);exception when others then if sqlerrm='REVISION_CONFLICT' then denied:=true;else raise;end if;end;if not denied then raise exception 'FAIL room isolation';end if;
 perform public.set_party_merchant_visible(t.room_a,sid,true,3);
 perform public.save_party_merchant(t.room_a,sid,'{"name":"Published shop","items":[{"name":"Potion","price":"5 zm"}]}',4);
 if not exists(select 1 from public.party_merchants where id=sid and visible and revision=5) then raise exception 'FAIL edit changed visibility';end if;
 sid:=public.create_party_merchant(t.room_a,'{"name":"Private shop","items":[]}');update merchant_qa set private_shop=sid;
 denied=false;begin perform public.create_party_merchant(t.room_a,'{"name":"Invalid","items":[{"name":"Potion","price":""}]}');exception when others then if sqlerrm='INVALID_MERCHANT' then denied:=true;else raise;end if;end;if not denied then raise exception 'FAIL validation';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',player_id::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;denied boolean=false;begin
 select * into t from merchant_qa;perform public.join_party_room(t.invite,'Player');
 if exists(select 1 from public.party_merchants where id=t.private_shop) or not exists(select 1 from public.party_merchants where id=t.shop) then raise exception 'FAIL visibility';end if;
 begin perform public.create_party_merchant(t.room_a,'{"name":"Player shop","items":[]}');exception when others then if sqlerrm='MASTER_REQUIRED' then denied:=true;else raise;end if;end;if not denied then raise exception 'FAIL player create';end if;
 denied=false;begin perform public.save_party_merchant(t.room_a,t.shop,'{"name":"Player edit","items":[]}',5);exception when others then if sqlerrm='MASTER_REQUIRED' then denied:=true;else raise;end if;end;if not denied then raise exception 'FAIL player edit';end if;
 denied=false;begin perform public.delete_party_merchant(t.room_a,t.shop,5);exception when others then if sqlerrm='MASTER_REQUIRED' then denied:=true;else raise;end if;end;if not denied then raise exception 'FAIL player delete';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',master_id::text,true) from merchant_qa;
set local role authenticated;
do $$ declare t record;begin
 select * into t from merchant_qa;perform public.delete_party_merchant(t.room_a,t.shop,5);
 if exists(select 1 from public.party_merchants where id=t.shop) then raise exception 'FAIL delete';end if;
end $$;
reset role;
rollback;
select 'PASS: merchant creation, empty stock, duplicate protection, editing, visibility, revisions, room isolation, master-only writes and deletion' as result;
