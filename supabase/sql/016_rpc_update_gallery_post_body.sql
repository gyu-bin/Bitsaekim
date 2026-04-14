-- 나눔 글 body 만 본인 기기에서 수정 (RLS 직접 UPDATE 우회)

create or replace function public.update_gallery_post_body_for_device(
  p_post_id uuid,
  p_device_id text,
  p_body text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  if p_post_id is null then
    raise exception '게시글 id가 필요합니다' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users u where u.device_id = p_device_id) then
    raise exception '사용자 정보를 찾을 수 없습니다.' using errcode = '42501';
  end if;

  update public.gallery_posts
  set body = v_body
  where id = p_post_id and device_id = p_device_id;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.update_gallery_post_body_for_device(uuid, text, text) from public;
grant execute on function public.update_gallery_post_body_for_device(uuid, text, text) to anon, authenticated;
