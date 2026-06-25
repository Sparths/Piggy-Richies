"""Output writers -- the analogue of Stake's ``src/write_data``.

Produces the three artefacts the platform/front-end consume:

* ``books/books_<mode>.jsonl``       -- one round per line: ``{id, payoutMultiplier, events}``
* ``lookup_tables/lookUpTable_<mode>.csv`` -- ``id, weight, payout`` selection table
* ``config/config.json``             -- the front-end maths config

The lookup table carries a *weight* per book. We solve those weights by
exponential tilting (max-entropy with a mean constraint) so the weighted average
payout equals the target RTP *exactly* on the generated set -- the same job the
Stake optimiser does, in miniature.
"""

from __future__ import annotations

import json
import math
import os


def solve_tilt_weights(payouts: list[float], target: float) -> list[float]:
    """Return positive weights (summing to len) s.t. weighted mean == target.

    Uses ``w_i ∝ exp(lambda * payout_i)`` and bisects ``lambda``. Falls back to
    uniform weights if the target is outside the achievable range.
    """
    n = len(payouts)
    if n == 0:
        return []
    lo_mean, hi_mean = min(payouts), max(payouts)
    if not (lo_mean < target < hi_mean):
        return [1.0] * n  # target not strictly inside range -> uniform

    def weighted_mean(lam: float) -> float:
        # log-sum-exp stabilised
        m = max(lam * p for p in payouts)
        num = sum(p * math.exp(lam * p - m) for p in payouts)
        den = sum(math.exp(lam * p - m) for p in payouts)
        return num / den

    lo, hi = -5.0, 5.0
    # ensure bracket
    for _ in range(60):
        mid = (lo + hi) / 2
        if weighted_mean(mid) < target:
            lo = mid
        else:
            hi = mid
    lam = (lo + hi) / 2
    m = max(lam * p for p in payouts)
    raw = [math.exp(lam * p - m) for p in payouts]
    avg = sum(raw) / n
    return [w / avg for w in raw]  # normalise so mean weight == 1


def write_books_jsonl(path: str, books: list[dict]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        for b in books:
            fh.write(json.dumps(b, separators=(",", ":")) + "\n")


def write_lookup_table(path: str, ids: list[int], weights: list[float], payouts: list[float]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write("simulation,weight,payoutMultiplier\n")
        for i, w, p in zip(ids, weights, payouts):
            fh.write(f"{i},{round(w, 6)},{round(p, 4)}\n")


def write_json(path: str, data: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(data, fh, indent=2)
