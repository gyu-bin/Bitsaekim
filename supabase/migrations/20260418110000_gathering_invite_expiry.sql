-- 초대 코드 만료·비활성화 정책

alter table public.gatherings
  add column if not exists invite_code_expires_at timestamptz,
  add column if not exists invite_code_active boolean not null default true;

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
  where upper(trim(gg.invite_code)) = v_norm
    and coalesce(gg.invite_code_active, true) = true
    and (gg.invite_code_expires_at is null or gg.invite_code_expires_at > now());

  if not found then
    if exists (
      select 1
      from public.gatherings gg2
      where upper(trim(gg2.invite_code)) = v_norm
    ) then
      raise exception '초대 코드가 유효하지 않아요. 모임장에게 새 코드를 요청하세요' using errcode = 'P0003';
    end if;
    raise exception '초대 코드를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.gathering_members
  values (g.id, p_device_id)
  on conflict on constraint gathering_members_pkey do nothing;

  return query select g.id, g.name, g.invite_code, g.created_by;
end;
$$;

create or replace function public.get_gathering_invite_settings_for_leader(
  p_device_id text,
  p_gathering_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
begin
  if p_device_id is null or btrim(p_device_id) = '' or p_gathering_id is null then
    raise exception '요청 정보가 올바르지 않습니다' using errcode = '22023';
  end if;

  select gg.invite_code, gg.invite_code_active, gg.invite_code_expires_at
    into g
  from public.gatherings gg
  where gg.id = p_gathering_id and gg.created_by = p_device_id;

  if not found then
    raise exception '모임장만 초대 코드를 관리할 수 있습니다.' using errcode = '42501';
  end if;

  return json_build_object(
    'invite_code', g.invite_code,
    'invite_code_active', coalesce(g.invite_code_active, true),
    'invite_code_expires_at', g.invite_code_expires_at
  );
end;
$$;

create or replace function public.set_gathering_invite_active_for_leader(
  p_device_id text,
  p_gathering_id uuid,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or btrim(p_device_id) = '' or p_gathering_id is null then
    raise exception '요청 정보가 올바르지 않습니다' using errcode = '22023';
  end if;

  update public.gatherings
    set invite_code_active = coalesce(p_active, true)
  where id = p_gathering_id and created_by = p_device_id;

  if not found then
    raise exception '모임장만 초대 코드를 관리할 수 있습니다.' using errcode = '42501';
  end if;

  return true;
end;
$$;

create or replace function public.regenerate_gathering_invite_code_for_leader(
  p_device_id text,
  p_gathering_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  k int := 0;
begin
  if p_device_id is null or btrim(p_device_id) = '' or p_gathering_id is null then
    raise exception '요청 정보가 올바르지 않습니다' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.gatherings gg
    where gg.id = p_gathering_id and gg.created_by = p_device_id
  ) then
    raise exception '모임장만 초대 코드를 관리할 수 있습니다.' using errcode = '42501';
  end if;

  while k < 12 loop
    k := k + 1;
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    begin
      update public.gatherings
        set invite_code = v_code,
            invite_code_active = true,
            invite_code_expires_at = null
      where id = p_gathering_id and created_by = p_device_id;
      return v_code;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception '초대 코드 생성에 실패했습니다. 다시 시도해 주세요.' using errcode = '23505';
end;
$$;

revoke all on function public.join_gathering_by_code(text, text) from public;
grant execute on function public.join_gathering_by_code(text, text) to anon, authenticated;

revoke all on function public.get_gathering_invite_settings_for_leader(text, uuid) from public;
grant execute on function public.get_gathering_invite_settings_for_leader(text, uuid) to anon, authenticated;

revoke all on function public.set_gathering_invite_active_for_leader(text, uuid, boolean) from public;
grant execute on function public.set_gathering_invite_active_for_leader(text, uuid, boolean) to anon, authenticated;

revoke all on function public.regenerate_gathering_invite_code_for_leader(text, uuid) from public;
grant execute on function public.regenerate_gathering_invite_code_for_leader(text, uuid) to anon, authenticated;
