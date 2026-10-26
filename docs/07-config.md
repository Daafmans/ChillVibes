# Config values

All tunable gameplay numbers live in `CV.CFG` in `game/config.js`. Every value is a placeholder for playtesting. `tools/test.html` can override any key via the query string (`?key=value`). `CV.CFG_DEFAULTS` holds a frozen copy of the defaults.

## Start

| Key | Default | Description |
|---|---|---|
| `startFood` | 0 | Starting food |
| `startMaterials` | 0 | Starting materials |
| `startWealth` | 0 | Starting wealth |

## Cities

| Key | Default | Description |
|---|---|---|
| `cityBaseCost` | 40 | Food cost of a city; `cost = ceil(base * growth^(cities-1))` |
| `cityCostGrowth` | 1.45 | Cost multiplier per existing city |
| `cityClaimRadius` | 2 | Base border radius (diamond); Wider Borders also claims the corners of the surrounding square |

## Exploring

| Key | Default | Description |
|---|---|---|
| `exploreWealthPerTile` | 10 | Exploring spends all wealth; each 10 spent reveals one extra tile |
| `openFrontierRadius` | 20 | Open Frontier: explore this far (Chebyshev) from a city |

## Fog glimpses

Surveyor's Eye, Omen Reading, Ancient Sight, Blight Sight. Range = `base + step * (copies - 1)`, capped at max.

| Key | Default | Description |
|---|---|---|
| `glimpseBase` | 1 | Base range |
| `glimpseStep` | 1 | Extra range per additional copy |
| `glimpseMax` | 15 | Maximum range |
| `blightSightRange` | 1 | Range of Blight Sight |

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

## Special features

| Key | Default | Description |
|---|---|---|
| `tileFeatureAmount` | 2 | Bonus resource per turn on a claimed `tile` feature |
| `allFeatureAmount` | 1 | Bonus of each resource per turn on a claimed all-resource feature |

## Projects

| Key | Default | Description |
|---|---|---|
| `projectBase` | 60 | Materials threshold for the first project |
| `projectGrowth` | 1.4 | Threshold multiplier after each project |
| `projectOfferSize` | 5 | Projects offered each time, including the always-offered Ascension |
| `legacyPerDistance` | 0.05 | Site benefit scale increases by this × distance from start, per Legacy copy |
| `tradeBonus` | 1 | Each of food/materials/wealth per Trade Empire copy per touching city |
| `gloriousBonus` | 3 | Per Glorious Capital copy, per other city within the radius |
| `gloriousRadius` | 10 | Radius for Glorious Capital |

## Ancient sites

| Key | Default | Description |
|---|---|---|
| `siteOptionCount` | 3 | Benefits offered per site (plus the always-offered bundle) |
| `siteBundleMin` | 8 | Bundle: each resource gets `min + rand * variance` (scaled by Legacy) |
| `siteBundleVariance` | 8 | See above |
| `siteExploreRadius` | 4 | The 'explore' benefit reveals this radius around the site |
| `siteFeatureCount` | 2 | The 'features' benefit adds this many features… |
| `siteFeatureRadius` | 4 | …within this radius |
| `cleanseRadius` | 30 | The 'cleanse' benefit removes blight within this radius |

## Blight

| Key | Default | Description |
|---|---|---|
| `blightStart` | 10 | Turn of the first pustule |
| `blightEvery` | 10 | A new pustule every N turns |
| `blightSpawnRange` | 15 | Pustules appear on undiscovered tiles up to this many tiles (Chebyshev) from known land; effectively capped by `glimpseMax` |
| `blightSpread` | 3 | Tiles gained per pustule per turn |

## Victory

| Key | Default | Description |
|---|---|---|
| `winCities` | 20 | Cities needed to win |
| `winSites` | 20 | Ancient sites needed to win |
| `winAscensions` | 10 | Times Ascension must be picked to win |

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
| Sacred Grove | city | plains, forest | – |
| Hot Springs | city | mountains, forest | – |
| Natural Harbour | city | plains, desert, mountains | – |
| Tidal Shrine | relic (blue) | ocean, plains | – |
| Sunken Idol | relic (blue) | ocean, forest | – |
| Standing Stones | relic (green) | forest, plains | – |
| Founders’ Cairn | relic (green) | plains, mountains | – |
| Obsidian Altar | relic (black) | mountains, desert | – |
| Bone Garden | relic (black) | desert, forest | – |

### Projects (`CV.PROJECTS`)

| Category | Project | Repeatable | Relic cost |
|---|---|---|---|
| Vision | Open Frontier | no | – |
| Vision | Surveyor's Eye | yes | – |
| Vision | Omen Reading | yes | – |
| Vision | Ancient Sight | yes | – |
| Vision | Seafaring | no | 1 blue |
| Expansion | Harbour Founding | no | 1 green |
| Expansion | Wider Borders | no | – |
| Expansion | Legacy of Distance | yes | – |
| Expansion | Trade Empire | yes | – |
| Expansion | Glorious Capital | yes | 2 green |
| Blight | Blight Sight | no | – |
| Blight | Pustule Discernment | no | 1 black |
| Blight | Rot Forecast | no | – |
| Blight | Scavenge the Rot | no | 1 black |
| Blight | Blight Fight | no | 1 black |
| Blight | Pustule Burst | no | 2 black |
