const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAX_IMAGES = 4;

let pw = localStorage.getItem('mb-admin') || '';
let images = []; // { dataUrl, data, type, name }

function say(el, text, kind) { el.textContent = text; el.className = 'msg ' + (kind || ''); }

async function api(payload) {
  if (!CONFIG.adminApiUrl) throw new Error('U data.js nije upisan adminApiUrl.');
  const res = await fetch(CONFIG.adminApiUrl, { method: 'POST', body: JSON.stringify({ password: pw, ...payload }) });
  const r = await res.json();
  if (!r.ok) throw new Error(r.error || 'Nešto nije u redu.');
  return r;
}

// ---------- Prijava ----------
async function login(p) {
  pw = p;
  try {
    await api({ action: 'check' });
  } catch (e) { pw = ''; throw e; }
  localStorage.setItem('mb-admin', pw);
  $('login').hidden = true; $('app').hidden = false;
  loadList();
}
$('loginBtn').addEventListener('click', async () => {
  say($('loginMsg'), 'Proveravam...');
  try { await login($('pw').value); } catch (e) { say($('loginMsg'), e.message, 'err'); }
});
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('loginBtn').click(); });
$('logout').addEventListener('click', () => { localStorage.removeItem('mb-admin'); location.reload(); });
if (pw) login(pw).catch(() => { pw = ''; localStorage.removeItem('mb-admin'); });

$('cat').innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

// ---------- Slike: izbor, prevlačenje, lepljenje ----------
function resize(file) {
  return new Promise((ok, fail) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      ok({ dataUrl, data: dataUrl.split(',')[1], type: 'image/jpeg', name: (file.name || 'buket').replace(/\.\w+$/, '') + '.jpg' });
    };
    img.onerror = () => fail(new Error('Ova slika se ne može pročitati. Probaj drugu (JPG ili PNG).'));
    img.src = url;
  });
}
async function addFiles(files) {
  for (const f of [...files].filter((x) => x.type.startsWith('image/'))) {
    if (images.length >= MAX_IMAGES) { say($('msg'), `Najviše ${MAX_IMAGES} slike.`, 'err'); break; }
    try { images.push(await resize(f)); } catch (e) { say($('msg'), e.message, 'err'); }
  }
  renderPreviews();
}
function renderPreviews() {
  $('previews').innerHTML = images.map((im, i) =>
    `<div class="prev"><img src="${im.dataUrl}" alt="Slika ${i + 1}"><button type="button" data-i="${i}" aria-label="Ukloni sliku">&times;</button></div>`).join('');
}
$('previews').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  images.splice(Number(b.dataset.i), 1); renderPreviews();
});
$('drop').addEventListener('click', () => $('file').click());
$('drop').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
$('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
['dragenter', 'dragover'].forEach((t) => $('drop').addEventListener(t, (e) => { e.preventDefault(); $('drop').classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => $('drop').addEventListener(t, (e) => { e.preventDefault(); $('drop').classList.remove('over'); }));
$('drop').addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); addFiles(files); }
});

// ---------- Objavi buket ----------
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const price = Number(String($('price').value).replace(/\D/g, ''));
  if (!price) return say($('msg'), 'Upiši cenu (samo broj).', 'err');
  if (!images.length) return say($('msg'), 'Dodaj bar jednu sliku.', 'err');
  $('submit').disabled = true;
  say($('msg'), 'Objavljujem, sačekaj nekoliko sekundi...');
  try {
    await api({
      action: 'add', kategorija: $('cat').value, naziv: $('name').value.trim(), cena: price, opis: $('desc').value.trim(),
      images: images.map(({ data, type, name }) => ({ data, type, name }))
    });
    say($('msg'), 'Buket je dodat. Na sajtu će se pojaviti za nekoliko minuta.', 'ok');
    $('name').value = ''; $('price').value = ''; $('desc').value = ''; images = []; renderPreviews();
    loadList();
  } catch (err) { say($('msg'), err.message, 'err'); }
  $('submit').disabled = false;
});

// ---------- Spisak i sakrivanje ----------
async function loadList() {
  try {
    const { items } = await api({ action: 'list' });
    const names = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
    $('list').innerHTML = items.length ? items.map((it) => `
      <div class="item ${it.hidden ? 'off' : ''}">
        ${it.slika ? `<img src="${esc(it.slika)}" alt="" onerror="this.style.visibility='hidden'">` : '<span class="noimg"></span>'}
        <div><strong>${esc(it.naziv || 'Bez naziva')}</strong>
          <small>${esc(names[String(it.kategorija).toLowerCase()] || it.kategorija)} · ${esc(it.cena)} RSD${it.hidden ? ' · sakriveno' : ''}</small></div>
        <button data-row="${it.row}" data-hidden="${it.hidden ? '' : '1'}">${it.hidden ? 'Prikaži' : 'Sakrij'}</button>
      </div>`).join('') : '<p>Još nema buketa.</p>';
  } catch (e) { $('list').textContent = e.message; }
}
$('list').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  b.disabled = true;
  try { await api({ action: 'hide', row: Number(b.dataset.row), hidden: !!b.dataset.hidden }); } catch (err) { alert(err.message); }
  loadList();
});
