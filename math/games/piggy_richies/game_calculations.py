"""Pure win-maths helpers for Piggy Richies.

Kept separate from the round orchestration in :mod:`.gamestate` (the same split
the Stake sample games use) so the money maths is easy to read and unit-test.
"""

from __future__ import annotations

from src.board import Board
from src.symbols import SymbolCatalogue
from src.ways import WaysWin


def compute_step(
    board: Board,
    wins: list[WaysWin],
    symbols: SymbolCatalogue,
    wild_mult_map: dict[tuple[int, int], int],
    global_mult: float,
) -> tuple[float, list[dict], set[tuple[int, int]]]:
    """Turn raw ways-wins into paid amounts + the cells the wolf blows away.

    The amount for one symbol's win is::

        base_pay (= paytable * ways)  x  summed participating wild mults  x  global cascade mult

    Every tile that took part in a win is blown off the board (the wolf huffs and
    puffs). Brick-Fortress sticky wilds survive instead by being re-stamped at
    the start of each remaining free spin (see gamestate.run_freespin).
    """
    wild = symbols.wild
    step = 0.0
    win_dicts: list[dict] = []
    removal: set[tuple[int, int]] = set()

    for w in wins:
        # Participating wild multipliers are SUMMED (not multiplied): a 2x and a
        # 3x wild in the same win give x5, which keeps the very-high-volatility
        # tail exciting without the exponential blow-up that products cause.
        bonus_mults = [wild_mult_map.get((r, row), 1) for (r, row) in w.positions if board.grid[r][row] == wild]
        extra = sum(m for m in bonus_mults if m > 1)
        wild_factor = extra if extra > 0 else 1
        amount = w.base_pay * wild_factor * global_mult
        step += amount
        win_dicts.append(
            {
                "symbol": w.symbol,
                "kind": symbols[w.symbol].kind,
                "numReels": w.num_reels,
                "ways": w.ways,
                "wildMult": wild_factor,
                "win": round(amount, 4),
                "positions": sorted([list(p) for p in w.positions]),
            }
        )
        removal.update(w.positions)

    return round(step, 6), win_dicts, removal
