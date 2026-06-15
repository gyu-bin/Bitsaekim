-- users 직접 upsert 는 RLS 때문에 anon 클라이언트에서 실패함 → security definer RPC 로 등록·이름 갱신
drop function if exists public.register_user_for_device(text, text, text);

create or replace function public.register_user_for_device(
  p_device_id text,
  p_name text,
  p_role text default 'user'
)
returns table (user_device_id text, user_name text, user_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '42501';
  end if;

  v_name := btrim(p_name);
  if v_name = '' then
    raise exception '이름을 입력해 주세요' using errcode = '22023';
  end if;

  v_role := case when lower(btrim(coalesce(p_role, 'user'))) = 'leader' then 'leader' else 'user' end;

  insert into public.users (device_id, name, role)
  values (p_device_id, v_name, v_role)
  on conflict (device_id) do update
    set name = excluded.name,
        role = case
          when public.users.role = 'leader' then public.users.role
          else excluded.role
        end;

  return query
    select u.device_id, u.name, u.role
    from public.users u
    where u.device_id = p_device_id;
end;
$$;

revoke all on function public.register_user_for_device(text, text, text) from public;
grant execute on function public.register_user_for_device(text, text, text) to anon, authenticated;
