// All skill trees, looked up by id.
import type { TreeDef, TreeId } from '../tree'
import { CARDIOLOGY_TREE } from './cardiology'
import { EMERGENCY_TREE } from './emergency'
import { PHARMACY_TREE } from './pharmacy'
import { PUBLICATIONS_TREE } from './publications'
import { SURGERY_TREE } from './surgery'

export const TREES: Record<TreeId, TreeDef> = {
  emergency: EMERGENCY_TREE,
  cardiology: CARDIOLOGY_TREE,
  pharmacy: PHARMACY_TREE,
  surgery: SURGERY_TREE,
  publications: PUBLICATIONS_TREE,
}
