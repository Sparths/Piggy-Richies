# 🎨 Art / Image Prompt Pack — Stake's Huff & Puff: Piggy Richies

Everything you need to generate **Stake-quality art**. The game already ships
with clean built-in **SVG vector art**, so it looks finished today — but for a
premium, submission-ready look, generate the images below (Midjourney v6 /
DALL·E 3 / SDXL / Ideogram all work) and drop them in. The game uses them
automatically; anything you skip falls back to the SVG.

> **Goal style (from the concept):** *minimalist Stake-Originals look + charming,
> action-packed comic.* Think clean, modern, slightly 2.5D "vector-3D", bold
> readable shapes, premium soft studio lighting — friendly but high-end.

---

## 0 · How to install generated art

1. Export each file with the **exact filename** below (transparent **WebP** or **PNG**).
2. Put symbols in `frontend/assets/symbols/`, the rest in `frontend/assets/`.
3. List what you added in `frontend/assets/manifest.js`, e.g.:
   ```js
   window.PIGGY_ASSETS = {
     symbols: { W:"assets/symbols/W.webp", S:"assets/symbols/S.webp", P1:"assets/symbols/P1.webp", /* … */ },
     background: "assets/background.webp",
     logo: "assets/logo.webp",
   };
   ```
4. Reload. Done — no code changes.

**Technical specs**

| Asset type | Size | Format | Background |
|---|---|---|---|
| Symbols (13) | 1024×1024 (square) | WebP/PNG | **transparent** |
| Background | 1920×1080 | WebP/JPG | full-bleed |
| Logo/wordmark | 1200×400 | WebP/PNG | **transparent** |

---

## 1 · Master style guide — prepend to EVERY symbol prompt

> Copy this block in front of each symbol prompt so the whole set is consistent.

```
Premium online-slot game symbol, single icon centered, "Stake Originals"
minimalist style mixed with charming Pixar-like comic appeal, clean vector-3D
look, bold rounded shapes, thick soft outline, smooth gradients, glossy but
tasteful highlights, soft top-down studio lighting, subtle ambient occlusion,
vibrant yet slightly desaturated premium palette, fairytale "Three Little Pigs"
theme, high detail, crisp, centered, fills ~85% of frame, isolated on a fully
transparent background, no scene, no ground, no text, no border.
```

**Master negative prompt (SDXL/where supported):**
```
photorealistic, realistic photo, text, watermark, signature, logo, frame,
border, drop shadow on ground, background scenery, multiple objects, cropped,
blurry, low-res, harsh contrast, gritty, horror, gore, extra limbs, deformed
```

**Consistency tips**
- Generate the **whole set in one session**; reuse the **same seed / `--sref`
  style reference** so lighting and outline weight match across all 13.
- Keep one **light direction** (top, slightly left) for every symbol.
- Palette anchors: pig pink `#F7ADC4`, wolf grey `#8A93A6`, gold `#FFD23F`,
  scatter orange `#FF9D4D`, brick `#D8693F`, wood `#C08A4E`, straw `#F0C95D`.

---

## 2 · Symbol prompts (13) — each = master block + the line below

### 🐺 `W.webp` — The Big Bad Wolf (WILD · most important)
```
…the Big Bad Wolf head as the WILD symbol: a charismatic cartoon grey wolf,
sly confident grin baring white fangs, glowing golden eyes, pointed ears,
fluffy cheek tufts, faint magical purple rim-light, villain charm but
family-friendly, the hero icon of the game.
```

### 🍲 `S.webp` — Boiling Soup Pot (SCATTER)
```
…a black cast-iron cauldron full of bubbling orange soup, rising wisps of
steam, a wooden spoon resting on the rim, warm inviting glow, glossy metal,
slightly magical — the scatter that summons the bonus.
```

### 🐷 `P1.webp` — Brick Pig (PREMIUM — top symbol)
```
…a cool wealthy pig wearing sleek black sunglasses and a thick gold chain,
confident smirk, faint brick-red accent, "crypto-rich" vibe, the most premium
and valuable pig — looks expensive and self-assured.
```

### 🐽 `P2.webp` — Wood Pig (PREMIUM)
```
…a hard-working carpenter pig wearing a yellow hard hat, a pencil tucked behind
the ear, a friendly determined smile, a hint of wood-brown and sawdust, capable
and cheerful.
```

### 🐖 `P3.webp` — Straw Pig (PREMIUM)
```
…a shy nervous pig with big worried eyes and a slight sweat drop, a single
straw stalk in its mouth, a wisp of a straw hat, soft pastel tones, timid and
endearing — builds fastest, worries most.
```

### 🪓 `M1.webp` — Axe (MID)
```
…a sturdy woodcutter's axe, polished steel blade with a bright highlight,
worn wooden handle with grain, leaning at a dynamic angle, clean game-icon look.
```

### 🧱 `M2.webp` — Trowel / Kelle (MID)
```
…a bricklayer's pointed trowel with a wooden handle and a small dollop of fresh
grey mortar on the blade, steel shine, tidy and iconic.
```

### 🔱 `M3.webp` — Pitchfork / Gabel (MID)
```
…a rustic three-tine farmer's pitchfork, weathered wooden shaft, polished metal
tines, simple bold silhouette, readable at small size.
```

### 🅰️ `A.webp` — Ace card (LOW · premium card)
```
…an ornate playing card showing a large letter "A", premium teal-and-gold royal
styling, a tiny golden pig-snout motif as the suit pip, glossy card face, clean
rounded corners.
```

### 🇰 `K.webp` — King card (LOW · brick-themed)
```
…an ornate playing card showing a large letter "K" in brick-red, decorated with
a small brick motif as the suit pip, warm red-orange royal styling, glossy face,
rounded corners.
```

### 🇶 `Q.webp` — Queen card (LOW · wood-themed)
```
…an ornate playing card showing a large letter "Q" in wood-brown, decorated with
a small wooden-plank motif as the suit pip, cozy brown royal styling, glossy
face, rounded corners.
```

### 🇯 `J.webp` — Jack card (LOW · straw-themed)
```
…an ornate playing card showing a large letter "J" in golden straw-yellow,
decorated with a small straw-bundle motif as the suit pip, warm wheat royal
styling, glossy face, rounded corners.
```

### 🧱 `BR.webp` — Brick token (COLLECTIBLE)
```
…a single glossy red building brick with neat grey mortar edges, one small
golden sparkle highlight, collectible "token" feel, slight bevel, premium and
clean — the brick you collect to upgrade the houses.
```

---

## 3 · Background — `background.webp` (1920×1080, full-bleed)

```
Atmospheric fairytale night scene for an online slot background, "Three Little
Pigs" theme, Stake-Originals minimalist style: rolling moonlit hills, a huge
glowing moon, soft stars, in the far distance three tiny houses (straw hut,
wooden cabin, brick fortress) as gentle silhouettes, deep blue-teal palette
(#0D2236 to #123048), cinematic, calm, slightly mysterious. IMPORTANT: keep the
CENTER darker and uncluttered so a game board sits on top; detail and interest
only around the edges. No characters, no text, no UI.
```
Negative: `busy center, bright center, text, ui, characters, watermark`

---

## 4 · Logo / wordmark — `logo.webp` (1200×400, transparent)

```
Game logo for "HUFF & PUFF" with subtitle "PIGGY RICHIES", bold playful 3D
comic lettering, glossy gold and emerald-green with thick dark outline and a
subtle bevel, a small sly grey wolf silhouette peeking around the letters, a few
gold-coin sparkles, fairytale-meets-crypto premium casino vibe, isolated on a
fully transparent background, no scene.
```
> The top-left brand mark can also use just a wolf bust — if you prefer, generate
> a square `logo.webp` of only the wolf head (same as `W` but more detailed).

---

## 5 · Optional extras (not auto-wired — for splash / marketing / store)

These aren't loaded automatically (the game uses emoji/SVG for them), but they
polish a store listing or a future splash screen.

### `hero-wolf.png` — bonus splash character
```
Full-body dynamic Big Bad Wolf mid-"huff and puff", cheeks puffed out blowing a
strong cartoon wind gust, exaggerated action pose, charming villain, grey fur,
purple magical accents, comic energy, transparent background.
```

### `house-straw.png` / `house-wood.png` / `house-brick.png` — level icons
```
Cute isometric game icon of a {straw hut | wooden cabin | sturdy brick fortress},
"Three Little Pigs" theme, clean vector-3D, soft lighting, transparent
background, matching the symbol set's style — used for the free-spins house
levels (Stroh-Haus / Holz-Haus / Ziegel-Festung).
```

---

## 6 · Quick tool recipes

- **Midjourney v6:** `<master block> <symbol line> --style raw --ar 1:1 --s 250`.
  Lock the look with `--sref <url-of-your-first-good-symbol>` for the rest, and
  reuse `--seed`. Export, then remove background (MJ has no alpha — use
  `rembg`/Photoroom/Canva to cut to transparent).
- **DALL·E 3 (ChatGPT):** paste the master block + symbol line, add *"transparent
  background, single centered icon, game asset sheet style."*
- **SDXL / ComfyUI:** master block as positive, master negative as negative,
  1024×1024, fixed seed across the set; use an "isnet/rembg" node for alpha.
- **Batch consistency:** generate `W` first, pick the best, then use it as the
  style reference for all others so the set matches.

After generating, optimize: `cwebp -q 90 in.png -o out.webp` (or squoosh.app),
then list the files in `frontend/assets/manifest.js` (section 0).
