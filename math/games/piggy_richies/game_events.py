"""Game-specific event surface.

Like the Stake sample games (``from src.events.events import *``) this simply
re-exports the engine's :class:`EventStream` so the round logic has one import,
and documents the event vocabulary Piggy Richies emits into each book:

    reveal            initial board for a spin (basegame | freegame)
    updateGlobalMult  progressive wolf multiplier moved to a new rung
    winInfo           ways-wins for one cascade step (symbol, ways, win, positions)
    tumbleBoard       the wolf blows the winning tiles off (Huff & Puff)
    setWin            running win for the current spin
    setTotalWin       running win for the whole round
    wildLand          wilds on the board and their multipliers (Level 2+)
    scatterPay        soup-pot scatter pay (3+)
    freeSpinTrigger   bonus entry / retrigger, with spins awarded
    enterFreeGame     start of the House Upgrade bonus
    updateFreeSpin    current / total free spins
    collectBrick      a brick token banked on reel 5
    houseUpgrade      Stroh -> Holz -> Ziegel-Festung level up
    exitFreeGame      end of the bonus, with its total win
    finalWin          round result (and whether the 15,000x cap was hit)
"""

from src.events import EventStream

__all__ = ["EventStream"]
