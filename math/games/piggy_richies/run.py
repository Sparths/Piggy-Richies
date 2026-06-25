"""Entry point for simulating Piggy Richies and building its library.

Mirrors the role of ``run.py`` in the Stake math-sdk sample games. Usage::

    python games/piggy_richies/run.py quick        # fast smoke test
    python games/piggy_richies/run.py calibrate 4000000   # solve PAYTABLE_SCALE
    python games/piggy_richies/run.py build        # emit books + lookup tables + config

``build`` produces, under ``math/library/``:

    books/books_base.jsonl              sample base-game rounds (events per round)
    books/books_bonus.jsonl             Option A feature-buy rounds
    books/books_bonus_vip.jsonl         Option B (VIP) feature-buy rounds
    lookup_tables/lookUpTable_*.csv     weighted outcome-selection tables (RTP-exact)
    config/config.json                  front-end maths config
    config/optimisation.json            solved scale, measured RTP, summary stats
    ../games/piggy_richies/reels/*.csv  the reel strips

The exact RTP is enforced by exponential-tilt weights on each book set, so the
published lookup table averages to the target even though the underlying game is
extremely high-variance (see solve_tilt_weights in src/write_data).
"""

from __future__ import annotations

import json
import os
import random
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.rng import FastRNG, ProvablyFairRNG  # noqa: E402
from src.write_data import solve_tilt_weights, write_books_jsonl, write_json, write_lookup_table  # noqa: E402

from games.piggy_richies.game_config import GameConfig  # noqa: E402
from games.piggy_richies.gamestate import GameState  # noqa: E402

LIB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "library"))
TARGET_RTP = 0.9655
CAP = 15000.0


# ---------------------------------------------------------------------------
# generation helpers
# ---------------------------------------------------------------------------
def _gen(gs: GameState, n: int, kind: str, conditions: dict | None = None, seed: int = 1):
    """Generate ``n`` rounds; return (books, payouts). ``kind`` is base|buy."""
    books, payouts = [], []
    for i in range(n):
        # A fresh provably-fair seed per book so each carries a verifiable proof.
        gs.rng = ProvablyFairRNG(server_seed=f"{kind}-{seed}-{i}", nonce=i)
        if kind == "base":
            res = gs.run_spin()
        else:
            res = gs.run_feature_buy(conditions or {})
        payouts.append(res["payout"])
        books.append(
            {
                "id": i + 1,
                "serverSeedHash": gs.rng.server_seed_hash,
                "payoutMultiplier": res["payout"],
                "wincap": res["wincap"],
                "events": res["events"],
            }
        )
    return books, payouts


def _summary(payouts: list[float]) -> dict:
    n = len(payouts)
    s = sorted(payouts)
    return {
        "rounds": n,
        "rtp_books": round(sum(payouts) / n, 4),
        "hit_rate": round(sum(1 for p in payouts if p > 0) / n, 4),
        "max": round(max(payouts), 2),
        "p50": s[int(n * 0.5)],
        "p90": s[int(n * 0.9)],
        "p99": s[int(n * 0.99)],
    }


# ---------------------------------------------------------------------------
# modes
# ---------------------------------------------------------------------------
def calibrate(n: int) -> None:
    cfg = GameConfig()
    scale = cfg.PAYTABLE_SCALE
    cfg.wincap = 1e15
    gs = GameState(cfg, FastRNG(20260625))
    t0 = time.time()
    total = 0.0
    for _ in range(n):
        total += gs.run_spin()["payout"]
    mean = total / n
    new_scale = scale * TARGET_RTP / mean
    print(f"calibrated over {n:,} spins in {time.time() - t0:.0f}s")
    print(f"  rtp at baked scale {scale}: {mean * 100:.3f}%")
    print(f"  >>> set PAYTABLE_SCALE = {new_scale:.5f}")


def build() -> None:
    cfg = GameConfig()
    cfg.write_reels_csv()
    gs = GameState(cfg, FastRNG(1))

    modes = [
        ("base", "base", None, 20000),
        ("bonus", "buy", cfg.get_bet_mode("bonus").distributions[0].conditions, 8000),
        ("bonus_vip", "buy", cfg.get_bet_mode("bonus_vip").distributions[0].conditions, 8000),
    ]

    optimisation = {"target_rtp": TARGET_RTP, "paytable_scale": cfg.PAYTABLE_SCALE, "modes": {}}
    fair_costs = {}
    generated = {}

    for name, kind, conditions, n in modes:
        books, payouts = _gen(gs, n, kind, conditions, seed=hash(name) & 0xFFFF)
        generated[name] = (books, payouts, kind)
        mode = cfg.get_bet_mode(name)

        if kind == "base":
            target = TARGET_RTP
        else:
            # Feature-buy: fair cost so RTP == target; tilt to that mean.
            ev = sum(payouts) / len(payouts)
            fair_costs[name] = round(ev / TARGET_RTP, 2)
            target = ev  # weighted mean stays at the natural buy EV

        weights = solve_tilt_weights(payouts, target)
        wmean = sum(w * p for w, p in zip(weights, payouts)) / sum(weights)
        cost = mode.cost if kind == "base" else fair_costs[name]

        write_books_jsonl(os.path.join(LIB, "books", f"books_{name}.jsonl"), books)
        write_lookup_table(
            os.path.join(LIB, "lookup_tables", f"lookUpTable_{name}.csv"),
            [b["id"] for b in books],
            weights,
            payouts,
        )
        optimisation["modes"][name] = {
            "cost": mode.cost,
            "fair_cost": fair_costs.get(name, mode.cost),
            "weighted_rtp": round(wmean / cost, 6),
            **_summary(payouts),
        }
        print(f"[{name}] {_summary(payouts)}  fair_cost={fair_costs.get(name, mode.cost)}")

    _write_fe_config(cfg, optimisation, fair_costs)
    write_json(os.path.join(LIB, "config", "optimisation.json"), optimisation)
    _write_frontend(cfg, generated, fair_costs)
    print(f"\nlibrary written to {LIB}")


def _write_fe_config(cfg: GameConfig, optimisation: dict, fair_costs: dict) -> None:
    config = {
        "gameId": cfg.game_id,
        "gameName": cfg.game_name,
        "provider": cfg.provider,
        "numReels": cfg.num_reels,
        "numRows": cfg.num_rows,
        "numWays": cfg.num_ways,
        "rtp": cfg.rtp,
        "wincap": cfg.wincap,
        "minMatch": cfg.min_match,
        "symbols": cfg.symbols.to_json(),
        "paytable": cfg.paytable,
        "scatterPays": cfg.scatter_pays,
        "reels": cfg.reels,
        "betModes": [
            {
                "name": m.name,
                "cost": fair_costs.get(m.name, m.cost),
                "featureBuy": m.feature_buy,
            }
            for m in cfg.bet_modes
        ],
        "features": {
            "baseMultLadder": cfg.base_mult_ladder,
            "freeMultLadder": cfg.free_mult_ladder,
            "scatterTrigger": cfg.scatter_trigger,
            "freespinsAward": cfg.freespins_award,
            "freespinsRetrigger": cfg.freespins_retrigger,
            "houseLevels": cfg.house_levels,
            "wildMultValues": cfg.wild_mult_values,
            "wildMultWeights": cfg.wild_mult_weights,
            "maxStickyWilds": cfg.max_sticky_wilds,
        },
        "optimisation": optimisation,
    }
    write_json(os.path.join(LIB, "config", "config.json"), config)


def _curate(books: list[dict], payouts: list[float], cap: int, kind: str) -> list[dict]:
    """A *representative* random demo sample (NOT cherry-picked).

    Earlier the demo injected the biggest wins + many trigger rounds, which made
    it feel broken ("3 spins -> free spins -> 800x"). A plain random subset with
    uniform weights (see _write_frontend) reproduces the true odds: a base spin
    triggers the bonus only ~1 in 180, most spins are small or no win. Players
    use the Bonus-Buy button to see the feature on demand -- exactly like a real
    slot."""
    idx = list(range(len(books)))
    random.Random(20260625).shuffle(idx)
    return [books[i] for i in sorted(idx[: min(cap, len(idx))])]


def _write_frontend(cfg: GameConfig, generated: dict, fair_costs: dict) -> None:
    """Emit frontend/game-config.js and frontend/game-books.js (no-server demo)."""
    fe = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend"))
    os.makedirs(fe, exist_ok=True)

    with open(os.path.join(LIB, "config", "config.json")) as fh:
        config = json.load(fh)
    with open(os.path.join(fe, "game-config.js"), "w") as fh:
        fh.write("window.PIGGY_CONFIG = " + json.dumps(config, separators=(",", ":")) + ";\n")

    # Bigger base sample so the rare ~1/180 trigger is represented at true odds;
    # uniform weights => the demo's spin-to-spin frequencies match the real game.
    caps = {"base": 1500, "bonus": 60, "bonus_vip": 60}
    out: dict[str, list] = {}
    for name, (books, payouts, kind) in generated.items():
        sample = _curate(books, payouts, caps.get(name, 80), kind)
        out[name] = [
            {
                "weight": 1,
                "serverSeedHash": b["serverSeedHash"],
                "payoutMultiplier": b["payoutMultiplier"],
                "events": b["events"],
            }
            for b in sample
        ]
    with open(os.path.join(fe, "game-books.js"), "w") as fh:
        fh.write("window.PIGGY_BOOKS = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print(f"frontend written to {fe} ({sum(len(v) for v in out.values())} sample books)")


def quick() -> None:
    cfg = GameConfig()
    gs = GameState(cfg, FastRNG(42))
    n = 30000
    payouts = [gs.run_spin()["payout"] for _ in range(n)]
    print(f"quick {n} spins:", _summary(payouts))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "quick"
    if mode == "calibrate":
        calibrate(int(float(sys.argv[2])) if len(sys.argv) > 2 else 4_000_000)
    elif mode == "build":
        build()
    else:
        quick()
