-- setlist_items RLS 가 current_setting('app.device_id') 에 의존하면 INSERT/UPDATE 가 실패함.
-- insert_setlist_song_for_leader / setlist_reorder_for_leader / setlist_item_note_for_leader
-- MCP migration: setlist_leader_rpc

create or replace function public.insert_setlist_song_for_leader(
  p_worship_id uuid,
  p_song_id uuid,
  p_device_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
  v_id uuid;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.users u where u.device_id = p_device_id and u.role = 'leader'
  ) then
    raise exception '인도자만 편성할 수 있습니다.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.worship_services ws
    where ws.id = p_worship_id and ws.creator_id = p_device_id
  ) then
    raise exception '이 예배를 편성할 권한이 없습니다.' using errcode = '42501';
  end if;

  select coalesce(max(si.order_index), -1) + 1 into v_next
  from public.setlist_items si
  where si.worship_id = p_worship_id;

  insert into public.setlist_items (worship_id, song_id, order_index, is_special)
  values (p_worship_id, p_song_id, v_next, false)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_setlist_song_for_leader(uuid, uuid, text) from public;
grant execute on function public.insert_setlist_song_for_leader(uuid, uuid, text) to anon, authenticated;

create or replace function public.setlist_reorder_for_leader(
  p_worship_id uuid,
  p_device_id text,
  p_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i int;
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.users u where u.device_id = p_device_id and u.role = 'leader'
  ) then
    raise exception '인도자만 편성할 수 있습니다.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.worship_services ws
    where ws.id = p_worship_id and ws.creator_id = p_device_id
  ) then
    raise exception '이 예배를 편성할 권한이 없습니다.' using errcode = '42501';
  end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 then
    return;
  end if;

  for v_i in 1..cardinality(p_item_ids) loop
    if not exists (
      select 1 from public.setlist_items si
      where si.id = p_item_ids[v_i] and si.worship_id = p_worship_id
    ) then
      raise exception '잘못된 콘티 항목입니다.' using errcode = '42501';
    end if;
  end loop;

  for v_i in 1..cardinality(p_item_ids) loop
    update public.setlist_items
    set order_index = v_i - 1
    where id = p_item_ids[v_i] and worship_id = p_worship_id;
  end loop;
end;
$$;

revoke all on function public.setlist_reorder_for_leader(uuid, text, uuid[]) from public;
grant execute on function public.setlist_reorder_for_leader(uuid, text, uuid[]) to anon, authenticated;

create or replace function public.setlist_item_note_for_leader(
  p_item_id uuid,
  p_device_id text,
  p_leader_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.users u where u.device_id = p_device_id and u.role = 'leader'
  ) then
    raise exception '인도자만 편성할 수 있습니다.' using errcode = '42501';
  end if;

  update public.setlist_items si
  set leader_note = p_leader_note
  from public.worship_services ws
  where si.id = p_item_id
    and si.worship_id = ws.id
    and ws.creator_id = p_device_id;

  if not found then
    raise exception '항목을 찾을 수 없거나 권한이 없습니다.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.setlist_item_note_for_leader(uuid, text, text) from public;
grant execute on function public.setlist_item_note_for_leader(uuid, text, text) to anon, authenticated;
