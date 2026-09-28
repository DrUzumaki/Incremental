// The list of upgrades with buy buttons.
import { formatNumber } from '../core/format'
import type { GameState } from '../core/state'
import { buyUpgrade, canBuy, isMaxed, upgradeCost } from '../core/upgrades'
import { UPGRADE_LIST } from '../data/upgrades'

export function createUpgradePanel(container: HTMLElement, state: GameState) {
  container.innerHTML = '<h3 class="panel-title">Upgrades</h3>'

  // Build the rows once; update() only changes their text and enabled state.
  const rows = UPGRADE_LIST.map((def) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'upgrade'
    button.innerHTML = `
      <span class="upgrade-name">${def.name}</span>
      <span class="upgrade-level"></span>
      <span class="upgrade-desc">${def.description}</span>
      <span class="upgrade-cost"></span>
    `
    button.addEventListener('click', () => buyUpgrade(state, def.id))
    container.appendChild(button)
    return {
      def,
      button,
      level: button.querySelector<HTMLSpanElement>('.upgrade-level')!,
      cost: button.querySelector<HTMLSpanElement>('.upgrade-cost')!,
    }
  })

  return {
    update() {
      for (const row of rows) {
        const id = row.def.id
        const lv = state.upgrades[id]
        const maxed = isMaxed(state, id)
        row.level.textContent = row.def.maxLevel === 1 ? (maxed ? 'Owned' : '') : `Lv ${lv}/${row.def.maxLevel}`
        row.cost.textContent = maxed ? 'MAX' : '$' + formatNumber(upgradeCost(id, lv))
        row.button.disabled = !canBuy(state, id)
      }
    },
  }
}
