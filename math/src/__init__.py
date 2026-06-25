"""Core math engine for Stake-Engine-style slot games.

This package is a self-contained, pure-Python re-implementation of the
concepts used by the official Stake Engine ``math-sdk`` (``StakeEngine/math-sdk``):

* :mod:`src.config`      -- ``Config`` / ``BetMode`` / ``Distribution`` (cf. ``src/config``)
* :mod:`src.symbols`     -- symbol catalogue and pay-table helpers
* :mod:`src.board`       -- reel-strip drawing and the visible board (cf. ``src/state``)
* :mod:`src.ways`        -- 1024 "ways-to-win" evaluation (cf. ``src/wins``)
* :mod:`src.events`      -- front-end event constructors (cf. ``src/events``)
* :mod:`src.rng`         -- provably-fair + fast RNG back-ends

A concrete game (see ``games/piggy_richies``) supplies a ``GameConfig`` and a
``GameState`` whose ``run_spin`` / ``run_freespin`` entry points emit a *book*
(an ordered list of events) per simulated round -- exactly the contract the
Stake Web SDK consumes on the front-end.
"""

__all__ = ["config", "symbols", "board", "ways", "events", "rng"]
