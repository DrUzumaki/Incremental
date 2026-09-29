// Builds the in-game screen (top bar, room, panels) and wires it to the game loop.
import type { Game } from '../core/game'
import { startLoop } from '../core/loop'
import { mountTriageView } from '../departments/emergency/triageView'
import { createHud } from './hud'
import { createUpgradePanel } from './upgradePanel'

export function showGameScreen(app: HTMLElement, game: Game, onOffline: (seconds: number) => void): void {
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
  const hud = createHud(app.querySelector('.room-header')!, game)
  const panel = createUpgradePanel(app.querySelector('.upgrade-panel')!, game)
  const view = mountTriageView(app.querySelector('.triage-canvas')!, game)

  startLoop(game, onOffline, (dt) => {
    view.update(dt)
    view.draw()
    hud.update()
    panel.update()
  })
}
