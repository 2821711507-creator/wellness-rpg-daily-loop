import type { Ingredient } from '../domain/smoothie'

const demo = '100g당 데모 기본값 · 제품 라벨로 확인'
export const ingredients: Ingredient[] = [
  { id: 'oats', name: '오트밀', per100g: { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 }, sourceLabel: demo },
  { id: 'yogurt', name: '무가당 요거트', per100g: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 }, sourceLabel: demo },
  { id: 'soy', name: '무가당 강화 두유', per100g: { kcal: 33, protein: 3.3, carbs: 1.2, fat: 1.8, fiber: 0.6 }, sourceLabel: demo },
  { id: 'banana', name: '바나나', per100g: { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 }, sourceLabel: demo },
  { id: 'berries', name: '베리', per100g: { kcal: 50, protein: 0.7, carbs: 12, fat: 0.3, fiber: 2.4 }, sourceLabel: demo },
  { id: 'spinach', name: '시금치', per100g: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 }, sourceLabel: demo },
  { id: 'carrot', name: '당근', per100g: { kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 }, sourceLabel: demo },
]
