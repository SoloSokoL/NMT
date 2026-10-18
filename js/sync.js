/* ===== Хмарна синхронізація (Firebase Firestore) =====
   Конфіг, збереження/завантаження, панель коду синхронізації.
   Зміни проти попередньої версії:
   – запис іде транзакцією (читання → злиття → запис атомарно), а якщо злиття не вдалося, хмарні дані НЕ перезаписуються;
   – помилки більше не ковтаються: у чіпі ☁️ і в панелі видно «✓ / … / ⚠️» і причину (напр. закінчились правила тестового режиму);
   – код синхронізації створюється криптографічним генератором (12 символів, ≈60 біт) замість Math.random() (6 символів);
   – якщо SDK Firebase не завантажився (немає мережі), після появи інтернету він докантажується й синхронізація підключається. */
var FIREBASE_CONFIG = {
apiKey: "AIzaSyAynY9aCL3XZMsNlmzyXsn5k59bfqEYjvA",
authDomain: "nmt-tracker-f1957.firebaseapp.com",
projectId: "nmt-tracker-f1957",
storageBucket: "nmt-tracker-f1957.firebasestorage.app",
messagingSenderId: "759653672377",
appId: "1:759653672377:web:024eef48643e0944300268"
};
var FB_SDK=['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
var db=null;
// why: причина, чому db порожній ('config' — не налаштовано, 'sdk' — SDK не завантажився, 'init' — помилка ініціалізації)
// st: ''|'busy'|'ok'|'err'; t — час останньої успішної синхронізації; msg — текст помилки
var SYNC={why:'',st:'',t:0,msg:''};
function initFirebase(){
if(FIREBASE_CONFIG.apiKey==="ВСТАВ_СЮДИ"){ SYNC.why='config'; return; }
if(!window.firebase){ SYNC.why='sdk'; return; }
try{
if(!firebase.apps.length){ firebase.initializeApp(FIREBASE_CONFIG); }
db=firebase.firestore(); SYNC.why='';
}catch(e){ db=null; SYNC.why='init'; }
}
function loadScript(src,cb){
var s=document.createElement('script'); s.src=src; s.async=false;
s.onload=function(){ cb(null); }; s.onerror=function(){ cb(new Error('load '+src)); };
document.head.appendChild(s);
}
function ensureFirebase(cb){
if(window.firebase){ cb(null); return; }
loadScript(FB_SDK[0],function(e1){ if(e1){ cb(e1); return; } loadScript(FB_SDK[1],cb); });
}
// Після появи мережі: докантажити SDK (якщо його не було) і підтягнути/надіслати прогрес.
window.addEventListener('online',function(){
if(!db&&SYNC.why==='sdk'){
ensureFirebase(function(err){
if(err) return;
initFirebase();
if(!db){ render(); return; }
var code=getSyncCode();
if(!code){ render(); return; }
cloudLoad(code,function(remote){
if(remote){ STATE=mergeState(STATE,remote); norm(); }
render(); cloudSave();
});
});
} else if(db&&getSyncCode()&&SYNC.st==='err') cloudSave();
syncUI();
});
window.addEventListener('offline',function(){ syncUI(); });

// Код = ім'я документа у Firestore: без «/», не «.»/«..», не «__…__», до 100 символів (старі 6-символьні коди теж проходять)
function validSyncCode(c){
return typeof c==='string'&&c.length>=1&&c.length<=100&&!/[\/\\\u0000-\u001f]/.test(c)&&c!=='.'&&c!=='..'&&!/^__.*__$/.test(c);
}
var SYNC_ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 символи без плутаних I, O, 0, 1: 256 % 32 === 0, тож зсуву в розподілі немає
function newSyncCode(){
var c=window.crypto||window.msCrypto; if(!c||!c.getRandomValues) return '';
var n=12, buf=new Uint8Array(n), out='', i; c.getRandomValues(buf);
for(i=0;i<n;i++) out+=SYNC_ALPHA.charAt(buf[i]%32);
return out;
}
function getSyncCode(){ try{ return localStorage.getItem('nmt-sync-code')||''; }catch(e){ return ''; } }
function setSyncCodeLS(code){ try{ localStorage.setItem('nmt-sync-code', code); }catch(e){} }

// ---- Статус синхронізації (чіп і панель оновлюються на місці, без повного render) ----
function hm(t){ var d=new Date(t); return pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function syncErrText(e){
var c=(e&&e.code)||'';
if(c==='permission-denied') return 'Firestore відмовив у доступі — перевір правила бази (тестовий режим закінчується через 30 днів)';
if(c==='unavailable'||c==='deadline-exceeded'||(typeof navigator!=='undefined'&&navigator.onLine===false)) return 'немає зв\'язку з хмарою';
if(c==='resource-exhausted') return 'вичерпано квоту Firestore';
if(c==='invalid-argument'||c==='out-of-range') return 'документ завеликий або містить недозволені дані (ліміт Firestore ≈1 МБ)';
if(c==='merge') return 'не вдалося злити з хмарними даними — хмару не змінено';
return 'помилка '+(c||'невідома');
}
function setSync(st,msg){
SYNC.st=st; SYNC.msg=msg||'';
if(st==='ok') SYNC.t=Date.now();
syncUI();
}
function syncChipText(){
if(!db) return SYNC.why==='config'?'☁️ вимкнено':'☁️ немає зв\'язку';
var code=getSyncCode();
if(!code) return '☁️ не підключено';
var off=typeof navigator!=='undefined'&&navigator.onLine===false;
return '☁️ '+code+(off||SYNC.st==='err'?' ⚠️':SYNC.st==='busy'?' …':SYNC.st==='ok'?' ✓':'');
}
function syncStatusText(){
if(!db){
if(SYNC.why==='sdk') return 'Firebase не завантажився (немає інтернету або заблоковано). Прогрес зберігається в цьому браузері; коли з\'явиться мережа, підключення повториться саме.';
if(SYNC.why==='init') return 'Не вдалося запустити Firebase. Прогрес зберігається лише в цьому браузері.';
return '';
}
var code=getSyncCode();
if(!code) return 'Введи код на іншому пристрої, щоб з\'єднати прогрес';
var t;
if(SYNC.st==='err') t='⚠️ Не синхронізовано: '+SYNC.msg+'. Прогрес збережено в цьому браузері.';
else if(SYNC.st==='busy') t='Синхронізація…';
else if(SYNC.st==='ok') t='Синхронізовано ✓ о '+hm(SYNC.t)+' · код: '+code;
else t='Код активний: '+code;
if(code.length<10) t+=' · Код короткий і його легше вгадати — створи новий.';
return t;
}
function syncUI(){
var b=document.querySelector&&document.querySelector('#cloud .cloud-b'); if(b) b.textContent=syncChipText();
var m=document.getElementById('syncStatusMsg'); if(m) m.textContent=syncStatusText();
}

var _cs=null, _busy=false, _again=false;
function cloudSave(){
if(!db) return;
var code=getSyncCode(); if(!code||!validSyncCode(code)) return;
clearTimeout(_cs);
_cs=setTimeout(function(){ _cs=null; cloudPush(code); },700);
}
// Транзакція: читає хмарний документ, зливає з локальним (mergeState) і записує — запис з одного пристрою не затирає зміни з іншого.
// Firestore не приймає undefined, тому дані проходять через JSON. Якщо злиття впало — нічого не пишемо (раніше хмару перезаписувало локальним станом).
function cloudPush(code){
if(!db) return;
if(_busy){ _again=true; return; }
_busy=true; setSync('busy');
var ref=db.collection('nmt-tracker').doc(code);
db.runTransaction(function(tx){
return tx.get(ref).then(function(snap){
var out=STATE;
if(snap.exists){
try{ out=mergeState(STATE,snap.data()); }
catch(e){ var er=new Error('merge'); er.code='merge'; throw er; }
}
tx.set(ref,JSON.parse(JSON.stringify(out)));
});
}).then(function(){ setSync('ok'); })
.catch(function(e){ setSync('err',syncErrText(e)); })
.then(function(){ _busy=false; if(_again){ _again=false; cloudSave(); } });
}
window.addEventListener('pagehide',function(){ if(_cs){ clearTimeout(_cs); _cs=null; var c=getSyncCode(); if(db&&c&&validSyncCode(c)) cloudPush(c); } });
// cb(дані | null, помилка). null без помилки означає «документа ще немає».
function cloudLoad(code,cb){
if(!db){ cb(null); return; }
db.collection('nmt-tracker').doc(code).get().then(function(snap){
setSync('ok'); cb(snap.exists?snap.data():null);
}).catch(function(e){ setSync('err',syncErrText(e)); cb(null,e); });
}
function applySyncCode(){
var inp=document.getElementById('syncCodeInput');
var code=(inp.value||'').trim();
var st=document.getElementById('syncStatusMsg');
if(!code) return;
if(!validSyncCode(code)){ if(st) st.textContent='Некоректний код: без «/», не довший за 100 символів.'; return; }
if(!db){ if(st) st.textContent=syncStatusText()||'Хмара не налаштована у файлі (див. FIREBASE_CONFIG).'; return; }
setSyncCodeLS(code);
if(st) st.textContent='Завантаження…';
cloudLoad(code,function(remote,err){
if(err) return; // статус помилки вже показано
if(remote){
STATE=mergeState(STATE,remote); norm();
render();
persist();
} else {
cloudSave();
render();
}
});
}
function genSyncCode(){
var inp=document.getElementById('syncCodeInput');
var c=newSyncCode();
if(!c){ var st=document.getElementById('syncStatusMsg'); if(st) st.textContent='Браузер не підтримує безпечний генератор кодів. Впиши довгий код вручну.'; return; }
if(inp) inp.value=c;
applySyncCode();
}

function syncBarHTML(){
var code=db?getSyncCode():'';
var h='<div class="cloud'+(UI.co?' open':'')+'" id="cloud"><button type="button" class="cloud-b" onclick="cloudToggle(event)" aria-label="Хмарна синхронізація" title="Хмарна синхронізація">'+esc(syncChipText())+'</button><div class="cloud-p"><div class="cloud-pi sync">';
if(!db){
if(SYNC.why==='config') h+='<span class="meta" style="padding-left:0">☁️ Хмарна синхронізація вимкнена. Щоб прогрес бачило на всіх пристроях — впиши свій Firebase-конфіг у файл (див. FIREBASE_CONFIG на початку коду). Без цього прогрес зберігається лише в пам\'яті цього браузера.</span>';
else h+='<span class="meta" id="syncStatusMsg" style="padding-left:0">'+esc(syncStatusText())+'</span>';
} else {
h+='<input id="syncCodeInput" placeholder="код синхронізації" autocomplete="off" autocapitalize="characters" spellcheck="false" value="'+esc(code)+'">'
+'<button type="button" onclick="applySyncCode()">Підключити</button>'
+'<button type="button" onclick="genSyncCode()">Створити новий код</button>'
+'<span id="syncStatusMsg" class="meta" style="padding-left:0">'+esc(syncStatusText())+'</span>';
}
return h+'</div></div></div>';
}
