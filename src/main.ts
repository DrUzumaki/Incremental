// Entry point: load the save, show the title screen, then the Emergency room.
import './style.css'
import { loadGame, startAutosave } from './core/save'
import { showEmergencyScreen } from './ui/emergencyScreen'
import { showTitleScreen } from './ui/titleScreen'

const app = document.querySelector<HTMLDivElement>('#app')!
const state = loadGame()
startAutosave(state)

showTitleScreen(app, () => showEmergencyScreen(app, state))
