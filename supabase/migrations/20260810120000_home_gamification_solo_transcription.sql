-- 게임화·혼자 필사: daily_activities, user_character, nullable worship 필사, home summary RPC

-- 1) 일일 활동 로그
create table if not exists public.daily_activities (
  id            uuid primary key default gen_random_uuid(),
  device_id     text not null references public.users(device_id) on delete cascade,
  gathering_id  uuid references public.gatherings(id) on delete set null,
  activity_date date not null,
  type          text not null check (type in
                  ('bible_reading','meditation_prayer','sunday_worship','transcription')),
  ref_id        uuid,
  created_at    timestamptz default now(),
  unique(device_id, activity_date, type, ref_id)
);

create index if not exists daily_activities_device_date_idx
  on public.daily_activities(device_id, activity_date);

alter table public.daily_activities enable row level security;

drop policy if exists daily_activities_select_own on public.daily_activities;
create policy daily_activities_select_own on public.daily_activities
  for select using (true);

-- 2) 캐릭터/정원 상태 (추후 커스터마이징)
create table if not exists public.user_character (
  device_id    text primary key references public.users(device_id) on delete cascade,
  mascot       text default 'sprout',
  outfit       text,
  garden_theme text default 'meadow',
  updated_at   timestamptz default now()
);

alter table public.user_character enable row level security;

drop policy if exists user_character_select on public.user_character;
create policy user_character_select on public.user_character
  for select using (true);

-- 3) 필사 RPC: worship_id nullable (혼자 모드) + daily_activities 연동
create or replace function public.record_transcription_for_device(
  p_device_id text,
  p_worship_id uuid,
  p_song_id uuid,
  p_mode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
  v_gathering_id uuid;
  v_activity_date date;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  if p_song_id is null then
    raise exception '곡 정보가 없습니다' using errcode = '22023';
  end if;

  if p_mode not in ('typing', 'handwriting') then
    raise exception '잘못된 필사 모드입니다' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users u where u.device_id = p_device_id
  ) then
    raise exception '사용자 정보를 찾을 수 없습니다.' using errcode = '42501';
  end if;

  insert into public.transcriptions (device_id, worship_id, song_id, mode)
  values (p_device_id, p_worship_id, p_song_id, p_mode)
  returning id into v_tx_id;

  v_activity_date := (timezone('Asia/Seoul', now()))::date;

  if p_worship_id is not null then
    select ws.gathering_id into v_gathering_id
    from public.worship_services ws
    where ws.id = p_worship_id;
  else
    select gm.gathering_id into v_gathering_id
    from public.gathering_members gm
    where gm.device_id = p_device_id
    order by gm.joined_at desc
    limit 1;
  end if;

  insert into public.daily_activities (device_id, gathering_id, activity_date, type, ref_id)
  values (p_device_id, v_gathering_id, v_activity_date, 'transcription', v_tx_id)
  on conflict (device_id, activity_date, type, ref_id) do nothing;

  return true;
end;
$$;

revoke all on function public.record_transcription_for_device(text, uuid, uuid, text) from public;
grant execute on function public.record_transcription_for_device(text, uuid, uuid, text) to anon, authenticated;

-- 4) 홈 요약 RPC
create or replace function public.get_home_summary(
  p_device_id text,
  p_week_start date
)
returns table (
  streak int,
  points int,
  week_done_dates date[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int := 0;
  v_points int := 0;
  v_cursor date;
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_week_end date := p_week_start + 6;
  v_dates date[];
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    return query select 0, 0, array[]::date[];
    return;
  end if;

  select coalesce(array_agg(distinct da.activity_date order by da.activity_date), array[]::date[])
  into v_dates
  from public.daily_activities da
  where da.device_id = p_device_id;

  -- daily_activities가 비어 있으면 transcriptions로 폴백
  if coalesce(array_length(v_dates, 1), 0) = 0 then
    select coalesce(
      array_agg(distinct (timezone('Asia/Seoul', t.completed_at))::date order by (timezone('Asia/Seoul', t.completed_at))::date),
      array[]::date[]
    )
    into v_dates
    from public.transcriptions t
    where t.device_id = p_device_id and t.completed_at is not null;
  end if;

  select coalesce(sum(
    case da.type
      when 'transcription' then 15
      when 'bible_reading' then 10
      when 'sunday_worship' then 20
      when 'meditation_prayer' then 10
      else 0
    end
  ), 0)::int
  into v_points
  from public.daily_activities da
  where da.device_id = p_device_id;

  if v_points = 0 and coalesce(array_length(v_dates, 1), 0) > 0 then
    v_points := coalesce(array_length(v_dates, 1), 0) * 15;
  end if;

  -- streak
  if v_today = any(v_dates) then
    v_cursor := v_today;
  elsif (v_today - 1) = any(v_dates) then
    v_cursor := v_today - 1;
  else
    v_cursor := null;
  end if;

  if v_cursor is not null then
    while v_cursor = any(v_dates) loop
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    end loop;
  end if;

  return query
  select
    v_streak,
    v_points,
    coalesce(
      (select array_agg(d order by d)
       from unnest(v_dates) as d
       where d >= p_week_start and d <= v_week_end),
      array[]::date[]
    );
end;
$$;

revoke all on function public.get_home_summary(text, date) from public;
grant execute on function public.get_home_summary(text, date) to anon, authenticated;
