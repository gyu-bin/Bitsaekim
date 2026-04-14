-- 나눔: 링크(찬양 영상 등), 가사/인용 공유. 필사 이미지 없이도 글만 올릴 수 있게.

alter table public.gallery_posts
  alter column image_url drop not null;

alter table public.gallery_posts
  add column if not exists link_url text,
  add column if not exists lyrics_share text;
