import { useEffect, useState } from 'react'
import type { AuthResult, AuthService, AuthSession } from '../auth/authTypes'

export type AuthStatus = 'loading'|'anonymous'|'authenticated'

export interface UseAuthResult {
  status:AuthStatus
  session:AuthSession|null
  error:string|null
  login:(username:string, password:string)=>Promise<AuthResult<AuthSession>>
  register:(username:string, password:string)=>Promise<AuthResult<AuthSession>>
  requestRecovery:(username:string)=>Promise<AuthResult<void>>
  changePassword:(password:string)=>Promise<AuthResult<void>>
  logout:()=>Promise<void>
}

/**
 * Owns the session lifecycle for an injected `AuthService`: bootstraps the current session on
 * mount, tracks live changes (token refresh, remote sign-out), and exposes the auth actions with
 * their last error message. Consumers own how (and whether) they render forms around this.
 */
export function useAuth(service:AuthService):UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<AuthSession|null>(null)
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    let active = true
    service.currentSession().then(current => {
      if (!active) return
      setSession(current)
      setStatus(current ? 'authenticated' : 'anonymous')
    })
    const unsubscribe = service.onSessionChange(next => {
      setSession(next)
      setStatus(next ? 'authenticated' : 'anonymous')
    })
    return () => { active = false; unsubscribe() }
  }, [service])

  const login:UseAuthResult['login'] = async (username, password) => {
    setError(null)
    const result = await service.login(username, password)
    if (result.ok) { setSession(result.value); setStatus('authenticated') }
    else setError(result.message)
    return result
  }

  const register:UseAuthResult['register'] = async (username, password) => {
    setError(null)
    const result = await service.register(username, password)
    if (result.ok) { setSession(result.value); setStatus('authenticated') }
    else setError(result.message)
    return result
  }

  const requestRecovery:UseAuthResult['requestRecovery'] = async username => {
    setError(null)
    const result = await service.requestRecovery(username)
    if (!result.ok) setError(result.message)
    return result
  }

  const changePassword:UseAuthResult['changePassword'] = async password => {
    setError(null)
    const result = await service.changePassword(password)
    if (result.ok) setSession(current => current ? { ...current, user:{ ...current.user, mustChangePassword:false } } : current)
    else setError(result.message)
    return result
  }

  const logout = async () => {
    await service.logout()
    setSession(null)
    setStatus('anonymous')
  }

  return { status, session, error, login, register, requestRecovery, changePassword, logout }
}
