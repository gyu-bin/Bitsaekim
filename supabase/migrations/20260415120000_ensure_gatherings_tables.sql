-- 일부 프로젝트에 009가 적용되지 않아 `gatherings` 없음 오류 방지 (멱등).

create table if not exists public.gatherings (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  created_by   text not null references public.users (device_id),
  created_at   timestamptz default now()
);

create table if not exists public.gathering_members (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  device_id    text not null references public.users (device_id) on delete cascade,
  joined_at    timestamptz default now(),
  primary key (gathering_id, device_id)
);

create index if not exists gathering_members_device_id_idx on public.gathering_members (device_id);

alter table public.worship_services
  add column if not exists gathering_id uuid references public.gatherings (id);

create index if not exists worship_services_gathering_id_idx on public.worship_services (gathering_id);
