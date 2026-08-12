import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { UseAuthResult } from '../hooks/useAuth'

const PASSWORD_MISMATCH = '비밀번호가 일치하지 않아요.'

/**
 * Gate that blocks its `children` behind a forced password change whenever the current
 * session's user has `mustChangePassword`. Once `auth.changePassword` succeeds the caller's
 * `useAuth` session updates and this renders `children` instead -- there is no separate
 * "continue" step.
 */
export function ForcePasswordChangeScreen({ auth, children }:{ auth:UseAuthResult; children:ReactNode }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string|null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const error = localError ?? auth.error

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  if (!auth.session?.user.mustChangePassword) return <>{children}</>

  const submit = async (event:FormEvent) => {
    event.preventDefault()
    if (password !== confirmPassword) { setLocalError(PASSWORD_MISMATCH); return }
    setLocalError(null)
    setIsSubmitting(true)
    await auth.changePassword(password)
    setIsSubmitting(false)
  }

  return <main className="auth-screen">
    <section className="auth-card">
      <p className="eyebrow">보안 안내</p>
      <h1>비밀번호를 변경해 주세요</h1>
      <p>임시 비밀번호로 로그인했어요. 계속하려면 새 비밀번호를 설정해 주세요.</p>
      <form onSubmit={submit}>
        <label>새 비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required/></label>
        <label>새 비밀번호 확인<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required/></label>
        <button type="submit" disabled={isSubmitting}>비밀번호 변경</button>
      </form>
      <p className="auth-status" role="status" aria-live="polite">{isSubmitting ? '처리 중입니다…' : ''}</p>
      {error && <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    </section>
  </main>
}
