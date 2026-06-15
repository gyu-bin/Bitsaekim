-- gatherings / gathering_members: 앱은 SECURITY DEFINER RPC만 사용.
-- RLS 활성화 + anon/authenticated 직접 테이블 접근 제거 (Supabase Advisor 경고 해소).

alter table public.gatherings enable row level security;
alter table public.gathering_members enable row level security;

revoke all on table public.gatherings from anon, authenticated;
revoke all on table public.gathering_members from anon, authenticated;
