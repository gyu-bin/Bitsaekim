-- PL/pgSQL: RETURNS TABLE (id …) 때문에 INSERT … RETURNING id 가 모호해짐 → 테이블 한정.

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
