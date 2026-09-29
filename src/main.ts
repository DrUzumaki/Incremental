// Entry point: load the save, show the title screen, then the game.
import './style.css'
import { Game } from './core/game'
import { loadGame, startAutosave } from './core/save'
import { showGameScreen } from './ui/gameScreen'
import { showTitleScreen } from './ui/titleScreen'

const app = document.querySelector<HTMLDivElement>('#app')!
const { state } = loadGame()
const game = new Game(state)
startAutosave(state)
// Dev-only handle for poking at the game from the browser console. Removed from builds.
if (import.meta.env.DEV) Object.assign(window, { __rl: game })

showTitleScreen(app, () => showGameScreen(app, game, () => {}))
