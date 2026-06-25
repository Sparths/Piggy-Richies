# 🐺 Stake's Huff & Puff: Piggy Richies

A complete, runnable implementation of the **"Three Little Pigs"** cascade slot
described in [`docs/konzept_three_little_pigs_slot.pdf`](docs/) — built the way a
real **Stake Engine** original game is built: a Python **math engine** that
defines the rules, simulates millions of rounds, tunes the **RTP to 96.55 %** and
emits *books* + *lookup tables*, and an event-driven **web front-end** that
replays those books with full cascade / free-spin animation.

> 5×4 grid · **1 024 ways** · Huff & Puff cascades · progressive Wolf multiplier ·
> House Upgrade free spins (Straw → Wood → Brick Fortress) · feature buy ·
> **96.55 % RTP** · **15 000× max win** · provably-fair ready.

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  math/  (Stake math-sdk)    │  books  │  frontend/  (Stake web-sdk)  │
│  rules · sim · RTP · books  │ ──────▶ │  replays events, animates    │
│  → library/ + game-*.js     │ events  │  cascades & free spins       │
└─────────────────────────────┘         └──────────────────────────────┘
```

---

## How a Stake slot game is actually built

Stake publishes two open SDKs (researched from the official docs & repos — see
[Sources](#sources)):

| Layer | Repo | Role |
|-------|------|------|
| **Math SDK** | [`StakeEngine/math-sdk`](https://github.com/StakeEngine/math-sdk) | Python. Define symbols, pay-table, reel-strips and bet-modes in `games/<id>/`; `run.py` simulates rounds, optimises win-distribution to a target RTP, and writes a `library/` of **books** (every round as a stream of **events**) + **lookup tables** (weighted outcome selection). |
| **Web SDK** | [`StakeEngine/web-sdk`](https://github.com/StakeEngine/web-sdk) | TypeScript (Svelte 5 + PixiJS 8). Event-driven: the client **replays the math events** (`reveal`, `winInfo`, tumble, `updateGlobalMult`, `freeSpinTrigger`…) and animates them. No game maths live on the client. |
| **RGS / Provably Fair** | platform | Picks the predetermined round, exposes the cryptographic seed so any result can be verified. |

A game folder looks like `gamestate.py` (a `run_spin()` entry point), `game_config.py`
(symbols / pay-table / reels / bet-modes), `game_calculations.py`, `game_events.py`
and a `reels/` folder of CSV strips. **This repo mirrors that exact structure** in
pure Python (no Rust/Turborepo needed) so it runs anywhere, and ships a
self-contained web client that speaks the same event vocabulary.

---

## Repository layout

```
math/
  src/                     core engine (≈ Stake's src/)
    config.py   symbols.py  board.py   ways.py
    events.py   rng.py       write_data.py
  games/piggy_richies/     the game (≈ Stake's games/<id>/)
    game_config.py         5×4, pay-table, reels, bet-modes, feature constants
    gamestate.py           Huff & Puff cascades + House Upgrade free spins
    game_calculations.py   win-step maths
    game_events.py         event vocabulary
    run.py                 simulate · calibrate · build the library
    reels/                 generated reel-strip CSVs
  library/                 OUTPUT: books/ lookup_tables/ config/
frontend/
  index.html  style.css  game.js     event-player web client
  game-config.js  game-books.js       emitted by `run.py build`
docs/                      the concept PDF + design notes
```

---

## Run it

### 1. The math engine

```bash
cd math
python games/piggy_richies/run.py quick       # 30k-spin smoke test + stats
python games/piggy_richies/run.py build        # emit books, lookup tables, config, frontend data
python games/piggy_richies/run.py calibrate 4000000   # re-solve PAYTABLE_SCALE for 96.55%
```

No third-party packages are required (standard-library Python ≥ 3.10).

### 2. The front-end

Just open `frontend/index.html` in a browser (the math build writes
`game-config.js` + `game-books.js` next to it, so it runs straight from
`file://` — no server needed). Press **SPIN**, or buy the bonus.

---

## Maths & RTP

The pay-table is defined at a *designed* scale, then a single global
`PAYTABLE_SCALE` is **solved by simulation** so the modelled RTP lands on the
target. Because every multiplier feature (cascade ladder, wild multipliers,
free spins) scales the base pays linearly, one scalar retargets RTP without
disturbing the volatility shape. The published **lookup tables** carry
exponential-tilt weights so the weighted RTP is exact on the book set — the same
job Stake's optimiser does.

| Metric | Value |
|--------|------:|
| Target RTP | **96.55 %** |
| Published RTP (lookup-tilted) | **96.55 %** — exact on every book set |
| Modelled RTP (8 M-spin calibration) | 96.55 % (point), 95 % CI ±1.9 % |
| `PAYTABLE_SCALE` solved | `0.31602` |
| Grid / ways | 5×4 / **1 024** |
| Hit rate | ≈ 57 % |
| Free-spins trigger | ≈ 1 in 180 |
| Feature share of RTP | ≈ 41 % |
| Feature-buy cost (A / VIP) | ≈ **79× / 221×** (fair, solved) |
| Wood House reached | ≈ 48 % of bonuses |
| Brick Fortress reached | ≈ 6 % of bonuses |
| Max win | **15 000×** (enforced cap, ≈ 1 in 8 M) |
| Volatility | **very high** |

> Because the game is *very high volatility*, the RTP mean is dominated by rare
> Brick-Fortress runs — a naive 200k-spin average swings ±6 %. That is exactly
> why Stake uses weighted lookup tables; here the scale is calibrated over
> **8 million** rounds (95 % CI ±1.9 %) and the exponential-tilt lookup weights
> pin the published RTP to **exactly 96.55 %** (`optimisation.json` reports
> `weighted_rtp = 0.9655` for all three modes).

---

## Game design — mapping the concept to code

| GDD section | Implementation |
|-------------|----------------|
| 2 · 5×4, 1 024 ways, 96.55 %, 15 000× | `game_config.py` (`num_reels/rows`, `num_ways`, `rtp`, `wincap`) |
| 3 · Symbol catalogue | `symbols.py` + catalogue in `game_config.py` (Wolf wild, Soup-pot scatter, 3 pigs, 3 tools, 4 cards, brick token) |
| 4.1 · Huff & Puff cascade | `gamestate._play_cascades` + `board.collapse` (winning tiles blown away, gravity refills) |
| 4.2 · Progressive Wolf multiplier 1→5× | `base_mult_ladder` `[1,2,3,5]`, resets after a win-less spin |
| 5 · House Upgrade free spins | `gamestate.run_freespin` — brick collection on reel 5, levels Straw→Wood→Brick |
| 5 · Wood (≥5 bricks) wild mults 2×/3× | `wild_mult_values`, applied from level 2 |
| 5 · Brick Fortress (≥10) sticky wilds + persistent mult | sticky re-stamping + non-resetting cascade index, free ladder up to 8× |
| 6 · Feature buy A / VIP B | bet-modes `bonus` (Straw) & `bonus_vip` (Wood, +bricks) |
| 6 · Provably fair | `rng.ProvablyFairRNG` (HMAC-SHA256 seed stream); each book carries its seed hash |

See [`docs/DESIGN.md`](docs/DESIGN.md) for the modelling decisions and the few
places the concept left a detail open (and how they were resolved).

---

## Sources

Research into how Stake originals are built:

- [Stake Engine — math-sdk](https://github.com/StakeEngine/math-sdk) · [docs](https://stakeengine.github.io/math-sdk/)
- [Stake Engine — web-sdk](https://github.com/StakeEngine/web-sdk)
- [Math-SDK quickstart & game structure](https://stakeengine.github.io/math-sdk/math_docs/quickstart/)
- [Stake Engine overview](https://stake-engine.com/)

---

*Concept build for educational/demo purposes. Not affiliated with Stake. Gamble responsibly.*
