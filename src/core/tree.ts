// Skill tree rules: which nodes are visible, what they cost, and buying them.
import type { CurrencyId, TreeDef, TreeId, TreeNodeDef } from '../data/tree'
import { TREES } from '../data/trees'
import { treeLevels, type GameState } from './state'

// Neighbour lists, built once per tree (links in the data only point one way).
const adjacency = new Map<TreeId, Map<string, string[]>>()

export function neighbours(tree: TreeDef, id: string): string[] {
  let adj = adjacency.get(tree.id)
  if (!adj) {
    adj = new Map()
    for (const n of tree.nodes) adj.set(n.id, [])
    for (const n of tree.nodes) {
      for (const l of n.links) {
        adj.get(n.id)!.push(l)
        adj.get(l)?.push(n.id)
      }
    }
    adjacency.set(tree.id, adj)
  }
  return adj.get(id) ?? []
}

export function levelOf(state: GameState, tree: TreeId, id: string): number {
  return treeLevels(state, tree)[id] ?? 0
}

// A node can be bought once any neighbour is owned (buying a node reveals its neighbours).
export function isRevealed(state: GameState, tree: TreeDef, node: TreeNodeDef): boolean {
  if (node.root || levelOf(state, tree.id, node.id) > 0) return true
  return neighbours(tree, node.id).some((n) => levelOf(state, tree.id, n) > 0)
}

// Shown as a locked "?" silhouette: not revealed yet, but next to something revealed.
export function isSilhouette(state: GameState, tree: TreeDef, node: TreeNodeDef): boolean {
  if (isRevealed(state, tree, node)) return false
  return neighbours(tree, node.id).some((n) => isRevealed(state, tree, tree.nodes.find((x) => x.id === n)!))
}

export function nodeCosts(node: TreeNodeDef, level: number): { currency: CurrencyId; amount: number }[] {
  return node.costs.map((c) => ({ currency: c.currency, amount: Math.ceil(c.base * c.growth ** level) }))
}

export function currencyAmount(state: GameState, c: CurrencyId): number {
  if (c === 'stemCells') return state.stemCells
  if (c === 'publications') return state.publications
  return state.depts[c].currency
}

function spend(state: GameState, c: CurrencyId, amount: number) {
  if (c === 'stemCells') state.stemCells -= amount
  else if (c === 'publications') state.publications -= amount
  else state.depts[c].currency -= amount
}

export function isMaxed(state: GameState, tree: TreeId, node: TreeNodeDef): boolean {
  return levelOf(state, tree, node.id) >= node.maxLevel
}

export function canAfford(state: GameState, tree: TreeId, node: TreeNodeDef): boolean {
  return nodeCosts(node, levelOf(state, tree, node.id)).every((c) => currencyAmount(state, c.currency) >= c.amount)
}

export function canBuy(state: GameState, tree: TreeDef, node: TreeNodeDef): boolean {
  return isRevealed(state, tree, node) && !isMaxed(state, tree.id, node) && canAfford(state, tree.id, node)
}

export function buyNode(state: GameState, treeId: TreeId, nodeId: string): boolean {
  const tree = TREES[treeId]
  const node = tree.nodes.find((n) => n.id === nodeId)
  if (!node || !canBuy(state, tree, node)) return false
  for (const c of nodeCosts(node, levelOf(state, treeId, nodeId))) spend(state, c.currency, c.amount)
  treeLevels(state, treeId)[nodeId] = levelOf(state, treeId, nodeId) + 1
  return true
}

// True if any visible node in this tree can be bought right now (for the button badge).
export function anyAffordable(state: GameState, treeId: TreeId): boolean {
  const tree = TREES[treeId]
  return tree.nodes.some((n) => canBuy(state, tree, n))
}

// Work out a tree's stats from its base values and the node levels.
// Adds are applied first, then multipliers.
export function computeStats(state: GameState, treeId: TreeId): Record<string, number> {
  const tree = TREES[treeId]
  const stats = { ...tree.baseStats }
  const levels = treeLevels(state, treeId)
  for (const pass of ['add', 'mult'] as const) {
    for (const node of tree.nodes) {
      const lv = levels[node.id] ?? 0
      if (!lv) continue
      for (const e of node.effects) {
        if (pass === 'add' && e.add !== undefined) stats[e.stat] = (stats[e.stat] ?? 0) + e.add * lv
        if (pass === 'mult' && e.mult !== undefined) stats[e.stat] = (stats[e.stat] ?? 1) * e.mult ** lv
      }
    }
  }
  return stats
}
