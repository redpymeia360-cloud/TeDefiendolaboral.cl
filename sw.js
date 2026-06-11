const CACHE_NAME = 'tdl-pwa-app-v1';
const CORE_ASSETS = [
  './', './index.html', './styles.css', './app.js', './db.js', './config.js', './manifest.webmanifest', './offline.html',
  './assets/logo-tdl.png', './assets/poster-video.png', './assets/hero-servicios-te-defiendo-laboral.jpeg', './assets/law-pattern.svg',
  './assets/icon-192.png', './assets/icon-512.png', './assets/screens/caso-despido-finiquito.png', './assets/screens/caso-ley-karin.png',
  './assets/screens/caso-contratos-cumplimiento.png', './assets/screens/caso-empresas-inversionistas.png', './assets/screens/cierre-whatsapp-networking.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return res;
    })).catch(() => caches.match('./offline.html'))
  );
});
