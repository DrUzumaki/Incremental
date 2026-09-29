// The game loop. Game rules tick on a timer (which browsers keep running, slowly,
// in background tabs); drawing happens on animation frames only while visible.
import { ECONOMY } from '../data/economy'
import type { Game } from './game'

const TICK_MS = 50
const MAX_STEP = 0.1 // longest single rules step, in seconds
const MAX_FRAME = 0.1 // longest animation step, so a hitch doesn't teleport things

export function startLoop(game: Game, onOffline: (seconds: number) => void, render: (dt: number) => void) {
  let lastTick = performance.now()
  setInterval(() => {
    const now = performance.now()
    let dt = (now - lastTick) / 1000
    lastTick = now
    // A long pause (e.g. the laptop slept) is paid out like offline time.
    if (dt > ECONOMY.offlineGapSeconds) {
      onOffline(dt)
      return
    }
    const active = !document.hidden || !game.pauseWhenHidden
    while (dt > 0) {
      const step = Math.min(dt, MAX_STEP)
      game.update(step, active)
      dt -= step
    }
  }, TICK_MS)

  let lastFrame = performance.now()
  function frame(now: number) {
    const dt = Math.min((now - lastFrame) / 1000, MAX_FRAME)
    lastFrame = now
    render(dt)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
