"""The visible board and reel-strip mechanics.

A board is ``num_reels`` columns x ``num_rows`` rows of symbol ids. Symbols are
drawn from per-reel *strips*: a random stop is chosen on each strip and the
``num_rows`` consecutive symbols below it (with wrap-around) become that reel's
visible column. This is the standard physical-reel model and it is what gives a
strip its statistical "shape" (symbol frequencies -> hit rate & volatility).

For the Huff & Puff cascade we also implement :func:`collapse`, which removes a
set of winning positions, lets the survivors fall under gravity, and refills the
empty cells from the top of each reel's strip.
"""

from __future__ import annotations

from typing import Sequence

from .rng import FastRNG, ProvablyFairRNG

RNG = FastRNG | ProvablyFairRNG


class Board:
    """A mutable ``reels x rows`` grid of symbol ids plus its source strips."""

    def __init__(self, strips: Sequence[Sequence[str]], num_rows: int, rng: RNG) -> None:
        self.strips = [list(s) for s in strips]
        self.num_reels = len(self.strips)
        self.num_rows = num_rows
        self.rng = rng
        # grid[reel][row]
        self.grid: list[list[str]] = [["" for _ in range(num_rows)] for _ in range(self.num_reels)]
        # independent "cursor" per reel into its strip, used to refill on cascade
        self._stops: list[int] = [0] * self.num_reels

    # -- initial draw ------------------------------------------------------
    def draw(self) -> None:
        """Fresh spin: pick a random stop per reel and read the window."""
        for r in range(self.num_reels):
            strip = self.strips[r]
            stop = int(self.rng.random() * len(strip))
            self._stops[r] = stop
            for row in range(self.num_rows):
                self.grid[r][row] = strip[(stop + row) % len(strip)]

    # -- cascade -----------------------------------------------------------
    def collapse(self, winning_positions: set[tuple[int, int]]) -> int:
        """Remove ``winning_positions``; drop survivors; refill from strip top.

        Returns the number of cells that were cleared (handy for stats/animation).
        New symbols are pulled by continuing to walk *up* each reel's strip from
        the current stop, so refills stay faithful to the strip composition.
        """
        cleared = 0
        for r in range(self.num_reels):
            kept = [self.grid[r][row] for row in range(self.num_rows) if (r, row) not in winning_positions]
            missing = self.num_rows - len(kept)
            cleared += missing
            strip = self.strips[r]
            new_symbols = []
            for _ in range(missing):
                self._stops[r] = (self._stops[r] - 1) % len(strip)
                new_symbols.append(strip[self._stops[r]])
            # new symbols enter from the top, survivors keep their order below
            column = new_symbols + kept
            for row in range(self.num_rows):
                self.grid[r][row] = column[row]
        return cleared

    # -- helpers -----------------------------------------------------------
    def column(self, reel: int) -> list[str]:
        return list(self.grid[reel])

    def count_symbol(self, sym_id: str) -> int:
        return sum(col.count(sym_id) for col in self.grid)

    def positions_of(self, sym_id: str) -> list[tuple[int, int]]:
        return [
            (r, row)
            for r in range(self.num_reels)
            for row in range(self.num_rows)
            if self.grid[r][row] == sym_id
        ]

    def as_rows(self) -> list[list[str]]:
        """Return the grid row-major (rows x reels) -- the shape the FE renders."""
        return [[self.grid[r][row] for r in range(self.num_reels)] for row in range(self.num_rows)]

    def snapshot(self) -> list[list[str]]:
        """Column-major copy (reels x rows) for embedding in an event."""
        return [list(col) for col in self.grid]
