// The whole game state. Everything here is saved, so keep it plain data.
import { DEPT_ORDER, type DeptId } from '../data/departments'
import { TREES } from '../data/trees'
import type { TreeId } from '../data/tree'

export const SAVE_VERSION = 2

export interface DeptState {
  unlocked: boolean
  currency: number
  lifetime: number // total ever earned; the sign-off checks this
  signedOff: boolean
  milestone: number // how many ECONOMY.milestones have been celebrated
  nodes: Record<string, number> // skill tree node levels
  bestCombo: number
  trialClears: number // organ trial tiers cleared
  trialReadyAt: number // Date.now() when the trial can be played again
  trialMultiplier: number // permanent income multiplier from cleared trials
}

export interface BossState {
  best: number // best stage reached
}

export interface Settings {
  reduceEffects: boolean
  sound: boolean
  music: boolean
  volume: number // 0..1
}

export interface GameState {
  version: number
  depts: Record<DeptId, DeptState>
  stemCells: number
  publications: number
  pubNodes: Record<string, number> // Publications tree levels
  bosses: { sepsis: BossState; codeBlue: BossState }
  discharged: boolean // reached the final stage of Code Blue
  surgeryOps: number // completed operations (they unlock permanent perks)
  settings: Settings
  lastSeen: number // Date.now() at the last save, for offline earnings
  playTime: number // seconds played
}

function rootLevels(tree: TreeId): Record<string, number> {
  const levels: Record<string, number> = {}
  for (const node of TREES[tree].nodes) levels[node.id] = node.root ? 1 : 0
  return levels
}

function newDept(id: DeptId): DeptState {
  return {
    unlocked: id === 'emergency',
    currency: 0,
    lifetime: 0,
    signedOff: false,
    milestone: 0,
    nodes: rootLevels(id),
    bestCombo: 0,
    trialClears: 0,
    trialReadyAt: 0,
    trialMultiplier: 1,
  }
}

export function createNewState(): GameState {
  const depts = {} as Record<DeptId, DeptState>
  for (const id of DEPT_ORDER) depts[id] = newDept(id)
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return {
    version: SAVE_VERSION,
    depts,
    stemCells: 0,
    publications: 0,
    pubNodes: rootLevels('publications'),
    bosses: { sepsis: { best: 0 }, codeBlue: { best: 0 } },
    discharged: false,
    surgeryOps: 0,
    settings: { reduceEffects: reduceMotion, sound: true, music: true, volume: 0.6 },
    lastSeen: Date.now(),
    playTime: 0,
  }
}

// Node levels for any tree (department trees or the Publications tree).
export function treeLevels(state: GameState, tree: TreeId): Record<string, number> {
  return tree === 'publications' ? state.pubNodes : state.depts[tree].nodes
}
