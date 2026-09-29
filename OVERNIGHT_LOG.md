# Overnight log

## Run 1: 2026-09-28 (branch `overnight-2026-09-28`)

_Summary goes here at the end of the run._

### Commit: Step 3b, shared effects system (flying money, particles, shake)
- **Built:** `src/ui/effects.ts`, one full-screen overlay canvas with a fixed pool of
  particles (hard cap 400): flying money, sparks, confetti, floating text, and screen shake.
  - Emergency payoff: a correctly sorted patient bursts cash that arcs up and flies into the
    money counter; "+$12" floats up; sparks. The counter now glides up (never jumps) and
    bumps as money lands.
  - Money art grows with value: coin, bill, cash stack, gold bar, gem (one item stands for
    more money, so particle counts stay sane).
  - Combos escalate: more items per burst, warmer pop-up colour, bigger text, and light
    shake from a 10 combo. Losing a combo of 3+ shows "Combo xN lost!" with a shake.
  - `intensityFor(game, dept)` (`src/core/intensity.ts`) gives tier 1-5 from income rate.
  - "Effects: full / reduced" button in the top bar (defaults to reduced if your system asks
    for reduced motion). Reduced = few particles, no shake.
- **Test:** sort patients correctly and watch the cash fly to the counter; build a combo of 10+.
  Click "Effects: full" to switch to reduced.
- **Assumptions (all in `src/data/effects.ts`, marked TUNE):** items per burst per tier,
  money-art value bands, intensity thresholds (income/s), shake threshold.
- **Open questions:** none.

### Commit: Step 3a, game engine core (save v2, game loop, data-driven upgrades)
- **Built:**
  - `core/game.ts`: one Game object owns the state and all rules; the screen listens to
    events (`core/events.ts`) instead of reaching into the rules.
  - `core/loop.ts`: rules tick on a timer, so the game keeps earning in background tabs;
    drawing happens separately on animation frames. The triage minigame pauses while the
    tab is hidden (so patients don't walk out), but idle income keeps coming.
  - Save format v2: all four departments, Stem Cells, Publications, settings. Old (v1) saves
    migrate automatically (the five upgrades keep their levels).
  - Upgrades are now skill-tree nodes defined as data in `src/data/trees/emergency.ts`
    (effects like "+1 pay" or "x1.25 nurses" are data, applied by `core/tree.ts`).
    The side panel lists revealed nodes for now; the real skill tree comes in 3c.
  - Hire Triage Nurse node gives idle income ($0.40/s per nurse before upgrades).
  - The top bar shows the idle rate.
- **Test:** `npm run dev`, Start Shift. Your old save should still have its money/upgrades.
  Buy "Hire Triage Nurse" and watch money go up without sorting.
- **Assumptions:**
  - A department's sign-off uses *lifetime* earnings reaching 1,000,000 (spending doesn't
    undo it). Change in `core/game.ts` `checkProgress` / `ECONOMY.signOff` in `src/data/economy.ts`.
  - Pauses longer than 5 minutes while the game is open count as offline time
    (`ECONOMY.offlineGapSeconds`).
  - If a save can't be read, it is copied to `resident-life-save-backup-<time>` in
    localStorage instead of being overwritten. (Added after a hot-reload during my edits
    reset the test browser's save; I restored it: $282, Stethoscopes 15, Chairs 1.)
  - Dev-only: `window.__rl` is the Game; `__rl.pauseWhenHidden = false` keeps the minigame
    running in a hidden tab for testing.
- **Open questions:** should the Triage Desk root node do anything? (Currently free and cosmetic.)

### Commit: Character pass stage B (characters wired into the Emergency room)
- **Built:** the Emergency room is now a scene. Patients walk in through the entrance on the
  left, queue along the floor, act out their complaint, fidget/steam as patience runs out,
  walk up to their bay when sorted (smaller as they go "further away"), or storm out.
  The resident stands bottom-left: points at the chosen bay, then thumbs-up (correct) or
  facepalm (wrong); sweats as the combo climbs; yawns now and then.
  Bays are now stacked on the right (red top, green bottom) so pointing clearly differs.
- **Test:** `npm run dev`, Start Shift, sort patients with 1/2/3 or by clicking the bays.
- **Assumptions:**
  - Each complaint has one "act"; mapping is in `src/data/emergency.ts` (COMPLAINTS).
  - Layout, walking speeds, yawn timing and sweat thresholds are in
    `src/data/emergencyScene.ts` (marked `// TUNE:`).
  - A patient who has been sorted walks to the bay they were sent to, even if it was wrong.
  - Patients who leave walk back out the entrance (behind the resident).
  - Dev-only console handle `window.__rl` (state + triage) for testing; stripped from builds.
- **Open questions:** none.

### Commit: Character pass stage A (shared body, resident + patients, preview page)
- **Built:** the shared flat-vector character system in `src/ui/characters/` (body, faces, poses,
  looks) and a dev-only preview page. This was reviewed and approved before the run
  (resident body positioning still to be improved later, per your note).
- **Test:** `npm run dev`, open http://localhost:5173/characters.html.
- **Assumptions:** none new.
- **Open questions:** the resident's body positioning still feels awkward (noted for later).
