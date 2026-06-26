# Design & modelling notes

This document records how the concept (`konzept_three_little_pigs_slot.pdf`) was
turned into a working math model + front-end, and how the few open questions in
the GDD were resolved. The GDD deliberately specified only the *theme, visuals
and mechanics* and asked the implementer to derive the maths, data structures
and code independently — so the choices below are the substance of the build.

## Architecture

The official Stake **math-sdk** depends on Rust (for its optimiser) and a wider
framework; the **web-sdk** uses Turborepo + Svelte 5 + PixiJS 8. To keep this
deliverable *runnable anywhere with zero install*, the same concepts are
re-implemented in:

* **Pure-Python math engine** (`math/src` + `math/games/piggy_richies`) mirroring
  the Stake game layout (`game_config.py`, `gamestate.py` with a `run_spin`
  entry point, `game_calculations.py`, `game_events.py`, `run.py`, `reels/`).
* **Vanilla web client** (`frontend/`) that consumes the math **events** exactly
  like the web-sdk does — pure event playback, no game maths on the client.

## RTP calibration

Pay-table values are authored at a readable *design* scale, then one global
`PAYTABLE_SCALE` is solved so the modelled RTP hits **96.55 %**:

1. Every win feature (cascade ladder, wild multipliers, free spins) multiplies
   the same base pays, so total payout is **linear** in the pay-table scale
   (before the win-cap, which almost never binds). Hence `scale = scale₀ ·
   0.9655 / measured_RTP`.
2. The win-cap (15 000×) is **not** scaled — it is the fixed theoretical ceiling.
3. The published **lookup tables** then carry exponential-tilt weights
   (`src/write_data.solve_tilt_weights`) so the *weighted* RTP over the book set
   is exact, mirroring the role of Stake's optimiser.

### Heavy-tail variance & the win-cap (calibrate *capped*)

The game is *very high volatility*: the mean is dominated by rare Brick-Fortress
runs, so a naive 200k-spin RTP estimate swings by several % between seeds. Worse,
the bonus has a heavy tail **beyond** the 15 000× cap — uncapped vs capped means
differ by ~7 %, so the cap genuinely truncates that slice of return. `run.py
calibrate` therefore solves `PAYTABLE_SCALE` against the **capped** mean (the RTP
players actually get) over millions of rounds, and prints the uncapped/cap-cost
diagnostic. The committed scale comes from a **2.5 M-spin** capped calibration;
the lookup-tilt weights then pin the *published* RTP to 96.55 % exactly,
regardless. Feature-buy prices are taken from a separate **large** EV sim
(`_buy_ev`, 120 k rounds) because the 8 k demo-book sample is far too few to
price a 15 000×-tail bonus (its EV estimate swings 2–3×).

## Resolved interpretations of the GDD

| Topic | GDD text | Decision |
|-------|----------|----------|
| Cascade removal | "Wolf blows the winning symbols off" | Only the **paying tiles** of a win are removed and refilled by gravity. |
| Wild persistence | Wilds substitute; sticky only at Level 3 | Outside Level 3 wilds tumble with the win (no runaway cascades). At Level 3 they are **sticky**: re-stamped at their locked cells at the start of every remaining spin, so they persist for the rest of the bonus. |
| Wild multipliers | "random 2× or 3×" (Wood+) | A win's participating wild multipliers are **summed** (2×+3× → ×5), not multiplied — keeps the very-high-vol tail thrilling without an exponential blow-up. |
| Progressive multiplier | base "1× → 2× → 3× → max 5×"; free "up to 8×" | Ladders `[1,2,3,5]` (base) and `[1,2,3,5,8]` (free). Resets after a win-less spin; at Level 3 it **persists** across spins (never resets). |
| Sticky-wild count | "all wilds become sticky" | Capped (`max_sticky_wilds = 2`) as a **balance lever**: uncapped + persistent-8× snowballs the board into a guaranteed max-win every Fortress run (avg bonus ≈ 480 000×). The cap keeps 15 000× a *genuine rare ceiling*. |
| Scatter timing | "3+ pots trigger / pay" | Counted on the **settled board** after the cascade resolves. Pots never tumble off (only paying tiles do), so ones that drop in mid-cascade **accumulate** — a 2-pot board still triggers when the 3rd falls in on a tumble. |
| Free-spin awards | unspecified | 3/4/5 scatters → 10/12/15 spins; retrigger +5; level-up grants +2 (Wood) / +3 (Brick) spins. |
| Brick collection | "collect bricks on reel 5" | A **brick token** (`BR`) seeded one-per-reel on every free-game reel, so it can land **anywhere on the grid** (≈ 0.44/spin overall, same pace as the old reel-5-only build reel); 5 → Wood, 10 → Brick Fortress. Bricks present on the revealed board are banked (animated to the meter) before the cascade; only reveal-board bricks count, which keeps the upgrade pace intact. |
| Feature buy | A regular, B (VIP) starts in Wood | Bet-modes `bonus` (Straw start) and `bonus_vip` (Wood start, +2 pre-bricks, +2 spins). Costs are **solved** to the fair RTP from a large simulated buy EV. |
| Provably fair | "every reel stop from a transparent crypto RNG" | `ProvablyFairRNG` = HMAC-SHA256(server_seed, `client:nonce:cursor`) stream; each emitted book carries its `serverSeedHash`. |

## Feature reach (very-high-volatility profile)

From simulation, a naturally-triggered bonus reaches:

* **Straw House** (start) — every bonus
* **Wood House** (≥5 bricks) — ≈ 50 % of bonuses, adds 2×/3× wild multipliers
* **Brick Fortress** (≥10 bricks) — ≈ 6 % of bonuses (the marquee event): sticky
  wilds + a persistent cascade multiplier that no longer resets

This keeps the bonus exciting at every level while the 15 000× ceiling stays a
rare, real possibility rather than a routine outcome.
