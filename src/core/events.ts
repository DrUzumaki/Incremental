// A tiny event bus so game logic can announce things (money earned, sign-offs)
// without knowing anything about the screen. Views and effects listen.
import type { DeptId } from '../data/departments'
import type { Severity } from '../data/emergency'
import type { EcgResult } from '../departments/cardiology/ecg'
import type { TriageResult } from '../departments/emergency/triage'
import type { Boost, Page } from './pager'

export type EarnSource = 'active' | 'idle' | 'offline' | 'bonus'

export interface GameEvents {
  earn: { dept: DeptId; amount: number; source: EarnSource }
  milestone: { dept: DeptId; value: number }
  signOff: { dept: DeptId }
  unlock: { dept: DeptId }
  triage: { result: TriageResult; patientId: number; choice?: Severity }
  ecg: EcgResult
  page: Page
  boost: { boost: Boost; auto: boolean }
  purchase: { tree: string; node: string }
}

type Handler<T> = (payload: T) => void

export class EventBus {
  private handlers: { [K in keyof GameEvents]?: Handler<GameEvents[K]>[] } = {}

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): void {
    ;(this.handlers[type] ??= [] as never[]).push(fn as never)
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    for (const fn of this.handlers[type] ?? []) (fn as Handler<GameEvents[K]>)(payload)
  }
}
