-- 빛새김 스펙 §4 (MCP로 적용한 내용과 동일). 재실행 시 IF NOT EXISTS / DROP IF EXISTS 조정 필요.

create table if not exists public.users (
  device_id text primary key,
  name      text not null,
  role      text not null default 'user' check (role in ('user', 'leader')),
  created_at timestamptz default now()
);

create table if not exists public.songs (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  artist           text,
  lyrics           jsonb not null,
  background_story text,
  bible_verse      text,
  song_key         text,
  bpm              int,
  created_by       text references public.users(device_id),
  created_at       timestamptz default now()
);

create table if not exists public.worship_services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  service_date date not null,
  service_time time,
  description text,
  creator_id  text references public.users(device_id),
  created_at  timestamptz default now()
);

create table if not exists public.setlist_items (
  id          uuid primary key default gen_random_uuid(),
  worship_id  uuid references public.worship_services(id) on delete cascade,
  song_id     uuid references public.songs(id),
  order_index int not null,
  custom_label text,
  leader_note  text,
  is_special   boolean default false,
  created_at  timestamptz default now()
);

create table if not exists public.transcriptions (
  id          uuid primary key default gen_random_uuid(),
  device_id   text references public.users(device_id),
  worship_id  uuid references public.worship_services(id),
  song_id     uuid references public.songs(id),
  mode        text check (mode in ('typing', 'handwriting')),
  completed_at timestamptz default now()
);

create table if not exists public.gallery_posts (
  id          uuid primary key default gen_random_uuid(),
  device_id   text references public.users(device_id),
  worship_id  uuid references public.worship_services(id),
  song_id     uuid references public.songs(id),
  image_url   text not null,
  created_at  timestamptz default now()
);

create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.gallery_posts(id) on delete cascade,
  device_id  text references public.users(device_id),
  created_at timestamptz default now(),
  unique(post_id, device_id)
);

-- Storage: supabase/sql/002_storage_gallery.sql 참고 (MCP migration bitsaekim_storage_gallery)
