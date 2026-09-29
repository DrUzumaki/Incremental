// Entry point: load the save, pay out offline earnings, show the title screen, then the game.
import './style.css'
import { Game } from './core/game'
import { loadGame, startAutosave } from './core/save'
import { ECONOMY } from './data/economy'
import { showOfflineSummary } from './ui/celebrations'
import { showGameScreen } from './ui/gameScreen'
import { showTitleScreen } from './ui/titleScreen'

const app = document.querySelector<HTMLDivElement>('#app')!
const { state, isNew } = loadGame()
const game = new Game(state)

// Time away is measured now (before autosave updates the timestamp) and paid out
// once the player starts their shift, so any milestones it crosses get celebrated.
const away = (Date.now() - state.lastSeen) / 1000

startAutosave(state)
// Dev-only handle for poking at the game from the browser console. Removed from builds.
if (import.meta.env.DEV) Object.assign(window, { __rl: game })

showTitleScreen(app, () => {
  showGameScreen(app, game)
  if (!isNew && away >= ECONOMY.offlineMinSeconds) showOfflineSummary(game.applyOffline(away))
})
