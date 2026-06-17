-- 같은 예배·곡·기기 필사 횟수 제한 해제 (매 완료마다 새 행 insert)

create or replace function public.record_transcription_for_device(
  p_device_id text,
  p_worship_id uuid,
  p_song_id uuid,
  p_mode text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception '기기 정보가 없습니다' using errcode = '22023';
  end if;

  if p_worship_id is null or p_song_id is null then
    raise exception '예배/곡 정보가 없습니다' using errcode = '22023';
  end if;

  if p_mode not in ('typing', 'handwriting') then
    raise exception '잘못된 필사 모드입니다' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users u where u.device_id = p_device_id
  ) then
    raise exception '사용자 정보를 찾을 수 없습니다.' using errcode = '42501';
  end if;

  insert into public.transcriptions (device_id, worship_id, song_id, mode)
  values (p_device_id, p_worship_id, p_song_id, p_mode);

  return true;
end;
$$;

revoke all on function public.record_transcription_for_device(text, uuid, uuid, text) from public;
grant execute on function public.record_transcription_for_device(text, uuid, uuid, text) to anon, authenticated;
