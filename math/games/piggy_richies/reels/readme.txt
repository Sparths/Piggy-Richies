Reel strips for Stake's Huff & Puff: Piggy Richies
==================================================

One CSV per strip set; one column per reel (reel1..reel5), one symbol per row.
A spin picks a random stop on each reel and reads the next 4 symbols (with
wrap-around) as that reel's visible column.

  BR0.csv   Base-game reels. Wilds (W) sit on the middle reels; one soup-pot
            scatter (S) per reel; premiums (P1/P2/P3) are rare on the early reels.

  FR0.csv   Free-game reels. Higher premium + wild density. Reel 5 is the "build"
            reel and carries the brick tokens (BR) collected to level up the
            houses (5 -> Wood, 10 -> Brick Fortress).

These files are generated from the compositions in game_config.py:
    cd math && python games/piggy_richies/run.py build
Edit the compositions there (not the CSVs) and rebuild to change the maths.

Symbols: W wolf(wild)  S soup-pot(scatter)  P1 brick-pig  P2 wood-pig
         P3 straw-pig  M1 axe  M2 trowel  M3 fork  A K Q J cards  BR brick-token
