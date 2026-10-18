// =====================================================
//  PODEŠAVANJA SAJTA. Ovo je jedini fajl koji ti treba da menjaš.
//  Buketi se NE dodaju ovde, nego u Google tabeli (vidi sheetCsvUrl).
// =====================================================

const CONFIG = {
  brand: 'Elunira flowers',                 // naziv brenda
  about: [                               // ZAMENI svojom pričom (svaki red je jedan pasus)
    'Novi brend u svetu plišanih cvetova!',
    'Ručno rađeni, unikatni buketi',
    'Slanje na teritoriji Srbije! 🌷'
     
  ],
  place: 'Beograd, Mladenovac, Srbija',              // ZAMENI: tekst koji piše ispod priče
  mapQuery: 'Beograd, Mladenovac, Srbija',           // ZAMENI: grad ili tačna adresa za Google mape
  currency: 'RSD',
  guide: {                               // ZAMENI svojim tekstovima (odeljak "Nega i održavanje")
    aboutTitle: 'Šta su plišani buketi',
    about: [
      'Plišani buketi su cvetovi i aranžmani napravljeni od mekanog pliša umesto od pravog cveća. Ne venu, nemaju polen i ostaju lepi godinama, pa su poklon koji se čuva.',
      'Svaki buket se slaže ručno, kao pravi, sa papirom, mašnom i čestitkom, za rođendane, godišnjice, diplomiranja i rođenja beba.'
    ],
    careTitle: 'Kako se održavaju',
    care: [
      'Čuvaj ga na suvom, daleko od vlage i direktne sunčeve svetlosti, da boje ne izbledi.',
      'Prašinu skidaj mekom četkicom ili lepljivom trakom za odeću, laganim pokretima.',
      'Ne pere se u mašini. Mrlju tretiraj blago vlažnom krpom i malo blagog sapuna, pa ostavi da se osuši na vazduhu.',
      'Ako se pliš spljošti, lagano ga razčešljaj mekom četkicom da se vrati oblik.',
      'Drži ga podalje od kućnih ljubimaca i male dece, zbog sitnih ukrasa.'
    ]
  },
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0DeAoKu7c1dvc9O7EBKgteKqSt7AmV7xsUj8Fi0OJo43XmPHrUYpZ6tgB2PpO9BWa6mOGJxVPknOQ/pub?gid=0&single=true&output=csv',                       // ZALEPI link iz Google tabele (File > Share > Publish to web > CSV)
  adminApiUrl: 'https://script.google.com/macros/s/AKfycbxqZRnG2whKSgDQfD3_aKeD1OiiTLq7DZttMQj7EOSuI4wvZ61vz6BfegmFTtzruk9dVQ/exec',                       // ZALEPI link skripte za admin.html (vidi apps-script.gs)
  social: {
    instagram: 'https://www.instagram.com/elunira.flowers/',
    tiktok: 'https://www.tiktok.com/@elunira.flowers',
    facebook: 'https://www.facebook.com/people/Elunira-Flowers/61587164017154/#'
  },
  brandColors: { p1: '#c93a4d', p2: '#9e2438' } // boje početka stranice
};

const CATEGORIES = [
  { id: 'veliki', name: 'Veliki buketi', emoji: '💐',
    desc: 'Bogati buketi sa mnogo cvetova i ukrasa. Za godišnjice, venčanja i velike prilike.',
    colors: { p1: '#c93a4d', p2: '#9e2438' } },
  { id: 'srednji', name: 'Srednji buketi', emoji: '🌷',
    desc: 'Savršena veličina za rođendane, čestitke i da nekome uveliš dan.',
    colors: { p1: '#d9648f', p2: '#a8416b' } },
  { id: 'mali', name: 'Mali buketi', emoji: '🎀',
    desc: 'Mini buketi za male znake pažnje, zahvalnice i iznenađenja.',
    colors: { p1: '#6a5bd6', p2: '#43379c' } },
  { id: 'cvetovi', name: 'Pojedinačni cvetovi', emoji: '🌹',
    desc: 'Pojedinačni plišani cvetovi koji ne venu. Jedan cvet, jedna poruka.',
    colors: { p1: '#2fa39a', p2: '#1b726c' } }
];

// Primer buketa, prikazuje se dok ne uneseš sheetCsvUrl.
// Što je niže na spisku, to je buket noviji.
const SAMPLE_PRODUCTS = [
];
