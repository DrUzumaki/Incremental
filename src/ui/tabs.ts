// Department tabs: one per unlocked room, plus the next locked room as a goal.
import { formatCurrency, formatNumber } from '../core/format'
import type { Game } from '../core/game'
import { anyAffordable } from '../core/tree'
import { DEPT_ORDER, DEPTS, type DeptId } from '../data/departments'
import { ECONOMY } from '../data/economy'

export function createTabs(container: HTMLElement, game: Game, onSwitch: (dept: DeptId) => void) {
  const tabs = DEPT_ORDER.map((id) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'dept-tab'
    b.style.setProperty('--dept', DEPTS[id].color)
    b.innerHTML = `
      <span class="tab-name">${DEPTS[id].name}<span class="tab-check" hidden> ✓</span></span>
      <span class="tab-amount"></span>
      <span class="tab-boost" hidden></span>
      <span class="badge" hidden>!</span>
    `
    b.addEventListener('click', () => {
      if (game.state.depts[id].unlocked) onSwitch(id)
    })
    container.appendChild(b)
    return {
      id,
      b,
      check: b.querySelector<HTMLSpanElement>('.tab-check')!,
      amount: b.querySelector<HTMLSpanElement>('.tab-amount')!,
      badge: b.querySelector<HTMLSpanElement>('.badge')!,
      boost: b.querySelector<HTMLSpanElement>('.tab-boost')!,
    }
  })

  return {
    update() {
      const nextLocked = DEPT_ORDER.find((id) => !game.state.depts[id].unlocked)
      for (const t of tabs) {
        const d = game.state.depts[t.id]
        const isNext = t.id === nextLocked
        t.b.hidden = !d.unlocked && !isNext
        t.b.classList.toggle('active', game.viewing === t.id)
        t.b.classList.toggle('locked', !d.unlocked)
        t.b.disabled = !d.unlocked
        t.check.hidden = !d.signedOff
        // Pager boosts and caffeine IV buffs, with the time left on the longest.
        const left = Math.max(game.pager.boostLeft(t.id), game.buffLeft(t.id))
        const mult = game.pager.boostMult(t.id) * game.buffMult(t.id)
        t.boost.hidden = left <= 0
        if (left > 0) t.boost.textContent = `x${mult.toFixed(1).replace(/\.0$/, '')} · ${Math.ceil(left)}s`
        if (d.unlocked) {
          t.amount.textContent = formatCurrency(t.id, d.currency)
          t.badge.hidden = t.id === game.viewing || !anyAffordable(game.state, t.id)
        } else {
          const after = DEPTS[t.id].unlockAfter!
          const pct = Math.min(99, Math.floor((game.state.depts[after].lifetime / ECONOMY.signOff) * 100))
          t.amount.textContent = `🔒 ${DEPTS[after].name} sign-off (${formatNumber(pct)}%)`
          t.badge.hidden = true
        }
      }
    },
  }
}
