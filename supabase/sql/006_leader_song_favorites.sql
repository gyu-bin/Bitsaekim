-- 인도자(leader)별 찬양 즐겨찾기
-- MCP migration: leader_song_favorites

create table if not exists public.leader_song_favorites (
  device_id text not null references public.users(device_id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (device_id, song_id)
);

create index if not exists leader_song_favorites_device_idx
  on public.leader_song_favorites (device_id);

alter table public.leader_song_favorites enable row level security;

create or replace function public.leader_favorite_toggle(p_device_id text, p_song_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;
  if p_song_id is null then
    raise exception '곡이 필요합니다' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.users u
    where u.device_id = p_device_id and u.role = 'leader'
  ) then
    raise exception '인도자만 즐겨찾기를 사용할 수 있습니다.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.leader_song_favorites f
    where f.device_id = p_device_id and f.song_id = p_song_id
  ) then
    delete from public.leader_song_favorites
    where device_id = p_device_id and song_id = p_song_id;
    return false;
  else
    insert into public.leader_song_favorites (device_id, song_id)
    values (p_device_id, p_song_id);
    return true;
  end if;
end;
$$;

revoke all on function public.leader_favorite_toggle(text, uuid) from public;
grant execute on function public.leader_favorite_toggle(text, uuid) to anon, authenticated;

create or replace function public.leader_favorites_list_ids(p_device_id text)
returns table (song_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select f.song_id
  from public.leader_song_favorites f
  where f.device_id = p_device_id
    and exists (
      select 1 from public.users u
      where u.device_id = p_device_id and u.role = 'leader'
    );
$$;

revoke all on function public.leader_favorites_list_ids(text) from public;
grant execute on function public.leader_favorites_list_ids(text) to anon, authenticated;
