// Мережа першою (щоб оновлення з GitHub з'являлися одразу), кеш — запасний варіант без інтернету.
// Свіжість файлів від назви кешу НЕ залежить: кожен успішний запит перезаписує кеш, а з мережі беруться актуальні файли (cache:'no-cache').
// Назву кешу достатньо змінювати лише коли змінюється сам sw.js (список FILES, логіка) — браузер тоді ставить нову версію й чистить старі кеші.
// Запис, якого немає у FILES (залишки видалених файлів), при активації видаляється з кешу.
var C='nmt-v16';
var FILES=['./','index.html','manifest.webmanifest','icon.svg',
'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png',
'css/style.css',
'js/topics.js','js/weights.js','js/links.js','js/state.js','js/events.js','js/core.js','js/errors.js','js/stats.js','js/cards.js','js/sync.js','js/ai.js','js/app.js'];
var KNOWN={};
FILES.forEach(function(f){ KNOWN[new URL(f,self.registration.scope).pathname]=1; });
self.addEventListener('install',function(e){
self.skipWaiting();
// кожен файл окремо: якщо один не завантажився, решта все одно потрапляє в кеш
e.waitUntil(caches.open(C).then(function(c){ return Promise.all(FILES.map(function(f){ return c.add(new Request(f,{cache:'reload'})).catch(function(){}); })); }));
});
self.addEventListener('activate',function(e){
e.waitUntil(
caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==C; }).map(function(k){ return caches.delete(k); })); })
.then(function(){ return caches.open(C); })
.then(function(c){ return c.keys().then(function(rs){ return Promise.all(rs.filter(function(r){ return !KNOWN[new URL(r.url).pathname]; }).map(function(r){ return c.delete(r); })); }); })
.then(function(){ return self.clients.claim(); })
);
});
self.addEventListener('fetch',function(e){
var r=e.request;
if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
e.respondWith(fetch(r,{cache:'no-cache'}).then(function(res){
// кешуємо лише успішні відповіді свого сайту (404, помилки й чужі/непрозорі відповіді — ні)
if(res.ok&&res.type==='basic'){ var cp=res.clone(); caches.open(C).then(function(c){ c.put(r,cp); }); }
return res;
}).catch(function(){
// без мережі: ignoreSearch — запити виду app.js?v=12 знаходять той самий файл; index.html підставляємо лише для переходів між сторінками,
// а не для відсутніх скриптів/стилів (раніше замість JS міг прийти HTML)
return caches.match(r,{ignoreSearch:true}).then(function(m){
return m||(r.mode==='navigate'?caches.match('index.html'):undefined)||Response.error();
});
}));
});
