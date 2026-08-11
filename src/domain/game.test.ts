import { describe, expect, it } from 'vitest'
import { completeQuest, rolloverDailyQuests, type GameState } from './game'
const state: GameState = { level: 1, xp: 90, coins: 0, quests: [{ id: 'walk', title: '산보', kind: 'activity', xp: 20, coins: 5, completed: false }], processedEventIds: [] }
describe('completeQuest', () => {
  it('levels up and preserves XP remainder', () => { expect(completeQuest(state, 'walk', 'event-1')).toMatchObject({ level: 2, xp: 10, coins: 5 }) })
  it('processes an event only once', () => { const once = completeQuest(state, 'walk', 'event-1'); expect(completeQuest(once, 'walk', 'event-1')).toEqual(once) })

  it('resets completed quests once on a new date while retaining processed event IDs', () => {
    const completed = completeQuest({ ...state, questDate:'2026-08-11' }, 'walk', 'walk-2026-08-11')
    const nextDay = rolloverDailyQuests(completed, '2026-08-12')
    expect(nextDay).toMatchObject({ questDate:'2026-08-12', quests:[{ completed:false }] })
    expect(nextDay.processedEventIds).toEqual(['walk-2026-08-11'])
    expect(rolloverDailyQuests(nextDay, '2026-08-12')).toBe(nextDay)

    const rewarded = completeQuest(nextDay, 'walk', 'walk-2026-08-12')
    expect(rewarded).toMatchObject({ level:2, xp:30, coins:10, quests:[{ completed:true }] })
    expect(completeQuest(rewarded, 'walk', 'walk-2026-08-12')).toBe(rewarded)
  })

  it('safely stamps legacy state without reopening completed quests', () => {
    const legacy = { ...state, quests:state.quests.map(quest => ({ ...quest, completed:true })), processedEventIds:['walk-legacy'] }
    const migrated = rolloverDailyQuests(legacy, '2026-08-11')
    expect(migrated.questDate).toBe('2026-08-11')
    expect(migrated.quests[0].completed).toBe(true)
    expect(migrated.processedEventIds).toEqual(['walk-legacy'])
  })
})
