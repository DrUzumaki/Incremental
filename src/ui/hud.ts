// Top bar: room name, the room's currency counter and income rate, and buttons.
// The counter ticks up smoothly (never jumps) and bumps when flying money lands.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { anyAffordable } from '../core/tree'
import { DEPTS } from '../data/departments'

const COUNTER_SPEED = 6 // how fast the shown number catches up (higher = snappier)

export interface HudActions {
  onTree(): void
  onTrials(): void
  trialsReady(): boolean
}

export function createHud(container: HTMLElement, game: Game, actions: HudActions) {
  container.innerHTML = `
    <h2 class="room-name"></h2>
    <div class="counter">
      <div class="money"></div>
      <div class="rate"></div>
    </div>
    <div class="topbar-actions">
      <button class="tree-btn" type="button">Skill tree <span class="badge" hidden>!</span></button>
      <button class="tree-btn trials-btn" type="button">Trials <span class="badge" hidden>!</span></button>
    </div>
  `
  const name = container.querySelector<HTMLHeadingElement>('.room-name')!
  const money = container.querySelector<HTMLDivElement>('.money')!
  const rate = container.querySelector<HTMLDivElement>('.rate')!
  const badge = container.querySelector<HTMLSpanElement>('.tree-btn .badge')!
  const trialsBadge = container.querySelector<HTMLSpanElement>('.trials-btn .badge')!
  container.querySelector('.tree-btn')!.addEventListener('click', actions.onTree)
  container.querySelector('.trials-btn')!.addEventListener('click', actions.onTrials)

  let shownDept = game.viewing
  let shown = game.state.depts[shownDept].currency

  return {
    actions: container.querySelector<HTMLDivElement>('.topbar-actions')!,
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
      trialsBadge.hidden = !actions.trialsReady()
    },
  }
}
