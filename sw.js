/* Copia offline del sito: prima la rete, senza rete l'ultima versione salvata (che resta cifrata). */
// un nome per sito: la cache è condivisa tra i siti dello stesso account GitHub (stessa origine)
const PREFISSO = 'sito:app-telefono-2:';
const CACHE = PREFISSO + '5b15962d939e';
const FILE = ["./", "./allocazione.html", "./azionario.html", "./index.html", "./obbligazionario.html", "./radiografia.html", "./report.html", "./schede.html", "./termometro-inflazione.html", "./assets/home.css", "./assets/app-shell.css", "./assets/app.js", "./assets/chart.umd.js", "./assets/LICENSE-chartjs.txt", "./sblocca.js", "./icons/icon-192.png", "./icons/icon-512.png", "./manifest.webmanifest"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => Promise.allSettled(FILE.map(file => cache.add(file))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(nomi => Promise.all(nomi.filter(nome => nome.startsWith(PREFISSO) && nome !== CACHE).map(nome => caches.delete(nome))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const richiesta = event.request;
  if (richiesta.method !== 'GET') return;
  const interna = new URL(richiesta.url).origin === self.location.origin;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (interna) {
      try {
        const risposta = await fetch(richiesta);
        if (risposta.ok) cache.put(richiesta, risposta.clone());
        return risposta;
      } catch (_) {
        const salvata = await cache.match(richiesta, {ignoreSearch: true});
        if (salvata) return salvata;
        return (richiesta.mode === 'navigate' && await cache.match('./index.html')) || Response.error();
      }
    }
    // librerie (cdnjs) e caratteri (Google Fonts): dalla copia salvata, se c'è
    const salvata = await cache.match(richiesta);
    if (salvata) return salvata;
    const risposta = await fetch(richiesta);
    if (risposta.ok || risposta.type === 'opaque') cache.put(richiesta, risposta.clone());
    return risposta;
  }));
});
