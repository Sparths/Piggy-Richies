# Codex task — Fix all issues from the "Bricked Up" UI/UX audit

## Context
Another agent (**Claude**) performed a full, hands-on UI/UX & polish audit of the **Bricked Up** slot (Three Little Pigs / Big Bad Wolf theme, Stake Engine frontend). Claude played the live game via desktop automation in English + German, desktop + portrait, and cross-checked every finding against the source. **Claude changed no code** — that was an analysis-only pass.

**You (Codex) now implement the fixes.** All audit materials are in the **`claude_audit/`** folder at the repo root — `E:\brickedup\Piggy-Richies\claude_audit`:
- `REPORT.md` — the full audit (severity, exact locations, root cause, fix, screenshot filename per finding).
- `CODEX_FIX_PROMPT.md` — this file.
- ~200 screenshots (filenames referenced throughout the report, e.g. `de-buy-confirm.png`, `de-paytable.png`, `mobile-menu-de.png`, `de-base.png`).

Read `claude_audit/REPORT.md` first, and open the referenced screenshots as you work each fix; this prompt is the actionable engineering distillation of the report. Line numbers are from the audited build — **verify in source, they may have shifted.**

## Repo layout (all paths under `frontend/`)
- `index.html` — DOM (jackpots, modals, buy popover, house cinematic, loader).
- `layout-overrides.css` — control positions, `.modal-x`, buy popover/confirm styling.
- `house-ui.css` — hides the jackpots; house panel UI.
- `style.css` — `.burst`, `.toast`, `.jackpot` base styles.
- `game.js` — game loop, number formatting (`fmt`, line ~32), paytable render, buy flow, big win, `exitFreeGame`.
- `i18n.js` — EN + DE dictionaries; `PIGGY_I18N.locale()` exposed (~line 248).
- `audio.js` — sample-backed WebAudio (event→wav map).

## Global guardrails
1. **Do NOT touch the reel/symbol/character/background art** — it's already premium and on-theme. Keep the warm storybook look.
2. **Every user-facing string you add must be in both EN and DE** (`i18n.js`), never hardcoded.
3. After each fix, **test in EN + DE and desktop + portrait**. Launch params: `?...&language=en|de&deviceType=desktop|mobile`. For portrait, use a ~400×850 viewport (DevTools device toolbar or a narrow window).
4. No new runtime dependencies. Keep changes minimal and theme-consistent.
5. Preserve provably-fair / RGS behavior — only fix UI/format/layout unless a fix explicitly requires logic (bonus-end panel, stability).

---

# BLOCKERS (must fix)

## B1 — Remove the misleading fake jackpots
- **Where:** `index.html` (~line 22) `<div class="jackpots" aria-hidden="true">…MINOR $100 / GRAND $5,000 / MAJOR $1,000 / MINI $20…</div>`; dead hider in `house-ui.css` (~lines 2–3, `.jackpots{display:none!important}`); `.jackpot` styles in `style.css` (~lines 88–107).
- **Why:** Fixed jackpot values that never pay, still shipped in the DOM, using `$` in a EUR game. Compliance/approval risk even though CSS-hidden.
- **Do:** Delete the `.jackpots` block from `index.html` entirely. Remove the now-unused `.jackpot`/`.jackpots` CSS from `house-ui.css` and `style.css`.
- **Accept:** `grep -ri "jackpot\|MINOR\|GRAND\|MAJOR" frontend/` returns nothing; no visual change (they were hidden).

## B2 — Add a portrait/mobile experience
- **Why:** In portrait the landscape stage is scaled-to-width and letterbox-centered, leaving ~40% empty gradient dead-space, tiny controls, and **no rotate prompt**. `deviceType=mobile` produces the identical result. See `mobile-deviceMobile-de.png`.
- **Do (minimum = rotate overlay; preferred = real portrait layout):**
  - **Mandatory:** a themed "rotate your device" overlay that shows when `window.matchMedia('(orientation: portrait)')` matches (guard to touch/small viewports), covering the stage, with i18n copy (EN/DE) and art (asset **A-4** in the report). Auto-hide in landscape.
  - **Preferred:** a true portrait layout — enlarge reels into the vertical space, relocate controls to a bottom action bar, and fill the empty bands with themed art rather than flat gradient.
- **Accept:** a portrait viewport shows a usable layout **or** a clear rotate prompt — never a tiny letterboxed strip with blank bands.

---

# MAJOR

## M1 — Fix number localization (systemic, highest-value cleanup)
- **Root cause:** `fmt()` in `game.js:~32` is locale-aware (`n.toLocaleString(I18N.locale(), {min/maxFractionDigits:2})`), but several fields bypass it:
  - `game.js:~625` paytable: `` pay = `5x <b>${t[5]}</b> &middot; 4x ${t[4]} &middot; 3x ${t[3]}` `` → raw values.
  - `game.js:~639–640` buy costs: `$("buy-a-cost").textContent = buyA + I18N.t("buy.xbet")` → raw `buyA`/`buyB`.
  - `game.js:~651` confirm bet line: `I18N.t("confirm.betLine", { bet: fmt(bet()), mult })` → `bet` is formatted, `mult` is raw (this is the "Einsatz 1,00 x 153.43" mismatch).
  - `game.js:~804/815` RTP `(CFG.rtp*100).toFixed(2)+"%"` and wincap → always dot.
  - Win field idle value: `index.html:~26` ships `<span id="win-amount">0.00</span>` and it isn't re-formatted on boot/lang change (shows "0.00" in DE instead of "0,00").
- **Do:**
  - Add a multiplier helper, e.g. `const fmtMult = (n) => Number(n).toLocaleString(I18N.locale(), { maximumFractionDigits: 2 });`
  - Route **money** through `fmt()` and **multipliers** through `fmtMult()`: paytable pays, buy costs, confirm `mult`, RTP %, wincap.
  - Format the win field through `fmt()` including its resting `0`, and **re-render all dynamic numbers on `PIGGY_I18N.onChange(...)`** so a live language switch reformats them.
- **Accept:** In DE every number uses comma decimals (`0,00`, `1.000,00`, `1,00`, price `153,43`, cost `153,43x Einsatz`, confirm `Einsatz 1,00 x 153,43`, paytable + RTP commas). In EN, en-US throughout. **No screen mixes `,` and `.` separators.** Verify against `de-base.png`, `de-buy-pop.png`, `de-buy-confirm.png`, `de-paytable.png`.

## M2 — Round paytable pay values
- **Where:** `game.js:~625` (same line as above). Values render as raw floats up to 6 decimals (`0.087808`, `0.351232`, `1.75616`). See `de-paytable.png`.
- **Do:** Format each `t[5]/t[4]/t[3]` with `fmtMult()` (≤2 decimals) — keep the `5x <b>…</b> · 4x … · 3x …` structure. (Optionally display clean "×" multipliers.)
- **Accept:** no paytable number has more than 2 decimals.

## M3 — Standardize modal close buttons (top-right everywhere) + add one to the buy popover
- **Root causes:**
  - Buy-confirm "x" flows to **top-center, overlapping the title** — it's not being absolutely positioned (`de-buy-confirm.png`, `buy-04-xbutton-zoom.png`).
  - How-to-play / Paytable "x" sit **top-left** (`de-help.png`, `de-paytable.png`).
  - Buy popover (`#buy-pop`, `index.html:~30`) has **no close button at all** (`de-buy-pop.png`).
- **Do:**
  - Make every modal close control render **top-right**: ensure `.modal-x { position:absolute; right:18px; top:18px; }` wins for all cards, explicitly including `.buy-confirm-card .modal-x`. Add right padding / margin to modal `h2` so a title can never sit under the x.
  - Add a real close `.modal-x` (data-close) to `#buy-pop`, wired to close on click **and** on backdrop click, matching the other modals.
- **Accept:** all four overlays (help, paytable, buy popover, buy-confirm) have a consistent top-right "x" that closes them; none overlaps a title; backdrop-click still dismisses.

## M4 — Add a bonus-end (total win) summary screen
- **Where:** `game.js:~349` `case "exitFreeGame"` currently does `burst(chip("pig") + " " + fmt(totalWin*bet())); await sleep(900);` — just fading text (`fse-*` screenshots).
- **Do:** Show a themed end-of-bonus panel (reuse the `#house-cine` / `#bigwin` styling system, asset **A-2**): total win via `fmt()`, houses built, top multiplier reached. Dwell ~2.5–3.5s or until tap. i18n keys EN/DE.
- **Accept:** finishing a bonus shows a celebratory summary panel, not just a floating label.

## M5 — Stop the menu popover clipping in portrait
- **Where:** `#menu-pop` anchored to the menu button; overflows the stage's left edge in narrow layouts — title becomes "ENU", "Ton:" → "on:", icons chopped (`mobile-menu-de.png`).
- **Do:** Clamp the popover inside the viewport (shift/flip so it never overflows), or convert it to a centered sheet below a width breakpoint.
- **Accept:** in a narrow viewport the full "MENU/MENÜ" title and every row + icon are visible; nothing clipped.

---

# MINOR / POLISH

- **P1 — Scatter/retrigger/trigger bursts are plain text.** `game.js:~221 burst()`, `~306–312`; `style.css:~356 .burst/.burst.scatter`. Replace scatter/retrigger bursts with a themed badge graphic (asset **A-1**) or at least a styled ribbon/plate behind the text.
- **P2 — Big-win banner dwell time.** `game.js:~740–742` / `#bigwin`. Enforce a minimum on-screen time by tier (~1.2–1.8s) independent of turbo/autoplay so NICE/BIG/MEGA/EPIC/MAX wins are actually seen.
- **P3 — Base-game house panels show empty "0/5".** Add a label or dimmed/"locked" treatment (or hide during base game) so they read as a bonus preview, not a broken HUD (`state-now.png`).
- **P4 — Menu labels right-aligned with a big gap.** Left-align each label next to its icon in `#menu-pop` (`de-menu.png`).
- **P5 — Menu popover title not localized.** It shows "MENU" in DE. Add an i18n key ("MENU"/"MENÜ").
- **P6 — Literal `->` arrows.** `i18n.js` `help.li5` (both languages): replace `->` with `→`.
- **P7 — House cinematic ships German literals.** `index.html:~33` hardcodes `HOLZ-HAUS` / `+2 FREISPIELE`. Default to empty and let i18n fill (prevents first-paint flash / stale text).
- **P8 — Document default language.** `index.html:~2` `<html lang="de">` → set `lang="en"` to match the code default (i18n still corrects at runtime).
- **P9 — Audio variety.** `audio.js`: reel stop reuses `vault-drop.wav` (heavy, also the cascade drop) — add a lighter wood/earth reel-stop sample distinct from the drop. Add a distinct free-spins music loop (switch on `enterFreeGame`, revert on exit). Optional: a dedicated retrigger sting.

---

# STABILITY (investigate)
During testing, one VIP bonus-buy caused a full session reset (balance snapped to start, bonus didn't begin); a retry worked. Reproduce and guard the VIP-buy → `enterFreeGame` handoff across `stake-adapter.js`, `vip-bonus-normalizer.js`, `game.js`. A bonus-buy that silently voids the round is severe if real.

# ASSETS
`REPORT.md` §12 has ready-to-use image-generation prompts **A-1** (scatter/retrigger burst badge), **A-2** (bonus-end summary panel), **A-3** (buy-choice house thumbnails), **A-4** (portrait / rotate overlay). Wire these in as the corresponding fixes land; until then, ship a styled CSS fallback so nothing regresses.

---

# Final verification checklist (run before you call it done)
1. Load and walk the game in **EN-desktop, DE-desktop, EN-portrait, DE-portrait.**
2. Base spins; buy **both** bonuses (popover → confirm → run → **end summary**); open **all four** modals (each has a top-right "x", none overlaps its title, backdrop closes).
3. Check every number: HUD (balance/win/bet), buy popover + confirm, paytable, RTP — **no mixed `,`/`.`**, **no >2-decimal** values, win idle localized.
4. Portrait: usable layout or rotate prompt; **menu popover not clipped**.
5. `grep -ri "jackpot\|MINOR\|GRAND\|MAJOR" frontend/` → empty.
6. Bonus finishes on a proper summary panel; big-win banner is visible long enough on turbo/auto.
7. Confirm the reel/character/background art is untouched and the theme still looks premium.
