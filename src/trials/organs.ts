// Every organ minigame, by organ. Reused by organ trials and by Code Blue.
import { HEART, LIVER, type OrganId } from '../data/trials'
import { GutLogic } from './gut'
import { gutView } from './gutView'
import { HeartLogic } from './heart'
import { heartView } from './heartView'
import { LungsLogic } from './lungs'
import { LiverLogic } from './liver'
import { liverView } from './liverView'
import { lungsView } from './lungsView'
import type { OrganGame } from './types'

export const ORGAN_GAMES: Record<OrganId, OrganGame> = {
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
    instructions: `Stray sparks are crawling toward the heart’s AV node. Click them before they reach the glowing centre. ${HEART.maxLeaks} leaks and the heart throws a tantrum.`,
    create(difficulty) {
      const logic = new HeartLogic(difficulty)
      return { logic, view: heartView(logic) }
    },
  },
  liver: {
    name: 'Liver',
    instructions: `Move the liver with the mouse (or arrow keys). Catch the purple toxins; let the green nutrients fall past. ${LIVER.maxDamage} bits of damage and the liver files a complaint.`,
    create(difficulty) {
      const logic = new LiverLogic(difficulty)
      return { logic, view: liverView(logic) }
    },
  },
  gut: {
    name: 'Gut',
    instructions: 'Bad bacteria (red, spiky) multiply if left alone. Click them! Zapping a good one (green) just makes room for a bad one. Don’t let them take over.',
    create(difficulty) {
      const logic = new GutLogic(difficulty)
      return { logic, view: gutView(logic) }
    },
  },
}
