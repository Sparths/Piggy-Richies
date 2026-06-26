"""Game configuration for *Stake's Huff & Puff: Piggy Richies*.

Everything that defines the maths lives here as data: the symbol catalogue, the
pay-table, the reel-strip compositions, the feature constants and the bet-modes.
The round logic in :mod:`.gamestate` reads these and never hard-codes a number.

The values below are the *designed* starting point; the single global pay-table
scale ``PAYTABLE_SCALE`` is solved for by ``run.py`` so the simulated RTP lands
on the 96.55 % target from the GDD. Because every multiplier feature (cascade
ladder, wild multipliers, free spins) scales the same base pays linearly, one
scalar is enough to retarget RTP without disturbing the volatility shape.
"""

from __future__ import annotations

import csv
import os
import random

from src.config import BetMode, Config, Distribution
from src.symbols import Symbol, SymbolCatalogue

REELS_DIR = os.path.join(os.path.dirname(__file__), "reels")


class GameConfig(Config):
    # Solved by `run.py calibrate` against the **capped** mean so the real
    # (15,000x-capped) RTP lands on 96.55 % -- the bonus has a heavy tail beyond
    # the cap, so calibrating uncapped would set RTP a few points low. The
    # lookup-table tilt in build() then pins the published RTP exactly.
    # (2.5 M-spin calibration; see library/config/optimisation.json.)
    PAYTABLE_SCALE = 0.21952

    def __init__(self) -> None:
        super().__init__()
        self.game_id = "piggy_richies"
        self.game_name = "Stake's Huff & Puff: Piggy Richies"
        self.provider = "Stake Engine (concept build)"

        # -- Technical frame (GDD section 2) -------------------------------
        self.num_reels = 5
        self.num_rows = 4
        self.rtp = 0.9655
        self.wincap = 15000.0  # max win = 15,000x total bet
        # num_ways == 4**5 == 1024 (provided by Config)

        # -- Symbol catalogue (GDD section 3) ------------------------------
        self.symbols = SymbolCatalogue(
            [
                Symbol("W", "Der Große Böse Wolf", "wild", is_wild=True, emoji="🐺"),
                Symbol("S", "Kochender Suppentopf", "scatter", is_scatter=True, emoji="🍲"),
                Symbol("P1", "Ziegel-Schweinchen", "premium", emoji="🐷"),
                Symbol("P2", "Holz-Schweinchen", "premium", emoji="🐽"),
                Symbol("P3", "Stroh-Schweinchen", "premium", emoji="🐖"),
                Symbol("M1", "Axt", "mid", emoji="🪓"),
                Symbol("M2", "Kelle", "mid", emoji="🥄"),
                Symbol("M3", "Gabel", "mid", emoji="🔱"),
                Symbol("A", "Ass", "low", emoji="A"),
                Symbol("K", "König", "low", emoji="K"),
                Symbol("Q", "Dame", "low", emoji="Q"),
                Symbol("J", "Bube", "low", emoji="J"),
                Symbol("BR", "Ziegelstein", "collect", is_collectible=True, emoji="🧱"),
            ]
        )

        # -- Pay-table (per-way multiplier of total bet, pre-scale) --------
        raw_paytable = {
            "P1": {3: 0.50, 4: 2.00, 5: 8.00},
            "P2": {3: 0.40, 4: 1.50, 5: 6.00},
            "P3": {3: 0.30, 4: 1.20, 5: 5.00},
            "M1": {3: 0.20, 4: 0.60, 5: 2.50},
            "M2": {3: 0.16, 4: 0.50, 5: 2.00},
            "M3": {3: 0.12, 4: 0.40, 5: 1.60},
            "A": {3: 0.10, 4: 0.25, 5: 1.00},
            "K": {3: 0.08, 4: 0.20, 5: 0.80},
            "Q": {3: 0.06, 4: 0.16, 5: 0.60},
            "J": {3: 0.05, 4: 0.12, 5: 0.50},
        }
        self.paytable = {
            sym: {n: round(v * self.PAYTABLE_SCALE, 6) for n, v in tiers.items()}
            for sym, tiers in raw_paytable.items()
        }
        # Scatter pays on total bet, independent of ways (GDD section 3).
        self.scatter_pays = {n: round(v * self.PAYTABLE_SCALE, 6) for n, v in {3: 2.0, 4: 5.0, 5: 20.0}.items()}

        # -- Reel-strip compositions --------------------------------------
        # symbol -> count, per reel. Premiums rare on early reels; the wolf
        # (wild) sits on the middle reels in the base game and spreads across
        # all reels in the feature. One soup-pot (S) per reel: because pots now
        # accumulate across tumbles (gamestate counts the settled board), this
        # already lands the bonus ~1 in 110-130 -- denser scatters made it far
        # too loose. Brick tokens (BR) are seeded on *every* free reel (one each)
        # so the House-Upgrade collectible can land anywhere on the grid.
        base_comp = [
            {"P1": 2, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 5, "A": 6, "K": 6, "Q": 7, "J": 7, "S": 1},
            {"P1": 2, "P2": 2, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 6, "K": 6, "Q": 6, "J": 6, "W": 2, "S": 1},
            {"P1": 2, "P2": 2, "P3": 2, "M1": 4, "M2": 4, "M3": 4, "A": 6, "K": 6, "Q": 6, "J": 6, "W": 3, "S": 1},
            {"P1": 2, "P2": 2, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 6, "K": 6, "Q": 6, "J": 6, "W": 2, "S": 1},
            {"P1": 2, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 5, "A": 6, "K": 6, "Q": 7, "J": 7, "S": 1},
        ]
        free_comp = [
            {"P1": 3, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 5, "K": 5, "Q": 5, "J": 5, "W": 1, "S": 1, "BR": 1},
            {"P1": 3, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 5, "K": 5, "Q": 5, "J": 5, "W": 3, "S": 1, "BR": 1},
            {"P1": 3, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 4, "K": 4, "Q": 5, "J": 5, "W": 4, "S": 1, "BR": 1},
            {"P1": 3, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 5, "K": 5, "Q": 5, "J": 5, "W": 3, "S": 1, "BR": 1},
            # Bricks (BR) collect toward the House Upgrade. One brick token per
            # reel keeps the average ~0.44 bricks/spin (Wood at 5 reached often,
            # the Brick Fortress at 10 a rare marquee) -- identical pacing to the
            # old reel-5-only "build reel", now visible anywhere on the board.
            {"P1": 3, "P2": 3, "P3": 3, "M1": 4, "M2": 4, "M3": 4, "A": 5, "K": 5, "Q": 5, "J": 5, "W": 1, "S": 1, "BR": 1},
        ]
        self.reels = {
            "BR0": self._build_strips(base_comp, seed=101),
            "FR0": self._build_strips(free_comp, seed=202),
        }

        # -- Feature constants (GDD sections 4 & 5) ------------------------
        # Progressive wolf multiplier ladders (indexed by cascade number).
        self.base_mult_ladder = [1, 2, 3, 5]            # base game: up to 5x
        self.free_mult_ladder = [1, 2, 3, 5, 8]         # free spins: up to 8x

        self.min_match = 3
        self.scatter_trigger = 3                         # 3+ pots start the bonus

        # Free spins awarded by scatter count, and retrigger amount.
        self.freespins_award = {3: 10, 4: 12, 5: 15}
        self.freespins_retrigger = 5

        # House Upgrade: brick thresholds and the extra spins each level grants.
        self.house_levels = [
            {"level": 1, "name": "Stroh-Haus", "bricks": 0},
            {"level": 2, "name": "Holz-Haus", "bricks": 5, "extra_spins": 2},
            {"level": 3, "name": "Ziegel-Festung", "bricks": 10, "extra_spins": 3},
        ]
        # Wild multipliers awarded from Level 2 onward (random per wild).
        self.wild_mult_values = [2, 3]
        self.wild_mult_weights = [0.65, 0.35]
        # Brick Fortress sticky wilds are capped so the persistent-multiplier
        # feature stays thrilling but cannot snowball the board into a guaranteed
        # max-win every time (keeps 15,000x a genuine rare ceiling).
        self.max_sticky_wilds = 2

        # -- Bet modes (GDD section 6: feature buy) ------------------------
        # Costs are solved by run.py so each buy returns the target RTP.
        self.bet_modes = [
            BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=self.wincap,
                distributions=[
                    Distribution("wincap", quota=0.001, conditions={"force_wincap": True}),
                    Distribution("freegame", quota=0.10, conditions={"force_trigger": True}),
                    Distribution("basegame", quota=0.889, conditions={}),
                ],
            ),
            BetMode(
                name="bonus",  # Feature Buy -- Option A: start in the Straw house
                cost=70.0,  # placeholder; run.py solves the fair cost from buy EV
                rtp=self.rtp,
                max_win=self.wincap,
                feature_buy=True,
                distributions=[Distribution("freegame", quota=1.0, conditions={"start_level": 1})],
            ),
            BetMode(
                name="bonus_vip",  # Feature Buy -- Option B (VIP): start in the Wood house
                cost=220.0,  # placeholder; run.py solves the fair cost from buy EV
                rtp=self.rtp,
                max_win=self.wincap,
                feature_buy=True,
                distributions=[
                    Distribution(
                        "freegame",
                        quota=1.0,
                        conditions={"start_level": 2, "start_bricks": 2, "extra_spins": 2},
                    )
                ],
            ),
        ]

    # -- reel building -----------------------------------------------------
    @staticmethod
    def _build_strips(compositions: list[dict[str, int]], seed: int) -> list[list[str]]:
        """Expand per-reel ``{symbol: count}`` dicts into shuffled strips."""
        rng = random.Random(seed)
        strips: list[list[str]] = []
        for comp in compositions:
            strip: list[str] = []
            for sym, count in comp.items():
                strip.extend([sym] * count)
            rng.shuffle(strip)
            strips.append(strip)
        return strips

    def write_reels_csv(self) -> None:
        """Persist the strips as CSV (one column per reel), as Stake games do."""
        os.makedirs(REELS_DIR, exist_ok=True)
        for name, strips in self.reels.items():
            path = os.path.join(REELS_DIR, f"{name}.csv")
            height = max(len(s) for s in strips)
            with open(path, "w", newline="") as fh:
                writer = csv.writer(fh)
                writer.writerow([f"reel{i + 1}" for i in range(len(strips))])
                for row in range(height):
                    writer.writerow([strips[r][row] if row < len(strips[r]) else "" for r in range(len(strips))])
