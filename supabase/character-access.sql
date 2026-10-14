-- Room members share only an allowlisted summary; the current master can view the selected full sheet.
begin;
create or replace function public.party_character_sheets(target_room uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_party_member(target_room) then raise exception 'NOT_ALLOWED'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name,
 'selected_character_id',m.character_id,'characters',coalesce((select jsonb_agg(jsonb_build_object(
  'id',c->'id','name',c->'name','level',c->'level','className',c->'className','subclassName',c->'subclassName',
  'hp',c->'hp','hpMax',c->'hpMax','tempHp',c->'tempHp','ac',c->'ac','initiative',c->'initiative','prof',c->'prof','speed',c->'speed','passive',c->'passive','passiveInsight',c->'passiveInsight','maneuverDC',c->'maneuverDC','maneuverAbility',c->'maneuverAbility',
  'spellDC',c->'spellDC','spellAttack',c->'spellAttack','castingAbility',c->'castingAbility','updatedAt',c->'updatedAt','conditions',c->'conditions',
  'skills',(select coalesce(jsonb_agg(jsonb_build_object('key',a->'key','label',a->'label','ability',a->'ability','bonus',a->'bonus','proficient',a->'proficient','expertise',a->'expertise')),'[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(c->'skills')='array' then c->'skills' else '[]'::jsonb end) a),
  'abilities',(select coalesce(jsonb_agg(jsonb_build_object('key',a->'key','label',a->'label','score',a->'score','modifier',a->'modifier','save',a->'save')),'[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(c->'abilities')='array' then c->'abilities' else '[]'::jsonb end) a)
 )) from jsonb_array_elements(case when jsonb_typeof(b.data->'masterSummaries')='array' then b.data->'masterSummaries' else '[]'::jsonb end) c where c->>'id'=m.character_id),'[]'::jsonb),
 'waiting_for_summary',m.character_id is not null and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(b.data->'masterSummaries')='array' then b.data->'masterSummaries' else '[]'::jsonb end) c where c->>'id'=m.character_id))),'[]'::jsonb)
 from public.party_members m left join public.player_books b on b.user_id=m.user_id where m.room_id=target_room);
end; $$;
revoke all on function public.party_character_sheets(uuid) from public,anon;
grant execute on function public.party_character_sheets(uuid) to authenticated;

create or replace function public.party_character_sheet(target_room uuid,target_player uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_party_member(target_room) or not exists(select 1 from public.party_rooms where id=target_room and master_id=auth.uid() and deleted_at is null) then raise exception 'MASTER_REQUIRED'; end if;
 select jsonb_build_object('character',c,'dataset',b.data->'dataset','revision',b.revision,'updatedAt',b.updated_at)
 into result
 from public.party_members m join public.player_books b on b.user_id=m.user_id
 cross join lateral jsonb_array_elements(case when jsonb_typeof(b.data->'characters')='array' then b.data->'characters' else '[]'::jsonb end) c
 where m.room_id=target_room and m.user_id=target_player and m.character_id is not null and c->>'id'=m.character_id
 limit 1;
 if result is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
 return result;
end; $$;
revoke all on function public.party_character_sheet(uuid,uuid) from public,anon;
grant execute on function public.party_character_sheet(uuid,uuid) to authenticated;
commit;
