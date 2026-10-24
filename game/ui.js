(function (CV) {
  const { K, CFG, RES, N8, PROJECTS } = CV;
  const TS = 44;
  const ICON = { food: '\u{1F33E}', materials: '⛏️', wealth: '\u{1FA99}' };
  const TYPE_COLOR = { plains: '#a9c46c', forest: '#4f8a4b', mountains: '#8a8f99', desert: '#d9c48a', ocean: '#3f78b5' };
  const RELIC_COLOR = { blue: '#4aa3ff', green: '#5be37d', black: '#15151a' };
  const CITY_COLORS = ['#ffd166', '#ef8354', '#9d8df1', '#4fd0d0', '#f28fad', '#b8e986', '#f6e27a', '#6ea8ff'];
  const el = id => document.getElementById(id);
  const canvas = el('map'), ctx = canvas.getContext('2d');

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
  const centre = () => ({ x: Math.round(cam.x), y: Math.round(cam.y) });
  const dot = c => `<span class="dot" style="background:${RELIC_COLOR[c] || c}"></span>`;

  function featureText(f) {
    if (!f) return '';
    if (f.kind === 'city') return `${f.name}. City bonus: +${f.amount} ${RES.map(r => ICON[r]).join('')} for the owning city`;
    if (f.kind === 'tile') return `${f.name}. Tile bonus: +${f.amount} ${ICON[f.res]}`;
    return `${dot(f.color)}${f.name}. Relic (${f.color})`;
  }
  function reqText(req) { return req ? `${dot(req.color)}${req.n} ${req.color} relic${req.n > 1 ? 's' : ''}` : ''; }

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
      `<span class="pill dim">Cities <b>${p.cities}/${CFG.winCities}</b></span>` +
      `<span class="pill dim">Sites <b>${p.sites}/${CFG.winSites}</b></span>` +
      `<span class="pill dim">Projects <b>${p.projects}/${CFG.winProjects}</b></span>` +
      `<span class="pill ${g.turn >= CFG.blightStart ? 'warn' : 'dim'}">☣ ${g.turn >= CFG.blightStart ? `next pustule: turn ${next}` : `blight begins turn ${CFG.blightStart}`}</span>`;
  }

  function tileInfo(x, y) {
    const k = K(x, y), known = g.known.has(k), t = g.world.tile(x, y);
    const gl = known ? null : g.glimpse(x, y);
    const rows = [];
    let title;
    if (known) title = cap(t.type);
    else if (gl && gl.type) title = `${cap(t.type)} (glimpsed)`;
    else title = 'Unexplored';
    const cid = g.claimed.get(k);
    const city = g.cities.find(c => c.x === x && c.y === y);
    if (city) title = `City #${city.id} — ${cap(t.type)}`;
    const bl = g.blight.get(k);
    const seesBlight = known || (gl && gl.blight);
    if (bl && seesBlight) {
      rows.push(bl.pustule && g.taken.discernment ? '<span class="warn">☣ Pustule — the source of the blight</span>' : '<span class="warn">☣ Blighted — produces nothing</span>');
    }
    if (known) {
      if (cid) rows.push(`Claimed by city #${cid}`);
      rows.push(`Yield: ${fmt(g.tileYield(x, y))}${bl ? ' (blighted)' : ''}`);
      const f = g.feature(x, y);
      if (f) rows.push(featureText(f) + (bl ? ' <span class="warn">(disabled)</span>' : ''));
      if (t.site) rows.push(g.usedSites.has(k) ? '\u{1F5FF} Ancient site (used)' : '\u{1F5FF} Ancient site — <span class="ok">ready to activate</span>');
    } else if (gl) {
      if (gl.feature && t.feature) rows.push('✨ Something special here');
      if (gl.site && t.site) rows.push('\u{1F5FF} An ancient site');
    }
    return { title, rows, known };
  }

  function renderInfo() {
    const { x, y } = centre(), k = K(x, y);
    const ti = tileInfo(x, y);
    const ex = g.canExplore(x, y), fd = g.canFound(x, y);
    const siteReady = g.sites.has(k) && !g.usedSites.has(k);
    let btns = '';
    btns += `<button class="primary" data-act="explore" ${ex.ok ? '' : 'disabled'} title="${ex.ok ? 'Exploring ends the turn' : ex.reason}">Explore &amp; end turn (E) · ${ICON.wealth}${g.res.wealth}${ex.bonus ? ` → +${ex.bonus} tile${ex.bonus > 1 ? 's' : ''}` : ''}</button>`;
    btns += `<button data-act="found" ${fd.ok ? '' : 'disabled'} title="${fd.ok ? '' : fd.reason}">Found city (F) · ${ICON.food}${fd.cost}</button>`;
    if (siteReady) btns += `<button class="primary" data-act="site">Activate site (A)</button>`;
    const why = [];
    if (!ex.ok) why.push(ex.reason);
    if (!fd.ok && ti.known) why.push(fd.reason);
    el('info').innerHTML =
      `<h3>${ti.title} <span class="dim">${x},${y}</span></h3>` +
      ti.rows.map(r => `<div class="row">${r}</div>`).join('') +
      `<div class="btns">${btns}</div>` +
      (why.length ? `<div class="row dim" style="margin-top:6px">${why.join(' · ')}</div>` : '');
  }

  function renderProjects() {
    const have = Object.keys(g.taken).map(id => ({ p: PROJECTS.find(q => q.id === id), n: g.taken[id] }));
    const avail = g.projectAvailable();
    let h = `<h3>Projects <span class="dim">${g.projectCount}/${CFG.winProjects}</span></h3>`;
    h += `<div class="row dim">Next project at ${ICON.materials}${g.threshold} (you have ${g.res.materials})</div>`;
    h += `<div class="btns" style="margin:6px 0 8px"><button data-act="projects" class="${avail ? 'primary pulse' : ''}" ${avail ? '' : 'disabled'}>Choose a project</button></div>`;
    h += RES.length ? `<div class="row dim">Relics in your cities: ${CV.COLORS.map(c => `${dot(c)}${g.relicCount(c)}`).join('  ')}</div>` : '';
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
      offerShownFor = g.projectCount; openProjects();
    }
  }

  // ---------- modals ----------
  function closeModal() { modalKind = null; el('modal').hidden = true; el('modal').innerHTML = ''; }
  function openModal(html, kind) { modalKind = kind; el('modal').innerHTML = html; el('modal').hidden = false; }

  function openProjects() {
    if (!g.projectAvailable()) return;
    const cards = g.projectOffer().map(p => {
      const ok = g.relicsOk(p.relic);
      return `<button class="card" data-pick="${p.id}" ${ok ? '' : 'disabled'}>
        <div class="cat">${p.cat}${p.multi ? ' · repeatable' : ''}</div><div class="t">${p.name}</div>
        <div>${p.desc}</div>${p.relic ? `<div class="need ${ok ? 'ok' : 'warn'}">Requires ${reqText(p.relic)}</div>` : ''}</button>`;
    }).join('');
    openModal(`<div class="sheet"><h3>Choose a project</h3>
      <div class="dim">Costs ${ICON.materials}${g.threshold}. Projects change the rules of the game.</div>
      <div class="cards">${cards}</div><div class="btns"><button data-act="close">Later</button></div></div>`, 'projects');
  }

  function openSite(key) {
    const offer = g.siteOffer(key);
    const label = {
      explore: ['Reveal the surroundings', 'Instantly explore a large area around the site.'],
      features: ['Awaken the land', 'Two special features appear on nearby tiles.'],
      city: ['Settle the site', 'A free city is founded on the site tile.'],
      cleanse: ['Cleanse', `Remove all blight, pustules included, within ${CFG.cleanseRadius} tiles.`],
      bundle: ['Offerings', 'A bundle of resources.'],
    };
    const cards = offer.options.map(o => {
      const bad = g.siteOptionStatus(key, o);
      const extra = o.id === 'bundle' ? ` ${fmt(o.bundle)}` : '';
      return `<button class="card" data-site="${key}" data-opt="${o.id}" ${bad ? 'disabled' : ''}>
        <div class="t">${label[o.id][0]}</div><div>${label[o.id][1]}${extra}</div>
        ${o.req ? `<div class="need ${g.relicsOk(o.req) ? 'ok' : 'warn'}">Requires ${reqText(o.req)}</div>` : ''}
        ${bad && !o.req ? `<div class="need warn">${bad}</div>` : ''}</button>`;
    }).join('');
    openModal(`<div class="sheet"><h3>\u{1F5FF} Ancient site at ${offer.x},${offer.y}</h3>
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
    ['Cities', ['cityBaseCost', 'cityCostGrowth', 'cityClaimRadius']],
    ['Exploring', ['exploreWealthPerTile', 'openFrontierRadius']],
    ['Fog glimpses', ['glimpseBase', 'glimpseStep', 'glimpseMax', 'blightSightRange']],
    ['World generation (new game)', ['blobMin', 'blobVariance', 'blobFillChance', 'startSafeRadius', 'siteMinDistance',
      'siteChance', 'featureChance', 'landThreshold', 'ringLandChance', 'desertThreshold', 'mountainBelow', 'forestBelow']],
    ['Special features', ['tileFeatureAmount', 'cityFeatureAmount']],
    ['Projects', ['projectBase', 'projectGrowth', 'projectOfferSize', 'widerBorderBonus', 'legacyPerDistance', 'tradeBonus', 'gloriousBonus', 'gloriousRadius']],
    ['Ancient sites', ['siteOptionCount', 'siteRelicChance', 'siteRelicDoubleChance', 'siteBundleMin', 'siteBundleVariance',
      'siteExploreRadius', 'siteFeatureCount', 'siteFeatureRadius', 'cleanseRadius']],
    ['Blight', ['blightStart', 'blightEvery', 'blightSpawnRadius', 'blightSpread']],
    ['Victory', ['winCities', 'winSites', 'winProjects']],
  ];
  const WORLD_KEYS = new Set(OPTION_GROUPS[4][1]);
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
    const how = { cities: 'built enough cities', sites: 'found enough ancient sites', projects: 'finished enough projects' };
    openModal(`<div class="sheet"><h3>${o.won ? 'You win' : 'The blight took your last city'}</h3>
      <div>${o.won ? `On turn ${o.turn} you ${how[o.how]}.` : `You lasted until turn ${o.turn}.`}</div>
      <div class="btns"><button class="primary" data-act="restart">New world</button></div></div>`, 'over');
  }

  // ---------- actions ----------
  function doExplore(c = centre()) { if (g.explore(c.x, c.y).ok) { g.endTurn(); infoKey = null; refresh(); } }
  function doFound() { const c = centre(); if (g.found(c.x, c.y).ok) refresh(); }
  function doSite() { const k = K(centre().x, centre().y); if (g.sites.has(k) && !g.usedSites.has(k)) openSite(k); }

  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'explore') doExplore();
    else if (a === 'found') doFound();
    else if (a === 'site') doSite();
    else if (a === 'defer') { if (g.deferSite(+b.dataset.key).ok) { closeModal(); refresh(); } }
    else if (a === 'options') openOptions();
    else if (a === 'saveopts') saveOptionsForm();
    else if (a === 'revert') applyOptions(Object.assign({}, CV.CFG_DEFAULTS));
    else if (a === 'projects') openProjects();
    else if (a === 'close') closeModal();
    else if (a === 'restart') newGame(randomSeed());
    else if (a === 'newgame') { if (g.over || confirm('Abandon this world and start a new game?')) newGame(randomSeed()); }
    else if (b.dataset.pick) { if (g.chooseProject(b.dataset.pick).ok) { closeModal(); refresh(); } }
    else if (b.dataset.site) { if (g.activateSite(+b.dataset.site, b.dataset.opt).ok) { closeModal(); refresh(); } }
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
  document.addEventListener('pointermove', e => { if (!tip.hidden) placeTip(e); });
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

  // ---------- drawing ----------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    dirty = true;
  }
  window.addEventListener('resize', resize);

  function glyph(ch, cx, cy, size, color) {
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (color) ctx.fillStyle = color;
    ctx.fillText(ch, cx, cy);
  }
  function relicDot(color, cx, cy, r) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = RELIC_COLOR[color]; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  function featureIcon(f, cx, cy, dim) {
    ctx.globalAlpha = dim ? 0.5 : 1;
    if (f.kind === 'relic') relicDot(f.color, cx, cy, 7);
    else if (f.kind === 'city') glyph('✨', cx, cy, 16);
    else glyph(ICON[f.res], cx, cy, 15);
    ctx.globalAlpha = 1;
  }

  function drawTile(x, y, sx, sy) {
    const k = K(x, y), known = g.known.has(k), t = g.world.tile(x, y);
    const cx = sx + TS / 2, cy = sy + TS / 2;
    const bl = g.blight.get(k);
    if (known) {
      ctx.fillStyle = TYPE_COLOR[t.type]; ctx.fillRect(sx, sy, TS, TS);
      const cid = g.claimed.get(k);
      if (cid !== undefined) {
        ctx.strokeStyle = CITY_COLORS[(cid - 1) % CITY_COLORS.length]; ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1.5, sy + 1.5, TS - 3, TS - 3);
      }
      const f = g.feature(x, y);
      if (f) featureIcon(f, cx, cy + 8, !!bl);
      if (t.site) { ctx.globalAlpha = g.usedSites.has(k) ? 0.35 : 1; glyph('\u{1F5FF}', cx, cy - 3, 22); ctx.globalAlpha = 1; }
      if (bl) {
        ctx.fillStyle = 'rgba(82,24,105,.82)'; ctx.fillRect(sx, sy, TS, TS);
        if (bl.pustule && g.taken.discernment) glyph('☣️', cx, cy, 22);
      }
      const city = g.cities.find(c => c.x === x && c.y === y);
      if (city) { ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fillStyle = '#10151b'; ctx.fill(); glyph('\u{1F3E0}', cx, cy + 1, 20); }
    } else {
      const gl = g.glimpse(x, y);
      let frontier = false;
      for (const [dx, dy] of N8) if (g.known.has(K(x + dx, y + dy))) { frontier = true; break; }
      ctx.fillStyle = frontier ? '#18202a' : '#0d1117'; ctx.fillRect(sx, sy, TS, TS);
      if (gl) {
        if (gl.type) { ctx.globalAlpha = 0.4; ctx.fillStyle = TYPE_COLOR[t.type]; ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6); ctx.globalAlpha = 1; }
        if (gl.blight && bl) { ctx.fillStyle = 'rgba(110,40,140,.55)'; ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6); }
        if (gl.feature && t.feature) glyph('?', cx, cy + 8, 15, '#e8e0a0');
        if (gl.site && t.site) { ctx.globalAlpha = 0.6; glyph('\u{1F5FF}', cx, cy - 3, 20); ctx.globalAlpha = 1; }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1; ctx.strokeRect(sx + .5, sy + .5, TS - 1, TS - 1);
  }

  function drawArrows() {
    // the HUD floats over the canvas, so keep arrows inside the part of the map that is actually visible
    const top = el('top').offsetHeight + 20, bottom = H - el('panel').offsetHeight - 20, m = 28;
    arrowHits = [];
    for (const [k, s] of g.sites) {
      if (g.usedSites.has(k)) continue;
      const px = W / 2 + (s.x - cam.x) * TS, py = H / 2 + (s.y - cam.y) * TS;
      if (px >= 0 && px <= W && py >= top - 10 && py <= bottom + 10) continue;
      const ax = Math.min(Math.max(px, m), W - m), ay = Math.min(Math.max(py, top + m / 2), bottom - m / 2);
      const dx = px - ax, dy = py - ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux));
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fillStyle = '#e8d27a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore();
      arrowHits.push({ x: ax - ux * 11, y: ay - uy * 11, site: s });
      glyph('\u{1F5FF}', ax - ux * 22, ay - uy * 22, 18);
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0e12'; ctx.fillRect(0, 0, W, H);
    const cols = Math.ceil(W / TS / 2) + 2, rows = Math.ceil(H / TS / 2) + 2;
    const bx = Math.round(cam.x), by = Math.round(cam.y);
    for (let y = by - rows; y <= by + rows; y++) for (let x = bx - cols; x <= bx + cols; x++) {
      drawTile(x, y, W / 2 + (x - 0.5 - cam.x) * TS, H / 2 + (y - 0.5 - cam.y) * TS);
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
    const c = centre(), key = c.x + ',' + c.y;
    if (key !== infoKey) { infoKey = key; renderInfo(); }
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
