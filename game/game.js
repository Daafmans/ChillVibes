(function (CV) {
  const { K, CFG, RES, N8, N4, BASE_YIELD, PROJECTS, cheb } = CV;
  const SITE_KINDS = ['explore', 'features', 'settlement', 'cleanse'];

  class Game {
    constructor(seed) {
      this.seed = seed;
      this.world = new CV.World(seed);
      this.rng = CV.mulberry32(seed * 31 + 7);
      this.turn = 1;
      this.res = { food: CFG.startFood, materials: CFG.startMaterials, wealth: CFG.startWealth };
      this.settlements = [];
      this.fallen = [];             // settlements destroyed by blight: keep their claimed tiles, but no longer count or produce
      this.nextSettlementId = 1;
      this.claimed = new Map();     // tile key -> settlement id
      this.settlementTiles = new Map();   // settlement id -> [{x,y,k}]
      this.known = new Set();
      this.near = new Map();        // hidden tile key -> Chebyshev distance to nearest known tile (<= glimpseMax)
      this.sites = new Map();       // found ancient sites: key -> {x,y}
      this.siteUses = new Map();    // site key -> times activated
      this.deferredSites = new Set(); // activated sites whose benefit is still to be chosen
      this.siteOffers = new Map();
      this.awakened = 0;            // ancient site activations spent on Awaken (Ancient Rites)
      this.overrides = new Map();   // features added by ancient sites
      this.blight = new Map();      // key -> {x,y,pustule}
      this.taken = {};              // project id -> times taken
      this.projectCount = 0;
      this.threshold = CFG.projectBase;
      this.exploredThisTurn = false;
      this.over = null;
      this.log = [];
      this.addSettlement(0, 0);
    }

    // ---------- persistence ----------
    // Site offers are deterministic per site, so they are rebuilt on demand rather than saved.
    serialize() {
      return {
        seed: this.seed, rng: this.rng.getState(), turn: this.turn, res: this.res,
        settlements: this.settlements, fallen: this.fallen, nextSettlementId: this.nextSettlementId,
        known: [...this.known], near: [...this.near], sites: [...this.sites], siteUses: [...this.siteUses],
        deferredSites: [...this.deferredSites], awakened: this.awakened, overrides: [...this.overrides], blight: [...this.blight], taken: this.taken,
        projectCount: this.projectCount, threshold: this.threshold,
        exploredThisTurn: this.exploredThisTurn, over: this.over, log: this.log,
      };
    }
    static restore(s) {
      const g = new Game(s.seed);
      g.rng.setState(s.rng); g.turn = s.turn; g.res = s.res;
      g.settlements = s.settlements; g.fallen = s.fallen || []; g.nextSettlementId = s.nextSettlementId;
      g.known = new Set(s.known); g.near = new Map(s.near); g.sites = new Map(s.sites); g.siteUses = new Map(s.siteUses || (s.usedSites || []).map(k => [k, 1]));
      g.deferredSites = new Set(s.deferredSites || []); g.awakened = s.awakened || 0;
      g.overrides = new Map(s.overrides); g.blight = new Map(s.blight); g.taken = s.taken;
      g.projectCount = s.projectCount; g.threshold = s.threshold;      g.exploredThisTurn = s.exploredThisTurn; g.over = s.over; g.log = s.log;
      g.claimAll();
      return g;
    }

    say(msg) { this.log.push({ turn: this.turn, msg }); if (this.log.length > 60) this.log.shift(); }

    // ---------- knowledge ----------
    isKnown(x, y) { return this.known.has(K(x, y)); }
    feature(x, y) { return this.overrides.get(K(x, y)) || this.worldFeature(x, y); }
    // The generated feature, including a hidden one once its project is taken (Deep Wells).
    worldFeature(x, y) {
      const t = this.world.tile(x, y);
      return t.feature || (t.hidden && this.taken[t.hidden.hidden] ? t.hidden : null);
    }
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
      const t = this.world.tile(x, y);
      if (t.site) this.sites.set(k, { x, y });
      // exploring any Ancient Temple tile reveals the whole temple
      if (t.temple) this.revealArea(this.world.temple.x, this.world.temple.y, 1);
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

    // ---------- settlements ----------
    claimAll() {
      this.claimed.clear(); this.settlementTiles = new Map();
      const r = CFG.settlementClaimRadius;
      // claim in founding order so a settlement destroyed by blight keeps exactly the tiles it had
      for (const c of this.settlements.concat(this.fallen).sort((a, b) => a.id - b.id)) {
        const arr = []; this.settlementTiles.set(c.id, arr);
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > 2 * r - 1) continue;
          const x = c.x + dx, y = c.y + dy, k = K(x, y);
          if (this.claimed.has(k)) continue;
          this.claimed.set(k, c.id); arr.push({ x, y, k });
          this.reveal(x, y);
        }
      }
    }
    settlementById(id) { return this.settlements.find(s => s.id === id) || this.fallen.find(s => s.id === id); }
    addSettlement(x, y) {
      this.settlements.push({ id: this.nextSettlementId++, x, y, founded: this.turn });
      this.claimAll();
    }
    settlementCost() { return Math.ceil(CFG.settlementBaseCost * Math.pow(CFG.settlementCostGrowth, Math.max(0, this.settlements.length - 1))); }
    placeProblem(x, y) {
      const k = K(x, y);
      if (!this.known.has(k)) return 'Unexplored';
      if (this.claimed.has(k)) return 'Already claimed';
      if (this.blight.has(k)) return 'Blighted';
      if (this.world.tile(x, y).type === 'ocean' && !this.taken.harbour) return 'Cannot found on water';
      return null;
    }
    canFound(x, y) {
      const cost = this.settlementCost();
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
      this.addSettlement(x, y);
      this.say(`Settlement founded at ${x},${y}.`);
      return c;
    }

    // ---------- upgrades ----------
    upgradeOffer() { return CV.UPGRADES.filter(u => this.taken[u.project]); }
    upgradeCount(id) { return this.settlements.filter(c => c.upgrade === id).length; }
    canUpgrade(sid, uid) {
      const cost = CFG.upgradeCost, c = this.settlements.find(s => s.id === sid);
      if (this.over) return { ok: false, cost, reason: 'Game over' };
      if (!c) return { ok: false, cost, reason: 'No settlement here' };
      if (c.upgrade) return { ok: false, cost, reason: 'Already upgraded' };
      if (!this.upgradeOffer().some(u => u.id === uid)) return { ok: false, cost, reason: 'Not unlocked' };
      if (this.res.wealth < cost) return { ok: false, cost, reason: `Need ${cost} wealth` };
      return { ok: true, cost };
    }
    upgrade(sid, uid) {
      const c = this.canUpgrade(sid, uid);
      if (!c.ok) return c;
      this.res.wealth -= c.cost;
      this.settlements.find(s => s.id === sid).upgrade = uid;
      this.say(`Settlement #${sid} upgraded: ${CV.UPGRADES.find(u => u.id === uid).name}.`);
      return c;
    }

    // ---------- exploring ----------
    // Each Survey Post reveals extra tiles next to the 3x3 patch on every exploration.
    exploreBonus() { return this.upgradeCount('surveypost') * CFG.surveyPostTiles; }
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
    // The n hidden tiles closest to (x, y) (Euclidean, seeded tie-break). Scans past the first hit ring so
    // nearer tiles in an outer Chebyshev ring aren't missed.
    nearestHidden(x, y, n) {
      const cand = [];
      let stop = CFG.wayfinderMaxRadius;
      for (let r = 1; r <= stop; r++) {
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = x + dx, ty = y + dy;
          if (!this.known.has(K(tx, ty))) cand.push({ tx, ty, d: dx * dx + dy * dy, h: this.world.rnd(tx, ty, 22) });
        }
        if (cand.length >= n && stop === CFG.wayfinderMaxRadius) stop = Math.min(stop, Math.ceil(r * Math.SQRT2));
      }
      cand.sort((a, b) => a.d - b.d || a.h - b.h);
      return cand.slice(0, n).map(t => [t.tx, t.ty]);
    }
    // Wayfinders: each Survey Post reveals the closest hidden tiles around it every turn.
    wayfind() {
      if (!this.taken.wayfinders) return;
      for (const c of this.settlements) {
        if (c.upgrade !== 'surveypost') continue;
        for (const [tx, ty] of this.nearestHidden(c.x, c.y, CFG.wayfinderTiles)) this.reveal(tx, ty);
      }
    }
    // Desert Survey: every desert tile 8-connected to (x, y), capped for safety.
    desertRegion(x, y) {
      const seen = new Set([K(x, y)]), out = [[x, y]];
      for (let i = 0; i < out.length && out.length < CFG.desertSurveyMax; i++) {
        const [cx, cy] = out[i];
        for (const [dx, dy] of N8) {
          const tx = cx + dx, ty = cy + dy, k = K(tx, ty);
          if (seen.has(k)) continue;
          seen.add(k);
          if (this.world.tile(tx, ty).type === 'desert') out.push([tx, ty]);
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
        this.settlements.some(c => cheb(c.x, c.y, x, y) <= CFG.openFrontierRadius);
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
      const tiles = this.extraTiles(x, y, c.bonus);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) tiles.push([x + dx, y + dy]);
      if (this.taken.dunes && this.world.tile(x, y).type === 'desert') tiles.push(...this.desertRegion(x, y));
      const found = { temple: false, site: false, feature: false };
      for (const [tx, ty] of tiles) {
        const k = K(tx, ty);
        if (!this.known.has(k)) {
          if (this.world.tile(tx, ty).temple) found.temple = true;
          else if (this.world.tile(tx, ty).site) found.site = true;
          else if (this.feature(tx, ty)) found.feature = true;
        }
        this.reveal(tx, ty);
      }
      return { ...c, found };
    }

    // ---------- economy ----------
    tileYield(x, y) {
      const out = {};
      const cid = this.claimed.get(K(x, y));
      if (this.fallen.some(c => c.id === cid)) {
        // Dwell in the Rot: a destroyed Scavenger still yields from its blighted tiles; other destroyed land yields nothing
        const c = this.settlementById(cid);
        if (this.taken.dwell && c.upgrade === 'scavenger' && this.blight.has(K(x, y))) RES.forEach(r => out[r] = 1);
        return out;
      }
      if (this.blight.has(K(x, y))) {
        const owner = this.settlementById(cid);
        if (owner && owner.upgrade === 'scavenger') RES.forEach(r => out[r] = 1);
        return out;
      }
      const type = this.world.tile(x, y).type;
      Object.assign(out, BASE_YIELD[type]);
      // Desert Bloom: desert tiles claimed by an upgraded settlement yield 1 of each resource
      if (type === 'desert') {
        const owner = this.settlementById(this.claimed.get(K(x, y)));
        if (owner && owner.upgrade === 'desertbloom') RES.forEach(r => out[r] = 1);
      }
      const f = this.feature(x, y);
      const owner = this.settlementById(this.claimed.get(K(x, y)));
      const artisan = owner && owner.upgrade === 'artisanquarter';
      if (f && f.kind === 'tile') {
        // Artisan Quarter: special tile bonuses are doubled for the owning settlement
        const mult = artisan ? 2 : 1;
        for (const r of [].concat(f.res)) out[r] = (out[r] || 0) + f.amount * mult;
      }
      // Relic Restoration: Artisan Quarters profit from claimed ancient sites and ruins
      if (artisan && this.taken.relics) {
        if (this.world.tile(x, y).site) out.materials = (out.materials || 0) + CFG.relicSiteMaterials;
        if (f && f.kind === 'ruins') out.wealth = (out.wealth || 0) + CFG.relicRuinsWealth;
      }
      return out;
    }
    // Per-turn yield of one living settlement: its tiles plus trade and capital bonuses.
    settlementYield(c) {
      const tot = { food: 0, materials: 0, wealth: 0 };
      const trade = c.upgrade === 'tradingpost', neighbours = new Set();
      for (const t of this.settlementTiles.get(c.id) || []) {
        const y = this.tileYield(t.x, t.y);
        for (const r in y) tot[r] += y[r];
        if (this.blight.has(t.k)) continue;
        if (trade) for (const [dx, dy] of N4) {
          const o = this.claimed.get(K(t.x + dx, t.y + dy));
          if (o !== undefined && o !== c.id && !this.fallen.some(f => f.id === o)) neighbours.add(o);
        }
      }
      // Market Town: a bordering Market Town counts as marketTownWeight settlements
      let partners = 0;
      for (const o of neighbours) partners += (this.settlementById(o) || {}).upgrade === 'markettown' ? CFG.marketTownWeight : 1;
      if (partners) RES.forEach(r => tot[r] += Math.round(CFG.tradeBonus * partners));
      const glor = this.taken.glorious || 0;
      if (glor && c === this.settlements[0]) {
        const n = this.settlements.filter(o => o !== c && cheb(o.x, o.y, c.x, c.y) <= CFG.gloriousRadius).length;
        RES.forEach(r => tot[r] += CFG.gloriousBonus * glor * n);
      }
      return tot;
    }
    income() {
      const tot = { food: 0, materials: 0, wealth: 0 };
      for (const c of this.settlements) {
        const y = this.settlementYield(c);
        for (const r in y) tot[r] += y[r];
      }
      // Dwell in the Rot: destroyed Scavengers keep yielding from their blighted tiles (tileYield), without trade or capital bonuses
      for (const c of this.fallen) for (const t of this.settlementTiles.get(c.id) || []) {
        const y = this.tileYield(t.x, t.y);
        for (const r in y) tot[r] += y[r];
      }
      return tot;
    }
    // ---------- projects ----------
    projectAvailable() { return !this.over && this.res.materials >= this.threshold; }
    unlocked(p) { return !p.parent || !!this.taken[p.parent]; }
    // A repeatable project that another copy would no longer improve.
    maxed(id) {
      if (id === 'bounty') return CFG.siteOptionCount + (this.taken.bounty || 0) * CFG.bountyOptions >= SITE_KINDS.length;
      return false;
    }
    // Tree: roots plus children of taken projects; one-time projects drop out once taken, repeatable ones once maxed.
    projectOffer() {
      return PROJECTS.filter(p => this.unlocked(p) && (p.multi ? !this.maxed(p.id) : !this.taken[p.id]));
    }
    chooseProject(id) {
      if (!this.projectAvailable()) return { ok: false, reason: 'Not enough materials' };
      const p = this.projectOffer().find(o => o.id === id);
      if (!p) return { ok: false, reason: 'Not offered' };
      this.res.materials -= this.threshold;
      this.taken[id] = (this.taken[id] || 0) + 1;
      this.threshold = Math.ceil(this.threshold * CFG.projectGrowth);
      this.projectCount++;
      if (id === 'bounty' || id === 'rites') this.siteOffers.clear(); // offers are seeded per site, so rebuilding only adds the extra option
      this.say(`Project: ${p.name}.`);
      return { ok: true };
    }

    // ---------- ancient sites ----------
    legacyScale(x, y) { return 1 + (this.taken.legacy || 0) * cheb(x, y, 0, 0) * CFG.legacyPerDistance; }
    // A site can be activated once, plus once more per Shrine Keeper settlement within range.
    siteAllowed(key) {
      const s = this.sites.get(key);
      return 1 + this.settlements.filter(c => c.upgrade === 'shrinekeeper' && cheb(c.x, c.y, s.x, s.y) <= CFG.shrineKeeperRadius).length;
    }
    siteUsed(key) { return (this.siteUses.get(key) || 0) >= this.siteAllowed(key); }
    siteOffer(key) {
      let o = this.siteOffers.get(key);
      if (o) return o;
      const s = this.sites.get(key);
      const rng = CV.mulberry32(CV.hash3(s.x, s.y, 99) * 1e9 | 0);
      const kinds = SITE_KINDS.slice();
      for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      const n = CFG.siteOptionCount + (this.taken.bounty || 0) * CFG.bountyOptions;
      const opts = kinds.slice(0, n).map(id => ({ id }));
      // the bundle is a single resource, rolled after the shuffle so Bountiful Sites copies don't change it
      const sc = this.legacyScale(s.x, s.y);
      const res = RES[Math.floor(rng() * RES.length)];
      opts.push({ id: 'bundle', bundle: { [res]: Math.round((CFG.siteBundleMin + rng() * CFG.siteBundleVariance) * sc) } });
      if (this.taken.rites) opts.push({ id: 'awaken' });
      o ={ x: s.x, y: s.y, options: opts };
      this.siteOffers.set(key, o);
      return o;
    }
    siteOptionStatus(key, opt) {
      const s = this.sites.get(key);
      if (this.siteUsed(key)) return 'Used';
      if (opt.id === 'settlement') { const p = this.placeProblem(s.x, s.y); if (p) return p; }
      return null;
    }
    deferSite(key) {
      if (!this.sites.has(key) || this.siteUsed(key) || this.over) return { ok: false, reason: 'Unavailable' };
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
        const [r, amt] = Object.entries(opt.bundle)[0];
        this.res[r] += amt;
        this.say(`Ancient site: gained ${amt} ${r}.`);
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
      } else if (opt.id === 'settlement') {
        this.addSettlement(s.x, s.y);
        this.say(`Ancient site: a free settlement was founded.`);
      } else if (opt.id === 'cleanse') {
        let n = 0;
        for (const [k, b] of [...this.blight]) if (cheb(b.x, b.y, s.x, s.y) <= CFG.cleanseRadius) { this.blight.delete(k); n++; }
        this.say(`Ancient site: ${n} blighted tiles cleansed.`);
      } else if (opt.id === 'awaken') {
        this.awakened++;
        this.say(`Ancient site awakened (${this.awakened}/${CFG.winAwakened}).`);
      }
      this.siteUses.set(key, (this.siteUses.get(key) || 0) + 1);
      this.deferredSites.delete(key);
      return { ok: true };
    }

    // ---------- ancient temple ----------
    templeFound() { const t = this.world.temple; return this.known.has(K(t.x, t.y)); }
    // Ruin Lore: the cardinal direction from a ruin to the next ruin of the trail (the temple centre for the last one),
    // along the larger offset (ties go east/west).
    ruinTarget(x, y) { return this.world.ruinNext.get(K(x, y)) || this.world.temple; }
    ruinDirection(x, y) {
      const t = this.ruinTarget(x, y), dx = t.x - x, dy = t.y - y;
      if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'east' : 'west';
      return dy > 0 ? 'south' : 'north';
    }
    canAwaken(x, y) {
      if (this.over) return { ok: false, reason: 'Game over' };
      if (!this.world.tile(x, y).temple) return { ok: false, reason: 'Not the Ancient Temple' };
      if (!this.known.has(K(x, y))) return { ok: false, reason: 'Unexplored' };
      if (!this.taken.awakening) return { ok: false, reason: 'Needs the Awakening project' };
      return { ok: true };
    }
    // Awakening the gods wins at once: it is a deliberate action, unlike the counted goals checked on End turn.
    awaken(x, y) {
      const c = this.canAwaken(x, y);
      if (!c.ok) return c;
      this.say('The gods awaken at the Ancient Temple.');
      this.over = { won: true, how: 'temple', turn: this.turn };
      return c;
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
    // clean tiles next to the blight patch that grows from a pustule
    blightFront(pk, p) {
      const seen = new Set([pk]), queue = [p], front = new Map();
      for (let i = 0; i < queue.length; i++) {
        const b = queue[i];
        for (const [dx, dy] of N4) {
          const x = b.x + dx, y = b.y + dy, k = K(x, y);
          if (seen.has(k)) continue;
          seen.add(k);
          const nb = this.blight.get(k);
          if (nb) queue.push(nb); else front.set(k, { x, y });
        }
      }
      return front;
    }
    spreadBlight() {
      const pustules = [...this.blight].filter(([, b]) => b.pustule);
      for (const [pk, p] of pustules) {
        if (!this.blight.has(pk)) continue;
        const cand = [...this.blightFront(pk, p)];
        for (let n = 0; n < CFG.blightSpread && cand.length; n++) {
          const i = Math.floor(this.rng() * cand.length);
          const [k, t] = cand[i]; cand[i] = cand[cand.length - 1]; cand.pop();
          this.blight.set(k, { x: t.x, y: t.y, pustule: false });
        }
      }
    }

    // ---------- turns ----------
    progress() {
      return { settlements: this.settlements.length, sites: this.sites.size, projects: this.projectCount, upgrades: this.settlements.filter(c => c.upgrade).length, awakened: this.awakened };
    }
    checkWin() {
      const p = this.progress();
      if (p.settlements >= CFG.winSettlements) return 'settlements';
      if (p.sites >= CFG.winSites) return 'sites';
      // Economic Dominion: upgraded settlements still standing (fallen ones don't count)
      if (this.taken.dominion && p.upgrades >= CFG.winUpgrades) return 'economy';
      if (this.taken.rites && p.awakened >= CFG.winAwakened) return 'awakened';
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
      for (const c of [...this.settlements]) {
        if (this.blight.has(K(c.x, c.y))) {
          this.settlements.splice(this.settlements.indexOf(c), 1);
          this.fallen.push(c);
          const dwells = this.taken.dwell && c.upgrade === 'scavenger';
          this.say(`Settlement #${c.id} was destroyed by blight!${dwells ? ' Its blighted tiles still yield.' : ''}`);
        }
      }
      if (!this.settlements.length) { this.over = { won: false, turn: this.turn }; return; }
      this.claimAll();
      this.wayfind();
      this.turn++;
      this.exploredThisTurn = false;
      const inc = this.income();
      RES.forEach(r => this.res[r] += inc[r]);
    }
  }
  CV.Game = Game;
})(globalThis.CV = globalThis.CV || {});
