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
  let modalKind = null, offerShownFor = -1;

  function newGame(seed) {
    g = new CV.Game(seed);
    cam = { x: 0, y: 0 }; target = { x: 0, y: 0 }; offerShownFor = -1;
    closeModal(); refresh();
  }
  const fmt = y => RES.filter(r => y[r]).map(r => `${ICON[r]}${y[r]}`).join(' ') || '—';
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const centre = () => ({ x: Math.round(cam.x), y: Math.round(cam.y) });
  const dot = c => `<span class="dot" style="background:${RELIC_COLOR[c] || c}"></span>`;

  function featureText(f) {
    if (!f) return '';
    if (f.kind === 'city') return `City bonus: +${f.amount} ${RES.map(r => ICON[r]).join('')} for the owning city`;
    if (f.kind === 'tile') return `Tile bonus: +${f.amount} ${ICON[f.res]}`;
    return `${dot(f.color)}Relic (${f.color})`;
  }
  function reqText(req) { return req ? `${dot(req.color)}${req.n} ${req.color} relic${req.n > 1 ? 's' : ''}` : ''; }

  // ---------- top bar & panels ----------
  function renderTop() {
    const inc = g.income(), p = g.progress();
    const next = g.nextPustuleTurn();
    const mat = g.res.materials >= g.threshold ? 'ok' : '';
    el('top').innerHTML =
      `<span><b>Turn ${g.turn}</b></span>` +
      RES.map(r => `<span>${ICON[r]} <b>${g.res[r]}</b> <span class="dim">+${inc[r]}</span>${r === 'materials' ? ` <span class="dim ${mat}">/ ${g.threshold}</span>` : ''}</span>`).join('') +
      `<span class="dim">Cities ${p.cities}/${CFG.winCities} · Sites ${p.sites}/${CFG.winSites} · Projects ${p.projects}/${CFG.winProjects}</span>` +
      `<span class="${g.turn >= CFG.blightStart ? 'warn' : 'dim'}">☣ ${g.turn >= CFG.blightStart ? `next pustule: turn ${next}` : `blight begins turn ${CFG.blightStart}`}</span>` +
      `<span class="grow"></span>` +
      `<button class="primary" data-act="end">End turn ⏎</button>`;
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
    btns += `<button data-act="explore" ${ex.ok ? '' : 'disabled'} title="${ex.ok ? '' : ex.reason}">Explore (E) · ${ICON.wealth}${ex.cost}</button>`;
    btns += `<button data-act="found" ${fd.ok ? '' : 'disabled'} title="${fd.ok ? '' : fd.reason}">Found city (F) · ${ICON.food}${fd.cost}</button>`;
    if (siteReady) btns += `<button class="primary" data-act="site">Activate site (A)</button>`;
    const why = [];
    if (!ex.ok && ti.known === false) why.push(ex.reason);
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
    h += have.length ? have.map(({ p, n }) => `<span class="chip" title="${p.desc}">${p.name}${n > 1 ? ' ×' + n : ''}</span>`).join('') : '<div class="row dim">No projects yet.</div>';
    el('projects').innerHTML = h;
  }

  function renderToast() {
    const recent = g.log.filter(l => l.turn >= g.turn - 1).slice(-4);
    el('toast').innerHTML = recent.map(l => `<div>${l.msg}</div>`).join('');
  }

  function refresh() {
    renderTop(); renderInfo(); renderProjects(); renderToast(); dirty = true;
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
      <div class="cards">${cards}</div><div class="btns"><button data-act="close">Later</button></div></div>`, 'site');
  }

  function showOver() {
    const o = g.over;
    const how = { cities: 'built enough cities', sites: 'found enough ancient sites', projects: 'finished enough projects' };
    openModal(`<div class="sheet"><h3>${o.won ? 'You win' : 'The blight took your last city'}</h3>
      <div>${o.won ? `On turn ${o.turn} you ${how[o.how]}.` : `You lasted until turn ${o.turn}.`}</div>
      <div class="btns"><button class="primary" data-act="restart">New world</button></div></div>`, 'over');
  }

  // ---------- actions ----------
  function doExplore() { const c = centre(); if (g.explore(c.x, c.y).ok) refresh(); }
  function doFound() { const c = centre(); if (g.found(c.x, c.y).ok) refresh(); }
  function doSite() { const k = K(centre().x, centre().y); if (g.sites.has(k) && !g.usedSites.has(k)) openSite(k); }
  function doEnd() { g.endTurn(); refresh(); }

  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'end') doEnd();
    else if (a === 'explore') doExplore();
    else if (a === 'found') doFound();
    else if (a === 'site') doSite();
    else if (a === 'projects') openProjects();
    else if (a === 'close') closeModal();
    else if (a === 'restart') newGame(Math.floor(Math.random() * 1e6) + 1);
    else if (b.dataset.pick) { if (g.chooseProject(b.dataset.pick).ok) { closeModal(); refresh(); } }
    else if (b.dataset.site) { if (g.activateSite(+b.dataset.site, b.dataset.opt).ok) { closeModal(); refresh(); } }
  });

  // ---------- input ----------
  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalKind && modalKind !== 'over') { closeModal(); return; }
    if (modalKind) return;
    if (KEYS[e.key]) { e.preventDefault(); const s = e.shiftKey ? 5 : 1; target.x = Math.round(target.x) + KEYS[e.key][0] * s; target.y = Math.round(target.y) + KEYS[e.key][1] * s; dirty = true; return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doEnd(); }
    else if (e.key === 'e' || e.key === 'E') doExplore();
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
    else { // click: centre on that tile
      const r = canvas.getBoundingClientRect();
      target.x = Math.round(cam.x + (e.clientX - r.left - W / 2) / TS);
      target.y = Math.round(cam.y + (e.clientY - r.top - H / 2) / TS);
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
    for (const [k, s] of g.sites) {
      if (g.usedSites.has(k)) continue;
      const px = W / 2 + (s.x - cam.x) * TS, py = H / 2 + (s.y - cam.y) * TS;
      if (px > 20 && px < W - 20 && py > 20 && py < H - 20) continue;
      const dx = px - W / 2, dy = py - H / 2, len = Math.hypot(dx, dy) || 1;
      const t = Math.min((W / 2 - 26) / Math.abs(dx || 1e-9), (H / 2 - 26) / Math.abs(dy || 1e-9));
      const ax = W / 2 + dx * t, ay = H / 2 + dy * t, ux = dx / len, uy = dy / len;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux));
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fillStyle = '#e8d27a'; ctx.fill(); ctx.restore();
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
  newGame(parseInt(qs.get('seed'), 10) || Math.floor(Math.random() * 1e6) + 1);
  requestAnimationFrame(frame);
})(globalThis.CV);
