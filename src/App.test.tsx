import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App, type AppServices } from './App'
import type { AuthService, AuthSession, AuthUser } from './auth/authTypes'
import type { CloudSaveResult, CloudWellnessRepository } from './cloud/cloudWellnessRepository'
import { defaultWellnessState, type WellnessState } from './hooks/useWellnessGame'
import type { UserProfile } from './domain/profile'

const LEGACY_KEY = 'wellness-rpg:v1'

const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild' }

function buildState(targetKcal:number): WellnessState {
  return {
    ...defaultWellnessState,
    profile: PROFILE,
    nutritionTarget: { bmrKcal:1200, maintenanceKcal:1650, targetKcal, proteinGrams:120, fatGrams:40, carbGrams:150, warnings:[], evidence:[] },
  }
}

function userFixture(username:string): AuthUser {
  return { id:`user-${username}`, username, role:'user', mustChangePassword:false }
}

function createFakeAuthService(users: Map<string, { password:string; user:AuthUser }> = new Map(), initialSession: AuthSession|null = null): AuthService {
  let session = initialSession
  return {
    currentSession: async () => session,
    onSessionChange: () => () => {},
    login: async (username, password) => {
      const entry = users.get(username)
      if (!entry || entry.password !== password) return { ok:false, code:'invalid-credentials', message:'아이디 또는 비밀번호가 올바르지 않아요.' }
      session = { accessToken:'token', user:entry.user }
      return { ok:true, value:session }
    },
    register: async (username, password) => {
      if (users.has(username)) return { ok:false, code:'duplicate-username', message:'이미 사용 중인 아이디예요.' }
      const user = userFixture(username)
      users.set(username, { password, user })
      session = { accessToken:'token', user }
      return { ok:true, value:session }
    },
    requestRecovery: async () => ({ ok:true, value:undefined }),
    changePassword: async () => {
      if (session) session = { ...session, user:{ ...session.user, mustChangePassword:false } }
      return { ok:true, value:undefined }
    },
    logout: async () => { session = null },
  }
}

function createFakeCloudRepository(seed: Record<string, { state:WellnessState; revision:number }> = {}) {
  const store: Record<string, { state:WellnessState; revision:number }> = { ...seed }
  const load = vi.fn(async (userId:string) => {
    const row = store[userId]
    return row ? { state:row.state, revision:row.revision } : { state:null, revision:0 }
  })
  const save = vi.fn(async (userId:string, state:WellnessState, expectedRevision:number): Promise<CloudSaveResult> => {
    const row = store[userId]
    const currentRevision = row?.revision ?? 0
    if (currentRevision !== expectedRevision) return { ok:false, reason:'conflict' }
    const revision = currentRevision + 1
    store[userId] = { state, revision }
    return { ok:true, revision }
  })
  const repository: CloudWellnessRepository<WellnessState> & { load:typeof load; save:typeof save; store:typeof store } = { load, save, store }
  return repository
}

function fakeServices({ session = null, remoteState, users = new Map() }: { session?:AuthSession|null; remoteState?:WellnessState; users?:Map<string,{password:string;user:AuthUser}> } = {}): AppServices & { cloudRepository: ReturnType<typeof createFakeCloudRepository> } {
  const authService = createFakeAuthService(users, session)
  const seed: Record<string, { state:WellnessState; revision:number }> = {}
  if (session && remoteState) seed[session.user.id] = { state:remoteState, revision:1 }
  const cloudRepository = createFakeCloudRepository(seed)
  return { authService, cloudRepository }
}

const wait = (ms:number) => new Promise(resolve => setTimeout(resolve, ms))

describe('App', () => {
  beforeEach(() => { localStorage.clear() })

  it('shows the login screen to an anonymous visitor', async () => {
    render(<App services={fakeServices({ session:null })}/>)
    expect(await screen.findByRole('heading', { name:'로그인' })).toBeInTheDocument()
  })

  it('loads only the authenticated user own remote state, isolated from another user', async () => {
    const userA: AuthSession = { accessToken:'a', user:userFixture('runner_a') }
    const userB: AuthSession = { accessToken:'b', user:userFixture('runner_b') }

    const first = render(<App services={fakeServices({ session:userA, remoteState:buildState(1800) })}/>)
    await screen.findByRole('heading', { name:'오늘' })
    expect(screen.getByText(/목표 1800 kcal/)).toBeInTheDocument()
    expect(screen.queryByText(/목표 2200 kcal/)).not.toBeInTheDocument()
    first.unmount()

    render(<App services={fakeServices({ session:userB, remoteState:buildState(2200) })}/>)
    await screen.findByRole('heading', { name:'오늘' })
    expect(screen.getByText(/목표 2200 kcal/)).toBeInTheDocument()
    expect(screen.queryByText(/목표 1800 kcal/)).not.toBeInTheDocument()
  })

  it('imports legacy local data exactly once on first registration and removes the legacy key', async () => {
    const legacy = buildState(1717)
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))
    const services = fakeServices({ session:null })
    const user = userEvent.setup()
    render(<App services={services}/>)

    await user.click(await screen.findByRole('button', { name:'회원가입' }))
    await user.type(screen.getByLabelText('아이디'), 'new_runner')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1')
    await user.click(screen.getByRole('button', { name:'가입하기' }))

    expect(await screen.findByText(/목표 1717 kcal/)).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem(LEGACY_KEY)).toBeNull())
    const newUserId = `user-new_runner`
    expect(services.cloudRepository.store[newUserId]?.state).toMatchObject({ nutritionTarget:{ targetKcal:1717 } })
  })

  it('never imports legacy local data when logging into an existing account', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(buildState(1717)))
    const users = new Map([['runner_02', { password:'password1', user:userFixture('runner_02') }]])
    const services = fakeServices({ session:null, users })
    const user = userEvent.setup()
    render(<App services={services}/>)

    await screen.findByRole('heading', { name:'로그인' })
    await user.type(screen.getByLabelText('아이디'), 'runner_02')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.click(screen.getByRole('button', { name:'로그인' }))

    expect(await screen.findByRole('heading', { name:'나의 하루' })).toBeInTheDocument()
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull()
    expect(services.cloudRepository.save).not.toHaveBeenCalled()
  })

  it('clears private UI state on logout and returns to the login screen', async () => {
    const session: AuthSession = { accessToken:'a', user:userFixture('runner_03') }
    const services = fakeServices({ session, remoteState:buildState(1900) })
    const user = userEvent.setup()
    render(<App services={services}/>)

    await screen.findByRole('heading', { name:'오늘' })
    expect(screen.getByText(/목표 1900 kcal/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name:'프로필' }))
    await user.click(screen.getByRole('menuitem', { name:'로그아웃' }))

    expect(await screen.findByRole('heading', { name:'로그인' })).toBeInTheDocument()
    expect(screen.queryByText(/목표 1900 kcal/)).not.toBeInTheDocument()
  })

  it('shows waiting while offline and retries the save once back online', async () => {
    const session: AuthSession = { accessToken:'a', user:userFixture('runner_04') }
    const services = fakeServices({ session, remoteState:buildState(1650) })
    const user = userEvent.setup()
    render(<App services={services}/>)
    await screen.findByRole('heading', { name:'오늘' })

    services.cloudRepository.save.mockResolvedValueOnce({ ok:false, reason:'error' })
    Object.defineProperty(window.navigator, 'onLine', { value:false, configurable:true })

    await user.click(screen.getAllByRole('button', { name:'기록' })[0])
    await user.type(screen.getByRole('spinbutton', { name:'오늘 체중' }), '68.4')
    await user.click(screen.getByRole('button', { name:'체중 저장' }))

    await screen.findByText('동기화 대기 중')

    Object.defineProperty(window.navigator, 'onLine', { value:true, configurable:true })
    await act(async () => { window.dispatchEvent(new Event('online')) })

    await screen.findByText('저장됨')
    expect(services.cloudRepository.save).toHaveBeenCalledTimes(2)
  })

  it('blocks a silent overwrite on conflict and reloads the latest remote state on demand', async () => {
    const session: AuthSession = { accessToken:'a', user:userFixture('runner_05') }
    const services = fakeServices({ session, remoteState:buildState(1650) })
    const user = userEvent.setup()
    render(<App services={services}/>)
    await screen.findByRole('heading', { name:'오늘' })

    // Simulate another device having already written a newer revision.
    services.cloudRepository.store[session.user.id] = { state:buildState(1999), revision:2 }

    await user.click(screen.getAllByRole('button', { name:'기록' })[0])
    await user.type(screen.getByRole('spinbutton', { name:'오늘 체중' }), '70.1')
    await user.click(screen.getByRole('button', { name:'체중 저장' }))

    await screen.findByRole('button', { name:'새로고침' })
    await wait(50)
    expect(services.cloudRepository.store[session.user.id]?.revision).toBe(2)

    await user.click(screen.getByRole('button', { name:'새로고침' }))
    expect(await screen.findByText(/목표 1999 kcal/)).toBeInTheDocument()
  })
})
