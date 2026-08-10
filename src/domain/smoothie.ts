export interface Nutrients { kcal: number; protein: number; carbs: number; fat: number; fiber: number }
export interface Ingredient { id: string; name: string; per100g: Nutrients; sourceLabel: string }
export interface SmoothieItem { ingredientId: string; grams: number }

export function calculateSmoothie(items: SmoothieItem[], ingredients: Ingredient[]): Nutrients & { warnings: string[] } {
  const totals: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const item of items) {
    if (item.grams <= 0) throw new Error('중량은 0보다 커야 합니다.')
    const ingredient = ingredients.find(entry => entry.id === item.ingredientId)
    if (!ingredient) throw new Error('등록되지 않은 재료입니다.')
    for (const key of Object.keys(totals) as (keyof Nutrients)[]) totals[key] += ingredient.per100g[key] * item.grams / 100
  }
  totals.kcal = Math.round(totals.kcal)
  for (const key of ['protein', 'carbs', 'fat', 'fiber'] as const) totals[key] = Math.round(totals[key] * 10) / 10
  return { ...totals, warnings: totals.protein < 20 ? ['단백질이 낮은 식사입니다.'] : [] }
}
