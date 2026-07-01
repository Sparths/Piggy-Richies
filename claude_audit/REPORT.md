# Bricked Up — UI/UX & Polish Audit

**Game:** Bricked Up (Three Little Pigs / Big Bad Wolf theme) — Stake Engine build
**Method:** Live play in Firefox via desktop automation + full frontend source review. Desktop (1920×1080) and portrait/mobile viewports, English and German.
**Scope:** Analysis only — **no game code was changed.** Read-only source inspection was used to confirm root causes.
**Screenshots:** `C:\Users\bebed\Desktop\bricked-up-audit\` (filenames cited per finding).

---

## 0. Executive summary

The core **art is genuinely strong** — the storybook reels, pig character, houses, symbols and backgrounds look premium and on-theme. The game does **not** look "AI-generated" at the illustration level. The problems are concentrated in **UI polish, number/localization formatting, modal close-button consistency, the bonus-end payoff, and the complete absence of a mobile/portrait layout.** None of these require new art for the reels; most are CSS/JS formatting fixes. A handful of overlay moments (scatter/retrigger/bonus-end) are plain text where a premium game would show a graphic.

Counts: **2 Blockers, 7 Major, 8 Minor, 6 Polish.**

---

## TOP 10 — FIX FIRST (prioritized)

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| 1 | **Blocker** | Misleading fixed "jackpot" markup (MINOR $100 / GRAND $5,000 / MAJOR $1,000 / MINI $20) still in the DOM. Currently CSS-hidden, but present in shipped code and uses `$` while the game is EUR. Compliance risk. | `index.html:22` |
| 2 | **Blocker** | No portrait/mobile layout at all. In portrait the landscape stage is letterbox-centered with ~40% empty gradient dead-space, tiny controls, and no "rotate device" prompt. | `mobile-deviceMobile-de.png` |
| 3 | **Major** | Menu popover is clipped off the left edge in narrow/portrait ("MENU"→"ENU", "Ton:"→"on:", icons cut). Popover never repositions into the viewport. | `mobile-menu-de.png` |
| 4 | **Major** | Number localization is broken/inconsistent. WIN shows `0.00` while BALANCE `1.000,00` and BET `1,00` (German). Paytable and buy costs use dots; buy-confirm mixes both in one line ("Einsatz 1,00 x 153.43"). | `de-base.png`, `de-buy-confirm.png` |
| 5 | **Major** | Paytable pay values are raw unrounded floats up to 6 decimals (`0.087808`, `0.351232`, `0.026342`, `1.75616`). Looks unfinished/placeholder. | `de-paytable.png`, `menu-02-paytable.png` |
| 6 | **Major** | Buy-confirm close "x" floats at **top-center, overlapping the title** and straddling the card's top border. | `de-buy-confirm.png`, `buy-04-xbutton-zoom.png` |
| 7 | **Major** | Bonus ends with only a small floating text (pig chip + amount) — no celebratory total-win summary screen. Anticlimactic payoff. | `fse-*` frames; `game.js:349` |
| 8 | **Major** | Close-button placement is inconsistent across the 4 overlays: How-to-play/Paytable = top-LEFT; Buy-confirm = top-CENTER (overlapping); Buy popover = **no close button at all**. | `de-help.png`, `de-paytable.png`, `de-buy-pop.png`, `de-buy-confirm.png` |
| 9 | **Minor** | Scatter / retrigger / bonus-trigger moments render as plain gold text (`"3x 🍯"`, `"RETRIGGER · +N"`) with no graphic badge. | `game.js:306-312`, `style.css:356` |
| 10 | **Minor** | Base-game house-progress panels sit at the top showing empty "0/5" bars with no label/context — reads as inert clutter until the bonus explains them. | `state-now.png`, `de-base.png` |

---

## 1. Base Game

**Overall:** Reels, symbols, spin/stop, cascades ("wolf blows"), win count-up, coin FX and the wolf multiplier badge all look clean and premium. Screenshots `base-01-idle.png` … `base-11-turbo-on.png`.

**1.1 — Minor — House-progress panels show "0/5" in base game.**
Location: top of reel area, three darkened house panels (straw / cottage / castle), each "0/5". Screenshot `state-now.png`, `de-base.png`.
Issue: In the base game these free-spins meters are always visible, empty, and unlabeled. Why it looks cheap: three empty progress bars with no heading look like a broken/half-loaded HUD to a first-time player. Fix: hide them in base game, or add a small "Bonus" teaser label and a dimmed/"locked" treatment so they read as a preview, not a bug.

**1.2 — Polish — Bet default differs by launch.**
EN launch defaulted BET to `2.00` (`index.html:26`), DE launch showed `1,00`. Harmless but worth aligning the documented default. Screenshots `base-07-betmin.png`, `base-08-betmax.png`.

**1.3 — Positive.** Anticipation ("2 pots → chase the 3rd") is wired (`game.js:155`, `antiFrom = scatterCols[1]+1`) and the reel-stop anticipation audio path exists (`audio.js` `reelStop(col, anticip)`), so the tension beat is real, not faked.

---

## 2. Buy-Flow

Screenshots: `buy-01-coinclick.png`, `buy-02-popover.png`, `de-buy-pop.png`, `buy-03-confirm-straw.png`, `de-buy-confirm.png`, `buy-04-xbutton-zoom.png`, `buy-05-after-cancel.png`, `buy-06-after-x.png`, `buy-07-confirm-vip.png`.

**2.1 — Major — Buy-confirm "x" overlaps the title.**
Location: `#modal-buy-confirm` close button. Screenshot `de-buy-confirm.png`.
Issue: The orange "x" renders centered at the top of the card, sitting directly on the "Buy Bonus? / Bonus kaufen?" heading and straddling the gold frame. Why it looks cheap: a close button colliding with the title is the single most obvious "unfinished" tell. Root cause: `.modal-x` is intended `right:18px; top:18px` (`layout-overrides.css:113`) but in this card it is not being absolutely positioned, so it flows as a centered element. Fix: force `position:absolute; right:18px; top:18px` on `.buy-confirm-card .modal-x` (and give the `h2` right padding so they never collide).

**2.2 — Major — Buy popover has no close button.**
Location: `#buy-pop`. Screenshot `de-buy-pop.png`.
Issue: The popover contains only the two purchase buttons + a note — there is no "x" (the HTML has none; `buy-modal-x` CSS exists but no element uses it). The only way out is clicking the dimmed backdrop, which has no affordance. Why it looks cheap / risky: on mobile especially, users can feel trapped in a paid-action dialog. Fix: add a real close "x" (top-right, matching the standard modal) to `#buy-pop`.

**2.3 — Major — Cost line vs price use different number formats (see 6.1).**
`de-buy-pop.png`: price `153,43` (German) but line above reads `Kosten: 153.43x Einsatz` (English dot). `de-buy-confirm.png`: `Einsatz 1,00 x 153.43` mixes both separators in one string.

**2.4 — Minor — Buy-choice house thumbnails look dark/muddy.**
Location: the two small framed house icons inside the buy choices. Screenshot `de-buy-pop.png`.
Issue: The thumbnails are small and dim against the gold buttons, losing the premium look of the full house art. Fix: use brighter, higher-contrast house icons (see Asset Prompt A-3).

**2.5 — Positive.** Cancel, Confirm and (where present) backdrop-dismiss all work; VIP and Straw both open a correct confirm with matching icon/name/cost. One intermittent full-session reset was seen earlier on a VIP purchase (balance snapped back to start and the round didn't begin) — could not be reproduced a second time, but flagged in §11 as a stability risk to watch.

---

## 3. Free Spins

Screenshots: intro `fs-01-intro.png`; base-collect run `fss-*`; VIP runs `fsv-*`, `fsv2-*`, `fsv3-*`; win frames `fsw-*`, `fsw2-*`; exit `fse-*`; tight bonus capture `bw-01.png`…`bw-46.png` (esp. `bw-18/31/44`).

**3.1 — Major — No bonus-end summary screen.**
Location: end of free spins (`game.js:349`, `case "exitFreeGame"`). Screenshots `fse-*`.
Issue: The bonus concludes by showing a small floating chip + amount for ~0.9s, then returns to base. There is no "total win" celebration panel. Why it looks cheap: after a multi-minute house-building bonus, ending on a fading text label is a flat, unsatisfying payoff — the emotional peak of the game is under-built. Fix: add a themed end-of-bonus card ("HOUSE COMPLETE — YOU WON x") with the total, houses built, and top multiplier. (See Asset Prompt A-2.)

**3.2 — Minor — Scatter/retrigger bursts are plain text.**
Location: `burst()` overlays (`game.js:221,306,309,312`; `style.css:356` `.burst`/`.burst.scatter`).
Issue: Scatter award, `RETRIGGER · +N`, and the `Nx 🍯` retrigger burst are gold text with a drop shadow only — no badge/ribbon/graphic. Why it looks cheap: on a premium slot these are hero moments; flat text reads as a prototype. Fix: replace with a themed burst graphic (honey-pot splash / wooden "SCATTER!" sign). (Asset Prompt A-1.)

**3.3 — Positive.** The house-upgrade ladder works and looks good: top panels track Straw 5/5 → Wood 5/5 → Brick 2/5→3/5 (`bw-18/44`), sticky wolf wilds carry an `x3` multiplier badge (`bw-31`), the MULTI cloud badge is well-styled, and the pig host animates on wins. The `HOUSE COMPLETE` / `+N FREE SPINS` cinematic strings and styling (`.hc-title`, `layout-overrides.css:53-72`) are solid.

**3.4 — Minor — House cinematic ships German defaults in HTML.**
`index.html:33` hard-codes `HOLZ-HAUS` / `+2 FREISPIELE`. i18n overwrites this at boot so users never see a mismatch, but leaving localized literals in markup is fragile. Fix: default to a neutral/empty string and let i18n fill it.

---

## 4. Big Wins

**4.1 — Minor — Big-win banner is very transient during fast/auto bonuses.**
Location: `#bigwin` (`index.html:32`), tiers `NICE / BIG / MEGA / EPIC WIN` + `MAX WIN!` (`game.js:740-742`).
Observation: Two large bonus wins (~1030× and ~617×) occurred but the banner flashed between capture frames during auto-play, i.e. it appears and clears very quickly. Why it matters: if the banner life is tied to fast auto-cascades, players barely register their biggest moments. Fix: enforce a minimum on-screen dwell (e.g. 1.2–1.8s by tier) independent of turbo/auto speed.

**4.2 — Positive.** The banner styling itself is premium and correct: layered gold fill, brown stroke, green drop, glow and animated rays (`layout-overrides.css:53-65`, `#bigwin-rays`). Tier ladder and `MAX WIN!` cap are implemented. No visual defect in the asset — only its timing/visibility.

---

## 5. Menus & Modals

Screenshots: `menu-01-main.png`, `de-menu.png`, `menu-02-paytable.png`/`de-paytable.png`, `menu-04-howto.png`/`de-help.png`, `menu-06-sound-toggle.png`.

**5.1 — Major — Inconsistent close-button placement across modals.**
- How-to-play & Paytable: "x" at **top-LEFT** of the card (`de-help.png`, `de-paytable.png`).
- Buy-confirm: "x" at **top-CENTER**, overlapping title (`de-buy-confirm.png`).
- Buy popover: **no "x"** (`de-buy-pop.png`).
Why it looks cheap: four dialogs, three different (all non-standard) close treatments. Users expect a consistent top-RIGHT "x" everywhere. Fix: standardize `.modal-x` to top-right on all four; add one to the buy popover.

**5.2 — Minor — Paytable value formatting (see 6.2).** Raw 6-decimal floats. `de-paytable.png`.

**5.3 — Minor — Menu popover labels are right-aligned with a large gap.**
Location: `#menu-pop` items. Screenshot `de-menu.png`.
Issue: Icon sits far left, label far right, with a wide empty gap ("Ton: ……… an"). Reads as mis-aligned. Fix: left-align label next to its icon.

**5.4 — Polish — "MENU" popover title not localized.**
German menu still shows `MENU` (should be `MENÜ`); `Provably Fair` also stays English (acceptable as an industry term). Screenshot `de-menu.png`.

**5.5 — Positive.** Modal card system (gold frame, inner bevel, radial glow, blurred backdrop) is premium and consistent (`layout-overrides.css:74-124`). Paytable icons, how-to-play copy and the sound toggle all render cleanly.

---

## 6. Language (EN / DE)

**Positive first:** the DE dictionary is **complete** — every key is translated (`i18n.js:110-190`), and on desktop every German string fits with **no truncation or overflow**, including long ones ("So funktioniert's", "ECHTE KOSTEN", "Ziegel-Festung", "Strohhaus-Bonus", "Volatilität sehr hoch"). Screenshots `de-base.png`, `de-menu.png`, `de-help.png`, `de-paytable.png`, `de-buy-pop.png`, `de-buy-confirm.png`.

**6.1 — Major — Number formatting is not locale-aware and is internally inconsistent.**
Evidence (German build):
- HUD: `GUTHABEN 1.000,00` and `EINSATZ 1,00` (correct de-DE) but `GEWINN 0.00` (English dot). `de-base.png`.
- Buy popover: price `153,43` (de) vs cost line `153.43x Einsatz` (en). `de-buy-pop.png`.
- Buy-confirm: one string mixes both — `Einsatz 1,00 x 153.43`. `de-buy-confirm.png`.
- Paytable and RTP (`96.55%`, values `4.3904`) use dots. `de-paytable.png`.
Why it matters: mixed `,`/`.` decimals in the same screen look broken and can confuse value perception (a real compliance/QA concern). Fix: route **all** monetary/multiplier output through one `Intl.NumberFormat(PIGGY_I18N.locale())` helper (the locale is already exposed at `i18n.js:248`). The win/paytable/cost formatters are currently bypassing it.

**6.2 — Major — Paytable shows raw floats to 6 decimals.**
Values like `0.087808`, `0.351232`, `0.026342`, `1.75616`, `0.065856`. `de-paytable.png`, `menu-02-paytable.png`. Fix: round to 2 decimals, or (better) display clean per-way multipliers. Independent of language.

**6.3 — Polish — Literal `->` arrows in copy.**
`help.li5` in both languages renders ASCII `Straw -> Wood -> Brick Fortress` / `Stroh -> Holz -> Ziegel-Festung`. Screenshot `de-help.png`. Fix: use a real arrow glyph `→`.

**6.4 — Polish — `<html lang="de">` shipped as the document default** (`index.html:2`) while the code default is English (`i18n.js:201-205`). i18n corrects `documentElement.lang` at boot, so no user impact, but the static default should be `en` to match.

---

## 7. Mobile / Portrait

Screenshots: `mobile-base-de.png` (deviceType=desktop, portrait window), `mobile-deviceMobile-de.png` (deviceType=mobile), `mobile-menu-de.png`.

**7.1 — Blocker — No portrait layout.**
Issue: In a portrait viewport the game keeps its landscape stage, scales it to fit width, and centers it vertically. The top ~25% and bottom ~15% become flat teal/green **gradient dead-space**, the reels/HUD shrink, and control tap targets (☰ menu, bet steppers, spin) become tiny. There is **no "rotate your device" prompt.** Setting `deviceType=mobile` produces the identical result — the param has no layout effect. Why it looks cheap/unfinished: a premium mobile slot either has a portrait-specific layout (enlarged reels, repositioned controls) or a rotate-to-landscape overlay; this has neither. Fix: add a portrait layout or, at minimum, a themed "rotate device" overlay and fill the dead-space with themed art. (Asset Prompt A-4.)

**7.2 — Major — Menu popover clips off the left edge in narrow layouts.**
Issue: Opening the menu in portrait cuts the popover's left side — `MENU`→`ENU`, `Ton:`→`on:`, and the row icons are chopped. Screenshot `mobile-menu-de.png`. The popover is anchored to the menu button and extends beyond the stage's left boundary without repositioning. Fix: clamp the popover within the viewport (flip/shift so it never overflows).

**7.3 — Minor — `#pig-host` not hidden as intended in narrow view.**
`layout-overrides.css:213` intends `@media (max-width:760px){#pig-host{display:none}}`, yet the host still appears in the ~525px-wide render (`mobile-deviceMobile-de.png`). Either the breakpoint isn't matching (devicePixelRatio) or the host is baked into the scaled stage. Verify the media query fires.

---

## 8. Audio & Loading

Audio is **sample-backed WebAudio with synth fallbacks** (`audio.js`) — a solid, premium setup. I could not listen, so this is a source-level review of the event→file mapping.

Event → sample (`audio.js:7-25`): spin→`ui-crisp-casino`, reelStop→`vault-drop`, puff/cascade→`deep-cartoon-hit`, drop→`vault-drop`, win→`win-celebration`, winBig(tier≥2)→`premium-casino-win`, brick→`brick-impact`, scatter→`pot-bubble`, trigger→`bonus-trigger`, upgrade→`magic-upgrade`, smallWin→`small-win-chime`, houseComplete→`house-complete`, riser→`anticipation-riser`, coinTick→`coin-tick`, thunder→`thunder-roll`, multUp→`multiplier-up`, music→`background-music` (single loop, gain 0.22).

**8.1 — Minor — Every reel stop uses `vault-drop.wav` (also used for the cascade "drop").**
A metallic "vault" thunk on each reel stop can feel heavy and slightly off-theme for a woodland fairytale, and doubling it as the cascade drop reduces variety. Fix: use a lighter, wood/earth-themed reel-stop sample distinct from the cascade drop.

**8.2 — Minor — Single music loop for base and bonus.**
Only one `music` track is loaded/started (`audio.js:97-111`). No distinct free-spins theme. Fix: switch to a higher-energy bonus loop on `enterFreeGame` and back on exit.

**8.3 — Minor — No dedicated retrigger cue.** Retrigger reuses scatter/trigger sounds; a distinct sting would sell the moment.

**Loading:** Screenshots `loading-01-stake-platform.png`, `loading-02-game-brickedup.png`, `load-*`, `load-hard-*`. The custom loader (BRICKED UP logo, orbiting chips, progress bar/percent — `index.html:34`) is on-brand and clean. Two-phase (Stake platform loader → game loader) is expected for this environment. No defects.

---

## 9. Header & HUD

- Logo "BRICKED UP" (top-left) and the MULTI cloud badge (top-right) are well-styled (`layout-overrides.css:36-50`). No issue.
- Bottom bar (BALANCE / WIN / BET) is clean on desktop; the WIN number-format bug is the only defect (§6.1).
- The decorative three-house "cloud" panel (top-right) is on-theme. Fine.

---

## 10. Stake-approval risk register

1. **Misleading jackpot markup (highest risk).** `index.html:22` ships MINOR/GRAND/MAJOR/MINI with fixed `$` amounts that never pay. It is CSS-hidden (`house-ui.css:2`), so not visible in play — but it is in the shipped DOM, uses `$` in a EUR game, and a reviewer scanning markup could read it as a deceptive/undisclosed jackpot feature. **Remove the markup entirely** (not just hide it).
2. **Localized number display.** Mixed `,`/`.` decimals and a non-localized WIN field (§6.1) can be flagged under locale-correctness checks.
3. **Paytable clarity.** 6-decimal raw floats (§6.2) may read as an unfinished paytable.
4. **Mobile UX.** No portrait support and a clipped menu in portrait (§7) are likely to fail mobile QA.
5. **Paid-dialog escape.** Buy popover with no close button (§2.2) plus the buy-confirm "x" overlapping its title (§2.1) are player-protection/QA concerns.
6. **Stability.** The one-off VIP-buy session reset (§2.5, §11) must be reproduced/ruled out before submission.

---

## 11. Stability note

During buy-flow testing, one VIP purchase caused a full session reset (balance snapped to the starting amount and the bonus did not begin); a retry worked. Intermittent, non-reproducible in a second attempt, but a bonus-buy that silently voids the round is severe if real. Recommend targeted testing of the VIP buy → `enterFreeGame` handoff (`stake-adapter.js`, `vip-bonus-normalizer.js`, `game.js`).

---

## 12. Asset suggestions (with ready-to-use generation prompts)

The reel/character/background art is already premium, so these are targeted additions, not replacements. Style anchor for all prompts: *warm, hand-painted 2D storybook "Three Little Pigs" fairytale, painterly casino-premium finish, golden rim-light, soft depth, cohesive with an existing green-woodland pig-and-wolf slot.*

**A-1 — Scatter / retrigger burst badge** (replaces plain text at `game.js:306-312`).
> "A celebratory game-overlay badge for a fairytale slot: a bubbling golden honey/soup pot bursting upward with warm sparkles and splashing droplets, a curved hand-carved wooden banner ribbon reading 'SCATTER', rich gold-and-amber palette, painterly storybook style, thick gold rim-light, subtle glow, transparent background, centered, high-resolution PNG, no text artifacts."

**A-2 — End-of-bonus / total-win summary panel** (fills the §3.1 gap).
> "A premium end-of-bonus summary card for a Three Little Pigs slot: an ornate carved-wood and gold framed panel resting on green grass with brick and straw motifs in the corners, a proud pig in a waistcoat celebrating, warm sunset rim-light, empty central plaque area left clear for a large win amount, storybook painterly style, transparent background outside the frame, high-resolution."

**A-3 — Buy-choice house thumbnails** (brightens §2.4).
> "Two matching circular emblem icons for a slot bonus-buy menu: (1) a cozy golden straw hut, (2) a sturdy stone/brick house, each in a polished gold ring frame with a soft sky-blue vignette, bright warm daylight, crisp painterly storybook style, high contrast so they pop on a gold button, transparent background, high-resolution PNG pair."

**A-4 — Portrait 'rotate device' overlay + background fill** (fills §7.1 dead-space).
> "A vertical (portrait) full-screen overlay illustration for a fairytale slot: a phone rotating from portrait to landscape with a friendly cartoon pig gesturing 'turn me', set against a soft green woodland and blue-sky storybook backdrop that tiles pleasantly top and bottom, warm painterly style, generous safe area in the center for a short caption, high-resolution 9:16."

**Non-art fixes (no asset needed):** locale number formatter (§6.1), paytable rounding (§6.2), `→` glyph (§6.3), modal-x standardization (§5.1), add buy-popover close (§2.2), big-win dwell time (§4.1), distinct reel-stop/bonus-music audio (§8).

---

## 13. Screenshot index (selected)

Base: `base-01-idle.png` … `base-11-turbo-on.png`, `state-now.png`
Buy: `buy-01-coinclick.png`, `buy-02-popover.png`, `buy-03-confirm-straw.png`, `buy-04-xbutton-zoom.png`, `buy-05-after-cancel.png`, `buy-06-after-x.png`, `buy-07-confirm-vip.png`
Free spins: `fs-01-intro.png`, `fss-01…26`, `fsv-*`, `fsv2-*`, `fsv3-*`, `fsw-*`, `fsw2-*`, `fse-01…18`, `bw-01…46`
Menus: `menu-01-main.png` … `menu-06-sound-toggle.png`
Loading: `loading-01-stake-platform.png`, `loading-02-game-brickedup.png`, `load-*`, `load-hard-*`
German: `de-base.png`, `de-loader.png`, `de-menu.png`, `de-help.png`, `de-paytable.png`, `de-buy-pop.png`, `de-buy-confirm.png`
Mobile/portrait: `mobile-base-de.png`, `mobile-deviceMobile-de.png`, `mobile-menu-de.png`

*End of report — analysis only; no game code was modified.*
