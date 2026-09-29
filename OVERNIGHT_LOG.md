# Overnight log

## Run 1: 2026-09-28 (branch `overnight-2026-09-28`)

_Summary goes here at the end of the run._

### Commit: Step 5c, Sepsis boss, Publications and the Publications tree (step 5 complete)
- **Built:**
  - Sepsis boss (unlocks with Cardiology's sign-off, from the Trials panel): a body map of 15
    regions. Infection grows and spreads to neighbouring regions (skin turns green, purple
    germs appear); click a region to spray antibiotics. Each stage lasts 20 s and spreads
    faster with more new infection sites. The run ends when 70% of the body is infected.
  - Every new best stage pays Publications immediately (toast + result card summary).
  - Publications tree (button in the Trials panel header): Case Report (every room x1.25),
    Tenure (x2), A Syndrome Named After You (x3), Review Article (more Stem Cells),
    Meta-analysis (shorter trial cooldowns), Research Grant (more offline earnings),
    Citation Classic (bosses pay more Publications).
  - The Trials button badge also lights up when a Publications upgrade is affordable.
- **Test:** needs Cardiology's sign-off. In dev: `__rl.state.depts.cardiology.signedOff = true`,
  then Trials, Fight Sepsis. Then Trials, Publications tree.
- **Assumptions:**
  - Body map layout: `src/data/sepsisMap.ts`. Spread, stage length, lose threshold and
    Publications per stage: `BOSSES.sepsis` in `src/data/trials.ts` (TUNE).
  - "Stage reached" counts stages fully survived.
  - A boss run has no cooldown (replay as often as you like; only new bests pay).
- **Open questions:** should boss runs have a cooldown or entry limit?

### Commit: Step 5b, Heart trial
- **Built:** Heart trial (Cardiology's organ trial). A big beating heart; stray electrical
  sparks crawl (wobbling) from the heart wall toward the glowing AV node. Click them to zap.
  Five leaks and you lose; survive the timer to win. Leaks shown as five little hearts.
  Cardiology tree gains Stem Cell research: Electrophysiology Lab (shorter cooldown), Heart
  Foundation Grant (bigger rewards), Crash Cart Drills (plays a tier easier).
- **Test:** needs Cardiology open with 25K lifetime Beats, then Trials, Start.
  `npm run check:trials` prints bot win rates.
- **Assumptions:** spark speed/spawn rate/leaks in `src/data/trials.ts` (HEART, TUNE).
  Bot check: a human-like bot wins tiers 1-4 reliably, ~70% at tier 5, then walls at 6.
- **Open questions:** none new.

### Commit: Step 5a, organ trials framework, Trials panel, Lungs trial, Stem Cells
- **Built:**
  - "Trials" button in the top bar (badge when a trial is ready) opens the Organ trials
    panel: a giant patient whose organs glow when their trial is ready, plus a card per
    organ and per boss (Sepsis, Code Blue) with status, reward preview and Start/Fight.
  - Organ trials unlock when a department has earned 25K lifetime. Clearing one gives a
    permanent income multiplier to that department (x1.5 for tier 1, bigger each tier) and
    Stem Cells; the next tier is harder. Cooldown 10 min after a clear, 1 min after a loss.
  - Trials play in a full-screen window: intro card, 3-2-1 countdown, the minigame with a
    timer bar and status, "Give up", then a result card. Room minigames pause meanwhile;
    idle income keeps flowing. The window pauses if the tab is hidden.
  - Lungs trial (Emergency): hold mouse/Space to breathe in, release to breathe out; keep
    the white line in the drifting green band to keep oxygen up; random coughs jolt you.
  - Stem Cell research nodes in the Emergency tree (Special side, "Trial research" branch):
    Pulmonary Research (shorter cooldown), Respiratory Grant (bigger rewards),
    Bigger Oxygen Tank (plays a tier easier).
  - `npm run check:trials`: bots play each trial at every tier and print win rates.
- **Test:** earn 25K lifetime in Emergency, click Trials, Start Tier 1.
- **Assumptions:**
  - Unlock threshold, cooldowns, rewards and each minigame's difficulty: `src/data/trials.ts`.
  - A lost trial has a 1-minute wait ("losing costs only time").
  - Trial rewards are stored when earned, so later upgrades don't change past rewards.
  - Stem Cells are one shared pool, spent on each department's own trial research nodes.
- **Open questions:** the Lungs check shows a human-like bot wins tiers 1-5 and then hits a
  wall at tier 6 (the band gets too fast to follow with a 0.25 s delay). Is that the curve
  you want, or should later tiers ramp more gently?

### Commit: Step 4c, pager, patient-flow export, synergy node (step 4 complete)
- **Built:**
  - Pager (bottom-right): once two rooms are open, every 45-90 s a page arrives for a room
    you're *not* in ("Code in Cardiology!" / "Bed 4 would like a sandwich."). You have 20 s:
    click Respond (or press P, or just click that room's tab) to jump there and get x4
    (urgent) or x3 (low priority) payout in that room for 30/20 s. Ignoring costs nothing.
    Boosts show on the room's tab ("x4 · 22s").
  - Emergency Special branch: Charge Nurse (staff auto-answer low-priority pages) and
    Louder Pager (boosts last longer).
  - Patient flow export: Emergency's "Admissions Desk" node (Flow branch) gives every other
    room +5% income per level.
  - First synergy node: "Cardiac Fast-Track" on the Emergency tree's outer edge, costs Dollars
    AND Beats, +10% income to both rooms per level. It shows a dashed "→ Cardiology" arrow and
    stays a "?" until Cardiology is open.
- **Test:** needs two rooms open. In dev: `__rl.state.depts.cardiology.unlocked = true`,
  then wait for a page (or `__rl.pager.nextAt = __rl.pager.time + 1`).
- **Assumptions:**
  - Pager timings, boost sizes and page texts: `src/data/pager.ts` (TUNE).
  - A pager boost multiplies *all* income in that room (active + idle).
  - Pages only happen while the tab is visible, and never for the room you're in.
  - Synergy nodes: one per department pair, placed in the earlier room's tree (ER↔Cardiology
    here; Cardiology↔Pharmacy, Pharmacy↔Surgery, Surgery↔ER come with those rooms).
- **Open questions:** none.

### Commit: Step 4b, Cardiology room (ECG rhythm minigame, techs, pacemakers, tree)
- **Built:**
  - Cardiology minigame: an ECG trace scrolls across a monitor; click or press Space as each
    beat's spike crosses the white line. A gold band marks "perfect" timing (pays x1.5),
    a wider band "good". Missing beats or tapping on nothing breaks the combo.
  - Shockable rhythm jackpots: every ~40 s the trace turns into VF (red squiggle). A charge bar
    fills; tap once it says "SHOCK NOW!" for a big jackpot (30 beats' worth x combo). The
    patient jumps, sparks fly, the resident points and cheers. Too early: "Still charging!".
    Ignore it and it converts on its own ("Awkward.").
  - Idle: telemetry techs (behind a desk with mini monitors) and pacemakers (a shelf of
    blinking devices) earn Beats; techs visibly pay them out.
  - Cardiology tree (17 nodes): Rhythm (beat pay, BPM, timing windows, perfect bonus, combo,
    Fellowship x2), Devices (pacemakers, batteries, Wireless x2, Hospital Tempo), Staff (techs,
    training, Second Monitor, Night Team x2), Special (bigger defib, more VF, faster charge).
  - Hospital Tempo (export): every room's idle income +5% per level.
- **Test:** needs Emergency's 1M sign-off to unlock. For a quick look in dev:
  `__rl.state.depts.cardiology.unlocked = true` in the console, then click the tab.
- **Assumptions:**
  - ECG layout, scroll speed, VF timing and joke lines: `src/data/cardiology.ts`.
  - Beat value, BPM, windows, VF frequency, jackpot size, staff rates: baseStats in
    `src/data/trees/cardiology.ts` (TUNE).
  - "Global tempo speeds all rooms" is implemented as a bonus to every room's *idle* income
    (not the active minigame speed, which would make them harder).
- **Open questions:** should tempo also speed up the minigames themselves?

### Commit: Step 4a, department tabs and room framework
- **Built:**
  - Department tabs above the room: each unlocked department shows its name, currency,
    a ✓ once signed off, and a "!" badge when its skill tree has something affordable.
    The next locked department is shown greyed out with its goal and progress
    ("🔒 Emergency sign-off (37%)").
  - Rooms: each department has its own canvas, created the first time you open it; only the
    room you're viewing runs its minigame, all rooms keep earning idle income.
  - Unlocking: a department unlocks when the previous one gets its 1,000,000 sign-off
    (toast: "Cardiology is now open!").
  - Shared room parts (`src/ui/characters/actors.ts`, `src/ui/roomKit.ts`): the resident's
    gesture logic and a "staff crew" that pays idle income out visually, so every room
    reuses them. The skill tree follows the room you switch to.
  - The side panel is gone, so the room is now full width.
- **Test:** the Cardiology tab appears greyed with your Emergency progress.
- **Assumptions:**
  - Unlock order and rule: `unlockAfter` in `src/data/departments.ts` (each department opens
    at the previous one's sign-off). This makes the run sequential, ~30 min per room.
  - Each room's how-to-play hint text is also in `src/data/departments.ts`.
- **Open questions:** should later departments unlock earlier (e.g. at 100K) so rooms overlap more?

### Commit: Step 3d, idle nurses on screen, offline earnings, milestone celebrations
- **Built:**
  - Hired nurses appear behind a Nurse Station next to the resident (up to 4 shown, then
    "xN"). Idle income is paid out visually: every couple of seconds a nurse points and a
    burst of cash flies from them to the counter.
  - Offline earnings: when you come back, a "While you were on break…" window shows what
    your staff earned. Also used if the laptop sleeps with the game open.
  - Milestones (first $1K, then every 10x) get a toast, a confetti shower and the resident
    cheering. The 1,000,000 sign-off gets a bigger toast, double confetti and a shake.
  - Queueing patients now hurry to their spot when far away, so the front patient isn't
    still walking in while their patience runs down.
- **Test:** buy "Hire Triage Nurse" and watch the nurse station. Close the tab for a few
  minutes and come back to see the offline summary. Earn $1K / $10K for celebrations.
- **Assumptions (TUNE):**
  - Offline pays 50% of the idle rate, capped at 8 hours; absences under 30 s show nothing
    (`src/data/economy.ts`).
  - Nurse payout rhythm and station layout: `src/data/emergencyScene.ts`.
  - Nurses re-use the resident's gestures (they point toward the bays when paying out).
  - Note: the in-app test browser's save now has extra test money from checking milestones.
    Use "Reset save" there if you want a clean start.
- **Open questions:** none.

### Commit: Step 3c, skill tree (replaces the side upgrade panel)
- **Built:** `src/ui/skillTree.ts`, a Nodebuster-style tree opened with the "Skill tree"
  button (or the T key). Root in the centre; branches Diagnosis (up, blue), Flow (right,
  green), Staff (down, purple), Special (left, gold).
  - Buying a node reveals its neighbours; unrevealed neighbours show as "?" silhouettes.
  - Node looks: affordable = glowing pulse; too expensive = greyed; owned = filled;
    maxed = gold ring; multi-level nodes show a progress ring and "lv/max".
  - Drag to pan, scroll to zoom, hover for details (cost turns red if you're short), click
    to buy (sparks, "Lv N" pop, node bounce, tiny shake). Esc or Close to exit.
  - The tree frames what you can see when opened, so it starts small and grows.
  - The room keeps running under the tree. The Skill tree button shows a pulsing "!" badge
    whenever something visible is affordable.
  - Emergency tree now has 15 nodes (the 5 original upgrades + 10 new: Pattern Recognition,
    Resus Bonus, Differential Diagnosis, Board Certification, Bigger Waiting Room,
    Ambulance Bay, Hire Triage Nurse, Nurse Training, Break Room Coffee, Night Float Team).
- **Test:** Start Shift, press T (or click Skill tree), hover and buy nodes.
- **Assumptions:**
  - Node positions, links, costs and effects: `src/data/trees/emergency.ts`.
  - Branch colours/icons and zoom limits: `src/data/treeStyle.ts`.
  - Node icons are simple text glyphs (✚ » ☻ ★) for now; nicer drawn icons could come in polish.
- **Open questions:** none.

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
