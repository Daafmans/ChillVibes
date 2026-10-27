# Projects

Projects are global rule changes bought with Materials. See `03-systems.md` for the rest of the systems.

## Rules
- **Global**. Unlocked whenever the next threshold of materials is reached. The threshold goes up each time.
- Projects form a **tree** (see below). Every time the threshold is reached, the player may choose any project that is **unlocked**: a root project, or a project whose parent has been taken at least once. Ascension is always offered as well.
- Taken one-time projects drop out of the offer. Repeatable projects stay on offer, and taking one does not affect which children are unlocked (the first copy unlocks them).
- **Ascension** can be chosen repeatedly. Choosing it 10 times wins the game. It does not increase the cost of the next project. It is the only project-based win condition.
- A project can require relics. The relic requirement depends on the project in question and is always the same. A project the player cannot afford in relics is shown but cannot be chosen.
- They **change how the game is played**. They are not percentage modifiers.

## How to edit the tree
Each line is one project. **Indentation is the tree**: a project is a child of the nearest line above it that is indented one level less. Top-level lines are roots, available from the start.

```
- id | Name | Effect text | Relics | Repeatable
  - child_id | Child Name | Effect text | 1 blue | no
```

- **Relics**: `-` for none, otherwise `<amount> <colour>` (e.g. `2 green`).
- **Repeatable**: `yes` or `no`.
- To move a project, move its line (and everything indented under it).
- **id** is a short unique lowercase word. The game code refers to some ids (e.g. `wider`, `legacy`, `trade`), so don't rename those.
- The `###` heading above a root is its category.
- **Run `node tools/build-projects.js` after editing**. It regenerates `game/projects.js` (don't edit that by hand). Effect text is shown in game as written; use plain text, no `|`.
- Numbers in effect text are descriptive only; the real values live in `game/config.js`.

## Tree

### Vision

- openfrontier | Open Frontier | Allow exploring within 20 tiles from any settlements, regardless of whether it's already revealed. | - | no
  - surveyor | Surveyor's Eye | See basic tile type up to 1 tile into the fog | - | yes
    - omen | Omen Reading | See that a special feature exists (not its type) up to 1 tile into the fog | - | yes
      - sight | Ancient Sight | See ancient sites up to 1 tile into the fog | - | yes
  - seafaring | Seafaring | Allow exploring ocean tiles | 1 blue | no

### Expansion

- wider | Wider Borders | Settlements also claim the **corner tiles of their 5×5 block**. This includes settlements that were already placed. If more than one settlement would claim a tile this way, the oldest settlement takes precedence. | - | no
  - legacy | Legacy of Distance | Ancient tile bonuses scale with distance from the starting settlement | - | yes
  - trade | Trade Empire | Settlements produce one extra wealth, material and food if at least one claimed tile borders a tile claimed by another settlement | - | yes
    - glorious | Glorious Capital | The oldest settlement produces three extra wealth, material and food for each other settlement within 10 tiles. | 2 green | yes
  - harbour | Harbour Founding | Allow building settlements on water tiles | 1 green | no

### Blight

- blightsight | Blight Sight | See blight up to 1 tile into the fog | - | no
  - forecast | Rot Forecast | Explored tiles that blight could spread to next turn are highlighted | - | no
  - discernment | Pustule Discernment | Tell pustules apart from ordinary blight | 1 black | no
    - burst | Pustule Burst | When exploring a tile with a pustule, the pustule is destroyed (the player is notified when this happens even if they don't have pustule discernment) | 2 black | no
  - scavenge | Scavenge the Rot | Unlocks the Scavenger settlement upgrade: every blighted tile claimed by the upgraded settlement yields 1 food, 1 material and 1 wealth (features stay disabled) | 1 black | no
    - dwell | Dwell in the Rot | Scavenger settlements overcome by blight keep producing: their claimed tiles still yield. They still count as lost for the win and lose conditions | 2 black | no
  - fight | Blight Fight | When exploring, any blighted tiles that would be explored are cleansed | 1 black | no

### Settlements

- cartography | Cartography | Unlocks the Survey Post settlement upgrade: each exploration reveals 1 extra tile per upgraded settlement. | - | no
- pilgrimage | Pilgrimage | Unlocks the Shrine Keeper settlement upgrade: every ancient site within 10 tiles of an upgraded settlement can be activated one additional time per such settlement. | - | no
- landrights | Land Rights | Unlocks the Boundary Stones settlement upgrade: the upgraded settlement claims four additional tiles, one in each cardinal direction. | - | no
- irrigation | Irrigation | Unlocks the Desert Bloom settlement upgrade: every desert tile claimed by the upgraded settlement yields 1 food, 1 material and 1 wealth. | - | no
- craftsmanship | Craftsmanship | Unlocks the Artisan Quarter settlement upgrade: the bonuses of special tiles claimed by the upgraded settlement are doubled. | - | no
- veneration | Relic Veneration | Every claimed tile with a relic yields 10 extra food, material and wealth. | - | no
