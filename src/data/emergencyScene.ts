// Layout, timings and colours for the Emergency room scene (visual only, no game rules).
// The canvas is drawn at 800 x 450 and scaled to fit.
import type { Severity } from './emergency'

export const SCENE = {
  width: 800,
  height: 450,
  wallHeight: 250, // TUNE: where the back wall meets the floor

  // Patients walk in through a door on the left and queue toward the right.
  doorX: -50, // off-screen start point for arrivals
  exitX: -70, // where patients who storm out disappear
  queueFrontX: 470, // TUNE: where the patient being triaged stands
  queueSpacing: 72, // TUNE: gap between queued patients
  queueY: 392, // feet line of the queue
  patientSize: 118, // TUNE: patient height in pixels
  frontPatientSize: 128,

  walkSpeed: 170, // TUNE: pixels per second when walking in / along the queue
  catchUp: 3, // TUNE: far-away patients walk this many times their distance per second
  toBaySpeed: 210, // TUNE: walking to a bay after being sorted
  stormSpeed: 260, // TUNE: storming out

  // The resident stands in the bottom-left corner.
  resident: { x: 78, y: 440, size: 150 },

  // Bays are stacked on the right: red at the top, green at the bottom,
  // so the resident's pointing clearly differs for each.
  bays: [
    { severity: 'red', key: '1', label: 'Immediate', x: 636, y: 30, w: 150, h: 112, pointAngle: 2.05 },
    { severity: 'yellow', key: '2', label: 'Urgent', x: 636, y: 162, w: 150, h: 112, pointAngle: 1.45 },
    { severity: 'green', key: '3', label: 'Can wait', x: 636, y: 294, w: 150, h: 112, pointAngle: 0.85 },
  ] as { severity: Severity; key: string; label: string; x: number; y: number; w: number; h: number; pointAngle: number }[],

  // Hired nurses stand behind a nurse station on the back wall, next to the resident.
  nurseStation: { x: 96, y: 228, w: 250, h: 30 },
  nurseSpots: [130, 190, 250, 310], // TUNE: x positions; more nurses than spots show as "xN"
  nurseY: 246, // feet line behind the desk
  nurseSize: 92,

  bubbleY: 212, // top of the complaint speech bubble
  messageY: 170, // joke lines for wrong sorts / patients leaving
}

export const SCENE_TIMING = {
  messageLife: 2.5, // seconds a joke line stays on screen
  flashLife: 0.15, // bay flash after a sort
  nurseBurstEvery: 2.4, // TUNE: seconds between nurse payouts (shared by visible nurses)
}

// Combo needed for each level of resident sweat (0-3 drops).
export const SWEAT_AT_COMBO = [3, 6, 10] // TUNE

// Nurses wear scrubs in a different colour from the resident's.
export const NURSE_SCRUBS = '#c9a3ff'

export const SCENE_COLORS = {
  wall: '#1d3150',
  wallTrim: '#284269',
  floor: '#16263d',
  floorLine: '#1f3452',
  door: '#0f1b2d',
  doorFrame: '#3a5580',
  ink: '#f4f7fb',
  muted: '#8ea3bf',
  red: '#e5484d',
  yellow: '#f5b83d',
  green: '#46a758',
}

// Emergency gets busier to look at as it earns more (intensity tiers from income rate).
// Tier 2: tip jar. Tier 3: ambulances with sirens. Tier 4: helicopter + stretcher conveyor.
// Tier 5: a river of patients past the window and gold bars fountaining.
export const ESCALATION = {
  window: { x: 380, y: 88, w: 232, h: 62 }, // a window onto the street
  tipJar: { x: 140, y: 446 },
  ambulanceEvery: 11, // TUNE: seconds between ambulances (tier 3+)
  ambulanceSpeed: 150,
  heliEvery: 19, // tier 4+
  heliSpeed: 110,
  conveyorY: 438, // stretcher conveyor along the bottom (tier 4+)
  conveyorX: 190, // it starts after the resident's corner
  conveyorSpeed: 55,
  paradeSpeed: 38, // tier 5 patients streaming past the window
  goldEvery: 0.35, // tier 5 gold bars from the nurse station
}
