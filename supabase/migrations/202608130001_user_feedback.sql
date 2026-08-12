-- User feedback: any authenticated user may submit free-text feedback about
-- the app; only an administrator may read it back. Unlike password recovery,
-- submitting feedback needs no elevated privilege beyond the caller's own
-- identity, so this table has no Edge Function in front of it -- the client
-- inserts directly and RLS enforces the boundary (see
-- src/feedback/feedbackService.ts).

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Any authenticated user may insert feedback attributed to themselves. There
-- is no client-facing SELECT policy for ordinary users -- submitting is
-- fire-and-forget, mirroring password_recovery_requests -- only
-- feedback_select_admin (below) can read rows back.
create policy feedback_insert_own
  on public.feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Administrators may read all feedback, via the same public.is_admin()
-- predicate used by profiles_select_admin and recovery_requests_select_admin
-- in 202608120001_multi_user_auth.sql.
create policy feedback_select_admin
  on public.feedback
  for select
  to authenticated
  using (public.is_admin());

grant select, insert on public.feedback to authenticated;
grant select, insert on public.feedback to service_role;
