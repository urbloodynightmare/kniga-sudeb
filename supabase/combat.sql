begin;
create table if not exists public.party_monsters(id uuid primary key default gen_random_uuid(),room_id uuid not null references public.party_rooms(id) on delete cascade,data jsonb not null,created_at timestamptz not null default now());
create unique index if not exists party_monsters_identity on public.party_monsters(room_id,lower(data->>'name'));
create table if not exists public.party_combat(room_id uuid primary key references public.party_rooms(id) on delete cascade,scene jsonb not null,revision bigint not null default 1,updated_at timestamptz not null default now());
-- Realtime publishes only a revision signal, never private statblocks or HP.
create table if not exists public.party_combat_updates(room_id uuid primary key references public.party_rooms(id) on delete cascade,revision bigint not null);
alter table public.party_combat_updates enable row level security;
revoke all on public.party_combat_updates from anon,authenticated;
grant select on public.party_combat_updates to authenticated;
drop policy if exists combat_updates_member on public.party_combat_updates;
create policy combat_updates_member on public.party_combat_updates for select to authenticated using(public.is_party_member(room_id));
alter table public.party_monsters enable row level security;
alter table public.party_combat enable row level security;
revoke all on public.party_monsters,public.party_combat from anon,authenticated;
grant select on public.party_monsters,public.party_combat to authenticated;
drop policy if exists combat_master_only on public.party_combat;
create policy combat_master_only on public.party_combat for select to authenticated using(public.is_party_master(room_id));
drop policy if exists monsters_master_only on public.party_monsters;
create policy monsters_master_only on public.party_monsters for select to authenticated using(public.is_party_master(room_id));
create or replace function public.import_party_monsters(target_room uuid,monster_data jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare m jsonb; n integer=0;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED';end if;
 if jsonb_typeof(monster_data) is distinct from 'array' or octet_length(monster_data::text)>3000000 then raise exception 'INVALID_MONSTERS';end if;
 if jsonb_array_length(monster_data) not between 1 and 200 then raise exception 'INVALID_MONSTERS';end if;
 for m in select value from jsonb_array_elements(monster_data) loop
  if jsonb_typeof(m) is distinct from 'object' or jsonb_typeof(m->'name') is distinct from 'string' or length(trim(m->>'name')) not between 1 and 150 then raise exception 'INVALID_MONSTERS';end if;
  update public.party_monsters set data=m where room_id=target_room and lower(data->>'name')=lower(m->>'name');
  if not found then insert into public.party_monsters(room_id,data) values(target_room,m);end if;n=n+1;
 end loop;return n;
end; $$;
create or replace function public.delete_party_monster(target_room uuid,monster_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED';end if;
 delete from public.party_monsters where id=monster_id and room_id=target_room;
end; $$;
create or replace function public.update_party_monster(target_room uuid,monster_id uuid,monster_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED';end if;
 if jsonb_typeof(monster_data) is distinct from 'object' or jsonb_typeof(monster_data->'name') is distinct from 'string' or length(trim(monster_data->>'name')) not between 1 and 150 or octet_length(monster_data::text)>3000000 then raise exception 'INVALID_MONSTERS';end if;
 update public.party_monsters set data=monster_data where id=monster_id and room_id=target_room;
 if not found then raise exception 'NOT_ALLOWED';end if;
end; $$;
create or replace function public.party_combat_view(target_room uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare battle public.party_combat; actors jsonb;
begin
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED';end if;
 select * into battle from public.party_combat where room_id=target_room;
 if battle.room_id is null then return null;end if;
 if public.is_party_master(target_room) then return jsonb_build_object('scene',battle.scene,'revision',battle.revision);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a->'id','name',a->'name','initiative',a->'initiative') order by position),'[]'::jsonb) into actors
 from jsonb_array_elements(battle.scene->'combatants') with ordinality as t(a,position);
 return jsonb_build_object('revision',battle.revision,'scene',jsonb_build_object('name',battle.scene->'name','active',battle.scene->'active','round',battle.scene->'round','currentId',battle.scene->'currentId','combatants',actors));
end; $$;
create or replace function public.save_party_combat(target_room uuid,combat_scene jsonb,expected_revision bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare current_revision bigint; actor jsonb;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED';end if;
 if jsonb_typeof(combat_scene) is distinct from 'object' or jsonb_typeof(combat_scene->'combatants') is distinct from 'array' or octet_length(combat_scene::text)>3000000 then raise exception 'INVALID_COMBAT';end if;
 if jsonb_array_length(combat_scene->'combatants')>100 or length(coalesce(combat_scene->>'name',''))>150 then raise exception 'INVALID_COMBAT';end if;
 for actor in select value from jsonb_array_elements(combat_scene->'combatants') loop
  if jsonb_typeof(actor) is distinct from 'object' or jsonb_typeof(actor->'id') is distinct from 'string' or jsonb_typeof(actor->'name') is distinct from 'string' or length(actor->>'name') not between 1 and 150 or jsonb_typeof(actor->'initiative') is distinct from 'number' then raise exception 'INVALID_COMBAT';end if;
 end loop;
 select revision into current_revision from public.party_combat where room_id=target_room;
 if coalesce(current_revision,0) is distinct from expected_revision then raise exception 'REVISION_CONFLICT';end if;
 insert into public.party_combat(room_id,scene,revision) values(target_room,combat_scene,coalesce(current_revision,0)+1)
 on conflict(room_id) do update set scene=excluded.scene,revision=excluded.revision,updated_at=now();
 insert into public.party_combat_updates(room_id,revision) values(target_room,coalesce(current_revision,0)+1) on conflict(room_id) do update set revision=excluded.revision;
 return coalesce(current_revision,0)+1;
end; $$;
revoke all on function public.import_party_monsters(uuid,jsonb),public.party_combat_view(uuid),public.save_party_combat(uuid,jsonb,bigint),public.delete_party_monster(uuid,uuid),public.update_party_monster(uuid,uuid,jsonb) from public,anon;
grant execute on function public.import_party_monsters(uuid,jsonb),public.party_combat_view(uuid),public.save_party_combat(uuid,jsonb,bigint),public.delete_party_monster(uuid,uuid),public.update_party_monster(uuid,uuid,jsonb) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='party_combat_updates') then alter publication supabase_realtime add table public.party_combat_updates;end if;
end $$;
commit;
