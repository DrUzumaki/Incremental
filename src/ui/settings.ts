// The Settings popover: effects, sound, music, volume, and reset save.
import type { Settings } from '../core/state'
import { resetSave } from '../core/save'

export function createSettingsButton(container: HTMLElement, settings: Settings, onChange: () => void) {
  const wrap = document.createElement('div')
  wrap.className = 'settings-wrap'
  wrap.innerHTML = `
    <button class="settings-btn" type="button" aria-haspopup="true">Settings ⚙</button>
    <div class="settings-pop" hidden>
      <label><input type="checkbox" data-k="sound"> Sound effects</label>
      <label><input type="checkbox" data-k="music"> Music</label>
      <label>Volume <input type="range" min="0" max="1" step="0.05" data-k="volume"></label>
      <label><input type="checkbox" data-k="reduceEffects"> Reduce effects (fewer particles, no shake)</label>
      <button class="reset-btn" type="button">Reset save…</button>
    </div>
  `
  container.appendChild(wrap)
  const pop = wrap.querySelector<HTMLDivElement>('.settings-pop')!
  wrap.querySelector('.settings-btn')!.addEventListener('click', () => (pop.hidden = !pop.hidden))
  document.addEventListener('pointerdown', (e) => {
    if (!wrap.contains(e.target as Node)) pop.hidden = true
  })

  for (const input of wrap.querySelectorAll<HTMLInputElement>('input[data-k]')) {
    const k = input.dataset.k as keyof Settings
    if (input.type === 'checkbox') input.checked = settings[k] as boolean
    else input.value = String(settings[k])
    input.addEventListener('input', () => {
      if (input.type === 'checkbox') (settings[k] as boolean) = input.checked
      else (settings[k] as number) = Number(input.value)
      onChange()
    })
  }
  wrap.querySelector('.reset-btn')!.addEventListener('click', () => {
    if (confirm('Erase all progress and start over?')) resetSave()
  })
}
