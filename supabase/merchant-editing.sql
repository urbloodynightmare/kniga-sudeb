-- Manual shop creation and empty stock; existing master-only rules are retained.
begin;
create or replace function public.validate_party_merchant(data jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; goods jsonb='[]'::jsonb; shop_name text=trim(data->>'name'); place text=trim(coalesce(data->>'location',''));
begin
 if jsonb_typeof(data) is distinct from 'object' or shop_name is null or length(shop_name) not between 1 and 150 or length(place)>300
 or jsonb_typeof(data->'items') is distinct from 'array' then raise exception 'INVALID_MERCHANT'; end if;
 if jsonb_array_length(data->'items') not between 0 and 500 or octet_length(data::text)>1000000 then raise exception 'INVALID_MERCHANT'; end if;
 for item in select value from jsonb_array_elements(data->'items') loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'price') is distinct from 'string'
   or length(trim(item->>'name')) not between 1 and 200 or length(trim(item->>'price')) not between 1 and 300 then raise exception 'INVALID_MERCHANT'; end if;
  goods=goods||jsonb_build_array(jsonb_build_object('name',trim(item->>'name'),'price',trim(item->>'price')));
 end loop;
 return jsonb_build_object('name',shop_name,'location',place,'items',goods);
end; $$;
revoke all on function public.validate_party_merchant(jsonb) from public,anon,authenticated;

create or replace function public.create_party_merchant(target_room uuid,merchant_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare data jsonb; created uuid;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 data=public.validate_party_merchant(merchant_data);
 insert into public.party_merchants(room_id,name,location,items)
 values(target_room,data->>'name',data->>'location',data->'items') returning id into created;
 return created;
end; $$;
revoke all on function public.create_party_merchant(uuid,jsonb) from public,anon;
grant execute on function public.create_party_merchant(uuid,jsonb) to authenticated;
commit;
