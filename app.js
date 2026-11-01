const $ = id => document.getElementById(id);

const DEFAULT = `Router_A Router_B 4
Router_A Router_C 2
Router_B Router_C 1
Router_B Router_D 5
Router_B Router_E 10
Router_C Router_D 8
Router_C Router_E 3
Router_D Router_E 2
Router_D Router_F 6
Router_E Router_F 1
Router_E Router_G 5
Router_F Router_G 2
Router_F Router_H 4
Router_G Router_H 1`;

let G = {nodes: [], edges: []}, SRC = '', DST = '';

// ---------- Navigation entre les fenêtres ----------
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button, .tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  $(b.dataset.tab).classList.add('active');
});

// ---------- Lecture du graphe ----------
function parseGraph(t) {
  const nodes = new Set(), edges = [];
  t.trim().split('\n').forEach(l => {
    const p = l.trim().split(/\s+/);
    if (p.length < 3) return;
    const w = parseFloat(p[2]);
    if (isNaN(w)) return;
    nodes.add(p[0]); nodes.add(p[1]);
    edges.push({u: p[0], v: p[1], w});
  });
  return {nodes: [...nodes], edges};
}

// ---------- Dijkstra ----------
function dijkstra(g, s, force = false) {
  if (!force && g.edges.some(e => e.w < 0))
    return {error: 'poids négatif détecté, Dijkstra non valide'};
  const d = {}, p = {}, done = new Set(), steps = [];
  g.nodes.forEach(n => { d[n] = Infinity; p[n] = null; });
  d[s] = 0;
  while (done.size < g.nodes.length) {
    let u = null;
    g.nodes.forEach(n => {
      if (!done.has(n) && d[n] < Infinity && (u === null || d[n] < d[u])) u = n;
    });
    if (u === null) break;
    done.add(u);
    g.edges.filter(e => e.u === u).forEach(e => {
      if (d[u] + e.w < d[e.v]) { d[e.v] = d[u] + e.w; p[e.v] = u; }
    });
    steps.push({label: 'Choisi : ' + u, d: {...d}});
  }
  return {d, p, steps};
}

// ---------- Bellman-Ford ----------
function bellmanFord(g, s) {
  const d = {}, p = {}, steps = [];
  g.nodes.forEach(n => { d[n] = Infinity; p[n] = null; });
  d[s] = 0;
  for (let i = 1; i < g.nodes.length; i++) {
    let ch = false;
    g.edges.forEach(e => {
      if (d[e.u] < Infinity && d[e.u] + e.w < d[e.v]) {
        d[e.v] = d[e.u] + e.w; p[e.v] = e.u; ch = true;
      }
    });
    steps.push({label: 'Itération ' + i, d: {...d}});
    if (!ch) break;
  }
  const neg = g.edges.some(e => d[e.u] < Infinity && d[e.u] + e.w < d[e.v]);
  return {d, p, steps, neg};
}

function buildPath(p, d, t) {
  if (d[t] === Infinity) return [];
  const path = []; let c = t, k = 0;
  while (c !== null && k++ < 1000) { path.unshift(c); c = p[c]; }
  return path;
}

function timeIt(fn, reps = 200) {
  const t0 = performance.now(); let r;
  for (let i = 0; i < reps; i++) r = fn();
  return {r, ms: (performance.now() - t0) / reps};
}

// ---------- Dessin SVG ----------
function draw(svg, g, path = [], src = '', dst = '') {
  const W = 700, H = 450, R = 170, NR = 24, pos = {};
  g.nodes.forEach((n, i) => {
    const a = 2 * Math.PI * i / g.nodes.length - Math.PI / 2;
    pos[n] = {x: W / 2 + R * 1.3 * Math.cos(a), y: H / 2 + R * Math.sin(a) * 1.1};
  });
  const gray = '#7a8896', red = '#d62d20';
  const onPath = (u, v) => path.some((x, i) => x === u && path[i + 1] === v);
  let h = `<defs>
    <marker id="${svg.id}g" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0L10,4L0,8z" fill="${gray}"/></marker>
    <marker id="${svg.id}r" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0L10,4L0,8z" fill="${red}"/></marker></defs>`;
  g.edges.forEach(e => {
    const a = pos[e.u], b = pos[e.v];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, px = -uy * 7, py = ux * 7;
    const x1 = a.x + ux * NR + px, y1 = a.y + uy * NR + py;
    const x2 = b.x - ux * NR + px, y2 = b.y - uy * NR + py;
    const r = onPath(e.u, e.v);
    h += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${r ? red : gray}" stroke-opacity="${r ? 1 : .6}" stroke-width="${r ? 4 : 1.5}" marker-end="url(#${svg.id}${r ? 'r' : 'g'})"/>`;
    h += `<text x="${(x1 + x2) / 2 + px * 1.6}" y="${(y1 + y2) / 2 + py * 1.6 + 4}" font-size="13" text-anchor="middle" font-weight="700" ${e.w < 0 ? `style="fill:${red}"` : ''}>${e.w}</text>`;
  });
  g.nodes.forEach(n => {
    const c = n === src ? 'var(--src)' : n === dst ? 'var(--dst)' : 'var(--node)';
    h += `<circle cx="${pos[n].x}" cy="${pos[n].y}" r="${NR}" fill="${c}" stroke="${gray}" stroke-width="1.5"/>
          <text x="${pos[n].x}" y="${pos[n].y + 4}" font-size="${n.length > 6 ? 9 : 13}" text-anchor="middle" font-weight="700">${n.replace('Router_', 'R_')}</text>`;
  });
  svg.innerHTML = h;
}

// ---------- Listes déroulantes personnalisées (Source / Destination) ----------
function closeAllDD() {
  document.querySelectorAll('.dd-list').forEach(l => l.hidden = true);
}
document.addEventListener('click', closeAllDD);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllDD(); });

function renderDD(key) {
  const cur = key === 'src' ? SRC : DST;
  const btn = $(key + 'Btn'), list = $(key + 'List');
  btn.textContent = cur + '  ▾';
  list.innerHTML = G.nodes
    .map(n => `<li data-n="${n}" class="${n === cur ? 'on' : ''}">${n}</li>`)
    .join('');
  list.querySelectorAll('li').forEach(li => {
    li.onclick = e => {
      e.stopPropagation();
      if (key === 'src') SRC = li.dataset.n; else DST = li.dataset.n;
      closeAllDD();
      renderDD(key);
      draw($('svg1'), G, [], SRC, DST);
    };
  });
}
['src', 'dst'].forEach(key => {
  $(key + 'Btn').onclick = e => {
    e.stopPropagation();
    const willOpen = $(key + 'List').hidden;
    closeAllDD();
    $(key + 'List').hidden = !willOpen;
  };
});

// ---------- Fenêtre 1 : Graphe ----------
function applyGraph() {
  G = parseGraph($('edgesInput').value);
  if (!G.nodes.includes(SRC)) SRC = G.nodes[0];
  if (!G.nodes.includes(DST)) DST = G.nodes[G.nodes.length - 1];
  renderDD('src');
  renderDD('dst');
  $('graphInfo').textContent = `Sommets : ${G.nodes.length} | Arcs : ${G.edges.length}`;
  draw($('svg1'), G, [], SRC, DST);
}
$('applyGraph').onclick = applyGraph;
$('edgesInput').value = DEFAULT;
applyGraph();

// ---------- Fenêtre 2 : Exécution ----------
function summarize(name, o, ms, dst, showTime = true) {
  if (o.error) return {path: [], html: `<div class="res"><b>${name}</b><br><span class="bad">${o.error}</span></div>`};
  if (o.neg)   return {path: [], html: `<div class="res"><b>${name}</b><br><span class="bad">Cycle négatif détecté : pas de plus court chemin fini</span></div>`};
  const path = buildPath(o.p, o.d, dst);
  if (!path.length) return {path, html: `<div class="res"><b>${name}</b><br>Aucun chemin vers ${dst}</div>`};
  return {path, html: `<div class="res"><b>${name}</b><br>Chemin : ${path.join(' → ')}<br>Coût : <span class="ok">${o.d[dst]}</span>${showTime ? `<br>Temps : ${ms.toFixed(4)} ms` : ''}</div>`};
}
function stepsTable(steps, nodes) {
  const f = v => v === Infinity ? '∞' : v;
  return `<table><tr><th>Étape</th>${nodes.map(n => `<th>${n.replace('Router_', 'R_')}</th>`).join('')}</tr>` +
    steps.map(s => `<tr><td>${s.label.replace('Router_', 'R_')}</td>${nodes.map(n => `<td>${f(s.d[n])}</td>`).join('')}</tr>`).join('') + '</table>';
}
function runAlgo(isDij) {
  const {r, ms} = timeIt(() => isDij ? dijkstra(G, SRC) : bellmanFord(G, SRC));
  const s = summarize(isDij ? 'Dijkstra' : 'Bellman-Ford', r, ms, DST);
  $('runOut').innerHTML = s.html;
  $('stepsOut').innerHTML = r.steps ? stepsTable(r.steps, G.nodes) : '';
  draw($('svg2'), G, s.path, SRC, DST);
}
$('runDij').onclick = () => runAlgo(true);
$('runBF').onclick  = () => runAlgo(false);

// ---------- Fenêtre 3 : Comparaison ----------
$('runCmp').onclick = () => {
  const a = timeIt(() => dijkstra(G, SRC)), b = timeIt(() => bellmanFord(G, SRC));
  const sa = summarize('Dijkstra', a.r, a.ms, DST), sb = summarize('Bellman-Ford', b.r, b.ms, DST);
  const same = !a.r.error && !b.r.neg && a.r.d[DST] === b.r.d[DST];
  $('cmpOut').innerHTML = sa.html + sb.html +
    `<p>Même coût : <span class="${same ? 'ok' : 'bad'}">${same ? 'Oui' : 'Non ou non comparable'}</span></p>`;
};
function randomGraph(n) {
  const nodes = Array.from({length: n}, (_, i) => 'N' + i), edges = [], w = () => 1 + Math.floor(Math.random() * 20);
  for (let i = 0; i < n - 1; i++) edges.push({u: nodes[i], v: nodes[i + 1], w: w()});
  for (let k = 0; k < 4 * n; k++) {
    const u = Math.floor(Math.random() * n), v = Math.floor(Math.random() * n);
    if (u !== v) edges.push({u: nodes[u], v: nodes[v], w: w()});
  }
  return {nodes, edges};
}
$('runBench').onclick = () => {
  let rows = '';
  [50, 100, 200, 400].forEach(n => {
    const g = randomGraph(n), a = timeIt(() => dijkstra(g, 'N0'), 5), b = timeIt(() => bellmanFord(g, 'N0'), 5);
    rows += `<tr><td>${n}</td><td>${g.edges.length}</td><td>${a.ms.toFixed(3)}</td><td>${b.ms.toFixed(3)}</td></tr>`;
  });
  $('benchOut').innerHTML = `<table><tr><th>n</th><th>m</th><th>Dijkstra (ms)</th><th>Bellman-Ford (ms)</th></tr>${rows}</table>`;
};

// ---------- Fenêtre 4 : Poids négatifs ----------
const CASES = {
  pos: {t: 'Poids non négatifs', s: 'S', d: 'T',
    e: [['S','A',2],['S','B',5],['A','B',1],['A','T',7],['B','T',2]]},
  neg: {t: 'Poids négatif sans cycle négatif', s: 'S', d: 'T',
    e: [['S','A',2],['S','B',5],['B','A',-10],['A','T',2],['B','T',100]]},
  cyc: {t: 'Cycle négatif accessible', s: 'S', d: 'T',
    e: [['S','A',2],['A','B',-4],['B','A',1],['B','T',3]]}
};
document.querySelectorAll('.case').forEach(btn => btn.onclick = () => {
  const c = CASES[btn.dataset.case];
  const g = {nodes: [...new Set(c.e.flatMap(x => [x[0], x[1]]))], edges: c.e.map(([u, v, w]) => ({u, v, w}))};
  const dj = dijkstra(g, c.s), df = dijkstra(g, c.s, true), bf = bellmanFord(g, c.s);
  const sb = summarize('Bellman-Ford', bf, 0, c.d, false);
  let h = `<h3>${c.t}</h3>`;
  if (dj.error) {
    h += `<div class="res"><b>Dijkstra</b><br><span class="bad">Refusé : ${dj.error}</span><br>Dijkstra forcé (démonstration) : coût trouvé = <span class="bad">${df.d[c.d]}</span></div>`;
  } else {
    h += `<div class="res"><b>Dijkstra</b><br>Chemin : ${buildPath(dj.p, dj.d, c.d).join(' → ')}<br>Coût : <span class="ok">${dj.d[c.d]}</span></div>`;
  }
  h += sb.html;
  if (!bf.neg && dj.error)
    h += `<p>Le coût optimal réel est <span class="ok">${bf.d[c.d]}</span>. Dijkstra forcé se trompe car il ne revisite pas un sommet déjà fixé.</p>`;
  $('negOut').innerHTML = h;
  draw($('svg3'), g, sb.path, c.s, c.d);
});