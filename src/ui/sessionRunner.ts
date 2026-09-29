// Plays a Session (organ trial or boss) in a full-screen window:
// intro card, 3-2-1 countdown, the minigame with a HUD, then a result card.
// It runs on animation frames, so it pauses if the tab is hidden (no unfair losses).
import type { PointerKind, Session } from '../trials/types'

const W = 800
const H = 450
const COUNTDOWN = 3

export function runSession(session: Session, onDone: (won: boolean) => string): Promise<boolean> {
  return new Promise((resolve) => {
    const back = document.createElement('div')
    back.className = 'session-back'
    back.innerHTML = `
      <div class="session">
        <div class="session-hud">
          <strong class="session-title"></strong>
          <div class="session-timer"><div class="session-bar"></div></div>
          <span class="session-label"></span>
          <span class="session-status"></span>
          <button class="session-quit" type="button">Give up</button>
        </div>
        <canvas class="session-canvas"></canvas>
        <div class="session-card">
          <h2></h2>
          <p class="session-text"></p>
          <button class="session-go" type="button"></button>
        </div>
      </div>
    `
    document.body.appendChild(back)
    const $ = <T extends HTMLElement>(sel: string) => back.querySelector<T>(sel)!
    const canvas = $<HTMLCanvasElement>('.session-canvas')
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const card = $<HTMLDivElement>('.session-card')
    const bar = $<HTMLDivElement>('.session-bar')
    const label = $<HTMLSpanElement>('.session-label')
    const status = $<HTMLSpanElement>('.session-status')
    const title = $<HTMLElement>('.session-title')

    let phase: 'intro' | 'countdown' | 'play' | 'result' = 'intro'
    let countdown = COUNTDOWN
    let time = 0
    let won = false

    function showCard(heading: string, text: string, button: string) {
      card.hidden = false
      card.querySelector('h2')!.textContent = heading
      card.querySelector('.session-text')!.innerHTML = text
      $<HTMLButtonElement>('.session-go').textContent = button
    }
    showCard(session.title, session.instructions, 'Start')

    $<HTMLButtonElement>('.session-go').addEventListener('click', () => {
      if (phase === 'intro') {
        phase = 'countdown'
        card.hidden = true
      } else if (phase === 'result') {
        close()
      }
    })
    $<HTMLButtonElement>('.session-quit').addEventListener('click', () => {
      if (phase === 'play' || phase === 'countdown') finish(false)
    })

    // Input, in the minigame's 800 x 450 coordinates.
    function point(kind: PointerKind, e: PointerEvent) {
      if (phase !== 'play') return
      const r = canvas.getBoundingClientRect()
      session.view().pointer(kind, ((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H)
    }
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId)
      point('down', e)
    })
    canvas.addEventListener('pointermove', (e) => point('move', e))
    canvas.addEventListener('pointerup', (e) => point('up', e))
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (phase !== 'play') return
      if (e.key === ' ') e.preventDefault()
      if (down && e.repeat) return
      session.view().key(e.key, down)
    }
    const keyDown = onKey(true)
    const keyUp = onKey(false)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    function finish(result: boolean) {
      phase = 'result'
      won = result
      const text = onDone(result)
      showCard(result ? 'Success!' : 'Not this time…', text, 'Close')
    }

    function close() {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      back.remove()
      resolve(won)
    }

    let last = performance.now()
    function frame(now: number) {
      if (!back.isConnected) return
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      time += dt
      if (phase === 'countdown') {
        countdown -= dt
        if (countdown <= 0) phase = 'play'
      } else if (phase === 'play') {
        session.update(dt)
        const r = session.done()
        if (r) finish(r.won)
      }
      session.view().draw(ctx, time)
      if (phase === 'countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#f4f7fb'
        ctx.font = '900 96px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(Math.ceil(countdown)), W / 2, H / 2)
      }
      const hud = session.hud()
      title.textContent = session.title
      bar.style.width = `${(1 - hud.progress) * 100}%`
      label.textContent = hud.label
      status.textContent = hud.status
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)

    // Dev-only: step the session by hand (the test browser may not run animation frames).
    if (import.meta.env.DEV) {
      Object.assign(window, {
        __session: {
          session,
          start: () => {
            phase = 'play'
            card.hidden = true
          },
          step: (dt: number) => {
            session.update(dt)
            const r = session.done()
            if (r && phase === 'play') finish(r.won)
          },
          phase: () => phase,
        },
      })
    }
  })
}
