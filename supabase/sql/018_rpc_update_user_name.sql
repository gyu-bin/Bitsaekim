-- 마이페이지 등: 본인 표시 이름 변경 (RLS 직접 UPDATE 우회)

create or replace function public.update_user_name_for_device(
  p_device_id text,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null or length(v_name) < 1 then
    raise exception '이름을 입력해 주세요.' using errcode = '22023';
  end if;

  if length(v_name) > 80 then
    raise exception '이름은 80자 이하로 입력해 주세요.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users u where u.device_id = p_device_id) then
    raise exception '등록된 사용자가 없습니다. 온보딩을 먼저 진행해 주세요.' using errcode = 'P0001';
  end if;

  update public.users
  set name = v_name
  where device_id = p_device_id;
end;
$$;

revoke all on function public.update_user_name_for_device(text, text) from public;
grant execute on function public.update_user_name_for_device(text, text) to anon, authenticated;
