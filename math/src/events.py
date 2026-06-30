"""Front-end event constructors -- the contract with the Web SDK.

A *book* is an ordered list of these dicts. The front-end replays them in order
to animate a round without ever re-deriving the maths. Names mirror the Stake
Web SDK vocabulary (``reveal``, ``winInfo``, ``setTotalWin``, ``updateGlobalMult``,
``freeSpinTrigger`` ...) so the playback contract is familiar.

Each constructor returns a plain dict; :class:`EventStream` just collects them
and stamps an incrementing ``index``.
"""

from __future__ import annotations

from typing import Any


class EventStream:
    """Accumulates the events that make up one round's book."""

    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def add(self, event: dict[str, Any]) -> dict[str, Any]:
        event = {"index": len(self.events), **event}
        self.events.append(event)
        return event

    # -- board / spin ------------------------------------------------------
    def reveal(self, board: list[list[str]], gametype: str, padding: list[list[str]] | None = None) -> dict:
        """Initial board for a spin. ``board`` is reels x rows (column-major)."""
        ev: dict[str, Any] = {"type": "reveal", "gametype": gametype, "board": board}
        if padding is not None:
            ev["paddingPositions"] = padding
        return self.add(ev)

    def win_info(self, wins: list[dict], total: float, multiplier: float) -> dict:
        """Per-cascade ways-wins: list of {symbol, kind, ways, win, positions}."""
        return self.add(
            {
                "type": "winInfo",
                "wins": wins,
                "stepWin": round(total, 4),
                "multiplier": multiplier,
            }
        )

    def tumble(self, exploded: list[list[int]], gametype: str) -> dict:
        """The wolf blows the marked positions off the board (Huff & Puff)."""
        return self.add({"type": "tumbleBoard", "explodePositions": exploded, "gametype": gametype})

    def drop_board(self, board: list[list[str]], gametype: str) -> dict:
        """Board state after gravity refills the holes -- the FE drops these in."""
        return self.add({"type": "dropBoard", "board": board, "gametype": gametype})

    def update_global_mult(self, multiplier: float) -> dict:
        """Progressive wolf multiplier moved to a new rung."""
        return self.add({"type": "updateGlobalMult", "globalMult": multiplier})

    def set_win(self, amount: float, multiplier: float) -> dict:
        return self.add({"type": "setWin", "amount": round(amount, 4), "multiplier": multiplier})

    def set_total_win(self, amount: float) -> dict:
        return self.add({"type": "setTotalWin", "amount": round(amount, 4)})

    # -- wilds -------------------------------------------------------------
    def wild_land(self, wilds: list[dict]) -> dict:
        """Wilds that landed this drop, each {position:[reel,row], multiplier:int}."""
        return self.add({"type": "wildLand", "wilds": wilds})

    def sticky_wilds(self, wilds: list[dict]) -> dict:
        return self.add({"type": "stickyWilds", "wilds": wilds})

    # -- free spins / house upgrade ---------------------------------------
    def freespin_trigger(self, scatters: int, positions: list[list[int]], spins: int) -> dict:
        return self.add(
            {
                "type": "freeSpinTrigger",
                "scatters": scatters,
                "positions": positions,
                "spinsAwarded": spins,
            }
        )

    def scatter_pay(self, scatters: int, amount: float) -> dict:
        return self.add({"type": "scatterPay", "scatters": scatters, "amount": round(amount, 4)})

    def update_freespin(self, current: int, total: int) -> dict:
        return self.add({"type": "updateFreeSpin", "current": current, "total": total})

    def house_upgrade(self, level: int, house: str, bricks: int, extra_spins: int) -> dict:
        return self.add(
            {
                "type": "houseUpgrade",
                "level": level,
                "house": house,
                "bricks": bricks,
                "extraSpins": extra_spins,
            }
        )

    def collect_brick(self, bricks: int, position: list[int]) -> dict:
        return self.add({"type": "collectBrick", "bricks": bricks, "position": position})

    def enter_freegame(self, total_spins: int, house: str, bricks: int = 0) -> dict:
        return self.add({"type": "enterFreeGame", "totalSpins": total_spins, "house": house, "bricks": bricks})

    def exit_freegame(self, total_win: float) -> dict:
        return self.add({"type": "exitFreeGame", "totalWin": round(total_win, 4)})

    # -- round end ---------------------------------------------------------
    def final_win(self, amount: float, capped: bool) -> dict:
        return self.add({"type": "finalWin", "amount": round(amount, 4), "wincapReached": capped})
