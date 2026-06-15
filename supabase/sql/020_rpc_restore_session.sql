-- 기기(device_id)로 가입 정보·모임을 복구 (온보딩 「이미 가입한 계정으로 계속」)
create or replace function public.restore_session_for_device(p_device_id text)
returns table (
  gathering_id uuid,
  gathering_name text,
  invite_code text,
  created_by text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    return;
  end if;

  if not exists (select 1 from public.users u where u.device_id = p_device_id) then
    return;
  end if;

  return query
  select g.id, g.name, g.invite_code, g.created_by
  from public.gathering_members m
  inner join public.gatherings g on g.id = m.gathering_id
  where m.device_id = p_device_id
  order by m.joined_at desc nulls last
  limit 1;
end;
$$;

grant execute on function public.restore_session_for_device(text) to anon, authenticated;
