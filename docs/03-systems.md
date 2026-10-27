# Systems

## 1. World map
- Square grid. Each tile has a **basic type** (mountains, plains, forest, ocean, desert), optionally a **special feature**, or may hold an **ancient site**.
- **Procedurally generated** from a seed.
- **Starting tile:** always forest, mountain or plains.
- **Starting landmass:** between **50 and 80 tiles**, with **no desert** on it.
- Map size: Effectively infite, generate on the fly
- Knowledge states per tile: **hidden**, **known** (explored), and, with projects, **glimpsed** (partial information from the fog, see `06-projects.md`).

## 2. Resources (global)
All resources are **stored and spent globally**, not per settlement.

| Resource      | Spent on                                            |
| ------------- | --------------------------------------------------- |
| **Food**      | Founding settlements                                     |
| **Materials** | Projects                                            |
| **Wealth**    | Settlement upgrades                                 |

- Every turn, each settlement adds the yields of **all its claimed tiles**.
- **Desert** yields nothing.
- **Plains, forests, mountains and ocean** have the **same total yield (2) with different mixes**. Base yields are kept low so that special features stand out.
  - Plains: 1 food, 1 wealth
  - Forest: 1 food, 1 material
  - Mountains: 1 material, 1 wealth
  - Ocean: 2 food

## 3. Special features
Some tiles carry a special feature on top of the basic type. A feature gives **one** of:
1. **Tile bonus:** extra production for that tile alone (one resource, or a bit of each).
2. **Relic:** required by some projects.

Features are **disabled** while the tile is blighted. Some projects reveal that a feature exists without its type.

The full list (which base tiles each feature can appear on, its name and its bonuses) lives in `05-special-tiles.md`.

## 4. Settlements
- **Cost:** Food. **Instant**.
- **Footprint:** 5×5 square minus the four corners = **21 tiles**.
- **Claiming:** a tile can belong to **one settlement only**, permanently, unless the settlement is lost. When the settlement is lost, the tiles become free.
- **Placement rules:** not on claimed tiles, not on pustules or blight, not on water (until a project allows it).
- **Production:** each turn, each settlement yields the sum of its claimed tiles.
- **Loss:** if the settlement's own tile turns to blight, the settlement is lost.
- A **free settlement** can come from an ancient site.
- **Exploration**: Claimed tiles are automatically and instantly explored
- **Upgrade:** each settlement can be upgraded **once**, for **Wealth** (`upgradeCost`). The upgrades on offer are the ones unlocked by projects taken so far (see `06-projects.md`). Upgrades:
  - **Survey Post** (unlocked by *Cartography*): every exploration reveals 1 extra tile per settlement with this upgrade.
  - **Shrine Keeper** (unlocked by *Pilgrimage*): every ancient site within 10 tiles (`shrineKeeperRadius`) of this settlement can be activated one additional time. Shrine Keepers stack: a site in range of two gets two extra activations.
  - **Boundary Stones** (unlocked by *Land Rights*): the settlement claims four additional tiles, the one `boundaryStoneReach` (3) steps away in each cardinal direction. These are claimed after every settlement's regular tiles, so they never take a tile another settlement already holds.
  - **Desert Bloom** (unlocked by *Irrigation*): every desert tile claimed by the settlement yields 1 food, 1 material and 1 wealth (instead of nothing). Special features on the tile still add their bonus; blighted tiles still follow the blight rules.
  - **Artisan Quarter** (unlocked by *Craftsmanship*): the bonuses of special tiles (tile features) claimed by the settlement are doubled. Blighted tiles still have their features disabled.

## 5. Ancient sites
Found by exploring. Once found, the player can activate it once (plus once per Shrine Keeper in range), at any time, to get a benefit. One of the benefits is always a certain amount of resources. The other benefits are always related to the location of the ancient site.

Benefits:
- Instantly explore a large area around the site
- Two special features added to some nearby tiles
- A free settlement on the site tile
- **Cleanse:** eliminate all blight, including pustules, within **30 tiles** of the site

Ancient sites are also a **win-condition target** (find a specific number).

## 6. Projects
Spent with Materials: each time the threshold is reached, the player picks any unlocked project from the project tree (plus Ascension). Projects change how the game is played rather than adding percentages. The rules and the project tree live in `06-projects.md`.

## 7. Blight (the threat)
- **Turn 10**, then **every 10 turns**: one **undiscovered tile** (a random hidden tile within 15 tiles of known land) becomes a **pustule**.
- **Every turn, per pustule:** one regular tile that is adjacent to the pustule, or connected to it through blighted tiles, becomes **blight**.
- **Blighted tile:** produces **nothing**, and any special feature is **disabled**.
- If a **settlement's tile** is blighted, the **settlement is lost**.
- **No settlements** on pustules or blight.
- **Pustules look the same as blight** until a project lets the player tell them apart.
- **Cleansing:** only ancient-site benefits clear blight (30 tile radius).

Why it works:
- It makes standing still lose slowly, which pushes exploration (to find sites that cleanse) and expansion (to survive losing settlements).
- Pustules that look like blight make the fix a guessing game until the player invests in the right project.

**[TUNE]** The spread rate grows with every pustule, and each new pustule adds another spreader, so growth is roughly linear in pustule count per turn and quadratic-ish overall. Simulate this early.

## 8. Win and loss
**Win** by any one of:
- Have **X settlements**
- Find **Y ancient sites**
- Finish **Z projects**

**Lose** when **all your settlements** are turned to blight.

X, Y and Z are configurable per game (difficulty setting).
