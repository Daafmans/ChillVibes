(function (CV) {
  const { K, CFG, RES, N8, PROJECTS } = CV;
  const TS_MIN = 16, TS_MAX = 96;
  let TS = 44;
  const ICON = { food: '\u{1F33E}', materials: '⛏️', wealth: '\u{1FA99}' };
  const TYPE_ICON = { plains: '\u{1F33F}', forest: '\u{1F332}', mountains: '⛰️', desert: '\u{1F335}', ocean: '\u{1F30A}' };
  const TYPE_COLOR ={ plains: '#a9c46c', forest: '#4f8a4b', mountains: '#8a8f99', desert: '#d9c48a', ocean: '#3f78b5' };
  const TEMPLE_COLOR = '#c8b27e';
  const SETTLEMENT_COLORS = ['#ffd166', '#ef8354', '#9d8df1', '#4fd0d0', '#f28fad', '#b8e986', '#f6e27a', '#6ea8ff'];
  const el = id => document.getElementById(id);
  const canvas = el('map'), ctx = canvas.getContext('2d');
  const RUINS_IMG = new Image(); // resolved against this script, so pages outside game/ (tools/uitest.html) find it too
  RUINS_IMG.onload = () => { dirty = true; };
  RUINS_IMG.src = new URL('assets/ruins.svg', document.currentScript.src).href;

  let g, cam = { x: 0, y: 0 }, target = { x: 0, y: 0 }, dirty = true, infoKey = null, W = 0, H = 0, dpr = 1;
  let modalKind = null, offerShownFor = -1, arrowHits = [];

  const SAVE_KEY = 'chillvibes.save.v1';
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(g.serialize())); } catch (e) { /* storage unavailable or full */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!s || s.over) return null;
      return CV.Game.restore(s);
    } catch (e) { return null; }
  }
  function newGame(seed, game) {
    g = game || new CV.Game(seed);
    cam = { x: 0, y: 0 }; target = { x: 0, y: 0 }; offerShownFor = -1;
    closeModal(); refresh();
  }
  const randomSeed = () => Math.floor(Math.random() * 1e6) + 1;
  const fmt = y => RES.filter(r => y[r]).map(r => `${ICON[r]}${y[r]}`).join(' ') || '—';
  const cap = s => s[0].toUpperCase() + s.slice(1);
  // the selected tile is where the camera is heading, so it changes at once rather than passing through each tile on the way
  const centre = () => ({ x: Math.round(target.x), y: Math.round(target.y) });

  const ARROW = { north: '⬆', south: '⬇', east: '➡', west: '⬅' };
  function featureText(f, x, y) {
    if (!f) return '';
    if (f.kind === 'ruins') {
      const img = `<img class="ico" src="${RUINS_IMG.src}" alt="">`;
      const to = g.ruinTarget(x, y) === g.world.temple ? 'the Ancient Temple' : 'more ruins';
      return g.taken.ruinlore ? `${img} Ruins. Their carvings point ${g.ruinDirection(x, y)}, toward ${to}.`
        : `${img} Ruins. Their carvings mean nothing to you yet.`;
    }
    return `${f.name}. Tile bonus: +${f.amount} ${[].concat(f.res).map(r => ICON[r]).join('')}`;
  }

  // ---------- top bar & panels ----------
  function renderTop() {
    const inc = g.income(), p = g.progress();
    const next = g.nextPustuleTurn();
    const mat = g.res.materials >= g.threshold ? 'ok' : '';
    el('top').innerHTML =
      `<span class="pill turn">Turn <b>${g.turn}</b></span>` +
      RES.map(r => `<span class="pill">${ICON[r]} <b>${g.res[r]}</b> <span class="dim">+${inc[r]}</span>${r === 'materials' ? ` <span class="dim ${mat}">/ ${g.threshold}</span>` : ''}</span>`).join('') +
      `<span class="grow"></span>` +
      `<button data-act="options" title="Tweak gameplay values">Options</button>` +
      `<button data-act="newgame" title="Abandon this world and start a new one">New game</button>` +
      (g.taken.dominion ? `<span class="pill dim">Upgraded <b>${p.upgrades}/${CFG.winUpgrades}</b></span>` : '') +
      (g.taken.rites ? `<span class="pill dim">Awakened <b>${p.awakened}/${CFG.winAwakened}</b></span>` : '') +
      `<span class="pill dim">\u{1F3DB}️ Temple <b>${g.templeFound() ? 'found' : 'not found'}</b></span>` +
      `<span class="pill ${g.turn >= CFG.blightStart ? 'warn' : 'dim'}">☣ ${g.turn >= CFG.blightStart ? `next pustule: turn ${next}` : `blight begins turn ${CFG.blightStart}`}</span>`;
  }

  function tileInfo(x, y) {
    const k = K(x, y), known = g.known.has(k), t = g.world.tile(x, y);
    const gl = known ? null : g.glimpse(x, y);
    const rows = [];
    let title;
    if (known) title = t.temple ? 'Ancient Temple' : cap(t.type);
    else if (gl && gl.type) title = `${cap(t.type)} (glimpsed)`;
    else title = 'Unexplored';
    const cid = g.claimed.get(k);
    const settlement = g.settlements.find(c => c.x === x && c.y === y);
    if (settlement) {
      title = `Settlement #${settlement.id} — ${cap(t.type)}`;
      const up = CV.UPGRADES.find(u => u.id === settlement.upgrade);
      if (up) rows.push(`${up.icon} Upgrade: ${up.name}. ${up.desc}`);
      rows.push(`Settlement yield: <b>${fmt(g.settlementYield(settlement))}</b> per turn`);
    }
    const ruin = g.fallen.find(c => c.x === x && c.y === y);
    if (ruin) {
      title = `Settlement #${ruin.id} (destroyed) — ${cap(t.type)}`;
      const up = CV.UPGRADES.find(u => u.id === ruin.upgrade);
      if (up) rows.push(`${up.icon} Was: ${up.name}.`);
      rows.push(`<span class="warn">Destroyed by blight. It keeps its land, but ${g.taken.dwell && ruin.upgrade === 'scavenger' ? 'only its blighted tiles yield' : 'produces nothing'}.</span>`);
    }
    const bl = g.blight.get(k);
    const seesBlight = known || (gl && gl.blight);
    if (bl && seesBlight) {
      rows.push(bl.pustule && g.taken.discernment ? '<span class="warn">☣ Pustule — the source of the blight</span>' : `<span class="warn">☣ Blighted — ${Object.keys(g.tileYield(x, y)).length ? 'features disabled' : 'produces nothing'}</span>`);
    }
    if (known) {
      rows.push(`Yield: ${fmt(g.tileYield(x, y))}${bl ? ' (blighted)' : ''}`);
      const f = g.feature(x, y);
      if (f) rows.push(featureText(f, x, y) + (bl ? ' <span class="warn">(disabled)</span>' : ''));
      if (t.temple) rows.push(g.taken.awakening ? '\u{1F3DB}️ The Ancient Temple — <span class="ok">the gods can be awakened</span>'
        : '\u{1F3DB}️ The Ancient Temple. The Awakening project lets you rouse the gods here.');
      if (t.site) rows.push(g.siteUsed(k) ? '\u{1F5FF} Ancient site (used)' : '\u{1F5FF} Ancient site — <span class="ok">ready to activate</span>');
    } else if (gl) {
      if (gl.feature && g.worldFeature(x, y)) rows.push('✨ Something special here');
      if (gl.site && t.site) rows.push('\u{1F5FF} An ancient site');
    }
    return { title, rows, known };
  }

  function renderInfo() {
    const { x, y } = centre(), k = K(x, y);
    const ti = tileInfo(x, y);
    const ex = g.canExplore(x, y), fd = g.canFound(x, y);
    const siteReady = g.sites.has(k) && !g.siteUsed(k);
    let btns = '';
    btns += `<span title="${ex.ok ? 'Exploring ends the turn' : ex.reason}"><button class="primary" data-act="explore" ${ex.ok ? '' : 'disabled'}>Explore (E)${ex.bonus ? ` · +${ex.bonus} tile${ex.bonus > 1 ? 's' : ''}` : ''}</button></span>`;
    // disabled buttons swallow mouse events in some browsers, so the tooltip sits on a wrapper
    btns += `<span title="${fd.ok ? '' : fd.reason}"><button data-act="found" ${fd.ok ? '' : 'disabled'}>Found settlement (F) · ${ICON.food}${fd.cost}</button></span>`;
    if (siteReady) btns += `<button class="primary" data-act="site">Activate site (A)</button>`;
    if (g.world.tile(x, y).temple && g.known.has(k)) {
      const aw = g.canAwaken(x, y);
      btns += `<span title="${aw.ok ? 'Wins the game' : aw.reason}"><button class="primary" data-act="awaken" ${aw.ok ? '' : 'disabled'}>\u{1F3DB}️ Awaken the gods (A)</button></span>`;
    }
    const here = g.settlements.find(c => c.x === x && c.y === y);
    if (here && !here.upgrade) {
      const offer = g.upgradeOffer();
      for (const u of offer) {
        const up = g.canUpgrade(here.id, u.id);
        btns += `<span title="${up.ok ? u.desc : up.reason}"><button data-act="upgrade" data-sid="${here.id}" data-upgrade="${u.id}" data-tip="${u.desc}" ${up.ok ? '' : 'disabled'}>${u.icon} Upgrade: ${u.name} · ${ICON.wealth}${up.cost}</button></span>`;
      }
      if (!offer.length) ti.rows.push('<span class="dim">No upgrades available yet. Projects unlock them.</span>');
    }
    el('info').innerHTML =
      `<h3>${ti.title}</h3>` +
      ti.rows.map(r => `<div class="row">${r}</div>`).join('') +
      `<div class="btns">${btns}</div>`;
  }

  function renderProjects() {
    const have = Object.keys(g.taken).map(id => ({ p: PROJECTS.find(q => q.id === id), n: g.taken[id] })).filter(o => o.p);
    const avail = g.projectAvailable();
    let h = `<h3>Projects <span class="dim">${g.projectCount}</span></h3>`;
    h += `<div class="row dim">Next project at ${ICON.materials}${g.threshold} (you have ${g.res.materials})</div>`;
    h += `<div class="btns" style="margin:6px 0 8px"><button data-act="projects" class="${avail ? 'primary pulse' : ''}" ${avail ? '' : 'disabled'}>Choose a project</button></div>`;
    h += have.length ? have.map(({ p, n }) => `<span class="chip" data-tip="${p.desc.replace(/"/g, '&quot;')}">${p.name}${n > 1 ? ' ×' + n : ''}</span>`).join('') : '<div class="row dim">No projects yet.</div>';
    el('projects').innerHTML = h;
  }

  function renderToast() {
    const recent = g.log.filter(l => l.turn >= g.turn - 1).slice(-4);
    el('toast').innerHTML = recent.map(l => `<div>${l.msg}</div>`).join('');
  }

  function refresh() {
    renderTop(); renderInfo(); renderProjects(); renderToast(); dirty = true;
    save();
    if (g.over) return showOver();
    if (g.projectAvailable() && offerShownFor !== g.projectCount && modalKind === null) {
      offerShownFor = g.projectCount; CV.audio.play('projectReady');
    }
  }

  // ---------- modals ----------
  function closeModal() { modalKind = null; el('modal').hidden = true; el('modal').innerHTML = ''; }
  function openModal(html, kind) { modalKind = kind; el('modal').innerHTML = html; el('modal').hidden = false; }

  function openProjects() {
    if (!g.projectAvailable()) return;
    const offered = new Set(g.projectOffer().map(p => p.id));
    const kids = id => PROJECTS.filter(p => p.parent === id);
    const esc = s => s.replace(/"/g, '&quot;');
    const WINS = new Set(['rites', 'awakening', 'dominion']); // projects that unlock a victory
    const node = p => {
      const n = g.taken[p.id] || 0, isOffered = offered.has(p.id);
      const state = isOffered ? 'open' : n ? 'done' : 'locked';
      const up = CV.UPGRADES.find(u => u.project === p.id);
      const kind = up ? 'k-upgrade' : p.multi ? 'k-multi' : 'k-once';
      const tip = `${p.desc}${p.multi ? ' (repeatable)' : ''}`;
      const sub = up ? `${up.icon} settlement upgrade` : p.multi ? '↻ repeatable' : '';
      const body = `<div class="t">${WINS.has(p.id) ? '🏆 ' : ''}${p.name}${n ? `<span class="dim"> ${n > 1 ? '×' + n : '✓'}</span>` : ''}</div>` +
        `${sub ? `<div class="sub">${sub}</div>` : ''}`;
      const cls = `pnode ${state} ${kind}`;
      const inner = isOffered
        ? `<button class="${cls}" data-pick="${p.id}" data-tip="${esc(tip)}">${body}</button>`
        : `<div class="${cls}" data-tip="${esc(tip)}">${body}</div>`;
      const ch = kids(p.id);
      return `<div class="branch">${inner}${ch.length ? `<div class="kids">${ch.map(c => `<div class="kid">${node(c)}</div>`).join('')}</div>` : ''}</div>`;
    };
    const roots = PROJECTS.filter(p => !p.parent);
    const cats = [...new Set(roots.map(p => p.cat))];
    const trees = cats.map(c => `<section class="ptree"><h4>${c}</h4>${roots.filter(p => p.cat === c).map(node).join('')}</section>`).join('');
    openModal(`<div class="sheet"><h3>Choose a project</h3>
      <div class="dim">Costs ${ICON.materials}${g.threshold}. Projects change the rules of the game. Hover a project for details.</div>
      <div class="ptrees">${trees}</div><div class="btns"><button data-act="close">Later</button></div></div>`, 'projects');
  }

  function openSite(key) {
    const offer = g.siteOffer(key);
    const label = {
      explore: ['Reveal the surroundings', 'Instantly explore a large area around the site.'],
      features: ['Awaken the land', 'Two special features appear on nearby tiles.'],
      settlement: ['Settle the site', 'A free settlement is founded on the site tile.'],
      cleanse: ['Cleanse', `Remove all blight, pustules included, within ${CFG.cleanseRadius} tiles.`],
      bundle: ['Offerings', 'A store of one resource.'],
      awaken: ['Awaken', `No benefit, but counts toward the ${CFG.winAwakened} awakenings needed to win (${g.awakened} so far).`],
    };
    const cards = offer.options.map(o => {
      const bad = g.siteOptionStatus(key, o);
      const extra = o.id === 'bundle' ? ` ${fmt(o.bundle)}` : '';
      return `<button class="card" data-site="${key}" data-opt="${o.id}" ${bad ? 'disabled' : ''}>
        <div class="t">${label[o.id][0]}</div><div>${label[o.id][1]}${extra}</div>
        ${bad ? `<div class="need warn">${bad}</div>` : ''}</button>`;
    }).join('');
    openModal(`<div class="sheet"><h3>\u{1F5FF} Ancient site</h3>
      <div class="dim">Pick one benefit. A site can be activated once.</div>
      <div class="cards">${cards}</div><div class="btns">${g.deferredSites.has(key)
        ? '<button data-act="close">Close</button>'
        : `<button data-act="defer" data-key="${key}" title="Activate now and pick the benefit later, from anywhere">Choose later</button>`}</div></div>`, 'site');
  }

  // ---------- options ----------
  const OPTIONS_KEY = 'chillvibes.options.v1';
  // [title, keys]. Keys of CFG missing here still show up under "Other". World-generation keys need a new game.
  const OPTION_GROUPS = [
    ['Start', ['startFood', 'startMaterials', 'startWealth']],
    ['Settlements', ['settlementBaseCost', 'settlementCostGrowth', 'settlementClaimRadius']],
    ['Upgrades', ['upgradeBaseCost', 'upgradeCostGrowth', 'surveyPostTiles', 'wayfinderTiles','shrineKeeperRadius', 'relicSiteMaterials', 'relicRuinsWealth']],
    ['Exploring', ['openFrontierRadius', 'desertSurveyTiles']],
    ['Fog glimpses', ['glimpseBase', 'glimpseStep', 'glimpseMax']],
    ['World generation (new game)', ['blobMin', 'blobVariance', 'blobFillChance', 'startSafeRadius', 'siteMinDistance',
      'siteChance', 'featureChance','landThreshold', 'ringLandChance', 'desertThreshold', 'mountainBelow', 'forestBelow',
      'templeMinDistance', 'templeMaxDistance', 'ruinTrailStartMin', 'ruinTrailStartMax', 'ruinStepMin', 'ruinStepMax', 'ruinWander', 'ruinLandSearch']],
    ['Special features', ['tileFeatureAmount', 'allFeatureAmount', 'hiddenFeatureChance', 'hiddenFeatureAmount']],
    ['Projects', ['projectBase', 'projectGrowth', 'legacyPerDistance', 'tradeBonus', 'marketTownWeight','gloriousBonus', 'gloriousRadius','bountyOptions']],
    ['Ancient sites', ['siteOptionCount', 'siteBundleMin', 'siteBundleVariance',
      'siteExploreRadius', 'siteFeatureCount', 'siteFeatureRadius', 'cleanseRadius']],
    ['Blight', ['blightStart', 'blightEvery', 'blightSpawnRange', 'blightSpread']],
    ['Victory', ['winUpgrades', 'winAwakened']],
  ];
  const WORLD_KEYS = new Set(OPTION_GROUPS.find(([t]) => t.startsWith('World generation'))[1]);
  const optLabel = k => cap(k.replace(/([A-Z])/g, ' $1').toLowerCase());

  function saveOptions() {
    const diff = {};
    for (const k in CV.CFG_DEFAULTS) if (CFG[k] !== CV.CFG_DEFAULTS[k]) diff[k] = CFG[k];
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(diff)); } catch (e) { /* storage unavailable */ }
  }
  function loadOptions() {
    try {
      const o = JSON.parse(localStorage.getItem(OPTIONS_KEY)) || {};
      for (const k in o) if (k in CV.CFG_DEFAULTS && Number.isFinite(o[k])) CFG[k] = o[k];
    } catch (e) { /* ignore a corrupt value */ }
  }
  function openOptions(note) {
    const known = new Set(OPTION_GROUPS.flatMap(([, ks]) => ks));
    const groups = OPTION_GROUPS.concat([['Other', Object.keys(CV.CFG_DEFAULTS).filter(k => !known.has(k))]]).filter(([, ks]) => ks.length);
    const body = groups.map(([title, keys]) => `<div class="optgroup"><h4>${title}</h4>${keys.map(k =>
      `<label class="opt${CFG[k] !== CV.CFG_DEFAULTS[k] ? ' changed' : ''}" title="Default: ${CV.CFG_DEFAULTS[k]}"><span>${optLabel(k)}</span>` +
      `<input type="number" step="any" min="0" data-cfg="${k}" value="${CFG[k]}"></label>`).join('')}</div>`).join('');
    openModal(`<div class="sheet"><h3>Options</h3>
      <div class="dim">Changes to values are applied to the running game and kept for next time. Highlighted values differ from the default.${note ? ` <span class="warn">${note}</span>` : ''}</div>
      <div class="optgroup"><h4>Sound</h4><label class="opt"><span>Volume</span>` +
      `<input type="range" min="0" max="100" step="1" data-volume value="${Math.round(CV.audio.volume * 100)}"></label></div>
      <div class="optgrid">${body}</div>
      <div class="btns"><button class="primary" data-act="saveopts">Save</button>
      <button data-act="revert" title="Reset every value to its default">Revert to default</button>
      <button data-act="close">Cancel</button></div></div>`, 'options');
  }
  // Applies a {key: number} map. World-generation changes only make sense in a fresh world, so they ask first.
  function applyOptions(vals) {
    const changed = Object.keys(vals).filter(k => CFG[k] !== vals[k]);
    const worldChanged = changed.some(k => WORLD_KEYS.has(k));
    let startNew = false;
    if (worldChanged) {
      startNew = g.over || confirm('World generation values changed. Start a new game to use them?\n\nOK: new game. Cancel: keep this world and leave those values unchanged.');
    }
    for (const k of changed) if (startNew || !WORLD_KEYS.has(k)) CFG[k] = vals[k];
    saveOptions();
    if (startNew) newGame(randomSeed()); else { closeModal(); refresh(); }
  }
  function saveOptionsForm() {
    const vals = {};
    for (const inp of el('modal').querySelectorAll('input[data-cfg]')) {
      const v = parseFloat(inp.value);
      vals[inp.dataset.cfg] = Number.isFinite(v) && v >= 0 ? v : CFG[inp.dataset.cfg];
    }
    applyOptions(vals);
  }

  function showOver() {
    const o = g.over;
    const how = { temple: 'awakened the gods at the Ancient Temple', economy: 'upgraded enough settlements for an economic victory', awakened: 'awakened enough ancient sites' };
    openModal(`<div class="sheet"><h3>${o.won ? 'You win' : 'The blight took your last settlement'}</h3>
      <div>${o.won ? `On turn ${o.turn} you ${how[o.how]}.` : `You lasted until turn ${o.turn}.`}</div>
      <div class="btns"><button class="primary" data-act="restart">New world</button></div></div>`, 'over');
  }

  // ---------- actions ----------
  function doExplore(c = centre()) {
    const r = g.explore(c.x, c.y);
    if (r.ok) {
      // one sound per exploration, rarest discovery wins
      CV.audio.play(r.found.temple || r.found.site ? 'exploreSite' : r.found.feature ? 'exploreFeature' : 'explore');
      g.endTurn(); infoKey = null; refresh();
    }
  }
  function doFound() { const c = centre(); if (g.found(c.x, c.y).ok) { CV.audio.play('settlement'); refresh(); } }
  function doSite() {
    const c = centre(), k = K(c.x, c.y);
    if (g.sites.has(k) && !g.siteUsed(k)) openSite(k);
    else if (g.awaken(c.x, c.y).ok) { CV.audio.play('project'); refresh(); }
  }

  document.addEventListener('click', e => {
    // A click on the backdrop dismisses the modal like its "later" button (the game-over modal stays).
    if (e.target === el('modal') && modalKind && modalKind !== 'over') {
      const later = el('modal').querySelector('[data-act="defer"], [data-act="close"]');
      if (later) later.click(); else closeModal();
      return;
    }
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'explore') doExplore();
    else if (a === 'found') doFound();
    else if (a === 'site' || a === 'awaken') doSite();
    else if (a === 'upgrade') { if (g.upgrade(+b.dataset.sid, b.dataset.upgrade).ok) { CV.audio.play('project'); refresh(); } }
    else if (a === 'defer') { if (g.deferSite(+b.dataset.key).ok) { closeModal(); refresh(); } }
    else if (a === 'options') openOptions();
    else if (a === 'saveopts') saveOptionsForm();
    else if (a === 'revert') applyOptions(Object.assign({}, CV.CFG_DEFAULTS));
    else if (a === 'projects') openProjects();
    else if (a === 'close') closeModal();
    else if (a === 'restart') newGame(randomSeed());
    else if (a === 'newgame') { if (g.over || confirm('Abandon this world and start a new game?')) newGame(randomSeed()); }
    else if (b.dataset.pick) { if (g.chooseProject(b.dataset.pick).ok) { CV.audio.play('project'); closeModal(); refresh(); } }
    else if (b.dataset.site) { if (g.activateSite(+b.dataset.site, b.dataset.opt).ok) { CV.audio.play('siteActivate'); closeModal(); refresh(); } }
  });

  // Volume applies immediately and is stored on its own, independent of Save/Cancel.
  document.addEventListener('input', e => {
    if (e.target.dataset && 'volume' in e.target.dataset) CV.audio.setVolume(e.target.value / 100);
  });
  document.addEventListener('change', e => {
    if (e.target.dataset && 'volume' in e.target.dataset) CV.audio.play('blip');
  });

  // ---------- tooltips ----------
  const tip = document.createElement('div');
  tip.id = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  function placeTip(e) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(e.clientX + 12, innerWidth - w - 6)) + 'px';
    tip.style.top = Math.max(6, e.clientY - h - 12) + 'px';
  }
  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) return;
    tip.textContent = t.dataset.tip; tip.hidden = false; placeTip(e);
  });
  document.addEventListener('pointermove', e => {
    if (tip.hidden) return;
    // the hovered element can be removed (modal closed, panel re-rendered) without a pointerout
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.dataset.tip; placeTip(e);
  });
  document.addEventListener('pointerout', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && !t.contains(e.relatedTarget)) tip.hidden = true;
  });

  // ---------- input ----------
  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalKind && modalKind !== 'over') { closeModal(); return; }
    if (modalKind) return;
    if (KEYS[e.key]) { e.preventDefault(); const s = e.shiftKey ? 5 : 1; target.x = Math.round(target.x) + KEYS[e.key][0] * s; target.y = Math.round(target.y) + KEYS[e.key][1] * s; dirty = true; return; }
    if (e.key === 'e' || e.key === 'E') doExplore();
    else if (e.key === 'f' || e.key === 'F') doFound();
    else if (e.key === 'a' || e.key === 'A') doSite();
    else if (e.key === 'p' || e.key === 'P') openProjects();
  });

  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      canvas.classList.add('drag');
      cam.x = target.x = drag.cx - dx / TS; cam.y = target.y = drag.cy - dy / TS; dirty = true;
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return;
    canvas.classList.remove('drag');
    if (drag.moved) { target.x = Math.round(cam.x); target.y = Math.round(cam.y); }
    else { // click: centre on that tile (or on the site an arrow points to)
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const hit = arrowHits.find(a => Math.hypot(a.x - mx, a.y - my) < 26);
      if (hit) { target.x = hit.site.x; target.y = hit.site.y; }
      else {
        const tx = Math.round(cam.x + (mx - W / 2) / TS), ty = Math.round(cam.y + (my - H / 2) / TS);
        if (tx === Math.round(target.x) && ty === Math.round(target.y) && g.canExplore(tx, ty).ok) doExplore({ x: tx, y: ty }); // re-click selected tile = explore it
        else { target.x = tx; target.y = ty; }
      }
    }
    drag = null; dirty = true;
  });

  // Scroll wheel zooms about the centre tile (the one the panel describes).
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (modalKind) return;
    let next = Math.round(TS * Math.exp(-e.deltaY * 0.0015));
    if (next === TS && e.deltaY) next += e.deltaY < 0 ? 1 : -1; // small trackpad ticks still move
    TS = Math.max(TS_MIN, Math.min(TS_MAX, next));
    dirty = true;
  }, { passive: false });

  // ---------- drawing ----------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    glyphCache.clear(); // cached glyphs are rasterised at the old pixel ratio
    dirty = true;
  }
  window.addEventListener('resize', resize);

  // Emoji fillText is slow and runs for most tiles every frame, so each glyph is rendered once
  // per size into a small offscreen canvas and blitted from then on.
  const glyphCache = new Map();
  function glyph(ch, cx, cy, size, color) {
    size = Math.max(1, Math.round(size));
    const key = `${ch}|${size}|${color || ''}`;
    let c = glyphCache.get(key);
    if (!c) {
      if (glyphCache.size > 3000) glyphCache.clear();
      const box = Math.ceil(size * 1.6); // room for emoji that overhang their em box
      c = document.createElement('canvas'); c.width = c.height = Math.ceil(box * dpr); c.box = box;
      const o = c.getContext('2d'); o.scale(dpr, dpr);
      o.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
      o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = color || '#fff';
      o.fillText(ch, box / 2, box / 2);
      glyphCache.set(key, c);
    }
    ctx.drawImage(c, cx - c.box / 2, cy - c.box / 2, c.box, c.box);
  }
  function village(cx, cy, z, razed) { // cluster of medieval cottages; back row first. Razed: charred, roofs caved in
    const hut = (x, base, w, h, wall, roof) => {
      if (razed) { wall = '#5a4c40'; roof = '#231d1a'; }
      ctx.fillStyle = wall; ctx.fillRect(x - w / 2, base - h, w, h);
      ctx.beginPath();
      if (razed) { // half a roof, slumped onto the walls
        ctx.moveTo(x - w / 2 - 2 * z, base - h); ctx.lineTo(x - w * 0.1, base - h - w * 0.45); ctx.lineTo(x + w * 0.15, base - h);
      } else {
        ctx.moveTo(x - w / 2 - 2 * z, base - h); ctx.lineTo(x, base - h - w * 0.75); ctx.lineTo(x + w / 2 + 2 * z, base - h);
      }
      ctx.closePath(); ctx.fillStyle = roof; ctx.fill();
      ctx.fillStyle = razed ? '#120e0c' : '#3b2a1a'; ctx.fillRect(x - 1.5 * z, base - h * 0.55, 3 * z, h * 0.55); // door
    };
    hut(cx - 8 * z, cy - 1 * z, 9 * z, 6 * z, '#d9c7a0', '#a8472f');
    hut(cx + 8 * z, cy - 1 * z, 9 * z, 6 * z, '#cdb88f', '#8f3b28');
    hut(cx, cy + 9 * z, 11 * z, 8 * z, '#e6d5ae', '#b5532f');
    hut(cx - 10 * z, cy + 11 * z, 8 * z, 5 * z, '#cdb88f', '#6e4a2c');
    hut(cx + 10 * z, cy + 11 * z, 8 * z, 5 * z, '#d9c7a0', '#6e4a2c');
  }
  function ruins(cx, cy, z) { // assets/ruins.svg, drawn once loaded; it is laid out on a 44x44 tile
    if (RUINS_IMG.complete && RUINS_IMG.naturalWidth) ctx.drawImage(RUINS_IMG, cx - 22 * z, cy - 22 * z, 44 * z, 44 * z);
  }
  function featureIcon(f, cx, cy, dim, z, x, y) {
    ctx.globalAlpha = dim ? 0.5 : 1;
    if (f.kind === 'ruins') {
      ruins(cx, cy, z);
      if (g.taken.ruinlore) { // Ruin Lore: an arrow toward the next ruins (or the Ancient Temple)
        const [ax, ay] = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[g.ruinDirection(x, y)];
        glyph(ARROW[g.ruinDirection(x, y)], cx + ax * 14 * z, cy + ay * 14 * z, 13 * z);
      }
    } else if (Array.isArray(f.res)) glyph('✨', cx, cy, 24 * z);
    else glyph(ICON[f.res], cx, cy, 24 * z);
    ctx.globalAlpha = 1;
  }

  function drawTile(x, y, sx, sy) {
    const k = K(x, y), known = g.known.has(k), t = g.world.tile(x, y);
    const cx = sx + TS / 2, cy = sy + TS / 2, z = TS / 44; // icon scale
    const bl = g.blight.get(k);
    if (known) {
      ctx.fillStyle = t.temple ? TEMPLE_COLOR : TYPE_COLOR[t.type]; ctx.fillRect(sx, sy, TS, TS);
      const cid = g.claimed.get(k);
      if (cid !== undefined) {
        ctx.strokeStyle = SETTLEMENT_COLORS[(cid - 1) % SETTLEMENT_COLORS.length]; ctx.lineWidth = 2;
        ctx.beginPath(); // outline only the sides facing a tile of another settlement (or unclaimed)
        if (g.claimed.get(K(x, y - 1)) !== cid) { ctx.moveTo(sx, sy + 1); ctx.lineTo(sx + TS, sy + 1); }
        if (g.claimed.get(K(x, y + 1)) !== cid) { ctx.moveTo(sx, sy + TS - 1); ctx.lineTo(sx + TS, sy + TS - 1); }
        if (g.claimed.get(K(x - 1, y)) !== cid) { ctx.moveTo(sx + 1, sy); ctx.lineTo(sx + 1, sy + TS); }
        if (g.claimed.get(K(x + 1, y)) !== cid) { ctx.moveTo(sx + TS - 1, sy); ctx.lineTo(sx + TS - 1, sy + TS); }
        ctx.stroke();
      }
      const f = g.feature(x, y);
      const settlement = settleAt.get(k), ruin = fallenAt.get(k);
      if (!f && !t.site && !t.temple && !bl && !settlement && !ruin) { // plain tile: faint terrain hint
        ctx.globalAlpha = 0.22; glyph(TYPE_ICON[t.type], cx, cy, 20 * z); ctx.globalAlpha = 1;
      }
      if (f) featureIcon(f, cx, cy + (t.site ? 9 : 0) * z, !!bl, z, x, y);
      if (t.site) { ctx.globalAlpha = g.siteUsed(k) ? 0.35 : 1; glyph('\u{1F5FF}', cx, cy - (f ? 9 : 0) * z, 26 * z); ctx.globalAlpha = 1; }
      if (bl) {
        ctx.fillStyle = 'rgba(82,24,105,.82)'; ctx.fillRect(sx, sy, TS, TS);
        if (bl.pustule && g.taken.discernment) glyph('☣️', cx, cy, 30 * z);
      }
      if (settlement) village(cx, cy - 1 * z, z);
      else if (ruin) village(cx, cy - 1 * z, z, true);
      // upgrade badge in the tile corner; destroyed settlements keep theirs, dimmed
      const badged = settlement || ruin;
      const upIcon = badged && badged.upgrade && (CV.UPGRADES.find(u => u.id === badged.upgrade) || {}).icon;
      if (upIcon) {
        if (!settlement) ctx.globalAlpha = 0.6;
        glyph(upIcon, sx + TS - 11 * z, sy + 11 * z, 16 * z);
        ctx.globalAlpha = 1;
      }
    } else {
      const gl = g.glimpse(x, y);
      let frontier = false;
      for (const [dx, dy] of N8) if (g.known.has(K(x + dx, y + dy))) { frontier = true; break; }
      ctx.fillStyle = frontier ? '#18202a' : '#0d1117'; ctx.fillRect(sx, sy, TS, TS);
      if (gl) {
        if (gl.type) { ctx.globalAlpha = 0.4; ctx.fillStyle = TYPE_COLOR[t.type]; ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6); ctx.globalAlpha = 1; }
        if (gl.blight && bl) { ctx.fillStyle = 'rgba(110,40,140,.55)'; ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6); }
        if (gl.feature && g.worldFeature(x, y)) glyph('?', cx, cy + (t.site && gl.site ? 9 : 0) * z, 24 * z, '#e8e0a0');
        if (gl.site && t.site) { ctx.globalAlpha = 0.6; glyph('\u{1F5FF}', cx, cy - (gl.feature && t.feature ? 9 : 0) * z, 24 * z); ctx.globalAlpha = 1; }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1; ctx.strokeRect(sx + .5, sy + .5, TS - 1, TS - 1);
  }

  function drawArrows() {
    // the top bar floats over the canvas, so keep arrows inside the part of the map that is actually visible
    const top = el('top').offsetHeight + 20, bottom = H - 20, m = 28;
    arrowHits = [];
    const targets = [...g.sites].filter(([k]) => !g.siteUsed(k)).map(([, s]) => [s, '\u{1F5FF}']);
    if (g.templeFound()) targets.push([g.world.temple, '\u{1F3DB}️']);
    for (const [s, icon] of targets) {
      const px = W / 2 + (s.x - cam.x) * TS, py = H / 2 + (s.y - cam.y) * TS;
      if (px >= 0 && px <= W && py >= top - 10 && py <= bottom + 10) continue;
      const ax = Math.min(Math.max(px, m), W - m), ay = Math.min(Math.max(py, top + m / 2), bottom - m / 2);
      const dx = px - ax, dy = py - ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux));
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fillStyle = '#e8d27a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore();
      arrowHits.push({ x: ax - ux * 11, y: ay - uy * 11, site: s });
      glyph(icon, ax - ux * 22, ay - uy * 22, 18);
    }
  }

  // settlements by tile key, rebuilt each draw so drawTile need not scan the lists per tile
  let settleAt = new Map(), fallenAt = new Map();
  function draw() {
    settleAt = new Map(g.settlements.map(c => [K(c.x, c.y), c]));
    fallenAt = new Map(g.fallen.map(c => [K(c.x, c.y), c]));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0e12'; ctx.fillRect(0, 0, W, H);
    const cols = Math.ceil(W / TS / 2) + 2, rows = Math.ceil(H / TS / 2) + 2;
    const bx = Math.round(cam.x), by = Math.round(cam.y);
    for (let y = by - rows; y <= by + rows; y++) for (let x = bx - cols; x <= bx + cols; x++) {
      drawTile(x, y, W / 2 + (x - 0.5 - cam.x) * TS, H / 2 + (y - 0.5 - cam.y) * TS);
    }
    // the Ancient Temple spans 3x3 tiles, so its glyph goes on top of all of them
    const tp = g.world.temple;
    if (g.templeFound() && Math.abs(tp.x - bx) <= cols + 1 && Math.abs(tp.y - by) <= rows + 1) {
      glyph('\u{1F3DB}️', W / 2 + (tp.x - cam.x) * TS, H / 2 + (tp.y - cam.y) * TS, TS * 2.4);
    }
    // crosshair on the tile the panel describes
    const c = centre();
    const sx = W / 2 + (c.x - 0.5 - cam.x) * TS, sy = H / 2 + (c.y - 0.5 - cam.y) * TS;
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.strokeRect(sx + 1, sy + 1, TS - 2, TS - 2);
    ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.strokeRect(sx - 1, sy - 1, TS + 2, TS + 2);
    drawArrows();
  }

  function frame() {
    const dx = target.x - cam.x, dy = target.y - cam.y;
    if (!drag || !drag.moved) {
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) { cam.x += dx * 0.35; cam.y += dy * 0.35; dirty = true; }
      else if (dx || dy) { cam.x = target.x; cam.y = target.y; dirty = true; }
    }
    // the panel waits for the drag to end; rebuilding it on every tile crossed stalls the drag
    const c = centre(), key = c.x + ',' + c.y;
    if (key !== infoKey && !(drag && drag.moved)) { infoKey = key; renderInfo(); }
    if (dirty) { dirty = false; draw(); }
    requestAnimationFrame(frame);
  }

  function goto(x, y) { cam.x = target.x = x; cam.y = target.y = y; infoKey = null; refresh(); }
  CV.ui = { newGame, goto, get game() { return g; } };
  const qs = new URLSearchParams(location.search);
  resize();
  loadOptions();
  const seedParam = parseInt(qs.get('seed'), 10);
  const saved = seedParam ? null : load();
  newGame(seedParam || randomSeed(), saved);
  requestAnimationFrame(frame);
})(globalThis.CV);
