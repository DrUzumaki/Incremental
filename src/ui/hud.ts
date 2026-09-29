// Top bar: room name, the room's currency counter and income rate, reset button.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { resetSave } from '../core/save'
import { DEPTS } from '../data/departments'

export function createHud(container: HTMLElement, game: Game) {
  container.innerHTML = `
    <h2 class="room-name"></h2>
    <div class="counter">
      <div class="money"></div>
      <div class="rate"></div>
    </div>
    <div class="topbar-actions">
      <button class="reset-btn" type="button">Reset save</button>
    </div>
  `
  const name = container.querySelector<HTMLHeadingElement>('.room-name')!
  const money = container.querySelector<HTMLDivElement>('.money')!
  const rate = container.querySelector<HTMLDivElement>('.rate')!
  container.querySelector('.reset-btn')!.addEventListener('click', () => {
    if (confirm('Erase all progress and start over?')) resetSave()
  })

  return {
    update() {
      const dept = game.viewing
      name.textContent = DEPTS[dept].name
      money.textContent = formatCurrency(dept, game.state.depts[dept].currency)
      const idle = game.idleRate(dept)
      rate.textContent = idle > 0 ? `+${formatCurrency(dept, idle, true)}/s idle` : ''
    },
  }
}
