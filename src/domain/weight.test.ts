import { describe, expect, it } from 'vitest'
import { calculateWeightTrend, deleteWeightEntry, summarizeWeightTrend, upsertWeightEntry, type WeightEntry } from './weight'

const entry = (date: string, weightKg: number): WeightEntry => ({ id: `weight-${date}`, date, weightKg, recordedAt: `${date}T07:00:00+09:00` })

describe('weight entries', () => {
  it('rounds and inserts a valid weight immutably', () => {
    const original = [entry('2026-08-10', 72.8)]
    const result = upsertWeightEntry(original, { date: '2026-08-11', weightKg: 72.46, recordedAt: '2026-08-11T07:00:00+09:00' }, '2026-08-11')
    expect(result).toEqual({ ok: true, entries: [original[0], entry('2026-08-11', 72.5)] })
    expect(original).toHaveLength(1)
  })

  it.each([
    [19.9, '체중은 20.0kg 이상 입력해 주세요.'],
    [350.1, '체중은 350.0kg 이하 입력해 주세요.'],
  ])('rejects an out-of-range value %s', (weightKg, message) => {
    expect(upsertWeightEntry([], { date: '2026-08-11', weightKg, recordedAt: '2026-08-11T07:00:00+09:00' }, '2026-08-11')).toEqual({ ok: false, message })
  })

  it('rejects invalid and future dates', () => {
    expect(upsertWeightEntry([], { date: 'bad', weightKg: 70, recordedAt: 'now' }, '2026-08-11')).toEqual({ ok: false, message: '올바른 날짜를 입력해 주세요.' })
    expect(upsertWeightEntry([], { date: '2026-08-12', weightKg: 70, recordedAt: 'now' }, '2026-08-11')).toEqual({ ok: false, message: '미래 날짜의 체중은 기록할 수 없어요.' })
  })

  it('replaces one date and keeps entries sorted', () => {
    const middle = entry('2026-08-11', 72)
    const original = [entry('2026-08-12', 71.8), middle, entry('2026-08-10', 72.4)]
    const result = upsertWeightEntry(original, { date: '2026-08-11', weightKg: 71.7, recordedAt: '2026-08-11T08:00:00+09:00' }, '2026-08-12')
    expect(result.ok && result.entries.map(item => [item.date, item.weightKg])).toEqual([
      ['2026-08-10', 72.4], ['2026-08-11', 71.7], ['2026-08-12', 71.8],
    ])
    expect(original[1]).toBe(middle)
  })

  it('deletes only the selected local date', () => {
    expect(deleteWeightEntry([entry('2026-08-10', 72), entry('2026-08-11', 71.8)], '2026-08-10')).toEqual([entry('2026-08-11', 71.8)])
  })
})

describe('weight trend', () => {
  it('returns 28 calendar days and requires four records in each seven-day window', () => {
    const entries = [entry('2026-08-28', 72), entry('2026-08-30', 71.8), entry('2026-09-01', 71.6), entry('2026-09-03', 71.4)]
    const points = calculateWeightTrend(entries, '2026-09-03')
    expect(points).toHaveLength(28)
    expect(points[0].date).toBe('2026-08-07')
    expect(points.at(-1)).toEqual({ date: '2026-09-03', weightKg: 71.4, rollingAverageKg: 71.7 })
    expect(points.find(point => point.date === '2026-09-01')?.rollingAverageKg).toBeNull()
    expect(points.find(point => point.date === '2026-08-29')?.weightKg).toBeNull()
  })

  it('summarizes current and previous seven-day averages', () => {
    const entries = [
      entry('2026-07-30', 73), entry('2026-08-01', 72.8), entry('2026-08-03', 72.6), entry('2026-08-04', 72.4),
      entry('2026-08-05', 72.2), entry('2026-08-07', 72), entry('2026-08-09', 71.8), entry('2026-08-11', 71.6),
    ]
    const summary = summarizeWeightTrend(calculateWeightTrend(entries, '2026-08-11'))
    expect(summary).toEqual({ currentAverageKg: 71.9, previousAverageKg: 72.7, changeKg: -0.8, recentRecordDays: 4 })
  })
})
