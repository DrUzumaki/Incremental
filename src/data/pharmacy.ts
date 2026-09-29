// Pharmacy: jars, text and scene layout for the compounding minigame.
// Pay, order sizes, risk odds and staff rates are skill-tree stats: src/data/trees/pharmacy.ts.

export const JARS = [
  { name: 'Red', color: '#e5484d' },
  { name: 'Blue', color: '#3d8bfd' },
  { name: 'Yellow', color: '#f5c542' },
  { name: 'Green', color: '#46a758' },
  { name: 'White', color: '#f4f7fb' },
]

export const PHARMACY_LINES = {
  wrong: ['That’s… not what the doctor ordered.', 'Close! Also completely wrong.', 'The patient is now slightly purple.'],
  expired: ['Patient left to buy herbal tea.', 'They got tired and googled it instead.', '“I’ll just walk it off.”'],
  riskyGood: ['Trial drug worked great!', 'Side effect: feeling fantastic.', 'Science!'],
  riskyJackpot: ['Unexpected cure for baldness! JACKPOT!', 'Patient can now see sounds. They love it. JACKPOT!'],
  riskySide: ['Side effect: speaks only in rhyme.', 'Side effect: mild glowing.', 'Side effect: sudden moustache.', 'Side effect: hiccups in Morse code.'],
}

export const PHARMACY_SCENE = {
  width: 800,
  height: 450,
  wallHeight: 250,
  counterY: 292, // top of the counter
  rx: { x: 236, y: 30, w: 190, h: 176 }, // the prescription card
  jarY: 96,
  jarX: 470, // first jar's left edge
  jarW: 56,
  jarGap: 8,
  tray: { x: 520, y: 270, w: 160, h: 26 },
  buttons: {
    dispense: { x: 450, y: 352, w: 150, h: 40 },
    risky: { x: 610, y: 352, w: 170, h: 40 },
    clear: { x: 450, y: 402, w: 72, h: 30 },
  },
  customer: { x: 180, y: 318, size: 150 },
  resident: { x: 78, y: 440, size: 150 },
  dispenserSpots: [26, 78, 130], // TUNE: x positions of pill dispensers on the wall
  dispenserY: 60,
  ivBag: { x: 720, y: 262 }, // buff charge meter, bottom-right of the wall
  staffBurstEvery: 2.4,
}

export const PHARMACY_COLORS = {
  wall: '#1f2b3a',
  wallTrim: '#2c3b50',
  floor: '#172230',
  counter: '#8a6a4a',
  counterTop: '#a88663',
  shelf: '#5a4632',
  paper: '#fffbe6',
  ink: '#f4f7fb',
  muted: '#9fb0c4',
  risky: '#8e6cf0',
  good: '#46a758',
  bad: '#e5484d',
}
