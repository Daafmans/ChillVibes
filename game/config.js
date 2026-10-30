(function (CV) {
  // Default values for every tunable gameplay number. All are placeholders for playtesting.
  // tools/test.html can override any key via the query string (?key=value).
  CV.CFG = {
    // --- Start ---
    startFood: 0, startMaterials: 0, startWealth: 0,

    // --- Settlements ---
    settlementBaseCost: 80, settlementCostGrowth: 1.35,       // food; cost = ceil(base * growth^(settlements-1))
    settlementClaimRadius: 2,                           // border radius: the square of this radius minus its four corners
    settlementBaseYield: 3,                             // each of food/materials/wealth every living settlement produces per turn on top of its tiles

    // --- Upgrades ---
    upgradeBaseCost: 40, upgradeCostGrowth: 1.45,  // wealth; cost = ceil(base * growth^(upgraded settlements)); a settlement can be upgraded once
    shrineKeeperRadius: 10,                       // Shrine Keeper: ancient sites within this Chebyshev distance gets one extra activation per Shrine Keeper in range
    surveyPostTiles: 1,                           // Survey Post: extra tiles revealed by each exploration, per upgraded settlement
    relicSiteMaterials: 2, relicRuinsWealth: 2,   // Relic Restoration: per claimed ancient site / ruins tile of an Artisan Quarter

    // --- Exploring ---
    openFrontierRadius: 5,                        // Open Frontier: explore this far (Chebyshev) from a settlement
    desertSurveyTiles: 5,                         // Desert Survey: extra hidden desert tiles revealed when exploring on a desert tile
    wayfinderTiles: 2,                            // Wayfinders: hidden tiles each Survey Post reveals per turn (closest first)
    wayfinderMaxRadius: 30,                       // Wayfinders: furthest (Chebyshev) a Survey Post looks for hidden tiles

    // --- Fog glimpses (Surveyor's Eye, Omen Reading, Ancient Sight, Blight Sight) ---
    glimpseBase: 1, glimpseStep: 1, glimpseMax: 15, // range = base + step * (copies - 1), capped at max

    // --- World generation ---
    blobMin: 50, blobVariance: 31,                // starting landmass has blobMin .. blobMin+blobVariance-1 tiles
    blobFillChance: 0.3,                          // chance to add a tile with fewer than 2 land neighbours
    startSafeRadius: 2,                           // no features within this Chebyshev distance of the start (exclusive)
    siteMinDistance: 3,                           // ancient sites appear no closer than this to the start
    siteChance: 0.008, featureChance: 0.08,       // per-tile chance of an ancient site / special feature
    landThreshold: 0.40, ringLandChance: 0.5,     // elevation needed for land; chance for land right around the start blob
    desertThreshold: 0.70,                        // desert-noise level above which land becomes desert
    mountainBelow: 0.32, forestBelow: 0.66,       // land noise bands: mountains < forest < plains
    templeMinDistance: 80, templeMaxDistance: 120, // every Ancient Temple tile lies this far (Chebyshev) from the start
    ruinTrailStartMin: 6, ruinTrailStartMax: 12,  // the first ruin of the trail lies this far (straight line) from the start
    ruinStepMin: 15, ruinStepMax: 30,             // distance from each ruin to the next
    ruinWander: 1.0,                              // radians each step may turn away from the temple's direction
    ruinLandSearch: 6,                            // a trail point in the sea moves to land within this range, or is skipped

    // --- Special features ---
    tileFeatureAmount: 2,                         // bonus resource per turn on a claimed single-resource feature
    allFeatureAmount: 1,                          // bonus of each resource per turn on a claimed all-resource feature
    hiddenFeatureChance: 0.06,                    // per-tile chance of a hidden feature on a land tile with no other feature or site
    hiddenFeatureAmount: 2,                       // bonus of each resource per turn on a claimed hidden feature (once Deep Wells is taken)

    // --- Projects ---
    projectBase: 80, projectGrowth: 1.4,          // materials threshold, multiplied by growth after each project
    legacyPerDistance: 0.05,                      // site benefit scale += this * distance from start, per Legacy copy
    tradeBonus: 2,                                // Trading Post: each of food/materials/wealth per bordering settlement
    marketTownWeight: 1.5,                        // Market Town: counts as this many settlements for a bordering Trading Post
    gloriousBonus: 3, gloriousRadius: 10,        // per Glorious Capital copy, per other settlement within the radius
    bountyOptions: 1,                             // Bountiful Sites: extra location benefits offered per site, per copy

    // --- Ancient sites ---
    siteOptionCount: 1,                           // location benefits offered per site (plus the always-offered bundle)
    siteBundleMin: 24, siteBundleVariance: 24,    // bundle: one random resource, min + rand*variance (scaled by Legacy)
    siteExploreRadius: 4,                         // 'explore' benefit reveals this radius around the site
    siteFeatureCount: 2, siteFeatureRadius: 4,    // 'features' benefit adds this many features within this radius
    cleanseRadius: 30,                            // 'cleanse' benefit removes blight within this radius

    // --- Blight ---
    blightStart: 8, blightEvery: 6,               // first pustule on this turn, then every N turns
    blightSpawnRange: 15,                         // pustules appear on undiscovered tiles up to this far (Chebyshev) from known land; effectively capped by glimpseMax
    blightSpread: 3,                             // tiles gained per pustule per turn

    // --- Victory ---
    winUpgrades: 12,                              // Economic Dominion: upgraded settlements (still standing) needed to win
    winAwakened: 20,                              // Ancient Rites: ancient site awakenings needed to win
  };
  CV.CFG_DEFAULTS = Object.freeze(Object.assign({}, CV.CFG));
  CV.RES = ['food', 'materials', 'wealth'];
  // Special features (docs/05-special-tiles.md). kind: tile (bonus on the tile; res is one resource or an array of them).
  // hidden: generated separately and only exists in play once the named project is taken.
  // kind ruins: generated as a trail to the Ancient Temple, no bonus; with Ruin Lore each points to the next.
  CV.FEATURES = [
    { id: 'fertileValley', name: 'Fertile Valley', on: ['plains'], kind: 'tile', res: 'food' },
    { id: 'crossroads', name: 'Crossroads', on: ['plains', 'desert'], kind: 'tile', res: 'wealth' },
    { id: 'oldGrowth', name: 'Old Growth', on: ['forest'], kind: 'tile', res: 'materials' },
    { id: 'richVein', name: 'Rich Vein', on: ['mountains'], kind: 'tile', res: 'materials' },
    { id: 'goldSeam', name: 'Gold Seam', on: ['mountains'], kind: 'tile', res: 'wealth' },
    { id: 'oasis', name: 'Oasis', on: ['desert'], kind: 'tile', res: 'food' },
    { id: 'fishingBanks', name: 'Fishing Banks', on: ['ocean'], kind: 'tile', res: 'food' },
    { id: 'pearlBeds', name: 'Pearl Beds', on: ['ocean'], kind: 'tile', res: 'wealth' },
    { id: 'sacredGrove', name: 'Sacred Grove', on: ['plains', 'forest'], kind: 'tile', res: CV.RES },
    { id: 'hotSprings', name: 'Hot Springs', on: ['mountains', 'forest'], kind: 'tile', res: CV.RES },
    { id: 'naturalHarbour', name: 'Natural Harbour', on: ['plains', 'desert', 'mountains'], kind: 'tile', res: CV.RES },
    { id: 'buriedAquifer', name: 'Buried Aquifer', on: ['plains', 'forest', 'mountains', 'desert'], kind: 'tile', res: CV.RES, hidden: 'wells' },
    { id: 'ruins', name: 'Ruins', on: ['plains', 'forest', 'mountains', 'desert'], kind: 'ruins' },
  ];
  CV.K =(x, y) => x * 131072 + y;               // |y| must stay < 65536
  CV.cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  CV.N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  CV.N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  CV.mulberry32 = function (a) {
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.getState = () => a;
    f.setState = v => { a = v; };
    return f;
  };
  CV.BASE_YIELD = {
    plains: { food: 1, wealth: 1 },
    forest: { food: 1, materials: 1 },
    mountains: { materials: 1, wealth: 1 },
    ocean: { food: 2 },
    desert: {},
  };
  // Settlement upgrades. A settlement can take one, once, for upgradeCost() wealth; each is offered only once its project is taken.
  CV.UPGRADES = [
    { id: 'surveypost', name: 'Survey Post', project: 'cartography', icon: '\u{1F52D}',
      get desc() { return `Each exploration reveals ${CV.CFG.surveyPostTiles} extra tile${CV.CFG.surveyPostTiles === 1 ? '' : 's'} per settlement with this upgrade.`; } },
    { id: 'shrinekeeper', name: 'Shrine Keeper', project: 'pilgrimage', icon: '\u{26E9}\u{FE0F}',
      get desc() { return `Every ancient site within ${CV.CFG.shrineKeeperRadius} tiles can be activated one additional time. Stacks with other Shrine Keepers in range.`; } },
    { id: 'desertbloom', name: 'Desert Bloom', project: 'irrigation', icon: '\u{1F33A}',
      desc: 'Every desert tile claimed by this settlement yields 1 food, 1 material and 1 wealth.' },
    { id: 'artisanquarter', name: 'Artisan Quarter', project: 'craftsmanship', icon: '\u{1F3FA}',
      desc: 'The bonuses of special tiles claimed by this settlement are doubled.' },
    { id: 'scavenger', name: 'Scavenger', project: 'scavenge', icon: '\u{1F9B4}',
      desc: 'Every blighted tile claimed by this settlement yields 1 food, 1 material and 1 wealth (features stay disabled).' },
    { id: 'tradingpost', name: 'Trading Post', project: 'trade', icon: '\u{2696}\u{FE0F}',
      get desc() { return `This settlement produces ${CV.CFG.tradeBonus} extra food, materials and wealth for each other settlement whose claimed tiles border its own (diagonals don't count).`; } },
    { id: 'markettown', name: 'Market Town', project: 'guilds', icon: '\u{1F9FA}',
      get desc() { return `Does nothing on its own, but counts as ${CV.CFG.marketTownWeight} settlements for every Trading Post it borders.`; } },
  ];
  CV.PROJECTS = [
    // The tree is generated into projects.js from docs/06-projects.md (node tools/build-projects.js)
  ];
})(globalThis.CV = globalThis.CV || {});
