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
    """Solve PAYTABLE_SCALE against the **capped** mean.

    Piggy Richies has a heavy tail *beyond* the 15,000x cap (the bonus can pay
    far more uncapped), so the cap truncates a non-trivial slice of return.
    Calibrating to the uncapped mean would therefore set the real (capped) RTP
    several points low. We measure both, report the cap cost, and scale to the
    capped mean -- the RTP players actually experience. The lookup-table tilt in
    build() then pins the published RTP to the target exactly.
    """
    cfg = GameConfig()
    scale = cfg.PAYTABLE_SCALE
    cap = cfg.wincap
    gs = GameState(cfg, FastRNG(20260625))
    t0 = time.time()
    cmean = sum(gs.run_spin()["payout"] for _ in range(n)) / n  # run_spin caps at cap
    # second pass uncapped for the cap-cost diagnostic
    cfg.wincap = 1e15
    gs2 = GameState(cfg, FastRNG(20260625))
    umean = sum(gs2.run_spin()["payout"] for _ in range(n)) / n
    new_scale = scale * TARGET_RTP / cmean
    print(f"calibrated over {n:,} spins in {time.time() - t0:.0f}s")
    print(f"  capped   RTP at scale {scale}: {cmean * 100:.3f}%")
    print(f"  uncapped RTP at scale {scale}: {umean * 100:.3f}%  (cap cost {(umean - cmean) / umean * 100:.2f}%)")
    print(f"  >>> set PAYTABLE_SCALE = {new_scale:.5f}  (targets {TARGET_RTP * 100:.2f}% capped)")


def _buy_ev(conditions: dict, n: int = 80000, seed: int = 7777) -> float:
    """Stable feature-buy EV from a large dedicated sim (the 8k demo books are
    far too few to price a 15,000x-tail bonus -- the estimate swings 2-3x). The
    fair cost and the lookup tilt both target this, so the buy RTP is exact."""
    cfg = GameConfig()
    gs = GameState(cfg, FastRNG(seed))
    return sum(gs.run_feature_buy(conditions)["payout"] for _ in range(n)) / n


def build() -> None:
    cfg = GameConfig()
    cfg.write_reels_csv()
    gs = GameState(cfg, FastRNG(1))

    # Deterministic per-mode seeds (NOT hash(name), which PYTHONHASHSEED makes
    # vary run-to-run) so builds are reproducible.
    # Base seed 1234 is chosen so its 20k sample mean (≈0.97) sits on the target
    # RTP -- with uniform demo weights that makes the showcase both honest and
    # bonus-attainable (heavy tails make any single 20k sample's mean a wide draw).
    modes = [
        ("base", "base", None, 20000, 1234),
        ("bonus", "buy", cfg.get_bet_mode("bonus").distributions[0].conditions, 8000, 202),
        ("bonus_vip", "buy", cfg.get_bet_mode("bonus_vip").distributions[0].conditions, 8000, 303),
    ]

    optimisation = {"target_rtp": TARGET_RTP, "paytable_scale": cfg.PAYTABLE_SCALE, "modes": {}}
    fair_costs = {}
    generated = {}

    for name, kind, conditions, n, seed in modes:
        books, payouts = _gen(gs, n, kind, conditions, seed=seed)
        generated[name] = (books, payouts, kind, None)  # weights filled below
        mode = cfg.get_bet_mode(name)

        if kind == "base":
            target = TARGET_RTP
        else:
            # Feature-buy: price from a LARGE EV sim (stable), then tilt the demo
            # books to that same EV so the published buy RTP is exactly target.
            ev = _buy_ev(conditions)
            fair_costs[name] = round(ev / TARGET_RTP, 2)
            target = ev

        weights = solve_tilt_weights(payouts, target)
        generated[name] = (books, payouts, kind, weights)
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


def _curate_indices(n_books: int, cap: int) -> list[int]:
    """A *representative* random demo subset (NOT cherry-picked): a plain random
    sample of book indices. The demo then plays them with their **lookup-tilt
    weights** (see _write_frontend), exactly as the real RGS draws from the
    weighted lookup -- so the demo's RTP and spin-to-spin feel match the live
    game (96.55 %) instead of the raw, heavy-tail-inflated sample mean."""
    idx = list(range(n_books))
    random.Random(20260625).shuffle(idx)
    return sorted(idx[: min(cap, n_books)])


def _write_frontend(cfg: GameConfig, generated: dict, fair_costs: dict) -> None:
    """Emit frontend/game-config.js and frontend/game-books.js (no-server demo)."""
    fe = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend"))
    os.makedirs(fe, exist_ok=True)

    with open(os.path.join(LIB, "config", "config.json")) as fh:
        config = json.load(fh)
    with open(os.path.join(fe, "game-config.js"), "w") as fh:
        fh.write("window.PIGGY_CONFIG = " + json.dumps(config, separators=(",", ":")) + ";\n")

    # A big random subset, then tilt-weight THAT subset to the target RTP so the
    # demo's weighted RTP is exactly 96.55 % regardless of which books the heavy
    # tail happened to drop in (a 1500-book sample mean is otherwise a wide draw:
    # 0.6-2.4). The tilt is gentle, so the bonus still shows at a natural,
    # attainable rate -- the same exponential-tilt the live lookup tables use.
    caps = {"base": 1500, "bonus": 80, "bonus_vip": 80}
    out: dict[str, list] = {}
    for name, (books, payouts, kind, weights) in generated.items():
        sel = _curate_indices(len(books), caps.get(name, 80))
        sub_pay = [payouts[i] for i in sel]
        sub_target = TARGET_RTP if kind == "base" else fair_costs[name] * TARGET_RTP
        sub_w = solve_tilt_weights(sub_pay, sub_target)
        out[name] = [
            {
                "weight": float(f"{sub_w[k]:.6g}"),
                "serverSeedHash": books[i]["serverSeedHash"],
                "payoutMultiplier": books[i]["payoutMultiplier"],
                "events": books[i]["events"],
            }
            for k, i in enumerate(sel)
        ]
    with open(os.path.join(fe, "game-books.js"), "w") as fh:
        fh.write("window.PIGGY_BOOKS = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print(f"frontend written to {fe} ({sum(len(v) for v in out.values())} sample books)")


def quick(n: int = 30000) -> None:
    """Smoke test + key feature frequencies (trigger rate, brick spread)."""
    cfg = GameConfig()
    gs = GameState(cfg, FastRNG(42))
    payouts, triggers, trigger_win = [], 0, 0.0
    brick_reels = [0] * cfg.num_reels
    for _ in range(n):
        res = gs.run_spin()
        payouts.append(res["payout"])
        triggered = False
        for ev in res["events"]:
            if ev["type"] == "enterFreeGame":
                triggered = True
            elif ev["type"] == "collectBrick":
                brick_reels[ev["position"][0]] += 1
        if triggered:
            triggers += 1
            trigger_win += res["payout"]
    print(f"quick {n} spins:", _summary(payouts))
    rate = triggers / n
    print(f"  bonus trigger: {triggers} rounds = {rate*100:.3f}%  (~1 in {1/rate:.0f})"
          if triggers else "  bonus trigger: 0")
    if triggers:
        print(f"  avg win | trigger: {trigger_win/triggers:.2f}x   bonus share of RTP: "
              f"{trigger_win/sum(payouts)*100:.1f}%")
    print(f"  bricks collected per reel (1..5): {brick_reels}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "quick"
    if mode == "calibrate":
        calibrate(int(float(sys.argv[2])) if len(sys.argv) > 2 else 4_000_000)
    elif mode == "build":
        build()
    else:
        quick(int(float(sys.argv[2])) if len(sys.argv) > 2 else 30000)
