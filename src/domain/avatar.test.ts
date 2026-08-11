import { describe, expect, it } from 'vitest'
import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'
import { equipItem, getAvatarLayerIds, normalizeAvatarState, selectGender, selectSkin, type AvatarGender } from './avatar'

describe('layered avatar', () => {
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

  it.each(['male', 'female'] satisfies AvatarGender[])('allows every first-release item on %s', gender => {
    const starting = { ...AVATAR_DEFAULTS, gender }
    for (const part of AVATAR_PARTS.filter(item => item.selectionSlot !== 'base')) {
      expect(() => equipItem(starting, part.id)).not.toThrow()
    }
  })

  it('rejects locked items', () => {
    expect(() => equipItem({ ...AVATAR_DEFAULTS, unlockedIds:[] }, 'top-walk')).toThrow('잠긴')
  })

  it('returns the fixed visual layer order', () => {
    const state = { ...AVATAR_DEFAULTS, gender:'female' as const, equipped:{ ...AVATAR_DEFAULTS.equipped, hair:'hair-wave' } }
    expect(getAvatarLayerIds(state)).toEqual([
      'hair-wave-back', 'base-female', 'bottom-pants', 'top-runner',
      'shoes-trainers', 'hair-wave-front',
    ])
  })
})
