/* ===== Розширення: план, повторення, помилки, копії, безпечна синхронізація ===== */
var DAY=86400000, REV=[1,3,7,14,30,60];
// Розклад тижня (Пн..Нд): єдине джерело правди і для смужки тижня, і для блоку «Сьогодні». Порожній день — повторення.
// Історія дає найбільше балів (54), тому має два дні.
var WEEK=[['math'],['ukr'],['hist'],['math'],['ukr','eng'],['math','hist'],[]];
var SCHED=WEEK, WEEKD=['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
function rhythmHTML(){
return '<div class="rhythm">'+WEEK.map(function(subs,i){
var ttl=subs.length?subs.map(function(s){ return META[s].name; }).join(', '):'Повторення';
var dots=subs.length?subs.map(function(s){ return '<i class="dot" style="background:'+META[s].color+'"></i>'; }).join(''):'<i class="dot" style="background:#9a9da3"></i>';
return '<div class="day" title="'+ttl+'"><span>'+WEEKD[i]+'</span><div class="dots">'+dots+'</div></div>';
}).join('')+'</div>';
}
var ICON={math:'📐',ukr:'🔤',hist:'🏛️',eng:'🇬🇧'};
var UI={q:'',hd:false,eo:false};
try{ UI.hd=localStorage.getItem('nmt-hd')==='1'; }catch(e){}

function isoDay(t){ var d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function parseDM(s){
var m=/^(\d\d)\.(\d\d)$/.exec(s||''); if(!m) return 0;
var n=new Date(), t=new Date(n.getFullYear(),+m[2]-1,+m[1],12);
if(t>n) t=new Date(n.getFullYear()-1,+m[2]-1,+m[1],12);
return t.getTime();
}
function doneTs(d){ return d.ts||parseDM(d.date); }
function lastTs(d){ return d.last||doneTs(d); }
// Через скільки днів повторити (<=0 — вже час). Слабкі теми (🔴) повторюються удвічі частіше.
function dueIn(d){
if(!d||!d.done) return null;
var l=lastTs(d); if(!l) return null;
var iv=REV[Math.min(d.rv||0,REV.length-1)];
if(d.conf===1) iv=Math.max(1,Math.ceil(iv/2));
return Math.ceil((l+iv*DAY-Date.now())/DAY);
}
function isDue(d){ var x=dueIn(d); return x!==null&&x<=0; }
function bump(){ var k=isoDay(Date.now()); STATE.act=STATE.act||{}; STATE.act[k]=(STATE.act[k]||0)+1; }
function streak(){
var a=STATE.act||{}, n=0, t=new Date(); t.setHours(12,0,0,0); t=t.getTime();
if(!a[isoDay(t)]) t-=DAY;
while(a[isoDay(t)]){ n++; t-=DAY; }
return n;
}
function norm(){
ORDER.forEach(function(s){ STATE[s]=STATE[s]||{}; });
STATE.mockLog=STATE.mockLog||{};
ORDER.forEach(function(s){ STATE.mockLog[s]=STATE.mockLog[s]||[]; });
STATE.errs=STATE.errs||[]; STATE.cfg=STATE.cfg||{}; STATE.act=STATE.act||{}; STATE.archive=STATE.archive||{};
}
// ---- Версія схеми й міграція ----
// v1: прогрес за індексом (STATE[subj][0..n]); v2: за стабільним id ('math-0003'); v3: оновлений список тем (злиття, архів, нові теми).
var SCHEMA=3;
function ST(s,i){ return (STATE[s]||{})[TID[s][i]]; }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function pad4(n){ return ('0000'+n).slice(-4); }
// Склад списку у версії 2: id, які тоді були «живими».
function v2Live(s){
var r={}, i;
if(s==='math') V2_MATH.forEach(function(n){ r[s+'-'+pad4(n)]=1; });
else for(i=0;i<V2_COUNT[s];i++) r[s+'-'+pad4(i)]=1;
return r;
}
function hasData(e){ return !!(e&&(e.done||e.note||e.conf||e.count||e.rv>0||e.date)); }
function toArchive(o,s,id,e,into){
var c=clone(e); c.title=OLD_T[id]||DROPPED[id]||c.title||''; if(into) c.into=into;
(o.archive[s]=o.archive[s]||{})[id]=c;
}
// v1 -> v2. Нічого не перезаписує: повертає нову копію. Теми, яких не було в списку v2, йдуть в STATE.archive разом із назвою.
function migrateV1(S){
var o={}, f;
for(f in S) if(ORDER.indexOf(f)<0) o[f]=S[f];
o.archive=clone(S.archive||{});
ORDER.forEach(function(s){
var live=v2Live(s), m=S[s]||{}; o[s]={};
Object.keys(m).forEach(function(k){
var id=/^\d+$/.test(k)?s+'-'+pad4(k):k;
if(live[id]) o[s][id]=m[k];
else{ var e=clone(m[k]||{}); e.title=DROPPED[id]||e.title||''; (o.archive[s]=o.archive[s]||{})[id]=e; }
});
});
o.ver=2; return o;
}
// Об'єднує записи старих тем у запис злитої (усі старі виконані): найпізніша дата, найслабша впевненість, найменший лічильник повторень.
function mergeDone(es){
var best=es.slice().sort(function(a,b){ return doneTs(b)-doneTs(a); })[0], e=clone(best);
var confs=es.map(function(x){ return x.conf||0; }).filter(function(c){ return c>0; });
var notes=es.map(function(x){ return (x.note||'').trim(); }).filter(Boolean);
var cnt=es.map(function(x){ return x.count; }).filter(function(c){ return c!==undefined&&c!==''&&c!==null; });
e.done=true;
e.upd=Math.max.apply(null,es.map(function(x){ return x.upd||0; }));
e.last=Math.max.apply(null,es.map(lastTs)); if(!e.last) delete e.last;
e.rv=Math.min.apply(null,es.map(function(x){ return x.rv||0; }));
if(confs.length) e.conf=Math.min.apply(null,confs); else delete e.conf;
if(notes.length) e.note=notes.join(' · '); else delete e.note;
if(cnt.length){ var nums=cnt.every(function(c){ return /^\d+$/.test(String(c)); }); e.count=nums?String(cnt.reduce(function(a,c){ return a+(+c); },0)):cnt.join(' + '); } else delete e.count;
return e;
}
// v2 -> v3. Нова тема виконана, лише якщо виконані ВСІ її старі теми.
// Інакше вона лишається невиконаною, а старі записи (дата, нотатки, впевненість) йдуть в архів з полем into.
function migrateV2(S){
var o={}, f;
for(f in S) if(ORDER.indexOf(f)<0) o[f]=S[f];
o.archive=clone(S.archive||{});
ORDER.forEach(function(s){
var m=S[s]||{}, out={}, claimed={}, live={}, arch={}, groups=MERGE_V3[s]||{};
TID[s].forEach(function(id){ live[id]=1; });
(ARCH_V3[s]||[]).forEach(function(id){ arch[id]=1; });
Object.keys(groups).forEach(function(nid){
var olds=groups[nid], es=olds.map(function(id){ return m[id]; });
olds.forEach(function(id){ claimed[id]=1; });
if(es.every(function(e){ return e&&e.done; })) out[nid]=mergeDone(es);
else olds.forEach(function(id){ if(hasData(m[id])) toArchive(o,s,id,m[id],nid); });
});
Object.keys(m).forEach(function(k){
if(claimed[k]) return;
if(arch[k]){ if(hasData(m[k])) toArchive(o,s,k,m[k],null); return; }
if(live[k]) out[k]=m[k];
else if(hasData(m[k])) toArchive(o,s,k,m[k],null);
});
o[s]=out;
});
o.ver=3; return o;
}
function migrate(S){
S=S||{};
var v=S.ver||1;
if(v>=SCHEMA) return S;
if(v<2) S=migrateV1(S);
return migrateV2(S);
}
// Перед міграцією кладе страхову копію попереднього формату (окремі ключі; основні не чіпає).
function backupLegacy(){
try{
var raw=localStorage.getItem('nmt-tracker-state'); if(!raw) return;
var v=JSON.parse(raw).ver||1;
if(v<2&&!localStorage.getItem('nmt-state-v1-backup')) localStorage.setItem('nmt-state-v1-backup',raw);
if(v===2&&!localStorage.getItem('nmt-state-v2-backup')) localStorage.setItem('nmt-state-v2-backup',raw);
}catch(e){}
}
function archiveHTML(){
var rows=[], dn=0;
ORDER.forEach(function(s){
var a=(STATE.archive||{})[s]||{};
Object.keys(a).forEach(function(k){
var e=a[k]; if(e.done) dn++;
var tgt=''; if(e.into){ var ti=TID[s].indexOf(e.into); if(ti>-1) tgt=' → '+esc(TOPICS[s][ti]); }
rows.push('<div class="er"><span>'+(ICON[s]||'')+' '+esc(e.title||k)+' <i>'+(e.done?esc(e.date||'виконано'):'не виконано')+tgt+'</i></span></div>');
});
});
if(!rows.length) return '';
return '<details class="card blk"><summary>🗂️ Архів прогресу ('+rows.length+' тем, виконано: '+dn+')</summary><p class="meta">Старі теми, які об\'єднано або прибрано зі списку (стрілка веде до нової теми). Дані збережені й потрапляють у копії та хмару.</p>'+rows.join('')+'</details>';
}
// Злиття локального й хмарного прогресу: для кожної теми виграє новіша зміна, нічого не губиться.
function mergeState(a,b){
var A=migrate(a), B=migrate(b), o={ver:SCHEMA,archive:{}};
ORDER.forEach(function(s){
o[s]={}; var x=A[s]||{}, y=B[s]||{};
Object.keys(x).concat(Object.keys(y)).forEach(function(k){
var p=x[k], q=y[k];
if(!p||!q){ o[s][k]=p||q; return; }
var pu=p.upd||0, qu=q.upd||0;
o[s][k]=pu>qu?p:qu>pu?q:((p.done&&!q.done)?p:q);
});
});
var la=A.lupd||0, lb=B.lupd||0;
o.mockLog={};
ORDER.forEach(function(s){
var x=(A.mockLog&&A.mockLog[s])||[], y=(B.mockLog&&B.mockLog[s])||[];
o.mockLog[s]=la===lb?(y.length>x.length?y:x):(lb>la?y:x);
});
var ea=A.errs||[], eb=B.errs||[];
o.errs=la===lb?(eb.length>ea.length?eb:ea):(lb>la?eb:ea);
o.lupd=Math.max(la,lb);
var ca=A.cfg||{}, cb=B.cfg||{};
o.cfg=(cb.upd||0)>(ca.upd||0)?cb:ca;
o.act={};
[A.act||{},B.act||{}].forEach(function(m){ for(var k in m) o.act[k]=Math.max(o.act[k]||0,m[k]); });
[A.archive||{},B.archive||{}].forEach(function(m){
for(var s in m){ o.archive[s]=o.archive[s]||{}; for(var k in m[s]){ var p=o.archive[s][k], q=m[s][k]; if(!p||(q.upd||0)>(p.upd||0)) o.archive[s][k]=q; } }
});
return o;
}

function toggle(subj,i){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{}, n=Date.now();
cur.done=!cur.done; cur.upd=n;
if(cur.done){ cur.date=todayStr(); cur.ts=n; cur.last=n; cur.rv=0; bump(); }
else { cur.date=''; delete cur.ts; delete cur.last; cur.rv=0; }
STATE[subj][TID[subj][i]]=cur;
render(); persist();
}
function cycleConf(subj,i){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{};
cur.conf=({0:3,3:2,2:1,1:3})[cur.conf||0]; cur.upd=Date.now();
STATE[subj][TID[subj][i]]=cur;
render(); persist();
}
function confBtn(subj,i,d){
return '<button type="button" class="conf c'+(d.conf||0)+'" title="Впевненість у темі (клік змінює): 🟢 добре · 🟡 так собі · 🔴 слабо" aria-label="Впевненість: '+['не оцінено','слабко','так собі','добре'][d.conf||0]+'" onclick="cycleConf(\''+subj+'\','+i+')"></button>';
}
function reviewTopic(subj,i,ok){
var cur=(STATE[subj]||{})[TID[subj][i]]; if(!cur) return;
var n=Date.now();
if(ok){ cur.rv=(cur.rv||0)+1; if(cur.conf===1) cur.conf=2; } else { cur.rv=0; cur.conf=1; }
cur.last=n; cur.upd=n; bump();
render(); persist();
}
function setExam(v){
STATE.cfg=STATE.cfg||{}; STATE.cfg.exam=v; STATE.cfg.upd=Date.now();
render(); persist();
}

function addErr(ev){
ev.preventDefault();
var s=document.getElementById('errS').value, t=(document.getElementById('errT').value||'').trim();
if(!t) return false;
var n=Date.now();
STATE.errs=STATE.errs||[]; STATE.errs.push({id:n,s:s,t:t.slice(0,300),ts:n,fx:0});
STATE.lupd=n; bump(); UI.eo=true; render(); persist();
return false;
}
function fixErr(id){
(STATE.errs||[]).forEach(function(e){ if(e.id===id) e.fx=e.fx?0:1; });
STATE.lupd=Date.now(); bump(); render(); persist();
}
function delErr(id){
STATE.errs=(STATE.errs||[]).filter(function(e){ return e.id!==id; });
STATE.lupd=Date.now(); render(); persist();
}

function dashHTML(){
var n=Date.now(), ex=(STATE.cfg&&STATE.cfg.exam)||'', left=0, tot=0, recent=0, h='';
ORDER.forEach(function(s){
TOPICS[s].forEach(function(_,i){
tot++; var d=ST(s,i);
if(d&&d.done){ if(n-doneTs(d)<14*DAY) recent++; } else left++;
});
});
var pace=recent/2;
var dl=ex?Math.ceil((new Date(ex+'T09:00:00').getTime()-n)/DAY):NaN;
h+='<div class="dash"><div class="card"><h3>🎯 Мій план</h3><div class="plan-row"><label>Дата НМТ <input type="date" value="'+esc(ex)+'" onchange="setExam(this.value)"></label>';
if(dl>0) h+='<span class="pill">до НМТ '+dl+' дн.</span>';
h+='</div>';
if(!ex) h+='<p class="meta">Вкажи дату НМТ — з\'явиться потрібний темп навчання.</p>';
else if(!(dl>0)) h+='<p class="meta">Дата вже минула або некоректна — онови її.</p>';
else if(dl<=28) h+='<p class="meta">Режим фінішу: повні пробні НМТ на час, журнал помилок і повторення. Нових тем — мінімум.</p>';
else{
var need=left/((dl-28)/7);
h+='<p class="meta">Лишилось тем: <b>'+left+'</b> із '+tot+'. Щоб останні 4 тижні лишити під пробні НМТ, потрібно ≈ <b>'+need.toFixed(1)+'</b> тем/тиждень; зараз ≈ <b>'+pace.toFixed(1)+'</b> '+(pace>=need?'✅':'⚠️ відстаєш')+'</p>';
}
h+='</div>';

var wd=(new Date().getDay()+6)%7, subs=SCHED[wd];
h+='<div class="card"><h3>📅 Сьогодні <span class="pill">🔥 серія: '+streak()+' дн.</span></h3>';
if(!subs.length) h+='<p class="meta">Неділя: повторення, помилки, легкий тест.</p>';
subs.forEach(function(s){
var nx=[];
for(var i=0;i<TOPICS[s].length&&nx.length<2;i++){ if(!(ST(s,i)&&ST(s,i).done)) nx.push(i); }
h+='<div class="tl" style="--c:'+META[s].color+'"><b>'+ICON[s]+' '+META[s].name+'</b>'+(nx.length?'':'<span>усе пройдено 🎉</span>');
nx.forEach(function(i){ h+='<a href="#r-'+s+'-'+i+'">'+esc(TOPICS[s][i])+'</a>'; });
h+='</div>';
});
var due=[];
ORDER.forEach(function(s){
for(var k=0;k<TID[s].length;k++){ var x=dueIn(ST(s,k)); if(x!==null&&x<=0) due.push({s:s,i:k,x:x}); }
});
due.sort(function(a,b){ return a.x-b.x; });
h+='<h4>🔁 Повторити: '+due.length+'</h4>'+(due.length?'<p class="meta">Спершу згадай тему без підглядання, потім відповідай чесно.</p>':'<p class="meta">Черга порожня.</p>');
due.slice(0,5).forEach(function(o){
h+='<div class="rv" style="--c:'+META[o.s].color+'"><a href="#r-'+o.s+'-'+o.i+'">'+ICON[o.s]+' '+esc(TOPICS[o.s][o.i])+'</a>'
+'<button type="button" class="ok" onclick="reviewTopic(\''+o.s+'\','+o.i+',1)">Пам\'ятаю</button>'
+'<button type="button" onclick="reviewTopic(\''+o.s+'\','+o.i+',0)">Забув</button></div>';
});
if(due.length>5) h+='<p class="meta">…і ще '+(due.length-5)+' у черзі</p>';
var ue=(STATE.errs||[]).filter(function(e){ return !e.fx; }).length;
if(ue) h+='<p class="meta">✍️ Нерозібраних помилок: '+ue+' — перерішай їх у журналі нижче.</p>';
return h+'</div></div>';
}

function errHTML(){
var errs=(STATE.errs||[]).slice().sort(function(a,b){ return ((a.fx?1:0)-(b.fx?1:0))||((b.ts||0)-(a.ts||0)); });
var open=errs.filter(function(e){ return !e.fx; }).length;
var h='<details class="card blk" id="errBox"'+(UI.eo?' open':'')+' ontoggle="UI.eo=this.open"><summary>📓 Журнал помилок ('+open+' відкритих)</summary>';
h+='<form class="errf" onsubmit="return addErr(event)"><select id="errS">'+ORDER.map(function(s){ return '<option value="'+s+'">'+META[s].name+'</option>'; }).join('')+'</select>'
+'<input id="errT" placeholder="Що вийшло не так і яке правило забув?" maxlength="300" required><button type="submit">Додати</button></form>';
errs.forEach(function(e){
var id=+e.id||0;
h+='<div class="er'+(e.fx?' fx':'')+'"><span>'+(ICON[e.s]||'')+' '+esc(e.t)+' <i>'+esc(isoDay(e.ts||0))+'</i></span>'
+'<button type="button" onclick="fixErr('+id+')">'+(e.fx?'↩︎':'Перерішав ✓')+'</button>'
+'<button type="button" class="chip-x" title="Видалити" onclick="delErr('+id+')">✕</button></div>';
});
if(!errs.length) h+='<p class="meta">Записуй кожну помилку з пробників. Через кілька днів перерішай її без підглядання — і познач «Перерішав».</p>';
return h+'</details>';
}

function toolbarHTML(){
return '<div class="tools"><input type="search" id="qIn" placeholder="🔎 Пошук теми…" value="'+esc(UI.q)+'" oninput="UI.q=this.value;applyFilter()">'
+'<label><input type="checkbox" '+(UI.hd?'checked':'')+' onchange="UI.hd=this.checked;try{localStorage.setItem(\'nmt-hd\',UI.hd?\'1\':\'0\');}catch(e){}applyFilter()"> сховати виконані</label></div>';
}
function applyFilter(){
document.body.classList.toggle('hd',UI.hd);
var q=(UI.q||'').trim().toLowerCase(), rows=document.querySelectorAll('.row[data-t]');
for(var i=0;i<rows.length;i++) rows[i].style.display=(!q||rows[i].getAttribute('data-t').indexOf(q)>-1)?'':'none';
}
function afterRender(){
var ds=document.querySelectorAll('.rhythm .day'), wd=(new Date().getDay()+6)%7;
if(ds[wd]) ds[wd].classList.add('today');
applyFilter();
enterAnim();
}

function trendHTML(m,color){
var v=m.map(function(x){ return +x.score||0; });
if(v.length<2) return '';
var d=v[v.length-1]-v[v.length-2], w=110, h=26, mx=Math.max.apply(null,v.concat([1]));
var pts=v.map(function(y,i){ return (i*w/(v.length-1)).toFixed(1)+','+(h-2-y/mx*(h-4)).toFixed(1); }).join(' ');
return '<div class="trend"><svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><polyline fill="none" stroke="'+color+'" stroke-width="2" points="'+pts+'"/></svg><span>'+(d>0?'▲ +'+d:d<0?'▼ '+d:'▬ 0')+' до попереднього</span></div>';
}

function backupHTML(){
return '<div class="sync"><button type="button" onclick="exportData()">⬇️ Зберегти копію</button>'
+'<label class="filebtn">⬆️ Відновити з копії<input type="file" accept=".json,application/json" onchange="importData(this)" hidden></label>'
+'<span class="meta" style="padding-left:0">Копія — файл з усім прогресом. Зберігай раз на тиждень.</span></div>';
}
function exportData(){
var b=new Blob([JSON.stringify(STATE)],{type:'application/json'}), a=document.createElement('a');
a.href=URL.createObjectURL(b); a.download='nmt-progress-'+isoDay(Date.now())+'.json';
document.body.appendChild(a); a.click(); a.remove();
}
function importData(inp){
var f=inp.files&&inp.files[0]; if(!f) return;
var r=new FileReader();
r.onload=function(){
try{
var o=JSON.parse(r.result);
if(!o||typeof o!=='object'||!o.math) throw 0;
STATE=mergeState(STATE,o); norm(); render(); persist();
}catch(e){ alert('Не вдалося прочитати файл копії.'); }
};
r.readAsText(f);
}

/* ===== v4: «що робити зараз», таймер пробника, слабкі теми, статистика, тема оформлення ===== */
function logMock(subj,val){
STATE.mockLog=STATE.mockLog||{}; STATE.mockLog[subj]=STATE.mockLog[subj]||[];
STATE.mockLog[subj].push({date:todayStr(),score:val});
STATE.lupd=Date.now(); bump();
}
// ---- Слабкі теми і що робити зараз ----
function pctOf(d){ return (d&&d.pct!==undefined&&d.pct!==''&&d.pct!==null)?+d.pct:null; }
function weakList(){
var out=[];
ORDER.forEach(function(s){
for(var i=0;i<TID[s].length;i++){
var d=ST(s,i), p=pctOf(d);
if(d&&d.done&&(d.conf===1||(p!==null&&p<50))) out.push({s:s,i:i,p:p});
}
});
out.sort(function(a,b){ return (a.p===null?50:a.p)-(b.p===null?50:b.p); });
return out;
}
function unrated(){
var n=0; ORDER.forEach(function(s){ for(var i=0;i<TID[s].length;i++){ var d=ST(s,i); if(d&&d.done&&!d.conf) n++; } });
return n;
}
function weakHTML(){
var w=weakList(), un=unrated();
var h='<details class="card blk" id="weakBox"'+(w.length?' open':'')+'><summary>🔴 Слабкі теми ('+w.length+')</summary>';
if(!w.length) h+='<p class="meta">Поки порожньо. Став 🟢/🟡/🔴 біля теми або впиши «тест %» — слабкі теми з\'являться тут і повторюватимуться вдвічі частіше.</p>';
w.slice(0,12).forEach(function(o){
h+='<div class="rv" style="--c:'+META[o.s].color+'"><a href="#r-'+o.s+'-'+o.i+'">'+ICON[o.s]+' '+esc(TOPICS[o.s][o.i])+(o.p!==null?' <i>'+o.p+'%</i>':'')+'</a>'
+'<button type="button" class="ok" onclick="reviewTopic(\''+o.s+'\','+o.i+',1)">Закріпив ✓</button></div>';
});
if(w.length>12) h+='<p class="meta">…і ще '+(w.length-12)+'</p>';
if(un) h+='<p class="meta">Виконаних тем без оцінки впевненості: '+un+'. Постав крапку 🟢🟡🔴 — без цього тренажер не знає, що повторювати.</p>';
return h+'</details>';
}
function nowHTML(){
var n=Date.now(), ex=(STATE.cfg&&STATE.cfg.exam)||'', dl=ex?Math.ceil((new Date(ex+'T09:00:00').getTime()-n)/DAY):NaN;
var due=[];
ORDER.forEach(function(s){ for(var k=0;k<TID[s].length;k++){ var x=dueIn(ST(s,k)); if(x!==null&&x<=0) due.push({s:s,i:k,x:x}); } });
due.sort(function(a,b){ return a.x-b.x; });
var wd=(new Date().getDay()+6)%7, subs=(SCHED[wd]||[]).slice(), nxt=null;
function firstOpen(s){ for(var i=0;i<TID[s].length;i++){ var d=ST(s,i); if(!(d&&d.done)) return i; } return -1; }
for(var a=0;a<subs.length&&!nxt;a++){ var fi=firstOpen(subs[a]); if(fi>-1) nxt={s:subs[a],i:fi}; }
if(!nxt){
var best=null;
ORDER.forEach(function(s){ var fi=firstOpen(s); if(fi<0) return; var dn=0; for(var k=0;k<TID[s].length;k++){ var d=ST(s,k); if(d&&d.done) dn++; } var r=dn/TID[s].length; if(!best||r<best.r) best={s:s,i:fi,r:r}; });
if(best) nxt=best;
}
var weak=weakList(), ue=(STATE.errs||[]).filter(function(e){ return !e.fx; }).length, m=null;
function tl(o){ return ICON[o.s]+' '+esc(TOPICS[o.s][o.i]); }
if(dl>0&&dl<=28) m={k:'📝 Повний пробник НМТ',t:'Пройди варіант на час',href:'#sub-math',s:'До НМТ '+dl+' дн. — тепер головне пробники й розбір помилок.'};
else if(due.length) m={k:'🔁 Повтори (≈10 хв)',t:tl(due[0]),href:'#r-'+due[0].s+'-'+due[0].i,s:'Спершу згадай без підглядання, потім відповідай чесно. У черзі: '+due.length+'.'};
else if(weak.length) m={k:'🔴 Закріпи слабку тему',t:tl(weak[0]),href:'#r-'+weak[0].s+'-'+weak[0].i,s:'Перерішай 10–15 завдань, потім онови «тест %».'};
else if(ue) m={k:'📓 Розбери помилки',t:'Нерозібраних: '+ue,href:'#errBox',s:'Перерішай їх без підглядання і познач «Перерішав».'};
else if(nxt) m={k:'🆕 Нова тема',t:tl(nxt),href:'#r-'+nxt.s+'-'+nxt.i,s:'≈'+META[nxt.s].time+'. Після теми зроби тест і впиши %.'};
else m={k:'🏁 Усі теми пройдено',t:'Роби повні пробники',href:'#sub-math',s:'Далі — пробні НМТ і розбір помилок.'};
var h='<div class="card now"><div class="now-k">▶ Що робити зараз</div><a class="now-t" href="'+m.href+'"><b>'+m.k+':</b> '+m.t+'</a><p class="meta">'+m.s+'</p>';
if(nxt&&m.k.indexOf('Нова')<0) h+='<p class="meta now-n">Далі нова тема: <a href="#r-'+nxt.s+'-'+nxt.i+'">'+tl(nxt)+'</a></p>';
return h+'</div>';
}

// ---- Результат тесту з теми → впевненість ----
function pctInput(subj,i,d){
var p=pctOf(d);
return '<span class="cnt-label">тест %:</span><input class="pc" type="number" inputmode="numeric" min="0" max="100" value="'+(p===null?'':p)+'" aria-label="Результат тесту з теми, відсотків" title="≥80 → 🟢, 50–79 → 🟡, <50 → 🔴 (слабкі теми повторюються частіше)" onchange="pctChange(\''+subj+'\','+i+',this.value)">';
}
function pctChange(subj,i,val){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{}, n=Date.now();
if(String(val).trim()===''){ delete cur.pct; cur.upd=n; STATE[subj][TID[subj][i]]=cur; render(); persist(); return; }
var v=Math.round(+val); if(isNaN(v)) return;
v=Math.max(0,Math.min(100,v));
cur.pct=v; cur.conf=v>=80?3:v>=50?2:1; cur.upd=n;
if(cur.done){ cur.last=n; if(v<50) cur.rv=0; }
bump();
STATE[subj][TID[subj][i]]=cur;
render(); persist();
}

// ---- Статистика пробників і ціль ----
function setGoal(subj,val){
STATE.cfg=STATE.cfg||{}; STATE.cfg.goal=STATE.cfg.goal||{};
var v=parseFloat(val); if(isNaN(v)) delete STATE.cfg.goal[subj]; else STATE.cfg.goal[subj]=v;
STATE.cfg.upd=Date.now(); render(); persist();
}
function statsHTML(subj,mocks){
var goal=((STATE.cfg||{}).goal||{})[subj], v=mocks.map(function(x){ return +x.score; }).filter(function(x){ return isFinite(x); });
var h='<div class="mstat">', a3=0;
if(v.length){
var sum=v.reduce(function(a,b){ return a+b; },0), l3=v.slice(-3);
a3=l3.reduce(function(a,b){ return a+b; },0)/l3.length;
h+='<span>сер. <b>'+Math.round(sum/v.length)+'</b></span><span>найкращий <b>'+Math.max.apply(null,v)+'</b></span><span>ост. 3: <b>'+Math.round(a3)+'</b></span>';
}
h+='<label>ціль <input class="gl" type="number" min="0" max="200" value="'+(goal===undefined?'':goal)+'" aria-label="Цільовий бал" onchange="setGoal(\''+subj+'\',this.value)"></label>';
if(goal!==undefined&&v.length) h+=(goal-a3>0)?'<span>до цілі: <b>'+Math.round(goal-a3)+'</b></span>':'<span>ціль досягнута ✅</span>';
return h+'</div>';
}

// ---- Навігація й тема оформлення ----
var THEMES=['auto','light','dark'], THEME_IC={auto:'🌓',light:'☀️',dark:'🌙'}, THEME_NM={auto:'авто',light:'світла',dark:'темна'};
function getTheme(){ try{ return localStorage.getItem('nmt-theme')||'auto'; }catch(e){ return 'auto'; } }
function applyTheme(){
var t=getTheme(), r=document.documentElement;
if(t==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',t);
}
function cycleTheme(){
var nx=THEMES[(THEMES.indexOf(getTheme())+1)%THEMES.length];
try{ localStorage.setItem('nmt-theme',nx); }catch(e){}
applyTheme(); render();
}
function navHTML(){
return '<nav class="subnav" aria-label="Предмети">'+ORDER.map(function(s){
var dn=0, t=TID[s].length; for(var i=0;i<t;i++){ var d=ST(s,i); if(d&&d.done) dn++; }
return '<a href="#sub-'+s+'" style="--c:'+META[s].color+'" title="'+META[s].name+'">'+ICON[s]+' '+Math.round(dn/t*100)+'%</a>';
}).join('')+'<button type="button" class="thm" onclick="cycleTheme()" aria-label="Тема оформлення: '+THEME_NM[getTheme()]+'" title="Тема: '+THEME_NM[getTheme()]+'">'+THEME_IC[getTheme()]+'</button></nav>';
}
applyTheme();
if('serviceWorker' in navigator) window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });

// Анімація входу лише при першому показі (render() перебудовує DOM, тож без цього вона б повторювалась при кожному кліку)
var ENTERED=false;
function enterAnim(){
if(ENTERED) return; ENTERED=true;
var b=document.body; b.classList.add('enter');
setTimeout(function(){ b.classList.remove('enter'); },1400);
}
