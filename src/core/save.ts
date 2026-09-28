// Save and load the game to the browser's localStorage.
import { createNewState, SAVE_VERSION, type GameState } from './state'

const SAVE_KEY = 'resident-life-save'
const AUTOSAVE_MS = 5000

// Turned off during a reset, so the page can't re-save while it reloads.
let savingEnabled = true

export function saveGame(state: GameState): void {
  if (!savingEnabled) return
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked (e.g. private mode). The game still runs.
  }
}

export function loadGame(): GameState {
  const fresh = createNewState()
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return fresh
    const data = JSON.parse(raw)
    // Future save versions get migrated here, one version at a time.
    if (data?.version !== SAVE_VERSION) return fresh
    // Merge onto a fresh state so newly added fields and upgrades start at their defaults.
    return { ...fresh, ...data, upgrades: { ...fresh.upgrades, ...data.upgrades } }
  } catch {
    return fresh
  }
}

export function startAutosave(state: GameState): void {
  setInterval(() => saveGame(state), AUTOSAVE_MS)
  window.addEventListener('beforeunload', () => saveGame(state))
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame(state)
  })
}

export function resetSave(): void {
  savingEnabled = false
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing to remove.
  }
  location.reload()
}
