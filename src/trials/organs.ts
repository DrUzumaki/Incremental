// Every organ minigame, by organ. Reused by organ trials and by Code Blue.
import type { OrganId } from '../data/trials'
import { HeartLogic } from './heart'
import { heartView } from './heartView'
import { LungsLogic } from './lungs'
import { lungsView } from './lungsView'
import type { OrganGame } from './types'

export const ORGAN_GAMES: Partial<Record<OrganId, OrganGame>> = {
  lungs: {
    name: 'Lungs',
    instructions: 'Hold the mouse button or Space to breathe in; let go to breathe out. Keep the white line inside the green band to keep oxygen up. Watch out for coughs!',
    create(difficulty) {
      const logic = new LungsLogic(difficulty)
      return { logic, view: lungsView(logic) }
    },
  },
  heart: {
    name: 'Heart',
    instructions: 'Stray sparks are crawling toward the heart’s AV node. Click them before they reach the glowing centre. Five leaks and the heart throws a tantrum.',
    create(difficulty) {
      const logic = new HeartLogic(difficulty)
      return { logic, view: heartView(logic) }
    },
  },
}
