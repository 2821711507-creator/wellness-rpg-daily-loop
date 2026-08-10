export interface Quest { id: string; title: string; kind: 'meal-log'|'activity'|'recovery'; xp: number; coins: number; completed: boolean }
export interface GameState { level: number; xp: number; coins: number; quests: Quest[]; processedEventIds: string[] }
export function completeQuest(state: GameState, questId: string, eventId: string): GameState {
  if (state.processedEventIds.includes(eventId)) return state
  const quest = state.quests.find(item => item.id === questId)
  if (!quest || quest.completed) return state
  const total = state.xp + quest.xp
  return { ...state, level: state.level + Math.floor(total / 100), xp: total % 100, coins: state.coins + quest.coins, quests: state.quests.map(item => item.id === questId ? { ...item, completed: true } : item), processedEventIds: [...state.processedEventIds, eventId].slice(-200) }
}
