(function (CV) {
  // Default values for every tunable gameplay number. All are placeholders for playtesting.
  // tools/test.html can override any key via the query string (?key=value).
  CV.CFG = {
    // --- Start ---
    startFood: 0, startMaterials: 0, startWealth: 0,

    // --- Cities ---
    cityBaseCost: 40, cityCostGrowth: 1.45,       // food; cost = ceil(base * growth^(cities-1))
    cityClaimRadius: 2,                           // base border radius (diamond); Wider Borders adds +1 per copy

    // --- Exploring ---
    exploreWealthPerTile: 10,                     // exploring spends all wealth; each 10 spent reveals one extra tile
    openFrontierRadius: 20,                       // Open Frontier: explore this far (Chebyshev) from a city

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
    tileFeatureAmount: 2,                         // bonus resource per turn on a claimed 'tile' feature
    cityFeatureAmount: 1,                         // bonus of each resource per turn for a 'city' feature

    // --- Projects ---
    projectBase: 60, projectGrowth: 1.4,          // materials threshold, multiplied by growth after each project
    projectOfferSize: 4,                          // projects offered each time
    widerBorderBonus: 1,                          // extra claim radius per Wider Borders copy
    legacyPerDistance: 0.05,                      // site benefit scale += this * distance from start, per Legacy copy
    tradeBonus: 1,                                // each of food/materials/wealth per Trade Empire copy per touching city
    gloriousBonus: 3, gloriousRadius: 10,         // per Glorious Capital copy, per other city within the radius

    // --- Ancient sites ---
    siteOptionCount: 3,                           // benefits offered per site (plus the always-offered bundle)
    siteRelicChance: 0.7, siteRelicDoubleChance: 0.3, // chance one option needs relics; chance it needs 2 rather than 1
    siteBundleMin: 8, siteBundleVariance: 8,      // bundle: each resource gets min + rand*variance (scaled by Legacy)
    siteExploreRadius: 4,                         // 'explore' benefit reveals this radius around the site
    siteFeatureCount: 2, siteFeatureRadius: 4,    // 'features' benefit adds this many features within this radius
    cleanseRadius: 30,                            // 'cleanse' benefit removes blight within this radius

    // --- Blight ---
    blightStart: 30, blightEvery: 10,             // first pustule on this turn, then every N turns
    blightSpawnRadius: 20,                        // pustules appear within this distance of a random city
    blightSpread: 3,                              // tiles gained per pustule per turn

    // --- Victory ---
    winCities: 20, winSites: 20, winProjects: 20,
  };
  CV.CFG_DEFAULTS = Object.freeze(Object.assign({}, CV.CFG));
  CV.RES = ['food', 'materials', 'wealth'];
  CV.COLORS = ['blue', 'green', 'black'];
  // Special features (docs/05-special-tiles.md). kind: tile (+2 of res on the tile), city (+1 of each for the owner), relic.
  CV.FEATURES = [
    { id: 'fertileValley', name: 'Fertile Valley', on: ['plains'], kind: 'tile', res: 'food' },
    { id: 'crossroads', name: 'Crossroads', on: ['plains', 'desert'], kind: 'tile', res: 'wealth' },
    { id: 'oldGrowth', name: 'Old Growth', on: ['forest'], kind: 'tile', res: 'materials' },
    { id: 'richVein', name: 'Rich Vein', on: ['mountains'], kind: 'tile', res: 'materials' },
    { id: 'goldSeam', name: 'Gold Seam', on: ['mountains'], kind: 'tile', res: 'wealth' },
    { id: 'oasis', name: 'Oasis', on: ['desert'], kind: 'tile', res: 'food' },
    { id: 'fishingBanks', name: 'Fishing Banks', on: ['ocean'], kind: 'tile', res: 'food' },
    { id: 'pearlBeds', name: 'Pearl Beds', on: ['ocean'], kind: 'tile', res: 'wealth' },
    { id: 'sacredGrove', name: 'Sacred Grove', on: ['plains', 'forest'], kind: 'city' },
    { id: 'hotSprings', name: 'Hot Springs', on: ['mountains', 'forest'], kind: 'city' },
    { id: 'naturalHarbour', name: 'Natural Harbour', on: ['plains', 'desert', 'mountains'], kind: 'city' },
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
    // Vision
    { id: 'openfrontier', cat: 'Vision', name: 'Open Frontier', multi: false, relic: null,
      get desc() { return `Explore any tile within ${CV.CFG.openFrontierRadius} tiles of a city, even if it is not next to known land.`; } },
    { id: 'surveyor', cat: 'Vision', name: "Surveyor's Eye", multi: true, relic: null,
      get desc() { return `See basic tile types up to ${CV.CFG.glimpseBase} tile${CV.CFG.glimpseBase === 1 ? '' : 's'} into the fog (+${CV.CFG.glimpseStep} per extra copy).`; } },
    { id: 'omen', cat: 'Vision', name: 'Omen Reading', multi: true, relic: null,
      get desc() { return `See that a special feature exists (not its type) up to ${CV.CFG.glimpseBase} tile${CV.CFG.glimpseBase === 1 ? '' : 's'} into the fog.`; } },
    { id: 'sight', cat: 'Vision', name: 'Ancient Sight', multi: true, relic: null,
      get desc() { return `See ancient sites up to ${CV.CFG.glimpseBase} tile${CV.CFG.glimpseBase === 1 ? '' : 's'} into the fog.`; } },
    { id: 'seafaring', cat: 'Vision', name: 'Seafaring', multi: false, relic: { n: 1, color: 'blue' },
      desc: 'Allows exploring ocean tiles.' },
    // Expansion
    { id: 'harbour', cat: 'Expansion', name: 'Harbour Founding', multi: false, relic: { n: 1, color: 'green' },
      desc: 'Allows founding cities on water tiles.' },
    { id: 'wider', cat: 'Expansion', name: 'Wider Borders', multi: true, relic: null,
      desc: 'Cities claim tiles one extra tile away, including existing cities. The oldest city wins ties.' },
    { id: 'legacy', cat: 'Expansion', name: 'Legacy of Distance', multi: true, relic: null,
      desc: 'Ancient site benefits scale with the site’s distance from the starting city.' },
    { id: 'trade', cat: 'Expansion', name: 'Trade Empire', multi: true, relic: null,
      get desc() { return `+${CV.CFG.tradeBonus} food, material and wealth for each city with a claimed tile bordering another city.`; } },
    { id: 'glorious', cat: 'Expansion', name: 'Glorious Capital', multi: true, relic: { n: 2, color: 'green' },
      get desc() { return `The oldest city makes +${CV.CFG.gloriousBonus} food, material and wealth for each other city within ${CV.CFG.gloriousRadius} tiles.`; } },
    // Blight
    { id: 'blightsight', cat: 'Blight', name: 'Blight Sight', multi: false, relic: null,
      get desc() { return `See blight up to ${CV.CFG.blightSightRange} tile${CV.CFG.blightSightRange === 1 ? '' : 's'} into the fog.`; } },
    { id: 'discernment', cat: 'Blight', name: 'Pustule Discernment', multi: false, relic: { n: 1, color: 'black' },
      desc: 'Tell pustules apart from ordinary blight.' },
    { id: 'fight', cat: 'Blight', name: 'Blight Fight', multi: false, relic: { n: 1, color: 'black' },
      desc: 'Ordinary blight on tiles you explore is cleansed.' },
    { id: 'burst', cat: 'Blight', name: 'Pustule Burst', multi: false, relic: { n: 2, color: 'black' },
      desc: 'Pustules on tiles you explore are destroyed.' },
  ];
})(globalThis.CV = globalThis.CV || {});
