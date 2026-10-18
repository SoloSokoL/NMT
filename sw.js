// Мережа першою (щоб оновлення з GitHub з'являлися одразу), кеш — запасний варіант без інтернету.
var C='nmt-v11';
var FILES=['./','index.html','manifest.webmanifest','icon.svg','css/style.css',
'js/topics.js','js/links.js','js/state.js','js/core.js','js/errors.js','js/stats.js','js/cards.js','js/sync.js','js/app.js'];
self.addEventListener('install',function(e){
self.skipWaiting();
// кожен файл окремо: якщо один не завантажився, решта все одно потрапляє в кеш
e.waitUntil(caches.open(C).then(function(c){ return Promise.all(FILES.map(function(f){ return c.add(f).catch(function(){}); })); }));
});
self.addEventListener('activate',function(e){
e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==C; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
var r=e.request;
if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
e.respondWith(fetch(r).then(function(res){
if(res.ok){ var cp=res.clone(); caches.open(C).then(function(c){ c.put(r,cp); }); } // помилкові відповіді (404) не кешуємо
return res;
}).catch(function(){ return caches.match(r).then(function(m){ return m||caches.match('index.html'); }); }));
});
