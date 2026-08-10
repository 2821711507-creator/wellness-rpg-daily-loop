import { useState, type FormEvent } from 'react'
import type { UserProfile } from '../domain/profile'

export function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>({ age: 30, heightCm: 170, weightKg: 70, calculationSex: 'female', activityLevel: 'light' })
  const number = (key: 'age'|'heightCm'|'weightKg') => (event: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, [key]: Number(event.target.value) })
  const submit = (event: FormEvent) => { event.preventDefault(); onComplete(profile) }
  return <main className="onboarding"><p className="eyebrow">새 모험 준비</p><h1>나에게 맞는 오늘을 만들어요</h1><p>계산용 성별은 영양 계산에만 사용되며 캐릭터 선택과 무관합니다.</p><form onSubmit={submit}><label>만 나이<input type="number" value={profile.age} onChange={number('age')} /></label><label>키 (cm)<input type="number" value={profile.heightCm} onChange={number('heightCm')} /></label><label>체중 (kg)<input type="number" value={profile.weightKg} onChange={number('weightKg')} /></label><label>영양 계산용 성별<select value={profile.calculationSex} onChange={e => setProfile({ ...profile, calculationSex: e.target.value as UserProfile['calculationSex'] })}><option value="female">여성</option><option value="male">남성</option></select></label><label>평소 활동량<select value={profile.activityLevel} onChange={e => setProfile({ ...profile, activityLevel: e.target.value as UserProfile['activityLevel'] })}><option value="sedentary">적음</option><option value="light">가벼움</option><option value="moderate">보통</option></select></label><button type="submit">모험 시작</button></form></main>
}
