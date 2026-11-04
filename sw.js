/* Maslul PWA v1.9.5 — keep localStorage untouched while upgrading code. */
const CACHE='maslul-unified-v1.9.5';
const ASSETS=[
 './','./index.html',
 './style.css?v=1.9.5','./app.js?v=1.9.5','./imports.js?v=1.9.5',
 './manifest.webmanifest?v=1.9.5',
 './icons/icon-192.png','./icons/icon-512.png', './decision_insights.js?v=1.9.5'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith('maslul-')&&k!==CACHE)
      .map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const isCode=/\.(?:js|css|webmanifest)$/.test(url.pathname);
  const isNavigate=request.mode==='navigate';
  if(isNavigate||isCode){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
      if(response.ok){const responseCopy=response.clone();
        event.waitUntil(caches.open(CACHE).then(c=>c.put(isNavigate?'./index.html':request,responseCopy)));
      }
      return response;
    }).catch(async()=> (await caches.match(isNavigate?'./index.html':request)) || Response.error()));
  }else{
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,clone)));}
      return response;
    })));
  }
});
