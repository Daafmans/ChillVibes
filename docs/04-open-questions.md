# Open questions and assumptions

Decisions made while building the vertical slice (`game/`). Everything here is cheap to change; numbers live in `game/config.js`.

## Decided by the designer
- Browser game, plain JS, coloured squares and icons. Start with a settlement on the start tile.
- Project threshold and settlement cost both grow multiplicatively.
- Blight passes through any tile. Pustules spread one tile at a time, so no two sources compete for a tile.
- Ancient sites offer two options: one random location benefit, and always a bundle of one resource.
- Win targets are 20 settlements / 20 sites. The glimpsed state is always shown.

## Assumptions I made (please confirm or correct)
1. **Exploration is free and fixed.** Exploring reveals the 3×3 patch plus one extra tile per Survey Post upgrade (`surveyPostTiles`). Extras are hidden tiles touching the revealed area, nearest the picked tile first, ties broken by a seeded hash. Wealth is spent on settlement upgrades, not exploration.
2. **One exploration per turn.** Founding settlements, projects and sites are unlimited per turn.
3. **Projects spend Materials.** Taking one pays the current threshold, then the threshold grows ×1.4 (start 60). Every unlocked project in the tree is offered; children unlock when their parent is taken.
4. **Settlement cost** = `ceil(40 * 1.45^(owned settlements - 1))` Food. Losing a settlement makes the next one cheaper.
5. **Ancient site offer** = 1 of the 4 location benefits (explore / two features / free settlement / cleanse) plus a bundle of one random resource. It is fixed per site, so it can't be rerolled. **Bountiful Sites** (repeatable) adds one more location benefit per copy (`bountyOptions`), so three copies offer all of them; after that it is no longer offered. The bundle is `24 + rand * 24` of that resource (scaled by Legacy).
6. **Features:** Tile bonus = +2 of one resource on that tile, or +1 Food, Materials and Wealth on that tile for the all-resource features. The named features and the base tiles they can sit on are listed in `05-special-tiles.md`.
7. **Legacy of Distance** multiplies site benefits (bundle size and bonus features) by `1 + 0.05 * stacks * distance`.
8. **Vision projects:** the first copy sees 1 tile into the fog and each extra copy adds 1 (capped at 15).
9. **Exploring a hidden ocean tile** is refused with "Cannot explore ocean". This leaks one bit of information, but it costs nothing.
10. **Win/loss is checked on End turn**, as the core loop describes. Winning mid-turn doesn't end the game until you end the turn. Exception: awakening the gods at the Ancient Temple wins immediately.
11. **Pustules spawn** on a random undiscovered tile (hidden, within 15 tiles of known land), with no distance limit from settlements.
12. **Starting yields are lopsided** because they follow the terrain (a mountain start gives lots of Materials and little Wealth). This matches the design but may feel unfair.

## Still open
- **Glorious Capital and Trade Empire** make the economy grow roughly quadratically. Wealth accumulates until spent on upgrades, and only one upgrade per settlement exists, so it may pile up.
- **Site density** is 0.8% of land tiles. "Find 20 sites" looks like the hard win; "20 settlements" looks the easiest.
