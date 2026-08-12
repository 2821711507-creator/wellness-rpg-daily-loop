// Unit tests for the auth Edge Functions. Runs on the real Deno runtime with only
// `--allow-env` (no network, no real Supabase project): every handler is called
// directly with an injected in-memory fake standing in for the Supabase Admin
// client, so nothing here ever makes a real network call.
//
//   deno test --allow-env supabase/functions/tests/auth-functions.test.ts

import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1'

import { handleRegisterUsername, type RegisterAdminClient } from '../register-username/index.ts'
import { handleRequestPasswordRecovery, type RecoveryAdminClient } from '../request-password-recovery/index.ts'
import { handleAdminResetPassword, type AdminResetAdminClient } from '../admin-reset-password/index.ts'
import { handleChangePassword, type ChangePasswordAdminClient } from '../change-password/index.ts'

// ---------------------------------------------------------------------------
// Fake Supabase Admin client -- an in-memory stand-in covering every operation
// the four handlers perform. Structurally satisfies all four handlers' minimal
// client interfaces at once, so a single fake can drive every test below.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

class FakeTable {
  rows: Row[] = []
}

function eqChain(rows: Row[], filters: Array<[string, unknown]>) {
  return {
    eq(column: string, value: unknown) {
      return eqChain(rows, [...filters, [column, value]])
    },
    maybeSingle() {
      const match = rows.find(row => filters.every(([column, value]) => row[column] === value)) ?? null
      return Promise.resolve({ data: match, error: null })
    },
  }
}

class FakeAdminClient implements RegisterAdminClient, RecoveryAdminClient, AdminResetAdminClient, ChangePasswordAdminClient {
  private tables = new Map<string, FakeTable>()
  private usersByEmail = new Map<string, { id: string; email: string; password: string }>()
  private usersById = new Map<string, { id: string; email: string; password: string }>()
  private sessions = new Map<string, string>()
  private nextUserId = 1
  private nextRequestId = 1

  /** Set to force the next `profiles` insert to fail, for compensating-transaction tests. */
  failProfileInsert = false

  readonly deletedUserIds: string[] = []
  readonly updateUserByIdCalls: Array<{ userId: string; password: string }> = []

  private table(name: string): FakeTable {
    let table = this.tables.get(name)
    if (!table) {
      table = new FakeTable()
      this.tables.set(name, table)
    }
    return table
  }

  rowsIn(name: string): Row[] {
    return this.table(name).rows
  }

  seedProfile(row: Row): void {
    this.table('profiles').rows.push(row)
  }

  seedRecoveryRequest(row: Row): void {
    this.table('password_recovery_requests').rows.push({ resolved_at: null, resolved_by: null, ...row })
  }

  /** Registers a fake bearer token for `userId` and returns it. */
  issueSession(userId: string): string {
    const token = `token-${userId}`
    this.sessions.set(token, userId)
    return token
  }

  emailExists(email: string): boolean {
    return this.usersByEmail.has(email)
  }

  auth = {
    getUser: (jwt: string) => {
      const userId = this.sessions.get(jwt)
      if (!userId) return Promise.resolve({ data: { user: null }, error: { message: 'invalid token' } })
      return Promise.resolve({ data: { user: { id: userId } }, error: null })
    },
    admin: {
      createUser: ({ email, password }: { email: string; password: string; email_confirm?: boolean }) => {
        if (this.usersByEmail.has(email)) {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'A user with this email address has already been registered', code: 'email_exists' },
          })
        }
        const id = `user-${this.nextUserId++}`
        const user = { id, email, password }
        this.usersByEmail.set(email, user)
        this.usersById.set(id, user)
        return Promise.resolve({ data: { user: { id } }, error: null })
      },
      deleteUser: (userId: string) => {
        this.deletedUserIds.push(userId)
        const user = this.usersById.get(userId)
        if (user) {
          this.usersByEmail.delete(user.email)
          this.usersById.delete(userId)
        }
        return Promise.resolve({ error: null })
      },
      updateUserById: (userId: string, attrs: { password: string }) => {
        this.updateUserByIdCalls.push({ userId, password: attrs.password })
        const user = this.usersById.get(userId)
        if (user) user.password = attrs.password
        return Promise.resolve({ data: { user: { id: userId } }, error: null })
      },
    },
  }

  from(name: string) {
    const table = this.table(name)
    return {
      select: (_columns: string) => eqChain(table.rows, []),
      insert: (row: Row) => {
        if (name === 'profiles' && this.failProfileInsert) {
          return Promise.resolve({ error: { message: 'insert failed', code: 'unknown' } })
        }
        if (name === 'profiles' && table.rows.some(existing => existing.username === row.username)) {
          return Promise.resolve({ error: { message: 'duplicate key value violates unique constraint', code: '23505' } })
        }
        const stored = name === 'password_recovery_requests'
          ? { id: `req-${this.nextRequestId++}`, requested_at: new Date().toISOString(), resolved_at: null, resolved_by: null, ...row }
          : row
        table.rows.push(stored)
        return Promise.resolve({ error: null })
      },
      update: (patch: Row) => ({
        eq: (column: string, value: unknown) => {
          for (const row of table.rows) if (row[column] === value) Object.assign(row, patch)
          return Promise.resolve({ error: null })
        },
      }),
    }
  }
}

// ---------------------------------------------------------------------------
// Small request-building helpers
// ---------------------------------------------------------------------------

async function call(
  handler: (req: Request, deps: { adminClient: FakeAdminClient }) => Promise<Response>,
  adminClient: FakeAdminClient,
  body: unknown,
  token?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const req = new Request('http://localhost/fn', { method: 'POST', headers, body: JSON.stringify(body) })
  const res = await handler(req, { adminClient })
  const json = await res.json()
  return { status: res.status, body: json }
}

// ---------------------------------------------------------------------------
// register-username
// ---------------------------------------------------------------------------

Deno.test('register-username: rejects an invalid username without creating anything', async () => {
  const admin = new FakeAdminClient()
  const result = await call(handleRegisterUsername, admin, { username: 'ab', password: 'longenoughpassword' })
  assertEquals(result.status, 400)
  assertEquals(result.body, { ok: false, code: 'invalid-username', message: result.body.message })
  assertEquals(admin.updateUserByIdCalls.length, 0)
})

Deno.test('register-username: rejects a weak password without creating an Auth user', async () => {
  const admin = new FakeAdminClient()
  const result = await call(handleRegisterUsername, admin, { username: 'runner_one', password: 'short' })
  assertEquals(result.status, 400)
  assertEquals(result.body.ok, false)
  assertEquals(result.body.code, 'weak-password')
  assert(!admin.emailExists('runner_one@users.internal'))
})

Deno.test('register-username: succeeds and creates matching profile row', async () => {
  const admin = new FakeAdminClient()
  const result = await call(handleRegisterUsername, admin, { username: 'runner_one', password: 'longenoughpassword' })
  assertEquals(result.status, 201)
  assertEquals(result.body.ok, true)
  assert(admin.emailExists('runner_one@users.internal'))
  assertEquals(admin.rowsIn('profiles').length, 1)
  assertEquals(admin.rowsIn('profiles')[0].username, 'runner_one')
})

Deno.test('register-username: rejects duplicate normalized usernames (case/whitespace-insensitive)', async () => {
  const admin = new FakeAdminClient()
  const first = await call(handleRegisterUsername, admin, { username: 'Runner_One', password: 'longenoughpassword' })
  assertEquals(first.status, 201)

  const second = await call(handleRegisterUsername, admin, { username: '  runner_one  ', password: 'anotherlongpassword' })
  assertEquals(second.status, 409)
  assertEquals(second.body.ok, false)
  assertEquals(second.body.code, 'duplicate-username')
  // Only the first registration's profile exists.
  assertEquals(admin.rowsIn('profiles').length, 1)
})

Deno.test('register-username: cleans up the Auth user when profile creation fails (compensating transaction)', async () => {
  const admin = new FakeAdminClient()
  admin.failProfileInsert = true

  const result = await call(handleRegisterUsername, admin, { username: 'runner_two', password: 'longenoughpassword' })

  assertEquals(result.status, 500)
  assertEquals(result.body.ok, false)
  assertEquals(admin.deletedUserIds.length, 1)
  // The Auth user was rolled back, so its email is free again.
  assert(!admin.emailExists('runner_two@users.internal'))
  assertEquals(admin.rowsIn('profiles').length, 0)
})

// ---------------------------------------------------------------------------
// request-password-recovery
// ---------------------------------------------------------------------------

Deno.test('request-password-recovery: identical generic response for missing and existing usernames', async () => {
  const admin = new FakeAdminClient()
  admin.seedProfile({ user_id: 'user-1', username: 'runner_one' })

  const missing = await call(handleRequestPasswordRecovery, admin, { username: 'no_such_user' })
  const existing = await call(handleRequestPasswordRecovery, admin, { username: 'runner_one' })

  assertEquals(missing.status, existing.status)
  assertEquals(missing.body, existing.body)
  assertEquals(existing.body, { ok: true, accepted: true })
})

Deno.test('request-password-recovery: repeated requests leave exactly one pending request', async () => {
  const admin = new FakeAdminClient()
  admin.seedProfile({ user_id: 'user-1', username: 'runner_one' })

  await call(handleRequestPasswordRecovery, admin, { username: 'runner_one' })
  await call(handleRequestPasswordRecovery, admin, { username: 'runner_one' })
  await call(handleRequestPasswordRecovery, admin, { username: 'runner_one' })

  const pending = admin.rowsIn('password_recovery_requests').filter(row => row.user_id === 'user-1' && row.status === 'pending')
  assertEquals(pending.length, 1)
})

Deno.test('request-password-recovery: missing username creates no recovery request', async () => {
  const admin = new FakeAdminClient()
  await call(handleRequestPasswordRecovery, admin, { username: 'nobody_here' })
  assertEquals(admin.rowsIn('password_recovery_requests').length, 0)
})

// ---------------------------------------------------------------------------
// admin-reset-password
// ---------------------------------------------------------------------------

function seedAdminAndUser(admin: FakeAdminClient) {
  admin.seedProfile({ user_id: 'admin-1', username: 'wellness_admin', role: 'admin', must_change_password: false })
  admin.seedProfile({ user_id: 'user-1', username: 'runner_one', role: 'user', must_change_password: false })
  admin.seedRecoveryRequest({ id: 'req-1', user_id: 'user-1', status: 'pending', requested_at: new Date().toISOString() })
  return { adminToken: admin.issueSession('admin-1'), userToken: admin.issueSession('user-1') }
}

Deno.test('admin-reset-password: rejects a non-admin caller with 403', async () => {
  const admin = new FakeAdminClient()
  const { userToken } = seedAdminAndUser(admin)

  const result = await call(handleAdminResetPassword, admin, { requestId: 'req-1' }, userToken)

  assertEquals(result.status, 403)
  assertEquals(result.body.ok, false)
  assertEquals(result.body.code, 'forbidden')
  assertEquals(admin.updateUserByIdCalls.length, 0)
})

Deno.test('admin-reset-password: rejects an unauthenticated caller', async () => {
  const admin = new FakeAdminClient()
  seedAdminAndUser(admin)

  const result = await call(handleAdminResetPassword, admin, { requestId: 'req-1' })

  assertEquals(result.status, 401)
  assertEquals(result.body.ok, false)
})

Deno.test('admin-reset-password: admin caller gets a fresh 16-char temporary password and no old password', async () => {
  const admin = new FakeAdminClient()
  const { adminToken } = seedAdminAndUser(admin)

  const result = await call(handleAdminResetPassword, admin, { requestId: 'req-1' }, adminToken)

  assertEquals(result.status, 200)
  assertEquals(result.body.ok, true)
  assertMatch(result.body.temporaryPassword as string, /^[A-Za-z0-9_-]{16}$/)
  assert(!Object.prototype.hasOwnProperty.call(result.body, 'oldPassword'))
  assertEquals(admin.updateUserByIdCalls, [{ userId: 'user-1', password: result.body.temporaryPassword }])
})

Deno.test('admin-reset-password: sets must_change_password=true on the target profile', async () => {
  const admin = new FakeAdminClient()
  const { adminToken } = seedAdminAndUser(admin)

  await call(handleAdminResetPassword, admin, { requestId: 'req-1' }, adminToken)

  const targetProfile = admin.rowsIn('profiles').find(row => row.user_id === 'user-1')
  assertEquals(targetProfile?.must_change_password, true)
})

Deno.test('admin-reset-password: resolves the recovery request with resolver metadata', async () => {
  const admin = new FakeAdminClient()
  const { adminToken } = seedAdminAndUser(admin)

  await call(handleAdminResetPassword, admin, { requestId: 'req-1' }, adminToken)

  const request = admin.rowsIn('password_recovery_requests').find(row => row.id === 'req-1')
  assertEquals(request?.status, 'resolved')
  assertEquals(request?.resolved_by, 'admin-1')
  assert(typeof request?.resolved_at === 'string' && request.resolved_at.length > 0)
})

Deno.test('admin-reset-password: unknown request id is rejected', async () => {
  const admin = new FakeAdminClient()
  const { adminToken } = seedAdminAndUser(admin)

  const result = await call(handleAdminResetPassword, admin, { requestId: 'does-not-exist' }, adminToken)

  assertEquals(result.status, 404)
  assertEquals(result.body.ok, false)
})

// ---------------------------------------------------------------------------
// change-password
// ---------------------------------------------------------------------------

Deno.test('change-password: authenticated caller replaces their own password and clears the forced-change flag', async () => {
  const admin = new FakeAdminClient()
  admin.seedProfile({ user_id: 'user-1', username: 'runner_one', role: 'user', must_change_password: true })
  const token = admin.issueSession('user-1')

  const result = await call(handleChangePassword, admin, { password: 'brandnewpassword' }, token)

  assertEquals(result.status, 200)
  assertEquals(result.body.ok, true)
  assert(!Object.prototype.hasOwnProperty.call(result.body, 'password'))
  assertEquals(admin.updateUserByIdCalls, [{ userId: 'user-1', password: 'brandnewpassword' }])
  const profile = admin.rowsIn('profiles').find(row => row.user_id === 'user-1')
  assertEquals(profile?.must_change_password, false)
})

Deno.test('change-password: never targets a caller-supplied user id', async () => {
  const admin = new FakeAdminClient()
  admin.seedProfile({ user_id: 'user-1', username: 'runner_one', role: 'user', must_change_password: true })
  admin.seedProfile({ user_id: 'user-2', username: 'runner_two', role: 'user', must_change_password: false })
  const token = admin.issueSession('user-1')

  await call(handleChangePassword, admin, { password: 'brandnewpassword', userId: 'user-2' }, token)

  assertEquals(admin.updateUserByIdCalls, [{ userId: 'user-1', password: 'brandnewpassword' }])
  const otherProfile = admin.rowsIn('profiles').find(row => row.user_id === 'user-2')
  assertEquals(otherProfile?.must_change_password, false, 'untouched -- was already false, and must stay false, not flipped')
})

Deno.test('change-password: rejects a password shorter than 8 characters', async () => {
  const admin = new FakeAdminClient()
  admin.seedProfile({ user_id: 'user-1', username: 'runner_one', role: 'user', must_change_password: false })
  const token = admin.issueSession('user-1')

  const result = await call(handleChangePassword, admin, { password: 'short' }, token)

  assertEquals(result.status, 400)
  assertEquals(result.body.code, 'weak-password')
  assertEquals(admin.updateUserByIdCalls.length, 0)
})

Deno.test('change-password: rejects an unauthenticated caller', async () => {
  const admin = new FakeAdminClient()
  const result = await call(handleChangePassword, admin, { password: 'brandnewpassword' })
  assertEquals(result.status, 401)
  assertEquals(result.body.ok, false)
  assertEquals(admin.updateUserByIdCalls.length, 0)
})
