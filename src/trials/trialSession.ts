// An organ trial session: survive the organ minigame until the time runs out.
import type { OrganGame, Session } from './types'

export function organSession(game: OrganGame, difficulty: number, duration: number, title: string): Session {
  const { logic, view } = game.create(difficulty)
  let elapsed = 0
  let result: { won: boolean } | null = null
  return {
    title,
    instructions: game.instructions,
    update(dt) {
      if (result) return
      elapsed += dt
      logic.update(dt)
      if (logic.failed()) result = { won: false }
      else if (elapsed >= duration) result = { won: true }
    },
    hud: () => ({ label: `${Math.ceil(Math.max(0, duration - elapsed))}s`, progress: Math.min(1, elapsed / duration), status: logic.status() }),
    done: () => result,
    view: () => view,
  }
}
