import { describe, expect, it } from 'vitest'
import { movementGuides } from './movementGuides'

const EXPECTED_IDS = ['leg-press', 'chest-press', 'seated-row', 'leg-curl', 'shoulder-press', 'lat-pulldown', 'bicep-curl', 'tricep-pushdown', 'leg-extension', 'calf-raise', 'barbell-squat', 'bench-press', 'barbell-row', 'overhead-press', 'kettlebell-swing', 'rowing-machine', 'stair-mill', 'stationary-bike', 'hip-thrust']

describe('movementGuides', () => {
  it('has exactly the expected gym-equipment movement ids', () => {
    expect(Object.keys(movementGuides).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('gives every guide a real description and at least 2 steps', () => {
    for (const id of EXPECTED_IDS) {
      expect(movementGuides[id].description.length).toBeGreaterThan(0)
      expect(movementGuides[id].steps.length).toBeGreaterThanOrEqual(2)
      for (const step of movementGuides[id].steps) expect(step.length).toBeGreaterThan(0)
    }
  })
})
