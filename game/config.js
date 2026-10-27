(function (CV) {
  // Default values for every tunable gameplay number. All are placeholders for playtesting.
  // tools/test.html can override any key via the query string (?key=value).
  CV.CFG = {
    // --- Start ---
    startFood: 0, startMaterials: 0, startWealth: 0,

    // --- Settlements ---
    settlementBaseCost: 40, settlementCostGrowth: 1.45,       // food; cost = ceil(base * growth^(settlements-1))
    settlementClaimRadius: 2,                           // base border radius (diamond); Wider Borders also claims the corners of the surrounding square

    // --- Exploring ---
    exploreWealthPerTile: 10,                     // exploring spends all wealth; each 10 spent reveals one extra tile
    openFrontierRadius: 20,                       // Open Frontier: explore this far (Chebyshev) from a settlement

    // --- Fog glimpses (Surveyor's Eye, Omen Reading, Ancient Sight, Blight Sight) ---
    glimpseBase: 1, glimpseStep: 1, glimpseMax: 15, // range = base + step * (copies - 1), capped at max
    blightSightRange: 1,

    // --- World generation ---
    blobMin: 50, blobVariance: 31,                // starting landmass has blobMin .. blobMin+blobVariance-1 tiles
    blobFillChance: 0.3,                          // chance to add a tile with fewer than 2 land neighbours
    startSafeRadius: 2,                           // no features within this Chebyshev distance of the start (exclusive)
    siteMinDistance: 3,                           // ancient sites appear no closer than this to the start
    siteChance: 0.008, featureChance: 0.08,       // per-tile chance of an ancient site / special feature
    landThreshold: 0.40, ringLandChance: 0.5,     // elevation needed for land; chance for land right around the start blob
    desertThreshold: 0.70,                        // desert-noise level above which land becomes desert
    mountainBelow: 0.32, forestBelow: 0.66,       // land noise bands: mountains < forest < plains

    // --- Special features ---
    tileFeatureAmount: 2,                         // bonus resource per turn on a claimed single-resource feature
    allFeatureAmount: 1,                          // bonus of each resource per turn on a claimed all-resource feature

    // --- Projects ---
    projectBase: 60, projectGrowth: 1.4,          // materials threshold, multiplied by growth after each project
    legacyPerDistance: 0.05,                      // site benefit scale += this * distance from start, per Legacy copy
    tradeBonus: 1,                                // each of food/materials/wealth per Trade Empire copy per touching settlement
    gloriousBonus: 3, gloriousRadius: 10,         // per Glorious Capital copy, per other settlement within the radius

    // --- Ancient sites ---
    siteOptionCount: 3,                           // benefits offered per site (plus the always-offered bundle)
    siteBundleMin: 8, siteBundleVariance: 8,      // bundle: each resource gets min + rand*variance (scaled by Legacy)
    siteExploreRadius: 4,                         // 'explore' benefit reveals this radius around the site
    siteFeatureCount: 2, siteFeatureRadius: 4,    // 'features' benefit adds this many features within this radius
    cleanseRadius: 30,                            // 'cleanse' benefit removes blight within this radius

    // --- Blight ---
    blightStart: 10, blightEvery: 10,             // first pustule on this turn, then every N turns
    blightSpawnRange: 15,                         // pustules appear on undiscovered tiles up to this far (Chebyshev) from known land; effectively capped by glimpseMax
    blightSpread: 3,                             // tiles gained per pustule per turn

    // --- Victory ---
    winSettlements: 20, winSites: 20, winAscensions: 10,
  };
  CV.CFG_DEFAULTS = Object.freeze(Object.assign({}, CV.CFG));
  CV.RES = ['food', 'materials', 'wealth'];
  CV.COLORS = ['blue', 'green', 'black'];
  // Special features (docs/05-special-tiles.md). kind: tile (bonus on the tile; res is one resource or an array of them), relic.
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
    { id: 'tidalShrine', name: 'Tidal Shrine', on: ['ocean', 'plains'], kind: 'relic', color: 'blue' },
    { id: 'sunkenIdol', name: 'Sunken Idol', on: ['ocean', 'forest'], kind: 'relic', color: 'blue' },
    { id: 'standingStones', name: 'Standing Stones', on: ['forest', 'plains'], kind: 'relic', color: 'green' },
    { id: 'foundersCairn', name: 'Founders’ Cairn', on: ['plains', 'mountains'], kind: 'relic', color: 'green' },
    { id: 'obsidianAltar', name: 'Obsidian Altar', on: ['mountains', 'desert'], kind: 'relic', color: 'black' },
    { id: 'boneGarden', name: 'Bone Garden', on: ['desert', 'forest'], kind: 'relic', color: 'black' },
  ];
  CV.K =(x, y) => x * 131072 + y;               // |y| must stay < 65536
  CV.cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  CV.N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
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
  CV.PROJECTS = [
    // Always offered (no parent), repeatable, does not raise the cost of the next project or count as a regular project
    { id: 'ascension', cat: 'Victory', name: 'Ascension', parent: null, multi: true, relic: null, ascension: true,
      get desc() { return `Pick it ${CV.CFG.winAscensions} times to win. Does not raise the cost of the next project.`; } },
    // The rest of the tree is generated into projects.js from docs/06-projects.md (node tools/build-projects.js)
  ];
})(globalThis.CV = globalThis.CV || {});
