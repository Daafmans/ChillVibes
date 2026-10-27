(function (CV) {
  const { K, CFG, RES, COLORS } = CV;

  function hash3(a, b, c) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483629);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  // Pick a feature valid on this base tile type from one uniform random. scale multiplies bonus amounts (not relics).
  // The lowest relicShare of u picks a relic, the rest picks an ordinary tile feature.
  // noRelics excludes relics entirely (used for features created by ancient sites).
  CV.makeFeature = function (u, type, scale, noRelics) {
    scale = scale || 1;
    const valid = CV.FEATURES.filter(f => f.on.includes(type) && !(noRelics && f.kind === 'relic'));
    const relics = valid.filter(f => f.kind === 'relic'), tiles = valid.filter(f => f.kind !== 'relic');
    const isRelic = relics.length && (!tiles.length || u < CFG.relicShare);
    const pool = isRelic ? relics : tiles;
    if (isRelic && tiles.length) u /= CFG.relicShare; else if (tiles.length && relics.length) u = (u - CFG.relicShare) / (1 - CFG.relicShare);
    const d = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(u * pool.length)))];
    const f = { id: d.id, name: d.name, kind: d.kind };
    if (d.kind === 'relic') f.color = d.color;
    else {
      f.res = d.res;
      const base = Array.isArray(d.res) ? CFG.allFeatureAmount : CFG.tileFeatureAmount;
      f.amount = Math.max(1, Math.round(base * scale));
    }
    return f;
  };

  class World {
    constructor(seed) {
      this.seed = seed;
      this.cache = new Map();
      this.makeBlob();
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
    gen(x, y, k) {
      let type;
      if (this.blob.has(k)) type = this.landType(x, y);
      else {
        const e = 0.6 * this.noise(x, y, 16, 1) + 0.4 * this.noise(x, y, 6, 2);
        let land = e >= CFG.landThreshold;
        if (!land && this.ring.has(k) && this.rnd(x, y, 3) < CFG.ringLandChance) land = true;
        if (!land) type = 'ocean';
        else if (this.noise(x, y, 20, 5) > CFG.desertThreshold && !this.ring.has(k)) type = 'desert';
        else type = this.landType(x, y);
      }
      let feature = null, site = false;
      if (CV.cheb(x, y, 0, 0) >= CFG.startSafeRadius) {
        if (type !== 'ocean' && CV.cheb(x, y, 0, 0) >= CFG.siteMinDistance && this.rnd(x, y, 12) < CFG.siteChance) site = true;
        else if (this.rnd(x, y, 10) < CFG.featureChance) feature = CV.makeFeature(this.rnd(x, y, 11), type, 1);
      }
      return { x, y, type, feature, site };
    }
  }
  CV.World = World;
  CV.hash3 = hash3;
})(globalThis.CV = globalThis.CV || {});
