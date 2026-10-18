// Kopiraj ceo ovaj kod u Google tabelu: Extensions > Apps Script.
// Zatim promeni LOZINKU i uradi Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone).

const LOZINKA = 'PROMENI_OVU_LOZINKU';
const FOLDER = 'Slike buketa';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.password !== LOZINKA) return odgovor({ ok: false, error: 'Pogrešna lozinka' });
    if (d.action === 'check') return odgovor({ ok: true });
    if (d.action === 'list') return odgovor({ ok: true, items: spisak() });
    if (d.action === 'add') return odgovor(dodaj(d));
    if (d.action === 'hide') {
      sheet().getRange(Number(d.row), 9).setValue(d.hidden ? 'da' : '');
      return odgovor({ ok: true });
    }
    return odgovor({ ok: false, error: 'Nepoznata radnja' });
  } catch (err) {
    return odgovor({ ok: false, error: String(err) });
  }
}

function odgovor(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function sheet() { return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; }

// tekst koji počinje sa = + - @ bi tabela pročitala kao formulu
function bezbedno(s) { s = String(s || ''); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function folder() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
function sacuvajSliku(img) {
  const blob = Utilities.newBlob(Utilities.base64Decode(img.data), img.type || 'image/jpeg', img.name || 'buket.jpg');
  const f = folder().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + f.getId();
}

function dodaj(d) {
  const slike = (d.images || []).slice(0, 4).map(sacuvajSliku);
  while (slike.length < 4) slike.push('');
  sheet().appendRow([bezbedno(d.kategorija), bezbedno(d.naziv), Number(d.cena) || 0, bezbedno(d.opis)].concat(slike, ['']));
  return { ok: true };
}

function spisak() {
  const v = sheet().getDataRange().getValues(), out = [];
  for (let i = v.length - 1; i >= 1 && out.length < 40; i--) {
    const r = v[i];
    if (!r[0] && !r[4]) continue;
    out.push({ row: i + 1, kategorija: r[0], naziv: r[1], cena: r[2], slika: r[4], hidden: String(r[8]).toLowerCase() === 'da' });
  }
  return out;
}