# Core Loop

## Interface
- **One screen:** the world map (a square grid) and **one contextual panel**.
- One half of the panel shows information about **whatever the view centres on**: a tile, a settlement, an ancient site, and so on.
- The other half of the panel shows the projects the player has obtained.
- The map pans with the **mouse** or the **cursor keys**.
- Because the panel follows the view centre, no click-to-select state is needed. This also keeps the UI small.
- If there are unused ancient sites outside of the current view, an arrow at the edge of the screen points in its direction.

## The loop
```
   ┌───────────────── EXPLORE ─────────────────┐
   │ pick one uncovered tile next to known land│
   │ reveal it and its 8 neighbours            │
   │ +1 tile per Survey Post upgrade           │
   ▼                                           │
 new tiles, features, ancient sites            │
   │                                           │
   ▼                                           │
 EXPAND ── spend Food, found a settlement instantly ─┘
   │       claims a 5x5 area (minus corners)
   ▼
 each turn: settlements produce Food / Materials / Wealth
   │
   ├─► Materials buy PROJECTS (rule changes: see 03-systems.md)
   └─► Wealth UPGRADES settlements (once each)

 Pressure: BLIGHT spreads from turn 10 on and eats settlements.
```

## A turn
1. **Income.** Every settlement produces resources from all its claimed tiles into global stocks.
2. **Player actions.** Within resource limits, any of:
   - **Gain a project** when materials limit is reached.
   - **Explore** one tile (the main action; see below).
   - **Found** a settlement on an unclaimed, non-blighted, non-water tile you know.
   - **Upgrade** a settlement you have not upgraded yet, for Wealth.
   - Activate unused ancient sites.
1. **End turn.**
	1. Win conditions checked.
	2. Blight advances.
	3. Loss conditions checked.

## Exploration in detail
- Start: the **whole map is hidden except one square** (the start tile).
- You choose a **revealed tile that still has hidden neighbours** (see the project that lifts this limit) and **explore from it**: all of its hidden neighbours (8 directions: horizontal, vertical, diagonal) become known.
- **Cost:** none. Exploring does not touch your resources.
- **Bonus tiles:** each settlement with the **Survey Post** upgrade adds **one extra tile** next to the 3×3 patch. Extras are taken closest to the picked tile first, ties broken by the map seed, so results are repeatable. Extras may be anything, ocean included.
- **Ocean:** initially cannot be explored. A project lifts this.
- The tile you *pick* must be a legal target, and the neighbours revealed may be anything.

## The two questions

### Where to explore next?
- Every pick reveals a 3×3 patch plus one extra tile per Survey Post, so your choice is *which direction* and *how deep*.
- Wealth is spent on upgrades such as the Survey Post, so it competes with other uses of tiles. Plains, forests, mountains and ocean all give the same total yield but in different mixes (see `03-systems.md`), so a forest-heavy empire is rich in Materials but poor in Wealth.
- Projects add **vision into the fog** (up to 15 tiles) of basic types, special features, ancient sites and blight. Each one lets you plan your exploration instead of picking blind.

### Where to expand next?
- A settlement costs **Food**, is **instant**, and claims a **5×5 area minus corners (21 tiles)**.
- Claimed tiles can't be claimed again, so **settlement placement shapes the whole map**. Overlap is impossible, so you must choose between tight packing and wide coverage.
- Settlements need land, not water (until a project lifts this), not on claimed tiles, and not on pustules or blight.
- A settlement is worth its tiles: the yield mix, special features, and how exposed it is to blight.

## Why they pull against each other
- **Wealth** upgrades settlements (and so widens exploring). **Food** pays for settlements. Both come from the same tiles, and settlements need to be *somewhere explored*.
- Wealth tiles pay for upgrades, but they take tiles away from Food and Materials. Expanding is limited by Food, not by what you have seen.
- Blight pushes you to both: explore to find ancient sites that can clear it, expand to keep settlements alive.

## Tension curve
| Turns | Feel |
|---|---|
| 1-9 | Calm. Learn the map, found first settlements, begin on projects. |
| 10+ | The first pustule appears. Clock starts. |
| 20, 30, ... | A new pustule every 10 turns while the old ones keep spreading. |
| End | Win by reaching a goal, or lose when every settlement is blighted. |
