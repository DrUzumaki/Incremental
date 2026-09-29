// Plays sound effects for game events. All the wiring lives here, so rooms don't need
// to know about audio.
import type { Game } from '../core/game'
import type { Sfx } from './audio'

export function wireSounds(game: Game, sfx: Sfx) {
  game.bus.on('triage', ({ result }) => {
    if (result.kind === 'correct') sfx.pop(game.triage.combo)
    else sfx.wrong()
  })
  game.bus.on('ecg', (r) => {
    if (r.kind === 'hit') sfx.pop(game.ecg.combo)
    else if (r.kind === 'miss') sfx.thud()
    else if (r.kind === 'shock') {
      sfx.zap()
      sfx.fanfare()
    }
  })
  game.bus.on('pharmacy', (r) => {
    if (r.kind === 'correct') {
      sfx.pop(game.pharmacy.combo)
      if (r.risky === 'jackpot') sfx.fanfare()
    } else if (r.kind === 'buffReady') sfx.whoosh()
    else sfx.wrong()
  })
  game.bus.on('surgery', (r) => {
    if (r.kind === 'done') {
      if (r.quality === 'messy') sfx.thud()
      else sfx.pop(game.surgery.combo)
      if (r.perk) sfx.fanfare()
    } else if (r.kind === 'slip') sfx.scratch()
    else sfx.wrong()
  })
  game.bus.on('purchase', () => sfx.click())
  game.bus.on('page', () => sfx.pager())
  game.bus.on('boost', () => sfx.whoosh())
  game.bus.on('buff', () => sfx.whoosh())
  game.bus.on('milestone', () => sfx.fanfare())
  game.bus.on('signOff', () => sfx.fanfare(true))
  game.bus.on('unlock', () => sfx.fanfare())
}
