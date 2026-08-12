import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { UserProfile } from '../domain/profile'

export function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>({ age: 30, heightCm: 170, weightKg: 70, calculationSex: 'female', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild' })
  const number = (key: 'age'|'heightCm'|'weightKg') => (event: ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, [key]: Number(event.target.value) })
  const setGoal = (event: ChangeEvent<HTMLSelectElement>) => {
    const goal = event.target.value as UserProfile['goal']
    setProfile(goal === 'cut' ? { ...profile, goal, cutIntensity: profile.cutIntensity ?? 'mild' } : { age:profile.age, heightCm:profile.heightCm, weightKg:profile.weightKg, calculationSex:profile.calculationSex, activityLevel:profile.activityLevel, goal })
  }
  const submit = (event: FormEvent) => { event.preventDefault(); onComplete(profile) }
  return <main className="onboarding"><p className="eyebrow">시작하기</p><h1>나의 하루</h1><p>내 생활에 맞는 식단과 활동 목표를 준비해요. 계산용 성별은 영양 계산에만 사용되며 캐릭터 선택과 무관합니다.</p><form onSubmit={submit}><label>만 나이<input type="number" value={profile.age} onChange={number('age')} /></label><label>키 (cm)<input type="number" value={profile.heightCm} onChange={number('heightCm')} /></label><label>체중 (kg)<input type="number" value={profile.weightKg} onChange={number('weightKg')} /></label><label>영양 계산용 성별<select value={profile.calculationSex} onChange={e => setProfile({ ...profile, calculationSex: e.target.value as UserProfile['calculationSex'] })}><option value="female">여성</option><option value="male">남성</option></select></label><label>평소 활동량<select value={profile.activityLevel} onChange={e => setProfile({ ...profile, activityLevel: e.target.value as UserProfile['activityLevel'] })}><option value="sedentary">적음</option><option value="light">가벼움</option><option value="moderate">보통</option><option value="veryActive">매우 활동적</option></select></label><label>목표<select value={profile.goal} onChange={setGoal}><option value="cut">감량</option><option value="maintain">유지</option><option value="bulk">증량</option></select></label>{profile.goal === 'cut' && <label>감량 강도<select value={profile.cutIntensity} onChange={e => setProfile({ ...profile, cutIntensity: e.target.value as NonNullable<UserProfile['cutIntensity']> })}><option value="mild">완만함</option><option value="aggressive">공격적</option></select></label>}<button type="submit">시작하기</button></form></main>
}
