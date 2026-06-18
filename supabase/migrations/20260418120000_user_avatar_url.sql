-- 프로필 사진 URL (gallery 스토리지 avatars/{device_id}.jpg)

alter table public.users
  add column if not exists avatar_url text;

create or replace function public.update_user_avatar_for_device(
  p_device_id text,
  p_avatar_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users u where u.device_id = p_device_id) then
    raise exception '등록된 사용자가 없습니다. 온보딩을 먼저 진행해 주세요.' using errcode = 'P0001';
  end if;

  v_url := nullif(btrim(coalesce(p_avatar_url, '')), '');
  if v_url is not null and length(v_url) > 2048 then
    raise exception '프로필 사진 URL이 너무 깁니다.' using errcode = '22023';
  end if;

  update public.users
  set avatar_url = v_url
  where device_id = p_device_id;
end;
$$;

revoke all on function public.update_user_avatar_for_device(text, text) from public;
grant execute on function public.update_user_avatar_for_device(text, text) to anon, authenticated;
