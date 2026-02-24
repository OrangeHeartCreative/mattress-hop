# Changelog

## 2026-02-24 — Visual & Gameplay Update

Summary of notable changes made on Feb 24, 2026:

- Replaced the hero with an Atari-style 16×16 pixel sprite (2-frame walk cycle).
- Removed mid-air double-jump; Space performs a single fixed-strength jump.
- Beds redesigned to an Atari block style (headboard, legs, blanket, pillow).
- Bed removal behavior changed: one bed disappears every 10s. After every 2nd removal, one previously-removed bed reappears (softens difficulty progression).
- Added subtle, low-opacity background decorations (window, bookshelf, dresser, picture, clock, lamp, rug). Window centered on the upper wall; bookshelf and dresser sit on the floor.
- Score moved from HTML into the canvas: large, centered at top; all in-game text uses the same monospace score font.
- Increased score font size for better readability.
- Game Over now shows a full solid black overlay with an in-canvas Restart button.
- Removed the HTML `#score` element and cleaned up unused JS variables.
- Various polish: title-music gating, sprite palette tweaks, and small UI improvements.

Files modified:
- `game.js` — core game logic, rendering, audio, and background
- `index.html` — title-screen instructions updated; removed HTML score
- `README.md` — summary of the changes

Notes:
- Canvas: 1200×800; floor at `H - 48`.
- Bed removal interval controlled by `removeInterval` in `game.js` (currently 10000 ms).
If you want a per-commit changelog or a release note, I can prepare a short release description on request.