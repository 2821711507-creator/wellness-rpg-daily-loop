import { useEffect, useState } from 'react'
import type { AuthSession } from '../auth/authTypes'
import type { AdminRecoveryService, PendingRecoveryRequest } from '../admin/adminRecoveryService'

interface ResetOutcome {
  requestId: string
  username: string
  temporaryPassword: string
}

function formatRequestedAt(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${hours}:${minutes}`
}

/**
 * Administrator-only password recovery queue. Renders nothing functional for a
 * non-admin `session` -- this guard runs regardless of how the screen was reached,
 * so it is not merely a hidden entry point in `App.tsx`. Resetting a request always
 * requires an explicit confirmation step, and the returned temporary password is
 * held only in local component state: it is shown once in a `role="status"` panel,
 * never written to a URL, storage, or the console, and is discarded the moment the
 * panel is dismissed or this component unmounts (e.g. on navigation back).
 */
export function AdminRecoveryScreen({ session, service, onClose }: { session: AuthSession; service: AdminRecoveryService; onClose: () => void }) {
  const isAdmin = session.user.role === 'admin'
  const [pending, setPending] = useState<PendingRecoveryRequest[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ResetOutcome | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    service.listPending().then(result => {
      if (!active) return
      if (result.ok) setPending(result.value)
      else setListError(result.message)
    })
    return () => { active = false }
  }, [isAdmin, service])

  if (!isAdmin) {
    return <main className="admin-recovery">
      <p role="alert">관리자만 접근할 수 있어요.</p>
      <button type="button" onClick={onClose}>돌아가기</button>
    </main>
  }

  const confirmReset = (requestId: string) => { setConfirmingId(requestId); setResetError(null) }
  const cancelReset = () => setConfirmingId(null)

  const performReset = async (request: PendingRecoveryRequest) => {
    setIsResetting(true)
    setResetError(null)
    const result = await service.reset(request.id)
    setIsResetting(false)
    setConfirmingId(null)
    if (!result.ok) { setResetError(result.message); return }
    setPending(current => (current ?? []).filter(row => row.id !== request.id))
    setOutcome({ requestId: request.id, username: request.username, temporaryPassword: result.value })
    setCopied(false)
  }

  const dismissOutcome = () => { setOutcome(null); setCopied(false) }

  const copyPassword = async () => {
    if (!outcome) return
    await navigator.clipboard?.writeText(outcome.temporaryPassword)
    setCopied(true)
  }

  return <main className="admin-recovery">
    <header className="admin-recovery-header">
      <h1>비밀번호 복구 관리</h1>
      <button type="button" onClick={onClose}>돌아가기</button>
    </header>

    {listError && <p role="alert">{listError}</p>}
    {resetError && <p role="alert">{resetError}</p>}

    {outcome && <div role="status" aria-label="임시 비밀번호" className="admin-recovery-outcome">
      <p><strong>{outcome.username}</strong>님의 임시 비밀번호예요. 이번 한 번만 표시돼요.</p>
      <p className="admin-recovery-password">{outcome.temporaryPassword}</p>
      <div className="admin-recovery-outcome-actions">
        <button type="button" onClick={copyPassword}>복사</button>
        <button type="button" onClick={dismissOutcome}>닫기</button>
      </div>
      {copied && <p>복사했어요.</p>}
    </div>}

    {pending === null && !listError && <p role="status">불러오는 중…</p>}
    {pending !== null && pending.length === 0 && <p>대기 중인 요청이 없어요.</p>}

    {pending !== null && pending.length > 0 && <ul className="admin-recovery-list">
      {pending.map(request => <li key={request.id}>
        <span className="admin-recovery-username">{request.username}</span>
        <span className="admin-recovery-time">{formatRequestedAt(request.requestedAt)}</span>
        {confirmingId === request.id
          ? <span className="admin-recovery-confirm">
            <span>정말 재설정할까요?</span>
            <button type="button" onClick={() => performReset(request)} disabled={isResetting}>확인</button>
            <button type="button" onClick={cancelReset} disabled={isResetting}>취소</button>
          </span>
          : <button type="button" onClick={() => confirmReset(request.id)}>재설정</button>}
      </li>)}
    </ul>}
  </main>
}
