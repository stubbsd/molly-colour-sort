// Network-first so updates arrive straight away; cache fallback keeps it working offline.
const V='mcs-v9';const FILES=['./','index.html','style.css','hazard-bg.svg','game.js','solver.js','levels.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(e.request,cp));return res;})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));});
