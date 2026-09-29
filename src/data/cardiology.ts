// Cardiology: rules numbers, text and scene layout for the ECG minigame.
// Beat value, BPM, timing windows etc. are skill-tree stats: see src/data/trees/cardiology.ts.

export const ECG = {
  lookahead: 3.2, // seconds of upcoming trace shown to the right of the line
  firstBeatDelay: 1.2, // seconds before the first beat reaches the line
  vfLeadIn: 0.6, // quiet gap before and after VF
  vfFirstAt: 25, // TUNE: seconds until the first VF (later ones use the vfEvery stat)
  vfJitter: 0.25, // VF timing varies by +/- this fraction
}

export const ECG_LINES = {
  miss: ['Asystole of effort.', 'That was a PVC. Premature Victory Click.', 'The monitor judges you.', 'Off-beat. Very jazz.'],
  early: ['Still charging!', 'Wait for it…', 'Not yet! Charging!'],
  converted: ['Converted on their own. Awkward.', 'Heart fixed itself. Show-off.', 'VF over. Nobody saw anything.'],
  shock: ['CLEAR!', 'CLEAR! Zap!', 'Everybody back! CLEAR!'],
}

export const CARDIO_SCENE = {
  width: 800,
  height: 450,
  wallHeight: 250,
  monitor: { x: 170, y: 26, w: 460, h: 196 },
  hitOffset: 118, // TUNE: the "now" line, in pixels from the monitor's left edge
  pxPerSecond: 150, // TUNE: how fast the trace scrolls
  waveHeight: 64, // height of an R spike, in pixels
  bed: { x: 300, y: 322, w: 250, h: 26 },
  patientSize: 150,
  resident: { x: 78, y: 440, size: 150 },
  techDesk: { x: 632, y: 262, w: 160, h: 36 },
  techSpots: [660, 712, 764], // TUNE: x positions; more techs than spots show as "xN"
  techY: 282,
  techSize: 96,
  pacemakerShelf: { x: 22, y: 56, w: 130, h: 70 },
  pacemakerSlots: 10,
  thumbsEvery: 10, // the resident gives a thumbs-up every this many combo
  staffBurstEvery: 2.4,
}

export const CARDIO_COLORS = {
  wall: '#2a1f3d',
  wallTrim: '#3b2c55',
  floor: '#1a1729',
  screen: '#06160f',
  grid: '#0f3322',
  trace: '#5dff9a',
  traceOld: '#2f8f5a',
  line: '#f4f7fb',
  vf: '#ff5f5f',
  charge: '#f5d33d',
  bed: '#c9d4e3',
  sheet: '#8fb3ff',
  ink: '#f4f7fb',
  muted: '#a99bc4',
  tech: '#5bc0be', // telemetry tech scrubs
}
