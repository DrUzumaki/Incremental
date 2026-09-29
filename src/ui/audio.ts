// Sound effects and music, synthesized with the Web Audio API.
// Browsers only allow sound after the player interacts, so the audio starts on the first
// click or key press. Visual/audio only: nothing here changes game rules.
import type { Settings } from '../core/state'
import { AUDIO, MUSIC } from '../data/audio'

type Track = keyof typeof MUSIC

export type Sfx = ReturnType<typeof createAudio>

export function createAudio(settings: Settings) {
  let ctx: AudioContext | null = null
  let master: GainNode
  let sfxBus: GainNode
  let musicBus: GainNode
  let noise: AudioBuffer
  let track: Track = 'shift'
  let nextBeat = 0
  let beat = 0
  let lastCoin = 0

  function start() {
    if (ctx) return
    try {
      ctx = new AudioContext()
    } catch {
      return // no audio available; the game plays silently
    }
    master = ctx.createGain()
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = AUDIO.sfxLevel
    sfxBus.connect(master)
    musicBus = ctx.createGain()
    musicBus.gain.value = AUDIO.musicLevel
    musicBus.connect(master)
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    nextBeat = ctx.currentTime + 0.1
    applySettings()
    setInterval(scheduleMusic, 100)
  }
  // Start on the first interaction (browser autoplay rules).
  for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, start, { once: false, capture: true })

  function applySettings() {
    if (!ctx) return
    master.gain.value = settings.sound ? settings.volume : 0
    musicBus.gain.value = settings.music ? AUDIO.musicLevel : 0
  }

  // --- Building blocks ---

  function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number; bus?: GainNode } = {}) {
    if (!ctx || !settings.sound) return
    const t = ctx.currentTime + (opts.delay ?? 0)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(freq, t)
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain)
    gain.connect(opts.bus ?? sfxBus)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  function hiss(dur: number, opts: { vol?: number; freq?: number; delay?: number; bus?: GainNode } = {}) {
    if (!ctx || !settings.sound) return
    const t = ctx.currentTime + (opts.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = opts.freq ?? 3000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(opts.vol ?? 0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(opts.bus ?? sfxBus)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  // --- Music: a gentle loop, or an urgent one during trials and bosses ---

  function scheduleMusic() {
    if (!ctx || !settings.music) return
    const m = MUSIC[track]
    const step = 60 / m.bpm / 2 // eighth notes
    while (nextBeat < ctx.currentTime + 0.3) {
      const bar = Math.floor(beat / 8) % m.chords.length
      const chord = m.chords[bar]
      const at = nextBeat - ctx.currentTime
      const note = (semi: number, oct = 0) => m.root * 2 ** (semi / 12 + oct)
      if (beat % 8 === 0) {
        for (const semi of chord) tone(note(semi), step * 7.5, { type: 'triangle', vol: 0.05, delay: at, bus: musicBus })
        tone(note(chord[0], -1), step * 3.5, { type: 'sine', vol: 0.12, delay: at, bus: musicBus })
      }
      if (beat % 8 === 4) tone(note(chord[0], -1), step * 3, { type: 'sine', vol: 0.09, delay: at, bus: musicBus })
      if (m.arp) tone(note(chord[beat % chord.length], 1), step * 0.9, { type: 'square', vol: 0.025, delay: at, bus: musicBus })
      else if (beat % 2 === 1) hiss(0.04, { vol: 0.03, freq: 8000, delay: at, bus: musicBus })
      nextBeat += step
      beat++
    }
  }

  return {
    applySettings,
    setTrack(t: Track) {
      track = t
    },
    // The payoff pop: rises in pitch with the combo.
    pop(combo = 0) {
      const up = 1 + Math.min(AUDIO.maxComboPitch, combo * AUDIO.comboPitchStep)
      tone(520 * up, 0.12, { type: 'triangle', vol: 0.3, slide: 1.8 })
      tone(1040 * up, 0.08, { type: 'sine', vol: 0.12, delay: 0.03 })
    },
    coin() {
      if (!ctx) return
      if (ctx.currentTime - lastCoin < AUDIO.coinEvery) return
      lastCoin = ctx.currentTime
      tone(1800 + Math.random() * 400, 0.07, { type: 'sine', vol: 0.08 })
    },
    wrong() {
      tone(150, 0.25, { type: 'sawtooth', vol: 0.15, slide: 0.7 })
    },
    thud() {
      tone(90, 0.18, { type: 'sine', vol: 0.3, slide: 0.5 })
    },
    click() {
      tone(700, 0.05, { type: 'square', vol: 0.08 })
      tone(1100, 0.08, { type: 'triangle', vol: 0.12, delay: 0.04 })
    },
    zap() {
      hiss(0.35, { vol: 0.35, freq: 1500 })
      tone(80, 0.4, { type: 'sawtooth', vol: 0.25, slide: 3 })
    },
    pager() {
      for (let i = 0; i < 3; i++) tone(2200, 0.08, { type: 'square', vol: 0.1, delay: i * 0.14 })
    },
    whoosh() {
      hiss(0.35, { vol: 0.2, freq: 1200 })
      tone(300, 0.3, { type: 'sine', vol: 0.12, slide: 3 })
    },
    fanfare(big = false) {
      const notes = big ? [523, 659, 784, 1047, 784, 1047] : [523, 659, 784, 1047]
      notes.forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.25, delay: i * 0.1 }))
    },
    sad() {
      ;[392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.25, { type: 'sawtooth', vol: 0.1, delay: i * 0.25, slide: i === 3 ? 0.9 : 1 }))
    },
    scratch() {
      hiss(0.15, { vol: 0.15, freq: 5000 })
    },
  }
}
