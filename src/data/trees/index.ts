// All skill trees, looked up by id.
import type { TreeDef, TreeId } from '../tree'
import { EMERGENCY_TREE } from './emergency'

// Departments without a tree yet get a root-only placeholder.
const placeholder = (id: TreeId): TreeDef => ({
  id,
  baseStats: { incomeMult: 1 },
  nodes: [{ id: 'root', name: 'Root', desc: '', branch: 'root', x: 0, y: 0, links: [], maxLevel: 1, costs: [], effects: [], root: true }],
})

export const TREES: Record<TreeId, TreeDef> = {
  emergency: EMERGENCY_TREE,
  cardiology: placeholder('cardiology'),
  pharmacy: placeholder('pharmacy'),
  surgery: placeholder('surgery'),
  publications: placeholder('publications'),
}
