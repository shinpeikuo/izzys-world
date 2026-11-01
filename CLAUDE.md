# Izzy's World — instructions for Claude Code

Read `GAME_SPEC.md` before doing anything. It is the source of truth for scope. If a request conflicts with the spec, ask first.

## Ground rules
- This is a game for a child. **No network calls after install, no analytics, no ads, no accounts, no third-party tracking.** Any dependency that phones home is not allowed.
- All game state stays on the device (IndexedDB). Always keep the backup export/import working.
- The save format is versioned. Any change to saved data needs a migration so existing worlds keep working after an update. Never ship a change that could wipe Izzy's world.
- Landscape only. Touch-first: tap and drag, big targets, no reading needed beyond short labels.
- Never include anything from `_source-photos/` in the build or the repository.
- Keep V1 scope to `GAME_SPEC.md` section 4. Note V2 ideas in `IDEAS.md` instead of building them.

## Working style
- Shinpei is not a professional developer. Explain choices in plain language, give exact steps for anything he has to do himself (GitHub, installing on the tablet), and keep the setup simple.
- Build in the order in GAME_SPEC.md section 8. After each step, tell him how to see it on the tablet.
- Use placeholder art until real art exists in `art/`, following the naming convention in the spec.
