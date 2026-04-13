insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = excluded.public, name = excluded.name;

drop policy if exists "gallery_select" on storage.objects;
create policy "gallery_select"
  on storage.objects for select
  using (bucket_id = 'gallery');

drop policy if exists "gallery_insert" on storage.objects;
create policy "gallery_insert"
  on storage.objects for insert
  with check (bucket_id = 'gallery');
