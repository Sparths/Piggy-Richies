"""Configuration primitives -- the analogue of Stake's ``src/config``.

A game subclasses :class:`Config` and fills in symbols, pay-table, reel-strips
and a set of :class:`BetMode` objects. Each bet-mode owns one or more
:class:`Distribution` "criteria" (e.g. force-a-win-cap, force-the-feature,
zero-win, plain base game) with quota weights -- the same shape the Stake
optimiser uses to balance a book set towards a target RTP.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .symbols import SymbolCatalogue


@dataclass
class Distribution:
    """A weighted outcome class within a bet-mode.

    ``criteria`` is a free-form tag the game logic understands -- e.g.
    ``"wincap"``, ``"freegame"``, ``"0"`` (a forced zero-win) or ``"basegame"``.
    ``quota`` is the share of generated books that should satisfy it.
    """

    criteria: str
    quota: float
    conditions: dict = field(default_factory=dict)


@dataclass
class BetMode:
    """A way of placing a bet.

    ``cost`` is the stake as a multiple of the base bet (1.0 for a normal spin,
    e.g. 100.0 for a feature buy). ``feature_buy`` flags the bonus-buy modes so
    the front-end can present them separately.
    """

    name: str
    cost: float
    rtp: float
    max_win: float
    distributions: list[Distribution] = field(default_factory=list)
    feature_buy: bool = False
    auto_close_disabled: bool = False


class Config:
    """Base config. A concrete game overrides :meth:`__init__` and sets fields."""

    def __init__(self) -> None:
        self.game_id: str = "base"
        self.game_name: str = "Base Game"
        self.provider: str = "Stake Engine (concept)"
        self.num_reels: int = 5
        self.num_rows: int = 4
        self.rtp: float = 0.9655
        self.wincap: float = 15000.0
        self.symbols: SymbolCatalogue = SymbolCatalogue([])
        self.paytable: dict[str, dict[int, float]] = {}
        self.scatter_pays: dict[int, float] = {}
        # reel-strips, keyed by name -> list[list[symbol_id]] (one list per reel)
        self.reels: dict[str, list[list[str]]] = {}
        self.bet_modes: list[BetMode] = []

    # -- ways helper -------------------------------------------------------
    @property
    def num_ways(self) -> int:
        """Maximum ways-to-win = rows ** reels (4**5 = 1024 for this game)."""
        return self.num_rows**self.num_reels

    def get_bet_mode(self, name: str) -> BetMode:
        for mode in self.bet_modes:
            if mode.name == name:
                return mode
        raise KeyError(f"unknown bet mode {name!r}")
