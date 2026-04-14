-- 나눔 글 본문 (묵상). migrations/20260415160000 와 동일.

alter table public.gallery_posts
  add column if not exists body text;
