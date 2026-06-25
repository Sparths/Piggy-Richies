# Piggy Richies — math engine

Pure-Python re-implementation of the Stake **math-sdk** workflow for the
*Huff & Puff: Piggy Richies* slot. No third-party packages; Python ≥ 3.10.

## Layout

```
src/                       reusable engine (≈ Stake's src/)
  rng.py        FastRNG (sim) + ProvablyFairRNG (HMAC-SHA256 stream)
  symbols.py    Symbol / SymbolCatalogue
  config.py     Config / BetMode / Distribution
  board.py      reel-strip draw + cascade collapse (gravity refill)
  ways.py       1024 ways-to-win evaluation
  events.py     EventStream — the front-end event vocabulary
  write_data.py books / lookup-table writers + exponential-tilt weighting
games/piggy_richies/        the game (≈ Stake's games/<id>/)
  game_config.py            symbols, pay-table, reels, bet-modes, feature constants
  gamestate.py              run_spin (cascade) + run_freespin (House Upgrade)
  game_calculations.py      win-step maths
  game_events.py            event surface
  run.py                    quick | build | calibrate
  reels/                    generated reel-strip CSVs (BR0 base, FR0 free)
library/                    OUTPUT: books/ lookup_tables/ config/
```

## Commands

```bash
python games/piggy_richies/run.py quick               # 30k-spin smoke test + stats
python games/piggy_richies/run.py build               # write library + frontend data
python games/piggy_richies/run.py calibrate 4000000   # re-solve PAYTABLE_SCALE for 96.55%
```

`run.py` adds the repo root to `sys.path`, so run it from anywhere.

## How RTP is hit

1. **Design** the pay-table at a readable scale.
2. **Calibrate**: simulate millions of rounds; because every feature multiplies
   the base pays, RTP is linear in `PAYTABLE_SCALE`, so
   `scale ← scale · 0.9655 / measured_RTP`. (Committed scale is from an 8 M-spin
   run — see `library/config/optimisation.json`.)
3. **Pin it exactly**: each published lookup table carries exponential-tilt
   weights so its *weighted* RTP equals 96.55 % on the book set — the role of
   Stake's optimiser. Feature-buy costs are solved from the simulated buy EV.

## Outputs (`library/`)

| File | Contents |
|------|----------|
| `books/books_<mode>.jsonl` | one round per line: `{id, serverSeedHash, payoutMultiplier, wincap, events}` (git-ignored; large & regenerable) |
| `lookup_tables/lookUpTable_<mode>.csv` | `simulation, weight, payoutMultiplier` — RTP-exact selection table |
| `config/config.json` | front-end maths config (symbols, pay-table, reels, bet-modes, features) |
| `config/optimisation.json` | solved scale, target RTP, per-mode weighted RTP + stats |

The build also writes `../../frontend/game-config.js` and a curated, re-weighted
`game-books.js` so the web client runs with no server.
