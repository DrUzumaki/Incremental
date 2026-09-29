// Pop-up messages: toasts (short notes that fade away) and modals (need a click).

let toastBox: HTMLDivElement | null = null

export function toast(html: string, kind: 'info' | 'big' = 'info', seconds = 4) {
  if (!toastBox) {
    toastBox = document.createElement('div')
    toastBox.className = 'toasts'
    document.body.appendChild(toastBox)
  }
  const el = document.createElement('div')
  el.className = `toast toast-${kind}`
  el.innerHTML = html
  toastBox.appendChild(el)
  setTimeout(() => el.classList.add('toast-out'), seconds * 1000)
  setTimeout(() => el.remove(), seconds * 1000 + 400)
}

export function modal(title: string, bodyHtml: string, button = 'OK'): Promise<void> {
  return new Promise((resolve) => {
    const back = document.createElement('div')
    back.className = 'modal-back'
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>${title}</h2>
        <div class="modal-body">${bodyHtml}</div>
        <button class="modal-ok" type="button">${button}</button>
      </div>
    `
    document.body.appendChild(back)
    const ok = back.querySelector<HTMLButtonElement>('.modal-ok')!
    ok.focus()
    ok.addEventListener('click', () => {
      back.remove()
      resolve()
    })
  })
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.floor(seconds)}s`
}
