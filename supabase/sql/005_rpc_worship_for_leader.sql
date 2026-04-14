-- 예배 생성·수정: RLS 가 current_setting('app.device_id') 에 의존하면 풀링에서 실패할 수 있음.
-- insert_worship_for_leader / update_worship_for_leader RPC 로 이름·날짜·creator_id 만 처리.
-- MCP migration: worship_leader_insert_update_rpc
--
-- ※ 모임(gathering) 도입 후에는 009_gatherings_invite.sql 을 적용해
--   insert_worship_for_leader(text, date, text, uuid) 시그니처로 교체됩니다.

create or replace function public.insert_worship_for_leader(
  p_name text,
  p_service_date date,
  p_creator_id text
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
  if not exists (
    select 1 from public.users u
    where u.device_id = p_creator_id and u.role = 'leader'
  ) then
    raise exception '서버에 인도자로 등록되어 있지 않습니다.' using errcode = '42501';
  end if;

  insert into public.worship_services (name, service_date, creator_id)
  values (btrim(p_name), p_service_date, p_creator_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_worship_for_leader(text, date, text) from public;
grant execute on function public.insert_worship_for_leader(text, date, text) to anon, authenticated;

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
    and w.creator_id = p_creator_id;

  if not found then
    raise exception '예배를 찾을 수 없거나 수정 권한이 없습니다.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_worship_for_leader(uuid, text, date, text) from public;
grant execute on function public.update_worship_for_leader(uuid, text, date, text) to anon, authenticated;
