import { Onboarding } from './components/Onboarding'
import { TodayScreen } from './components/TodayScreen'
import { useWellnessGame } from './hooks/useWellnessGame'

export function App() { const game = useWellnessGame(); if (!game.state.profile) return <Onboarding onComplete={game.onboard}/>; return <><TodayScreen state={game.state} setSmoothie={game.setSmoothie} setActivity={game.setActivity} complete={game.complete} setBase={game.setBase}/>{game.warning && <p role="status">{game.warning}</p>}</> }
