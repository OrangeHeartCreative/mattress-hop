Mattress Hop — Local Build & Changes (summary)

This README summarizes recent visual and gameplay changes.

What's changed:
- Replaced the hero sprite with an Atari-style 16×16 pixel character (2-frame walk cycle).
- Removed in-air double-jump; Space only performs a single jump from the ground.
- Sprite outline and legs are solid black; simplified sprite rendering.
- Beds redesigned to Atari-style blocky look (headboard, legs, blanket, pillow).
- Added low-opacity background decorations (window, bookshelf, dresser, picture, clock, lamp, rug).
	- Window is centered on the upper wall and does not overlap gameplay.
	- Bookshelf and dresser sit on the floor; clock moved to left-center wall.
- Moved score display into the canvas (large, centered at top) and removed the HTML `#score` element.
- Title music startup was adjusted to avoid triggering during active gameplay.

How to run locally:

1. Serve the project root with a static server (Python 3):

	 python3 -m http.server 8000 --bind 127.0.0.1

2. Open http://127.0.0.1:8000 in your browser.

Files edited recently:
- `game.js` — main gameplay, rendering, audio and background code
- `index.html` — updated title-screen instructions and removed HTML score
- `README.md` — this file

Notes for developers:
- Canvas size: 1200×800; floor is at `H - 48`.
- Sprite frames and palette are created in `createSpriteFrames()` inside `game.js`.
- If you want the old HTML score back, restore the `#ui` block in `index.html` and update `updateScore()` in `game.js`.