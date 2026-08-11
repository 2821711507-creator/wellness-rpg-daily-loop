import { describe, expect, it } from 'vitest'
import { parseCompletionEvents, parseWeightEntries } from './recordsValidation'

describe('record array validation', () => {
  const weights = [{ id:'weight-2026-08-10', date:'2026-08-10', weightKg:70.2, recordedAt:'2026-08-10T07:00:00+09:00' }]
  const events = [{ id:'record-planned-meal-one', date:'2026-08-10', kind:'planned-meal', plannedItemId:'one', xpEarned:20 }]

  it('accepts valid weight and completion arrays', () => {
    expect(parseWeightEntries(weights, '2026-08-11')).toEqual({ entries:weights })
    expect(parseCompletionEvents(events, '2026-08-11')).toEqual({ events })
  })

  it.each([
    [{ ...weights[0], weightKg:10 }],
    [{ ...weights[0], date:'2026-08-12' }],
    [weights[0], { ...weights[0], id:'other' }],
  ])('rejects invalid or duplicate weight records', (...invalid) => {
    expect(parseWeightEntries(invalid, '2026-08-11')).toEqual({ entries:[], warning:'체중 기록을 복구하지 못해 체중 기록만 초기화했어요.' })
  })

  it.each([
    [{ ...events[0], kind:'unknown' }],
    [{ ...events[0], xpEarned:-1 }],
    [events[0], { ...events[0] }],
  ])('rejects invalid or duplicate completion events', (...invalid) => {
    expect(parseCompletionEvents(invalid, '2026-08-11')).toEqual({ events:[], warning:'완료 기록을 복구하지 못해 완료 기록만 초기화했어요.' })
  })
})
