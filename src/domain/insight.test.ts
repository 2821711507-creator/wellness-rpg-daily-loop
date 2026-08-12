import { describe, expect, it } from 'vitest'
import { generateWeeklyInsight, type InsightInput } from './insight'
import type { WeeklyRecordSummary } from './records'

const summary = (overrides: Partial<WeeklyRecordSummary> = {}): WeeklyRecordSummary => ({
  weekStart:'2026-08-10', plannedMeals:14, completedMeals:10, plannedActivities:3,
  completedActivities:2, completionRate:71, xpEarned:100, weightDays:7, ...overrides,
})

const input = (overrides: Partial<InsightInput> = {}): InsightInput => ({
  current:summary(), previous:summary({ weekStart:'2026-08-03' }),
  trend:{ currentAverageKg:70, previousAverageKg:70.4, changeKg:-0.4, recentRecordDays:7 },
  currentWeightKg:70, previousChangeKg:-0.3, ...overrides,
})

describe('weekly insight', () => {
  it('asks for more records instead of interpreting fewer than four days', () => {
    const result = generateWeeklyInsight(input({ trend:{ currentAverageKg:null, previousAverageKg:70, changeKg:null, recentRecordDays:3 } }))
    expect(result.status).toBe('insufficient-data')
    expect(result.interpretation).toBeNull()
    expect(result.observations).toContain('최근 7일 중 3일의 체중을 기록했어요. 분석하려면 최소 4일의 기록이 필요해요.')
  })

  it.each([
    [-0.1, '평균 체중이 비슷하게 유지됐어요.'],
    [-0.4, '7일 평균 체중이 지난 기간보다 0.4kg 낮아졌어요.'],
    [0.4, '7일 평균 체중이 지난 기간보다 0.4kg 높아졌어요.'],
  ])('describes a %skg change neutrally', (changeKg, interpretation) => {
    expect(generateWeeklyInsight(input({ trend:{ currentAverageKg:70, previousAverageKg:70 - changeKg, changeKg, recentRecordDays:7 } })).interpretation).toBe(interpretation)
  })

  it('adds a consultation note only for repeated fast loss', () => {
    const result = generateWeeklyInsight(input({ trend:{ currentAverageKg:68, previousAverageKg:69, changeKg:-1, recentRecordDays:7 }, currentWeightKg:68, previousChangeKg:-1.1 }))
    expect(result.observations).toContain('빠른 변화가 이어지면 의료 전문가와 상의해 주세요.')
  })

  it('suggests a lighter plan below 50 percent and maintenance at 80 percent', () => {
    const lighter = generateWeeklyInsight(input({ current:summary({ completionRate:43 }) }))
    expect(lighter.suggestions).toContain('다음 주 계획을 한 단계 가볍게 조정해 보세요.')
    const maintain = generateWeeklyInsight(input({ current:summary({ completionRate:86 }) }))
    expect(maintain.suggestions).toContain('현재 루틴을 한 주 더 유지해 보세요.')
    expect(maintain.suggestions.length).toBeLessThanOrEqual(2)
  })

  it('keeps output deterministic, evidence-labelled, and free of forbidden advice', () => {
    const first = generateWeeklyInsight(input())
    expect(first).toEqual(generateWeeklyInsight(input()))
    expect(first.evidenceIds).toEqual(expect.arrayContaining(['cdc-gradual-loss', 'niddk-adult-safety', 'daily-self-weighing']))
    expect(JSON.stringify(first)).not.toMatch(/약물|보충제|진단|도달일|칼로리.*삭감/)
  })
})
