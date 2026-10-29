# Projects

Projects are global rule changes bought with Materials. See `03-systems.md` for the rest of the systems.

## Rules
- **Global**. Unlocked whenever the next threshold of materials is reached. The threshold goes up each time.
- Projects form a **tree** (see below). Every time the threshold is reached, the player may choose any project that is **unlocked**: a root project, or a project whose parent has been taken at least once.
- Taken one-time projects drop out of the offer. Repeatable projects stay on offer until another copy would do nothing (e.g. Bountiful Sites once every site offers every location benefit), and taking one does not affect which children are unlocked (the first copy unlocks them).
- They **change how the game is played**. They are not percentage modifiers.

## How to edit the tree
Each line is one project. **Indentation is the tree**: a project is a child of the nearest line above it that is indented one level less. Top-level lines are roots, available from the start.

```
- id | Name | Effect text | Repeatable
  - child_id | Child Name | Effect text | no
```

- **Repeatable**: `yes` or `no`.
- To move a project, move its line (and everything indented under it).
- **id** is a short unique lowercase word. The game code refers to some ids (e.g. `legacy`, `trade`, `bounty`), so don't rename those.
- The `###` heading above a root is its category.
- **Run `node tools/build-projects.js` after editing**. It regenerates `game/projects.js` (don't edit that by hand). Effect text is shown in game as written; use plain text, no `|`.
- Numbers in effect text are descriptive only; the real values live in `game/config.js`.

## Tree

### Projects

- surveyor | Surveyor's Eye | See basic tile type up to 1 tile into the fog | yes
  - omen | Omen Reading | See that a special feature exists (not its type) up to 1 tile into the fog | yes
    - craftsmanship | Craftsmanship | Unlocks the Artisan Quarter settlement upgrade: the bonuses of special tiles claimed by the upgraded settlement are doubled. | no
      - relics | Relic Restoration | Artisan Quarter settlements get 2 materials per turn from each claimed ancient site and 2 wealth per turn from each claimed ruins tile. | no
  - sight | Ancient Sight | See ancient sites up to 1 tile into the fog | yes
    - pilgrimage | Pilgrimage | Unlocks the Shrine Keeper settlement upgrade: every ancient site within 10 tiles of an upgraded settlement can be activated one additional time per such settlement. | no
      - legacy | Legacy of Distance | Ancient tile bonuses scale with distance from the starting settlement | yes
        - rites | Ancient Rites | Ancient sites can be activated to Awaken them instead of taking a benefit. Once 20 ancient sites have been awakened, you win (checked at the end of the turn). A site with extra activations from Shrine Keepers can be awakened again. | no
    - bounty | Bountiful Sites | Ancient sites offer one additional location benefit to choose from | yes
  - seafaring | Seafaring | Allow exploring ocean tiles | no
    - harbour | Harbour Founding | Allow building settlements on water tiles | no
    - cartography | Cartography | Unlocks the Survey Post settlement upgrade: each exploration reveals 1 extra tile per upgraded settlement. | no
      - wayfinders | Wayfinders | Every Survey Post settlement reveals the 2 closest unrevealed tiles each turn. | no
      - openfrontier | Open Frontier | Allow exploring within 5 tiles from any settlements, regardless of whether it's already revealed. | no
      - ruinlore | Ruin Lore | Each ruin shows which cardinal direction (north, south, east or west) the next ruin of the trail lies in; the last one points to the Ancient Temple. | no
        - awakening | Awakening | Once the Ancient Temple is found, it can be activated to awaken the gods and win the game. | no
  - glorious | Glorious Capital | The oldest settlement produces three extra wealth, material and food for each other settlement within 10 tiles. | yes
    - trade | Trade Empire | Unlocks the Trading Post settlement upgrade: the upgraded settlement produces two extra wealth, materials and food for each other settlement whose claimed tiles border its own (diagonals don't count) | no
      - guilds | Merchant Guilds | Unlocks the Market Town settlement upgrade: it does nothing on its own, but counts as 1.5 settlements for every Trading Post it borders. | no
        - dominion | Economic Dominion | Once 20 living settlements have an upgrade, you claim an economic victory (checked at the end of the turn). | no
  - blightsight | Blight Sight | See blight up to 1 tile into the fog | yes
    - scavenge | Scavenge the Rot | Unlocks the Scavenger settlement upgrade: every blighted tile claimed by the upgraded settlement yields 1 food, 1 material and 1 wealth (features stay disabled) | no
      - dwell | Dwell in the Rot | Destroyed Scavenger settlements keep producing from their blighted tiles (1 food, 1 material and 1 wealth each); their other tiles stay idle. They still count as lost for the win and lose conditions | no
    - discernment | Pustule Discernment | Tell pustules apart from ordinary blight | no
  - dunes | Desert Survey | Exploring directly on a desert tile instantly explores the entire connected desert | no
    - irrigation | Irrigation | Unlocks the Desert Bloom settlement upgrade: every desert tile claimed by the upgraded settlement yields 1 food, 1 material and 1 wealth. | no
      - wells | Deep Wells | Reveals Buried Aquifers: previously hidden special features on land tiles that each yield 2 food, 2 materials and 2 wealth. | no
