# Resident Life: Code Blue

A medical-themed incremental (idle + active) browser game, inspired by Fortune Mill.
This is the developer's first game. Explain what you build in plain language, keep changes
small, and never add features that weren't asked for.

## The game in brief

- The player is a resident trapped on an endless night shift. To be discharged, they must reach
  1,000,000 of each of four hospital departments' currencies, then reach the final stage of
  the "Code Blue" boss.
- Target length: about 2 hours for a first run. ~30 minutes per department is a guide, not a rule.
- Each department has its own currency, spent only on that department's upgrades, so one
  strong room can't skip the others. Reaching 1,000,000 earns the department's sign-off; the
  million is a gate, not a ceiling, and numbers keep scaling into the trillions.
  A few synergy upgrades cost currency from two departments at once.
- Other currencies: Stem Cells (from organ trials, spent on that department's trial upgrades)
  and Publications (from new best boss stages, spent on big permanent global upgrades).
- Upgrades: 15–20 upgrade TYPES per department (~70 total). Most are multi-level up to a max
  (e.g. 25 or 50); a few are one-time unlocks.
- Tone: light, cartoonish, medical in-jokes. No gore. Failure is comedic, never grim.
- Title screen: "Resident Life" as the large bold title; "Code Blue" as a smaller subtitle
  underneath, aligned right.

## Departments (unlocked in order)

| Department | Currency | Active minigame | Idle staff | Exports to other rooms | Organ trial |
| --- | --- | --- | --- | --- | --- |
| Emergency | Dollars ($) | Triage sorting (red/yellow/green), combo multiplier | Triage nurses | Patient flow | Lungs |
| Cardiology | Beats | Click on the beat of a scrolling ECG; shockable rhythm jackpots | Telemetry techs, pacemakers | Global tempo (speeds all rooms) | Heart |
| Pharmacy | Doses | Compound prescriptions; safe vs risky trial drugs with side effects | Pill dispensers | Timed buffs to other rooms | Liver |
| Surgery | Sutures | Trace an incision/suture line; accuracy sets payout | Surgical residents, then robot | Permanent perks | Gut |

- All departments earn simultaneously, whichever one the player is viewing.
- Active play in the current room should earn roughly 3–5x the idle rate.

## Organ trials and bosses (inside a giant patient)

- Organ trials: short (60–90 s) minigames, one per department, unlocked at a milestone.
  No entry cost; each has a cooldown (~10 min, reduced by upgrades). Clearing one gives a
  permanent multiplier to THAT department and pays Stem Cells. Tiered: each clear unlocks a
  harder tier with a bigger reward.
- Bosses unlock automatically; the player chooses when to fight. Each fight is a run of
  escalating stages that ends on failure. Every new best stage pays Publications. Players
  come back repeatedly as their upgrades improve.
  - Sepsis: unlocks after Cardiology. Contain infection spreading across a body map.
  - Code Blue: unlocks after Surgery. All four organ minigames rotate, faster each stage.
    Reaching the final stage ends the run.
- Losing a trial or boss costs only time.

## Art and audio

- Clean flat vector shapes (drawn in code on Canvas or as SVG). No pixel art.
- One shared soundtrack, with special tracks for events (boss fights, codes).

## Feel and animation ("juice")

- Target feel: Fortune Mill-level spectacle. Money should visibly pour in, and on-screen
  activity should grow as the numbers grow. Achieve it with flat vector shapes, colour, motion
  and particles, not pixel art.
- Every new feature ships with basic feedback: a pop-up, a small tween or a flash. The
  big showpiece effects (particle storms, screen shake, animated staff) come in step 7.
- Visual effects never change game rules. They read from the game state, so they can be
  toned down later (e.g. a "reduce effects" setting) without touching the logic.
- Effects go through one shared, pooled effects system (particles, pop-ups, shake), built
  with the game loop in step 3.

## Characters (flat vector, animated, drawn in code)

- Style: simple flat vector bodies built from shapes (rounded head, torso, limbs), animated
  with code: walk cycles, idle breathing/bob, squash and stretch, facial expressions.
- The resident (player) stands in a corner of every department, holding a clipboard, and
  visibly acts out each decision: points to the chosen bay, thumbs-up on a correct call,
  facepalm on a wrong one, sweat drops as the combo climbs, the odd night-shift yawn.
- Staff the player hires appear on screen beside the resident and visibly do the work,
  so automation is something you watch (like Fortune Mill's helpers).
- Emergency patients:
  - Walk in from the entrance with a walk cycle and join the queue.
  - Act out their complaint (clutching chest, limping, holding an arm, sneezing, scratching).
  - React while waiting: fidget, tap feet, get visibly annoyed as patience runs out.
  - After sorting, walk to their bay (red/yellow/green); if patience runs out they storm out.
- Character drawing and animation live in reusable code (e.g. src/ui/characters/), so every
  department shares one body system with different outfits, poses and props.

## Pager system

- While in one department, the pager announces a timed event in another (e.g. a code in
  Cardiology). Responding in time gives a temporary 3–5x payout there. Ignoring it costs nothing.
- Later upgrades let staff auto-respond to low-priority pages.

## Tech stack and rules

- TypeScript + Vite. Plain HTML/CSS for UI panels; Canvas 2D for minigames. No game engine.
- Keep game logic (state, economy, upgrades) separate from rendering.
- All balance numbers (costs, multipliers, rates) live in `src/data/`, never hard-coded in logic.
- Upgrade cost formula: `cost = base * growth ** level`, growth usually 1.07–1.15.
- Format large numbers as K, M, B, T, then scientific notation, via one shared helper.
- Game loop uses delta time, so speed doesn't depend on frame rate.
- Autosave to localStorage every few seconds; calculate offline earnings on load.
- Save data includes a version number so future changes can migrate old saves.
- Use object pooling for anything spawned in large numbers (particles, pop-ups, patients).
- The game keeps running when the browser tab loses focus.

## Planned folder layout

```
src/
  main.ts            entry point
  core/              state, game loop, save/load, economy helpers
  data/              upgrades, costs, multipliers (all balance numbers)
  departments/       emergency/, cardiology/, pharmacy/, surgery/
  trials/            organ trials and bosses
  ui/                panels, title screen, pager, number pop-ups
tools/
  simulate.ts        auto-plays the economy to check pacing
```

## Build order

1. Project setup (Vite + TypeScript, Git).
2. Emergency prototype with plain shapes: triage minigame, money, 5 upgrades, save/load.
2b. Character pass: animated resident in the corner and animated Emergency patients (see Characters).
3. Core systems: game loop, idle staff, offline earnings, upgrade panel.
4. Cardiology + pager + cross-room exports.
5. Lungs and Heart trials, then Sepsis.
6. Pharmacy, Surgery, their trials, and the Code Blue finale.
7. Balancing with the simulator, then art, sound, and polish.
8. Playtest, then publish on itch.io.

Current step: 3. Step 2 done: Emergency triage prototype (triage minigame, dollars, 5 upgrades, save/load, reset button).
(Update this line as we progress.)

## How to work in this repo

- Do one step at a time. After each change, tell me how to test it in the browser.
- Run `npm run dev` to test and `npm run build` before saying something is done.
- After each working change (once `npm run build` passes), commit it with a clear message
  and run `git push` to GitHub (origin: github.com/DrUzumaki/Incremental, branch main).
  Never commit or push code that fails to build. If a push fails, tell me the error.
- If a request is unclear or conflicts with this file, ask before building.
