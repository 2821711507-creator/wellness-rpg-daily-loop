import { useEffect, useState } from 'react'
import type { AuthSession } from '../auth/authTypes'
import type { FeedbackEntry, FeedbackService } from '../feedback/feedbackService'

function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${hours}:${minutes}`
}

/** Administrator-only feedback list. Re-checks `session.user.role` itself, the
 * same defense-in-depth as `AdminRecoveryScreen`, so this route is never
 * merely a hidden-but-reachable entry point in `App.tsx`. */
export function AdminFeedbackScreen({ session, service, onClose }: { session: AuthSession; service: FeedbackService; onClose: () => void }) {
  const isAdmin = session.user.role === 'admin'
  const [entries, setEntries] = useState<FeedbackEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    service.listAll().then(result => {
      if (!active) return
      if (result.ok) setEntries(result.value)
      else setError(result.message)
    })
    return () => { active = false }
  }, [isAdmin, service])

  if (!isAdmin) {
    return <main className="admin-feedback">
      <p role="alert">관리자만 접근할 수 있어요.</p>
      <button type="button" onClick={onClose}>돌아가기</button>
    </main>
  }

  return <main className="admin-feedback">
    <header className="admin-feedback-header">
      <h1>사용자 피드백</h1>
      <button type="button" onClick={onClose}>돌아가기</button>
    </header>

    {error && <p role="alert">{error}</p>}
    {entries === null && !error && <p role="status">불러오는 중…</p>}
    {entries !== null && entries.length === 0 && <p>아직 피드백이 없어요.</p>}

    {entries !== null && entries.length > 0 && <ul className="admin-feedback-list">
      {entries.map(entry => <li key={entry.id}>
        <span className="admin-feedback-username">{entry.username}</span>
        <span className="admin-feedback-time">{formatCreatedAt(entry.createdAt)}</span>
        <p className="admin-feedback-message">{entry.message}</p>
      </li>)}
    </ul>}
  </main>
}
