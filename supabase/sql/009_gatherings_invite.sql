-- 모임(초대 코드) + 예배 소속. RPC만 사용해 RLS/풀 이슈와 동일 패턴.

create table if not exists public.gatherings (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  created_by   text not null references public.users (device_id),
  created_at   timestamptz default now()
);

create table if not exists public.gathering_members (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  device_id    text not null references public.users (device_id) on delete cascade,
  joined_at    timestamptz default now(),
  primary key (gathering_id, device_id)
);

create index if not exists gathering_members_device_id_idx on public.gathering_members (device_id);

alter table public.worship_services
  add column if not exists gathering_id uuid references public.gatherings (id);

create index if not exists worship_services_gathering_id_idx on public.worship_services (gathering_id);

-- ---------------------------------------------------------------------------
-- 인도자만: 모임 생성 + 본인 멤버 등록 + 초대 코드 반환
-- ---------------------------------------------------------------------------
create or replace function public.create_gathering_for_leader(
  p_device_id text,
  p_gathering_name text
)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_gid uuid;
  v_name text;
  k int := 0;
begin
  if p_gathering_name is null or btrim(p_gathering_name) = '' then
    raise exception '모임 이름이 필요합니다' using errcode = '22023';
  end if;
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.users u
    where u.device_id = p_device_id and u.role = 'leader'
  ) then
    raise exception '인도자만 모임을 만들 수 있습니다.' using errcode = '42501';
  end if;

  v_name := btrim(p_gathering_name);

  while k < 12 loop
    k := k + 1;
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    begin
      insert into public.gatherings (name, invite_code, created_by)
      values (v_name, v_code, p_device_id)
      returning public.gatherings.id into v_gid;

      insert into public.gathering_members (gathering_id, device_id)
      values (v_gid, p_device_id)
      on conflict do nothing;

      return query select v_gid, v_name, v_code;
      return;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception '초대 코드 생성에 실패했습니다. 다시 시도해 주세요.' using errcode = '23505';
end;
$$;

revoke all on function public.create_gathering_for_leader(text, text) from public;
grant execute on function public.create_gathering_for_leader(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 초대 코드로 모임 참여 (멤버 등록)
-- ---------------------------------------------------------------------------
create or replace function public.join_gathering_by_code(
  p_device_id text,
  p_invite_code text
)
returns table (gathering_id uuid, gathering_name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text;
  g record;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '42501';
  end if;
  v_norm := upper(regexp_replace(btrim(p_invite_code), '\s+', '', 'g'));
  if v_norm = '' then
    raise exception '초대 코드를 입력해 주세요' using errcode = '22023';
  end if;

  select gg.id, gg.name, gg.invite_code into g
  from public.gatherings gg
  where upper(trim(gg.invite_code)) = v_norm;

  if not found then
    raise exception '초대 코드를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.gathering_members
  values (g.id, p_device_id)
  on conflict on constraint gathering_members_pkey do nothing;

  return query select g.id, g.name, g.invite_code;
end;
$$;

revoke all on function public.join_gathering_by_code(text, text) from public;
grant execute on function public.join_gathering_by_code(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 예배 생성: 모임 소속 필수 + 해당 모임 멤버만
-- ---------------------------------------------------------------------------
create or replace function public.insert_worship_for_leader(
  p_name text,
  p_service_date date,
  p_creator_id text,
  p_gathering_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception '예배 이름이 필요합니다' using errcode = '22023';
  end if;
  if p_service_date is null then
    raise exception '날짜가 필요합니다' using errcode = '22023';
  end if;
  if p_creator_id is null or btrim(p_creator_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '42501';
  end if;
  if p_gathering_id is null then
    raise exception '모임이 필요합니다. 필사 탭에서 모임에 참여했는지 확인해 주세요.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.users u
    where u.device_id = p_creator_id and u.role = 'leader'
  ) then
    raise exception '서버에 인도자로 등록되어 있지 않습니다.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.gathering_members m
    where m.gathering_id = p_gathering_id and m.device_id = p_creator_id
  ) then
    raise exception '이 모임에 속해 있지 않습니다.' using errcode = '42501';
  end if;

  insert into public.worship_services (name, service_date, creator_id, gathering_id)
  values (btrim(p_name), p_service_date, p_creator_id, p_gathering_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_worship_for_leader(text, date, text, uuid) from public;
grant execute on function public.insert_worship_for_leader(text, date, text, uuid) to anon, authenticated;

-- 이전 시그니처 제거(있을 경우)
drop function if exists public.insert_worship_for_leader(text, date, text);
