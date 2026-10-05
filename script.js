(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const svg = d => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  gh: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.97 10.97 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>',
  ext: svg('<path d="M7 17 17 7M8 7h9v9"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  grid: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>')
};

/* ---------- helpers ---------- */
const el = (tag, attrs = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  [].concat(kids).forEach(c => c && n.append(c));
  return n;
};
const has = u => typeof u === 'string' && u.trim() && u.trim() !== '#' && !/^\s*(javascript|data|vbscript):/i.test(u);
const str = v => (v == null ? '' : String(v).trim());
const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const getJSON = async path => {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path} returned HTTP ${r.status}`);
  return r.json();
};

/* ---------- site.json (optional) ---------- */
async function loadSite() {
  try {
    const s = await getJSON('site.json');
    if (has(s.portfolioUrl)) document.querySelectorAll('[data-showcase]').forEach(a => (a.href = s.portfolioUrl));
    if (has(s.repo)) document.querySelectorAll('[data-repo]').forEach(a => (a.href = s.repo));
    if (has(s.github)) {
      const g = $('#github-link');
      g.href = s.github; g.innerHTML = ICON.gh; g.hidden = false;
    }
    if (has(s.profileImage)) $('#avatar').src = s.profileImage;
    if (s.name) $('.brand').setAttribute('aria-label', s.name);
  } catch (e) {
    console.info('[DevLabs] data/site.json not loaded (optional), using defaults:', e.message);
  }
}

/* ---------- state ---------- */
const box = $('#projects-container');
let ALL = [], active = 'all';
const key = c => str(c).toLowerCase();

/* ---------- fallback visual ---------- */
function fallback(p) {
  const name = str(p.name) || '?';
  return el('div', { class: 'fallback', style: `--h:${hue(name)}`, role: 'img', 'aria-label': `${name} (no image available)` }, [
    el('b', { text: name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?' }),
    el('small', { text: str(p.category) || str(p.type) || 'Project' })
  ]);
}
function cover(p) {
  if (!has(p.image)) return fallback(p);
  return el('img', {
    src: p.image, alt: `${p.name} preview`, loading: 'lazy', decoding: 'async',
    onerror(e) { console.warn(`[DevLabs] Image failed for "${p.name}":`, p.image); e.target.replaceWith(fallback(p)); }
  });
}

/* ---------- shared pieces ---------- */
function actions(p, small, openModal) {
  const L = p.links || {};
  const cls = (x = '') => `btn ${small ? 'sm ' : ''}magnetic ${x}`;
  const out = [];
  if (has(L.demo)) out.push(el('a', { class: cls('primary'), href: L.demo, target: '_blank', rel: 'noopener', 'aria-label': `Open ${p.name} live demo`, html: `Live Demo ${ICON.ext}` }));
  if (has(L.github)) out.push(el('a', { class: cls(), href: L.github, target: '_blank', rel: 'noopener', 'aria-label': `${p.name} source on GitHub`, html: `${ICON.gh} GitHub` }));
  if (openModal) {
    if (p.longDescription) out.push(el('button', { class: cls(), type: 'button', 'aria-label': `Details about ${p.name}`, onclick: () => openModal(p), html: `${ICON.info} Details` }));
    else if (has(L.details)) out.push(el('a', { class: cls(), href: L.details, html: `${ICON.info} Details` }));
  }
  return out;
}
const tags = (p, max = 5) => {
  const t = Array.isArray(p.technologies) ? p.technologies.filter(Boolean) : [];
  if (!t.length) return null;
  const shown = t.slice(0, max).map(x => el('span', { class: 'tag', text: x }));
  if (t.length > max) shown.push(el('span', { class: 'tag', text: `+${t.length - max}` }));
  return el('div', { class: 'tags' }, shown);
};
const status = p => str(p.status) && el('span', { class: 'badge st', 'data-s': key(p.status) }, [el('i', { class: 'dot' }), str(p.status)]);

/* ---------- card ---------- */
function card(p) {
  const hasMore = !!p.longDescription;
  const meta = [p.category, p.type, p.year].map(str).filter(Boolean).join(' / ');
  const c = el('article', { class: `card reveal${p.featured ? ' featured' : ''}${hasMore ? ' has-more' : ''}${has(p.icon) ? ' has-icon' : ''}` }, [
    el('div', { class: 'top' }, [
      el('div', { class: 'media' }, [cover(p), status(p), p.featured && el('span', { class: 'badge star', text: 'Featured' })]),
      has(p.icon) && el('img', { class: 'picon', src: p.icon, alt: '', loading: 'lazy', onerror(e) { e.target.remove(); c.classList.remove('has-icon'); } })
    ]),
    el('div', { class: 'body' }, [
      meta && el('div', { class: 'meta', text: meta }),
      el('h3', { text: p.name }),
      str(p.description) && el('p', { class: 'desc', text: p.description }),
      tags(p),
      el('div', { class: 'actions' }, actions(p, true, openModal))
    ])
  ]);
  if (hasMore) c.addEventListener('click', e => { if (!e.target.closest('a,button')) openModal(p); });
  tilt(c);
  return c;
}

/* ---------- 3D tilt + cursor light ---------- */
function tilt(c) {
  if (reduce || !fine) return;
  let raf;
  const vars = ['--mouse-x', '--mouse-y', '--rx', '--ry', '--tx', '--ty', '--sx', '--sy'];
  c.addEventListener('pointermove', e => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const s = c.style;
      s.setProperty('--mouse-x', x * 100 + '%'); s.setProperty('--mouse-y', y * 100 + '%');
      s.setProperty('--ry', ((x - .5) * 8).toFixed(2) + 'deg'); s.setProperty('--rx', ((.5 - y) * 8).toFixed(2) + 'deg');
      s.setProperty('--tx', ((x - .5) * 2).toFixed(3)); s.setProperty('--ty', ((y - .5) * 2).toFixed(3));
      s.setProperty('--sx', ((.5 - x) * 26).toFixed(1) + 'px'); s.setProperty('--sy', (20 + (y - .5) * 14).toFixed(1) + 'px');
    });
  });
  c.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); vars.forEach(v => c.style.removeProperty(v)); });
}

/* ---------- reveal ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 }) : null;
const watch = n => (io ? io.observe(n) : n.classList.add('in'));

/* ---------- render ---------- */
function render() {
  const list = active === 'all' ? ALL : ALL.filter(p => key(p.category) === active);
  box.setAttribute('aria-busy', 'false');
  box.replaceChildren(...list.map(card));
  box.querySelectorAll('.reveal').forEach((n, i) => { n.style.transitionDelay = Math.min(i * 60, 360) + 'ms'; watch(n); });
}
function skeleton() {
  box.setAttribute('aria-busy', 'true');
  box.replaceChildren(...Array.from({ length: 6 }, () => el('div', { class: 'sk', 'aria-hidden': 'true' }, [el('i', { class: 'a' }), el('i', { class: 'b' }), el('i', { class: 'c' }), el('i', { class: 'd' })])));
}
function failed(err) {
  box.setAttribute('aria-busy', 'false');
  box.replaceChildren(el('div', { class: 'state', role: 'alert' }, [
    el('h3', { text: "Projects couldn't be loaded." }),
    el('p', { text: 'Check that data/projects.json exists and is valid JSON. If you opened index.html directly from disk, run it through a local server instead.' }),
    el('code', { text: err.message }),
    el('button', { class: 'btn primary', type: 'button', text: 'Retry', onclick: loadProjects })
  ]));
}

/* ---------- filters (built from the JSON categories) ---------- */
function filters() {
  const f = $('#filters'), seen = new Map();
  ALL.forEach(p => { const k = key(p.category); if (k && !seen.has(k)) seen.set(k, str(p.category)); });
  if (seen.size < 2) { f.hidden = true; return; }
  const mk = (k, label) => el('button', {
    class: 'chip', type: 'button', 'data-k': k, 'aria-pressed': String(k === active), text: label,
    onclick() { active = k; f.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); render(); }
  });
  f.replaceChildren(mk('all', 'All'), ...[...seen].map(([k, l]) => mk(k, l)));
  f.hidden = false;
}

/* ---------- load ---------- */
async function loadProjects() {
  skeleton();
  try {
    const d = await getJSON('projects.json');
    const list = Array.isArray(d) ? d : d.projects;
    if (!Array.isArray(list)) throw new Error('projects.json must contain a "projects" array');
    ALL = list.map((p, i) => [p, i]).filter(([p]) => p && str(p.name))
      .sort(([a, i], [b, j]) => (!!b.featured - !!a.featured) || (parseInt(b.year) || 0) - (parseInt(a.year) || 0) || i - j)
      .map(x => x[0]);
    active = 'all';
    document.querySelectorAll('[data-count]').forEach(n => (n.textContent = ALL.length));
    filters(); render();
  } catch (e) {
    console.error('[DevLabs] Failed to load data/projects.json:', e);
    console.warn('[DevLabs] Tip: fetch() is blocked on file://. Use a local server, e.g. `npx serve` or `python3 -m http.server`.');
    failed(e);
  }
}

/* ---------- modal ---------- */
const modal = $('#modal');
function openModal(p) {
  const meta = [p.category, p.type, p.year].map(str).filter(Boolean).join(' / ');
  modal.replaceChildren(
    el('button', { class: 'mclose', type: 'button', 'aria-label': 'Close details', onclick: () => modal.close(), html: ICON.x }),
    el('div', { class: 'media' }, [cover(p), status(p)]),
    el('div', { class: 'body' }, [
      meta && el('div', { class: 'meta', text: meta }),
      el('h2', { id: 'modal-title', text: p.name }),
      str(p.description) && el('p', { class: 'desc', style: '-webkit-line-clamp:unset', text: p.description }),
      el('p', { class: 'long', text: p.longDescription }),
      tags(p, 99),
      el('div', { class: 'actions' }, actions(p, false, null))
    ])
  );
  document.body.classList.add('lock');
  modal.showModal();
}
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
modal.addEventListener('close', () => document.body.classList.remove('lock'));

/* ---------- page effects ---------- */
const header = $('#header');
const onScroll = () => { header.classList.toggle('compact', scrollY > 24); document.body.classList.toggle('past', scrollY > innerHeight * .6); };
addEventListener('scroll', onScroll, { passive: true });
document.querySelectorAll('[data-i]').forEach(n => (n.innerHTML = ICON[n.dataset.i]));
header.classList.toggle('compact', scrollY > 24);

if (fine && !reduce) {
  const hero = $('.hero');
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));
    hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    const b = e.target.closest && e.target.closest('.magnetic');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.translate = `${(e.clientX - r.left - r.width / 2) * .16}px ${(e.clientY - r.top - r.height / 2) * .26}px`;
  });
  document.addEventListener('pointerout', e => {
    const b = e.target.closest && e.target.closest('.magnetic');
    if (b && !b.contains(e.relatedTarget)) b.style.translate = '';
  });
}
if (!reduce) {
  $('#particles').append(...Array.from({ length: 16 }, () => {
    const s = 2 + Math.random() * 3;
    return el('i', { style: `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${10 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s` });
  }));
}
document.querySelectorAll('.reveal').forEach(watch);
$('#year').textContent = new Date().getFullYear();
$('#avatar').addEventListener('error', e => e.target.remove());

loadSite();
loadProjects();
})();
