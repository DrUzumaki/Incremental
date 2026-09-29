// Outfits: the resident's fixed look and random patient looks.
import { PATIENT_TINTS } from '../../data/emergency'
import type { HairStyle, Look } from './body'

export const RESIDENT_LOOK: Look = {
  skin: '#e0ac85',
  hair: '#3b2a20',
  hairStyle: 'short',
  top: '#f4f7fb', // white coat
  topStyle: 'coat',
  under: '#3aa7a3', // teal scrubs
  bottom: '#3aa7a3',
  shoes: '#e8e8e8',
  height: 1,
}

const SKINS = ['#f6d7bd', '#eec39a', '#d7a27a', '#b57a55', '#8d5a3b', '#5e3b26']
const HAIRS = ['#2b1d14', '#4a2f1f', '#7a4b2a', '#d9b25f', '#b5542c', '#9aa0a6', '#1b1b1b']
const STYLES: HairStyle[] = ['short', 'buzz', 'curly', 'long', 'bun', 'bald', 'ponytail']
const BOTTOMS = ['#3b5a86', '#2f3a4a', '#8a7a5a', '#5b5b66', '#6b3f5b']
const SHOES = ['#2a2a2a', '#f0f0f0', '#7a4a2a', '#3d5a80']

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function randomPatientLook(): Look {
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle: pick(STYLES),
    top: pick(PATIENT_TINTS),
    topStyle: Math.random() < 0.35 ? 'hoodie' : 'tee',
    bottom: pick(BOTTOMS),
    shoes: pick(SHOES),
    height: 0.9 + Math.random() * 0.14,
  }
}
