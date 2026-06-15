-- 나눔 글 본문·링크·가사 수정 (본인 기기만)

create or replace function public.update_gallery_post_for_device(
  p_post_id uuid,
  p_device_id text,
  p_body text default null,
  p_link_url text default null,
  p_lyrics_share text default null
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

  update public.gallery_posts
  set
    body = nullif(btrim(coalesce(p_body, '')), ''),
    link_url = nullif(btrim(coalesce(p_link_url, '')), ''),
    lyrics_share = nullif(btrim(coalesce(p_lyrics_share, '')), '')
  where id = p_post_id and device_id = p_device_id;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.update_gallery_post_for_device(uuid, text, text, text, text) from public;
grant execute on function public.update_gallery_post_for_device(uuid, text, text, text, text) to anon, authenticated;
