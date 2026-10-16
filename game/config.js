(function (CV) {
  // All numbers marked TUNE are placeholders for playtesting.
  CV.CFG = {
    startFood: 12, startMaterials: 0, startWealth: 12,
    cityBaseCost: 40, cityCostGrowth: 1.45,       // TUNE: food, x1.45 per owned city
    exploreFreeDist: 3, exploreCostPerDist: 1.5,  // TUNE: wealth per tile of distance beyond the free ring
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
  CV.K = (x, y) => x * 131072 + y;               // |y| must stay < 65536
  CV.cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  CV.N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  CV.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
