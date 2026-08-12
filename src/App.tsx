import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronRight, ScrollText, Sparkles } from 'lucide-react'
import { AvatarCustomizer } from './components/AvatarCustomizer'
import { Onboarding } from './components/Onboarding'
import { RecordsScreen } from './components/RecordsScreen'
import { SyncStatus } from './components/SyncStatus'
import { TodayScreen, type TodayAccount } from './components/TodayScreen'
import { WeeklyPlanScreen } from './components/WeeklyPlanScreen'
import { toLocalDateKey } from './domain/weeklyPlan'
import { useWellnessGame, type WellnessState } from './hooks/useWellnessGame'
import { useAuth, type UseAuthResult } from './hooks/useAuth'
import { useCloudWellness, type SyncState } from './hooks/useCloudWellness'
import { AuthScreen } from './components/AuthScreen'
import { ForcePasswordChangeScreen } from './components/ForcePasswordChangeScreen'
import { AdminRecoveryScreen } from './components/AdminRecoveryScreen'
import { AdminFeedbackScreen } from './components/AdminFeedbackScreen'
import { MoreScreen } from './components/MoreScreen'
import type { AuthResult, AuthService } from './auth/authTypes'
import { createSupabaseAuthService, type SupabaseAuthClient } from './auth/supabaseAuthService'
import { createCloudWellnessRepository, type CloudWellnessClient, type CloudWellnessRepository } from './cloud/cloudWellnessRepository'
import { createAdminRecoveryService, type AdminRecoveryClient, type AdminRecoveryService } from './admin/adminRecoveryService'
import { createFeedbackService, type FeedbackClient, type FeedbackService } from './feedback/feedbackService'

type View = 'today'|'plan'|'records'|'avatar'|'more'

/** The services `App` needs. Real Supabase-backed implementations are only built lazily (see `createDefaultServices`) so importing this module never reads `VITE_SUPABASE_*` env vars -- tests always inject fakes instead.
 * `adminRecoveryService` is optional: every pre-Task-8 caller (and every existing test's `fakeServices()`) omits it, and the admin route is simply unreachable without it -- see `AuthGate`. */
export interface AppServices {
  authService: AuthService
  cloudRepository: CloudWellnessRepository<WellnessState>
  adminRecoveryService?: AdminRecoveryService
  feedbackService?: FeedbackService
}

async function createDefaultServices(): Promise<AppServices> {
  const { supabase } = await import('./auth/supabaseClient')
  // supabase-js's postgrest builders are thenable but not full `Promise`s (no `.catch`/`.finally`), which is a
  // structural mismatch against the minimal, easily-fakeable client interfaces these services depend on. The
  // runtime shape both factories actually call (`.select().eq().maybeSingle()`, `.rpc()`, `.auth.*`) matches.
  return {
    authService: createSupabaseAuthService(supabase as unknown as SupabaseAuthClient),
    cloudRepository: createCloudWellnessRepository(supabase as unknown as CloudWellnessClient),
    adminRecoveryService: createAdminRecoveryService(supabase as unknown as AdminRecoveryClient),
    feedbackService: createFeedbackService(supabase as unknown as FeedbackClient),
  }
}

const LoadingScreen = () => <p className="app-loading" role="status">불러오는 중…</p>

/** Shown instead of an indefinite `LoadingScreen` when the initial cloud load (or a
 * `reloadRemote` retry) throws -- e.g. a transient network blip on the active-session
 * check. Without this, a thrown load leaves the user stuck on the loading spinner with
 * no way back in. */
const LoadErrorScreen = ({ onRetry }: { onRetry: () => void }) => (
  <div className="app-load-error" role="alert">
    <p>클라우드 상태를 불러오지 못했어요.</p>
    <button type="button" onClick={onRetry}>다시 시도</button>
  </div>
)

/**
 * Renders exactly what `App` used to render directly: onboarding, then the today/plan/records/avatar
 * views over a `useWellnessGame` instance. Driven purely by local storage when `initialState`/`onStateChange`
 * are omitted (as in every pre-Task-7 test), or by an authenticated user's cloud state when supplied by `App`.
 */
export function WellnessApp({ now = () => new Date(), initialState, onStateChange, account, syncState, onReloadRemote, onRetrySync, onSubmitFeedback }: { now?: () => Date; initialState?: WellnessState; onStateChange?: (state: WellnessState) => void; account?: TodayAccount; syncState?: SyncState; onReloadRemote?: () => void; onRetrySync?: () => void; onSubmitFeedback?: (message: string) => Promise<AuthResult<void>> }) {
  const game = useWellnessGame({ now, initialState, onStateChange })
  const [view, setView] = useState<View>('today')
  const customizeButtonRef = useRef<HTMLButtonElement>(null)
  const restoreCustomizeFocus = useRef(false)
  useEffect(() => {
    if (view === 'today' && restoreCustomizeFocus.current) {
      customizeButtonRef.current?.focus()
      restoreCustomizeFocus.current = false
    }
  }, [view])
  const closeAvatar = () => { restoreCustomizeFocus.current = true; setView('today') }
  const statusMessage = [game.avatarUnlockMessage, game.mutationMessage, game.warning].filter(Boolean).join(' ')
  const records = view === 'records'
  const content = !game.state.profile
    ? <Onboarding onComplete={game.onboard}/>
    : view === 'today'
      ? <TodayScreen state={game.state} setSmoothie={game.setSmoothie} setActivity={game.setActivity} complete={game.complete} onOpenPlan={() => setView('plan')} onOpenRecords={() => setView('records')} onOpenAvatar={() => setView('avatar')} onOpenMore={() => setView('more')} customizeButtonRef={customizeButtonRef} now={now} account={account}/>
      : view === 'avatar'
        ? <div className="app-shell"><header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">나만의 모험가</p><h1>캐릭터 꾸미기</h1></div></header><AvatarCustomizer state={game.state.avatar} gameLevel={game.state.game.level} onGenderChange={game.setAvatarGender} onSkinChange={game.setAvatarSkin} onEquip={game.equipAvatarItem} onUnequip={game.unequipAvatarItem} onClose={closeAvatar}/></div>
        : view === 'more'
          ? <MoreScreen onClose={() => setView('today')} onSubmitFeedback={onSubmitFeedback}/>
          : <div className="app-shell">
          <header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">{records ? '나의 변화 기록' : '나의 7일 루틴'}</p><h1>{records ? '기록' : '계획'}</h1></div></header>
          {records
            ? <RecordsScreen today={toLocalDateKey(now())} entries={game.state.weightEntries ?? []} plan={game.state.weeklyPlan ?? null} events={game.state.completionEvents ?? []} onSaveWeight={game.saveWeight} onDeleteWeight={game.deleteWeight}/>
            : <WeeklyPlanScreen plan={game.state.weeklyPlan ?? null} smoothieItems={game.state.smoothie} onGenerate={game.generatePlan} onMoveMeal={game.moveMeal} onMoveActivity={game.moveActivity} onReplaceActivity={game.replaceActivity} onRegenerate={game.clearPlan}/>}
          <nav className="bottom-nav" aria-label="주요 메뉴"><button aria-label="오늘" onClick={() => setView('today')}><span>●</span>오늘</button><button className={!records ? 'active' : ''} aria-current={!records ? 'page' : undefined} onClick={() => setView('plan')}><CalendarDays/>계획</button><button className={records ? 'active' : ''} aria-current={records ? 'page' : undefined} onClick={() => setView('records')}><ScrollText/>기록</button><button onClick={() => setView('more')}><ChevronRight/>더보기</button></nav>
        </div>
  const visibleNotice = [game.mutationMessage, game.warning].filter(Boolean).join(' ')

  return <div className="app-root">
    <p className="app-live-status" role="status" aria-atomic="true">{statusMessage}</p>
    {syncState && <SyncStatus state={syncState} onReloadRemote={onReloadRemote} onRetry={onRetrySync}/>}
    {content}
    {visibleNotice && <p className="global-plan-message">{visibleNotice}</p>}
    {game.state.profile && view === 'today' && game.avatarUnlockMessage && <div className="avatar-unlock-toast" data-testid="avatar-unlock-toast"><Sparkles aria-hidden="true"/><span>{game.avatarUnlockMessage}</span></div>}
  </div>
}

/** Loads the authenticated user's own cloud state (importing legacy local data exactly once, on first registration) and drives `WellnessApp` from it. Keyed by `userId` at the call site so switching users always remounts fresh. */
function CloudConnectedApp({ userId, username, cloudRepository, feedbackService, justRegistered, now, onChangePassword, onLogout, authError, clearAuthError }: { userId: string; username: string; cloudRepository: CloudWellnessRepository<WellnessState>; feedbackService?: FeedbackService; justRegistered: boolean; now: () => Date; onChangePassword: UseAuthResult['changePassword']; onLogout: UseAuthResult['logout']; authError: string | null; clearAuthError: () => void }) {
  const cloud = useCloudWellness({ userId, repository: cloudRepository, justRegistered, now })
  if (cloud.initialState === undefined) {
    return cloud.syncState === 'error' ? <LoadErrorScreen onRetry={cloud.reloadRemote}/> : <LoadingScreen/>
  }
  return <WellnessApp
    now={now}
    initialState={cloud.initialState}
    onStateChange={cloud.onStateChange}
    syncState={cloud.syncState}
    onReloadRemote={cloud.reloadRemote}
    onRetrySync={cloud.retry}
    account={{ username, onChangePassword, onLogout, error: authError, clearError: clearAuthError }}
    onSubmitFeedback={feedbackService ? message => feedbackService.submit(userId, message) : undefined}
  />
}

/** The auth+cloud gate: loading, `AuthScreen`, a forced password change, or the authenticated `CloudConnectedApp`. */
function AuthGate({ now, services }: { now: () => Date; services: AppServices }) {
  const auth = useAuth(services.authService)
  const [authEvent, setAuthEvent] = useState<{ userId: string; justRegistered: boolean } | null>(null)
  const [showAdminRecovery, setShowAdminRecovery] = useState(false)
  const [showAdminFeedback, setShowAdminFeedback] = useState(false)

  const wrappedAuth: UseAuthResult = {
    ...auth,
    login: async (username, password) => {
      const result = await auth.login(username, password)
      if (result.ok) setAuthEvent({ userId: result.value.user.id, justRegistered: false })
      return result
    },
    register: async (username, password) => {
      const result = await auth.register(username, password)
      if (result.ok) setAuthEvent({ userId: result.value.user.id, justRegistered: true })
      return result
    },
    logout: async () => { setAuthEvent(null); await auth.logout() },
  }

  if (auth.status === 'loading') return <LoadingScreen/>
  if (auth.status === 'anonymous' || !auth.session) return <AuthScreen auth={wrappedAuth}/>

  const session = auth.session
  const justRegistered = authEvent?.userId === session.user.id && authEvent.justRegistered
  // `services.adminRecoveryService` is only ever set for a real admin's session role check to
  // matter (see `AppServices`), but `AdminRecoveryScreen` re-checks `session.user.role` itself
  // regardless of how it was reached, so this route is never merely hidden-but-reachable.
  const canOpenAdminRecovery = session.user.role === 'admin' && services.adminRecoveryService
  const canOpenAdminFeedback = session.user.role === 'admin' && services.feedbackService

  if (canOpenAdminRecovery && showAdminRecovery) {
    return <AdminRecoveryScreen session={session} service={services.adminRecoveryService!} onClose={() => setShowAdminRecovery(false)}/>
  }
  if (canOpenAdminFeedback && showAdminFeedback) {
    return <AdminFeedbackScreen session={session} service={services.feedbackService!} onClose={() => setShowAdminFeedback(false)}/>
  }

  return <ForcePasswordChangeScreen auth={wrappedAuth}>
    {(canOpenAdminRecovery || canOpenAdminFeedback) && <div className="admin-entry-bar">
      {canOpenAdminRecovery && <button type="button" className="admin-entry-button" onClick={() => setShowAdminRecovery(true)}>관리자: 비밀번호 복구 관리</button>}
      {canOpenAdminFeedback && <button type="button" className="admin-entry-button" onClick={() => setShowAdminFeedback(true)}>관리자: 피드백 보기</button>}
    </div>}
    <CloudConnectedApp
      key={session.user.id}
      userId={session.user.id}
      username={session.user.username}
      cloudRepository={services.cloudRepository}
      feedbackService={services.feedbackService}
      justRegistered={justRegistered}
      now={now}
      onChangePassword={wrappedAuth.changePassword}
      onLogout={wrappedAuth.logout}
      authError={auth.error}
      clearAuthError={auth.clearError}
    />
  </ForcePasswordChangeScreen>
}

export function App({ now = () => new Date(), services }: { now?: () => Date; services?: AppServices }) {
  const [resolvedServices, setResolvedServices] = useState<AppServices | null>(services ?? null)
  const [bootError, setBootError] = useState<string | null>(null)
  useEffect(() => {
    if (services) { setResolvedServices(services); return }
    let active = true
    createDefaultServices()
      .then(created => { if (active) setResolvedServices(created) })
      .catch((error: unknown) => { if (active) setBootError(error instanceof Error ? error.message : String(error)) })
    return () => { active = false }
  }, [services])

  if (bootError) return <p role="alert">{bootError}</p>
  if (!resolvedServices) return <LoadingScreen/>
  return <AuthGate now={now} services={resolvedServices}/>
}
