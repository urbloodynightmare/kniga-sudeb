begin;
create or replace function public.delete_party_combat(target_room uuid,expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare current_revision bigint;
begin
 perform id from public.party_rooms where id=target_room and deleted_at is null for update;
 if not public.is_party_master(target_room) then raise exception 'MASTER_REQUIRED';end if;
 select revision into current_revision from public.party_combat where room_id=target_room;
 if current_revision is null or current_revision is distinct from expected_revision then raise exception 'REVISION_CONFLICT';end if;
 delete from public.party_combat where room_id=target_room;
 insert into public.party_combat_updates(room_id,revision) values(target_room,current_revision+1)
 on conflict(room_id) do update set revision=excluded.revision;
end; $$;
revoke all on function public.delete_party_combat(uuid,bigint) from public,anon;
grant execute on function public.delete_party_combat(uuid,bigint) to authenticated;
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
 return jsonb_build_object('revision',battle.revision,'scene',jsonb_build_object('name',battle.scene->'name','active',battle.scene->'active','finished',coalesce(battle.scene->'finished','false'::jsonb),'round',battle.scene->'round','currentId',battle.scene->'currentId','combatants',actors));
end; $$;
commit;
