import type { ActivityTemplate } from '../domain/activity'

const safetyNote = '날카로운 통증이나 이상 증상이 있으면 중단하세요.'

const basicTemplates:ActivityTemplate[] = [
  { id:'gym-basic', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:3.5, title:'머신 전신 탐험', minutes:35, intensity:'moderate', movements:[{label:'레그 프레스 머신 2×8–12',guideId:'leg-press'}, {label:'체스트 프레스 머신 2×8–12',guideId:'chest-press'}, {label:'시티드 로우 머신 2×8–12',guideId:'seated-row'}, {label:'레그 컬 머신 2×8–12',guideId:'leg-curl'}, {label:'숄더 프레스 머신 2×8–12',guideId:'shoulder-press'}], equipment:['헬스장 머신'], safetyNote },
  { id:'home-basic', environment:'home', style:'strength', goalFit:['cut','maintain'], metValue:3.8, title:'집에서 기본 루프', minutes:20, intensity:'easy', movements:[{label:'의자 스쿼트 2×8–12'}, {label:'벽 푸시업 2×8–12'}, {label:'글루트 브리지 2×8–12'}, {label:'버드독 2×8–12'}], equipment:[], safetyNote },
  { id:'walk-basic', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:3.3, title:'동네 산보 퀘스트', minutes:30, intensity:'easy', movements:[{label:'편하게 5분'}, {label:'빠르게 20분'}, {label:'천천히 5분'}], equipment:[], safetyNote },
]

const approvedWeekTemplates:ActivityTemplate[] = [
  { id:'mixed-hiit-completed', environment:'home', style:'hiit', goalFit:['cut'], metValue:8.0, title:'유산소 + 가벼운 근력 + HIIT', minutes:45, intensity:'moderate', movements:[{label:'유산소 30분'}, {label:'가벼운 근력 운동'}, {label:'저녁 식사 후 HIIT'}], equipment:[], safetyNote },
  { id:'recovery-cardio', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:4.0, title:'회복 걷기·자전거', minutes:40, intensity:'easy', movements:[{label:'빠른 걷기 또는 자전거 30~40분'}, {label:'전신 스트레칭 10분'}], equipment:[], safetyNote },
  { id:'gym-upper', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:4.5, title:'상체 근력 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:[{label:'머신 체스트 프레스 3×8–12',guideId:'chest-press'}, {label:'랫 풀다운 3×8–12',guideId:'lat-pulldown'}, {label:'시티드 로우 3×8–12',guideId:'seated-row'}, {label:'숄더 프레스 3×8–12',guideId:'shoulder-press'}, {label:'바이셉 컬 3×8–12',guideId:'bicep-curl'}, {label:'트라이셉 푸시다운 3×8–12',guideId:'tricep-pushdown'}, {label:'가벼운 유산소 15~20분'}], equipment:['헬스장 머신'], safetyNote },
  { id:'gym-lower-core', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:4.5, title:'하체·코어 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:[{label:'레그 프레스 3×8–12',guideId:'leg-press'}, {label:'레그 익스텐션 3×8–12',guideId:'leg-extension'}, {label:'레그 컬 3×8–12',guideId:'leg-curl'}, {label:'글루트 브리지 또는 힙 스러스트 3×8–12',guideId:'hip-thrust'}, {label:'카프 레이즈 3×8–12',guideId:'calf-raise'}, {label:'크런치 또는 플랭크 3세트'}, {label:'가벼운 유산소 15~20분'}], equipment:['헬스장 머신'], safetyNote },
  { id:'light-cardio-conditional', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:3.5, title:'가벼운 유산소 또는 휴식', minutes:45, intensity:'easy', movements:[{label:'회복 상태 확인'}, {label:'괜찮으면 가벼운 유산소 30~45분'}, {label:'다리가 많이 뻐근하거나 아프면 휴식'}], equipment:[], safetyNote },
]

const newTemplates:ActivityTemplate[] = [
  { id:'gym-cardio-bike', environment:'gym', style:'cardio', goalFit:['cut'], metValue:6.8, title:'실내 사이클 인터벌', minutes:25, intensity:'moderate', movements:[{label:'가볍게 페달링 5분',guideId:'stationary-bike'}, {label:'중강도 페달링 15분'}, {label:'쿨다운 5분'}], equipment:['실내 사이클'], safetyNote },
  { id:'gym-cardio-stairs', environment:'gym', style:'cardio', goalFit:['cut'], metValue:9.0, title:'스텝밀 등반', minutes:20, intensity:'hard', movements:[{label:'천천히 3분',guideId:'stair-mill'}, {label:'빠른 스텝 14분'}, {label:'쿨다운 3분'}], equipment:['스텝밀 머신'], safetyNote },
  { id:'home-cardio-jumprope', environment:'home', style:'cardio', goalFit:['cut'], metValue:8.8, title:'줄넘기 인터벌', minutes:15, intensity:'moderate', movements:[{label:'기본 줄넘기 1분 ×10세트'}, {label:'세트 사이 30초 휴식'}], equipment:['줄넘기'], safetyNote },
  { id:'walk-cardio-jog', environment:'walk', style:'cardio', goalFit:['cut'], metValue:7.0, title:'가벼운 조깅', minutes:25, intensity:'moderate', movements:[{label:'걷기 워밍업 5분'}, {label:'가벼운 조깅 15분'}, {label:'걷기 쿨다운 5분'}], equipment:[], safetyNote },
  { id:'gym-strength-fullbody', environment:'gym', style:'strength', goalFit:['bulk'], metValue:6.0, title:'프리웨이트 전신', minutes:50, intensity:'hard', movements:[{label:'바벨 스쿼트 4×6–8',guideId:'barbell-squat'}, {label:'벤치 프레스 4×6–8',guideId:'bench-press'}, {label:'바벨 로우 4×6–8',guideId:'barbell-row'}, {label:'오버헤드 프레스 3×8–10',guideId:'overhead-press'}], equipment:['바벨', '랙'], safetyNote },
  { id:'home-strength-bodyweight', environment:'home', style:'strength', goalFit:['cut','maintain'], metValue:3.8, title:'맨몸 근력 서킷', minutes:25, intensity:'moderate', movements:[{label:'푸시업 3×10–15'}, {label:'스쿼트 3×15'}, {label:'플랭크 3×30초'}, {label:'런지 3×10(양쪽)'}], equipment:[], safetyNote },
  { id:'gym-flex-mat', environment:'gym', style:'flexibility', goalFit:['cut','maintain','bulk'], metValue:2.5, title:'매트 스트레칭·모빌리티', minutes:20, intensity:'easy', movements:[{label:'고양이-소 스트레칭 1분'}, {label:'골반 개방 스트레칭 5분'}, {label:'전신 정적 스트레칭 10분'}], equipment:['매트'], safetyNote },
  { id:'home-flex-yoga', environment:'home', style:'flexibility', goalFit:['cut','maintain','bulk'], metValue:2.5, title:'홈 요가 루틴', minutes:20, intensity:'easy', movements:[{label:'태양경배자세 5분'}, {label:'전굴·후굴 스트레칭 10분'}, {label:'호흡과 함께 정리 5분'}], equipment:['매트'], safetyNote },
  { id:'gym-hiit-circuit', environment:'gym', style:'hiit', goalFit:['cut'], metValue:8.0, title:'서킷 HIIT', minutes:25, intensity:'hard', movements:[{label:'케틀벨 스윙 40초/휴식 20초 ×8',guideId:'kettlebell-swing'}, {label:'로잉 머신 40초/휴식 20초 ×4',guideId:'rowing-machine'}], equipment:['케틀벨', '로잉 머신'], safetyNote },
  { id:'home-hiit-tabata', environment:'home', style:'hiit', goalFit:['cut'], metValue:8.0, title:'타바타 4분 라운드', minutes:16, intensity:'hard', movements:[{label:'버피 20초/휴식 10초 ×8'}, {label:'마운틴 클라이머 20초/휴식 10초 ×8'}], equipment:[], safetyNote },
]

export const activityTemplates:ActivityTemplate[] = [...basicTemplates, ...approvedWeekTemplates, ...newTemplates]
