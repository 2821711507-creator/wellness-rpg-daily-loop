import { calculateSmoothie, type SmoothieItem } from '../domain/smoothie'
import { ingredients } from '../data/ingredients'

export function SmoothieCard({ items, onChange }: { items: SmoothieItem[]; onChange: (items: SmoothieItem[]) => void }) {
  const total = calculateSmoothie(items, ingredients)
  return <section className="panel smoothie-card"><header><div><p className="eyebrow">아침 스무디</p><h2>블렌더 포션</h2></div><strong>{total.kcal} kcal</strong></header><div className="ingredients">{items.map((item, index) => { const ingredient = ingredients.find(entry => entry.id === item.ingredientId)!; return <label key={item.ingredientId}>{ingredient.name}<span><input aria-label={`${ingredient.name} 중량`} type="number" min="1" value={item.grams} onChange={event => onChange(items.map((entry, i) => i === index ? { ...entry, grams: Number(event.target.value) } : entry))} /> g</span></label> })}</div><div className="macro-row"><span>단백질 <b>{total.protein}g</b></span><span>탄수화물 <b>{total.carbs}g</b></span><span>지방 <b>{total.fat}g</b></span></div>{total.warnings.map(warning => <p className="warning" key={warning}>{warning}</p>)}<button className="text-button">제품 라벨 값으로 수정</button></section>
}
