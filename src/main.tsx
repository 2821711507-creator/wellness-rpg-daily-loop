import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import './weeklyPlan.css'
import './records.css'
import './avatar.css'
import './auth.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
