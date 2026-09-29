// Builds the in-game screen (top bar, room, panels) and wires it to the game loop.
import type { Game } from '../core/game'
import { startLoop } from '../core/loop'
import { mountTriageView } from '../departments/emergency/triageView'
import { createEffects } from './effects'
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
  const fx = createEffects(game.state.settings)
  const hud = createHud(app.querySelector('.room-header')!, game)
  const panel = createUpgradePanel(app.querySelector('.upgrade-panel')!, game)
  const view = mountTriageView(app.querySelector('.triage-canvas')!, game, fx)
  fx.setMoneyTarget(hud.target)
  fx.setShakeTarget(app.querySelector('.play-area')!)
  let bumpCooldown = 0

  startLoop(game, onOffline, (dt) => {
    view.update(dt)
    view.draw()
    hud.update(dt)
    panel.update()
    fx.update(dt)
    bumpCooldown -= dt
  })

  // The counter bumps as money lands (at most every 80 ms so it doesn't blur).
  fx.setOnArrive(() => {
    if (bumpCooldown > 0) return
    bumpCooldown = 0.08
    hud.bump()
  })
}
