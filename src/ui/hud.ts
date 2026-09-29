// Top bar: room name, the room's currency counter and income rate, and buttons.
// The counter ticks up smoothly (never jumps) and bumps when flying money lands.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { resetSave } from '../core/save'
import { anyAffordable } from '../core/tree'
import { DEPTS } from '../data/departments'

const COUNTER_SPEED = 6 // how fast the shown number catches up (higher = snappier)

export function createHud(container: HTMLElement, game: Game, onTree: () => void) {
  container.innerHTML = `
    <h2 class="room-name"></h2>
    <div class="counter">
      <div class="money"></div>
      <div class="rate"></div>
    </div>
    <div class="topbar-actions">
      <button class="tree-btn" type="button">Skill tree <span class="badge" hidden>!</span></button>
      <button class="effects-btn" type="button"></button>
      <button class="reset-btn" type="button">Reset save</button>
    </div>
  `
  const name = container.querySelector<HTMLHeadingElement>('.room-name')!
  const money = container.querySelector<HTMLDivElement>('.money')!
  const rate = container.querySelector<HTMLDivElement>('.rate')!
  const effectsBtn = container.querySelector<HTMLButtonElement>('.effects-btn')!
  const badge = container.querySelector<HTMLSpanElement>('.badge')!
  container.querySelector('.tree-btn')!.addEventListener('click', onTree)
  container.querySelector('.reset-btn')!.addEventListener('click', () => {
    if (confirm('Erase all progress and start over?')) resetSave()
  })
  effectsBtn.addEventListener('click', () => {
    game.state.settings.reduceEffects = !game.state.settings.reduceEffects
  })

  let shownDept = game.viewing
  let shown = game.state.depts[shownDept].currency

  return {
    // Screen position of the counter, where flying money heads.
    target() {
      const r = money.getBoundingClientRect()
      return { x: r.left + Math.min(r.width, 60) / 2, y: r.top + r.height / 2 }
    },
    bump() {
      money.classList.remove('bump')
      void money.offsetWidth // restart the CSS animation
      money.classList.add('bump')
    },
    update(dt: number) {
      const dept = game.viewing
      const actual = game.state.depts[dept].currency
      // Snap when switching rooms or spending; glide when earning.
      if (dept !== shownDept || actual < shown) {
        shownDept = dept
        shown = actual
      } else {
        shown += (actual - shown) * Math.min(1, dt * COUNTER_SPEED)
        if (actual - shown < 0.01) shown = actual
      }
      name.textContent = DEPTS[dept].name
      money.textContent = formatCurrency(dept, shown)
      const idle = game.idleRate(dept)
      rate.textContent = idle > 0 ? `+${formatCurrency(dept, idle, true)}/s idle` : ''
      badge.hidden = !anyAffordable(game.state, dept)
      effectsBtn.textContent = game.state.settings.reduceEffects ? 'Effects: reduced' : 'Effects: full'
    },
  }
}
