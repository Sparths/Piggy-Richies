# frontend/assets — drop generated art here

The game ships with built-in **SVG vector art**, so it works with this folder
empty. To upgrade to premium generated images:

1. Generate art using the prompts in [`../../docs/ASSET_PROMPTS.md`](../../docs/ASSET_PROMPTS.md).
2. Save them here:
   - symbols → `assets/symbols/<ID>.webp` (IDs: `W S P1 P2 P3 M1 M2 M3 A K Q J BR`)
   - background → `assets/background.webp`
   - logo → `assets/logo.webp`
3. List what you added in [`manifest.js`](manifest.js).
4. Reload — the game uses your images and falls back to SVG for anything missing.

No build step, no code changes.
