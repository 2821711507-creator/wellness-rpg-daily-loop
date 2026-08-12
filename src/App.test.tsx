import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App, type AppServices } from './App'
import type { AuthService, AuthSession, AuthUser } from './auth/authTypes'
import type { CloudSaveResult, CloudWellnessRepository } from './cloud/cloudWellnessRepository'
import { defaultWellnessState, type WellnessState } from './hooks/useWellnessGame'
import type { UserProfile } from './domain/profile'
import type { FeedbackService } from './feedback/feedbackService'

const LEGACY_KEY = 'wellness-rpg:v1'

const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild' }

function buildState(targetKcal:number): WellnessState {
  return {
    ...defaultWellnessState,
    profile: PROFILE,
    nutritionTarget: { bmrKcal:1200, maintenanceKcal:1650, targetKcal, proteinGrams:120, fatGrams:40, carbGrams:150, warnings:[], evidence:[] },
  }
}

function userFixture(username:string, role:'user'|'admin' = 'user'): AuthUser {
  return { id:`user-${username}`, username, role, mustChangePassword:false }
}

function createFakeFeedbackService(store: Array<{ id:string; username:string; message:string; createdAt:string }> = []): FeedbackService {
  return {
    submit: async (userId, message) => {
      store.push({ id:`fb-${store.length + 1}`, username:userId.replace(/^user-/, ''), message, createdAt:'2026-08-12T00:00:00.000Z' })
      return { ok:true, value:undefined }
    },
    listAll: async () => ({ ok:true, value:[...store] }),
  }
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

function fakeServices({ session = null, remoteState, users = new Map(), feedbackStore = [] }: { session?:AuthSession|null; remoteState?:WellnessState; users?:Map<string,{password:string;user:AuthUser}>; feedbackStore?:Array<{ id:string; username:string; message:string; createdAt:string }> } = {}): AppServices & { cloudRepository: ReturnType<typeof createFakeCloudRepository> } {
  const authService = createFakeAuthService(users, session)
  const seed: Record<string, { state:WellnessState; revision:number }> = {}
  if (session && remoteState) seed[session.user.id] = { state:remoteState, revision:1 }
  const cloudRepository = createFakeCloudRepository(seed)
  const feedbackService = createFakeFeedbackService(feedbackStore)
  return { authService, cloudRepository, feedbackService }
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

  it('completes the full register -> edit -> logout -> login journey and sees the edit persisted, with no spurious conflict from logging back in', async () => {
    const services = fakeServices({ session:null })
    const user = userEvent.setup()
    render(<App services={services}/>)

    await user.click(await screen.findByRole('button', { name:'회원가입' }))
    await user.type(screen.getByLabelText('아이디'), 'journey_user')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1')
    await user.click(screen.getByRole('button', { name:'가입하기' }))

    // Onboarding's defaults are already valid -- submit as-is to reach the main app.
    await user.click(await screen.findByRole('button', { name:'시작하기' }))
    await screen.findByRole('heading', { name:'오늘' })

    // A real, user-driven edit: record today's weight.
    await user.click(screen.getAllByRole('button', { name:'기록' })[0])
    await user.type(screen.getByRole('spinbutton', { name:'오늘 체중' }), '68.5')
    await user.click(screen.getByRole('button', { name:'체중 저장' }))
    expect((await screen.findAllByText('오늘 체중을 저장했어요.')).length).toBeGreaterThan(0)

    const userId = 'user-journey_user'
    await waitFor(() => expect(services.cloudRepository.store[userId]?.state.weightEntries).toEqual([
      expect.objectContaining({ weightKg:68.5 }),
    ]))
    // No spurious conflict from registering + onboarding + saving in this same session.
    expect(screen.queryByRole('button', { name:'새로고침' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name:'오늘' }))
    await screen.findByRole('heading', { name:'오늘' })
    await user.click(screen.getByRole('button', { name:'프로필' }))
    await user.click(screen.getByRole('menuitem', { name:'로그아웃' }))
    await screen.findByRole('heading', { name:'로그인' })

    await user.type(screen.getByLabelText('아이디'), 'journey_user')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.click(screen.getByRole('button', { name:'로그인' }))

    await screen.findByRole('heading', { name:'오늘' })
    await user.click(screen.getAllByRole('button', { name:'기록' })[0])

    expect(await screen.findByRole('spinbutton', { name:'오늘 체중' })).toHaveValue(68.5)
    // Fix 4 regression check: re-hydrating the just-saved state on this second login must
    // not itself fire an unconditional save that could collide with anything.
    expect(screen.queryByRole('button', { name:'새로고침' })).not.toBeInTheDocument()
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

  it('lets a logged-in user open 더보기 from 오늘 and submit feedback', async () => {
    const session: AuthSession = { accessToken:'a', user:userFixture('runner_06') }
    const feedbackStore: Array<{ id:string; username:string; message:string; createdAt:string }> = []
    const services = fakeServices({ session, remoteState:buildState(1650), feedbackStore })
    const user = userEvent.setup()
    render(<App services={services}/>)
    await screen.findByRole('heading', { name:'오늘' })

    await user.click(screen.getByRole('button', { name:'더보기' }))
    expect(await screen.findByRole('heading', { name:'더보기' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('의견 보내기'), '운동 종류를 늘려주세요')
    await user.click(screen.getByRole('button', { name:'보내기' }))

    expect(await screen.findByText('의견을 보냈어요. 고마워요!')).toBeInTheDocument()
    expect(feedbackStore).toEqual([expect.objectContaining({ username:'runner_06', message:'운동 종류를 늘려주세요' })])

    await user.click(screen.getByRole('button', { name:'돌아가기' }))
    expect(await screen.findByRole('heading', { name:'오늘' })).toBeInTheDocument()
  })

  it('lets an administrator open the feedback screen and see submitted feedback', async () => {
    const session: AuthSession = { accessToken:'a', user:userFixture('wellness_admin', 'admin') }
    const feedbackStore = [{ id:'fb-1', username:'runner_07', message:'캐릭터 옷이 예뻐요', createdAt:'2026-08-12T00:00:00.000Z' }]
    const services = fakeServices({ session, remoteState:buildState(1650), feedbackStore })
    const user = userEvent.setup()
    render(<App services={services}/>)
    await screen.findByRole('heading', { name:'오늘' })

    await user.click(screen.getByRole('button', { name:'관리자: 피드백 보기' }))

    expect(await screen.findByText('캐릭터 옷이 예뻐요')).toBeInTheDocument()
    expect(screen.getByText('runner_07')).toBeInTheDocument()
  })
})
