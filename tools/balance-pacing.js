// Balance check: runs the general bot from tools/test.html on 8 seeds and prints settlement and project turns plus
// snapshots at turns 10, 30 and 60. See docs/08-balance.md. Usage: node tools/balance-pacing.js [key=value ...]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, performance: { now: () => Date.now() } };
ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['config.js', 'projects.js', 'world.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'), ctx);
const html = fs.readFileSync(path.join(ROOT, 'tools/test.html'), 'utf8');
const helpers = html.slice(html.indexOf('function upgradeScore'), html.indexOf('function play'));
const playSrc = html.slice(html.indexOf('function play'), html.indexOf('\n}\n', html.indexOf('function play')) + 3);
vm.runInContext('var CV = globalThis.CV, K = CV.K, CFG = CV.CFG, N8 = CV.N8;' + helpers, ctx);
const CFG = ctx.CV.CFG;
for (const a of process.argv.slice(2)) { const [k, v] = a.split('='); if (!(k in CFG)) throw new Error('bad key ' + k); CFG[k] = +v; }
// instrumented play: record milestones every turn
vm.runInContext(playSrc.replace('const before = g.settlements.length;', 'const before = g.settlements.length; if (globalThis.onTurn) globalThis.onTurn(g);'), ctx);

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const rows = [];
for (const seed of SEEDS) {
  const m = { seed, settleAt: [], projAt: [], snap: {} };
  ctx.onTurn = g => {
    const p = g.progress();
    while (m.settleAt.length < p.settlements) m.settleAt.push(g.turn);
    while (m.projAt.length < p.projects) m.projAt.push(g.turn);
    if ([10, 30, 60].includes(g.turn)) m.snap[g.turn] = { s: p.settlements, pr: p.projects, si: p.sites, up: p.upgrades, kn: g.known.size, inc: g.income(), res: { ...g.res } };
  };
  const g = ctx.play(seed, 'bot', 150);
  m.end = g.over ? (g.over.won ? 'WON-' + g.over.how : 'lost') + '@' + g.over.turn : 'alive@' + g.turn;
  m.final = g.progress();
  rows.push(m);
}
const f = o => o ? `s${o.s} pr${o.pr} si${o.si} up${o.up} kn${o.kn} inc ${o.inc.food}/${o.inc.materials}/${o.inc.wealth} bank ${o.res.food}/${o.res.materials}/${o.res.wealth}` : '-';
for (const m of rows) {
  console.log(`seed ${m.seed} ${m.end} final s${m.final.settlements} si${m.final.sites} pr${m.final.projects} up${m.final.upgrades}`);
  console.log(`   settle turns ${m.settleAt.slice(0, 12).join(',')}   proj turns ${m.projAt.slice(0, 12).join(',')}`);
  for (const t of [10, 30, 60]) console.log(`   t${t}: ${f(m.snap[t])}`);
}
