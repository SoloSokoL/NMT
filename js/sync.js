/* ===== Хмарна синхронізація (Firebase Firestore) =====
   Конфіг, збереження/завантаження, панель коду синхронізації. */
var FIREBASE_CONFIG = {
apiKey: "AIzaSyAynY9aCL3XZMsNlmzyXsn5k59bfqEYjvA",
authDomain: "nmt-tracker-f1957.firebaseapp.com",
projectId: "nmt-tracker-f1957",
storageBucket: "nmt-tracker-f1957.firebasestorage.app",
messagingSenderId: "759653672377",
appId: "1:759653672377:web:024eef48643e0944300268"
};
var db=null;
function initFirebase(){
if(FIREBASE_CONFIG.apiKey==="ВСТАВ_СЮДИ") return;
try{
if(window.firebase && !firebase.apps.length){ firebase.initializeApp(FIREBASE_CONFIG); }
db=firebase.firestore();
}catch(e){ db=null; }
}
function getSyncCode(){ try{ return localStorage.getItem('nmt-sync-code')||''; }catch(e){ return ''; } }
function setSyncCodeLS(code){ try{ localStorage.setItem('nmt-sync-code', code); }catch(e){} }
var _cs=null;
function cloudSave(){
if(!db) return;
var code=getSyncCode(); if(!code) return;
clearTimeout(_cs);
_cs=setTimeout(function(){ _cs=null; cloudPush(code); },700);
}
// Перед записом читає хмарний документ і зливає його з локальним (mergeState), щоб запис з одного пристрою не затирав зміни з іншого.
// Firestore не приймає undefined, тому дані проходять через JSON.
function cloudPush(code){
var ref=db.collection('nmt-tracker').doc(code);
ref.get().then(function(snap){
var out=STATE;
if(snap.exists){ try{ out=mergeState(STATE,snap.data()); }catch(e){ out=STATE; } }
return ref.set(JSON.parse(JSON.stringify(out)));
}).catch(function(){});
}
window.addEventListener('pagehide',function(){ if(_cs){ clearTimeout(_cs); _cs=null; var c=getSyncCode(); if(db&&c) cloudPush(c); } });
function cloudLoad(code,cb){
if(!db){ cb(null); return; }
db.collection('nmt-tracker').doc(code).get().then(function(snap){
cb(snap.exists?snap.data():null);
}).catch(function(){ cb(null); });
}
function applySyncCode(){
var inp=document.getElementById('syncCodeInput');
var code=(inp.value||'').trim();
var st=document.getElementById('syncStatusMsg');
if(!code) return;
setSyncCodeLS(code);
if(!db){ if(st) st.textContent='Хмара не налаштована у файлі (див. FIREBASE_CONFIG).'; return; }
if(st) st.textContent='Завантаження…';
cloudLoad(code,function(remote){
if(remote){
STATE=mergeState(STATE,remote); norm();
render();
persist();
if(st) st.textContent='Синхронізовано ✓';
} else {
cloudSave();
render();
if(st) st.textContent='Новий код створено, дані збережено ✓';
}
});
}
function genSyncCode(){
var inp=document.getElementById('syncCodeInput');
var c=Math.random().toString(36).slice(2,8).toUpperCase();
if(inp) inp.value=c;
applySyncCode();
}

function syncBarHTML(){
var code=db?getSyncCode():'';
var chip=db?(code?'☁️ '+esc(code):'☁️ не підключено'):'☁️ вимкнено';
var h='<div class="cloud'+(UI.co?' open':'')+'" id="cloud"><button type="button" class="cloud-b" onclick="cloudToggle(event)" aria-label="Хмарна синхронізація" title="Хмарна синхронізація">'+chip+'</button><div class="cloud-p"><div class="cloud-pi sync">';
if(!db){
h+='<span class="meta" style="padding-left:0">☁️ Хмарна синхронізація вимкнена. Щоб прогрес бачило на всіх пристроях — впиши свій Firebase-конфіг у файл (див. FIREBASE_CONFIG на початку коду). Без цього прогрес зберігається лише в пам\'яті цього браузера.</span>';
} else {
h+='<input id="syncCodeInput" placeholder="код синхронізації" value="'+esc(code)+'">'
+'<button type="button" onclick="applySyncCode()">Підключити</button>'
+'<button type="button" onclick="genSyncCode()">Створити новий код</button>'
+'<span id="syncStatusMsg" class="meta" style="padding-left:0">'+(code?'Код активний: '+esc(code):'Введи код на іншому пристрої, щоб з\'єднати прогрес')+'</span>';
}
return h+'</div></div></div>';
}
