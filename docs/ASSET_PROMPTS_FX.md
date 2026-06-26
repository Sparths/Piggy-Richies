# 🎬 Next-Level FX Asset Pack — Piggy Richies

Optional "AAA polish" assets on top of the symbols/background/logo. The game
works fully without them; these add animated character reactions, a win-banner
frame, real coin particles and a win-symbol glow.

> **Reality check:** AI image tools can't produce clean, frame-aligned *sprite
> sheets*. So for the wolf/pigs we generate a few **distinct poses** and the
> code animates between them (swap + squash/scale/bounce). For frame/coin/glow,
> a single image is perfect.

**Master style (prepend to every prompt):** *premium 3D-rendered AAA online-slot
art, polished black-and-gold with red ruby accents, glossy specular highlights,
soft top-left studio light, charming fairytale "Three Little Pigs" theme,
isolated on a fully transparent background, no text, no border.* Use one style
reference / seed across the set so it matches the existing symbols.

Drop everything in **`frontend/assets/fx/`** (transparent **PNG**, I optimise to
WebP). Then ping me — I wire them in (swap/scale animations, particle image,
overlays). Generate larger, the target size is the final on-disk size.

| File | Final size | Transparent | Purpose |
|------|-----------:|:-----------:|---------|
| `wolf-idle.png`  | 768×768   | yes | wolf resting at the reel side |
| `wolf-blow.png`  | 768×768   | yes | wolf mid-"huff & puff" (paired w/ idle) |
| `pig-cheer.png`  | 1024×768  | yes | pigs celebrating, pops up on big win |
| `winframe.png`   | 1600×900  | yes (center) | ornate frame behind BIG/MEGA WIN text |
| `coin.png`       | 256×256   | yes | gold coin used by the particle engine |
| `symwin.png`     | 512×512   | yes (center) | glowing ring over a winning symbol |

---

## A · Character poses (code-animated)

### `wolf-idle.png` — 768×768
```
<master> ...the Big Bad Wolf as a charismatic 3D cartoon character, head and
shoulders, sly confident half-smile, grey fur, gold-rimmed glowing eyes, a dapper
dark hat with a gold band, calm idle pose facing slightly right toward the reels,
AAA slot mascot.
```

### `wolf-blow.png` — 768×768  *(same character, action pose — pair with idle)*
```
<master> ...the SAME Big Bad Wolf character, mid "huff and puff": cheeks puffed
out, blowing a strong stylised gust of cartoon wind to the LEFT, eyes narrowed
with effort, dynamic exaggerated pose. EXACT same art style, colors, hat and
lighting as the idle wolf so the two form a matched 2-frame pair.
```
> Wired: shown at the reel edge; on every tumble I swap idle→blow + scale-punch,
> then back. Replaces the current emoji-free CSS wolf.

### `pig-cheer.png` — 1024×768
```
<master> ...the three little pigs together cheering and jumping for joy — the
cool brick pig with black sunglasses and gold chain, the wood pig in a yellow
hard hat, the shy straw pig — arms raised, big happy smiles, a few gold coins and
confetti around them, celebratory group pose.
```
> Wired: slides up from the bottom with a bounce during BIG/MEGA/EPIC wins.

*(Optional extra poses if you want more reactions: `wolf-angry.png` (scowling,
for when the player wins big), `pig-scared.png` (for a near-miss). Same specs.)*

---

## B · Win banner frame

### `winframe.png` — 1600×900, transparent center
```
<master> ...an ornate premium gold ribbon-and-scrollwork frame/banner for a
casino "BIG WIN" display, baroque corners studded with red rubies, a warm inner
glow, a wide EMPTY transparent area in the middle for the win text and amount,
dramatic and celebratory, AAA slot UI, no text inside.
```
> Wired: sits behind the `BIG/MEGA/EPIC WIN` label + count-up amount.

---

## C · Particle coin & win-symbol glow

### `coin.png` — 256×256
```
<master> ...a single premium 3D gold coin, glossy beveled milled rim, a cute pig
snout emblem embossed in the centre, a bright specular highlight, slight tilt,
clean — a game particle/token asset.
```
> Wired: the particle engine (`fx.js`) draws this image (with rotation for the
> flip) instead of the procedural coins — richer coin showers.

### `symwin.png` — 512×512, transparent center
```
<master> ...a glowing golden circular energy ring with radiant sparkles and
small light rays, bright gold, a fully transparent hole in the centre and
transparent background — a "winning symbol" highlight effect for a slot.
```
> Wired: overlaid on each winning tile (`.cell.win`) as a spinning glow.

---

## Install

1. Generate at high res, export **transparent PNG**, name exactly as above.
2. Put them in `frontend/assets/fx/`.
3. Tell me they're in — I optimise to WebP and wire the animations
   (the swap/scale/bounce, the particle image, the overlays). No work for you.
