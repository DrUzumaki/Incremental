# Overnight log

## Run 1: 2026-09-28 (branch `overnight-2026-09-28`)

_Summary goes here at the end of the run._

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
