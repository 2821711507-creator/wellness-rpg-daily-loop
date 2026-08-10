import type { ActivityTemplate } from '../domain/activity'
const safetyNote = '날카로운 통증이나 이상 증상이 있으면 중단하세요.'
export const activityTemplates: ActivityTemplate[] = [
  { id: 'gym-basic', environment: 'gym', title: '머신 전신 탐험', minutes: 35, intensity: 'moderate', movements: ['레그 프레스 머신 2×8–12', '체스트 프레스 머신 2×8–12', '시티드 로우 머신 2×8–12', '레그 컬 머신 2×8–12', '숄더 프레스 머신 2×8–12'], equipment: ['헬스장 머신'], safetyNote },
  { id: 'home-basic', environment: 'home', title: '집에서 기본 루프', minutes: 20, intensity: 'easy', movements: ['의자 스쿼트 2×8–12', '벽 푸시업 2×8–12', '글루트 브리지 2×8–12', '버드독 2×8–12'], equipment: [], safetyNote },
  { id: 'walk-basic', environment: 'walk', title: '동네 산보 퀘스트', minutes: 30, intensity: 'easy', movements: ['편하게 5분', '빠르게 20분', '천천히 5분'], equipment: [], safetyNote },
]
