import type { WeeklyPlan } from './weeklyPlan'

export type TrainingDayState = 'skipped'|'completed'|'planned'|'conditional'
export type TrainingDayKind = 'rest'|'mixed'|'recovery'|'strength-upper'|'strength-lower-core'|'light-cardio'

export interface TrainingDayGuidance {
  date:string
  state:TrainingDayState
  kind:TrainingDayKind
  title:string
  summary:string
  duration?:string
  exercises:string[]
  includesHiit?:boolean
  fallback?:string
}

export interface WeeklyTrainingGuidance {
  id:string
  title:string
  focus:string
  days:TrainingDayGuidance[]
  rules:string[]
  safetyNote:string
}

const guidance:WeeklyTrainingGuidance = {
  id:'beginner-cut-2026-08-10',
  title:'이번 주 회복 우선 감량 루틴',
  focus:'이미 한 운동은 인정하고, 빠진 날은 보충하지 않아요. 이번 주는 근력의 질과 회복을 우선해요.',
  days:[
    { date:'2026-08-10', state:'skipped', kind:'rest', title:'운동 없음', summary:'월요일 운동은 건너뛰었어요. 다른 날에 몰아서 보충하지 않아요.', exercises:[] },
    { date:'2026-08-11', state:'completed', kind:'mixed', title:'오늘 운동 완료', summary:'유산소 30분 + 가벼운 근력 + 저녁 식사 후 HIIT를 완료했어요.', duration:'유산소 30분', exercises:['유산소 30분', '가벼운 근력 운동', '저녁 식사 후 HIIT'], includesHiit:true },
    { date:'2026-08-12', state:'planned', kind:'recovery', title:'회복일', summary:'말하면서 움직일 수 있는 가벼운 강도로 몸을 풀어요.', duration:'30~40분 + 스트레칭 10분', exercises:['빠른 걷기 또는 자전거 30~40분', '전신 스트레칭 10분'] },
    { date:'2026-08-13', state:'planned', kind:'strength-upper', title:'상체 근력', summary:'각 동작 3세트 × 8~12회, 자세가 무너지기 전 멈춰요.', duration:'근력 45~60분 + 가벼운 유산소 15~20분', exercises:['머신 체스트 프레스', '랫 풀다운', '시티드 로우', '숄더 프레스', '바이셉 컬', '트라이셉 푸시다운', '가벼운 유산소 15~20분'] },
    { date:'2026-08-14', state:'planned', kind:'rest', title:'휴식일', summary:'정식 운동은 쉬고, 원하면 식후에 편하게 걸어요.', duration:'선택: 식후 산책 30분', exercises:['선택 활동: 식후 산책 30분'] },
    { date:'2026-08-15', state:'planned', kind:'strength-lower-core', title:'하체 + 코어', summary:'각 동작 3세트 × 8~12회. 자유식을 위해 운동을 추가하지 않아요.', duration:'근력 45~60분 + 가벼운 유산소 15~20분', exercises:['레그 프레스', '레그 익스텐션', '레그 컬', '글루트 브리지 또는 힙 스러스트', '카프 레이즈', '크런치 또는 플랭크', '가벼운 유산소 15~20분'] },
    { date:'2026-08-16', state:'conditional', kind:'light-cardio', title:'가벼운 유산소 또는 휴식', summary:'다리 회복 상태를 먼저 확인해요.', duration:'30~45분', exercises:['가벼운 걷기·자전거 등 30~45분'], fallback:'다리가 많이 뻐근하거나 통증이 있으면 바로 쉬어요.' },
  ],
  rules:['이번 주 HIIT는 화요일 1회로 충분해요.', '놓친 운동을 몰아서 보충하지 않아요.', '토요일 자유식을 위해 운동량을 미리 늘리지 않아요.'],
  safetyNote:'날카로운 통증, 어지럼증, 가슴 통증 또는 평소와 다른 증상이 있으면 운동을 중단하고 필요한 도움을 받으세요.',
}

const approvedActivities = [
  ['2026-08-11', 'mixed-hiit-completed'],
  ['2026-08-12', 'recovery-cardio'],
  ['2026-08-13', 'gym-upper'],
  ['2026-08-15', 'gym-lower-core'],
  ['2026-08-16', 'light-cardio-conditional'],
] as const

export function createApprovedTrainingWeek(weekStart:string):WeeklyTrainingGuidance|undefined {
  if (weekStart !== '2026-08-10') return undefined
  return {
    ...guidance,
    days:guidance.days.map(day => ({ ...day, exercises:[...day.exercises] })),
    rules:[...guidance.rules],
  }
}

export function reconcileApprovedTrainingWeek(plan:WeeklyPlan):WeeklyPlan {
  const approved = createApprovedTrainingWeek(plan.weekStart)
  if (!approved) return plan
  const alreadyAligned = plan.trainingGuidance?.id === approved.id
    && plan.activities.length === approvedActivities.length
    && plan.activities.every((activity, index) => activity.date === approvedActivities[index][0] && activity.templateId === approvedActivities[index][1])
  if (alreadyAligned) return plan
  const activities = approvedActivities.map(([date, templateId]) => ({
    id:`${plan.id}-activity-${date}-guide`,
    date,
    templateId,
    completed:date === '2026-08-11' || Boolean(plan.activities.find(activity => activity.date === date)?.completed),
  }))
  return { ...plan, activities, trainingGuidance:approved }
}
