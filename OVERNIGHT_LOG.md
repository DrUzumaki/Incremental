# Overnight log

## Run 1: 2026-09-28 (branch `overnight-2026-09-28`)

_Summary goes here at the end of the run._

### Commit: Character pass stage A (shared body, resident + patients, preview page)
- **Built:** the shared flat-vector character system in `src/ui/characters/` (body, faces, poses,
  looks) and a dev-only preview page. This was reviewed and approved before the run
  (resident body positioning still to be improved later, per your note).
- **Test:** `npm run dev`, open http://localhost:5173/characters.html.
- **Assumptions:** none new.
- **Open questions:** the resident's body positioning still feels awkward (noted for later).
