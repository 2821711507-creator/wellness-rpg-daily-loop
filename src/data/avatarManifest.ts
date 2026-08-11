import type { AvatarPart, AvatarState } from '../domain/avatar'

export const AVATAR_PARTS: AvatarPart[] = [
  { id:'base-male', name:'남성 캐릭터', slot:'base', selectionSlot:'base', author:'project', license:'project-owned' },
  { id:'base-female', name:'여성 캐릭터', slot:'base', selectionSlot:'base', author:'project', license:'project-owned' },
  { id:'hair-short', name:'짧은 머리', slot:'hairFront', selectionSlot:'hair', layerIds:['hair-short-back', 'hair-short-front'], author:'project', license:'project-owned' },
  { id:'hair-bob', name:'단발 머리', slot:'hairFront', selectionSlot:'hair', layerIds:['hair-bob-back', 'hair-bob-front'], author:'project', license:'project-owned' },
  { id:'hair-wave', name:'웨이브 머리', slot:'hairFront', selectionSlot:'hair', layerIds:['hair-wave-back', 'hair-wave-front'], unlockLevel:2, author:'project', license:'project-owned' },
  { id:'hair-tied', name:'묶은 머리', slot:'hairFront', selectionSlot:'hair', layerIds:['hair-tied-back', 'hair-tied-front'], unlockLevel:5, author:'project', license:'project-owned' },
  { id:'top-runner', name:'러닝복', slot:'top', selectionSlot:'top', unlockLevel:3, author:'project', license:'project-owned' },
  { id:'top-gym', name:'헬스장복', slot:'top', selectionSlot:'top', unlockLevel:6, author:'project', license:'project-owned' },
  { id:'top-walk', name:'산보복', slot:'top', selectionSlot:'top', unlockLevel:7, author:'project', license:'project-owned' },
  { id:'bottom-pants', name:'트레이닝 바지', slot:'bottom', selectionSlot:'bottom', unlockLevel:4, author:'project', license:'project-owned' },
  { id:'bottom-shorts', name:'반바지', slot:'bottom', selectionSlot:'bottom', unlockLevel:6, author:'project', license:'project-owned' },
  { id:'shoes-trainers', name:'운동화', slot:'shoes', selectionSlot:'shoes', unlockLevel:2, author:'project', license:'project-owned' },
  { id:'shoes-walk', name:'워킹화', slot:'shoes', selectionSlot:'shoes', unlockLevel:5, author:'project', license:'project-owned' },
]

export const AVATAR_DEFAULTS: AvatarState = {
  gender:'male',
  skin:'medium',
  unlockedIds:AVATAR_PARTS.filter(part => part.selectionSlot !== 'base').map(part => part.id),
  equipped:{ hair:'hair-short', top:'top-runner', bottom:'bottom-pants', shoes:'shoes-trainers' },
}
