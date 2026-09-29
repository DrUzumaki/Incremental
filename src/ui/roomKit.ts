// Small helpers every room view shares.

export interface RoomView {
  update(dt: number): void
  draw(): void
}

// Size a canvas for a logical width x height, sharp on high-DPI screens.
export function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

// Converts a room canvas's logical coordinates to screen coordinates (for effects).
export function screenMapper(canvas: HTMLCanvasElement, w: number, h: number) {
  return (x: number, y: number) => {
    const r = canvas.getBoundingClientRect()
    return { x: r.left + (x / w) * r.width, y: r.top + (y / h) * r.height }
  }
}

// Should a key press reach this room? Not during trials/bosses, not while a pop-up
// window is open, not for other rooms, and not when a button or form field has focus
// (so Enter/Space still work on that button).
export function roomKeysAllowed(game: { inTrial: boolean; viewing: string }, dept: string, canvas: HTMLCanvasElement, e: KeyboardEvent): boolean {
  if (game.inTrial || game.viewing !== dept || !canvas.offsetParent) return false
  if (document.querySelector('.modal-back, .session-back')) return false
  const t = e.target
  return !(t instanceof Element && t.closest('button, input, select, textarea'))
}

// Global shortcuts (T, P) are off during trials and pop-up windows.
export function globalKeysAllowed(game: { inTrial: boolean }): boolean {
  return !game.inTrial && !document.querySelector('.modal-back, .session-back')
}
