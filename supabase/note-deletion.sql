-- Permanently removes only a deleted note, with revision and room membership checks.
begin;
create or replace function public.delete_party_note(target_room uuid,note_id uuid,expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare n public.party_notes;
begin
 perform 1 from public.party_rooms where id=target_room for update;
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED';end if;
 select * into n from public.party_notes where id=note_id and room_id=target_room for update;
 if not found or n.revision is distinct from expected_revision then raise exception 'REVISION_CONFLICT';end if;
 if not n.archived then raise exception 'NOTE_NOT_ARCHIVED';end if;
 delete from public.party_notes where id=n.id;
 -- Versions are removed by the party_note_history foreign key's ON DELETE CASCADE.
end; $$;
revoke all on function public.delete_party_note(uuid,uuid,bigint) from public,anon;
grant execute on function public.delete_party_note(uuid,uuid,bigint) to authenticated;
commit;
