-- 모임장( gatherings.created_by )만 예배 생성·수정. 참여 RPC에 created_by 반환 + 멤버용 조회.

-- ---------------------------------------------------------------------------
-- 모임 생성: 반환에 모임장 device_id 포함
-- ---------------------------------------------------------------------------
create or replace function public.create_gathering_for_leader(
  p_device_id text,
  p_gathering_name text
)
returns table (id uuid, name text, invite_code text, created_by text)
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

      return query select v_gid, v_name, v_code, p_device_id;
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
-- 초대 코드 참여: 반환에 모임장 device_id 포함
-- ---------------------------------------------------------------------------
create or replace function public.join_gathering_by_code(
  p_device_id text,
  p_invite_code text
)
returns table (gathering_id uuid, gathering_name text, invite_code text, created_by text)
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

  select gg.id, gg.name, gg.invite_code, gg.created_by into g
  from public.gatherings gg
  where upper(trim(gg.invite_code)) = v_norm;

  if not found then
    raise exception '초대 코드를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.gathering_members
  values (g.id, p_device_id)
  on conflict on constraint gathering_members_pkey do nothing;

  return query select g.id, g.name, g.invite_code, g.created_by;
end;
$$;

revoke all on function public.join_gathering_by_code(text, text) from public;
grant execute on function public.join_gathering_by_code(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 멤버가 속한 모임의 모임장 device_id 조회 (클라이언트 동기화용)
-- ---------------------------------------------------------------------------
create or replace function public.get_gathering_owner_for_member(
  p_device_id text,
  p_gathering_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner text;
begin
  if p_device_id is null or btrim(p_device_id) = '' or p_gathering_id is null then
    return null;
  end if;

  select g.created_by into v_owner
  from public.gatherings g
  inner join public.gathering_members m
    on m.gathering_id = g.id and m.device_id = p_device_id
  where g.id = p_gathering_id;

  return v_owner;
end;
$$;

revoke all on function public.get_gathering_owner_for_member(text, uuid) from public;
grant execute on function public.get_gathering_owner_for_member(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 예배 생성: 해당 모임의 모임장만
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
    select 1 from public.gatherings g
    where g.id = p_gathering_id
      and g.created_by = p_creator_id
  ) then
    raise exception '모임장만 이 모임에 예배를 만들 수 있습니다.' using errcode = '42501';
  end if;

  insert into public.worship_services (name, service_date, creator_id, gathering_id)
  values (btrim(p_name), p_service_date, p_creator_id, p_gathering_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_worship_for_leader(text, date, text, uuid) from public;
grant execute on function public.insert_worship_for_leader(text, date, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 예배 수정: 모임 소속이면 모임장만, gathering_id 없으면 기존처럼 creator만
-- ---------------------------------------------------------------------------
create or replace function public.update_worship_for_leader(
  p_worship_id uuid,
  p_name text,
  p_service_date date,
  p_creator_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  if not exists (
    select 1 from public.users u
    where u.device_id = p_creator_id and u.role = 'leader'
  ) then
    raise exception '서버에 인도자로 등록되어 있지 않습니다.' using errcode = '42501';
  end if;

  update public.worship_services w
  set name = btrim(p_name),
      service_date = p_service_date
  where w.id = p_worship_id
    and (
      exists (
        select 1 from public.gatherings g
        where g.id = w.gathering_id and g.created_by = p_creator_id
      )
      or (
        w.gathering_id is null
        and w.creator_id = p_creator_id
      )
    );

  if not found then
    raise exception '예배를 찾을 수 없거나 수정 권한이 없습니다.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_worship_for_leader(uuid, text, date, text) from public;
grant execute on function public.update_worship_for_leader(uuid, text, date, text) to anon, authenticated;
