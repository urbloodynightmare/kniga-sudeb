-- Additive migration: personal books remain private. Room actions use checked RPCs.
begin;
create table if not exists public.party_rooms (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 100),
 owner_id uuid not null references auth.users(id), master_id uuid references auth.users(id),
 invite_code text not null unique default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
 created_at timestamptz not null default now()
);
create table if not exists public.party_members (
 room_id uuid not null references public.party_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 80),
 joined_at timestamptz not null default now(), primary key(room_id,user_id)
);
create table if not exists public.party_notes (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.party_rooms(id) on delete cascade,
 title text not null check(length(title) between 1 and 150), body text not null default '' check(octet_length(body)<=500000),
 author_id uuid not null references auth.users(id), editor_id uuid not null references auth.users(id),
 revision bigint not null default 1, updated_at timestamptz not null default now(), archived boolean not null default false
);
create table if not exists public.party_note_history (
 note_id uuid not null references public.party_notes(id) on delete cascade, revision bigint not null,
 title text not null, body text not null, editor_id uuid not null references auth.users(id),
 saved_at timestamptz not null default now(), primary key(note_id,revision)
);
create or replace function public.is_party_member(target_room uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.party_members where room_id=target_room and user_id=auth.uid());
$$;
alter table public.party_rooms enable row level security;
alter table public.party_members enable row level security;
alter table public.party_notes enable row level security;
alter table public.party_note_history enable row level security;
revoke all on public.party_rooms,public.party_members,public.party_notes,public.party_note_history from anon,authenticated;
-- Room rows (including invite codes) are returned by filtered RPC, never direct SELECT.
grant select on public.party_members,public.party_notes,public.party_note_history to authenticated;
create policy party_members_read on public.party_members for select to authenticated using(public.is_party_member(room_id));
create policy party_notes_read on public.party_notes for select to authenticated using(public.is_party_member(room_id));
create policy party_history_read on public.party_note_history for select to authenticated using(exists(select 1 from public.party_notes n where n.id=note_id and public.is_party_member(n.room_id)));

create or replace function public.list_party_rooms()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'owner_id',r.owner_id,'master_id',r.master_id,
 'invite_code',case when auth.uid() in (r.owner_id,r.master_id) then r.invite_code else null end) order by r.created_at),'[]'::jsonb)
 from public.party_rooms r join public.party_members m on m.room_id=r.id where m.user_id=auth.uid();
$$;
create or replace function public.create_party_room(room_name text,member_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(trim(room_name)) not between 1 and 100 or length(trim(member_name)) not between 1 and 80 then raise exception 'INVALID_NAME'; end if;
 insert into public.party_rooms(name,owner_id,master_id) values(trim(room_name),auth.uid(),auth.uid()) returning id into room;
 insert into public.party_members(room_id,user_id,display_name) values(room,auth.uid(),trim(member_name)); return room;
end; $$;
create or replace function public.join_party_room(code text,member_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(trim(member_name)) not between 1 and 80 then raise exception 'INVALID_NAME'; end if;
 select id into room from public.party_rooms where invite_code=trim(code) for update;
 if room is null then raise exception 'INVITE_NOT_FOUND'; end if;
 insert into public.party_members(room_id,user_id,display_name) values(room,auth.uid(),trim(member_name))
 on conflict(room_id,user_id) do update set display_name=excluded.display_name; return room;
end; $$;
create or replace function public.change_party_master(target_room uuid,new_master uuid)
returns void language plpgsql security definer set search_path='' as $$
declare r public.party_rooms;
begin
 select * into r from public.party_rooms where id=target_room for update;
 if not public.is_party_member(target_room) or (auth.uid() is distinct from r.owner_id and auth.uid() is distinct from r.master_id) then raise exception 'NOT_ALLOWED'; end if;
 if not exists(select 1 from public.party_members where room_id=target_room and user_id=new_master) then raise exception 'NOT_A_MEMBER'; end if;
 update public.party_rooms set master_id=new_master where id=target_room;
end; $$;
create or replace function public.leave_party_room(target_room uuid,target_user uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare r public.party_rooms; leaving uuid:=coalesce(target_user,auth.uid());
begin
 select * into r from public.party_rooms where id=target_room for update;
 if not public.is_party_member(target_room) or (leaving<>auth.uid() and auth.uid()<>r.owner_id and auth.uid() is distinct from r.master_id) then raise exception 'NOT_ALLOWED'; end if;
 if leaving=r.owner_id then raise exception 'OWNER_CANNOT_LEAVE'; end if;
 if leaving=r.master_id then raise exception 'TRANSFER_MASTER_FIRST'; end if;
 delete from public.party_members where room_id=target_room and user_id=leaving;
end; $$;
create or replace function public.rotate_party_invite(target_room uuid)
returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
 update public.party_rooms set invite_code=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')
 where id=target_room and public.is_party_member(target_room) and auth.uid() in(owner_id,master_id) returning invite_code into result;
 if result is null then raise exception 'NOT_ALLOWED'; end if; return result;
end; $$;
create or replace function public.save_party_note(target_room uuid,note_id uuid,note_title text,note_body text,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.party_notes;
begin
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED'; end if;
 if note_title is null or length(trim(note_title)) not between 1 and 150 or note_body is null or octet_length(note_body)>500000 then raise exception 'INVALID_NOTE'; end if;
 if note_id is null then
  if expected_revision<>0 then raise exception 'REVISION_CONFLICT'; end if;
  insert into public.party_notes(room_id,title,body,author_id,editor_id) values(target_room,trim(note_title),note_body,auth.uid(),auth.uid()) returning * into n;
 else
  update public.party_notes set title=trim(note_title),body=note_body,revision=revision+1,editor_id=auth.uid(),updated_at=now()
  where id=note_id and room_id=target_room and revision=expected_revision and not archived returning * into n;
  if n.id is null then raise exception 'REVISION_CONFLICT'; end if;
 end if;
 insert into public.party_note_history(note_id,revision,title,body,editor_id) values(n.id,n.revision,n.title,n.body,n.editor_id);
 return to_jsonb(n);
end; $$;
create or replace function public.archive_party_note(target_room uuid,note_id uuid,expected_revision bigint,archive_value boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED'; end if;
 update public.party_notes set archived=archive_value,revision=revision+1,editor_id=auth.uid(),updated_at=now()
 where id=note_id and room_id=target_room and revision=expected_revision;
 if not found then raise exception 'REVISION_CONFLICT'; end if;
 insert into public.party_note_history(note_id,revision,title,body,editor_id)
 select id,revision,title,body,editor_id from public.party_notes where id=note_id;
end; $$;
-- Master reads character sheets only; personal party journals stay private.
create or replace function public.party_character_sheets(target_room uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.party_rooms where id=target_room and master_id=auth.uid()) or not public.is_party_member(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name,'characters',coalesce(b.data->'characters','[]'::jsonb),'dataset',b.data->'dataset')),'[]'::jsonb)
 from public.party_members m left join public.player_books b on b.user_id=m.user_id where m.room_id=target_room);
end; $$;
revoke all on function public.is_party_member(uuid),public.list_party_rooms(),public.create_party_room(text,text),public.join_party_room(text,text),public.change_party_master(uuid,uuid),public.leave_party_room(uuid,uuid),public.rotate_party_invite(uuid),public.save_party_note(uuid,uuid,text,text,bigint),public.archive_party_note(uuid,uuid,bigint,boolean),public.party_character_sheets(uuid) from public,anon;
grant execute on function public.is_party_member(uuid),public.list_party_rooms(),public.create_party_room(text,text),public.join_party_room(text,text),public.change_party_master(uuid,uuid),public.leave_party_room(uuid,uuid),public.rotate_party_invite(uuid),public.save_party_note(uuid,uuid,text,text,bigint),public.archive_party_note(uuid,uuid,bigint,boolean),public.party_character_sheets(uuid) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='party_notes') then alter publication supabase_realtime add table public.party_notes; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='party_members') then alter publication supabase_realtime add table public.party_members; end if;
 end if;
end $$;
commit;
