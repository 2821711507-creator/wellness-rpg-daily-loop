import { describe, expect, it } from 'vitest'
import { completeQuest, type GameState } from './game'
const state: GameState = { level: 1, xp: 90, coins: 0, quests: [{ id: 'walk', title: '산보', kind: 'activity', xp: 20, coins: 5, completed: false }], processedEventIds: [] }
describe('completeQuest', () => {
  it('levels up and preserves XP remainder', () => { expect(completeQuest(state, 'walk', 'event-1')).toMatchObject({ level: 2, xp: 10, coins: 5 }) })
  it('processes an event only once', () => { const once = completeQuest(state, 'walk', 'event-1'); expect(completeQuest(once, 'walk', 'event-1')).toEqual(once) })
})
