# Adaptive Training Week Design

**Date:** 2026-08-11
**Status:** Approved for autonomous implementation
**Scope:** Add a recovery-aware training guide for 2026-08-10 through 2026-08-16 without replacing the existing meal plan.

## Goal

The plan must recognize Tuesday's completed cardio, light strength, and HIIT instead of compensating for Monday. It then prioritizes recovery, two structured strength sessions, light-to-moderate aerobic work, and an optional Sunday rest decision.

## Weekly Schedule

| Date | State | Guidance |
| --- | --- | --- |
| Mon 2026-08-10 | skipped | No make-up session |
| Tue 2026-08-11 | completed | Cardio 30 min, light strength, post-dinner HIIT |
| Wed 2026-08-12 | recovery | Brisk walk/bike 30–40 min and stretching 10 min |
| Thu 2026-08-13 | planned | Upper-body strength 45–60 min and light cardio 15–20 min |
| Fri 2026-08-14 | rest | Rest; optional 30-minute post-meal walk |
| Sat 2026-08-15 | planned | Lower-body/core strength 45–60 min and light cardio 15–20 min |
| Sun 2026-08-16 | conditional | Light cardio 30–45 min; rest if legs are very sore |

Thursday lists machine chest press, lat pulldown, seated row, shoulder press, biceps curl, and triceps pressdown. Saturday lists leg press, leg extension, leg curl, glute bridge/hip thrust, calf work, and crunches or planks. Strength movements use 3 sets of 8–12 repetitions as a starting target.

## Rules and Copy

- Do not schedule make-up work for Monday.
- Do not add another HIIT session this week.
- Do not prescribe compensatory exercise before Saturday's flexible meal.
- Describe the single-HIIT limit as this week's recovery decision, not a universal medical rule.
- Show a stop-and-rest message for sharp pain, dizziness, chest pain, or unusual symptoms.
- Existing saved plans remain valid. The guide is additive and may be restored into this exact week without resetting meals, activities, completion, profile, or records.
- The guide is informational, not medical treatment. Users with relevant conditions should follow clinician advice.

## Architecture

`weeklyTrainingGuidance.ts` owns the immutable dated guide and a pure reconciliation function. `WeeklyPlan` gains optional `trainingGuidance`; validation accepts old plans without it and validates new entries when present. The hook attaches the guide when generating or restoring the target week. `TrainingWeekGuide` renders the guide above the existing seven-day meal/activity board.

## Verification

Domain tests prove exact dates, completed Tuesday, no extra HIIT, two strength days, conditional Sunday, and idempotent reconciliation. Validation tests prove backward compatibility. Component tests prove all seven days, exercise details, recovery language, and non-compensation copy are visible. Full tests, build, and 390/1024px overflow checks are required.
