// Surgery: text, path shape and scene layout for the suturing minigame.
// Pay, tolerance, timing, staff and perks are skill-tree stats: src/data/trees/surgery.ts.

export const SUTURE = {
  field: { x: 230, y: 84, w: 380, h: 170 }, // where incision lines are drawn
  pathPoints: 70, // samples along each incision line
  controlPoints: 5, // bends in the line
  startRadius: 22, // how close you must press to start / resume
  perfectAt: 0.85, // accuracy that counts as "perfect"
  comboAt: 0.6, // accuracy needed to keep the combo
  lookAhead: 6, // how many samples ahead the tracer can jump
}

export const SURGERY_LINES = {
  perfect: ['Textbook incision!', 'The attending nods. Once.', 'Beautiful. Frame it.'],
  good: ['Solid work.', 'Neat enough!', 'The patient will have a cool scar.'],
  messy: ['A bit wobbly…', 'Abstract art, surgically.', 'It’ll hold. Probably.'],
  slip: ['Oops! Nicked something.', 'Steady…', 'Whoa, off the line!'],
  timeout: ['The patient woke up. Awkward.', 'Anaesthesia wore off!', 'Out of time. Stitch faster!'],
}

export const SURGERY_SCENE = {
  width: 800,
  height: 450,
  wallHeight: 250,
  resident: { x: 78, y: 440, size: 150 },
  residentSpots: [668, 718, 768], // TUNE: surgical residents on the right
  residentY: 440,
  residentSize: 118,
  robot: { x: 640, y: 14 },
  staffBurstEvery: 2.4,
}

export const SURGERY_COLORS = {
  wall: '#15333a',
  wallTrim: '#1d4550',
  floor: '#10262b',
  drape: '#3a8fb0',
  skin: '#e8b98f',
  skinDark: '#d19c73',
  path: '#1b1b1b',
  done: '#c0303f',
  ink: '#f4f7fb',
  muted: '#9cc2c9',
  scrubs: '#4fae8a', // surgical residents
}
