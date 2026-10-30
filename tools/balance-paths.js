// Balance check: bots that each commit to one win path (temple, economy, awaken) on 8 seeds, reporting when they win
// within 150 turns. See docs/08-balance.md. Usage: node tools/balance-paths.js [temple|economy|awaken|all] [-v] [key=value ...]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ctx = { console, Math };
ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['config.js', 'projects.js', 'world.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'), ctx);
const CV = ctx.CV, CFG = CV.CFG, K = CV.K, cheb = CV.cheb;
const args = process.argv.slice(2).filter(a => a !== '-v'), verbose = process.argv.includes('-v');
const which = args[0] && !args[0].includes('=') ? args.shift() : 'all';
for (const a of args) { const [k, v] = a.split('='); if (!(k in CFG)) throw new Error('bad key ' + k); CFG[k] = +v; }
const decode = k => { const x = Math.floor((k + 65536) / 131072); return [x, k - x * 131072]; };

const STRATS = {
  temple:  { path: ['surveyor', 'seafaring', 'cartography', 'ruinlore', 'awakening', 'wayfinders', 'openfrontier'], ups: ['surveypost'] },
  economy: { path: ['surveyor', 'glorious', 'trade', 'guilds', 'dominion'], ups: ['tradingpost', 'markettown', 'surveypost'] },
  awaken:  { path: ['surveyor', 'sight', 'pilgrimage', 'legacy', 'rites', 'bounty'], ups: ['shrinekeeper'] },
};

function play(seed, name, maxTurns) {
  const S = STRATS[name], g = new CV.Game(seed), t = g.world.temple;
  const m = { settleAt: [], projAt: [], unlockedAt: null };
  for (let i = 0; i < maxTurns && !g.over; i++) {
    // sites
    for (const [key] of g.sites) {
      while (!g.siteUsed(key)) {
        const order = name === 'awaken' && g.taken.rites ? ['awaken'] : g.blight.size ? ['cleanse', 'settlement', 'explore', 'bundle'] : ['settlement', 'explore', 'bundle'];
        if (!order.some(id => g.activateSite(key, id).ok)) break;
      }
    }
    // projects: follow the path, then any offered project at random
    while (g.projectAvailable()) {
      const o = g.projectOffer();
      const want = S.path.find(id => !g.taken[id] && o.some(p => p.id === id)) || (o.length ? o[Math.floor(g.rng() * o.length)].id : null);
      if (!want || !g.chooseProject(want).ok) break;
      if (want === S.path[4]) m.unlockedAt = g.turn;
    }
    // upgrades
    for (const c of g.settlements) {
      if (c.upgrade || g.res.wealth < g.upgradeCost()) continue;
      const offer = g.upgradeOffer().map(u => u.id);
      const id = S.ups.find(u => offer.includes(u)) || offer[0];
      if (id) g.upgrade(c.id, id);
    }
    // found settlements (temple bot leans toward the temple)
    for (let n = 0; n < 5; n++) {
      let best = null, bs = -1;
      for (const k of g.known) {
        const [x, y] = decode(k);
        if (g.placeProblem(x, y)) continue;
        let score = 0;
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > 3) continue;
          const kk = K(x + dx, y + dy);
          if (!g.claimed.has(kk) && !g.blight.has(kk)) score++;
        }
        score -= (name === 'temple' ? cheb(x, y, t.x, t.y) - 100 : Math.max(Math.abs(x), Math.abs(y))) * 0.05;
        if (score > bs) { bs = score; best = [x, y]; }
      }
      if (!best || bs < 12 || !g.canFound(...best).ok) break;
      g.found(...best);
    }
    // explore: temple bot heads for the temple, others go wide (most hidden neighbours, random tiebreak)
    let cand = null, cs = -1e9;
    const pool = new Set(g.known);
    if (g.taken.openfrontier) for (const c of g.settlements) for (let dx = -CFG.openFrontierRadius; dx <= CFG.openFrontierRadius; dx++) for (let dy = -CFG.openFrontierRadius; dy <= CFG.openFrontierRadius; dy++) pool.add(K(c.x + dx, c.y + dy));
    for (const k of pool) {
      const [x, y] = decode(k);
      if (!g.canExplore(x, y).ok) continue;
      let s;
      if (name === 'temple') s = -cheb(x, y, t.x, t.y);
      else { s = 0; for (const [dx, dy] of CV.N8) if (!g.known.has(K(x + dx, y + dy))) s++; }
      s += g.rng() * 0.5;
      if (s > cs) { cs = s; cand = [x, y]; }
    }
    if (cand) g.explore(...cand);
    if (g.templeFound() && !m.foundAt) m.foundAt = g.turn;
    if (g.templeFound() && g.awaken(t.x, t.y).ok) break;
    const p = g.progress();
    while (m.settleAt.length < p.settlements) m.settleAt.push(g.turn);
    while (m.projAt.length < p.projects) m.projAt.push(g.turn);
    g.endTurn();
  }
  const p = g.progress();
  m.end = g.over ? (g.over.won ? 'WON-' + g.over.how : 'lost') + '@' + g.over.turn : 'alive@' + g.turn;
  m.win = g.over && g.over.won ? g.over.turn : null;
  m.summary = `s${p.settlements} up${p.upgrades} si${p.sites} aw${p.awakened} pr${p.projects} kn${g.known.size} templeDist${Math.min(...[...g.known].map(k => { const [x, y] = decode(k); return cheb(x, y, t.x, t.y); }))} bank ${g.res.food}/${g.res.materials}/${g.res.wealth}`;
  return m;
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
for (const name of which === 'all' ? Object.keys(STRATS) : [which]) {
  const wins = [];
  for (const seed of SEEDS) {
    const m = play(seed, name, 150);
    if (m.win) wins.push(m.win);
    if (verbose) console.log(`  ${name} seed ${seed}: ${m.end} unlocked@${m.unlockedAt} found@${m.foundAt} ${m.summary}\n     settle ${m.settleAt.slice(0, 15).join(',')}`);
  }
  wins.sort((a, b) => a - b);
  console.log(`${name}: won ${wins.length}/${SEEDS.length}, turns ${wins.join(',')}`);
}
