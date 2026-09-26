-- Run once in your Supabase project's SQL Editor.
-- Player books are private: each signed-in player can read only their own row.
begin;
create table if not exists public.player_books (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"characters":[],"journal":""}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint book_is_object check (jsonb_typeof(data) = 'object'),
  constraint book_has_characters check (jsonb_typeof(data->'characters') = 'array'),
  constraint book_size check (octet_length(data::text) <= 10000000)
);
alter table public.player_books enable row level security;
revoke all on public.player_books from anon, authenticated;
grant select on public.player_books to authenticated;
drop policy if exists read_own_book on public.player_books;
create policy read_own_book on public.player_books for select to authenticated
using ((select auth.uid()) = user_id);

-- Updates are atomic and revision checked so a stale device cannot silently
-- overwrite newer notes. This function writes only the caller's own book.
create or replace function public.save_player_book(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result_revision bigint;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload->'characters') is distinct from 'array'
    or jsonb_array_length(payload->'characters') > 100
    or octet_length(payload::text) > 10000000 then
    raise exception 'INVALID_BOOK';
  end if;
  if expected_revision = 0 then
    insert into public.player_books(user_id,data,revision)
    values(caller,payload,1)
    on conflict(user_id) do nothing returning revision into result_revision;
  else
    update public.player_books set data=payload,revision=revision+1,updated_at=now()
    where user_id=caller and revision=expected_revision
    returning revision into result_revision;
  end if;
  if result_revision is null then raise exception 'REVISION_CONFLICT'; end if;
  return result_revision;
end;
$$;
revoke all on function public.save_player_book(jsonb,bigint) from public, anon;
grant execute on function public.save_player_book(jsonb,bigint) to authenticated;
commit;
