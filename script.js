// Ovaj fajl ne treba da menjaš. Podešavanja su u data.js, a buketi u Google tabeli.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
if (/[?&]debug/.test(location.search)) {
  window.addEventListener('error', (e) => {
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;top:8rem;left:1rem;right:1rem;z-index:50;background:#a00;color:#fff;padding:.7rem 1rem;border-radius:12px;font-size:.85rem';
    b.textContent = 'Greška u kodu: ' + e.message + ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')';
    document.body.appendChild(b);
  });
}
const fmt = (n) => Number(n).toLocaleString('sr-RS') + ' ' + CONFIG.currency;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => String(s || '').toLowerCase().replace(/đ/g, 'dj').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

let products = [], byCat = {}, byKey = {};
let cart = [], pending = null, lastCat = null, orderDone = false, igUrl = '';
const state = {};
try { cart = JSON.parse(localStorage.getItem('mb-cart') || '[]'); } catch (e) { cart = []; }

const title = (p) => p.name || catById[p.cat].name;
const imgTag = (src, alt = '') => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.remove()">`;
const priceText = (p) => (p.price ? fmt(p.price) : 'Cena na upit');
const absUrl = (u) => { try { return new URL(u, location.href).href; } catch (e) { return u; } };
function flash(btn, text = 'Dodato ✓') {
  if (btn.dataset.busy) return;
  const old = btn.textContent;
  btn.dataset.busy = '1'; btn.textContent = text;
  setTimeout(() => { btn.textContent = old; delete btn.dataset.busy; }, 1200);
}
function setTheme(c) { root.style.setProperty('--p1', c.p1); root.style.setProperty('--p2', c.p2); }

// ---------- Učitavanje buketa iz Google tabele ----------
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = ''; rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function matchCat(raw) {
  const n = norm(raw);
  if (!n) return null;
  return CATEGORIES.find((c) => n === c.id || n === norm(c.name)) ||
         CATEGORIES.find((c) => n.length > 3 && norm(c.name).includes(n)) || null;
}
function fixImg(u) {
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : u;
}
const parsePrice = (v) => Number(String(v || '').replace(/[.,]\d{1,2}\s*$/, '').replace(/\D/g, '')) || 0;

function rowsToProducts(rows) {
  if (!rows.length) return [];
  const head = rows[0].map((h) => norm(h).replace(/\s/g, ''));
  const col = (n) => head.indexOf(n);
  const iC = col('kategorija'), iN = col('naziv'), iP = col('cena'), iD = col('opis'), iS = col('sakrij'), iK = col('kod');
  const imgCols = head.map((h, i) => (/^slika/.test(h) ? i : -1)).filter((i) => i >= 0);
  const seq = {};
  return rows.slice(1).map((r) => {
    const c = matchCat(r[iC]);
    if (!c) return null;
    seq[c.id] = (seq[c.id] || 0) + 1; // šifra se broji i za sakrivene bukete, da se ne pomeri
    const images = imgCols.map((i) => fixImg((r[i] || '').trim())).filter(Boolean);
    if (!images.length || norm(r[iS]) === 'da') return null;
    const code = ((iK >= 0 && r[iK]) || '').trim() || c.id[0].toUpperCase() + seq[c.id];
    return { cat: c.id, code, name: (r[iN] || '').trim(), price: parsePrice(r[iP]), desc: (r[iD] || '').trim(), images };
  }).filter(Boolean);
}

let loadInfo = '';
async function loadProducts() {
  if (!CONFIG.sheetCsvUrl) {
    loadInfo = 'sheetCsvUrl je prazan u data.js, zato se prikazuju primeri buketa.';
    return SAMPLE_PRODUCTS;
  }
  try {
    const res = await fetch(CONFIG.sheetCsvUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    const list = rowsToProducts(rows);
    loadInfo = `tabela je učitana: ${Math.max(rows.length - 1, 0)} redova, prikazano buketa: ${list.length}.`
      + (/^\s*</.test(text) ? ' PAŽNJA: link nije CSV nego web stranica.' : '');
    try { localStorage.setItem('mb-cache', JSON.stringify(list)); } catch (e) {}
    return list;
  } catch (e) {
    loadInfo = 'greška pri učitavanju tabele (' + e.message + '), prikazuje se sačuvana kopija ako postoji.';
    try { return JSON.parse(localStorage.getItem('mb-cache') || '[]'); } catch (e2) { return []; }
  }
}

function indexProducts(list) {
  // novi buketi su na dnu tabele, a na sajtu se prikazuju prvi
  const seq = {};
  const coded = list.map((p) => { seq[p.cat] = (seq[p.cat] || 0) + 1; return { ...p, code: p.code || p.cat[0].toUpperCase() + seq[p.cat] }; });
  products = coded.slice().reverse().map((p, i) => ({ ...p, id: i, key: p.cat + '|' + (p.name || p.images[0]) }));
  byCat = Object.fromEntries(CATEGORIES.map((c) => [c.id, products.filter((p) => p.cat === c.id)]));
  byKey = Object.fromEntries(products.map((p) => [p.key, p]));
}

// ---------- Početna: brend, najnovije, kategorije ----------
function renderBrand() {
  document.title = CONFIG.brand + ' | Plišani buketi';
  $('#logo').textContent = CONFIG.brand;
  $('#heroBrand').textContent = CONFIG.brand;
  $('#watermark').textContent = CONFIG.brand;
  $('#aboutText').innerHTML = CONFIG.about.map((t) => `<p>${esc(t)}</p>`).join('');
  $('#placeText').textContent = CONFIG.place;
  const g = CONFIG.guide, gs = $('#nega');
  if (g && gs) {
    $('#gTitle1').textContent = g.aboutTitle;
    $('#gAbout').innerHTML = (g.about || []).map((t) => `<p>${esc(t)}</p>`).join('');
    $('#gTitle2').textContent = g.careTitle;
    $('#gCare').innerHTML = (g.care || []).map((t) => `<li>${esc(t)}</li>`).join('');
  } else if (gs) gs.hidden = true;
  $$('.social a[data-net]').forEach((a) => { a.href = CONFIG.social[a.dataset.net]; });
  const navHtml = [...(CONFIG.guide ? [['nega', 'O buketima']] : []), ['novo', 'Najnovije'], ...CATEGORIES.map((c) => ['sec-' + c.id, c.name])]
    .map(([id, t]) => `<button data-go="${id}">${esc(t)}</button>`).join('');
  $('#links').innerHTML = navHtml;
  if ($('#smPanel')) $('#smPanel').innerHTML = navHtml;
}

$('#mapBtn').addEventListener('click', () => {
  const q = encodeURIComponent(CONFIG.mapQuery);
  $('#mapBox').innerHTML =
    `<iframe title="Lokacija na mapi" src="https://www.google.com/maps?q=${q}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>` +
    `<a class="maplink" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Otvori u Google mapama &#8250;</a>`;
});

function renderLatest() {
  $('#latest').innerHTML = CATEGORIES.map((c) => {
    const items = byCat[c.id].slice(0, 3);
    return `<div class="lrow">
      <button class="llabel" data-go="sec-${c.id}">${esc(c.name)}</button>
      <div class="limgs">${items.map((p) => `<button class="lthumb" data-id="${p.id}" aria-label="Otvori buket iz kategorije ${esc(c.name)}"><span class="ph">${c.emoji}</span>${imgTag(p.images[0])}</button>`).join('') || '<span class="soon">Uskoro</span>'}</div>
    </div>`;
  }).join('');
}

function renderCats() {
  $('#cats').innerHTML = CATEGORIES.map((c) => `
    <section class="screen cat" id="sec-${c.id}" data-p1="${c.colors.p1}" data-p2="${c.colors.p2}">
      <div class="cat-media">
        <div class="frame"></div>
        <button class="car prev" aria-label="Prethodni buket">&#8249;</button>
        <button class="car next" aria-label="Sledeći buket">&#8250;</button>
      </div>
      <div class="cat-info">
        <h2>${esc(c.name)}</h2>
        <p class="lead">${esc(c.desc)}</p>
        <div class="pinfo">
          <h3 class="pname"></h3><p class="price"></p><p class="pdesc"></p><p class="pcount"></p>
        </div>
        <p class="pempty" hidden>Uskoro stižu novi buketi iz ove kategorije. Prati nas na mrežama.</p>
        <div class="actions">
          <button class="btn add">Dodaj u korpu</button>
          <a class="btn ghost" href="#/katalog/${c.id}">Pogledaj katalog &#8250;</a>
        </div>
      </div>
    </section>`).join('');
  CATEGORIES.forEach((c) => { state[c.id] = 0; updateCat(c.id); });
}

function updateCat(id) {
  const sec = $('#sec-' + id), list = byCat[id], p = list[state[id]], c = catById[id];
  $$('.car', sec).forEach((b) => { b.hidden = list.length < 2; });
  $('.pinfo', sec).hidden = !p;
  $('.add', sec).hidden = !p;
  $('.pempty', sec).hidden = !!p;
  const frame = $('.frame', sec);
  frame.innerHTML = `<span class="ph">${c.emoji}</span>` + (p ? imgTag(p.images[0], title(p)) : '');
  frame.classList.remove('swap'); void frame.offsetWidth; frame.classList.add('swap');
  if (!p) return;
  const name = $('.pname', sec);
  name.textContent = p.name; name.hidden = !p.name;
  $('.price', sec).textContent = priceText(p);
  $('.pdesc', sec).textContent = p.desc;
  $('.pcount', sec).textContent = `Kod: ${p.code}` + (list.length > 1 ? ` · ${state[id] + 1} / ${list.length}` : '');
}
function step(id, d) { const n = byCat[id].length; state[id] = (state[id] + d + n) % n; updateCat(id); }

$('#cats').addEventListener('click', (e) => {
  const sec = e.target.closest('.cat'); if (!sec) return;
  const id = sec.id.slice(4), p = byCat[id][state[id]], car = e.target.closest('.car'), add = e.target.closest('.add');
  if (car) step(id, car.classList.contains('next') ? 1 : -1);
  else if (add && p) { addToCart(p.key); flash(add); }
  else if (e.target.closest('.frame') && p) openProduct(p.id);
});
let sx = null;
$('#cats').addEventListener('touchstart', (e) => { sx = e.target.closest('.cat-media') ? e.touches[0].clientX : null; }, { passive: true });
$('#cats').addEventListener('touchend', (e) => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx, sec = e.target.closest('.cat'); sx = null;
  if (sec && Math.abs(dx) > 50 && byCat[sec.id.slice(4)].length > 1) step(sec.id.slice(4), dx < 0 ? 1 : -1);
}, { passive: true });

$('#latest').addEventListener('click', (e) => {
  const t = e.target.closest('.lthumb'); if (t) openProduct(Number(t.dataset.id));
});

// ---------- Katalog ----------
function openCatalog(c) {
  lastCat = c.id; setTheme(c.colors);
  $('#page').hidden = true; $('#catalog').hidden = false;
  document.body.classList.add('past-hero'); markLinks(null);
  const list = byCat[c.id];
  $('#catTitle').textContent = c.name;
  $('#catCount').textContent = list.length ? `${list.length} u ponudi` : '';
  $('#grid').innerHTML = list.length ? list.map((p) => `
    <button class="card" data-id="${p.id}">
      <span class="thumb"><span class="ph">${c.emoji}</span>${imgTag(p.images[0], title(p))}</span>
      ${p.name ? `<strong>${esc(p.name)}</strong>` : ''}
      <span class="cprice">${priceText(p)}</span>
      <span class="ccode">Kod: ${esc(p.code)}</span>
    </button>`).join('') : '<p class="empty">Uskoro stižu novi buketi iz ove kategorije. Prati nas na mrežama.</p>';
  window.scrollTo({ top: 0, behavior: 'instant' });
}
$('#grid').addEventListener('click', (e) => {
  const card = e.target.closest('.card'); if (card) openProduct(Number(card.dataset.id));
});

// ---------- Prozor buketa ----------
function setMain(src) { const m = $('#pmImg'); m.style.display = ''; m.src = src; }
function openProduct(id) {
  const p = products[id]; if (!p) return;
  $('#pmImg').onerror = () => { $('#pmImg').style.display = 'none'; };
  setMain(p.images[0]); $('#pmImg').alt = title(p);
  $('#pmEmoji').textContent = catById[p.cat].emoji;
  $('#pmThumbs').innerHTML = p.images.length > 1
    ? p.images.map((s, i) => `<button data-src="${esc(s)}" aria-label="Slika ${i + 1}">${imgTag(s)}</button>`).join('') : '';
  $('#pmName').textContent = title(p);
  $('#pmPrice').textContent = priceText(p);
  $('#pmCode').textContent = 'Kod: ' + p.code;
  $('#pmDesc').textContent = p.desc;
  $('#pmAdd').dataset.key = p.key;
  $('#pm').showModal();
}
$('#pmThumbs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMain(b.dataset.src); });
$('#pmAdd').addEventListener('click', (e) => { addToCart(e.currentTarget.dataset.key); flash(e.currentTarget); });
$('#pmClose').addEventListener('click', () => $('#pm').close());
$('#pm').addEventListener('click', (e) => { if (e.target === $('#pm')) $('#pm').close(); });

// ---------- Korpa ----------
const cartLines = () => cart.map((i) => ({ p: byKey[i.key], qty: i.qty })).filter((l) => l.p);
const total = () => cartLines().reduce((s, l) => s + l.p.price * l.qty, 0);

function addToCart(key) {
  orderDone = false;
  const it = cart.find((i) => i.key === key);
  if (it) it.qty++; else cart.push({ key, qty: 1 });
  renderCart();
}
function renderCart() {
  cart = cart.filter((i) => byKey[i.key] && i.qty > 0);
  try { localStorage.setItem('mb-cart', JSON.stringify(cart)); } catch (e) {}
  const lines = cartLines();
  $('#cartCount').textContent = lines.reduce((n, l) => n + l.qty, 0);
  $('#cartTotal').textContent = fmt(total());
  $('#cartFoot').hidden = !lines.length;
  $('#cartItems').innerHTML = lines.length ? lines.map(({ p, qty }) => `
    <div class="line">
      <div class="line-img"><span class="ph">${catById[p.cat].emoji}</span>${imgTag(p.images[0])}</div>
      <div class="line-info">
        <strong>${esc(title(p))}</strong><span>${priceText(p)} · ${esc(p.code)}</span>
        <div class="qty">
          <button data-d="-1" data-key="${esc(p.key)}" aria-label="Smanji količinu">−</button>
          <span>${qty}</span>
          <button data-d="1" data-key="${esc(p.key)}" aria-label="Povećaj količinu">+</button>
        </div>
      </div>
      <button class="remove" data-rm="${esc(p.key)}">Ukloni</button>
    </div>`).join('') : orderDone ? `<p class="empty ok">Porudžbina je kopirana. Nalepi je u Instagram poruku i pritisni Pošalji.</p><a class="btn block" href="${esc(igUrl)}" target="_blank" rel="noopener">Otvori Instagram poruke</a>` : '<p class="empty">Korpa je prazna.</p>';
}
$('#cartItems').addEventListener('click', (e) => {
  const q = e.target.closest('[data-d]'), r = e.target.closest('[data-rm]');
  if (q) { const it = cart.find((i) => i.key === q.dataset.key); if (it) it.qty += Number(q.dataset.d); }
  if (r) cart = cart.filter((i) => i.key !== r.dataset.rm);
  renderCart();
});
function toggleCart(open) {
  $('#drawer').classList.toggle('open', open);
  $('#overlay').classList.toggle('open', open);
  $('#drawer').setAttribute('aria-hidden', String(!open));
}
$('#openCart').addEventListener('click', () => toggleCart(true));
$('#closeCart').addEventListener('click', () => toggleCart(false));
$('#overlay').addEventListener('click', () => toggleCart(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleCart(false); });

function orderText() {
  const lines = cartLines().map(({ p, qty }) => `• ${p.code} - ${title(p)} x${qty} = ${fmt(p.price * qty)}\n  Slika: ${absUrl(p.images[0])}`);
  let t = `Zdravo! Želim da poručim:\n${lines.join('\n')}\n\nUkupno: ${fmt(total())}`;
  const note = $('#note').value.trim();
  if (note) t += `\nNapomena: ${note}`;
  return t + `\n\nDostava:\n${$('#address').value.trim()}`;
}
function checkReady() {
  if ($('#address').value.trim()) return true;
  $('#address').focus(); $('#address').placeholder = 'Upiši ime, adresu i telefon';
  return false;
}
// ---------- Porudžbina preko Instagrama ----------
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; }
}
$('#sendIg').addEventListener('click', () => {
  if (!checkReady()) return;
  const text = orderText();
  const copied = copyText(text); // kopiranje počinje odmah, u okviru klika
  const m = CONFIG.social.instagram.match(/instagram\.com\/([\w.]+)/);
  igUrl = m ? `https://ig.me/m/${m[1]}?text=${encodeURIComponent(text)}` : 'https://www.instagram.com/direct/inbox/';
  const w = window.open(igUrl, '_blank');
  if (w) w.opener = null;
  copied.then((ok) => {
    if (!ok) window.prompt('Kopiraj porudžbinu i nalepi je u Instagram poruku:', text);
    cart = []; orderDone = true;               // korpa se prazni kad je porudžbina kopirana
    $('#note').value = ''; $('#address').value = '';
    renderCart();
  });
});

// ---------- Navigacija i rutiranje ----------
function markLinks(id) {
  $$('#links button, #smPanel button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === id)));
  const box = $('#links'), cur = $('#links [aria-current="true"]');
  if (cur && box.scrollWidth > box.clientWidth) { // aktivno dugme ostaje na vidiku
    box.scrollTo({ left: cur.offsetLeft - (box.clientWidth - cur.offsetWidth) / 2, behavior: 'smooth' });
  }
}

function flushScroll(smooth) {
  const id = pending || (lastCat ? 'sec-' + lastCat : null);
  pending = null; lastCat = null;
  const el = id && document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}
function goTo(id) {
  pending = id;
  if (!$('#catalog').hidden) location.hash = '#/'; else flushScroll(true);
}
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) goTo(g.dataset.go); });

function route() {
  const m = location.hash.match(/^#\/katalog\/([\w-]+)/), c = m && catById[m[1]];
  if (c) return openCatalog(c);
  const wasCatalog = !$('#catalog').hidden;
  $('#catalog').hidden = true; $('#page').hidden = false;
  if (wasCatalog) requestAnimationFrame(() => flushScroll(false));
}
window.addEventListener('hashchange', route);

// ---------- Mali meni sa strane (telefon) ----------
if ($('#sidemenu')) {
  const sm = $('#sidemenu');
  let smY = 0;
  const toggleMenu = (open) => {
    sm.classList.toggle('open', open);
    $('#smHandle').setAttribute('aria-expanded', String(open));
    if (open) smY = window.scrollY;
  };
  $('#smHandle').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(!sm.classList.contains('open')); });
  // zatvara se kad izabereš sekciju, dodirneš van menija ili skroluješ
  document.addEventListener('click', (e) => { if (!e.target.closest('#sidemenu') || e.target.closest('[data-go]')) toggleMenu(false); });
  window.addEventListener('scroll', () => { if (sm.classList.contains('open') && Math.abs(window.scrollY - smY) > 40) toggleMenu(false); }, { passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });
}

// boja i naziv u pozadini prate sekciju na sredini ekrana
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    setTheme({ p1: el.dataset.p1 || CONFIG.brandColors.p1, p2: el.dataset.p2 || CONFIG.brandColors.p2 });
    document.body.classList.toggle('past-hero', el.id !== 'o-nama');
    markLinks(el.id);
  });
}, { rootMargin: '-45% 0px -45% 0px' });

// ---------- Start ----------
async function init() {
  renderBrand();
  setTheme(CONFIG.brandColors);
  indexProducts(await loadProducts());
  if (/[?&]debug/.test(location.search)) { // otvori sajt sa ?debug na kraju adrese
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;top:4.5rem;left:1rem;right:1rem;z-index:50;background:#000;color:#fff;padding:.7rem 1rem;border-radius:12px;font-size:.85rem';
    b.textContent = 'Dijagnostika: ' + loadInfo;
    document.body.appendChild(b);
  }
  renderLatest(); renderCats(); renderCart();
  $$('#page .screen').forEach((el) => io.observe(el));
  route();
}
init();
