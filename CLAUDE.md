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
- Upgrades are bought on a SKILL TREE per department (Nodebuster-style), not a side list.
  See "Skill trees" below.
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

## Feel and animation ("juice") — CORE DESIGN PILLAR

Satisfaction is the main reason people play this genre. Fortune Mill works because each room's
core action (a dart hitting the board, a pachinko ball dropping, a scratch-off) visibly spits out
money, and as you upgrade it escalates until money never stops pouring. We copy that.

- **Every room has one payoff moment** that must feel good even at level 1. Emergency: a sorted
  patient bursts out cash that arcs up to the money counter, with a pop sound.
- **Intensity scales with progress.** The more upgraded a room is, the more there is on screen:
  more patients, more staff working, more and bigger money bursts, faster motion, until the
  room is a constant fountain of money. The late game should look absurd, in a good way.
- **Tie intensity to game state, not to time.** Visual tier is driven by the room's income
  rate / upgrades owned, computed by one helper (e.g. `intensityFor(room)`), so it always
  matches how powerful the player is.
- **Money art upgrades with value** so particle counts stay sane while the feeling grows:
  coins → bills → cash stacks → gold bars → gems. One big bar can stand for many coins.
- **Money flies to the counter.** Earned money physically travels to the currency display,
  which bumps/pulses on arrival. The counter ticks up smoothly, never jumps.
- **Combos escalate the feel:** rising sound pitch, stronger colour, more particles, light
  screen shake at high combos. Breaking a combo has a comedic, clearly-readable reaction.
- **Milestones get celebrations:** first $1K, each 10x, and the 1,000,000 sign-off get a
  bigger moment (flash, confetti, resident cheering).
- **Emergency escalation guide** (tune the thresholds later with the simulator):
  1. Walk-ins one at a time; small cash pops.
  2. Busier queue; nurses sorting beside the resident; cash arcs into a tip jar.
  3. Ambulances pull up with sirens; patients stream in; steady spray of bills.
  4. Helicopter pad, stretchers on a conveyor; cash stacks raining constantly.
  5. Absurd: whole wall is a moving river of patients, gold bars fountaining nonstop.
- Other rooms follow the same idea (Cardiology: each heartbeat pumps money out, defib jackpots
  explode; Pharmacy: jackpot prescriptions spill pills and cash; Surgery: sutures zip with
  sparks, completed operations pay out in a burst).
- **Performance is part of the feel:** stay smooth at 60 fps even at max intensity. Use one
  shared pooled effects system (particles, pop-ups, flying money, shake) with a hard cap on
  live particles; merge small payouts into bigger visual items instead of spawning more.
- Effects never change game rules; they only read game state. Include a "reduce effects"
  setting (and respect prefers-reduced-motion).
- Every new feature ships with basic feedback. The shared effects system is built with the
  game loop in step 3; full escalation tiers and the showpiece effects come in step 7, but
  each room should reach at least tier 2 when it is first built.

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

## Skill trees

- Each department has its own tree, opened with a "Skill tree" button from the room. The room
  keeps running (idle staff keep earning) while the tree is open.
- Layout: a root node in the centre; branches grow outward. Emergency branches:
  Diagnosis (pay, combo), Flow (arrivals, patience), Staff (automation), Special (hints, pager).
- Buying a node reveals its neighbours. Unrevealed neighbours show as locked "?" silhouettes,
  so there's always something to aim for.
- Most nodes are multi-level (Lv x/max, cost = base * growth ** level); some are one-time.
- Node states are visually distinct: locked, affordable (glows/pulses), too expensive, maxed.
- The tree can be panned (drag) and zoomed (scroll); it starts small and grows large.
- Synergy nodes sit on a tree's outer edge, cost currency from two departments, and link
  visually toward the other department's tree.
- While in the room, the Skill tree button shows a badge when any revealed node is
  affordable, so players still feel upgrades "pop" into affordability without the tree open.
- Tree layout (node positions, links, costs, effects) is data in src/data/, not hard-coded
  in drawing code. Drawn in flat vector style on Canvas, with juice on purchase.
- Later: a global Publications tree (boss rewards) uses the same tree system.

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
3. Core systems: game loop, idle staff, offline earnings, and the skill tree (replacing the
   side upgrade panel; move the 5 existing upgrades into the Emergency tree).
4. Cardiology + pager + cross-room exports.
5. Lungs and Heart trials, then Sepsis.
6. Pharmacy, Surgery, their trials, and the Code Blue finale.
7. Balancing with the simulator, then art, sound, and polish.
8. Playtest, then publish on itch.io.

Current step: 2b (Stage A done: character system + dev preview at /characters.html; Stage B, wiring into Emergency, next).
(Update this line as we progress.)

## Working unattended (overnight runs)

When told to work unattended:
- Work on a branch, never main: `git checkout -b overnight-<date>` (e.g. overnight-2026-09-29).
  Commit and push that branch after each small working piece; do not merge into main.
- Keep going through the build order as far as possible without waiting for input (up to and
  including step 7; never publish anything in step 8). Where a design is only sketched in this
  file (e.g. trial or boss minigame details), build a simple, playable version that follows
  the sketch, log the open questions, and keep going.
- When a design choice isn't covered here, pick the simplest reasonable option, keep going,
  and record it. Never delete or rewrite existing design sections of this file.
- Make every choice easy to change later: numbers, text, colours, timings and tree layout go
  in src/data/; mark guessed values with a `// TUNE:` comment explaining what they control.
- Keep a running log in OVERNIGHT_LOG.md (newest run at the top), one entry per commit:
  what was built, how to test it, each assumption made and the exact file/setting to change
  it, and any open questions. End the run with a short summary at the top of the entry.
- If something fails repeatedly (build errors, a bug you can't fix in a few tries), revert to
  the last working commit, log what happened, and move on or stop.

## How to work in this repo

- Do one step at a time. After each change, tell me how to test it in the browser.
- Run `npm run dev` to test and `npm run build` before saying something is done.
- After each working change (once `npm run build` passes), commit it with a clear message
  and run `git push` to GitHub (origin: github.com/DrUzumaki/Incremental, branch main).
  Never commit or push code that fails to build. If a push fails, tell me the error.
- If a request is unclear or conflicts with this file, ask before building.
