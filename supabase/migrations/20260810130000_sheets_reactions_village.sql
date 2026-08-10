-- D/E: song_sheets + storage, likes emoji reactions, gathering members list RPC

-- ─── song_sheets ───────────────────────────────────────────
create table if not exists public.song_sheets (
  id           uuid primary key default gen_random_uuid(),
  song_id      uuid not null references public.songs(id) on delete cascade,
  gathering_id uuid references public.gatherings(id) on delete cascade,
  uploaded_by  text references public.users(device_id),
  image_url    text not null,
  page_index   int not null default 0,
  created_at   timestamptz default now()
);

create index if not exists song_sheets_song_idx
  on public.song_sheets(song_id, gathering_id, page_index);

alter table public.song_sheets enable row level security;

drop policy if exists song_sheets_select on public.song_sheets;
create policy song_sheets_select on public.song_sheets
  for select using (true);

-- Storage bucket for sheets (public read, like gallery)
insert into storage.buckets (id, name, public)
values ('sheets', 'sheets', true)
on conflict (id) do update set public = excluded.public, name = excluded.name;

drop policy if exists "sheets_select" on storage.objects;
create policy "sheets_select"
  on storage.objects for select
  using (bucket_id = 'sheets');

drop policy if exists "sheets_insert" on storage.objects;
create policy "sheets_insert"
  on storage.objects for insert
  with check (bucket_id = 'sheets');

drop policy if exists "sheets_update" on storage.objects;
create policy "sheets_update"
  on storage.objects for update
  using (bucket_id = 'sheets');

drop policy if exists "sheets_delete" on storage.objects;
create policy "sheets_delete"
  on storage.objects for delete
  using (bucket_id = 'sheets');

create or replace function public.list_song_sheets(
  p_song_id uuid,
  p_gathering_id uuid default null
)
returns table (
  id uuid,
  song_id uuid,
  gathering_id uuid,
  uploaded_by text,
  image_url text,
  page_index int,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.song_id, s.gathering_id, s.uploaded_by, s.image_url, s.page_index, s.created_at
  from public.song_sheets s
  where s.song_id = p_song_id
    and (
      p_gathering_id is null
      or s.gathering_id is null
      or s.gathering_id = p_gathering_id
    )
  order by s.page_index asc, s.created_at asc;
$$;

revoke all on function public.list_song_sheets(uuid, uuid) from public;
grant execute on function public.list_song_sheets(uuid, uuid) to anon, authenticated;

create or replace function public.insert_song_sheet_for_device(
  p_device_id text,
  p_song_id uuid,
  p_gathering_id uuid,
  p_image_url text,
  p_page_index int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_is_member boolean := false;
  v_is_owner boolean := false;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;
  if p_song_id is null or p_image_url is null or btrim(p_image_url) = '' then
    raise exception '곡/이미지 정보가 없습니다' using errcode = '22023';
  end if;

  if p_gathering_id is not null then
    select exists(
      select 1 from public.gathering_members m
      where m.gathering_id = p_gathering_id and m.device_id = p_device_id
    ) into v_is_member;
    select exists(
      select 1 from public.gatherings g
      where g.id = p_gathering_id and g.created_by = p_device_id
    ) into v_is_owner;
    if not v_is_member and not v_is_owner then
      raise exception '모임 권한이 없습니다' using errcode = '42501';
    end if;
  end if;

  insert into public.song_sheets (song_id, gathering_id, uploaded_by, image_url, page_index)
  values (p_song_id, p_gathering_id, p_device_id, p_image_url, coalesce(p_page_index, 0))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_song_sheet_for_device(text, uuid, uuid, text, int) from public;
grant execute on function public.insert_song_sheet_for_device(text, uuid, uuid, text, int) to anon, authenticated;

create or replace function public.delete_song_sheet_for_device(
  p_device_id text,
  p_sheet_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.song_sheets%rowtype;
begin
  select * into v_row from public.song_sheets where id = p_sheet_id;
  if not found then
    return false;
  end if;

  if v_row.uploaded_by is distinct from p_device_id then
    if v_row.gathering_id is null or not exists (
      select 1 from public.gatherings g
      where g.id = v_row.gathering_id and g.created_by = p_device_id
    ) then
      raise exception '삭제 권한이 없습니다' using errcode = '42501';
    end if;
  end if;

  delete from public.song_sheets where id = p_sheet_id;
  return true;
end;
$$;

revoke all on function public.delete_song_sheet_for_device(text, uuid) from public;
grant execute on function public.delete_song_sheet_for_device(text, uuid) to anon, authenticated;

create or replace function public.list_songs_with_sheets(
  p_gathering_id uuid default null
)
returns table (
  song_id uuid,
  title text,
  artist text,
  sheet_count bigint
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.title, s.artist, count(ss.id)::bigint as sheet_count
  from public.songs s
  inner join public.song_sheets ss on ss.song_id = s.id
  where (
    p_gathering_id is null
    or ss.gathering_id is null
    or ss.gathering_id = p_gathering_id
  )
  group by s.id, s.title, s.artist
  order by s.title;
$$;

revoke all on function public.list_songs_with_sheets(uuid) from public;
grant execute on function public.list_songs_with_sheets(uuid) to anon, authenticated;

-- ─── likes emoji reactions ─────────────────────────────────
alter table public.likes
  add column if not exists emoji text not null default 'heart';

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'likes'
      and c.contype = 'u'
  loop
    execute format('alter table public.likes drop constraint %I', r.conname);
  end loop;
end $$;

-- 기존 unique가 다른 이름일 수 있어 재생성 전 중복 정리
delete from public.likes a
using public.likes b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.device_id = b.device_id
  and coalesce(a.emoji, 'heart') = coalesce(b.emoji, 'heart');

create unique index if not exists likes_post_device_emoji_uidx
  on public.likes (post_id, device_id, emoji);

create or replace function public.toggle_reaction(
  p_device_id text,
  p_post_id uuid,
  p_emoji text default 'heart'
)
returns table (active boolean, emoji text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emoji text := coalesce(nullif(btrim(p_emoji), ''), 'heart');
  v_exists boolean;
  v_count bigint;
begin
  if p_device_id is null or btrim(p_device_id) = '' or p_post_id is null then
    raise exception '잘못된 요청입니다' using errcode = '22023';
  end if;

  if v_emoji not in ('heart', 'amen', 'cheer') then
    raise exception '지원하지 않는 반응입니다' using errcode = '22023';
  end if;

  select exists(
    select 1 from public.likes l
    where l.post_id = p_post_id and l.device_id = p_device_id and l.emoji = v_emoji
  ) into v_exists;

  if v_exists then
    delete from public.likes
    where post_id = p_post_id and device_id = p_device_id and emoji = v_emoji;
  else
    insert into public.likes (post_id, device_id, emoji)
    values (p_post_id, p_device_id, v_emoji)
    on conflict (post_id, device_id, emoji) do nothing;
  end if;

  select count(*) into v_count
  from public.likes l
  where l.post_id = p_post_id and l.emoji = v_emoji;

  return query select (not v_exists), v_emoji, v_count;
end;
$$;

revoke all on function public.toggle_reaction(text, uuid, text) from public;
grant execute on function public.toggle_reaction(text, uuid, text) to anon, authenticated;

-- ─── village: gathering members + activity summary ─────────
create or replace function public.list_gathering_members_summary(
  p_device_id text,
  p_gathering_id uuid
)
returns table (
  device_id text,
  name text,
  avatar_url text,
  joined_at timestamptz,
  activity_days int,
  points int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or p_gathering_id is null then
    raise exception '잘못된 요청입니다' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.gathering_members m
    where m.gathering_id = p_gathering_id and m.device_id = p_device_id
  ) and not exists (
    select 1 from public.gatherings g
    where g.id = p_gathering_id and g.created_by = p_device_id
  ) then
    raise exception '모임 권한이 없습니다' using errcode = '42501';
  end if;

  return query
  select
    u.device_id,
    u.name,
    u.avatar_url,
    coalesce(m.joined_at, g.created_at) as joined_at,
    coalesce((
      select count(distinct da.activity_date)::int
      from public.daily_activities da
      where da.device_id = u.device_id
    ), (
      select count(distinct (timezone('Asia/Seoul', t.completed_at))::date)::int
      from public.transcriptions t
      where t.device_id = u.device_id and t.completed_at is not null
    ), 0) as activity_days,
    coalesce((
      select sum(
        case da.type
          when 'transcription' then 15
          when 'bible_reading' then 10
          when 'sunday_worship' then 20
          when 'meditation_prayer' then 10
          else 0
        end
      )::int
      from public.daily_activities da
      where da.device_id = u.device_id
    ), (
      select (count(distinct (timezone('Asia/Seoul', t.completed_at))::date) * 15)::int
      from public.transcriptions t
      where t.device_id = u.device_id and t.completed_at is not null
    ), 0) as points
  from public.gathering_members m
  inner join public.users u on u.device_id = m.device_id
  left join public.gatherings g on g.id = m.gathering_id
  where m.gathering_id = p_gathering_id
  order by points desc, u.name asc;
end;
$$;

revoke all on function public.list_gathering_members_summary(text, uuid) from public;
grant execute on function public.list_gathering_members_summary(text, uuid) to anon, authenticated;
