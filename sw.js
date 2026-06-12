const CACHE='tdl-supabase-crm-v2';
const CORE=[
  './','./index.html','./crm.html','./styles.css','./crm.css','./app.js','./crm.js','./local-db.js','./data-service.js','./config.js','./manifest.webmanifest','./offline.html',
  './assets/icon-192.png','./assets/icon-512.png','./assets/maskable-icon.png','./assets/logo-original-tdl.png','./assets/poster-presentacion-cliente.jpg','./assets/poster-video.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&event.request.destination!=='video'){
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./offline.html'))));
});
