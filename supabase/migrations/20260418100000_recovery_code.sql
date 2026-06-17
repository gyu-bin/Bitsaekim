-- 기기 이전용 6자리 복구 코드
alter table public.users
  add column if not exists recovery_code text,
  add column if not exists recovery_code_created_at timestamptz;

create unique index if not exists idx_users_recovery_code on public.users (recovery_code)
  where recovery_code is not null;

create or replace function public.generate_recovery_code_for_device(p_device_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_exists boolean;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users u where u.device_id = p_device_id) then
    raise exception '사용자 정보를 찾을 수 없습니다.' using errcode = '42501';
  end if;

  select u.recovery_code into v_code from public.users u where u.device_id = p_device_id;
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    select exists(select 1 from public.users u where u.recovery_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;

  update public.users
    set recovery_code = v_code,
        recovery_code_created_at = now()
  where device_id = p_device_id;

  return v_code;
end;
$$;

create or replace function public.restore_session_by_recovery_code(
  p_recovery_code text,
  p_new_device_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_device_id text;
  v_name text;
  v_role text;
  v_recovery_code text;
begin
  if p_recovery_code is null or btrim(p_recovery_code) = '' then
    return json_build_object('success', false, 'error', '코드를 입력해 주세요');
  end if;

  if p_new_device_id is null or btrim(p_new_device_id) = '' then
    return json_build_object('success', false, 'error', '기기 정보가 없습니다');
  end if;

  select u.device_id, u.name, u.role, u.recovery_code
    into v_old_device_id, v_name, v_role, v_recovery_code
  from public.users u
  where upper(u.recovery_code) = upper(btrim(p_recovery_code));

  if not found then
    return json_build_object('success', false, 'error', '코드를 찾을 수 없어요');
  end if;

  if v_old_device_id = p_new_device_id then
    return json_build_object(
      'success', true,
      'device_id', v_old_device_id,
      'name', v_name,
      'role', v_role,
      'recovery_code', v_recovery_code
    );
  end if;

  delete from public.gathering_members where device_id = p_new_device_id;
  delete from public.users where device_id = p_new_device_id;

  update public.transcriptions set device_id = p_new_device_id where device_id = v_old_device_id;
  update public.gallery_posts set device_id = p_new_device_id where device_id = v_old_device_id;
  update public.likes set device_id = p_new_device_id where device_id = v_old_device_id;
  update public.leader_song_favorites set device_id = p_new_device_id where device_id = v_old_device_id;
  update public.worship_services set creator_id = p_new_device_id where creator_id = v_old_device_id;
  update public.songs set created_by = p_new_device_id where created_by = v_old_device_id;
  update public.gatherings set created_by = p_new_device_id where created_by = v_old_device_id;
  update public.gathering_members set device_id = p_new_device_id where device_id = v_old_device_id;

  update public.users set device_id = p_new_device_id where device_id = v_old_device_id;

  return json_build_object(
    'success', true,
    'device_id', p_new_device_id,
    'name', v_name,
    'role', v_role,
    'recovery_code', v_recovery_code
  );
end;
$$;

revoke all on function public.generate_recovery_code_for_device(text) from public;
grant execute on function public.generate_recovery_code_for_device(text) to anon, authenticated;

revoke all on function public.restore_session_by_recovery_code(text, text) from public;
grant execute on function public.restore_session_by_recovery_code(text, text) to anon, authenticated;
