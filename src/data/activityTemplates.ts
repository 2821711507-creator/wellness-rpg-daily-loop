import type { ActivityTemplate } from '../domain/activity'

const safetyNote = '날카로운 통증이나 이상 증상이 있으면 중단하세요.'

const basicTemplates:ActivityTemplate[] = [
  { id:'gym-basic', environment:'gym', title:'머신 전신 탐험', minutes:35, intensity:'moderate', movements:['레그 프레스 머신 2×8–12', '체스트 프레스 머신 2×8–12', '시티드 로우 머신 2×8–12', '레그 컬 머신 2×8–12', '숄더 프레스 머신 2×8–12'], equipment:['헬스장 머신'], safetyNote },
  { id:'home-basic', environment:'home', title:'집에서 기본 루프', minutes:20, intensity:'easy', movements:['의자 스쿼트 2×8–12', '벽 푸시업 2×8–12', '글루트 브리지 2×8–12', '버드독 2×8–12'], equipment:[], safetyNote },
  { id:'walk-basic', environment:'walk', title:'동네 산보 퀘스트', minutes:30, intensity:'easy', movements:['편하게 5분', '빠르게 20분', '천천히 5분'], equipment:[], safetyNote },
]

const approvedWeekTemplates:ActivityTemplate[] = [
  { id:'mixed-hiit-completed', environment:'home', title:'유산소 + 가벼운 근력 + HIIT', minutes:45, intensity:'moderate', movements:['유산소 30분', '가벼운 근력 운동', '저녁 식사 후 HIIT'], equipment:[], safetyNote },
  { id:'recovery-cardio', environment:'walk', title:'회복 걷기·자전거', minutes:40, intensity:'easy', movements:['빠른 걷기 또는 자전거 30~40분', '전신 스트레칭 10분'], equipment:[], safetyNote },
  { id:'gym-upper', environment:'gym', title:'상체 근력 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:['머신 체스트 프레스 3×8–12', '랫 풀다운 3×8–12', '시티드 로우 3×8–12', '숄더 프레스 3×8–12', '바이셉 컬 3×8–12', '트라이셉 푸시다운 3×8–12', '가벼운 유산소 15~20분'], equipment:['헬스장 머신'], safetyNote },
  { id:'gym-lower-core', environment:'gym', title:'하체·코어 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:['레그 프레스 3×8–12', '레그 익스텐션 3×8–12', '레그 컬 3×8–12', '글루트 브리지 또는 힙 스러스트 3×8–12', '카프 레이즈 3×8–12', '크런치 또는 플랭크 3세트', '가벼운 유산소 15~20분'], equipment:['헬스장 머신'], safetyNote },
  { id:'light-cardio-conditional', environment:'walk', title:'가벼운 유산소 또는 휴식', minutes:45, intensity:'easy', movements:['회복 상태 확인', '괜찮으면 가벼운 유산소 30~45분', '다리가 많이 뻐근하거나 아프면 휴식'], equipment:[], safetyNote },
]

export const activityTemplates:ActivityTemplate[] = [...basicTemplates, ...approvedWeekTemplates]
