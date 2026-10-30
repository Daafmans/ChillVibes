# Config values

All tunable gameplay numbers live in `CV.CFG` in `game/config.js`. Every value is a placeholder for playtesting. `tools/test.html` can override any key via the query string (`?key=value`). `CV.CFG_DEFAULTS` holds a frozen copy of the defaults.

## Start

| Key | Default | Description |
|---|---|---|
| `startFood` | 0 | Starting food |
| `startMaterials` | 0 | Starting materials |
| `startWealth` | 0 | Starting wealth |

## Settlements

| Key | Default | Description |
|---|---|---|
| `settlementBaseCost` | 80 | Food cost of a settlement; `cost = ceil(base * growth^(settlements-1))` |
| `settlementCostGrowth` | 1.35 | Cost multiplier per existing settlement |
| `settlementClaimRadius` | 2 | Border radius: settlements claim the square of this radius minus its four corners (21 tiles at 2) |
| `settlementBaseYield` | 3 | Each of food/materials/wealth every living settlement produces per turn on top of its tiles |

## Upgrades

| Key | Default | Description |
|---|---|---|
| `upgradeBaseCost` | 40 | Wealth cost of a settlement upgrade (once per settlement); `cost = ceil(base * growth^(upgraded settlements))` |
| `upgradeCostGrowth` | 1.45 | Cost multiplier per already-upgraded settlement |
| `surveyPostTiles` | 1 | Survey Post: extra tiles revealed by each exploration, per upgraded settlement |
| `wayfinderTiles` | 2 | Wayfinders: hidden tiles each Survey Post reveals per turn (closest first) |
| `wayfinderMaxRadius` | 30 | Wayfinders: furthest (Chebyshev) a Survey Post looks for hidden tiles |
| `relicSiteMaterials` | 2 | Relic Restoration: materials per turn from each ancient site claimed by an Artisan Quarter |
| `relicRuinsWealth` | 2 | Relic Restoration: wealth per turn from each ruins tile claimed by an Artisan Quarter |
| `shrineKeeperRadius` | 10 | Shrine Keeper: ancient sites within this Chebyshev distance get one extra activation per Shrine Keeper |

## Exploring

| Key | Default | Description |
|---|---|---|
| `openFrontierRadius` | 5 | Open Frontier: explore this far (Chebyshev) from a settlement |
| `desertSurveyTiles` | 5 | Desert Survey: extra hidden desert tiles (nearest, connected) revealed when exploring on a desert tile |

## Fog glimpses

Surveyor's Eye, Omen Reading, Ancient Sight, Blight Sight. Range = `base + step * (copies - 1)`, capped at max.

| Key | Default | Description |
|---|---|---|
| `glimpseBase` | 1 | Base range |
| `glimpseStep` | 1 | Extra range per additional copy |
| `glimpseMax` | 15 | Maximum range |

## World generation

| Key | Default | Description |
|---|---|---|
| `blobMin` | 50 | Minimum starting landmass size (tiles) |
| `blobVariance` | 31 | Landmass has `blobMin .. blobMin+blobVariance-1` tiles |
| `blobFillChance` | 0.3 | Chance to add a tile with fewer than 2 land neighbours |
| `startSafeRadius` | 2 | No features within this Chebyshev distance of the start (exclusive) |
| `siteMinDistance` | 3 | Ancient sites appear no closer than this to the start |
| `siteChance` | 0.008 | Per-tile chance of an ancient site |
| `featureChance` | 0.08 | Per-tile chance of a special feature |
| `landThreshold` | 0.40 | Elevation needed for land |
| `ringLandChance` | 0.5 | Chance for land right around the start blob |
| `desertThreshold` | 0.70 | Desert-noise level above which land becomes desert |
| `mountainBelow` | 0.32 | Land noise below this is mountains |
| `forestBelow` | 0.66 | Land noise below this (and above mountains) is forest; above is plains |
| `templeMinDistance` | 80 | Every Ancient Temple tile is at least this far (Chebyshev) from the start |
| `templeMaxDistance` | 120 | …and at most this far |
| `ruinTrailStartMin` | 6 | The first ruin of the trail lies at least this far (straight line) from the start |
| `ruinTrailStartMax` | 12 | …and at most this far |
| `ruinStepMin` | 15 | Shortest distance from one trail ruin to the next |
| `ruinStepMax` | 30 | Longest distance from one trail ruin to the next |
| `ruinWander` | 1.0 | Radians each trail step may turn away from the direction of the temple |
| `ruinLandSearch` | 6 | A trail point in the sea moves to the nearest land within this range (Chebyshev), or is skipped |

## Special features

| Key | Default | Description |
|---|---|---|
| `tileFeatureAmount` | 2 | Bonus resource per turn on a claimed `tile` feature |
| `allFeatureAmount` | 1 | Bonus of each resource per turn on a claimed all-resource feature |
| `hiddenFeatureChance` | 0.06 | Per-tile chance of a hidden feature on a land tile with no other feature or site (new game) |
| `hiddenFeatureAmount` | 2 | Bonus of each resource per turn on a claimed hidden feature, once Deep Wells is taken |

## Projects

| Key | Default | Description |
|---|---|---|
| `projectBase` | 80 | Materials threshold for the first project |
| `projectGrowth` | 1.4 | Threshold multiplier after each project |
| `legacyPerDistance` | 0.05 | Site benefit scale increases by this × distance from start, per Legacy copy |
| `tradeBonus` | 2 | Trading Post: each of food/materials/wealth per bordering settlement |
| `marketTownWeight` | 1.5 | Market Town: counts as this many settlements for a bordering Trading Post |
| `gloriousBonus` | 3 | Per Glorious Capital copy, per other settlement within the radius |
| `gloriousRadius` | 10 | Radius for Glorious Capital |
| `bountyOptions` | 1 | Bountiful Sites: extra location benefits offered per site, per copy |

## Ancient sites

| Key | Default | Description |
|---|---|---|
| `siteOptionCount` | 1 | Location benefits offered per site (plus the always-offered bundle) |
| `siteBundleMin` | 24 | Bundle: one random resource, `min + rand * variance` (scaled by Legacy) |
| `siteBundleVariance` | 24 | See above |
| `siteExploreRadius` | 4 | The 'explore' benefit reveals this radius around the site |
| `siteFeatureCount` | 2 | The 'features' benefit adds this many features… |
| `siteFeatureRadius` | 4 | …within this radius |
| `cleanseRadius` | 30 | The 'cleanse' benefit removes blight within this radius |

## Blight

| Key | Default | Description |
|---|---|---|
| `blightStart` | 8 | Turn of the first pustule |
| `blightEvery` | 6 | A new pustule every N turns |
| `blightSpawnRange` | 15 | Pustules appear on undiscovered tiles up to this many tiles (Chebyshev) from known land; effectively capped by `glimpseMax` |
| `blightSpread` | 3 | Tiles gained per pustule per turn |

## Victory

| Key | Default | Description |
|---|---|---|
| `winUpgrades` | 12 | Economic Dominion: upgraded settlements (still standing) needed to win |
| `winAwakened` | 20 | Ancient Rites: ancient site awakenings needed to win |

## Other constants (not in `CV.CFG`)

### Base tile yields (`CV.BASE_YIELD`)

| Tile | Food | Materials | Wealth |
|---|---|---|---|
| Plains | 1 | – | 1 |
| Forest | 1 | 1 | – |
| Mountains | – | 1 | 1 |
| Ocean | 2 | – | – |
| Desert | – | – | – |

### Special features (`CV.FEATURES`)

| Feature | Kind | Spawns on | Effect |
|---|---|---|---|
| Fertile Valley | tile | plains | food |
| Crossroads | tile | plains, desert | wealth |
| Old Growth | tile | forest | materials |
| Rich Vein | tile | mountains | materials |
| Gold Seam | tile | mountains | wealth |
| Oasis | tile | desert | food |
| Fishing Banks | tile | ocean | food |
| Pearl Beds | tile | ocean | wealth |
| Sacred Grove | settlement | plains, forest | – |
| Hot Springs | settlement | mountains, forest | – |
| Natural Harbour | settlement | plains, desert, mountains | – |
| Buried Aquifer | tile (hidden until Deep Wells) | plains, forest, mountains, desert | food, materials, wealth |
| Ruins | ruins | plains, forest, mountains, desert | none; with Ruin Lore points toward the next ruins of the trail (the last toward the Ancient Temple) |

### Projects (`CV.PROJECTS`)

Generated into `game/projects.js` from the tree in `06-projects.md` (names, parents, and repeatability all live there).
