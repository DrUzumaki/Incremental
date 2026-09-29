// Shared shapes for playable sessions: organ trials, the Sepsis boss and Code Blue.
// Rules (logic) and drawing (view) are separate objects.

export type PointerKind = 'down' | 'up' | 'move'

// Drawn on a logical 800 x 450 canvas.
export interface SessionView {
  draw(ctx: CanvasRenderingContext2D, time: number): void
  pointer(kind: PointerKind, x: number, y: number): void
  key(key: string, down: boolean): void
}

export interface Session {
  title: string
  instructions: string
  update(dt: number): void
  hud(): { label: string; progress: number; status: string } // progress 0..1 fills the timer bar
  done(): { won: boolean } | null
  view(): SessionView // the current view (Code Blue swaps views between stages)
}

// An organ minigame's rules. It never ends by itself on time; the session does that.
export interface OrganLogic {
  update(dt: number): void
  failed(): boolean
  status(): string
}

export interface OrganGame {
  name: string
  instructions: string
  create(difficulty: number): { logic: OrganLogic; view: SessionView }
}
