-- RETURNS TABLE (gathering_id …) 와 INSERT (gathering_id, …) / ON CONFLICT (gathering_id, …) 충돌 제거.

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
