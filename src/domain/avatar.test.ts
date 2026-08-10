import { describe, expect, it } from 'vitest'
import { equipItem, selectBase } from './avatar'
const state = { base: 'masculine' as const, unlockedIds: ['runner-top'], equipped: {} }
describe('avatar', () => {
  it('selects a base independently', () => { expect(selectBase(state, 'feminine').base).toBe('feminine') })
  it('equips unlocked items and rejects locked ones', () => { expect(equipItem(state, 'runner-top').equipped.top).toBe('runner-top'); expect(() => equipItem(state, 'locked-hat')).toThrow('잠긴') })
})
