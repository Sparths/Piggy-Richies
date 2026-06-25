"""Symbol catalogue helpers.

A symbol is just an id string plus metadata flags. The pay-table is a mapping
``{symbol_id: {count: multiplier_of_total_bet}}`` exactly as in the Stake sample
games (e.g. ``"5 H1" -> 10``). Keeping it data-only makes RTP tuning a matter of
scaling numbers, not editing logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Symbol:
    """One reel symbol.

    ``kind`` is purely descriptive (premium/mid/low/wild/scatter/brick) and is
    handy for the front-end and for analytics sheets.
    """

    id: str
    name: str
    kind: str
    is_wild: bool = False
    is_scatter: bool = False
    is_collectible: bool = False  # the "brick-stone" upgrade token (free spins only)
    emoji: str = ""  # lightweight visual used by the no-asset web client


@dataclass
class SymbolCatalogue:
    """Lookup helpers over a list of :class:`Symbol`."""

    symbols: list[Symbol] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._by_id = {s.id: s for s in self.symbols}

    def __getitem__(self, sym_id: str) -> Symbol:
        return self._by_id[sym_id]

    def __contains__(self, sym_id: str) -> bool:
        return sym_id in self._by_id

    @property
    def ids(self) -> list[str]:
        return [s.id for s in self.symbols]

    @property
    def wild(self) -> str:
        return next(s.id for s in self.symbols if s.is_wild)

    @property
    def scatter(self) -> str:
        return next(s.id for s in self.symbols if s.is_scatter)

    @property
    def paying(self) -> list[str]:
        """Symbols that form ways-wins (everything except wild/scatter/brick)."""
        return [
            s.id
            for s in self.symbols
            if not (s.is_wild or s.is_scatter or s.is_collectible)
        ]

    def to_json(self) -> list[dict]:
        return [
            {
                "id": s.id,
                "name": s.name,
                "kind": s.kind,
                "wild": s.is_wild,
                "scatter": s.is_scatter,
                "collectible": s.is_collectible,
                "emoji": s.emoji,
            }
            for s in self.symbols
        ]
