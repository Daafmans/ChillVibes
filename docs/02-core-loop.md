# Core Loop

## Interface
- **One screen:** the world map (a square grid) and **one contextual panel**.
- One half of the panel shows information about **whatever the view centres on**: a tile, a city, an ancient site, and so on.
- The other half of the panel shows the projects the player has obtained.
- The map pans with the **mouse** or the **cursor keys**.
- Because the panel follows the view centre, no click-to-select state is needed. This also keeps the UI small.
- If there are unused ancient sites outside of the current view, an arrow at the edge of the screen points in its direction.

## The loop
```
   ┌───────────────── EXPLORE ─────────────────┐
   │ pick one uncovered tile next to known land│
   │ reveal it and its 8 neighbours            │
   │ pay Wealth (cost rises with distance)     │
   ▼                                           │
 new tiles, features, ancient sites            │
   │                                           │
   ▼                                           │
 EXPAND ── spend Food, found a city instantly ─┘
   │       claims a 5x5 area (minus corners)
   ▼
 each turn: cities produce Food / Materials / Wealth
   │
   ├─► Materials buy PROJECTS (rule changes: see 03-systems.md)
   └─► Wealth buys more EXPLORATION

 Pressure: BLIGHT spreads from turn 30 on and eats cities.
```

## A turn
1. **Income.** Every city produces resources from all its claimed tiles into global stocks.
2. **Player actions.** Within resource limits, any of:
   - **Gain a project** when materials limit is reached.
   - **Explore** one tile (the main action; see below).
   - **Found** a city on an unclaimed, non-blighted, non-water tile you know.
   - Activate unused ancient sites.
1. **End turn.**
	1. Win conditions checked.
	2. Blight advances.
	3. Loss conditions checked.

**[ASSUMPTION]** The brief says "every turn, choose an uncovered square to explore". I read this as *one exploration per turn*, so each turn has one big decision. Cities, projects and one-time effects don't count against it.

## Exploration in detail
- Start: the **whole map is hidden except one square** (the start tile).
- You choose an **uncovered tile** (hidden but adjacent to known land; see the project that lifts this limit) and **explore around it**: it and all 8 neighbours (horizontal, vertical, diagonal) become known.
- **Cost:** free at the start and rising **with distance from the starting city**, paid in Wealth.
- **Ocean:** initially cannot be explored. A project lifts this.
- The tile you *pick* must be a legal target, and the neighbours revealed may be anything.

## The two questions

### Where to explore next?
- Every pick reveals a 3×3 patch, so your choice is *which direction* and *how deep*.
- Cost climbs with distance, so far exploration needs Wealth, which means cities with good Wealth tiles.
- Wealth competes with other uses of tiles. Plains, forests and mountains all give the same total yield but in different mixes (see `03-systems.md`), so a mountain-heavy empire is rich in Materials but poor in Wealth.
- Projects add **vision into the fog** (up to 5 tiles) of basic types, special features, ancient sites and blight. Each one lets you plan your exploration instead of picking blind.

### Where to expand next?
- A city costs **Food**, is **instant**, and claims a **5×5 area minus corners (21 tiles)**.
- Claimed tiles can't be claimed again, so **city placement shapes the whole map**. Overlap is impossible, so you must choose between tight packing and wide coverage.
- Cities need land, not water (until a project lifts this), not on claimed tiles, and not on pustules or blight.
- A city is worth its tiles: the yield mix, special features, and how exposed it is to blight.

## Why they pull against each other
- **Wealth** pays for exploring. **Food** pays for cities. Both come from the same tiles, and cities need to be *somewhere explored*.
- Exploring far finds ancient sites and good land but costs more Wealth. Expanding near is cheap but gives less.
- Blight pushes you to both: explore to find ancient sites that can clear it, expand to keep cities alive.

## Tension curve
| Turns | Feel |
|---|---|
| 1-29 | Calm. Learn the map, found first cities, begin on projects. |
| 30+ | The first pustule appears. Clock starts. |
| 40, 50, ... | A new pustule every 10 turns while the old ones keep spreading. |
| End | Win by reaching a goal, or lose when every city is blighted. |
