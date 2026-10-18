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
  place: 'Mladenovac, Srbija',              // ZAMENI: tekst koji piše ispod priče
  mapQuery: 'Mladenovac, Srbija',           // ZAMENI: grad ili tačna adresa za Google mape
  whatsapp: '',              // ZAMENI: broj za porudžbine, bez + i bez razmaka
  currency: 'RSD',
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0DeAoKu7c1dvc9O7EBKgteKqSt7AmV7xsUj8Fi0OJo43XmPHrUYpZ6tgB2PpO9BWa6mOGJxVPknOQ/pub?gid=0&single=true&output=csv',                       // ZALEPI link iz Google tabele (File > Share > Publish to web > CSV)
  adminApiUrl: 'https://script.google.com/macros/s/AKfycbxqZRnG2whKSgDQfD3_aKeD1OiiTLq7DZttMQj7EOSuI4wvZ61vz6BfegmFTtzruk9dVQ/exec',                       // ZALEPI link skripte za admin.html (vidi apps-script.gs)
  social: {
    instagram: 'https://www.instagram.com/elunira.flowers/',
    tiktok: 'https://www.tiktok.com/@elunira.flowers',
    facebook: 'https://www.facebook.com/people/Elunira-Flowers/61587164017154/'
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
  { cat: 'veliki', name: 'Crvene ruže sa medvedom', price: 5490, desc: '25 plišanih ruža i medved u sredini, upakovano u papir sa mašnom.', images: ['images/veliki/1.jpg', 'images/veliki/1b.jpg'] },
  { cat: 'veliki', name: 'Roze mešavina', price: 6290, desc: 'Ruže, božuri i tulipani u nežnim bojama.', images: ['images/veliki/2.jpg'] },
  { cat: 'srednji', name: 'Roze tulipani', price: 3290, desc: '15 tulipana sa mašnom. Idealno za rođendan.', images: ['images/srednji/1.jpg'] },
  { cat: 'srednji', name: 'Diplomski buket', price: 3890, desc: 'Buket sa kapom i diplomom.', images: ['images/srednji/2.jpg', 'images/srednji/2b.jpg'] },
  { cat: 'mali', name: 'Mini iznenađenje', price: 1790, desc: 'Mali buket koji staje u šaku.', images: ['images/mali/1.jpg'] },
  { cat: 'mali', name: 'Beba buket', price: 2290, desc: 'Pastelne boje i mali zeka.', images: ['images/mali/2.jpg'] },
  { cat: 'cvetovi', name: 'Crvena ruža', price: 590, desc: 'Jedna plišana ruža na dugačkoj dršci.', images: ['images/cvetovi/1.jpg'] },
  { cat: 'cvetovi', name: 'Sunčokret', price: 650, desc: 'Veliki plišani sunčokret.', images: ['images/cvetovi/2.jpg'] }
];