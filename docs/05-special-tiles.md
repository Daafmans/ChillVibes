# Special tile features

A special feature sits on top of a tile's **basic type** (see `03-systems.md`, section 3). Every feature gives a **tile bonus**: extra production for that tile alone. Written as `Tile +…`.

Rules that apply to all of them:
- A feature is **disabled** while its tile is blighted (no bonus).
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

### Hidden features
These are generated with the world but don't exist in play (no bonus, not shown, not glimpsed by Omen Reading) until their project is taken. They roll separately from the table above, only on tiles with no other feature or ancient site.

| Base tile                         | Name           | Bonuses                               | Revealed by |
| --------------------------------- | -------------- | ------------------------------------- | ----------- |
| Plains, Forest, Mountains, Desert | Buried Aquifer | Tile +2 food, +2 materials, +2 wealth | Deep Wells  |

### Ruins
Ruins give **no bonus**. They are not rolled per tile: they form one trail from near the start to the Ancient Temple, on land only, and replace any other feature or ancient site on their tile. They are never created by an ancient site's "two special features" benefit. Once *Ruin Lore* is taken, each Ruins tile shows the cardinal direction toward the next ruin of the trail, and the last one toward the Ancient Temple (see `03-systems.md`, section 8).

| Base tile                         | Name  | Bonuses | Effect                                            |
| --------------------------------- | ----- | ------- | ------------------------------------------------- |
| Plains, Forest, Mountains, Desert | Ruins | none    | With *Ruin Lore*: points toward the next ruins     |

## Notes
- **Omen Reading** reveals that *a* feature exists on a fogged tile, not which one.
- **Ancient sites** that add "two special features to nearby tiles" pick from the main table (never hidden features), respecting the base-tile column.
- **Desert** yields nothing, so its features (Oasis, Crossroads and Natural Harbour) are the main reason to claim it.
