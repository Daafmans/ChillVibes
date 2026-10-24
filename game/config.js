(function (CV) {
  // All numbers marked TUNE are placeholders for playtesting.
  CV.CFG = {
    startFood: 12, startMaterials: 0, startWealth: 12,
    cityBaseCost: 40, cityCostGrowth: 1.45,       // TUNE: food, x1.45 per owned city
    exploreWealthPerTile: 10,                     // TUNE: exploring spends all wealth; each 10 spent reveals one extra tile
    projectBase: 60, projectGrowth: 1.4,          // TUNE: materials threshold, multiplicative
    blightStart: 30, blightEvery: 10,
    blightSpawnRadius: 20, blightSpread: 3,       // TUNE: tiles gained per pustule per turn
    cleanseRadius: 30, openFrontierRadius: 20,
    glimpseBase: 5, glimpseStep: 2, glimpseMax: 15,
    siteChance: 0.008, featureChance: 0.08,
    winCities: 20, winSites: 20, winProjects: 20,
  };
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
    plains: { food: 2, wealth: 1 },
    forest: { food: 1, materials: 2 },
    mountains: { materials: 2, wealth: 1 },
    ocean: { food: 1, wealth: 1, materials: 1 },
    desert: { materials: 1 },
  };
  CV.PROJECTS = [
    // Vision
    { id: 'openfrontier', cat: 'Vision', name: 'Open Frontier', multi: false, relic: null,
      desc: 'Explore any tile within 20 tiles of a city, even if it is not next to known land.' },
    { id: 'surveyor', cat: 'Vision', name: "Surveyor's Eye", multi: true, relic: null,
      desc: 'See basic tile types up to 5 tiles into the fog (+2 per extra copy).' },
    { id: 'omen', cat: 'Vision', name: 'Omen Reading', multi: true, relic: null,
      desc: 'See that a special feature exists (not its type) up to 5 tiles into the fog.' },
    { id: 'sight', cat: 'Vision', name: 'Ancient Sight', multi: true, relic: null,
      desc: 'See ancient sites up to 5 tiles into the fog.' },
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
      desc: '+1 food, material and wealth for each city with a claimed tile bordering another city.' },
    { id: 'glorious', cat: 'Expansion', name: 'Glorious Capital', multi: true, relic: { n: 2, color: 'green' },
      desc: 'The oldest city makes +3 food, material and wealth for each other city within 10 tiles.' },
    // Blight
    { id: 'blightsight', cat: 'Blight', name: 'Blight Sight', multi: false, relic: null,
      desc: 'See blight up to 5 tiles into the fog.' },
    { id: 'discernment', cat: 'Blight', name: 'Pustule Discernment', multi: false, relic: { n: 1, color: 'black' },
      desc: 'Tell pustules apart from ordinary blight.' },
    { id: 'fight', cat: 'Blight', name: 'Blight Fight', multi: false, relic: { n: 1, color: 'black' },
      desc: 'Ordinary blight on tiles you explore is cleansed.' },
    { id: 'burst', cat: 'Blight', name: 'Pustule Burst', multi: false, relic: { n: 2, color: 'black' },
      desc: 'Pustules on tiles you explore are destroyed.' },
  ];
})(globalThis.CV = globalThis.CV || {});
