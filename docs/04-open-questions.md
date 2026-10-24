# Open questions and assumptions

Decisions made while building the vertical slice (`game/`). Everything here is cheap to change; numbers live in `game/config.js`.

## Decided by the designer
- Browser game, plain JS, coloured squares and icons. Start with a city on the start tile.
- Project threshold and city cost both grow multiplicatively. Relics are never spent and come from special terrain features.
- Blight passes through any tile. Pustules spread one tile at a time, so no two sources compete for a tile.
- Ancient sites offer four options; the fourth is always a resource bundle and one of the first three may need relics.
- Win targets are 20 cities / 20 sites / 20 projects. Pustule Burst is one-time. The glimpsed state is always shown.

## Assumptions I made (please confirm or correct)
1. **Exploration spends all Wealth and widens by it.** Exploring reveals the 3×3 patch plus `floor(wealth / 10)` extra tiles (`exploreWealthPerTile = 10`), then sets Wealth to 0, remainder included. Extras are hidden tiles touching the revealed area, nearest the picked tile first, ties broken by a seeded hash. Exploring with under 10 Wealth is still allowed and just reveals the 3×3.
2. **One exploration per turn.** Founding cities, projects and sites are unlimited per turn.
3. **Projects spend Materials.** Taking one pays the current threshold, then the threshold grows ×1.4 (start 60). Three options are offered; at most one of them requires relics, and at least one is always unlocked.
4. **City cost** = `ceil(40 * 1.45^(owned cities - 1))` Food. Losing a city makes the next one cheaper.
5. **Ancient site offer** = 3 of the 4 location benefits (explore / two features / free city / cleanse) plus the resource bundle. It is fixed per site, so it can't be rerolled. 70% of sites put a relic requirement (1 or 2 relics, random colour) on one of the first three.
6. **Relic count** = relic features on claimed, non-blighted tiles of your cities.
7. **Features:** City bonus = +1 Food, Materials and Wealth for the owning city. Tile bonus = +2 of one resource on that tile. Relics are blue, green or black. The named features and the base tiles they can sit on are listed in `05-special-tiles.md`.
8. **Legacy of Distance** multiplies site benefits (bundle size and bonus features) by `1 + 0.05 * stacks * distance`.
9. **Vision projects:** the first copy sees 5 tiles into the fog and each extra copy adds 2 (capped at 15).
10. **Blight Fight** cleanses ordinary blight on the 3×3 you explore. **Pustule Burst** destroys pustules there. Both need to be taken to fully clear an area.
11. **Wider Borders** adds one to the footprint radius (5×5 minus corners becomes 7×7 minus corners, 45 tiles). The oldest city wins overlaps, and claims are recomputed from scratch each time.
12. **Exploring a hidden ocean tile** is refused with "Cannot explore ocean". This leaks one bit of information, but it costs nothing.
13. **Win/loss is checked on End turn**, as the core loop describes. Winning mid-turn doesn't end the game until you end the turn.
14. **Pustules spawn** on a random unclaimed tile within 20 tiles of a random city, whether or not it is explored.
15. **Starting yields are lopsided** because they follow the terrain (a mountain start gives lots of Materials and little Wealth). This matches the design but may feel unfair.

## Still open
- **Blight pace.** `blightSpread = 3` tiles per pustule per turn is a guess. A lone city dies around turn 90–180. A naive bot that expands and uses cleansing wins around turn 80–110 and loses some cities. It needs human playtesting.
- **Glorious Capital and Trade Empire** make the economy grow roughly quadratically. Wealth no longer piles up, since each exploration empties it.
- **No save/load, undo or sound yet.**
- **Site density** is 0.8% of land tiles. "Find 20 sites" looks like the hard win; "20 cities" looks the easiest.
