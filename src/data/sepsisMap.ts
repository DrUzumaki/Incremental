// The Sepsis boss body map: regions (drawn as rounded boxes on an 800 x 450 canvas)
// and which regions touch, so infection can spread between them.

export interface Region {
  id: string
  x: number // centre
  y: number
  w: number
  h: number
  links: string[] // neighbouring regions (links work both ways)
}

export const SEPSIS_REGIONS: Region[] = [
  { id: 'head', x: 400, y: 52, w: 64, h: 64, links: ['neck'] },
  { id: 'neck', x: 400, y: 98, w: 30, h: 22, links: ['chestL', 'chestR'] },
  { id: 'chestL', x: 372, y: 145, w: 54, h: 66, links: ['chestR', 'armLU', 'abdoU'] },
  { id: 'chestR', x: 428, y: 145, w: 54, h: 66, links: ['armRU', 'abdoU'] },
  { id: 'abdoU', x: 400, y: 204, w: 108, h: 46, links: ['abdoL'] },
  { id: 'abdoL', x: 400, y: 250, w: 108, h: 44, links: ['pelvis'] },
  { id: 'pelvis', x: 400, y: 294, w: 104, h: 40, links: ['legLU', 'legRU'] },
  { id: 'armLU', x: 322, y: 150, w: 34, h: 76, links: ['armLL'] },
  { id: 'armLL', x: 312, y: 232, w: 30, h: 80, links: [] },
  { id: 'armRU', x: 478, y: 150, w: 34, h: 76, links: ['armRL'] },
  { id: 'armRL', x: 488, y: 232, w: 30, h: 80, links: [] },
  { id: 'legLU', x: 376, y: 350, w: 44, h: 70, links: ['legLL'] },
  { id: 'legLL', x: 374, y: 418, w: 40, h: 60, links: [] },
  { id: 'legRU', x: 424, y: 350, w: 44, h: 70, links: ['legRL'] },
  { id: 'legRL', x: 426, y: 418, w: 40, h: 60, links: [] },
]

export const SEPSIS_LINES = {
  stage: ['Holding the line!', 'Antibiotics working!', 'The germs regroup…', 'Still septic, still standing.'],
  end: ['The germs threw a party. You were not invited.', 'Sepsis wins this round. Rematch?', 'Call ID. And maybe a priest. Kidding!'],
}
