-- 마이페이지 인도자 전환: users 직접 UPDATE 는 RLS 때문에 0행만 갱신·error 없음일 수 있음.
-- supabase.rpc('set_user_role', { p_device_id, p_role: 'leader' | 'user' })

create or replace function public.set_user_role(p_device_id text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  if p_role is null or p_role not in ('user', 'leader') then
    raise exception '잘못된 역할입니다' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users u where u.device_id = p_device_id) then
    raise exception '등록된 사용자가 없습니다. 온보딩을 먼저 진행해 주세요.' using errcode = 'P0001';
  end if;

  update public.users
  set role = p_role
  where device_id = p_device_id;
end;
$$;

revoke all on function public.set_user_role(text, text) from public;
grant execute on function public.set_user_role(text, text) to anon, authenticated;
