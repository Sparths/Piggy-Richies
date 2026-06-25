# 🎨 Production Art Pack — Stake's Huff & Puff: Piggy Richies

Everything needed to give the game **AAA, submission-ready art** (Pragmatic
Play / Hacksaw Gaming quality). The client already ships with built-in
**premium gold SVG symbols**, so it looks finished now — but to match a
top-tier slot, generate the images below and drop them in. The game swaps them
in automatically; anything you skip keeps its SVG.

> **Reference look:** polished **3D-rendered, black-and-gold premium** symbols
> with **red gemstone accents**, glossy specular highlights, beveled edges and
> dramatic studio lighting — exactly the style of high-end real-money slots.

**Best tools:** Midjourney v6.1 (characters/scenes), DALL·E 3, **SDXL +
Juggernaut/RealCartoon** (symbols, with a background-removal node), Ideogram
(text/logo). Generate the **whole set in one session with one style reference**
so it's consistent.

---

## 0 · Install (no code changes)

1. Export each file with the **exact name** below as transparent **WebP/PNG**.
2. Symbols → `frontend/assets/symbols/`; the rest → `frontend/assets/`.
3. List what you added in `frontend/assets/manifest.js`:
   ```js
   window.PIGGY_ASSETS = {
     symbols: { W:"assets/symbols/W.webp", S:"assets/symbols/S.webp", P1:"assets/symbols/P1.webp",
                P2:"assets/symbols/P2.webp", P3:"assets/symbols/P3.webp", M1:"assets/symbols/M1.webp",
                M2:"assets/symbols/M2.webp", M3:"assets/symbols/M3.webp", A:"assets/symbols/A.webp",
                K:"assets/symbols/K.webp", Q:"assets/symbols/Q.webp", J:"assets/symbols/J.webp",
                BR:"assets/symbols/BR.webp" },
     background: "assets/background.webp",
     logo: "assets/logo.webp",
   };
   ```
4. Reload.

| Asset | Size | Format | Background |
|---|---|---|---|
| Symbols (13) | 1024×1024 | WebP/PNG | **transparent** |
| Background | 1920×1080 (landscape) | WebP/JPG | full-bleed |
| Logo | 1400×500 | WebP/PNG | **transparent** |

---

## 1 · MASTER STYLE — prepend to every SYMBOL prompt

```
Premium 3D-rendered online slot game symbol, single icon, centered, isolated on
a fully transparent background. AAA mobile-casino quality (Pragmatic Play /
Hacksaw Gaming level). Polished black-and-gold luxury style: rich beveled gold
with warm gradients, deep red ruby gemstone accents, glossy specular highlights,
soft rim light, subtle ambient occlusion, gentle contact shadow under the
object only. Charming fairytale "Three Little Pigs" theme. Bold, instantly
readable silhouette that fills ~85% of the frame, crisp edges, no scene, no
text label, no border, no card frame.
```

**Master negative:**
```
flat, 2d clipart, sticker, photo of real animal, realistic photograph, text,
watermark, signature, frame, border, background scenery, busy, multiple objects,
cropped, blurry, low-res, muddy colors, gore, horror, extra limbs, deformed,
plastic toy
```

**Consistency:** render `W` (wolf) first, then use it as the `--sref` /
style-reference image (or fixed SDXL seed) for all 12 others. One light
direction (top, slightly left) everywhere. Palette: gold `#FFD23F→#B8860B`,
ruby `#E01B2E`, pig pink `#F7ADC4`, wolf grey `#8A93A6`, scatter orange
`#FF9D4D`, brick `#D8693F`.

---

## 2 · Symbols (13) — master block **+** the line below

### 🐺 `W.webp` — Big Bad Wolf · WILD *(render first → style reference)*
```
…a charismatic 3D cartoon Big Bad Wolf head, sleek grey fur with gold-rimmed
glowing eyes, a sly confident fanged grin, pointed ears, faint purple magical
rim-light, sitting on a subtle ornate gold medallion; the premium hero WILD
icon — villainous but charming, ultra-polished.
```

### 🍲 `S.webp` — Boiling Soup Pot · SCATTER
```
…a glossy black cast-iron cauldron brimming with glowing golden-orange soup,
gentle magical steam, a wooden ladle, warm light from within, ornate gold rim,
the special SCATTER icon — inviting and slightly enchanted.
```

### 🐷 `P1.webp` — Brick Pig · PREMIUM (top)
```
…a cool wealthy 3D cartoon pig wearing sleek black sunglasses and a chunky gold
chain, a confident smirk, brick-red accents, faint gold sparkle, on a subtle
gold medallion; the most premium and valuable symbol — looks rich and self-assured.
```

### 🐽 `P2.webp` — Wood Pig · PREMIUM
```
…a hard-working 3D cartoon carpenter pig in a golden-yellow hard hat, pencil
behind the ear, friendly determined smile, warm wood-brown accents, on a subtle
gold medallion; capable and cheerful, premium quality.
```

### 🐖 `P3.webp` — Straw Pig · PREMIUM
```
…a shy nervous 3D cartoon pig with big worried eyes, a single straw stalk in its
mouth, soft pastel-pink with golden straw accents, on a subtle gold medallion;
endearing and timid, premium quality.
```

### 🪓 `M1.webp` — Axe · MID
```
…a 3D-rendered woodcutter's axe, polished steel blade with bright specular
highlights and gold inlay on a rich wooden handle, dynamic angle, premium and
glossy.
```

### 🧱 `M2.webp` — Trowel (Kelle) · MID
```
…a 3D-rendered bricklayer's pointed trowel, mirror-polished steel blade with
gold trim and a varnished wooden handle, a small dab of mortar, premium glossy
finish.
```

### 🔱 `M3.webp` — Pitchfork (Gabel) · MID
```
…a 3D-rendered three-tine pitchfork, polished metal tines with gold accents on
a rich wooden shaft, bold readable silhouette, premium glossy finish.
```

### 🔟 `A.webp` `K.webp` `Q.webp` `J.webp` — Royal letters · LOW
> Generate as a matched set; only the letter and gem color change.
```
…the ornate 3D-rendered golden letter "{A|K|Q|J}", elegant serif, thick beveled
polished gold with warm gradient and strong specular highlights, a faceted deep
red ruby gemstone embedded at the top, subtle dark outline so it pops on a navy
reel, AAA slot royal-card-symbol style; just the gem-letter, no card, no background.
```

### 🧱 `BR.webp` — Brick token · COLLECTIBLE
```
…a single glossy red building brick with crisp grey mortar and polished gold
trim/edges, one bright golden sparkle, premium collectible "token" look, gentle
bevel and specular highlight.
```

---

## 3 · `background.webp` — 1920×1080 immersive scene
```
Cinematic 3D fairytale night scene for a premium slot background, "Three Little
Pigs" theme: a moonlit countryside, huge glowing moon, soft star field, rolling
hills, and in the mid-distance three charming houses — a straw hut, a wooden
cabin and a grand brick fortress — with warm glowing windows, faint magical
fireflies, deep blue-teal palette with warm golden accents, atmospheric haze,
premium AAA game-art quality. IMPORTANT: keep the CENTER darker and uncluttered
so the reels sit on top; place detail and light toward the edges. No characters
in front, no text, no UI.
```
Negative: `bright center, busy center, text, ui, watermark, people, daytime`

---

## 4 · `logo.webp` — 1400×500 transparent
```
Premium 3D game logo: the title "HUFF & PUFF" big with a smaller ribbon
subtitle "PIGGY RICHIES" beneath, bold playful beveled 3D lettering in polished
gold with red-ruby gem accents and a thick dark outline, a sly grey wolf
silhouette and a tiny golden soccer-ball-free coin sparkle integrated, fairytale
luxury casino vibe, dramatic lighting, isolated on a fully transparent
background, no scene.
```

---

## 5 · Optional polish (not auto-wired — for store / splash / future)

- **`frame.webp`** (square, transparent center): *Ornate gold slot reel frame,
  baroque corners with red gems, premium black-and-gold, empty transparent
  center for a 5×4 grid, AAA casino UI.*
- **`hero-wolf.png`** (splash): *Full-body 3D Big Bad Wolf mid-"huff & puff",
  cheeks puffed, blowing a strong cartoon wind gust, dynamic villain pose,
  transparent background.*
- **House icons `house-straw/wood/brick.png`:** *Cute isometric 3D {straw hut |
  wooden cabin | brick fortress}, premium game-icon, gold accents, transparent.*
- **Button icons `btn-spin/auto/turbo/buy.png`:** *Glossy gold-and-green circular
  casino UI button icon for {spin arrows | autoplay | turbo lightning | bonus
  buy}, transparent.*

---

## 6 · Tool recipes

- **Midjourney v6.1:** `<master> <symbol line> --style raw --ar 1:1 --s 200`.
  Make `W` first, then add `--sref <W-image-url>` to every other symbol for a
  matched set; remove background with Photoroom / `rembg` (MJ has no alpha).
- **SDXL / ComfyUI:** master as positive, master-negative as negative,
  1024×1024, **fixed seed** across the set, add an `isnet/rembg` node for alpha.
- **DALL·E 3:** master + symbol line + *"single centered icon, transparent
  background, premium game asset."*
- **Optimize:** `cwebp -q 90 in.png -o out.webp` (or squoosh.app), then list the
  files in `frontend/assets/manifest.js`.

The result: drop the 13 symbols + background + logo into `frontend/assets/`,
update the manifest, reload — and the game matches a top-tier production slot
with no code changes.
