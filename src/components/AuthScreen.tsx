import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { UseAuthResult } from '../hooks/useAuth'

type Mode = 'login'|'register'|'recovery'

const PASSWORD_MISMATCH = '비밀번호가 일치하지 않아요.'

export function AuthScreen({ auth }:{ auth:UseAuthResult }) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryUsername, setRecoveryUsername] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string|null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const error = localError ?? auth.error

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  const switchMode = (next:Mode) => { setMode(next); setLocalError(null); setRecoverySent(false) }

  const submitLogin = async (event:FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)
    await auth.login(username, password)
    setIsSubmitting(false)
  }

  const submitRegister = async (event:FormEvent) => {
    event.preventDefault()
    if (password !== confirmPassword) { setLocalError(PASSWORD_MISMATCH); return }
    setLocalError(null)
    setIsSubmitting(true)
    await auth.register(username, password)
    setIsSubmitting(false)
  }

  const submitRecovery = async (event:FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)
    const result = await auth.requestRecovery(recoveryUsername)
    setIsSubmitting(false)
    if (result.ok) setRecoverySent(true)
  }

  return <main className="auth-screen">
    <section className="auth-card">
      <p className="eyebrow">웰니스 RPG</p>
      {mode === 'login' && <>
        <h1>로그인</h1>
        <form onSubmit={submitLogin}>
          <label>아이디<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required/></label>
          <label>비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required/></label>
          <button type="submit" disabled={isSubmitting}>로그인</button>
        </form>
        <div className="auth-switch">
          <button type="button" onClick={() => switchMode('register')}>회원가입</button>
          <button type="button" onClick={() => switchMode('recovery')}>비밀번호 찾기</button>
        </div>
      </>}
      {mode === 'register' && <>
        <h1>회원가입</h1>
        <form onSubmit={submitRegister}>
          <label>아이디<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required/></label>
          <label>비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required/></label>
          <label>비밀번호 확인<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required/></label>
          <button type="submit" disabled={isSubmitting}>가입하기</button>
        </form>
        <div className="auth-switch">
          <button type="button" onClick={() => switchMode('login')}>로그인으로 돌아가기</button>
        </div>
      </>}
      {mode === 'recovery' && <>
        <h1>비밀번호 찾기</h1>
        {recoverySent
          ? <p className="auth-status" role="status">복구 요청을 접수했어요. 관리자에게 임시 비밀번호를 받아 주세요.</p>
          : <>
            <p>아이디를 입력하면 관리자가 임시 비밀번호를 발급해 줘요.</p>
            <form onSubmit={submitRecovery}>
              <label>아이디<input value={recoveryUsername} onChange={e => setRecoveryUsername(e.target.value)} autoComplete="username" required/></label>
              <button type="submit" disabled={isSubmitting}>복구 요청</button>
            </form>
          </>}
        <div className="auth-switch">
          <button type="button" onClick={() => switchMode('login')}>로그인으로 돌아가기</button>
        </div>
      </>}
      <p className="auth-status" role="status" aria-live="polite">{isSubmitting ? '처리 중입니다…' : ''}</p>
      {error && <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    </section>
  </main>
}
