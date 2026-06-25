"""1024 ways-to-win evaluation.

"Ways" pay for any same-symbol on *adjacent reels starting from reel 1*,
regardless of row. The number of ways for a symbol is the product of its
occurrence count on each consecutive reel it appears on; the win is
``paytable[symbol][num_reels] * ways``. The wolf (wild) substitutes for any
paying symbol. Scatters pay separately, anywhere, and are handled by the game.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .board import Board


@dataclass
class WaysWin:
    """One symbol's contribution on the current board."""

    symbol: str
    num_reels: int
    ways: int
    base_pay: float  # paytable value * ways, *before* any global/wild multiplier
    positions: set[tuple[int, int]] = field(default_factory=set)


def evaluate_ways(
    board: Board,
    paytable: dict[str, dict[int, float]],
    paying_symbols: list[str],
    wild: str,
) -> list[WaysWin]:
    """Return every winning symbol's :class:`WaysWin` for ``board``.

    A wild-only chain pays nothing on its own (the wolf has no pay table); it
    only ever *extends* a paying symbol's chain. To avoid double counting when a
    column contains both the symbol and wilds, each reel's "match count" for a
    symbol includes its own tiles plus wild tiles.
    """
    wins: list[WaysWin] = []

    for sym in paying_symbols:
        pay_by_count = paytable.get(sym)
        if not pay_by_count:
            continue

        # Walk reels left-to-right collecting matching positions until a gap.
        per_reel_positions: list[list[tuple[int, int]]] = []
        for r in range(board.num_reels):
            matches = [
                (r, row)
                for row in range(board.num_rows)
                if board.grid[r][row] == sym or board.grid[r][row] == wild
            ]
            if not matches:
                break
            per_reel_positions.append(matches)

        num_reels = len(per_reel_positions)
        if num_reels < 3:  # minimum 3-of-a-kind
            continue
        # A pure-wild chain (no actual symbol anywhere) is not a win for `sym`.
        if not any(
            board.grid[r][row] == sym
            for reel in per_reel_positions
            for (r, row) in reel
        ):
            continue

        pay = pay_by_count.get(num_reels)
        if pay is None:  # paytable might only define 3/4/5 -- fall back to longest
            pay = pay_by_count.get(max(pay_by_count))
        ways = 1
        for reel in per_reel_positions:
            ways *= len(reel)

        positions = {pos for reel in per_reel_positions for pos in reel}
        wins.append(
            WaysWin(
                symbol=sym,
                num_reels=num_reels,
                ways=ways,
                base_pay=round(pay * ways, 6),
                positions=positions,
            )
        )

    return wins
