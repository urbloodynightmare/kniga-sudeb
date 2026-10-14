-- Private room overrides for the author's built-in d100 loot table.
begin;
create table if not exists public.party_loot_overrides(
 room_id uuid not null references public.party_rooms(id) on delete cascade,
 number smallint not null check(number between 1 and 100),
 name text not null,price text not null,description text not null default '',
 revision bigint not null default 1,updated_at timestamptz not null default now(),
 primary key(room_id,number)
);
alter table public.party_loot_overrides enable row level security;
revoke all on public.party_loot_overrides from anon,authenticated;
grant select on public.party_loot_overrides to authenticated;
drop policy if exists loot_master_read on public.party_loot_overrides;
create policy loot_master_read on public.party_loot_overrides for select to authenticated using(public.is_party_master(room_id));
create or replace function public.save_party_loot_item(target_room uuid,loot_number integer,loot_data jsonb,expected_revision bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare result bigint;item_name text;item_price text;item_description text;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED';end if;
 if loot_number is null or loot_number not between 1 and 100 or expected_revision is null or expected_revision<0
 or jsonb_typeof(loot_data) is distinct from 'object' or jsonb_typeof(loot_data->'name') is distinct from 'string'
 or jsonb_typeof(loot_data->'price') is distinct from 'string' or jsonb_typeof(loot_data->'description') is distinct from 'string' then raise exception 'INVALID_LOOT';end if;
 item_name=trim(loot_data->>'name');item_price=trim(loot_data->>'price');item_description=trim(loot_data->>'description');
 if length(item_name) not between 1 and 200 or length(item_price) not between 1 and 100 or length(item_description)>5000 then raise exception 'INVALID_LOOT';end if;
 if expected_revision=0 then
  insert into public.party_loot_overrides(room_id,number,name,price,description) values(target_room,loot_number,item_name,item_price,item_description)
  on conflict do nothing returning revision into result;
 else
  update public.party_loot_overrides set name=item_name,price=item_price,description=item_description,revision=revision+1,updated_at=now()
  where room_id=target_room and number=loot_number and revision=expected_revision returning revision into result;
 end if;
 if result is null then raise exception 'REVISION_CONFLICT';end if;
 return result;
end; $$;
revoke all on function public.save_party_loot_item(uuid,integer,jsonb,bigint) from public,anon;
grant execute on function public.save_party_loot_item(uuid,integer,jsonb,bigint) to authenticated;
commit;
