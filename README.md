Mattress Hop — Local Build & Changes (summary)

This README summarizes the gameplay and visual changes made on Feb 24, 2026.

## Highlights
- Atari-style hero sprite (16×16 pixel, 2-frame walk cycle).
- Single fixed jump: Space now performs one jump from the ground (no double-jump).
- Beds use a chunky Atari look (headboard, legs, blanket, pillow).
- Background: low-opacity wall decorations (window, bookshelf, dresser, picture, clock, lamp, rug).
  - Window is centered on the upper wall (above gameplay).
  - Bookshelf and dresser sit on the floor; clock moved to the left-center wall.
- Bed removal behavior: one bed disappears every 10s — after every 2nd removal, one previously-removed bed reappears (softens difficulty progression).
- Score is drawn on the canvas (large, centered at top). All in-game text uses the same monospace score font.
- Game Over is a full solid black screen with an in-canvas Restart button.

## Files changed
- `game.js` — main gameplay, rendering, audio, and background code (sprite, beds, score, Game Over, fonts)
- `index.html` — title-screen instructions updated; HTML score removed
- `README.md` — this file

## Developer notes
- Canvas size: 1200×800; floor is at `H - 48`.
- Score is drawn in `game.js` (large monospace, centered). The font is also used for Game Over text and button.
- Bed logic: see `removeRandomBed()` and `updateBeds()` in `game.js` for removal/respawn behavior. The `removeInterval` is currently 10000 (10s).
- Sprite generation: `createSpriteFrames()` defines the pixel maps and `palette`.
- Audio: WebAudio synths for bounce, bed remove, start, and title music. Title music is gated to avoid auto-start during gameplay.