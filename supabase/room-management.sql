begin;
alter table public.party_rooms add column if not exists deleted_at timestamptz;
alter table public.party_members add column if not exists character_id text;
-- Room diary copies are separate from player_books, so stale autosaves cannot erase them.
create table if not exists public.room_diary_archives (
 user_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null, room_name text not null, notes jsonb not null, history jsonb not null,
 archived_at timestamptz not null default now(), primary key(user_id,room_id)
);
alter table public.room_diary_archives enable row level security;
revoke all on public.room_diary_archives from anon,authenticated;
grant select on public.room_diary_archives to authenticated;
create policy room_diary_read_own on public.room_diary_archives for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.is_party_member(target_room uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.party_members m join public.party_rooms r on r.id=m.room_id
 where m.room_id=target_room and m.user_id=auth.uid() and r.deleted_at is null);
$$;
create or replace function public.list_party_rooms()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'owner_id',r.owner_id,'master_id',r.master_id,'character_id',m.character_id,
 'invite_code',case when auth.uid() in (r.owner_id,r.master_id) then r.invite_code else null end) order by r.created_at),'[]'::jsonb)
 from public.party_rooms r join public.party_members m on m.room_id=r.id where m.user_id=auth.uid() and r.deleted_at is null;
$$;
create or replace function public.join_party_room(code text,member_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(trim(member_name)) not between 1 and 80 then raise exception 'INVALID_NAME'; end if;
 select id into room from public.party_rooms where invite_code=trim(code) and deleted_at is null for update;
 if room is null then raise exception 'INVITE_NOT_FOUND'; end if;
 insert into public.party_members(room_id,user_id,display_name) values(room,auth.uid(),trim(member_name))
 on conflict(room_id,user_id) do update set display_name=excluded.display_name;return room;
end; $$;
-- Use named columns now that membership has a character selection.
create or replace function public.create_party_room(room_name text,member_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(trim(room_name)) not between 1 and 100 or length(trim(member_name)) not between 1 and 80 then raise exception 'INVALID_NAME'; end if;
 insert into public.party_rooms(name,owner_id,master_id) values(trim(room_name),auth.uid(),auth.uid()) returning id into room;
 insert into public.party_members(room_id,user_id,display_name) values(room,auth.uid(),trim(member_name));return room;
end; $$;
create or replace function public.set_party_character(target_room uuid,selected_character text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for share;
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED'; end if;
 if selected_character is not null and not exists(select 1 from public.player_books b,
 jsonb_array_elements(b.data->'characters') c where b.user_id=auth.uid() and c->>'id'=selected_character) then raise exception 'CHARACTER_NOT_OWNED'; end if;
 update public.party_members set character_id=selected_character where room_id=target_room and user_id=auth.uid();
end; $$;
create or replace function public.delete_party_room(target_room uuid)
returns void language plpgsql security definer set search_path='' as $$
declare r public.party_rooms; copied_notes jsonb; copied_history jsonb;
begin
 select * into r from public.party_rooms where id=target_room for update;
 if r.id is null or r.deleted_at is not null or auth.uid() is distinct from r.owner_id then raise exception 'NOT_ALLOWED'; end if;
 select coalesce(jsonb_agg(to_jsonb(n) order by n.updated_at),'[]'::jsonb) into copied_notes from public.party_notes n where n.room_id=target_room;
 select coalesce(jsonb_agg(to_jsonb(h) order by h.saved_at),'[]'::jsonb) into copied_history from public.party_note_history h
 join public.party_notes n on n.id=h.note_id where n.room_id=target_room;
 insert into public.room_diary_archives(user_id,room_id,room_name,notes,history)
 select user_id,target_room,r.name,copied_notes,copied_history from public.party_members where room_id=target_room;
 -- Logical deletion retains the original data, revokes access, and disables invitation.
 update public.party_rooms set deleted_at=now() where id=target_room;
end; $$;
-- Serialize note saves with deletion so the exported diary includes every completed save.
create or replace function public.save_party_note(target_room uuid,note_id uuid,note_title text,note_body text,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.party_notes;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for share;
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
 insert into public.party_note_history(note_id,revision,title,body,editor_id) values(n.id,n.revision,n.title,n.body,n.editor_id);return to_jsonb(n);
end; $$;
create or replace function public.archive_party_note(target_room uuid,note_id uuid,expected_revision bigint,archive_value boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for share;
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED'; end if;
 update public.party_notes set archived=archive_value,revision=revision+1,editor_id=auth.uid(),updated_at=now()
 where id=note_id and room_id=target_room and revision=expected_revision;
 if not found then raise exception 'REVISION_CONFLICT'; end if;
 insert into public.party_note_history(note_id,revision,title,body,editor_id) select id,revision,title,body,editor_id from public.party_notes where id=note_id;
end; $$;
revoke all on function public.set_party_character(uuid,text),public.delete_party_room(uuid) from public,anon;
grant execute on function public.set_party_character(uuid,text),public.delete_party_room(uuid) to authenticated;

-- Replaces full sheet access with an explicit allowlist of published game values.
create or replace function public.party_character_sheets(target_room uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.party_rooms where id=target_room and master_id=auth.uid()) or not public.is_party_member(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name,
 'selected_character_id',m.character_id,'characters',coalesce((select jsonb_agg(jsonb_build_object(
  'id',c->'id','name',c->'name','level',c->'level','className',c->'className','subclassName',c->'subclassName',
  'hp',c->'hp','hpMax',c->'hpMax','tempHp',c->'tempHp','ac',c->'ac','initiative',c->'initiative','prof',c->'prof','speed',c->'speed','passive',c->'passive',
  'spellDC',c->'spellDC','spellAttack',c->'spellAttack','castingAbility',c->'castingAbility','updatedAt',c->'updatedAt','conditions',c->'conditions',
  'abilities',(select coalesce(jsonb_agg(jsonb_build_object('key',a->'key','label',a->'label','score',a->'score','modifier',a->'modifier','save',a->'save')),'[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(c->'abilities')='array' then c->'abilities' else '[]'::jsonb end) a)
 )) from jsonb_array_elements(case when jsonb_typeof(b.data->'masterSummaries')='array' then b.data->'masterSummaries' else '[]'::jsonb end) c where c->>'id'=m.character_id),'[]'::jsonb),
 'waiting_for_summary',m.character_id is not null and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(b.data->'masterSummaries')='array' then b.data->'masterSummaries' else '[]'::jsonb end) c where c->>'id'=m.character_id))),'[]'::jsonb)
 from public.party_members m left join public.player_books b on b.user_id=m.user_id where m.room_id=target_room);
end; $$;
revoke all on function public.party_character_sheets(uuid) from public,anon;
grant execute on function public.party_character_sheets(uuid) to authenticated;

commit;
