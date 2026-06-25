"""Random-number back-ends.

Two interchangeable implementations share one tiny interface so the game logic
never cares which one it is talking to:

``FastRNG``
    Wraps :class:`random.Random`. Used for the large Monte-Carlo runs that
    measure RTP/volatility -- millions of draws, speed matters.

``ProvablyFairRNG``
    Mirrors Stake's *provably fair* scheme: a keyed HMAC-SHA256 stream derived
    from ``(server_seed, client_seed, nonce)``. Every byte is reproducible and
    independently verifiable, so a published round can be audited. Used when we
    emit the deliverable *books* so each one carries a real, checkable seed.

Both expose: ``random()``, ``randint(a, b)``, ``choice(seq)`` and
``weighted_index(weights)``.
"""

from __future__ import annotations

import hashlib
import hmac
import random
from typing import Sequence


class FastRNG:
    """Fast, seedable RNG for bulk simulation."""

    def __init__(self, seed: int | None = None) -> None:
        self._r = random.Random(seed)
        self.seed = seed

    def random(self) -> float:
        return self._r.random()

    def randint(self, a: int, b: int) -> int:
        return self._r.randint(a, b)

    def choice(self, seq: Sequence):
        return seq[int(self._r.random() * len(seq))]

    def weighted_index(self, weights: Sequence[float]) -> int:
        """Return an index in ``range(len(weights))`` chosen ~ ``weights``."""
        total = 0.0
        for w in weights:
            total += w
        r = self._r.random() * total
        upto = 0.0
        for i, w in enumerate(weights):
            upto += w
            if r < upto:
                return i
        return len(weights) - 1


class ProvablyFairRNG:
    """HMAC-SHA256 keyed stream RNG (Stake-style provably fair).

    Floats are produced 4 bytes at a time exactly like Stake's published
    verification scheme: ``HMAC_SHA256(server_seed, f"{client_seed}:{nonce}:{cursor}")``
    yields 32 bytes -> eight uint32 -> eight floats in ``[0, 1)``.
    """

    def __init__(self, server_seed: str, client_seed: str = "piggy-richies", nonce: int = 0) -> None:
        self.server_seed = server_seed
        self.client_seed = client_seed
        self.nonce = nonce
        self.seed = server_seed
        self._buffer: list[float] = []
        self._cursor = 0

    @property
    def server_seed_hash(self) -> str:
        """SHA-256 of the server seed -- the value a casino commits to up front."""
        return hashlib.sha256(self.server_seed.encode()).hexdigest()

    def _refill(self) -> None:
        msg = f"{self.client_seed}:{self.nonce}:{self._cursor}".encode()
        digest = hmac.new(self.server_seed.encode(), msg, hashlib.sha256).digest()
        self._cursor += 1
        for i in range(0, 32, 4):
            value = int.from_bytes(digest[i : i + 4], "big")
            self._buffer.append(value / 0x100000000)

    def random(self) -> float:
        if not self._buffer:
            self._refill()
        return self._buffer.pop(0)

    def randint(self, a: int, b: int) -> int:
        return a + int(self.random() * (b - a + 1))

    def choice(self, seq: Sequence):
        return seq[int(self.random() * len(seq))]

    def weighted_index(self, weights: Sequence[float]) -> int:
        total = sum(weights)
        r = self.random() * total
        upto = 0.0
        for i, w in enumerate(weights):
            upto += w
            if r < upto:
                return i
        return len(weights) - 1
