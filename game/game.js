(function (CV) {
  const { K, CFG, RES, COLORS, N8, BASE_YIELD, PROJECTS, cheb } = CV;
  const SITE_KINDS = ['explore', 'features', 'city', 'cleanse'];

  class Game {
    constructor(seed) {
      this.seed = seed;
      this.world = new CV.World(seed);
      this.rng = CV.mulberry32(seed * 31 + 7);
      this.turn = 1;
      this.res = { food: CFG.startFood, materials: CFG.startMaterials, wealth: CFG.startWealth };
      this.cities = [];
      this.nextCityId = 1;
      this.claimed = new Map();     // tile key -> city id
      this.cityTiles = new Map();   // city id -> [{x,y,k}]
      this.known = new Set();
      this.near = new Map();        // hidden tile key -> Chebyshev distance to nearest known tile (<= glimpseMax)
      this.sites = new Map();       // found ancient sites: key -> {x,y}
      this.usedSites = new Set();
      this.deferredSites = new Set(); // activated sites whose benefit is still to be chosen
      this.siteOffers = new Map();
      this.overrides = new Map();   // features added by ancient sites
      this.blight = new Map();      // key -> {x,y,pustule}
      this.taken = {};              // project id -> times taken
      this.projectCount = 0;
      this.threshold = CFG.projectBase;
      this.projectOfferIds = null;
      this.exploredThisTurn = false;
      this.over = null;
      this.log = [];
      this.addCity(0, 0);
    }

    // ---------- persistence ----------
    // Site offers are deterministic per site, so they are rebuilt on demand rather than saved.
    serialize() {
      return {
        seed: this.seed, rng: this.rng.getState(), turn: this.turn, res: this.res,
        cities: this.cities, nextCityId: this.nextCityId,
        known: [...this.known], near: [...this.near], sites: [...this.sites], usedSites: [...this.usedSites],
        deferredSites: [...this.deferredSites], overrides: [...this.overrides], blight: [...this.blight], taken: this.taken,
        projectCount: this.projectCount, threshold: this.threshold, projectOfferIds: this.projectOfferIds,
        exploredThisTurn: this.exploredThisTurn, over: this.over, log: this.log,
      };
    }
    static restore(s) {
      const g = new Game(s.seed);
      g.rng.setState(s.rng); g.turn = s.turn; g.res = s.res;
      g.cities = s.cities; g.nextCityId = s.nextCityId;
      g.known = new Set(s.known); g.near = new Map(s.near); g.sites = new Map(s.sites); g.usedSites = new Set(s.usedSites);
      g.deferredSites = new Set(s.deferredSites || []);
      g.overrides = new Map(s.overrides); g.blight = new Map(s.blight); g.taken = s.taken;
      g.projectCount = s.projectCount; g.threshold = s.threshold; g.projectOfferIds = s.projectOfferIds;
      g.exploredThisTurn = s.exploredThisTurn; g.over = s.over; g.log = s.log;
      g.claimAll();
      return g;
    }

    say(msg) { this.log.push({ turn: this.turn, msg }); if (this.log.length > 60) this.log.shift(); }

    // ---------- knowledge ----------
    isKnown(x, y) { return this.known.has(K(x, y)); }
    feature(x, y) { return this.overrides.get(K(x, y)) || this.world.tile(x, y).feature; }
    reveal(x, y) {
      const k = K(x, y);
      if (this.known.has(k)) return;
      this.known.add(k); this.near.delete(k);
      const R = CFG.glimpseMax;
      for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
        if (!dx && !dy) continue;
        const nk = K(x + dx, y + dy);
        if (this.known.has(nk)) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const o = this.near.get(nk);
        if (o === undefined || d < o) this.near.set(nk, d);
      }
      if (this.world.tile(x, y).site) this.sites.set(k, { x, y });
    }
    revealArea(cx, cy, r) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) this.reveal(cx + dx, cy + dy);
    }
    // Irregular blob: the radius varies with angle (random harmonics, seeded) plus per-tile jitter,
    // and the blob's centre is nudged off the site so it is neither square nor symmetrical.
    revealBlob(cx, cy, r, rng) {
      const harm = [1, 2, 3, 5].map(n => ({ n, a: (rng() * 0.4 + 0.1) / Math.sqrt(n), p: rng() * Math.PI * 2 }));
      const ox = (rng() - 0.5) * r * 0.8, oy = (rng() - 0.5) * r * 0.8;
      const reach = Math.ceil(r * 2 + 2);
      this.reveal(cx, cy);
      for (let dx = -reach; dx <= reach; dx++) for (let dy = -reach; dy <= reach; dy++) {
        const ex = dx - ox, ey = dy - oy, d = Math.hypot(ex, ey), th = Math.atan2(ey, ex);
        let lim = r * 1.2;
        for (const h of harm) lim *= 1 + h.a * Math.sin(h.n * th + h.p) * 0.6;
        if (d + (rng() - 0.5) * 1.6 <= lim) this.reveal(cx + dx, cy + dy);
      }
    }
    range(id) {
      const n = this.taken[id] || 0;
      if (!n) return -1;
      if (id === 'blightsight') return CFG.blightSightRange;
      return Math.min(CFG.glimpseMax, CFG.glimpseBase + CFG.glimpseStep * (n - 1));
    }
    // What the player may see of a hidden tile: null if nothing.
    glimpse(x, y) {
      const d = this.near.get(K(x, y));
      if (d === undefined) return null;
      const g = { type: d <= this.range('surveyor'), feature: d <= this.range('omen'),
        site: d <= this.range('sight'), blight: d <= this.range('blightsight') };
      return (g.type || g.feature || g.site || g.blight) ? g : null;
    }

    // ---------- cities ----------
    claimAll() {
      this.claimed.clear(); this.cityTiles = new Map();
      const r = CFG.cityClaimRadius, corners = !!this.taken.wider;
      for (const c of this.cities) {
        const arr = []; this.cityTiles.set(c.id, arr);
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (!corners && Math.abs(dx) + Math.abs(dy) > 2 * r - 1) continue;
          const x = c.x + dx, y = c.y + dy, k = K(x, y);
          if (this.claimed.has(k)) continue;
          this.claimed.set(k, c.id); arr.push({ x, y, k });
          this.reveal(x, y);
        }
      }
    }
    addCity(x, y) {
      this.cities.push({ id: this.nextCityId++, x, y, founded: this.turn });
      this.claimAll();
    }
    cityCost() { return Math.ceil(CFG.cityBaseCost * Math.pow(CFG.cityCostGrowth, Math.max(0, this.cities.length - 1))); }
    placeProblem(x, y) {
      const k = K(x, y);
      if (!this.known.has(k)) return 'Unexplored';
      if (this.claimed.has(k)) return 'Already claimed';
      if (this.blight.has(k)) return 'Blighted';
      if (this.world.tile(x, y).type === 'ocean' && !this.taken.harbour) return 'Cannot found on water';
      return null;
    }
    canFound(x, y) {
      const cost = this.cityCost();
      if (this.over) return { ok: false, cost, reason: 'Game over' };
      const p = this.placeProblem(x, y);
      if (p) return { ok: false, cost, reason: p };
      if (this.res.food < cost) return { ok: false, cost, reason: `Need ${cost} food` };
      return { ok: true, cost };
    }
    found(x, y) {
      const c = this.canFound(x, y);
      if (!c.ok) return c;
      this.res.food -= c.cost;
      this.addCity(x, y);
      this.say(`City founded at ${x},${y}.`);
      return c;
    }

    // ---------- exploring ----------
    // Exploring spends all wealth; every exploreWealthPerTile of it reveals one extra tile.
    exploreBonus() { return Math.floor(this.res.wealth / CFG.exploreWealthPerTile); }
    // Hidden tiles touching the revealed patch, nearest the target first (seeded tie-break).
    extraTiles(x, y, n) {
      const patch = new Set();
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) patch.add(K(x + dx, y + dy));
      const out = [];
      for (let r = 2; out.length < n && r <= 2 + n; r++) {
        const ring = [];
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = x + dx, ty = y + dy;
          if (this.known.has(K(tx, ty))) continue;
          ring.push({ tx, ty, d: dx * dx + dy * dy, h: this.world.rnd(tx, ty, 21) });
        }
        ring.sort((a, b) => a.d - b.d || a.h - b.h);
        // a tile only qualifies once it touches the patch; newly added tiles can unlock the rest of the ring
        for (let again = true; again && out.length < n;) {
          again = false;
          for (let i = 0; i < ring.length && out.length < n; i++) {
            const t = ring[i];
            if (!N8.some(([ax, ay]) => patch.has(K(t.tx + ax, t.ty + ay)))) continue;
            patch.add(K(t.tx, t.ty)); out.push([t.tx, t.ty]); ring.splice(i, 1); again = true; break;
          }
        }
      }
      return out;
    }
    canExplore(x, y) {
      const cost = 0, bonus = this.exploreBonus();
      if (this.over) return { ok: false, cost, bonus, reason: 'Game over' };
      if (this.exploredThisTurn) return { ok: false, cost, bonus, reason: 'Already explored this turn' };
      const k = K(x, y), known = this.known.has(k);
      let unknownIn3x3 = !known;
      for (const [dx, dy] of N8) if (!this.known.has(K(x + dx, y + dy))) unknownIn3x3 = true;
      const open = this.taken.openfrontier && unknownIn3x3 &&
        this.cities.some(c => cheb(c.x, c.y, x, y) <= CFG.openFrontierRadius);
      // normally exploration starts from a revealed tile that still has hidden neighbours
      if (!(known && unknownIn3x3) && !open) {
        return { ok: false, cost, reason: known ? 'Nothing hidden next to this tile' : 'Explore from a revealed tile' };
      }
      if (this.world.tile(x, y).type === 'ocean' && !this.taken.seafaring) return { ok: false, cost, reason: 'Cannot explore ocean' };
      return { ok: true, cost, bonus };
    }
    explore(x, y) {
      const c = this.canExplore(x, y);
      if (!c.ok) return c;
      this.exploredThisTurn = true;
      this.res.wealth = 0; // exploring spends all wealth; the remainder is lost too
      let cleansed = 0;
      const tiles = this.extraTiles(x, y, c.bonus);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) tiles.push([x + dx, y + dy]);
      const found = { site: false, feature: false };
      for (const [tx, ty] of tiles) {
        const k = K(tx, ty);
        if (!this.known.has(k)) {
          if (this.world.tile(tx, ty).site) found.site = true;
          else if (this.feature(tx, ty)) found.feature = true;
        }
        this.reveal(tx, ty);
        const b = this.blight.get(k);
        if (!b) continue;
        if (b.pustule) {
          if (this.taken.burst) { this.blight.delete(k); this.say(`A pustule at ${tx},${ty} burst and was destroyed!`); }
        } else if (this.taken.fight) { this.blight.delete(k); cleansed++; }
      }
      if (cleansed) this.say(`Cleansed ${cleansed} blighted tile${cleansed > 1 ? 's' : ''}.`);
      return { ...c, found };
    }

    // ---------- economy ----------
    tileYield(x, y) {
      const out = {};
      if (this.blight.has(K(x, y))) return out;
      Object.assign(out, BASE_YIELD[this.world.tile(x, y).type]);
      const f = this.feature(x, y);
      if (f && f.kind === 'tile') for (const r of [].concat(f.res)) out[r] = (out[r] || 0) + f.amount;
      return out;
    }
    income() {
      const tot = { food: 0, materials: 0, wealth: 0 };
      const trade = this.taken.trade || 0, glor = this.taken.glorious || 0;
      this.cities.forEach((c, i) => {
        let touch = false;
        for (const t of this.cityTiles.get(c.id) || []) {
          if (this.blight.has(t.k)) continue;
          const y = this.tileYield(t.x, t.y);
          for (const r in y) tot[r] += y[r];
          if (trade && !touch) for (const [dx, dy] of N8) {
            const o = this.claimed.get(K(t.x + dx, t.y + dy));
            if (o !== undefined && o !== c.id) { touch = true; break; }
          }
        }
        if (trade && touch) RES.forEach(r => tot[r] += CFG.tradeBonus * trade);
        if (glor && i === 0) {
          const n = this.cities.filter(o => o !== c && cheb(o.x, o.y, c.x, c.y) <= CFG.gloriousRadius).length;
          RES.forEach(r => tot[r] += CFG.gloriousBonus * glor * n);
        }
      });
      return tot;
    }
    relicCount(color) {
      let n = 0;
      for (const tiles of this.cityTiles.values()) for (const t of tiles) {
        if (this.blight.has(t.k)) continue;
        const f = this.feature(t.x, t.y);
        if (f && f.kind === 'relic' && f.color === color) n++;
      }
      return n;
    }
    relicsOk(req) { return !req || this.relicCount(req.color) >= req.n; }

    // ---------- projects ----------
    projectAvailable() { return !this.over && this.res.materials >= this.threshold && this.availableProjects().length > 0; }
    availableProjects() { return PROJECTS.filter(p => p.multi || !this.taken[p.id]); }
    projectOffer() {
      if (!this.projectOfferIds) {
        const rng = CV.mulberry32(this.seed * 13 + this.projectCount * 101 + 5);
        const pool = this.availableProjects().slice();
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        // at most one offered project may require relics
        const pick = [];
        for (const p of pool) {
          if (pick.length === CFG.projectOfferSize) break;
          if (p.relic && pick.some(q => q.relic)) continue;
          pick.push(p);
        }
        if (pick.length && !pick.some(p => this.relicsOk(p.relic))) {
          const free = pool.find(p => !p.relic && !pick.includes(p));
          if (free) { if (pick.length < CFG.projectOfferSize) pick.push(free); else pick[pick.length - 1] = free; }
        }
        this.projectOfferIds = pick.map(p => p.id);
      }
      return this.projectOfferIds.map(id => PROJECTS.find(p => p.id === id));
    }
    chooseProject(id) {
      if (!this.projectAvailable()) return { ok: false, reason: 'Not enough materials' };
      const p = this.projectOffer().find(o => o.id === id);
      if (!p) return { ok: false, reason: 'Not offered' };
      if (!this.relicsOk(p.relic)) return { ok: false, reason: 'Missing relics' };
      this.res.materials -= this.threshold;
      this.threshold = Math.ceil(this.threshold * CFG.projectGrowth);
      this.taken[id] = (this.taken[id] || 0) + 1;
      this.projectCount++;
      this.projectOfferIds = null;
      if (id === 'wider') this.claimAll();
      this.say(`Project: ${p.name}.`);
      return { ok: true };
    }

    // ---------- ancient sites ----------
    legacyScale(x, y) { return 1 + (this.taken.legacy || 0) * cheb(x, y, 0, 0) * CFG.legacyPerDistance; }
    siteOffer(key) {
      let o = this.siteOffers.get(key);
      if (o) return o;
      const s = this.sites.get(key);
      const rng = CV.mulberry32(CV.hash3(s.x, s.y, 99) * 1e9 | 0);
      const kinds = SITE_KINDS.slice();
      for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      const opts = kinds.slice(0, CFG.siteOptionCount).map(id => ({ id, req: null }));
      const sc = this.legacyScale(s.x, s.y);
      const base = () => Math.round((CFG.siteBundleMin + rng() * CFG.siteBundleVariance) * sc);
      opts.push({ id: 'bundle', req: null, bundle: { food: base(), materials: base(), wealth: base() } });
      o = { x: s.x, y: s.y, options: opts };
      this.siteOffers.set(key, o);
      return o;
    }
    siteOptionStatus(key, opt) {
      const s = this.sites.get(key);
      if (this.usedSites.has(key)) return 'Used';
      if (opt.id === 'city') { const p = this.placeProblem(s.x, s.y); if (p) return p; }
      return null;
    }
    deferSite(key) {
      if (!this.sites.has(key) || this.usedSites.has(key) || this.over) return { ok: false, reason: 'Unavailable' };
      this.deferredSites.add(key);
      this.say('Ancient site activated: choose its benefit later.');
      return { ok: true };
    }
    activateSite(key, optId) {
      const s = this.sites.get(key);
      if (!s || this.over) return { ok: false, reason: 'Unavailable' };
      const opt = this.siteOffer(key).options.find(o => o.id === optId);
      if (!opt) return { ok: false, reason: 'No such option' };
      const bad = this.siteOptionStatus(key, opt);
      if (bad) return { ok: false, reason: bad };
      const sc = this.legacyScale(s.x, s.y);
      if (opt.id === 'bundle') {
        RES.forEach(r => this.res[r] += opt.bundle[r]);
        this.say(`Ancient site: gained ${opt.bundle.food} food, ${opt.bundle.materials} materials, ${opt.bundle.wealth} wealth.`);
      } else if (opt.id === 'explore') {
        this.revealBlob(s.x, s.y, CFG.siteExploreRadius, CV.mulberry32(CV.hash3(s.x, s.y, 13) * 1e9 | 0));
        this.say('Ancient site: a large area was revealed.');
      } else if (opt.id === 'features') {
        const rng = CV.mulberry32(CV.hash3(s.x, s.y, 7) * 1e9 | 0);
        let placed = 0, tries = 0;
        const fr = CFG.siteFeatureRadius;
        while (placed < CFG.siteFeatureCount && tries++ < 200) {
          const x = s.x + Math.floor(rng() * (2 * fr + 1)) - fr, y = s.y + Math.floor(rng() * (2 * fr + 1)) - fr, t = this.world.tile(x, y);
          if (t.site || this.feature(x, y) || (x === s.x && y === s.y)) continue;
          this.overrides.set(K(x, y), CV.makeFeature(rng(), t.type, sc));
          placed++;
        }
        this.say('Ancient site: two special features appeared nearby.');
      } else if (opt.id === 'city') {
        this.addCity(s.x, s.y);
        this.say(`Ancient site: a free city at ${s.x},${s.y}.`);
      } else if (opt.id === 'cleanse') {
        let n = 0;
        for (const [k, b] of [...this.blight]) if (cheb(b.x, b.y, s.x, s.y) <= CFG.cleanseRadius) { this.blight.delete(k); n++; }
        this.say(`Ancient site: ${n} blighted tiles cleansed.`);
      }
      this.usedSites.add(key);
      this.deferredSites.delete(key);
      return { ok: true };
    }

    // ---------- blight ----------
    pustuleCount() { let n = 0; for (const b of this.blight.values()) if (b.pustule) n++; return n; }
    nextPustuleTurn() {
      if (this.turn < CFG.blightStart) return CFG.blightStart;
      return Math.ceil(this.turn / CFG.blightEvery) * CFG.blightEvery;
    }
    spawnPustule() {
      // any undiscovered tile within blightSpawnRange of known land (this.near tracks distance, up to glimpseMax)
      const hidden = [...this.near].filter(([k, d]) => d <= CFG.blightSpawnRange && !this.known.has(k) && !this.claimed.has(k) && !this.blight.has(k)).map(([k]) => k);
      if (!hidden.length) return;
      const k = hidden[Math.floor(this.rng() * hidden.length)];
      const y = ((k % 131072) + 131072 + 65536) % 131072 - 65536, x = (k - y) / 131072;
      this.blight.set(k, { x, y, pustule: true });
    }
    spreadBlight() {
      const pustules = [...this.blight].filter(([, b]) => b.pustule);
      for (const [pk, p] of pustules) {
        if (!this.blight.has(pk)) continue;
        const seen = new Set([pk]), queue = [p], front = new Map();
        for (let i = 0; i < queue.length; i++) {
          const b = queue[i];
          for (const [dx, dy] of N8) {
            const x = b.x + dx, y = b.y + dy, k = K(x, y);
            if (seen.has(k)) continue;
            seen.add(k);
            const nb = this.blight.get(k);
            if (nb) queue.push(nb); else front.set(k, { x, y });
          }
        }
        const cand = [...front];
        for (let n = 0; n < CFG.blightSpread && cand.length; n++) {
          const i = Math.floor(this.rng() * cand.length);
          const [k, t] = cand[i]; cand[i] = cand[cand.length - 1]; cand.pop();
          this.blight.set(k, { x: t.x, y: t.y, pustule: false });
        }
      }
    }

    // ---------- turns ----------
    progress() {
      return { cities: this.cities.length, sites: this.sites.size, projects: this.projectCount };
    }
    checkWin() {
      const p = this.progress();
      if (p.cities >= CFG.winCities) return 'cities';
      if (p.sites >= CFG.winSites) return 'sites';
      if (p.projects >= CFG.winProjects) return 'projects';
      return null;
    }
    endTurn() {
      if (this.over) return;
      const w = this.checkWin();
      if (w) { this.over = { won: true, how: w, turn: this.turn }; return; }
      if (this.turn >= CFG.blightStart && this.turn % CFG.blightEvery === 0) {
        this.spawnPustule(); this.say('Blight stirs somewhere in the world...');
      }
      this.spreadBlight();
      for (const c of [...this.cities]) {
        if (this.blight.has(K(c.x, c.y))) {
          this.cities.splice(this.cities.indexOf(c), 1);
          this.say(`The city at ${c.x},${c.y} was lost to blight!`);
        }
      }
      if (!this.cities.length) { this.over = { won: false, turn: this.turn }; return; }
      this.claimAll();
      this.turn++;
      this.exploredThisTurn = false;
      const inc = this.income();
      RES.forEach(r => this.res[r] += inc[r]);
    }
  }
  CV.Game = Game;
})(globalThis.CV = globalThis.CV || {});
