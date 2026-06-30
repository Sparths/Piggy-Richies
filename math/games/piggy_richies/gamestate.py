"""Round logic for Piggy Richies.

``run_spin`` is the entry point the book generator calls for one base-game round
(exactly the ``run_spin`` contract from the Stake math-sdk). It draws a board,
runs the **Huff & Puff** cascade engine with the progressive wolf multiplier,
and -- if three or more soup-pots land -- hands over to ``run_freespin`` for the
**House Upgrade Free Spins**.

Design notes / interpretations of the GDD where it left a detail open:

* The wolf blows away only the *paying* tiles in a win; wilds and scatters stay.
  This is what lets wilds survive a cascade and become sticky at Level 3.
* Scatter count for pays/triggers is read from the *settled* board after the
  cascade resolves: because pots never tumble off, ones that drop in mid-cascade
  accumulate, so a 2-scatter board still triggers when the 3rd pot tumbles in.
* Bricks (House-Upgrade collectible) can land on any reel and are banked after
  the board is revealed, so the player sees each one land before it is collected.
* Sticky wilds (Level 3) are re-stamped at their locked cells at the start of
  every remaining free spin, so they persist for the rest of the bonus.
* At Level 3 the global cascade multiplier index carries across spins and never
  resets; at Levels 1-2 it resets at the start of each spin.
"""

from __future__ import annotations

from src.board import Board
from src.events import EventStream
from src.ways import evaluate_ways

from .game_calculations import compute_step
from .game_config import GameConfig


class GameState:
    def __init__(self, config: GameConfig, rng) -> None:
        self.config = config
        self.rng = rng
        self.sym = config.symbols
        self.wild = self.sym.wild
        self.scatter = self.sym.scatter
        self.paying = self.sym.paying
        # populated per round
        self.es: EventStream | None = None
        self.board: Board | None = None

    # ====================================================================
    # Base game
    # ====================================================================
    def run_spin(self, bet_mode_name: str = "base") -> dict:
        """Simulate one base-game round and return its book + summary."""
        self.es = EventStream()
        self.board = Board(self.config.reels["BR0"], self.config.num_rows, self.rng)
        self.board.draw()
        self.es.reveal(self.board.snapshot(), "basegame")

        win, _, scatters, scatter_positions = self._play_cascades(
            ladder=self.config.base_mult_ladder,
            gametype="basegame",
            wild_active=False,
            sticky_wilds={},
            persist=False,
            mult_start=0,
        )

        total = win
        total += self._maybe_scatter_pay(scatters)

        if scatters >= self.config.scatter_trigger:
            spins = self.config.freespins_award[min(scatters, 5)]
            self.es.freespin_trigger(scatters, [list(p) for p in scatter_positions], spins)
            total += self.run_freespin(start_level=1, start_bricks=0, spins=spins)

        return self._finalise(total)

    # ====================================================================
    # Feature buy (GDD section 6) -- enter the bonus directly
    # ====================================================================
    def run_feature_buy(self, conditions: dict) -> dict:
        """Bonus-buy round: jump straight into the free spins.

        ``conditions`` come from the bet-mode's distribution, e.g. Option A
        ``{start_level: 1}`` or Option B (VIP) ``{start_level: 2, start_bricks: 5,
        extra_spins: 4}``.
        """
        self.es = EventStream()
        self.board = Board(self.config.reels["FR0"], self.config.num_rows, self.rng)

        level = conditions.get("start_level", 1)
        bricks = conditions.get("start_bricks", 0)
        base_spins = self.config.freespins_award[3]
        spins = base_spins + conditions.get("extra_spins", 0)

        total = self.run_freespin(start_level=level, start_bricks=bricks, spins=spins)
        return self._finalise(total)

    # ====================================================================
    # Free spins -- House Upgrade (GDD section 5)
    # ====================================================================
    def run_freespin(self, *, start_level: int, start_bricks: int, spins: int) -> float:
        """Run the bonus round; return its total win (x total bet)."""
        es = self.es
        self.board = Board(self.config.reels["FR0"], self.config.num_rows, self.rng)

        bricks = start_bricks
        level = start_level
        sticky_wilds: dict[tuple[int, int], int] = {}
        persist_index = 0
        spins_total = spins
        spins_remaining = spins
        spins_done = 0
        total = 0.0

        es.enter_freegame(spins_total, self._house_name(level), bricks)

        def bank_brick(pos):
            """Collect one brick: bank it, animate it, apply any house upgrade."""
            nonlocal bricks, level, spins_remaining, spins_total
            bricks += 1
            es.collect_brick(bricks, [pos[0], pos[1]])
            new_level, extra, name = self._maybe_upgrade(level, bricks)
            if new_level > level:
                level = new_level
                spins_remaining += extra
                spins_total += extra
                es.house_upgrade(level, name, bricks, extra)

        while spins_remaining > 0 and total < self.config.wincap:
            spins_done += 1
            spins_remaining -= 1

            self.board.draw()

            # Feature powers are fixed at the *start* of the spin: a house that
            # upgrades on this spin's bricks takes effect from the next spin, so
            # the player never sees the rules change mid-spin.
            wild_active = level >= 2
            sticky_active = level >= 3
            ladder = self.config.free_mult_ladder
            mult_start = persist_index if sticky_active else 0

            # Re-stamp persistent sticky wilds from earlier spins so they are on
            # the board the player is shown.
            if sticky_active:
                for (r, row), _m in sticky_wilds.items():
                    self.board.grid[r][row] = self.wild

            es.update_freespin(spins_done, spins_total)
            es.reveal(self.board.snapshot(), "freegame")
            # Show the carried wolf multiplier at spin start: it persists across
            # spins at Level 3 (Brick Fortress) and resets to x1 at Levels 1-2.
            es.update_global_mult(ladder[min(mult_start, len(ladder) - 1)])

            # Collect every brick on the revealed board, then every newly dropped
            # brick after cascades. The frontend animates both paths, so the math
            # state must count both as well or house levels desync from the UI.
            for pos in self.board.positions_of("BR"):
                bank_brick(pos)

            spin_win, end_index, scatters, scatter_positions = self._play_cascades(
                ladder=ladder,
                gametype="freegame",
                wild_active=wild_active,
                sticky_wilds=sticky_wilds if sticky_active else {},
                persist=sticky_active,
                mult_start=mult_start,
                collect_drop_brick=bank_brick,
            )
            if sticky_active:
                persist_index = end_index

            spin_win += self._maybe_scatter_pay(scatters)
            if scatters >= self.config.scatter_trigger:
                spins_remaining += self.config.freespins_retrigger
                spins_total += self.config.freespins_retrigger
                es.freespin_trigger(scatters, [list(p) for p in scatter_positions], self.config.freespins_retrigger)

            total = min(total + spin_win, self.config.wincap)

        es.exit_freegame(total)
        return total

    # ====================================================================
    # Shared cascade engine ("Huff & Puff")
    # ====================================================================
    def _play_cascades(
        self,
        *,
        ladder: list[int],
        gametype: str,
        wild_active: bool,
        sticky_wilds: dict[tuple[int, int], int],
        persist: bool,
        mult_start: int,
        collect_drop_brick=None,
    ) -> tuple[float, int]:
        """Run cascades until no win; return (spin_win, final_mult_index)."""
        es, board, cfg = self.es, self.board, self.config
        spin_win = 0.0
        mult_index = mult_start

        while True:
            wild_mult_map = self._assign_wild_mults(board, wild_active, sticky_wilds)
            if wild_active and wild_mult_map:
                es.wild_land([{"position": [r, row], "multiplier": m} for (r, row), m in wild_mult_map.items()])

            wins = evaluate_ways(board, cfg.paytable, self.paying, self.wild)
            if not wins:
                break

            mult = ladder[min(mult_index, len(ladder) - 1)]
            es.update_global_mult(mult)

            # Lock current wilds as sticky for the Brick Fortress (Level 3): they
            # are re-stamped at the start of every remaining spin (see
            # run_freespin), so they persist for the rest of the bonus. Within a
            # single spin they still tumble normally, which keeps cascades finite.
            if persist:
                for (r, row), m in wild_mult_map.items():
                    if (r, row) in sticky_wilds or len(sticky_wilds) < self.config.max_sticky_wilds:
                        sticky_wilds[(r, row)] = m

            step, win_dicts, removal = compute_step(board, wins, self.sym, wild_mult_map, mult)
            spin_win += step
            es.win_info(win_dicts, step, mult)

            es.tumble(sorted([list(p) for p in removal]), gametype)
            before_collapse = board.snapshot()
            board.collapse(removal)
            es.drop_board(board.snapshot(), gametype)
            if gametype == "freegame" and collect_drop_brick:
                for pos in self._new_drop_bricks(before_collapse, removal):
                    collect_drop_brick(pos)
            mult_index += 1

            if spin_win >= cfg.wincap:
                break

        es.set_win(spin_win, ladder[min(mult_index, len(ladder) - 1)])
        # Scatters are read from the *settled* board: soup-pots never tumble off
        # (only paying tiles do), so any that drop in mid-cascade accumulate and
        # are counted here. This is what lets a 2-scatter board trigger the bonus
        # when the 3rd pot falls in on a tumble (not only on the first drop).
        scatter_positions = self.board.positions_of(self.scatter)
        return spin_win, mult_index, len(scatter_positions), scatter_positions

    # ====================================================================
    # Helpers
    # ====================================================================
    def _assign_wild_mults(self, board, wild_active, sticky_wilds):
        """Multiplier for every wild on the board (1x when the feature is off)."""
        result: dict[tuple[int, int], int] = {}
        for (r, row) in board.positions_of(self.wild):
            if (r, row) in sticky_wilds:
                result[(r, row)] = sticky_wilds[(r, row)]
            elif wild_active:
                idx = self.rng.weighted_index(self.config.wild_mult_weights)
                result[(r, row)] = self.config.wild_mult_values[idx]
            else:
                result[(r, row)] = 1
        return result

    def _maybe_scatter_pay(self, scatters: int) -> float:
        if scatters < 3:
            return 0.0
        amount = self.config.scatter_pays[min(scatters, 5)]
        self.es.scatter_pay(scatters, amount)
        return amount

    def _new_drop_bricks(self, before: list[list[str]], removal: set[tuple[int, int]]) -> list[tuple[int, int]]:
        """Return BR positions introduced by the last collapse, excluding survivors."""
        out: list[tuple[int, int]] = []
        for r in range(self.board.num_reels):
            removed_rows = {row for col, row in removal if col == r}
            if not removed_rows:
                continue
            missing = len(removed_rows)
            for row in range(missing):
                if self.board.grid[r][row] == "BR":
                    out.append((r, row))
        return out

    def _maybe_upgrade(self, level: int, bricks: int):
        """Return (new_level, extra_spins, house_name) if bricks unlock the next."""
        for spec in self.config.house_levels:
            if spec["level"] == level + 1 and bricks >= spec["bricks"]:
                return spec["level"], spec.get("extra_spins", 0), spec["name"]
        return level, 0, self._house_name(level)

    def _house_name(self, level: int) -> str:
        for spec in self.config.house_levels:
            if spec["level"] == level:
                return spec["name"]
        return "Stroh-Haus"

    def _finalise(self, total: float) -> dict:
        capped = total >= self.config.wincap
        total = min(total, self.config.wincap)
        self.es.set_total_win(total)
        self.es.final_win(total, capped)
        return {
            "payout": round(total, 4),
            "wincap": capped,
            "events": self.es.events,
        }
