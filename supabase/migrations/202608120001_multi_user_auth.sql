-- Multi-user authentication schema: profiles, wellness state, password recovery.
--
-- Design notes for reviewers:
-- * This project's supabase/config.toml keeps the new "not auto-exposed" default
--   (`auto_expose_new_tables` unset), so every role that must reach these tables or
--   functions through the Data API needs an explicit GRANT below. RLS alone is not
--   sufficient; without a GRANT the role gets a hard "permission denied" error
--   instead of a filtered/empty result.
-- * `public.profiles` intentionally has NO client-facing UPDATE policy. Ordinary
--   users still hold the SQL-level UPDATE privilege (granted below) so that an
--   UPDATE statement they issue does not raise a permission error; because no
--   permissive UPDATE policy exists, Postgres RLS makes every row invisible to
--   the UPDATE and the statement silently affects zero rows. This is what lets a
--   self-promotion attempt (`update profiles set role = 'admin' ...`) fail closed
--   without throwing, which matters because the pgTAP test issues that statement
--   directly (not wrapped in `throws_ok`) and expects the surrounding transaction
--   to stay healthy for the assertions that follow. Role and must_change_password
--   are only ever changed by Edge Functions using the service-role key, which
--   bypasses RLS entirely.
-- * `public.password_recovery_requests` has no client SELECT for ordinary users at
--   all (not even their own row) -- only `public.is_admin()` callers can see rows.
--   Requests are created and resolved by Edge Functions with service credentials.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{4,24}$'),
  role text not null default 'user' check (role in ('user','admin')),
  must_change_password boolean not null default false,
  legacy_migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wellness_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  state jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table public.password_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','resolved','cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create unique index one_pending_recovery_per_user
  on public.password_recovery_requests(user_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.wellness_states enable row level security;
alter table public.password_recovery_requests enable row level security;

-- Admin predicate used inside policies. SECURITY DEFINER so it can read
-- public.profiles reliably regardless of the caller's own row-visibility,
-- and so it cannot recurse into the RLS it is used to evaluate.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- profiles: users may read only their own row. No client UPDATE/INSERT/DELETE
-- policy exists; see design note above.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Administrators may additionally read any profile row. This mirrors
-- recovery_requests_select_admin below and exists so that
-- AdminRecoveryService.listPending() (src/admin/adminRecoveryService.ts) can
-- resolve each pending recovery request's username via a second query against
-- this table -- without this policy an admin's cross-user profiles query is
-- silently filtered to zero rows by RLS (not an error), which would make the
-- recovery queue appear permanently empty. This policy is additive: it does
-- not weaken profiles_select_own, since Postgres RLS OR-combines permissive
-- policies for the same command.
create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;

-- wellness_states: users may read and write only their own row. The
-- save_wellness_state() function below relies on these same policies because
-- it runs SECURITY INVOKER.
create policy wellness_states_select_own
  on public.wellness_states
  for select
  to authenticated
  using (user_id = auth.uid());

create policy wellness_states_insert_own
  on public.wellness_states
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy wellness_states_update_own
  on public.wellness_states
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.wellness_states to authenticated;
grant select, insert, update on public.wellness_states to service_role;

-- password_recovery_requests: only administrators may read rows through the
-- client. Ordinary users -- including the request's own owner -- see none.
create policy recovery_requests_select_admin
  on public.password_recovery_requests
  for select
  to authenticated
  using (public.is_admin());

grant select on public.password_recovery_requests to authenticated;
grant select, insert, update on public.password_recovery_requests to service_role;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
grant execute on function public.set_updated_at() to authenticated, service_role;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger set_wellness_states_updated_at
  before update on public.wellness_states
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Revision-checked wellness state save
-- ---------------------------------------------------------------------------

-- Inserts the caller's first wellness state when expected_revision = 0 and no
-- row exists yet; otherwise updates the caller's row only if its current
-- revision equals expected_revision, incrementing revision by one. When
-- neither branch matches an eligible row, zero rows are returned so the
-- client can treat the call as a conflict.
create or replace function public.save_wellness_state(
  next_state jsonb,
  expected_revision bigint
)
returns table (revision bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_revision bigint;
begin
  -- The table alias `ws` disambiguates the `revision` column from the
  -- function's own `revision` OUT parameter (implicitly declared by
  -- `returns table (revision bigint)`); without it Postgres reports
  -- "column reference revision is ambiguous".
  if expected_revision = 0 then
    insert into public.wellness_states as ws (user_id, state, revision)
    values (auth.uid(), next_state, 1)
    on conflict (user_id) do nothing
    returning ws.revision into v_revision;

    if v_revision is not null then
      return query select v_revision;
      return;
    end if;
  end if;

  update public.wellness_states as ws
  set state = next_state,
      revision = ws.revision + 1
  where ws.user_id = auth.uid()
    and ws.revision = expected_revision
  returning ws.revision into v_revision;

  if v_revision is not null then
    return query select v_revision;
  end if;

  return;
end;
$$;

revoke all on function public.save_wellness_state(jsonb, bigint) from public;
grant execute on function public.save_wellness_state(jsonb, bigint) to authenticated;
