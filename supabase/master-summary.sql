-- Replaces full sheet access with an explicit allowlist of published game values.
begin;
create or replace function public.party_character_sheets(target_room uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.party_rooms where id=target_room and master_id=auth.uid()) or not public.is_party_member(target_room) then raise exception 'MASTER_REQUIRED'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name,
 'selected_character_id',m.character_id,'characters',coalesce((select jsonb_agg(jsonb_build_object(
  'id',c->'id','name',c->'name','level',c->'level','className',c->'className','subclassName',c->'subclassName',
  'hp',c->'hp','hpMax',c->'hpMax','tempHp',c->'tempHp','ac',c->'ac','initiative',c->'initiative','prof',c->'prof','speed',c->'speed','passive',c->'passive',
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
commit;
