-- Manually traced against `supabase/migrations/202608130001_user_feedback.sql`
-- (no Docker available to run `supabase test db` -- see docs/supabase-setup.md);
-- not executed against a real Postgres instance.

begin;

select plan(8);

select has_table('public', 'feedback', 'feedback table exists');

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'runner_one@users.internal'),
  ('22222222-2222-2222-2222-222222222222', 'runner_two@users.internal'),
  ('33333333-3333-3333-3333-333333333333', 'wellness_admin@users.internal');

insert into public.profiles (user_id, username, role) values
  ('11111111-1111-1111-1111-111111111111', 'runner_one', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'runner_two', 'user'),
  ('33333333-3333-3333-3333-333333333333', 'wellness_admin', 'admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.feedback (user_id, message) values
  ('11111111-1111-1111-1111-111111111111', 'runner_one feedback');

select is(
  (select count(*) from public.feedback where user_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'a user can insert their own feedback'
);

-- feedback_insert_own's `with check (user_id = auth.uid())` is the only thing
-- standing between one user and attributing feedback to another user's
-- user_id, exactly like the cross-user wellness_states INSERT check in
-- multi_user_auth_test.sql.
select throws_ok(
  $$ insert into public.feedback (user_id, message) values ('22222222-2222-2222-2222-222222222222', 'forged') $$,
  '42501',
  'a user cannot insert feedback attributed to another user'
);

select is_empty(
  $$ select id from public.feedback $$,
  'an ordinary user has no SELECT access to feedback, even their own row'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select is(
  (select count(*) from public.feedback),
  1::bigint,
  'an administrator can list all feedback'
);
select is(
  (select message from public.feedback where user_id = '11111111-1111-1111-1111-111111111111'),
  'runner_one feedback',
  'an administrator can read the feedback message'
);
select is(
  (select username from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'runner_one',
  'an administrator can resolve the feedback author''s username via profiles_select_admin'
);

select throws_ok(
  $$ insert into public.feedback (user_id, message) values ('33333333-3333-3333-3333-333333333333', '') $$,
  '23514',
  'an empty message is rejected by the length check constraint'
);

select * from finish();
rollback;
