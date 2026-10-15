-- Private merchant catalogue per room. Only the master publishes individual shops.
begin;
create table if not exists public.party_merchants (
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.party_rooms(id) on delete cascade,
 name text not null,location text not null default '',items jsonb not null,
 visible boolean not null default false,revision bigint not null default 1,updated_at timestamptz not null default now()
);
create unique index if not exists party_merchants_identity on public.party_merchants(room_id,lower(name),lower(location));
create or replace function public.is_party_master(target_room uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.is_party_member(target_room) and exists(select 1 from public.party_rooms where id=target_room and master_id=auth.uid() and deleted_at is null);
$$;
revoke all on function public.is_party_master(uuid) from public,anon;
grant execute on function public.is_party_master(uuid) to authenticated;
alter table public.party_merchants enable row level security;
revoke all on public.party_merchants from anon,authenticated;
grant select on public.party_merchants to authenticated;
drop policy if exists merchant_read on public.party_merchants;
create policy merchant_read on public.party_merchants for select to authenticated using(public.is_party_member(room_id) and (visible or public.is_party_master(room_id)));
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

create or replace function public.import_party_merchants(target_room uuid,merchant_data jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare raw jsonb; data jsonb; existing uuid; count integer=0;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 if jsonb_typeof(merchant_data) is distinct from 'array' or octet_length(merchant_data::text)>2000000 then raise exception 'INVALID_MERCHANT'; end if;
 if jsonb_array_length(merchant_data) not between 1 and 100 then raise exception 'INVALID_MERCHANT'; end if;
 for raw in select value from jsonb_array_elements(merchant_data) loop
  data=public.validate_party_merchant(raw);
  select id into existing from public.party_merchants where room_id=target_room and lower(name)=lower(data->>'name') and lower(location)=lower(data->>'location');
  if existing is null then
   insert into public.party_merchants(room_id,name,location,items) values(target_room,data->>'name',data->>'location',data->'items');
  else
   update public.party_merchants set name=data->>'name',location=data->>'location',items=data->'items',revision=revision+1,updated_at=now() where id=existing;
  end if;
  count=count+1;
 end loop;
 return count;
end; $$;
create or replace function public.save_party_merchant(target_room uuid,merchant_id uuid,merchant_data jsonb,expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare data jsonb;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 data=public.validate_party_merchant(merchant_data);
 update public.party_merchants set name=data->>'name',location=data->>'location',items=data->'items',revision=revision+1,updated_at=now()
 where id=merchant_id and room_id=target_room and revision=expected_revision;
 if not found then raise exception 'REVISION_CONFLICT'; end if;
end; $$;
create or replace function public.set_party_merchant_visible(target_room uuid,merchant_id uuid,show_value boolean,expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 if show_value is null then raise exception 'INVALID_MERCHANT'; end if;
 update public.party_merchants set visible=show_value,revision=revision+1,updated_at=now() where id=merchant_id and room_id=target_room and revision=expected_revision;
 if not found then raise exception 'REVISION_CONFLICT'; end if;
end; $$;
create or replace function public.delete_party_merchant(target_room uuid,merchant_id uuid,expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 delete from public.party_merchants where id=merchant_id and room_id=target_room and revision=expected_revision;
 if not found then raise exception 'REVISION_CONFLICT'; end if;
end; $$;
revoke all on function public.import_party_merchants(uuid,jsonb),public.save_party_merchant(uuid,uuid,jsonb,bigint),public.set_party_merchant_visible(uuid,uuid,boolean,bigint),public.delete_party_merchant(uuid,uuid,bigint) from public,anon;
grant execute on function public.import_party_merchants(uuid,jsonb),public.save_party_merchant(uuid,uuid,jsonb,bigint),public.set_party_merchant_visible(uuid,uuid,boolean,bigint),public.delete_party_merchant(uuid,uuid,bigint) to authenticated;
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
