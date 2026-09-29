// Types for skill trees. Each department's tree lives in src/data/trees/.
import type { DeptId } from './departments'

export type CurrencyId = DeptId | 'stemCells' | 'publications'
export type TreeId = DeptId | 'publications'

// What a node does per level. `add` is added once per level; `mult` multiplies once per level.
export interface Effect {
  stat: string
  add?: number
  mult?: number
}

export interface NodeCost {
  currency: CurrencyId
  base: number
  growth: number // cost of the next level = base * growth ** level
}

export interface TreeNodeDef {
  id: string
  name: string
  desc: string
  branch: string
  x: number // position in tree units; the root is at 0, 0
  y: number
  links: string[] // neighbours (links work both ways)
  maxLevel: number
  costs: NodeCost[] // two entries = a synergy node paid in two currencies
  effects: Effect[]
  root?: boolean // owned from the start
  towards?: DeptId // synergy nodes: which department's tree they point toward
}

export interface TreeDef {
  id: TreeId
  baseStats: Record<string, number>
  nodes: TreeNodeDef[]
}
