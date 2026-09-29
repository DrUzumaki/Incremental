// Builds the in-game screen (top bar, room, skill tree) and wires it to the game loop.
import type { Game } from '../core/game'
import { startLoop } from '../core/loop'
import { mountTriageView } from '../departments/emergency/triageView'
import { createEffects } from './effects'
import { createHud } from './hud'
import { createSkillTree } from './skillTree'

export function showGameScreen(app: HTMLElement, game: Game, onOffline: (seconds: number) => void): void {
  app.innerHTML = `
    <div class="room">
      <header class="room-header"></header>
      <div class="room-body">
        <div class="play-area">
          <canvas class="triage-canvas"></canvas>
          <p class="play-hint">Read the complaint, then click a bay or press 1 / 2 / 3. Press T for the skill tree.</p>
        </div>
      </div>
    </div>
  `
  const fx = createEffects(game.state.settings)
  const body = app.querySelector<HTMLDivElement>('.room-body')!
  const tree = createSkillTree(body, game, fx)
  const hud = createHud(app.querySelector('.room-header')!, game, () => tree.toggle(game.viewing))
  const view = mountTriageView(app.querySelector('.triage-canvas')!, game, fx)
  fx.setMoneyTarget(hud.target)
  fx.setShakeTarget(app.querySelector('.play-area')!)
  let bumpCooldown = 0

  window.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') tree.toggle(game.viewing)
  })

  startLoop(game, onOffline, (dt) => {
    view.update(dt)
    view.draw()
    hud.update(dt)
    tree.draw(dt)
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
