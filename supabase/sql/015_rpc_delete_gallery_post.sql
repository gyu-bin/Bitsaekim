-- 본인 기기(device_id)가 작성한 나눔만 삭제 (RLS 직접 DELETE 우회)

create or replace function public.delete_gallery_post_for_device(
  p_post_id uuid,
  p_device_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
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

  delete from public.gallery_posts gp
  where gp.id = p_post_id and gp.device_id = p_device_id;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.delete_gallery_post_for_device(uuid, text) from public;
grant execute on function public.delete_gallery_post_for_device(uuid, text) to anon, authenticated;
