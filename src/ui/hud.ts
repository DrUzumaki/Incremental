// Top bar: department name, dollars, and the reset-save button.
import { formatNumber } from '../core/format'
import { resetSave } from '../core/save'
import type { GameState } from '../core/state'

export function createHud(container: HTMLElement, state: GameState) {
  container.innerHTML = `
    <h2 class="room-name">Emergency</h2>
    <div class="money">$0</div>
    <button class="reset-btn" type="button">Reset save</button>
  `
  const money = container.querySelector<HTMLDivElement>('.money')!
  container.querySelector('.reset-btn')!.addEventListener('click', () => {
    if (confirm('Erase all progress and start over?')) resetSave()
  })

  return {
    update() {
      money.textContent = '$' + formatNumber(state.dollars)
    },
  }
}
