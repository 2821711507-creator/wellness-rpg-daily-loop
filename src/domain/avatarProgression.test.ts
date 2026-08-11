import { describe, expect, it } from 'vitest'
import { AVATAR_DEFAULTS } from '../data/avatarManifest'
import { grantAvatarUnlocks } from './avatarProgression'

describe('avatar progression', () => {
  it('grants every crossed level once without equipping items', () => {
    const state = { ...AVATAR_DEFAULTS, unlockedIds:['hair-short', 'hair-bob'], equipped:{ hair:'hair-short' } }
    const result = grantAvatarUnlocks(state, 1, 4)
    expect(result.newIds).toEqual(['hair-wave', 'shoes-trainers', 'top-runner', 'bottom-pants'])
    expect(result.state.equipped).toEqual({ hair:'hair-short' })
    expect(grantAvatarUnlocks(result.state, 1, 4).newIds).toEqual([])
  })

  it('does not use weight or calories as progression input', () => {
    expect(grantAvatarUnlocks.length).toBe(3)
  })
})
