// Builds the Emergency room screen and runs its frame loop.
import type { GameState } from '../core/state'
import { Triage } from '../departments/emergency/triage'
import { mountTriageView } from '../departments/emergency/triageView'
import { createHud } from './hud'
import { createUpgradePanel } from './upgradePanel'

// Longest step allowed in one frame, so a hitch doesn't skip patients.
const MAX_DT = 0.1

export function showEmergencyScreen(app: HTMLElement, state: GameState): void {
  app.innerHTML = `
    <div class="room">
      <header class="room-header"></header>
      <div class="room-body">
        <div class="play-area">
          <canvas class="triage-canvas"></canvas>
          <p class="play-hint">Read the complaint, then click a bay or press 1 / 2 / 3.</p>
        </div>
        <aside class="upgrade-panel"></aside>
      </div>
    </div>
  `
  const hud = createHud(app.querySelector('.room-header')!, state)
  const panel = createUpgradePanel(app.querySelector('.upgrade-panel')!, state)
  const triage = new Triage(state)
  const view = mountTriageView(app.querySelector('.triage-canvas')!, triage, state)
  // Dev-only handle for poking at the game from the browser console. Removed from builds.
  if (import.meta.env.DEV) Object.assign(window, { __rl: { state, triage } })

  let last = performance.now()
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, MAX_DT)
    last = now
    view.update(dt)
    view.draw()
    hud.update()
    panel.update()
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
