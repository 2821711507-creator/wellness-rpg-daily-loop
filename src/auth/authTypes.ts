export type AuthErrorCode =
  | 'invalid-credentials'
  | 'duplicate-username'
  | 'invalid-username'
  | 'weak-password'
  | 'rate-limited'
  | 'network'
  | 'forbidden'
  | 'unknown'

export interface AuthUser {
  id:string
  username:string
  role:'user'|'admin'
  mustChangePassword:boolean
}

export interface AuthSession {
  accessToken:string
  user:AuthUser
}

export type AuthResult<T> =
  | { ok:true; value:T }
  | { ok:false; code:AuthErrorCode; message:string }

export interface AuthService {
  currentSession():Promise<AuthSession|null>
  onSessionChange(listener:(session:AuthSession|null)=>void):()=>void
  login(username:string, password:string):Promise<AuthResult<AuthSession>>
  register(username:string, password:string):Promise<AuthResult<AuthSession>>
  requestRecovery(username:string):Promise<AuthResult<void>>
  changePassword(password:string):Promise<AuthResult<void>>
  logout():Promise<void>
}
