-- gallery_posts 직접 INSERT 가 RLS 에 막히는 경우를 피하기 위한 등록 RPC (기기 device_id 검증)

create or replace function public.insert_gallery_post_for_device(
  p_post_id uuid,
  p_device_id text,
  p_worship_id uuid,
  p_song_id uuid,
  p_image_url text,
  p_body text,
  p_link_url text,
  p_lyrics_share text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_link text := nullif(btrim(coalesce(p_link_url, '')), '');
  v_lyrics text := nullif(btrim(coalesce(p_lyrics_share, '')), '');
  v_img text := nullif(btrim(coalesce(p_image_url, '')), '');
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

  if v_img is null and v_link is null and v_lyrics is null and v_body is null then
    raise exception '나눔 내용이 비어 있습니다.' using errcode = '22023';
  end if;

  insert into public.gallery_posts (
    id,
    device_id,
    worship_id,
    song_id,
    image_url,
    body,
    link_url,
    lyrics_share
  ) values (
    p_post_id,
    p_device_id,
    p_worship_id,
    p_song_id,
    v_img,
    v_body,
    v_link,
    v_lyrics
  );

  return p_post_id;
end;
$$;

revoke all on function public.insert_gallery_post_for_device(uuid, text, uuid, uuid, text, text, text, text) from public;
grant execute on function public.insert_gallery_post_for_device(uuid, text, uuid, uuid, text, text, text, text) to anon, authenticated;
