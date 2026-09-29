// Save and load the game to the browser's localStorage.
import { createNewState, SAVE_VERSION, type GameState } from './state'

const SAVE_KEY = 'resident-life-save'
const AUTOSAVE_MS = 5000

// Turned off during a reset, so the page can't re-save while it reloads.
let savingEnabled = true

export function saveGame(state: GameState): void {
  if (!savingEnabled) return
  state.lastSeen = Date.now()
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked (e.g. private mode). The game still runs.
  }
}

type Json = Record<string, unknown>

// Version 1 (step 2): one currency and five upgrades.
function migrateV1(data: Json): Json {
  const s = createNewState()
  const e = s.depts.emergency
  e.currency = Number(data.dollars) || 0
  e.lifetime = e.currency
  e.bestCombo = Number(data.bestCombo) || 0
  const upgrades = (data.upgrades ?? {}) as Record<string, number>
  // The five step-2 upgrades became Emergency tree nodes with the same ids.
  for (const id of ['stethoscopes', 'chairs', 'training', 'fastTrack', 'cards']) e.nodes[id] = upgrades[id] ?? 0
  return s as unknown as Json
}

// Copy saved values onto a fresh state, so fields added since the save get defaults.
function mergeInto(fresh: Json, saved: Json): Json {
  for (const key of Object.keys(saved)) {
    const f = fresh[key]
    const v = saved[key]
    if (f && typeof f === 'object' && !Array.isArray(f) && v && typeof v === 'object' && !Array.isArray(v)) {
      mergeInto(f as Json, v as Json)
    } else if (v !== undefined) {
      fresh[key] = v
    }
  }
  return fresh
}

// A save we can't read is copied here before autosave writes over it, so it can be recovered.
function backUp(raw: string) {
  try {
    localStorage.setItem(SAVE_KEY + '-backup-' + Date.now(), raw)
  } catch {
    // No room to back up; nothing more we can do.
  }
}

export function loadGame(): { state: GameState; isNew: boolean } {
  const fresh = createNewState()
  let raw: string | null = null
  try {
    raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { state: fresh, isNew: true }
    let data = JSON.parse(raw) as Json
    // Migrate old saves one version at a time.
    if (data.version === 1) data = migrateV1(data)
    if (data.version !== SAVE_VERSION) {
      backUp(raw)
      return { state: fresh, isNew: true }
    }
    return { state: mergeInto(fresh as unknown as Json, data) as unknown as GameState, isNew: false }
  } catch {
    if (raw) backUp(raw)
    return { state: fresh, isNew: true }
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
