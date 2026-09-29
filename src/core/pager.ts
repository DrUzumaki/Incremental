// Pager rules: pages for other rooms, responding in time, and the payout boosts they give.
// Boosts are temporary, so they aren't saved.
import type { DeptId } from '../data/departments'
import { PAGE_TEXT, PAGER } from '../data/pager'

export interface Page {
  dept: DeptId
  priority: 'high' | 'low'
  text: string
  expiresAt: number
  autoAt: number | null // when staff will answer it for you (low priority only)
}

export interface Boost {
  dept: DeptId
  mult: number
  until: number
}

export interface PagerHost {
  unlocked(): DeptId[]
  viewing(): DeptId
  autoRespond(): boolean // staff answer low-priority pages
  durationMult(): number // longer boosts from upgrades
  onPage(page: Page): void
  onBoost(boost: Boost, auto: boolean): void
}

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export class Pager {
  time = 0
  page: Page | null = null
  readonly boosts: Boost[] = []
  private nextAt = PAGER.firstPageAfter
  private host: PagerHost

  constructor(host: PagerHost) {
    this.host = host
  }

  private schedule() {
    this.nextAt = this.time + PAGER.intervalMin + Math.random() * (PAGER.intervalMax - PAGER.intervalMin)
  }

  update(dt: number) {
    const unlocked = this.host.unlocked()
    if (unlocked.length < 2) {
      this.nextAt = this.time + PAGER.firstPageAfter
    }
    this.time += dt
    for (let i = this.boosts.length - 1; i >= 0; i--) if (this.boosts[i].until <= this.time) this.boosts.splice(i, 1)

    if (this.page) {
      if (this.page.autoAt !== null && this.time >= this.page.autoAt) this.respond(true)
      else if (this.time >= this.page.expiresAt) {
        this.page = null // ignoring a page costs nothing
        this.schedule()
      }
      return
    }
    if (unlocked.length < 2 || this.time < this.nextAt) return
    const others = unlocked.filter((d) => d !== this.host.viewing())
    const dept = pick(others)
    const priority = Math.random() < PAGER.lowChance ? 'low' : 'high'
    this.page = {
      dept,
      priority,
      text: pick(PAGE_TEXT[dept][priority]),
      expiresAt: this.time + PAGER.respondTime,
      autoAt: priority === 'low' && this.host.autoRespond() ? this.time + PAGER.autoDelay : null,
    }
    this.host.onPage(this.page)
  }

  // Answer the current page: boost its room. Returns the room to go to (unless auto).
  respond(auto = false): DeptId | null {
    const page = this.page
    if (!page) return null
    const b = PAGER.boost[page.priority]
    // Boosts in the same room don't stack: keep the bigger one and the later end time.
    const until = this.time + b.duration * this.host.durationMult()
    let boost = this.boosts.find((x) => x.dept === page.dept)
    if (boost) {
      boost.mult = Math.max(boost.mult, b.mult)
      boost.until = Math.max(boost.until, until)
    } else {
      boost = { dept: page.dept, mult: b.mult, until }
      this.boosts.push(boost)
    }
    this.page = null
    this.schedule()
    this.host.onBoost(boost, auto)
    return auto ? null : page.dept
  }

  boostMult(dept: DeptId): number {
    return this.boosts.find((b) => b.dept === dept)?.mult ?? 1
  }

  boostLeft(dept: DeptId): number {
    return Math.max(0, ...this.boosts.filter((b) => b.dept === dept).map((b) => b.until - this.time))
  }
}
