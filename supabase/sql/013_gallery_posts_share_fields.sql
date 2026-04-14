-- migrations/20260415170000 와 동일 (수동 적용용).

alter table public.gallery_posts
  alter column image_url drop not null;

alter table public.gallery_posts
  add column if not exists link_url text,
  add column if not exists lyrics_share text;
