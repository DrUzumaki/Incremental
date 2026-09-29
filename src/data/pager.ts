// The pager: timed events in other rooms that pay extra if you respond in time.
import type { DeptId } from './departments'

export const PAGER = {
  firstPageAfter: 30, // TUNE: seconds after a second room opens before the first page
  intervalMin: 45, // TUNE: seconds between pages (random in this range)
  intervalMax: 90,
  respondTime: 20, // seconds to respond before the page expires
  lowChance: 0.5, // chance a page is low priority
  autoDelay: 2.5, // seconds before staff auto-respond to a low-priority page
  boost: {
    high: { mult: 4, duration: 30 }, // TUNE: responding to a code
    low: { mult: 3, duration: 20 },
  },
}

export const PAGE_TEXT: Record<DeptId, { high: string[]; low: string[] }> = {
  emergency: {
    high: ['Trauma incoming to Emergency!', 'Bus crash, ETA 2 minutes!'],
    low: ['Bed 4 would like a sandwich.', 'Someone swallowed a Lego. Again.'],
  },
  cardiology: {
    high: ['Code in Cardiology!', 'STEMI on the way to the cath lab!'],
    low: ['Telemetry box beeping. (It’s the battery.)', 'Patient asking if coffee counts as cardio.'],
  },
  pharmacy: {
    high: ['Pharmacy: urgent antidote needed!', 'Stat order for the ICU!'],
    low: ['Someone wants their pills in a different colour.', 'Pill counter jammed with a jelly bean.'],
  },
  surgery: {
    high: ['Emergency surgery! Scrub in!', 'Appendix about to pop in OR 2!'],
    low: ['Surgeon needs a second opinion on their playlist.', 'OR 3 ran out of tiny scissors.'],
  },
}
