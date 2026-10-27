# Special tile features

A special feature sits on top of a tile's **basic type** (see `03-systems.md`, section 3). Every feature gives **one** of two kinds of bonus:

- **Tile bonus:** extra production for that tile alone. Written as `Tile +…`.
- **Relic:** counts toward project relic requirements, in the colour shown. Written as `Relic (colour)`.

Rules that apply to all of them:
- A feature is **disabled** while its tile is blighted (no bonus, no relic count).
- A tile carries **at most one** feature.
- A feature can only appear on one of the base tiles listed for it.
- Bonuses are per owning settlement, so they are only earned once a settlement has claimed the tile.

Numbers are **[TUNE]** placeholders. They match the defaults in `04-open-questions.md` (tile bonus = +2 of one resource, or +1 of each resource for the all-resource features).

| Base tile                 | Name            | Bonuses                               |
| ------------------------- | --------------- | ------------------------------------- |
| Plains                    | Fertile Valley  | Tile +2 food                          |
| Plains, Desert            | Crossroads      | Tile +2 wealth                        |
| Forest                    | Old Growth      | Tile +2 materials                     |
| Mountains                 | Rich Vein       | Tile +2 materials                     |
| Mountains                 | Gold Seam       | Tile +2 wealth                        |
| Desert                    | Oasis           | Tile +2 food                          |
| Ocean                     | Fishing Banks   | Tile +2 food                          |
| Ocean                     | Pearl Beds      | Tile +2 wealth                        |
| Plains, Forest            | Sacred Grove    | Tile +1 food, +1 materials, +1 wealth |
| Mountains, Forest         | Hot Springs     | Tile +1 food, +1 materials, +1 wealth |
| Plains, Desert, Mountains | Natural Harbour | Tile +1 food, +1 materials, +1 wealth |
| Ocean, Plains             | Tidal Shrine    | Relic (blue)                          |
| Ocean, Forest             | Sunken Idol     | Relic (blue)                          |
| Forest, Plains            | Standing Stones | Relic (green)                         |
| Plains, Mountains         | Founders' Cairn | Relic (green)                         |
| Mountains, Desert         | Obsidian Altar  | Relic (black)                         |
| Desert, Forest            | Bone Garden     | Relic (black)                         |

## Notes
- **Relic count** is the number of relic features of each colour on claimed, non-blighted tiles of your settlements.
- **Omen Reading** reveals that *a* feature exists on a fogged tile, not which one.
- **Ancient sites** that add "two special features to nearby tiles" pick from this table, respecting the base-tile column.
- **Desert** yields nothing, so its features (Oasis, Crossroads, Natural Harbour, the black relics) are the main reason to claim it.
