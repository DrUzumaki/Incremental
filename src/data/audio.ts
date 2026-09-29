// Sound and music settings. Everything is synthesized in code (no audio files).

export const AUDIO = {
  masterVolume: 0.6, // default; the player's volume setting overrides it
  sfxLevel: 0.5,
  musicLevel: 0.22,
  coinEvery: 0.06, // seconds between coin "tinks" as money lands (so they don't blur)
  comboPitchStep: 0.03, // payoff pop rises this fraction per combo (up to maxComboPitch)
  maxComboPitch: 0.9,
}

// Music: chords as semitone offsets from a root note (A = 220 Hz).
export const MUSIC = {
  shift: {
    bpm: 84, // TUNE: the everyday soundtrack
    root: 220,
    chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 11, 14, 17]], // Amaj7-ish, calm
    arp: false,
  },
  boss: {
    bpm: 132, // trials and bosses: faster and more urgent
    root: 196,
    chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], // minor, descending
    arp: true,
  },
}
