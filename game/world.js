(function (CV) {
  const { K, CFG, RES } = CV;

  function hash3(a, b, c) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483629);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  // Pick a feature valid on this base tile type from one uniform random. scale multiplies bonus amounts.
  // hidden picks from the hidden features instead of the normal ones.
  CV.makeFeature = function (u, type, scale, hidden) {
    scale = scale || 1;
    const pool = CV.FEATURES.filter(f => f.kind === 'tile' && f.on.includes(type) && !f.hidden === !hidden);
    const d = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(u * pool.length)))];
    const base = d.hidden ? CFG.hiddenFeatureAmount : Array.isArray(d.res) ? CFG.allFeatureAmount : CFG.tileFeatureAmount;
    return { id: d.id, name: d.name, kind: d.kind, res: d.res, hidden: d.hidden, amount: Math.max(1, Math.round(base * scale)) };
  };
  CV.makeRuins = function () {
    const d = CV.FEATURES.find(f => f.id === 'ruins');
    return { id: d.id, name: d.name, kind: d.kind };
  };

  class World {
    constructor(seed) {
      this.seed = seed;
      this.cache = new Map();
      this.makeBlob();
      this.makeTemple();
      this.makeRuinTrail();
    }
    // Ancient Temple: a 3x3 block whose centre lies templeMinDistance..templeMaxDistance (Chebyshev) from the start.
    // The centre is kept one tile inside that band so every temple tile is within it.
    makeTemple() {
      const rng = CV.mulberry32(this.seed * 613 + 5);
      const lo = CFG.templeMinDistance + 1, hi = Math.max(lo, CFG.templeMaxDistance - 1);
      const d = lo + Math.floor(rng() * (hi - lo + 1));
      const along = Math.floor(rng() * (2 * d + 1)) - d, side = Math.floor(rng() * 4);
      const [x, y] = [[along, -d], [d, along], [along, d], [-d, along]][side];
      this.temple = { x, y };
    }
    isTemple(x, y) { return CV.cheb(x, y, this.temple.x, this.temple.y) <= 1; }
    // Ruins: a wandering trail from near the start to the temple. The first ruin lies ruinTrailStartMin..Max from the
    // start in any direction; each next one is ruinStepMin..Max further on, heading for the temple give or take
    // ruinWander radians. Points in the sea move to the nearest land within ruinLandSearch, or are skipped.
    // ruinNext maps each ruin to the tile it points at: the next ruin, or the temple for the last one.
    makeRuinTrail() {
      const rng = CV.mulberry32(this.seed * 389 + 11), t = this.temple;
      const trail = [], used = new Set();
      const place = (px, py) => {
        for (let r = 0; r <= CFG.ruinLandSearch; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = px + dx, y = py + dy, k = K(x, y);
          if (used.has(k) || CV.cheb(x, y, 0, 0) < CFG.startSafeRadius || CV.cheb(x, y, t.x, t.y) <= 1) continue;
          if (this.terrain(x, y, k) === 'ocean') continue;
          used.add(k); trail.push({ x, y });
          return [x, y];
        }
        return [px, py];
      };
      const a0 = rng() * 2 * Math.PI, d0 = CFG.ruinTrailStartMin + rng() * (CFG.ruinTrailStartMax - CFG.ruinTrailStartMin);
      let [x, y] = place(Math.round(Math.cos(a0) * d0), Math.round(Math.sin(a0) * d0));
      for (let guard = 0; CV.cheb(x, y, t.x, t.y) > CFG.ruinStepMax && guard < 10000; guard++) {
        const a = Math.atan2(t.y - y, t.x - x) + (rng() * 2 - 1) * CFG.ruinWander;
        const len = CFG.ruinStepMin + rng() * (CFG.ruinStepMax - CFG.ruinStepMin);
        [x, y] = place(x + Math.round(Math.cos(a) * len), y + Math.round(Math.sin(a) * len));
      }
      this.ruinTrail = trail;
      this.ruinNext = new Map(trail.map((p, i) => [K(p.x, p.y), trail[i + 1] || t]));
    }
    rnd(x, y, salt) { return hash3(x, y, salt * 7919 + this.seed * 131); }
    noise(x, y, scale, salt) {
      const gx = Math.floor(x / scale), gy = Math.floor(y / scale);
      const fx = x / scale - gx, fy = y / scale - gy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = this.rnd(gx, gy, salt), b = this.rnd(gx + 1, gy, salt);
      const c = this.rnd(gx, gy + 1, salt), d = this.rnd(gx + 1, gy + 1, salt);
      return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
    // Starting landmass: 50-80 connected land tiles around (0,0), never desert.
    makeBlob() {
      const rng = CV.mulberry32(this.seed * 977 + 1);
      const target = CFG.blobMin + Math.floor(rng() * CFG.blobVariance);
      const members = [[0, 0]];
      this.blob = new Set([K(0, 0)]);
      const four = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let guard = 0;
      while (members.length < target && guard++ < 20000) {
        const [mx, my] = members[Math.floor(rng() * members.length)];
        const [dx, dy] = four[Math.floor(rng() * 4)];
        const x = mx + dx, y = my + dy, k = K(x, y);
        if (this.blob.has(k)) continue;
        let n = 0;
        for (const [ax, ay] of four) if (this.blob.has(K(x + ax, y + ay))) n++;
        if (n < 2 && rng() > CFG.blobFillChance) continue;
        this.blob.add(k); members.push([x, y]);
      }
      this.ring = new Set();
      for (const [x, y] of members) for (const [dx, dy] of CV.N8) {
        const k = K(x + dx, y + dy);
        if (!this.blob.has(k)) this.ring.add(k);
      }
    }
    tile(x, y) {
      const k = K(x, y);
      let t = this.cache.get(k);
      if (!t) { t = this.gen(x, y, k); this.cache.set(k, t); }
      return t;
    }
    landType(x, y) {
      const m = this.noise(x, y, 7, 4);
      return m < CFG.mountainBelow ? 'mountains' : m < CFG.forestBelow ? 'forest' : 'plains';
    }
    // base terrain type, without temple, features or sites
    terrain(x, y, k) {
      if (this.blob.has(k)) return this.landType(x, y);
      const e = 0.6 * this.noise(x, y, 16, 1) + 0.4 * this.noise(x, y, 6, 2);
      let land = e >= CFG.landThreshold;
      if (!land && this.ring.has(k) && this.rnd(x, y, 3) < CFG.ringLandChance) land = true;
      if (!land) return 'ocean';
      if (this.noise(x, y, 20, 5) > CFG.desertThreshold && !this.ring.has(k)) return 'desert';
      return this.landType(x, y);
    }
    gen(x, y, k) {
      // temple tiles are plain land with nothing else on them
      if (this.isTemple(x, y)) return { x, y, type: 'plains', feature: null, hidden: null, site: false, temple: true };
      const type = this.terrain(x, y, k);
      // trail ruins replace whatever else the tile would have held
      if (this.ruinNext.has(k)) return { x, y, type, feature: CV.makeRuins(), hidden: null, site: false };
      let feature = null, hidden = null, site = false;
      if (CV.cheb(x, y, 0, 0) >= CFG.startSafeRadius) {
        if (type !== 'ocean' && CV.cheb(x, y, 0, 0) >= CFG.siteMinDistance && this.rnd(x, y, 12) < CFG.siteChance) site = true;
        else if (this.rnd(x, y, 10) < CFG.featureChance) feature = CV.makeFeature(this.rnd(x, y, 11), type, 1);
        // hidden features use their own rolls so they don't change the rest of the world
        else if (CV.FEATURES.some(f => f.hidden && f.on.includes(type)) && this.rnd(x, y, 14) < CFG.hiddenFeatureChance) {
          hidden = CV.makeFeature(this.rnd(x, y, 15), type, 1, true);
        }
      }
      return { x, y, type, feature, hidden, site };
    }
  }
  CV.World = World;
  CV.hash3 = hash3;
})(globalThis.CV = globalThis.CV || {});
