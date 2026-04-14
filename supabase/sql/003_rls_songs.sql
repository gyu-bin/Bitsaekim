-- songs: 공개 SELECT, 직접 INSERT는 시드(created_by null)만 허용.
-- 인도자 저장: 앱에서 supabase.rpc('insert_song_for_leader', { p_title, p_lyrics, p_created_by })
-- MCP migration: songs_seed_insert_and_leader_rpc

alter table public.songs enable row level security;

drop policy if exists "songs_select_public" on public.songs;
create policy "songs_select_public"
  on public.songs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "songs_insert_leader_or_seed" on public.songs;
drop policy if exists "songs_insert_seed_only" on public.songs;
create policy "songs_insert_seed_only"
  on public.songs
  for insert
  to anon, authenticated
  with check (created_by is null);

grant select, insert on table public.songs to anon, authenticated;

drop function if exists public.can_insert_song(text);

create or replace function public.insert_song_for_leader(
  p_title text,
  p_lyrics jsonb,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_title is null or btrim(p_title) = '' then
    raise exception '제목이 필요합니다' using errcode = '22023';
  end if;

  if p_lyrics is null or jsonb_typeof(p_lyrics) <> 'array' or jsonb_array_length(p_lyrics) = 0 then
    raise exception '가사가 필요합니다' using errcode = '22023';
  end if;

  if p_created_by is null or btrim(p_created_by) = '' then
    raise exception '기기 정보가 없습니다. 온보딩을 다시 진행해 주세요.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.device_id = p_created_by
      and u.role = 'leader'
  ) then
    raise exception '서버에 인도자로 등록되어 있지 않습니다. 마이페이지에서 인도자 전환을 다시 해 주세요.' using errcode = '42501';
  end if;

  insert into public.songs (title, lyrics, created_by)
  values (btrim(p_title), p_lyrics, p_created_by)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_song_for_leader(text, jsonb, text) from public;
grant execute on function public.insert_song_for_leader(text, jsonb, text) to anon, authenticated;
