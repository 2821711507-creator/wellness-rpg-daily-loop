import { describe, expect, it } from 'vitest'
import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'
import { equipItem, getAvatarLayerIds, normalizeAvatarState, selectGender, selectSkin, unequipItem, type AvatarGender } from './avatar'

describe('layered avatar', () => {
  it('starts in an underlayer with no optional equipment', () => {
    expect(AVATAR_DEFAULTS.unlockedIds).toEqual(['hair-short', 'hair-bob'])
    expect(AVATAR_DEFAULTS.equipped).toEqual({ hair:'hair-short' })
  })

  it('defines the approved deterministic reward track', () => {
    expect(Object.fromEntries(AVATAR_PARTS.filter(p => p.unlockLevel).map(p => [p.id, p.unlockLevel]))).toMatchObject({
      'shoes-trainers':2, 'hair-wave':2, 'top-runner':3, 'bottom-pants':4,
      'shoes-walk':5, 'hair-tied':5, 'top-gym':6, 'bottom-shorts':6,
      'top-walk':7, 'hat-wellness-cap':8, 'accessory-bottle-pouch':9,
    })
  })

  it.each([
    ['masculine', 'male'],
    ['feminine', 'female'],
  ] as const)('migrates the legacy %s base to %s', (base, gender) => {
    const result = normalizeAvatarState({ base, unlockedIds:['runner-top'], equipped:{ top:'runner-top' } })
    expect(result).toMatchObject({ gender, equipped:{ top:'top-runner' } })
    expect(result.unlockedIds).toContain('top-runner')
  })

  it('recovers invalid required selections and omits invalid optional ones', () => {
    const result = normalizeAvatarState({ gender:'unknown', skin:'orange', unlockedIds:['bad'], equipped:{ hair:'bad', top:'bad', bottom:'bad', shoes:'bad', hat:'bad', accessory:'bad' } })
    expect(result).toEqual(AVATAR_DEFAULTS)
  })

  it('selects gender and skin without changing equipped items', () => {
    expect(selectGender(AVATAR_DEFAULTS, 'female')).toEqual({ ...AVATAR_DEFAULTS, gender:'female' })
    expect(selectSkin(AVATAR_DEFAULTS, 'deep')).toEqual({ ...AVATAR_DEFAULTS, skin:'deep' })
  })

  it.each(['male', 'female'] satisfies AvatarGender[])('allows the starter hair items on %s', gender => {
    const starting = { ...AVATAR_DEFAULTS, gender }
    for (const part of AVATAR_PARTS.filter(item => starting.unlockedIds.includes(item.id))) {
      expect(() => equipItem(starting, part.id)).not.toThrow()
    }
  })

  it('rejects locked items', () => {
    expect(() => equipItem({ ...AVATAR_DEFAULTS, unlockedIds:[] }, 'top-walk')).toThrow('잠긴')
  })

  it('unequips optional clothing without changing the base or hair', () => {
    const state = { ...AVATAR_DEFAULTS, equipped:{ hair:'hair-short', top:'top-runner', shoes:'shoes-trainers' } }
    expect(unequipItem(state, 'top').equipped).toEqual({ hair:'hair-short', shoes:'shoes-trainers' })
    expect(() => unequipItem(state, 'hair')).toThrow('머리는 해제할 수 없습니다.')
  })

  it.each([
    ['bottom', 'bottom-pants'],
    ['shoes', 'shoes-trainers'],
    ['hat', 'hat-wellness-cap'],
    ['accessory', 'accessory-bottle-pouch'],
  ] as const)('unequips the optional %s slot', (slot, itemId) => {
    const state = { ...AVATAR_DEFAULTS, equipped:{ hair:'hair-short', [slot]:itemId } }
    expect(unequipItem(state, slot).equipped).toEqual({ hair:'hair-short' })
  })

  it('normalizes a new empty clothing state without adding defaults', () => {
    const result = normalizeAvatarState({ gender:'female', skin:'medium', unlockedIds:['hair-short'], equipped:{ hair:'hair-short' } })
    expect(result.equipped).toEqual({ hair:'hair-short' })
  })

  it('preserves valid stored ownership without inferring locked rewards', () => {
    const result = normalizeAvatarState({ gender:'female', skin:'medium', unlockedIds:['top-runner'], equipped:{ hair:'hair-short', top:'top-runner' } })
    expect(result.unlockedIds).toEqual(['hair-short', 'hair-bob', 'top-runner'])
    expect(result.equipped).toEqual({ hair:'hair-short', top:'top-runner' })
  })

  it('returns the fixed visual layer order', () => {
    const state = { ...AVATAR_DEFAULTS, gender:'female' as const, equipped:{ hair:'hair-wave', bottom:'bottom-pants', top:'top-runner', shoes:'shoes-trainers' } }
    expect(getAvatarLayerIds(state)).toEqual([
      'hair-wave-back', 'base-female', 'bottom-pants', 'top-runner',
      'shoes-trainers', 'hair-wave-front',
    ])
  })
})
