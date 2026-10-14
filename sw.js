// Мережа першою (щоб оновлення з GitHub з'являлися одразу), кеш — запасний варіант без інтернету.
var C='nmt-v5';
self.addEventListener('install',function(e){
self.skipWaiting();
e.waitUntil(caches.open(C).then(function(c){ return c.addAll(['./','index.html','ext.js','ext.css','icon.svg']); }).catch(function(){}));
});
self.addEventListener('activate',function(e){
e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==C; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
var r=e.request;
if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
e.respondWith(fetch(r).then(function(res){
var cp=res.clone(); caches.open(C).then(function(c){ c.put(r,cp); }); return res;
}).catch(function(){ return caches.match(r).then(function(m){ return m||caches.match('index.html'); }); }));
});
