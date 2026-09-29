// The list of upgrades with buy buttons (reads the room's skill tree).
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { canBuy, isMaxed, isRevealed, levelOf, nodeCosts } from '../core/tree'
import { TREES } from '../data/trees'

export function createUpgradePanel(container: HTMLElement, game: Game) {
  const tree = TREES.emergency
  container.innerHTML = '<h3 class="panel-title">Upgrades</h3>'

  // Build the rows once; update() only changes their text, visibility and enabled state.
  const rows = tree.nodes.filter((n) => !n.root).map((node) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'upgrade'
    button.innerHTML = `
      <span class="upgrade-name">${node.name}</span>
      <span class="upgrade-level"></span>
      <span class="upgrade-desc">${node.desc}</span>
      <span class="upgrade-cost"></span>
    `
    button.addEventListener('click', () => game.buy(tree.id, node.id))
    container.appendChild(button)
    return {
      node,
      button,
      level: button.querySelector<HTMLSpanElement>('.upgrade-level')!,
      cost: button.querySelector<HTMLSpanElement>('.upgrade-cost')!,
    }
  })

  return {
    update() {
      const state = game.state
      for (const row of rows) {
        const lv = levelOf(state, tree.id, row.node.id)
        const maxed = isMaxed(state, tree.id, row.node)
        row.button.hidden = !isRevealed(state, tree, row.node)
        row.level.textContent = row.node.maxLevel === 1 ? (maxed ? 'Owned' : '') : `Lv ${lv}/${row.node.maxLevel}`
        row.cost.textContent = maxed ? 'MAX' : nodeCosts(row.node, lv).map((c) => formatCurrency(c.currency, c.amount)).join(' + ')
        row.button.disabled = !canBuy(state, tree, row.node)
      }
    },
  }
}
