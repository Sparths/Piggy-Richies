# frontend/assets — game art (installed)

Premium generated art is **installed and wired** here as optimized WebP and
listed in [`manifest.js`](manifest.js); the game uses it automatically and falls
back to the built-in SVG for anything not listed.

```
symbols/<ID>.webp   13 symbols (W S P1 P2 P3 M1 M2 M3 A K Q J BR), 512×512, ~0.5 MB total
background.webp     full-bleed scene, 1920px wide
logo.webp           gold wordmark, 760px wide
```

## Replacing / adding art

1. Generate PNGs with the prompts in [`../../docs/ASSET_PROMPTS.md`](../../docs/ASSET_PROMPTS.md)
   and drop them here (`background.png`, `logo.png`, `symbols/<ID>.png`).
2. Optimize them to web-ready WebP (crops symbols to content, squares them,
   resizes, compresses):
   ```bash
   pip install Pillow
   python tools/optimize_assets.py
   ```
3. Make sure the new files are listed in [`manifest.js`](manifest.js), reload.

The original 22 MB source PNGs were converted to ~0.8 MB of WebP and removed from
the working tree (still in git history) to keep the live site fast.
