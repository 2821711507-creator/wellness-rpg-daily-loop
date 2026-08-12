begin;

select plan(14);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'wellness_states', 'wellness states table exists');
select has_table('public', 'password_recovery_requests', 'recovery requests table exists');
select has_function('public', 'save_wellness_state', array['jsonb', 'bigint'], 'revision save function exists');

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'runner_one@users.internal'),
  ('22222222-2222-2222-2222-222222222222', 'runner_two@users.internal'),
  ('33333333-3333-3333-3333-333333333333', 'wellness_admin@users.internal');

insert into public.profiles (user_id, username, role) values
  ('11111111-1111-1111-1111-111111111111', 'runner_one', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'runner_two', 'user'),
  ('33333333-3333-3333-3333-333333333333', 'wellness_admin', 'admin');

insert into public.wellness_states (user_id, state) values
  ('11111111-1111-1111-1111-111111111111', '{"owner":"one"}'),
  ('22222222-2222-2222-2222-222222222222', '{"owner":"two"}');

insert into public.password_recovery_requests (user_id) values
  ('11111111-1111-1111-1111-111111111111');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is((select count(*) from public.wellness_states), 1::bigint, 'user sees only own wellness state');
select is((select state->>'owner' from public.wellness_states), 'one', 'user cannot read another state');
select is((select count(*) from public.password_recovery_requests), 0::bigint, 'ordinary user cannot list recovery requests');

update public.profiles set role = 'admin' where user_id = auth.uid();
select is((select role from public.profiles where user_id = auth.uid()), 'user', 'user cannot promote self');

select is((select username from public.profiles where user_id = auth.uid()), 'runner_one', 'ordinary user can still read own profile row');
select is_empty(
  $$ select username from public.profiles where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'ordinary user cannot read another user''s profile row'
);

select is(
  (select revision from public.save_wellness_state('{"owner":"one","changed":true}'::jsonb, 1)),
  2::bigint,
  'matching revision saves and increments'
);
select is_empty(
  $$ select revision from public.save_wellness_state('{"stale":true}'::jsonb, 1) $$,
  'stale revision returns no row'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select is((select count(*) from public.password_recovery_requests), 1::bigint, 'administrator can list recovery requests');
select is(
  (select username from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'runner_one',
  'administrator can read another user''s profile username'
);

select * from finish();
rollback;
