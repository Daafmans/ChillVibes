# Systems

Numbers marked **[TUNE]** are placeholders for playtesting.

## 1. World map
- Square grid. Each tile has a **basic type** (mountains, plains, forest, ocean, desert), optionally a **special feature**, and may hold an **ancient site**.
- **Procedurally generated** from a seed.
- **Starting tile:** always forest, mountain or plains.
- **Starting landmass:** between **50 and 80 tiles**, with **no desert** on it.
- Map size: Effectively infite, generate on the fly
- Knowledge states per tile: **hidden**, **known** (explored), and, with projects, **glimpsed** (partial information from the fog, see Projects).

## 2. Resources (global)
All resources are **stored and spent globally**, not per city.

| Resource | Spent on |
|---|---|
| **Food** | Founding cities |
| **Materials** | Projects |
| **Wealth** | Exploration. All of it is spent on each exploration (+1 extra tile per 10) |

- Every turn, each city adds the yields of **all its claimed tiles**.
- **Desert** yields very little.
- **Mountains, plains and forests** have the **same total yield with different mixes**. **[TUNE]** Starting point:
  - Plains: 2 food, 1 wealth
  - Forest: 1 food, 2 material
  - Mountains: 2 material, 1 wealth
  - Ocean: 1 food, 1 wealth, 1 material

## 3. Special features
Some tiles carry a special feature on top of the basic type. A feature gives **one** of:
1. **City bonus:** extra total production for the city that owns the tile.
2. **Tile bonus:** extra production for that tile alone.
3. **Relic:** required by some projects.

Features are **disabled** while the tile is blighted. Some projects reveal that a feature exists without its type.

The full list (which base tiles each feature can appear on, its name and its bonuses) lives in `05-special-tiles.md`.

## 4. Cities
- **Cost:** Food. **Instant**.
- **Footprint:** 5×5 square minus the four corners = **21 tiles**.
- **Claiming:** a tile can belong to **one city only**, permanently, unless the city is lost. When the city is lost, the tiles become free.
- **Placement rules:** not on claimed tiles, not on pustules or blight, not on water (until a project allows it).
- **Production:** each turn, each city yields the sum of its claimed tiles.
- **Loss:** if the city's own tile turns to blight, the city is lost.
- A **free city** can come from an ancient site.
- **Exploration**: Claimed tiles are automatically and instantly explored

## 5. Ancient sites
Found by exploring. Once found, the player can activate it once, at any time, to get a benefit. One of the benefits is always a certain amount of resources. The other benefits are always related to the location of the ancient site.

Benefits:
- Instantly explore a large area around the site
- Two special features added to some nearby tiles
- A free city on the site tile
- **Cleanse:** eliminate all blight, including pustules, within **30 tiles** of the site

Ancient sites are also a **win-condition target** (find a specific number).

## 6. Projects
- **Global**. Unlocked whenever the next threshold of materials is reached. The threshold goes up each time.
- Every time the threshold is reach, the player is presented three options to choose from.
- At most one of the offered options can require relics. Relic-requiring projects are never offered together.
- One of the options can require the player to have a certain amount of relics. The relic requirement depends on the project in question and is always the same.
- They **change how the game is played**. They are not percentage modifiers.
- Some projects can be chosen multiple times, others are one-time only.

### Vision
| Project        | Effect                                                                                        | Relic Quanity | Relic Color | Allow multiple? |
| -------------- | --------------------------------------------------------------------------------------------- | ------------- | ----------- | --------------- |
| Open Frontier  | Allow exploring within 20 tiles from any cities, regardless of whether it's already revealed. | 0             |             | No              |
| Surveyor's Eye | See basic tile type up to 5 tiles into the fog                                                | 0             |             | Yes             |
| Omen Reading   | See that a special feature exists (not its type) up to 5 tiles into the fog                   | 0             |             | Yes             |
| Ancient Sight  | See ancient sites up to 5 tiles into the fog                                                  | 0             |             | Yes             |
| Seafaring      | Allow exploring ocean tiles                                                                   | 1             | Blue        | No              |

### Expansion
| Project            | Effect                                                                                                                                                                          | Relic Quanity | Relic Color | Allow multiple? |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- | --------------- |
| Harbour Founding   | Allow building cities on water tiles                                                                                                                                            | 1             | Green       | No              |
| Wider Borders      | Cities claim tiles **one extra tile away**. This includes cities that were already placed. If more than one city would claim a tile this way, the oldest city takes precedence. | 0             |             | Yes             |
| Legacy of Distance | Ancient tile bonuses scale with distance from the starting city                                                                                                                 | 0             |             | Yes             |
| Trade Empire       | Cities produce one extra wealth, material and food if at least one claimed tile borders a tile claimed by another city                                                          | 0             |             | Yes             |
| Glorious Capital   | The oldest city produces three extra wealth, material and food for each other city within 10 tiles.                                                                             | 2             | Green       | Yes             |


### Blight
| Project             | Effect                                                                                                                                                | Relic Quanity | Relic Color | Allow multiple? |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- | --------------- |
| Blight Sight        | See blight up to 5 tiles into the fog                                                                                                                 | 0             |             | No              |
| Pustule Discernment | Tell pustules apart from ordinary blight                                                                                                              | 1             | Black       | No              |
| Blight fight        | When exploring, any blighted tiles that would be explored are cleansed                                                                                | 1             | Black       | No              |
| Pustule burst       | When exploring a tile with a pustule, the pustule is destroyed (the player is notified when this happens even if they don't have pustule discernment) | 2             | Black       |                 |


## 7. Blight (the threat)
- **Turn 30**, then **every 10 turns**: one **unclaimed tile within 20 tiles of a city** becomes a **pustule**.
- **Every turn, per pustule:** one regular tile that is adjacent to the pustule, or connected to it through blighted tiles, becomes **blight**.
- **Blighted tile:** produces **nothing**, and any special feature is **disabled**.
- If a **city's tile** is blighted, the **city is lost**.
- **No cities** on pustules or blight.
- **Pustules look the same as blight** until a project lets the player tell them apart.
- **Cleansing:** only ancient-site benefits clear blight (30 tile radius).

Why it works:
- It makes standing still lose slowly, which pushes exploration (to find sites that cleanse) and expansion (to survive losing cities).
- Pustules that look like blight make the fix a guessing game until the player invests in the right project.

**[TUNE]** The spread rate grows with every pustule, and each new pustule adds another spreader, so growth is roughly linear in pustule count per turn and quadratic-ish overall. Simulate this early.

## 8. Win and loss
**Win** by any one of:
- Have **X cities**
- Find **Y ancient sites**
- Finish **Z projects**

**Lose** when **all your cities** are turned to blight.

X, Y and Z are configurable per game (difficulty setting).
