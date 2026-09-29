# Overnight log

## Run 1: 2026-09-28 (branch `overnight-2026-09-28`)

_Summary goes here at the end of the run._

### Commit: Step 7c, escalation tiers and per-currency art
- **Built:**
  - Each currency now flies to the counter as its own art: Dollars = coins/bills/cash
    stacks, Beats = hearts, Doses = pills/pill bottles, Sutures = thread spools. Bigger values
    show bigger/fancier items (gold, then crystal), keeping particle counts sane.
  - Emergency escalation (from the CLAUDE.md guide, driven by `intensityFor` = income rate):
    - Tier 2: a tip jar beside the resident; each correct sort flicks a coin into it.
    - Tier 3: a street window; ambulances drive past with flashing lights and the room is
      washed in red/blue siren light.
    - Tier 4: a helicopter crosses the window; stretchers glide along a conveyor belt.
    - Tier 5: a river of patients streams past the window; gold bars fountain from the
      nurse station.
  - Every room: ambient currency rain at tier 3+ (more at higher tiers), sized to roughly a
    second of income. Respects "reduce effects".
- **Test:** tiers come with income. Dev preview of tier 5:
  `setInterval(() => __rl.incomeRate.emergency = 200000, 5)` in the console.
- **Assumptions:** thresholds `EFFECTS.intensityThresholds` and rain rates in
  `src/data/effects.ts`; escalation layout/timings `ESCALATION` in `src/data/emergencyScene.ts`.
  Other rooms get the shared tier effects (burst sizes, rain) but not bespoke tier props yet.
- **Open questions:** want bespoke escalation props for Cardiology/Pharmacy/Surgery too
  (e.g. a wall of monitors, pill conveyor, multiple ORs)?

### Commit: Step 7b, sound effects, music and a Settings panel
- **Built:**
  - `src/ui/audio.ts`: everything synthesized with the Web Audio API (no audio files).
    Sound effects: payoff pop that rises in pitch with your combo, coin "tink" as money lands
    in the counter, wrong-answer buzz, miss thud, defibrillator zap, pager beeps, whoosh for
    boosts/IVs, click for purchases, fanfares for milestones/sign-offs/jackpots/trial wins,
    and a comedic sad trombone for losses.
  - Music: one shared soundtrack (a calm night-shift loop: soft chords, bass, hi-hats) and a
    faster, minor-key track that plays during organ trials and bosses.
  - Sound wiring lives in one place (`src/ui/soundHooks.ts`), listening to game events.
  - Settings button (⚙) replaces the old Effects/Reset buttons: sound effects on/off, music
    on/off, volume, reduce effects, reset save. Settings are saved.
- **Test:** click anywhere once (browsers only allow sound after you interact), then play.
  Settings ⚙ to toggle.
- **Assumptions:** levels, tempos and chords in `src/data/audio.ts` (TUNE). I couldn't listen
  to it from here, so please check the mix/volume by ear.
- **Open questions:** do you want real recorded music later? The code can swap in audio files.

### Commit: Step 7a, economy simulator and first balance pass
- **Built:** `npm run simulate` (`tools/simulate.ts`) plays the real game rules with bot players
  (sort / tap beats / fill orders / trace incisions at human-ish speed and accuracy), buys
  the cheapest affordable upgrades, answers pages, sends IVs, clears trials up to tier 4 and
  fights Sepsis every 10 minutes. It prints a timeline (unlocks, sign-offs, trials) and
  2-minute snapshots of lifetime, active and idle income per room.
- **Bugs found and fixed by the simulator:**
  - Pager boosts and caffeine IVs stacked multiplicatively on the same room (x4 x x4 x x2…).
    Now they don't stack: the stronger boost wins and the time extends.
  - Shock / risky jackpots scaled out of control (one shock paid 1,000,000 Beats) because
    Bigger Defibrillator (x1.3 per level) and Serendipity (x1.5) compounded. Now x1.1 / x1.15.
- **Balance changes (all marked TUNE in `src/data/trees/*.ts`):**
  - All rooms' staff use one pattern: hire (+1), training x1.1/level (25), a x1.2/level
    booster (10), and a one-time x2. Base staff rates are ~15-35% of early active pay.
  - Each tree has a `COST_SCALE` (ER 1.8, Cardiology 5, Pharmacy 8, Surgery 150) because
    later rooms arrive with big hospital-wide bonuses (patient flow, synergies, trials, perks).
  - Surgery perks every 30 operations (was 20); Differential x1.12; Resus Bonus x1.15.
- **Result (bot player, which is faster than a person):** Emergency signs off ~26 min,
  Cardiology ~46, Pharmacy ~70, Surgery ~85 min (all four ≈ 1.5 h of optimal play, so a real
  first run should land near the 2 h target). Active play ≈ 3-8x idle in each room.
- **Test:** `npm run simulate` (takes ~1 s). `DEBUG_EARN=50000 npm run simulate` lists big payouts.
- **Open questions:** once you've played, tell me which rooms feel slow/fast; each tree's
  `COST_SCALE` is the quickest knob.

### Commit: Step 6d, Code Blue finale and the discharge ending (step 6 complete)
- **Built:**
  - Code Blue boss (unlocks with Surgery's sign-off): all four organ minigames in rotation
    (Lungs → Heart → Liver → Gut → …), each stage shorter and harder, with a
    "CODE BLUE · STAGE 3/12 · LIVER!" banner between stages. Failing ends the run; every new
    best stage pays Publications.
  - Surviving stage 12 with all four sign-offs discharges the resident: confetti and a
    "DISCHARGED! You survived the night shift." screen with stats (shift length, earnings per
    room, trials, Publications, best boss stages). "Keep playing" returns to the hospital.
  - Each department's "plays one tier easier" trial research also makes its organ easier in
    Code Blue, so upgrades matter for the finale.
  - `npm run check:trials` also plays whole Code Blue runs.
- **Test:** needs Surgery's sign-off. Dev: sign everything off in the console
  (`for (const d of ['emergency','cardiology','pharmacy','surgery']) __rl.state.depts[d].signedOff = true`)
  then Trials → Code Blue → Fight.
- **Assumptions:**
  - "Reach the final stage" = survive stage 12 (`BOSSES.codeBlue.finalStage`).
  - Difficulty ramp `difficultyPerStage: 0.9` (TUNE). Bot check: human-like bots with no
    research average 8 stages and are never discharged; with maxed ease research (3 per
    organ) they're discharged every time.
  - After discharge the game continues; there's no reset/prestige.
- **Open questions:** is "needs research to win" the right finale feel, or should a skilled
  player be able to win without it?

### Commit: Step 6c, Liver and Gut trials (all four organ trials playable)
- **Built:**
  - Liver trial (Pharmacy): purple spiky toxins and green nutrients fall; move the liver with
    the mouse or arrow keys to catch toxins and let nutrients pass. Missed toxins and caught
    nutrients do damage (7 allowed).
  - Gut trial (Surgery): bacteria live along a winding gut. Red spiky ones split every few
    seconds; click them. Zapping a green (good) one just makes room for a bad one. Lose if
    14 bad bacteria are present.
  - `npm run check:trials` now covers all four organs.
- **Test:** Trials panel once Pharmacy / Surgery are open with 25K lifetime.
- **Assumptions:** difficulty numbers in `src/data/trials.ts` (LIVER, GUT). I tuned Liver
  after the bot check showed even a perfect bot only won 38% of tier 1 (now slower, wider
  liver, more toxins, 7 damage allowed): human-like bot ~83% at tier 1.
- **Open questions:** none.

### Commit: Step 6b, Surgery room (trace incisions, surgical residents, robot, permanent perks)
- **Built:**
  - Surgery minigame: a curved dotted incision line on draped skin. Press on the pulsing green
    circle and drag along the line to the red dot. Stray too far and you slip (lose accuracy,
    press the circle again to resume where you left off). Pay = length x accuracy² (a perfect
    85%+ operation pays extra; finishing early can pay more with Fast Hands). The stitched part
    turns into a red line with cross stitches; a scalpel follows your pointer. Each operation
    has a timer; running out breaks the combo.
  - Idle: surgical residents (green scrubs) and later a Surgical Robot arm (300 sutures/s).
  - Export, permanent perks: every 20 completed operations, every room earns +5% for good
    (toast + confetti; counter shown in the room).
  - Surgery tree (19 nodes): Technique, Special (precision/speed), Staff (residents, M&M,
    OR coffee, robot), Perks (Case Log, Teaching Hospital), "Trauma Team" synergy
    (Sutures + Dollars), Gut trial research.
  - Pharmacy tree gains the "Surgical Pharmacy" synergy node (Doses + Sutures).
  - Fixed: an incision could stop one point short of the end and never finish.
- **Test:** opens after Pharmacy's sign-off. Dev: `__rl.state.depts.surgery.unlocked = true`.
- **Assumptions:**
  - Incision shape/tolerances: `SUTURE` in `src/data/surgery.ts`; numbers in
    `src/data/trees/surgery.ts` (TUNE).
  - Completed operations are saved (`surgeryOps`), so perks survive reloads.
  - Perks are "every N operations, +X% to every room"; Case Log / Teaching Hospital improve them.
- **Open questions:** should perks be named, distinct bonuses (e.g. "Faster ambulances") instead
  of a flat hospital-wide %?

### Commit: Step 6a, Pharmacy room (compounding, risky trial drugs, dispensers, caffeine IV buffs)
- **Built:**
  - Pharmacy minigame: a customer brings a prescription (e.g. "Yellow x2, Green x1"). Click the
    pill jars (or press 1-5) to fill the tray, then Dispense (Enter). Exact match pays Doses
    (per pill x combo); wrong mix or running out of time breaks the combo. The Rx card shows
    your progress per colour and flags pills that weren't ordered. Backspace clears the tray.
  - Risky trial drug (R): pays x3 60% of the time, a x6 jackpot 12% of the time (confetti,
    shake), otherwise a comedic side effect ("speaks only in rhyme") at normal pay.
  - Idle: pill dispensers on the wall earn Doses and visibly pay out.
  - Export, timed buffs: each correct order fills a Caffeine IV bag; when full (8 orders),
    "Send IV →" buttons appear for each other open room: x2 income there for 45 s (shown on
    that room's tab).
  - Pharmacy tree (19 nodes): Compounding (pay per pill, patience, combo, Polypharmacy,
    PharmD x2), Special (risky odds, jackpot size), Staff (dispensers, motors, barcodes,
    Robot Pharmacy x2), Buffs (stronger/longer IVs, fewer orders per IV), Liver trial research.
  - Cardiology tree gains the "Beta Blocker Program" synergy node (Beats + Doses, +10% to both).
- **Test:** opens after Cardiology's sign-off. Dev shortcut:
  `__rl.state.depts.pharmacy.unlocked = true`, then the Pharmacy tab.
- **Assumptions:**
  - Jar colours, texts and layout: `src/data/pharmacy.ts`; numbers: `src/data/trees/pharmacy.ts`.
  - Caffeine IV buffs are not saved (they last under a minute).
  - The order timer is 9 s + 1 s per pill.
- **Open questions:** none.

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
