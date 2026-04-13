-- 클라이언트: supabase.rpc('set_config', { p_key: 'app.device_id', p_value: '<기기ID>' })

create or replace function public.set_config(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_catalog.set_config(p_key, p_value, false);
end;
$$;

revoke all on function public.set_config(text, text) from public;
grant execute on function public.set_config(text, text) to anon;
grant execute on function public.set_config(text, text) to authenticated;
