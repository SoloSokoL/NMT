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
var c1=subs.length?META[subs[0]].color:'#9a9da3', c2=subs.length>1?META[subs[1]].color:c1;
return '<div class="day" title="'+ttl+'" style="--c:'+c1+';--c2:'+c2+'"><span>'+WEEKD[i]+'</span><div class="dots">'+dots+'</div></div>';
}).join('')+'</div>';
}
var ICON={math:'📐',ukr:'🔤',hist:'🏛️',eng:'💬'};
var UI={q:'',hd:false,co:false};
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
if(confOf(d)===1) iv=Math.max(1,Math.ceil(iv/2));
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
// Злиття локального й хмарного прогресу: для кожної теми виграє новіша зміна, нічого не губиться.

function toggle(subj,i){
LAST_ROW={id:'r-'+subj+'-'+i,kind:'done'};
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{}, n=Date.now();
cur.done=!cur.done; cur.upd=n;
if(cur.done){ cur.date=todayStr(); cur.ts=n; cur.last=n; cur.rv=0; bump(); }
else { cur.date=''; delete cur.ts; delete cur.last; cur.rv=0; }
STATE[subj][TID[subj][i]]=cur;
render(); persist();
}
function cycleConf(subj,i){
LAST_ROW={id:'r-'+subj+'-'+i,kind:'conf'};
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{};
if(pctOf(cur)!==null){ render(); return; } // впевненість рахується з «тест %»
cur.conf=({0:3,3:2,2:1,1:0})[cur.conf||0]; cur.upd=Date.now();
STATE[subj][TID[subj][i]]=cur;
render(); persist();
}
function confBtn(subj,i,d){
var c=confOf(d), au=pctOf(d)!==null;
return '<button type="button" class="conf c'+c+(au?' auto':'')+'" title="'+(au?'Впевненість рахується автоматично з «тест %»: ≥80 → 🟢, 50–79 → 🟡, <50 → 🔴':'Впевненість у темі (клік змінює): 🟢 добре · 🟡 так собі · 🔴 слабо · без оцінки')+'" aria-label="Впевненість: '+['не оцінено','слабко','так собі','добре'][c]+'" onclick="cycleConf(\''+subj+'\','+i+')"></button>';
}
function reviewTopic(subj,i,ok){
var cur=(STATE[subj]||{})[TID[subj][i]]; if(!cur) return;
var n=Date.now();
var auto=pctOf(cur)!==null; // з «тест %» впевненість змінюється лише новим результатом тесту
if(ok){ cur.rv=(cur.rv||0)+1; if(!auto&&cur.conf===1) cur.conf=2; } else { cur.rv=0; if(!auto) cur.conf=1; }
cur.last=n; cur.upd=n; bump(); dstat('rv');
render(); persist();
}
function setExam(v){
cfgSet('exam',v||undefined);
render(); persist();
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
var dl=examDl();
h+='<div class="dash"><div class="card"><h3>🎯 Мій план</h3><div class="plan-row"><label>Дата НМТ <input type="date" value="'+esc(ex)+'" onchange="setExam(this.value)"></label>';
if(dl>0) h+='<span class="pill">до НМТ '+dl+' дн.</span>';
h+='</div>';
if(!ex) h+='<p class="meta">Вкажи дату НМТ — з\'явиться потрібний темп навчання.</p>';
else if(!(dl>0)) h+='<p class="meta">Дата вже минула або некоректна — онови її.</p>';
else if(dl<=28) h+='<p class="meta">Режим фінішу: повні пробні НМТ і повторення. Нових тем — мінімум.</p>';
else{
var need=left/((dl-28)/7);
h+='<p class="meta">Лишилось тем: <b>'+left+'</b> із '+tot+'. Щоб останні 4 тижні лишити під пробні НМТ, потрібно ≈ <b>'+need.toFixed(1)+'</b> тем/тиждень; зараз ≈ <b>'+pace.toFixed(1)+'</b> '+(pace>=need?'✅':'⚠️ відстаєш')+'</p>';
}
h+='</div>';

var wd=(new Date().getDay()+6)%7, subs=SCHED[wd];
h+='<div class="card"><h3>📅 Сьогодні <span class="pill">🔥 серія: '+streak()+' дн.</span></h3>';
// Помилки йдуть першими: прострочені важливіші за нові теми
var ed=dueErrs();
h+='<h4>📝 Помилки на повторення сьогодні: '+ed.length+'</h4>'+(ed.length?'':'<p class="meta">Черга порожня.</p>');
ed.slice(0,4).forEach(function(e){ h+=errMini(e); });
if(ed.length>4) h+='<p class="meta">…і ще '+(ed.length-4)+' · <a href="#errBox" onclick="openBox(\'errBox\');return false">відкрити журнал</a></p>';
if(!subs.length) h+='<p class="meta">Неділя: повторення, помилки, легкий тест.</p>';
subs.forEach(function(s){
var nx=openTopics(s,2);
h+='<div class="tl" style="--c:'+META[s].color+'"><b>'+ICON[s]+' '+META[s].name+'</b>'+(nx.length?'':'<span>усе пройдено 🎉</span>');
nx.forEach(function(i){ h+='<a href="#r-'+s+'-'+i+'">'+esc(TOPICS[s][i])+wtTag(s,i)+'</a>'; });
h+='</div>';
});
var due=dueTopics();
h+='<h4>🔁 Повторити: '+due.length+'</h4>'+(due.length?'<p class="meta">Спершу згадай тему без підглядання, потім відповідай чесно.</p>':'<p class="meta">Черга порожня.</p>');
due.slice(0,5).forEach(function(o){
h+='<div class="rv" style="--c:'+META[o.s].color+'"><a href="#r-'+o.s+'-'+o.i+'">'+ICON[o.s]+' '+esc(TOPICS[o.s][o.i])+'</a>'
+'<button type="button" class="ok" onclick="reviewTopic(\''+o.s+'\','+o.i+',1)">Пам\'ятаю</button>'
+'<button type="button" onclick="reviewTopic(\''+o.s+'\','+o.i+',0)">Забув</button></div>';
});
if(due.length>5) h+='<p class="meta">…і ще '+(due.length-5)+' у черзі</p>';
var cd=cardsDueCount('');
if(cd) h+='<h4>🃏 Картки: '+cd+' на повторення</h4><p class="meta"><a href="#cardBox" onclick="openBox(\'cardBox\');return false">Відкрити картки</a></p>';
return h+'</div></div>';
}

function toolbarHTML(){
return '<div class="tools"><input type="search" id="qIn" placeholder="🔎 Пошук теми…" value="'+esc(UI.q)+'" oninput="UI.q=this.value;applyFilter()">'
+'<label><input type="checkbox" '+(UI.hd?'checked':'')+' onchange="UI.hd=this.checked;try{localStorage.setItem(\'nmt-hd\',UI.hd?\'1\':\'0\');}catch(e){}applyFilter()"> сховати виконані</label>'
+'<label><input type="checkbox" '+(UI.imp?'checked':'')+' onchange="UI.imp=this.checked;try{localStorage.setItem(\'nmt-imp\',UI.imp?\'1\':\'0\');}catch(e){}applyFilter()"> лише важливі теми</label></div>'
+'<p class="meta" id="impMsg" hidden style="padding-left:0">Жодної теми ще не позначено як важливу. Познач її кнопкою ⚖ біля теми (часто в тесті / рідко).</p>';
}
function applyFilter(){
document.body.classList.toggle('hd',UI.hd);
var q=(UI.q||'').trim().toLowerCase(), rows=document.querySelectorAll('.row[data-t]'), any=false;
for(var i=0;i<rows.length;i++){
var r=rows[i], ok=(!q||r.getAttribute('data-t').indexOf(q)>-1)&&(!UI.imp||r.getAttribute('data-w')==='h');
if(r.getAttribute('data-w')==='h') any=true;
r.style.display=ok?'':'none';
}
var m=document.getElementById('impMsg'); if(m) m.hidden=!(UI.imp&&!any);
}
function afterRender(){
var ds=document.querySelectorAll('.rhythm .day'), wd=(new Date().getDay()+6)%7;
if(ds[wd]){
ds[wd].classList.add('today');
var sb=WEEK[wd], k1=sb.length?META[sb[0]].color:'#9a9da3', k2=sb.length>1?META[sb[1]].color:k1, st=ds[wd].style;
st.setProperty('--c',k1); st.setProperty('--c2',k2);
st.border='1.5px solid transparent';
st.background='linear-gradient(var(--card2),var(--card2)) padding-box,linear-gradient(90deg,'+k1+','+k2+') border-box';
st.boxShadow='0 0 0 2px '+k1+'44';
}
applyFilter();
enterAnim();
postRender();
tmNorm(); tmAfter();
if(UI.ef.focus){ var fe=document.getElementById('ef-t'); if(fe) fe.focus(); UI.ef.focus=false; }
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
function logMock(subj,val,extra){
STATE.mockLog=STATE.mockLog||{}; STATE.mockLog[subj]=STATE.mockLog[subj]||[];
var n=Date.now(), e={id:uid('m'),date:todayStr(),ts:n,score:val};
if(extra&&extra.errs!==undefined&&extra.errs!==null&&isFinite(extra.errs)) e.errs=+extra.errs;
STATE.mockLog[subj].push(e); STATE.lupd=n; bump();
return e;
}
// ---- Слабкі теми і що робити зараз ----
function pctOf(d){ if(!d||d.pct===undefined||d.pct===''||d.pct===null) return null; var v=+d.pct; return isNaN(v)?null:v; }
// Впевненість: якщо є «тест %» — вона завжди рахується з нього (≥80 🟢, 50–79 🟡, <50 🔴); без нього — ручна оцінка.
function confOf(d){ var p=pctOf(d); if(p!==null) return p>=80?3:p>=50?2:1; return (d&&d.conf)||0; }
// Слабкі: спершу теми з найнижчим «тест %», далі слабкі без результату тесту.
function weakList(){
var out=[];
ORDER.forEach(function(s){
for(var i=0;i<TID[s].length;i++){
var d=ST(s,i), p=pctOf(d);
if(d&&((p!==null&&p<50)||(d.done&&p===null&&d.conf===1))) out.push({s:s,i:i,p:p});
}
});
out.sort(function(a,b){
if(a.p===null&&b.p===null) return 0;
if(a.p===null) return 1;
if(b.p===null) return -1;
return a.p-b.p;
});
return out;
}
function unrated(){
var n=0; ORDER.forEach(function(s){ for(var i=0;i<TID[s].length;i++){ var d=ST(s,i); if(d&&d.done&&!confOf(d)) n++; } });
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
var n=Date.now(), dl=examDl();
var due=dueTopics(), ed=dueErrs(), eo=ed.filter(errOverdue);
var wd=(new Date().getDay()+6)%7, subs=(SCHED[wd]||[]).slice(), nxt=null;
function firstOpen(s){ var a=openTopics(s,1); return a.length?a[0]:-1; }
for(var a=0;a<subs.length&&!nxt;a++){ var fi=firstOpen(subs[a]); if(fi>-1) nxt={s:subs[a],i:fi}; }
if(!nxt){
var best=null;
ORDER.forEach(function(s){ var fi=firstOpen(s); if(fi<0) return; var dn=0; for(var k=0;k<TID[s].length;k++){ var d=ST(s,k); if(d&&d.done) dn++; } var r=dn/TID[s].length; if(!best||r<best.r) best={s:s,i:fi,r:r}; });
if(best) nxt=best;
}
var weak=weakList(), m=null;
function tl(o){ return ICON[o.s]+' '+esc(TOPICS[o.s][o.i]); }
if(eo.length) m={k:'📝 Прострочені помилки',t:esc(shorten(eo[0].t,90)),href:'#errBox',oc:"openBox('errBox');return false",s:'Прострочено: '+eo.length+' · усього на повторення: '+ed.length+'. Спершу виправ їх — вони важливіші за нові теми.'};
else if(dl>0&&dl<=28) m={k:'📝 Повний пробник НМТ',t:'Пройди варіант на час',href:'#tmBox',oc:"openBox('tmBox');return false",s:'До НМТ '+dl+' дн. — тепер головне — повні пробники й повторення слабких тем.'};
else if(due.length) m={k:'🔁 Повтори (≈10 хв)',t:tl(due[0]),href:'#r-'+due[0].s+'-'+due[0].i,s:'Спершу згадай без підглядання, потім відповідай чесно. У черзі: '+due.length+'.'};
else if(ed.length) m={k:'📝 Помилка на повторення',t:esc(shorten(ed[0].t,90)),href:'#errBox',oc:"openBox('errBox');return false",s:'Розв\'яжи без підглядання, потім познач результат. У черзі: '+ed.length+'.'};
else if(weak.length) m={k:'🔴 Закріпи слабку тему',t:tl(weak[0]),href:'#r-'+weak[0].s+'-'+weak[0].i,s:'Перерішай 10–15 завдань, потім онови «тест %».'};
else if(nxt) m={k:'🆕 Нова тема',t:tl(nxt)+wtTag(nxt.s,nxt.i),href:'#r-'+nxt.s+'-'+nxt.i,s:'≈'+META[nxt.s].time+'. Після теми зроби тест і впиши %.'};
else m={k:'🏁 Усі теми пройдено',t:'Роби повні пробники',href:'#tmBox',oc:"openBox('tmBox');return false",s:'Далі — повні пробні НМТ і повторення.'};
var h='<div class="card now"><div class="now-k">▶ Що робити зараз</div><a class="now-t" href="'+m.href+'"'+(m.oc?' onclick="'+m.oc+'"':'')+'><b>'+m.k+':</b> '+m.t+'</a><p class="meta">'+m.s+'</p>';
if(ed.length&&m.k.indexOf('помил')<0) h+='<p class="meta now-n">📝 Помилок на повторення: <b>'+ed.length+'</b>'+(eo.length?' (прострочено '+eo.length+')':'')+'</p>';
if(ed.length) h+='<div class="now-e">'+ed.slice(0,2).map(errMini).join('')+'</div>';
if(weak.length&&weak[0].p!==null&&m.k.indexOf('слабку')<0) h+='<p class="meta now-n">Найслабша за тестом: <a href="#r-'+weak[0].s+'-'+weak[0].i+'">'+tl(weak[0])+'</a> — '+weak[0].p+'%</p>';
if(nxt&&m.k.indexOf('Нова')<0) h+='<p class="meta now-n">Далі нова тема: <a href="#r-'+nxt.s+'-'+nxt.i+'">'+tl(nxt)+'</a></p>';
return h+'</div>';
}

// ---- Результат тесту з теми → впевненість ----
function pctInput(subj,i,d){
var p=pctOf(d);
return '<span class="cnt-label">тест %:</span><input class="pc" type="number" inputmode="numeric" min="0" max="100" value="'+(p===null?'':p)+'" aria-label="Результат тесту з теми, відсотків" title="≥80 → 🟢, 50–79 → 🟡, <50 → 🔴 (слабкі теми повторюються частіше)" onchange="pctChange(\''+subj+'\','+i+',this.value)">';
}
function pctChange(subj,i,val){
LAST_ROW={id:'r-'+subj+'-'+i,kind:'conf'};
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{}, n=Date.now();
if(String(val).trim()===''){ delete cur.pct; delete cur.pts; cur.upd=n; STATE[subj][TID[subj][i]]=cur; render(); persist(); return; }
var v=Math.round(+val); if(isNaN(v)) return;
v=Math.max(0,Math.min(100,v));
cur.pct=v; cur.pts=n; cur.conf=v>=80?3:v>=50?2:1; cur.upd=n;
if(cur.done){ cur.last=n; if(v<50) cur.rv=0; }
bump();
STATE[subj][TID[subj][i]]=cur;
render(); persist();
}

// ---- Статистика пробників і ціль ----
function setGoal(subj,val){
var v=parseFloat(val);
cfgSet('goal:'+subj,isNaN(v)?undefined:v);
render(); persist();
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
var ENTERED=false, LAST_ROW=null, PREV_BARS=null;
// Анімація входу — лише при першому показі. Якщо сторінку перемальовано ще під час входу (наприклад, прийшла хмара), клас знімаємо, щоб блоки не мигали вдруге.
function enterAnim(){
var b=document.body;
if(!ENTERED){ ENTERED=true; b.classList.add('enter'); setTimeout(function(){ b.classList.remove('enter'); },1400); }
else b.classList.remove('enter');
}
// Після кожного перемальовування: смужки прогресу плавно їдуть від старого значення до нового, а анімація «галочки/крапки» грає лише на темі, яку ви щойно змінили.
function postRender(){
var bars=[].slice.call(document.querySelectorAll('#app .bar i')), now=bars.map(function(b){ return parseFloat(b.style.width)||0; });
if(PREV_BARS&&PREV_BARS.length===now.length&&!document.body.classList.contains('enter')){
bars.forEach(function(b,k){
var p=PREV_BARS[k], n=now[k];
if(p!==n&&n>0){
b.style.transition='none'; b.style.transform='scaleX('+(p/n)+')';
void b.offsetWidth;
b.style.transition='transform .6s cubic-bezier(.22,.8,.3,1)'; b.style.transform='';
}
});
}
PREV_BARS=now;
if(LAST_ROW){
var r=document.getElementById(LAST_ROW.id);
if(r){
if(LAST_ROW.kind==='done'){ var cb=r.querySelector('input[type=checkbox]'); if(cb&&cb.checked) cb.classList.add('pop'); }
else { var cf=r.querySelector('.conf'); if(cf) cf.classList.add('pulse'); }
}
LAST_ROW=null;
}
}
// Хмарна панель: на комп'ютері відкривається при наведенні, на телефоні — по тапу.
function cloudToggle(ev){
ev.stopPropagation(); UI.co=!UI.co;
var c=document.getElementById('cloud'); if(c) c.classList.toggle('open',UI.co);
}
document.addEventListener('click',function(e){
if(UI.co&&!(e.target.closest&&e.target.closest('#cloud'))){
UI.co=false; var c=document.getElementById('cloud'); if(c) c.classList.remove('open');
}
});

/* ===================================================================
   v6: журнал помилок, таймер пробника, тижневий звіт, ваги тем, картки, графіки
   Усі нові дані — окремі поля STATE (errs, cards, decks, dst, del, cfg.u), тож SCHEMA лишається 3.
   =================================================================== */
UI.op={}; try{ var _op=JSON.parse(localStorage.getItem('nmt-op')||'{}'); if(_op&&typeof _op==='object') UI.op=_op; }catch(e){}
UI.imp=false; try{ UI.imp=localStorage.getItem('nmt-imp')==='1'; }catch(e){}
UI.ef={s:'math',tp:'',t:'',w:0,h:'',q:0,src:'',focus:false,lim:20};
UI.ff={s:'',w:'',st:'act'};
UI.wkOff=0; UI.wkAuto=false; UI.wkSeen=false; UI.tf=false;
UI.cd=''; UI.cs=null; UI.ce=''; UI.dh={};

// ---- Утиліти ----
function uid(p){ return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function safeId(x){ return String(x==null?'':x).replace(/[^\w-]/g,'_').slice(0,60); }
function str(x,n){ return String(x==null?'':x).slice(0,n||400); }
function dayStart(t,add){ var d=new Date(t); return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(add||0)).getTime(); }
function fmtDM(t){ var d=new Date(t); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0'); }
function pad2(n){ return (n<10?'0':'')+n; }
function pl(n,f){ var a=n%10, b=n%100; return (a===1&&b!==11)?f[0]:(a>=2&&a<=4&&(b<12||b>14))?f[1]:f[2]; }
function shorten(s,n){ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; }
function mondayOf(t){ var d=new Date(t); return new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)).getTime(); }
function isOpen(id,def){ return UI.op[id]===undefined?!!def:!!UI.op[id]; }
function saveOp(){ try{ localStorage.setItem('nmt-op',JSON.stringify(UI.op)); }catch(e){} }
document.addEventListener('toggle',function(e){
var t=e.target; if(t&&t.tagName==='DETAILS'&&t.id&&t.classList.contains('box')){ UI.op[t.id]=t.open; saveOp(); }
},true);
function openBox(id){
var el=document.getElementById(id); if(!el) return;
el.open=true; UI.op[id]=true; saveOp();
el.scrollIntoView({behavior:'smooth',block:'start'});
}
// Оновлює лише один блок (без повного render), щоб не збивати прокрутку й поля вводу
function updBox(id,fn){
var el=document.getElementById(id); if(!el||!el.parentNode) return;
var tmp=document.createElement('div'); tmp.innerHTML=fn();
var n=tmp.firstElementChild; if(n) el.parentNode.replaceChild(n,el);
}
function dstat(k){
var d=isoDay(Date.now()); STATE.dst=STATE.dst||{}; STATE.dst[d]=STATE.dst[d]||{};
STATE.dst[d][k]=(STATE.dst[d][k]||0)+1;
}
var SR=null;
function announce(msg){
if(!SR){ SR=document.createElement('div'); SR.className='sr'; SR.setAttribute('aria-live','assertive'); document.body.appendChild(SR); }
SR.textContent=''; setTimeout(function(){ SR.textContent=msg; },30);
}
function examDl(){
var ex=(STATE.cfg&&STATE.cfg.exam)||'';
return ex?Math.ceil((new Date(ex+'T09:00:00').getTime()-Date.now())/DAY):NaN;
}

// ---- Конфіг з окремою міткою часу для кожного поля (cfg.u), щоб різні пристрої не перетирали одне одного ----
// Шлях: 'exam' | 'wk' | 'goal:math' | 'wt:math-0003'
var CFG_MAPS={goal:1,wt:1};
// Поля старого формату (без cfg.u) отримують власну мітку = загальний upd, щоб подальші правки інших полів не робили їх «свіжішими»
function cfgStamp(c){
var f=cfgFlat(c); c.u=c.u||{};
Object.keys(f).forEach(function(p){ if(c.u[p]===undefined&&f[p].v!==undefined) c.u[p]=f[p].t; });
}
function cfgSet(path,val){
var c=STATE.cfg=STATE.cfg||{}, n=Date.now(), p=path.split(':');
cfgStamp(c);
if(p.length===1){ if(val===undefined) delete c[p[0]]; else c[p[0]]=val; }
else{ c[p[0]]=c[p[0]]||{}; if(val===undefined) delete c[p[0]][p[1]]; else c[p[0]][p[1]]=val; }
c.u=c.u||{}; c.u[path]=n; c.upd=n;
}
function cfgGet(path){
var c=STATE.cfg||{}, p=path.split(':');
return p.length===1?c[p[0]]:(c[p[0]]||{})[p[1]];
}
function cfgFlat(c){
var out={}, u=(c&&c.u)||{}, base=(c&&c.upd)||0;
Object.keys(c||{}).forEach(function(k){
if(k==='u'||k==='upd') return;
if(CFG_MAPS[k]&&c[k]&&typeof c[k]==='object') Object.keys(c[k]).forEach(function(j){ var p=k+':'+j; out[p]={v:c[k][j],t:u[p]!==undefined?u[p]:base}; });
else out[k]={v:c[k],t:u[k]!==undefined?u[k]:base};
});
Object.keys(u).forEach(function(p){ if(!out[p]) out[p]={v:undefined,t:u[p]}; });
return out;
}
function mergeCfg(a,b){
var fa=cfgFlat(a), fb=cfgFlat(b), o={u:{},upd:Math.max((a&&a.upd)||0,(b&&b.upd)||0)}, seen={};
Object.keys(fa).concat(Object.keys(fb)).forEach(function(p){
if(seen[p]) return; seen[p]=1;
var x=fa[p], y=fb[p], w=!x?y:!y?x:(y.t>x.t?y:(x.t>y.t?x:((x.v===undefined&&y.v!==undefined)?y:x)));
var q=p.split(':');
if(w.v!==undefined){ if(q.length===1) o[q[0]]=w.v; else{ o[q[0]]=o[q[0]]||{}; o[q[0]][q[1]]=w.v; } }
o.u[p]=w.t||0;
});
return o;
}

// ---- Очищення й злиття нових даних ----
var ERR_INT=[1,3,7,14];
var ERR_WHY=['Не знав правила','Неуважність','Не вистачило часу','Не зрозумів умову'];
var ERR_COL=['#E03131','#F59F00','#3B5BDB','#7048E8'];
function fixErr(e){
if(!e||typeof e!=='object'||!e.id) return null;
var c={id:safeId(e.id)}; if(!c.id) return null;
c.upd=+e.upd||0;
if(e.x){ c.x=1; return c; }
c.subj=ORDER.indexOf(e.subj)>-1?e.subj:'math';
c.tid=safeId(e.tid); c.tt=str(e.tt,200); c.t=str(e.t,400); c.h=str(e.h,400);
c.w=Math.max(0,Math.min(3,parseInt(e.w,10)||0));
c.ts=+e.ts||0; c.step=Math.max(0,Math.min(ERR_INT.length,parseInt(e.step,10)||0));
c.next=+e.next||0; c.fails=parseInt(e.fails,10)||0;
if(e.fixed) c.fixed=+e.fixed||1;
if(e.src) c.src=str(e.src,10);
return c;
}
var DECK0=[{id:'deck-stress',name:'Наголоси',subj:'ukr',o:1},{id:'deck-dates',name:'Дати історії',subj:'hist',o:2},{id:'deck-eng',name:'Англійська лексика',subj:'eng',o:3},{id:'deck-memo',name:'Пам\'ятки (правила, формули)',subj:'math',o:4}];
function fixDeck(d,k){
if(!d||typeof d!=='object') return null;
var id=safeId(d.id||k); if(!id) return null;
var o={id:id,upd:+d.upd||0};
if(d.x){ o.x=1; return o; }
o.name=str(d.name,60)||'Колода'; o.subj=ORDER.indexOf(d.subj)>-1?d.subj:''; o.o=+d.o||0;
return o;
}
function fixCard(c,k){
if(!c||typeof c!=='object') return null;
var id=safeId(c.id||k); if(!id) return null;
var o={id:id,upd:+c.upd||0};
if(c.x){ o.x=1; return o; }
o.d=safeId(c.d); o.q=str(c.q,500); o.a=str(c.a,500);
o.b=Math.max(1,Math.min(5,parseInt(c.b,10)||1)); o.n=+c.n||0; o.ts=+c.ts||0;
return o;
}
function pickNewer(m,e){
var p=m[e.id];
if(!p||e.upd>p.upd||(e.upd===p.upd&&e.x&&!p.x)) m[e.id]=e;
}
function mergeMap(a,b,fix){
var o={};
[a||{},b||{}].forEach(function(m){ Object.keys(m).forEach(function(k){ var e=fix(m[k],k); if(e) pickNewer(o,e); }); });
return o;
}
function mergeErrs(a,b){
var m={};
(Array.isArray(a)?a:[]).concat(Array.isArray(b)?b:[]).forEach(function(e){ var c=fixErr(e); if(c) pickNewer(m,c); });
return Object.keys(m).map(function(k){ return m[k]; }).sort(function(x,y){ return ((x.ts||0)-(y.ts||0))||(x.id<y.id?-1:1); });
}
function maxMap(a,b){
var o={}; [a||{},b||{}].forEach(function(m){ for(var k in m){ var v=+m[k]; if(isFinite(v)) o[k]=Math.max(o[k]||0,v); } });
return o;
}
function mergeDst(a,b){
var o={};
[a||{},b||{}].forEach(function(m){ for(var d in m){ o[d]=o[d]||{}; for(var k in m[d]){ var v=+m[d][k]; if(isFinite(v)) o[d][k]=Math.max(o[d][k]||0,v); } } });
return o;
}
// Пробники: у кожного запису є id і ts. Старі записи (лише date+score) отримують детермінований id, тож на двох пристроях збігаються.
function mockFix(s,arr){
var cnt={}, out=[];
(Array.isArray(arr)?arr:[]).forEach(function(e,k){
if(!e||typeof e!=='object') return;
var c={}, f; for(f in e) c[f]=e[f];
if(!c.ts) c.ts=parseDM(c.date)||0;
if(!c.id){ var key=String(c.date||'')+'-'+c.score; cnt[key]=(cnt[key]||0)+1; c.id='L'+s+'-'+key+'-'+cnt[key]; }
c.id=safeId(c.id); c._k=k; out.push(c);
});
out.sort(function(a,b){ return ((a.ts||0)-(b.ts||0))||(a._k-b._k); });
out.forEach(function(c){ delete c._k; });
return out;
}
function norm(){
ORDER.forEach(function(s){ STATE[s]=STATE[s]||{}; });
STATE.mockLog=STATE.mockLog||{};
ORDER.forEach(function(s){ STATE.mockLog[s]=mockFix(s,STATE.mockLog[s]); });
STATE.errs=mergeErrs(STATE.errs,[]);
STATE.cfg=(STATE.cfg&&typeof STATE.cfg==='object')?STATE.cfg:{};
cfgStamp(STATE.cfg);
STATE.act=STATE.act||{}; STATE.archive=STATE.archive||{}; STATE.del=STATE.del||{}; STATE.dst=STATE.dst||{};
STATE.decks=mergeMap(STATE.decks,{},fixDeck); STATE.cards=mergeMap(STATE.cards,{},fixCard);
DECK0.forEach(function(d){ if(!STATE.decks[d.id]) STATE.decks[d.id]={id:d.id,name:d.name,subj:d.subj,o:d.o,upd:0}; });
}
// Злиття локального й хмарного прогресу: теми — новіший запис, помилки/колоди/картки — по id, пробники — об'єднання з надгробками,
// конфіг — по полях, лічильники активності — максимум. Вхідні об'єкти не змінюються.
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
o.del=maxMap(A.del,B.del);
o.mockLog={};
ORDER.forEach(function(s){
var seen={}, list=[];
mockFix(s,A.mockLog&&A.mockLog[s]).concat(mockFix(s,B.mockLog&&B.mockLog[s])).forEach(function(e){
if(o.del[e.id]||seen[e.id]) return; seen[e.id]=1; list.push(e);
});
list=list.map(function(e,k){ return {e:e,k:k}; }).sort(function(p,q){ return ((p.e.ts||0)-(q.e.ts||0))||(p.k-q.k); }).map(function(z){ return z.e; });
o.mockLog[s]=list;
});
o.lupd=Math.max(A.lupd||0,B.lupd||0);
o.errs=mergeErrs(A.errs,B.errs);
o.cfg=mergeCfg(A.cfg,B.cfg);
o.act=maxMap(A.act,B.act);
o.dst=mergeDst(A.dst,B.dst);
o.decks=mergeMap(A.decks,B.decks,fixDeck);
o.cards=mergeMap(A.cards,B.cards,fixCard);
[A.archive||{},B.archive||{}].forEach(function(m){
for(var s in m){ o.archive[s]=o.archive[s]||{}; for(var k in m[s]){ var p=o.archive[s][k], q=m[s][k]; if(!p||(q.upd||0)>(p.upd||0)) o.archive[s][k]=q; } }
});
return o;
}

// ---- Ваги тем ----
// ЄДИНЕ МІСЦЕ, де задаються ваги за замовчуванням. Ключ — id теми (напр. 'math-0003'), значення: 'h' — часто в тесті, 'l' — рідко.
// Порожньо навмисно: у файлах немає офіційної специфікації НМТ, тож ваги не вигадуються.
// Свої ваги можна ставити прямо на сайті (кнопка ⚖ біля теми) — вони зберігаються в STATE.cfg.wt і мають пріоритет над цією таблицею.
var WEIGHT={};
var WLAB={h:'часто в тесті',l:'рідко'};
var WIN=4; // скільки найближчих невиконаних тем розглядається при виборі «наступної» (порядок курсу зберігається)
function wOf(id){ var v=cfgGet('wt:'+id); if(v!==undefined) return v==='-'?'':v; return WEIGHT[id]||''; }
function wRank(id){ var w=wOf(id); return w==='h'?0:w==='l'?2:1; }
function wCycle(s,i){
var id=TID[s][i], cur=wOf(id), nx=cur===''?'h':cur==='h'?'l':'', def=WEIGHT[id]||'';
cfgSet('wt:'+id,nx===def?undefined:(nx===''?'-':nx));
render(); persist();
}
function wtTag(s,i){ var w=wOf(TID[s][i]); return w?' <span class="wtg w-'+w+'">'+(w==='h'?'★ ':'')+WLAB[w]+'</span>':''; }
function wtBtn(s,i){
var w=wOf(TID[s][i]);
return '<button type="button" class="wtb" onclick="wCycle(\''+s+'\','+i+')" aria-label="Вага теми: '+(w?WLAB[w]:'не задано')+'. Змінити" title="Вага теми: '+(w?WLAB[w]:'не задано')+' (клік змінює: часто → рідко → без позначки)">⚖</button>';
}
// Наступні відкриті теми предмета: у вікні з WIN найближчих важливіші раніше, інакше — за порядком курсу
function openTopics(s,limit){
var win=[], i, d;
for(i=0;i<TID[s].length&&win.length<WIN;i++){ d=ST(s,i); if(!(d&&d.done)) win.push(i); }
return win.map(function(x,k){ return {i:x,k:k,r:wRank(TID[s][x])}; }).sort(function(a,b){ return (a.r-b.r)||(a.k-b.k); }).slice(0,limit||1).map(function(o){ return o.i; });
}
function dueTopics(){
var due=[];
ORDER.forEach(function(s){ for(var k=0;k<TID[s].length;k++){ var x=dueIn(ST(s,k)); if(x!==null&&x<=0) due.push({s:s,i:k,x:x,r:wRank(TID[s][k])}); } });
due.sort(function(a,b){ return (a.x-b.x)||(a.r-b.r); });
return due;
}

// ---- Помилки: дані ----
function errsAll(){ return (STATE.errs||[]).filter(function(e){ return e&&!e.x; }); }
function findErr(id){ for(var i=0;i<STATE.errs.length;i++) if(STATE.errs[i].id===id) return i; return -1; }
function errIsDue(e){ return !e.x&&!e.fixed&&e.next<=Date.now(); }
function errOverdue(e){ return !e.x&&!e.fixed&&e.next<dayStart(Date.now()); }
function errOverdueDays(e){ return Math.max(0,Math.round((dayStart(Date.now())-e.next)/DAY)); }
function dueErrs(){ return errsAll().filter(errIsDue).sort(function(a,b){ return a.next-b.next; }); }
function errTopic(e){
var s=e.subj, i=e.tid?TID[s].indexOf(e.tid):-1;
return i>-1?TOPICS[s][i]:(e.tt||'');
}
function dueTxt(e){
if(e.fixed) return 'виправлено '+fmtDM(e.fixed);
var d=Math.round((e.next-dayStart(Date.now()))/DAY);
return d<0?'прострочено '+(-d)+' дн.':d===0?'сьогодні':d===1?'завтра':'через '+d+' дн.';
}
function topicOpts(s,sel){
var h='<option value="">— тема не вказана —</option>';
(TOPICS[s]||[]).forEach(function(t,i){ var id=TID[s][i]; h+='<option value="'+esc(id)+'"'+(id===sel?' selected':'')+'>'+esc(t)+'</option>'; });
return h;
}
function efSubj(v){
UI.ef.s=v; UI.ef.tp='';
var el=document.getElementById('ef-tp'); if(el) el.innerHTML=topicOpts(v,'');
}
function efSkip(){ UI.ef.q=0; UI.ef.src=''; updBox('errBox',errsHTML); }
function addErr(ev){
if(ev&&ev.preventDefault) ev.preventDefault();
var f=UI.ef, txt=(f.t||'').trim();
if(!txt){ var el=document.getElementById('ef-t'); if(el) el.focus(); return false; }
var n=Date.now(), s=ORDER.indexOf(f.s)>-1?f.s:'math', i=f.tp?TID[s].indexOf(f.tp):-1;
var e={id:uid('e'),subj:s,tid:i>-1?f.tp:'',tt:i>-1?TOPICS[s][i]:'',t:txt.slice(0,400),h:(f.h||'').trim().slice(0,400),w:f.w|0,ts:n,step:0,next:dayStart(n,ERR_INT[0]),fails:0,upd:n};
if(f.src) e.src=f.src;
STATE.errs.push(fixErr(e)); bump();
f.t=''; f.h='';
if(f.q>0){ f.q--; f.focus=true; if(f.q===0) f.src=''; }
UI.op.errBox=true; saveOp();
render(); persist();
return false;
}
function errOk(id){
var k=findErr(id); if(k<0) return; var e=STATE.errs[k], n=Date.now();
e.step=(e.step||0)+1;
if(e.step>=ERR_INT.length) e.fixed=n; else e.next=dayStart(n,ERR_INT[e.step]);
e.upd=n; bump(); dstat('er');
render(); persist();
}
function errBad(id){
var k=findErr(id); if(k<0) return; var e=STATE.errs[k], n=Date.now();
e.step=0; e.fails=(e.fails||0)+1; e.next=dayStart(n,ERR_INT[0]); delete e.fixed; e.upd=n; bump();
render(); persist();
}
function errBack(id){
var k=findErr(id); if(k<0) return; var e=STATE.errs[k], n=Date.now();
e.step=0; e.next=dayStart(n,ERR_INT[0]); delete e.fixed; e.upd=n;
render(); persist();
}
function errDel(id){
var k=findErr(id); if(k<0) return;
if(!confirm('Видалити цю помилку з журналу?')) return;
STATE.errs[k]={id:id,x:1,upd:Date.now()};
render(); persist();
}
function errMini(e){
var m=META[e.subj]||{color:'#999'}, od=errOverdueDays(e);
return '<div class="rv" style="--c:'+m.color+'"><a href="#errBox" onclick="openBox(\'errBox\');return false">'+(ICON[e.subj]||'')+' '+esc(shorten(e.t,70))+(od?' <i>+'+od+' дн.</i>':'')+'</a>'
+'<button type="button" class="ok" aria-label="Розв\'язав правильно" onclick="errOk(\''+e.id+'\')">✓</button>'
+'<button type="button" aria-label="Знову помилився" onclick="errBad(\''+e.id+'\')">✗</button></div>';
}
function errRow(e){
var m=META[e.subj]||{color:'#999'}, tp=errTopic(e), due=errIsDue(e);
var h='<div class="er'+(e.fixed?' fx':'')+(due?' dueE':'')+'" style="border-left:4px solid '+m.color+';padding-left:8px"><div class="eb"><b class="et">'+esc(e.t)+'</b>'
+'<div class="em"><i>'+(ICON[e.subj]||'')+' '+esc(m.name)+(tp?' · '+esc(tp):'')+'</i></div>'
+'<div class="em"><i>причина: '+esc(ERR_WHY[e.w|0])+'</i> · <i>повтор '+(e.fixed?ERR_INT.length:(e.step||0))+'/'+ERR_INT.length+'</i> · <i class="'+(errOverdue(e)?'od':'')+'">'+dueTxt(e)+'</i>'+(e.fails?' · <i>зривів: '+e.fails+'</i>':'')+'</div>';
if(e.h) h+='<div class="en">✅ Як правильно: '+esc(e.h)+'</div>';
h+='</div><div class="ea">';
if(e.fixed) h+='<button type="button" onclick="errBack(\''+e.id+'\')" title="Повернути в повторення">↺</button>';
else h+='<button type="button" class="ok" onclick="errOk(\''+e.id+'\')" title="Розв\'язав правильно">✓ Розв\'язав</button><button type="button" onclick="errBad(\''+e.id+'\')" title="Знову помилився — інтервали спочатку">✗ Знову</button>';
return h+'<button type="button" onclick="errDel(\''+e.id+'\')" aria-label="Видалити помилку" title="Видалити">🗑</button></div></div>';
}
function errFilter(k,v){ UI.ff[k]=v; UI.ef.lim=20; updBox('errBox',errsHTML); }
function errMore(){ UI.ef.lim+=20; updBox('errBox',errsHTML); }
function errsHTML(){
var all=errsAll(), due=dueErrs(), f=UI.ff, ef=UI.ef;
var h='<details class="card blk box" id="errBox"'+(isOpen('errBox',due.length>0)?' open':'')+'><summary>📝 Журнал помилок ('+due.length+' на повторення · всього '+all.length+')</summary>';
h+='<p class="meta">Нагадування через 1, 3, 7 і 14 днів. «Розв\'язав» — наступний інтервал, «Знову» — з початку. Після 4-го успішного повтору помилку виправлено.</p>';
h+='<form class="errform" onsubmit="return addErr(event)">';
if(ef.q>0) h+='<p class="qn">📋 З пробника: ще '+ef.q+' '+pl(ef.q,['помилка','помилки','помилок'])+' записати <button type="button" onclick="efSkip()">Пропустити</button></p>';
h+='<div class="plan-row"><label>Предмет <select id="ef-s" onchange="efSubj(this.value)">'+ORDER.map(function(s){ return '<option value="'+s+'"'+(ef.s===s?' selected':'')+'>'+ICON[s]+' '+esc(META[s].name)+'</option>'; }).join('')+'</select></label>'
+'<label>Тема <select id="ef-tp" onchange="UI.ef.tp=this.value">'+topicOpts(ef.s,ef.tp)+'</select></label></div>'
+'<label class="fl">Завдання (коротко)<input id="ef-t" type="text" maxlength="400" required value="'+esc(ef.t)+'" oninput="UI.ef.t=this.value" placeholder="напр.: №14, нерівність з модулем"></label>'
+'<label class="fl">Причина<select id="ef-w" onchange="UI.ef.w=+this.value">'+ERR_WHY.map(function(w,i){ return '<option value="'+i+'"'+(ef.w===i?' selected':'')+'>'+w+'</option>'; }).join('')+'</select></label>'
+'<label class="fl">Як правильно (необов\'язково)<textarea id="ef-h" rows="2" maxlength="400" oninput="UI.ef.h=this.value">'+esc(ef.h)+'</textarea></label>'
+'<button type="submit" class="ok pri">➕ Додати в журнал</button></form>';
// Лічильник причин (за обраним предметом)
var cnt=[0,0,0,0], tot=0;
all.forEach(function(e){ if(f.s&&e.subj!==f.s) return; cnt[e.w|0]++; tot++; });
h+='<h4>Чому я втрачаю бали'+(f.s?' · '+esc(META[f.s].name):'')+'</h4>';
if(!tot) h+='<p class="meta">Поки немає записів.</p>';
else ERR_WHY.forEach(function(w,i){
var p=Math.round(cnt[i]/tot*100);
h+='<div class="rs" style="--c:'+ERR_COL[i]+'"><div class="rl">'+esc(w)+' <b>'+cnt[i]+'</b> <i>'+p+'%</i></div><div class="bar" role="img" aria-label="'+esc(w)+': '+cnt[i]+' з '+tot+'"><i style="width:'+p+'%"></i></div></div>';
});
// Фільтри
h+='<div class="errf"><select aria-label="Предмет" onchange="errFilter(\'s\',this.value)"><option value="">усі предмети</option>'+ORDER.map(function(s){ return '<option value="'+s+'"'+(f.s===s?' selected':'')+'>'+esc(META[s].name)+'</option>'; }).join('')+'</select>'
+'<select aria-label="Причина" onchange="errFilter(\'w\',this.value)"><option value="">усі причини</option>'+ERR_WHY.map(function(w,i){ return '<option value="'+i+'"'+(f.w===String(i)?' selected':'')+'>'+esc(w)+'</option>'; }).join('')+'</select>'
+'<select aria-label="Статус" onchange="errFilter(\'st\',this.value)">'+[['act','активні'],['due','на повторення'],['fix','виправлені'],['all','усі']].map(function(o){ return '<option value="'+o[0]+'"'+(f.st===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select></div>';
var list=all.filter(function(e){
if(f.s&&e.subj!==f.s) return false;
if(f.w!==''&&String(e.w|0)!==f.w) return false;
if(f.st==='act') return !e.fixed; if(f.st==='due') return errIsDue(e); if(f.st==='fix') return !!e.fixed;
return true;
}).sort(function(a,b){ return (a.fixed?1:0)-(b.fixed?1:0)||(a.next-b.next); });
if(!list.length) h+='<p class="meta">За цим фільтром порожньо.</p>';
list.slice(0,ef.lim).forEach(function(e){ h+=errRow(e); });
if(list.length>ef.lim) h+='<p><button type="button" onclick="errMore()">Показати ще ('+(list.length-ef.lim)+')</button></p>';
return h+'</details>';
}

// ---- Таймер пробника ----
var TM_KEY='nmt-timer', TM_TITLE=document.title;
function tmLoad(){ try{ var o=JSON.parse(localStorage.getItem(TM_KEY)||'null'); if(o&&typeof o==='object') return o; }catch(e){} return null; }
function tmSave(){ try{ localStorage.setItem(TM_KEY,JSON.stringify(TM)); }catch(e){} }
var TM=tmLoad()||{};
(function(){
var d={subj:'math',dur:60,st:'idle',left:3600000,end:0,w10:false,w1:false,snd:true,vib:true,saved:false,res:null};
for(var k in d) if(TM[k]===undefined) TM[k]=d[k];
TM.dur=Math.max(1,Math.min(300,parseInt(TM.dur,10)||60));
if(['idle','run','pause','done'].indexOf(TM.st)<0) TM.st='idle';
if(!isFinite(+TM.left)) TM.left=TM.dur*60000;
if(!isFinite(+TM.end)) TM.end=0;
})();
var tmIv=null, AC=null;
function tmNorm(){ if(ORDER.indexOf(TM.subj)<0) TM.subj='math'; }
function tmLeft(){ return TM.st==='run'?Math.max(0,TM.end-Date.now()):Math.max(0,+TM.left||0); }
function tmClockTxt(ms){
var s=Math.ceil(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60;
return (h?h+':'+pad2(m):pad2(m))+':'+pad2(x);
}
function tmAudioUnlock(){
try{ var C=window.AudioContext||window.webkitAudioContext; if(!C) return; if(!AC) AC=new C(); if(AC.state==='suspended') AC.resume(); }catch(e){}
}
document.addEventListener('pointerdown',function(){ if(TM.st==='run'&&TM.snd) tmAudioUnlock(); },{passive:true});
function tmBeep(n){
if(!AC) return;
try{
if(AC.state==='suspended') AC.resume();
for(var i=0;i<n;i++){
var o=AC.createOscillator(), g=AC.createGain(), t=AC.currentTime+i*0.35;
o.type='sine'; o.frequency.value=880;
g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+0.3);
}
}catch(e){}
}
function tmSignal(k){
announce(k===0?'Час вийшов':k===1?'Лишилась одна хвилина':'Лишилось десять хвилин');
if(TM.vib&&navigator.vibrate){ try{ navigator.vibrate(k===0?[400,150,400,150,600]:k===1?[300,120,300]:[250]); }catch(e){} }
if(TM.snd) tmBeep(k===0?3:k===1?2:1);
}
function tmStopIv(){ if(tmIv){ clearInterval(tmIv); tmIv=null; } }
function tmPaint(){
var l=tmLeft(), tot=TM.dur*60000, c=document.getElementById('tmClock'), b=document.getElementById('tmBar'), s=document.getElementById('tmSum');
var txt=tmClockTxt(TM.st==='idle'?tot:l);
if(c) c.textContent=txt;
if(s) s.textContent=(TM.st==='idle')?'':txt;
if(b) b.style.width=(TM.st==='idle'?0:Math.min(100,Math.max(0,(1-l/tot)*100)))+'%';
document.title=TM.st==='run'?'⏱ '+txt+' · '+TM_TITLE:TM_TITLE;
}
function tmTick(){
if(TM.st!=='run'){ tmStopIv(); tmPaint(); return; }
var l=tmLeft();
if(l<=0){ tmFinish(false); return; }
if(l<=60000&&!TM.w1){ TM.w1=true; TM.w10=true; tmSave(); tmSignal(1); }
else if(l<=600000&&!TM.w10){ TM.w10=true; tmSave(); tmSignal(10); }
tmPaint();
}
function tmFinish(late){
TM.st='done'; TM.left=0; TM.end=0; TM.fin=Date.now(); tmSave(); tmStopIv();
if(!late) tmSignal(0);
UI.tf=!TM.saved; UI.op.tmBox=true; saveOp();
updBox('tmBox',timerHTML); tmPaint();
}
document.addEventListener('visibilitychange',function(){ if(!document.hidden) tmTick(); });
function tmAfter(){
if(TM.st==='run'){
if(tmLeft()<=0){ tmFinish(true); return; }
if(!tmIv) tmIv=setInterval(tmTick,500);
}else tmStopIv();
tmPaint();
}
function tmStart(){
tmAudioUnlock();
if(TM.st==='run') return;
if(TM.st==='idle'||TM.st==='done'){
TM.left=TM.dur*60000; TM.w10=TM.left<=600000; TM.w1=TM.left<=60000; TM.saved=false; TM.res=null; TM.beg=Date.now(); UI.tf=false;
}
TM.end=Date.now()+TM.left; TM.st='run'; tmSave();
updBox('tmBox',timerHTML); tmAfter();
}
function tmPause(){
if(TM.st!=='run') return;
TM.left=tmLeft(); TM.end=0; TM.st='pause'; tmSave(); tmStopIv();
updBox('tmBox',timerHTML); tmPaint();
}
function tmReset(){
if((TM.st==='run'||TM.st==='pause')&&!confirm('Скинути таймер? Час пробника буде втрачено.')) return;
TM.st='idle'; TM.left=TM.dur*60000; TM.end=0; TM.w10=false; TM.w1=false; TM.res=null; UI.tf=false; tmSave(); tmStopIv();
updBox('tmBox',timerHTML); tmPaint();
}
function tmSet(k,v){
if(k==='subj'){ if(ORDER.indexOf(v)<0) return; TM.subj=v; }
else if(k==='dur'){
if(TM.st==='run'||TM.st==='pause') return;
var d=Math.max(1,Math.min(300,parseInt(v,10)||60)); TM.dur=d;
if(TM.st==='done'&&TM.saved) TM.st='idle';
if(TM.st==='idle') TM.left=d*60000;
}
else if(k==='snd'||k==='vib'){ TM[k]=!!v; if(v&&k==='snd') tmAudioUnlock(); }
tmSave(); updBox('tmBox',timerHTML); tmPaint();
}
function tmRes(k,v){ TM.res=TM.res||{}; TM.res[k]=v; tmSave(); }
function tmSaveRes(toLog){
var r=TM.res||{}, sc=parseFloat(r.score), er=parseInt(r.errs,10);
var hasS=isFinite(sc), hasE=isFinite(er)&&er>0;
if(hasS&&(sc<0||sc>200)){ alert('Бал має бути від 0 до 200.'); return; }
if(!hasS&&!(toLog&&hasE)){ alert('Вкажи бал'+(toLog?' або кількість помилок':'')+'.'); return; }
if(hasS) logMock(TM.subj,sc,hasE?{errs:er}:null);
if(toLog&&hasE){ UI.ef.s=TM.subj; UI.ef.tp=''; UI.ef.q=er; UI.ef.src='mock'; UI.ef.focus=true; UI.ff.st='act'; UI.op.errBox=true; saveOp(); }
TM.saved=true; TM.res=null; UI.tf=false; tmSave();
render(); persist();
if(toLog&&hasE) setTimeout(function(){ openBox('errBox'); },60);
}
function timerHTML(){
tmNorm();
var run=TM.st==='run', lock=run||TM.st==='pause', m=META[TM.subj];
var h='<details class="card blk box" id="tmBox"'+(isOpen('tmBox',false)||lock||UI.tf?' open':'')+'><summary>⏱ Таймер пробника <b class="pill" id="tmSum"></b></summary>';
h+='<div class="plan-row"><label>Предмет <select id="tm-s"'+(lock?' disabled':'')+' onchange="tmSet(\'subj\',this.value)">'+ORDER.map(function(s){ return '<option value="'+s+'"'+(TM.subj===s?' selected':'')+'>'+ICON[s]+' '+esc(META[s].name)+'</option>'; }).join('')+'</select></label>'
+'<label>Хвилин <input id="tm-d" type="number" min="1" max="300" value="'+TM.dur+'"'+(lock?' disabled':'')+' onchange="tmSet(\'dur\',this.value)"></label></div>';
h+='<div class="tmclock" id="tmClock" role="timer" aria-label="Залишилось часу">00:00</div><div class="bar" style="--c:'+m.color+'"><i id="tmBar" style="width:0%"></i></div>';
h+='<div class="plan-row">';
if(run) h+='<button type="button" class="ok" onclick="tmPause()">⏸ Пауза</button>';
else h+='<button type="button" class="ok" onclick="tmStart()">'+(TM.st==='pause'?'▶ Продовжити':'▶ Старт')+'</button>';
h+='<button type="button" onclick="tmReset()">↺ Скинути</button>'
+'<label class="chk"><input type="checkbox"'+(TM.snd?' checked':'')+' onchange="tmSet(\'snd\',this.checked)"> звук</label>'
+'<label class="chk"><input type="checkbox"'+(TM.vib?' checked':'')+' onchange="tmSet(\'vib\',this.checked)"> вібрація</label></div>';
h+='<p class="meta">Сигнал за 10 і за 1 хв до кінця. Час рахується від мітки старту, тож згорнута вкладка чи заблокований екран його не збивають; стан зберігається в цьому браузері. Звук у фоні може заглушити браузер — вібрація й підсумок при поверненні спрацюють.</p>';
if(TM.st==='done'&&!TM.saved){
var r=TM.res||{};
h+='<div class="tmres"><h4>Час вийшов — запиши результат ('+esc(m.name)+')</h4><div class="plan-row">'
+'<label>Бал <input type="number" min="0" max="200" inputmode="decimal" value="'+esc(r.score==null?'':r.score)+'" oninput="tmRes(\'score\',this.value)"></label>'
+'<label>Помилок <input type="number" min="0" max="200" inputmode="numeric" value="'+esc(r.errs==null?'':r.errs)+'" oninput="tmRes(\'errs\',this.value)"></label></div>'
+'<div class="plan-row"><button type="button" class="ok" onclick="tmSaveRes(false)">💾 Зберегти бал</button><button type="button" onclick="tmSaveRes(true)">📝 Записати помилки в журнал</button></div></div>';
}else if(TM.st==='done') h+='<p class="meta">Пробник завершено й записано. «Старт» — новий.</p>';
return h+'</details>';
}

// ---- Статистика й підсумок тижня ----
function weekData(off){
var mon=dayStart(mondayOf(Date.now()),-7*off), end=dayStart(mon,7);
var d={mon:mon,end:end,closed:{},tot:0,pct:[],rv:0,cr:0,fx:0,add:0,days:0,mock:{},off:off};
function inW(t){ return t>=mon&&t<end; }
ORDER.forEach(function(s){
var c=0;
TID[s].forEach(function(id,i){
var e=ST(s,i); if(!e) return;
if(e.done&&inW(doneTs(e))) c++;
var pt=+e.pts, p=pctOf(e);
if(p!==null&&isFinite(pt)&&inW(pt)) d.pct.push(p);
});
d.closed[s]=c; d.tot+=c;
var arr=(STATE.mockLog[s]||[]).slice().sort(function(a,b){ return (a.ts||0)-(b.ts||0); }), w=arr.filter(function(e){ return inW(e.ts||0); }), prev=null;
arr.forEach(function(e){ if((e.ts||0)<mon) prev=e; });
d.mock[s]=w.length?{n:w.length,last:+w[w.length-1].score,delta:prev?+w[w.length-1].score-(+prev.score):null}:{n:0,last:arr.length?+arr[arr.length-1].score:null};
});
for(var i=0;i<7;i++){
var k=isoDay(dayStart(mon,i)), st=(STATE.dst||{})[k]||{};
d.rv+=st.rv||0; d.cr+=st.cr||0;
if(((STATE.act||{})[k]||0)>0) d.days++;
}
errsAll().forEach(function(e){ if(inW(e.ts||0)) d.add++; if(e.fixed&&inW(e.fixed)) d.fx++; });
return d;
}
function lagging(d){
var dl=examDl(), best=null, frac=d.off===0?(((new Date().getDay()+6)%7)+1)/7:1;
ORDER.forEach(function(s){
var left=0; for(var i=0;i<TID[s].length;i++){ var e=ST(s,i); if(!(e&&e.done)) left++; }
if(!left) return;
var need, how;
if(dl>28){ need=left/((dl-28)/7); how='за темпом до фінішу'; }
else{ var pd=0; WEEK.forEach(function(x){ if(x.indexOf(s)>-1) pd++; }); need=Math.min(pd,left); how='за розкладом тижня'; }
var deficit=need*frac-d.closed[s];
if(deficit>=1&&(!best||deficit>best.deficit)) best={s:s,need:need,deficit:deficit,how:how};
});
return best;
}
function recommend(d,lag){
var eo=dueErrs().filter(errOverdue);
if(eo.length) return 'Зроби фокус на журналі помилок: прострочено '+eo.length+' '+pl(eo.length,['помилка','помилки','помилок'])+' — розбери їх у перші два дні тижня, поки вони не накопичились.';
if(lag) return 'Зроби фокус на предметі «'+META[lag.s].name+'»: закрий щонайменше '+Math.max(1,Math.ceil(lag.need))+' '+pl(Math.max(1,Math.ceil(lag.need)),['тему','теми','тем'])+' (потрібно ≈'+lag.need.toFixed(1)+' на тиждень, зараз відставання ≈'+lag.deficit.toFixed(1)+').';
var w=weakList();
if(w.length) return 'Зроби фокус на слабкій темі «'+TOPICS[w[0].s][w[0].i]+'»'+(w[0].p!==null?' ('+w[0].p+'%)':'')+': перерішай 10–15 завдань і онови «тест %».';
var cnt=[0,0,0,0], tot=0; errsAll().forEach(function(e){ cnt[e.w|0]++; tot++; });
if(tot>=5){
var mx=0; cnt.forEach(function(c,i){ if(c>cnt[mx]) mx=i; });
if(cnt[mx]/tot>=0.4){
var tip=['вивчи правила з відповідних тем і зроби по них картки','перечитуй умову двічі й перевіряй відповідь підстановкою','тренуйся на таймері й пропускай завдання, що «зависають»','виписуй «дано / знайти» до кожного завдання'][mx];
return 'Зроби фокус на причині «'+ERR_WHY[mx]+'» ('+Math.round(cnt[mx]/tot*100)+'% помилок): '+tip+'.';
}
}
return 'Зроби фокус на регулярності: закривай хоча б одну тему щодня за розкладом і вписуй «тест %» після кожної.';
}
function weekHTML(){
var d=weekData(UI.wkOff), isSun=new Date().getDay()===0, key=isoDay(mondayOf(Date.now()));
if(isSun&&!UI.wkSeen&&cfgGet('wk')!==key){
UI.wkSeen=true; UI.wkAuto=true; UI.op.weekBox=true;
cfgSet('wk',key); setTimeout(persist,0);
}
var lag=lagging(d), range=fmtDM(d.mon)+'–'+fmtDM(dayStart(d.mon,6));
var avg=d.pct.length?Math.round(d.pct.reduce(function(a,b){ return a+b; },0)/d.pct.length):null;
var h='<details class="card blk box" id="weekBox"'+(isOpen('weekBox',false)?' open':'')+'><summary>📊 Підсумок тижня ('+range+')</summary>';
h+='<div class="plan-row"><button type="button"'+(UI.wkOff===0?' class="ok"':'')+' onclick="UI.wkOff=0;updBox(\'weekBox\',weekHTML)">Цей тиждень</button><button type="button"'+(UI.wkOff===1?' class="ok"':'')+' onclick="UI.wkOff=1;updBox(\'weekBox\',weekHTML)">Минулий</button></div>';
h+='<div class="wk-grid">'
+'<div class="wk"><b>'+d.tot+'</b><i>'+pl(d.tot,['тему закрито','теми закрито','тем закрито'])+'</i></div>'
+'<div class="wk"><b>'+(avg===null?'—':avg+'%')+'</b><i>середній «тест %» ('+d.pct.length+' '+pl(d.pct.length,['тема','теми','тем'])+')</i></div>'
+'<div class="wk"><b>'+d.rv+'</b><i>повторень тем'+(d.cr?' · карток '+d.cr:'')+'</i></div>'
+'<div class="wk"><b>'+d.fx+'</b><i>'+pl(d.fx,['помилку виправлено','помилки виправлено','помилок виправлено'])+(d.add?' (нових: '+d.add+')':'')+'</i></div>'
+'<div class="wk"><b>🔥 '+streak()+'</b><i>серія днів · активних у тижні: '+d.days+'/7</i></div></div>';
h+='<h4>Пробники</h4>';
ORDER.forEach(function(s){
var m=d.mock[s], t;
if(m.n){ t='<b>'+m.last+'</b> '+(m.delta===null?'<i>перший запис</i>':m.delta>0?'<span class="up">▲ +'+m.delta+'</span>':m.delta<0?'<span class="dn">▼ '+m.delta+'</span>':'<span>▬ 0</span>')+' <i>('+m.n+' '+pl(m.n,['спроба','спроби','спроб'])+')</i>'; }
else t='<i>цього тижня не було'+(m.last!==null?' · останній: '+m.last:'')+'</i>';
h+='<div class="tl" style="--c:'+META[s].color+'">'+ICON[s]+' '+esc(META[s].name)+': '+t+'</div>';
});
h+='<h4>Відставання від плану</h4><p class="meta">'+(lag?ICON[lag.s]+' <b>'+esc(META[lag.s].name)+'</b>: потрібно ≈'+lag.need.toFixed(1)+' тем/тиждень ('+lag.how+'), закрито '+d.closed[lag.s]+'.':'Помітного відставання немає ✅')+'</p>';
h+='<div class="rec"><b>💡 Рекомендація на наступний тиждень</b><br>'+esc(recommend(d,lag))+'</div>';
return h+'</details>';
}

// ---- Картки (Leitner, 5 коробок) ----
var LB=[1,3,7,14,30];
function decksLive(){
return Object.keys(STATE.decks||{}).map(function(k){ return STATE.decks[k]; }).filter(function(d){ return d&&!d.x; }).sort(function(a,b){ return (a.o||0)-(b.o||0)||(a.id<b.id?-1:1); });
}
function cardsOf(deck){
return Object.keys(STATE.cards||{}).map(function(k){ return STATE.cards[k]; }).filter(function(c){ return c&&!c.x&&(!deck||c.d===deck); });
}
function cardDue(c){ return (c.n||0)<=Date.now(); }
function cardsDueCount(deck){ return cardsOf(deck).filter(cardDue).length; }
function curDeck(){
var ds=decksLive();
if(UI.cd&&STATE.decks[UI.cd]&&!STATE.decks[UI.cd].x) return UI.cd;
return ds.length?ds[0].id:'';
}
function cardsRefresh(){ updBox('cardBox',cardsHTML); }
function cdSel(id){ UI.cd=id; UI.ce=''; cardsRefresh(); }
function deckAdd(ev){
if(ev&&ev.preventDefault) ev.preventDefault();
var n=document.getElementById('dk-n'), s=document.getElementById('dk-s'); var name=(n.value||'').trim(); if(!name) return false;
var id='deck-'+uid('').slice(-8), t=Date.now();
STATE.decks[id]={id:id,name:name.slice(0,60),subj:s.value,o:t,upd:t};
UI.cd=id; persist(); cardsRefresh(); return false;
}
function deckRename(id){
var d=STATE.decks[id]; if(!d) return;
var v=prompt('Нова назва колоди:',d.name); if(v===null) return; v=v.trim().slice(0,60); if(!v) return;
d.name=v; d.upd=Date.now(); persist(); cardsRefresh();
}
function deckDel(id){
var d=STATE.decks[id]; if(!d) return;
var cs=cardsOf(id);
if(!confirm('Видалити колоду «'+d.name+'» разом із картками ('+cs.length+')?')) return;
var n=Date.now();
cs.forEach(function(c){ STATE.cards[c.id]={id:c.id,x:1,upd:n}; });
STATE.decks[id]={id:id,x:1,upd:n};
UI.cd=''; render(); persist();
}
function cardAdd(ev){
if(ev&&ev.preventDefault) ev.preventDefault();
var q=document.getElementById('cd-q'), a=document.getElementById('cd-a'), dk=curDeck();
var qq=(q.value||'').trim().slice(0,500), aa=(a.value||'').trim().slice(0,500);
if(!dk||!qq||!aa) return false;
var id=uid('c'), n=Date.now();
STATE.cards[id]={id:id,d:dk,q:qq,a:aa,b:1,n:0,ts:n,upd:n};
bump(); persist(); cardsRefresh();
setTimeout(function(){ var e=document.getElementById('cd-q'); if(e) e.focus(); },30);
return false;
}
function cardEdit(id){ UI.ce=id; cardsRefresh(); }
function cardSave(id){
var c=STATE.cards[id]; if(!c) return;
var qq=(document.getElementById('ce-q').value||'').trim().slice(0,500), aa=(document.getElementById('ce-a').value||'').trim().slice(0,500);
if(!qq||!aa) return;
c.q=qq; c.a=aa; c.upd=Date.now(); UI.ce=''; persist(); cardsRefresh();
}
function cardDel(id){
if(!STATE.cards[id]||!confirm('Видалити картку?')) return;
STATE.cards[id]={id:id,x:1,upd:Date.now()}; persist(); cardsRefresh();
}
// Розбір CSV/тексту: роздільник ; або табуляція або кома (обирається за тим, що частіше трапляється), лапки "…" дозволяють ; всередині
function parseTable(txt){
txt=String(txt||'').replace(/^\uFEFF/,'');
var lines=txt.split(/\r?\n/).filter(function(l){ return l.trim(); }), best=';', bc=-1;
[';','\t',','].forEach(function(d){ var c=lines.filter(function(l){ return l.indexOf(d)>-1; }).length; if(c>bc){ bc=c; best=d; } });
var rows=[], row=[], cur='', q=false, i, ch;
for(i=0;i<txt.length;i++){
ch=txt.charAt(i);
if(q){
if(ch==='"'){ if(txt.charAt(i+1)==='"'){ cur+='"'; i++; } else q=false; }
else cur+=ch;
}else if(ch==='"'&&cur===''){ q=true; }
else if(ch===best){ row.push(cur); cur=''; }
else if(ch==='\n'||ch==='\r'){
if(ch==='\r'&&txt.charAt(i+1)==='\n') i++;
row.push(cur); cur=''; rows.push(row); row=[];
}else cur+=ch;
}
if(cur!==''||row.length){ row.push(cur); rows.push(row); }
return rows.map(function(r){
var cells=r.map(function(c){ return c.trim(); });
if(cells.length<2) return null;
var qq=cells[0], aa=cells.slice(1).filter(function(c){ return c!==''; }).join(best===','?', ':'; ');
return (qq&&aa)?[qq.slice(0,500),aa.slice(0,500)]:null;
}).filter(Boolean);
}
function cardsImport(txt){
var dk=curDeck(); if(!dk){ alert('Спершу створи колоду.'); return; }
var rows=parseTable(txt);
if(rows.length&&/^(питання|question|q)$/i.test(rows[0][0])&&/^(відповідь|answer|a)$/i.test(rows[0][1])) rows.shift();
var have={}; cardsOf(dk).forEach(function(c){ have[c.q.toLowerCase()]=1; });
var add=0, dup=0, n=Date.now();
rows.slice(0,2000).forEach(function(r,k){
var key=r[0].toLowerCase(); if(have[key]){ dup++; return; } have[key]=1;
var id=uid('c')+k; STATE.cards[id]={id:id,d:dk,q:r[0],a:r[1],b:1,n:0,ts:n,upd:n}; add++;
});
if(add){ bump(); persist(); }
UI.imsg='Додано: '+add+(dup?', пропущено дублікатів: '+dup:'')+(rows.length>2000?'. Імпортовано лише перші 2000 рядків.':'');
cardsRefresh();
}
function cardsImportText(){ var t=document.getElementById('ci-t'); cardsImport(t?t.value:''); }
function cardsImportFile(inp){
var f=inp.files&&inp.files[0]; if(!f) return;
var r=new FileReader();
r.onload=function(){ cardsImport(String(r.result)); };
r.readAsText(f,'utf-8');
}
function cardsTemplate(){
var b=new Blob(['\uFEFFпитання;відповідь\r\n'],{type:'text/csv;charset=utf-8'}), a=document.createElement('a');
a.href=URL.createObjectURL(b); a.download='nmt-cards-template.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function cardStart(deck){
var ids=cardsOf(deck).filter(cardDue).sort(function(a,b){ return (a.b-b.b)||((a.n||0)-(b.n||0)); }).slice(0,50).map(function(c){ return c.id; });
if(!ids.length) return;
UI.cs={q:ids,tot:ids.length,ok:0,flip:false,fin:false,deck:deck};
cardsRefresh(); cardFocus();
}
function cardFocus(){ setTimeout(function(){ var b=document.getElementById('cardNext'); if(b) b.focus(); },40); }
function cardFlip(){ UI.cs.flip=true; cardsRefresh(); cardFocus(); }
function cardAns(ok){
var cs=UI.cs; if(!cs||!cs.q.length) return;
var id=cs.q[0], c=STATE.cards[id], n=Date.now();
if(c&&!c.x){
if(ok) c.b=Math.min(5,(c.b||1)+1); else c.b=1;
c.n=dayStart(n,LB[c.b-1]); c.upd=n; bump(); dstat('cr');
}
if(ok){ cs.q.shift(); cs.ok++; } else cs.q.push(cs.q.shift());
cs.flip=false;
if(!cs.q.length) cs.fin=true;
persist(); cardsRefresh(); cardFocus();
}
function cardEnd(){ UI.cs=null; render(); }
function cardsSession(){
var cs=UI.cs;
var h='<div class="csess">';
if(cs.fin||!cs.q.length){
return h+'<h4>Сесію завершено 🎉</h4><p class="meta">Усі картки з цієї черги закріплено (знав без помилки: '+cs.ok+' з '+cs.tot+').</p><button type="button" class="ok" onclick="cardEnd()">Готово</button></div>';
}
var c=STATE.cards[cs.q[0]];
h+='<p class="meta">Залишилось: '+cs.q.length+' · коробка '+(c?c.b:1)+' з 5</p>'
+'<div class="cface" aria-live="polite"><div class="cq">'+esc(c?c.q:'')+'</div>'+(cs.flip?'<div class="ca">'+esc(c?c.a:'')+'</div>':'')+'</div>'
+'<div class="plan-row">';
if(!cs.flip) h+='<button type="button" class="ok" id="cardNext" onclick="cardFlip()">Показати відповідь</button>';
else h+='<button type="button" class="ok" id="cardNext" onclick="cardAns(true)">✓ Знаю</button><button type="button" onclick="cardAns(false)">✗ Не знаю</button>';
return h+'<button type="button" onclick="cardEnd()">Завершити</button></div></div>';
}
function cardsHTML(){
var ds=decksLive(), dk=curDeck(), due=cardsDueCount('');
var h='<details class="card blk box" id="cardBox"'+(isOpen('cardBox',false)||UI.cs?' open':'')+'><summary>🃏 Картки ('+due+' на повторення)</summary>';
if(UI.cs) return h+cardsSession()+'</details>';
h+='<p class="meta">Інтервали за коробками (Leitner): 1 → 3 → 7 → 14 → 30 днів. «Не знаю» повертає картку в коробку 1.</p>';
h+='<div class="dks">'+ds.map(function(d){
var dc=cardsDueCount(d.id);
return '<button type="button" class="dk'+(d.id===dk?' on':'')+'" aria-pressed="'+(d.id===dk)+'" onclick="cdSel(\''+d.id+'\')">'+(d.subj?ICON[d.subj]+' ':'')+esc(d.name)+' <i>'+(dc?dc+'/':'')+cardsOf(d.id).length+'</i></button>';
}).join('')+'</div>';
h+='<form class="plan-row" onsubmit="return deckAdd(event)"><input id="dk-n" type="text" maxlength="60" placeholder="нова колода" aria-label="Назва нової колоди"><select id="dk-s" aria-label="Предмет колоди"><option value="">без предмета</option>'+ORDER.map(function(s){ return '<option value="'+s+'">'+esc(META[s].name)+'</option>'; }).join('')+'</select><button type="submit">➕ Колода</button></form>';
if(dk){
var d=STATE.decks[dk], cs=cardsOf(dk), dc=cs.filter(cardDue).length, bx=[0,0,0,0,0];
cs.forEach(function(c){ bx[(c.b||1)-1]++; });
h+='<h4>'+esc(d.name)+' <button type="button" onclick="deckRename(\''+dk+'\')" aria-label="Перейменувати колоду">✎</button> <button type="button" onclick="deckDel(\''+dk+'\')" aria-label="Видалити колоду">🗑</button></h4>';
h+='<p class="meta">Карток: '+cs.length+' · коробки: '+bx.map(function(x,i){ return (i+1)+': '+x; }).join(' · ')+'</p>';
h+='<div class="plan-row"><button type="button" class="ok" '+(dc?'':'disabled ')+'onclick="cardStart(\''+dk+'\')">▶ Повторювати ('+dc+')</button>'+(due>dc?'<button type="button" onclick="cardStart(\'\')">▶ Усі колоди ('+due+')</button>':'')+'</div>';
if(!cs.length) h+='<p class="meta">Колода порожня. Додай картки вручну або імпортом — я навмисно не заповнював їх із пам\'яті, щоб не спотворити наголоси й дати.</p>';
h+='<form class="errform" onsubmit="return cardAdd(event)"><label class="fl">Питання<input id="cd-q" type="text" maxlength="500" required></label><label class="fl">Відповідь<input id="cd-a" type="text" maxlength="500" required></label><button type="submit" class="ok">➕ Додати картку</button></form>';
h+='<details class="subd"><summary>📥 Імпорт карток</summary><p class="meta">Один запис на рядок: <b>питання;відповідь</b> (також табуляція або кома). Якщо в тексті є «;», бери поле в лапки. CSV зберігай у кодуванні UTF-8. Дублікати за питанням пропускаються.</p>'
+'<textarea id="ci-t" rows="4" placeholder="питання;відповідь" aria-label="Текст для імпорту"></textarea>'
+'<div class="plan-row"><button type="button" class="ok" onclick="cardsImportText()">Імпортувати текст</button><label class="filebtn">📄 З файлу CSV<input type="file" accept=".csv,.txt,text/csv,text/plain" onchange="cardsImportFile(this)" hidden></label><button type="button" onclick="cardsTemplate()">⬇️ Шаблон CSV</button></div>'+(UI.imsg?'<p class="meta">'+esc(UI.imsg)+'</p>':'')+'</details>';
UI.imsg='';
if(cs.length){
h+='<details class="subd"><summary>Усі картки колоди ('+cs.length+')</summary>';
cs.slice().sort(function(a,b){ return (a.ts||0)-(b.ts||0); }).slice(0,150).forEach(function(c){
if(UI.ce===c.id) h+='<div class="er"><div class="eb"><input id="ce-q" type="text" maxlength="500" value="'+esc(c.q)+'" aria-label="Питання"><input id="ce-a" type="text" maxlength="500" value="'+esc(c.a)+'" aria-label="Відповідь"></div><div class="ea"><button type="button" class="ok" onclick="cardSave(\''+c.id+'\')">💾</button><button type="button" onclick="cdSel(\''+dk+'\')">✕</button></div></div>';
else h+='<div class="er"><div class="eb"><b class="et">'+esc(c.q)+'</b><div class="em"><i>'+esc(c.a)+'</i> · <i>коробка '+c.b+'</i></div></div><div class="ea"><button type="button" aria-label="Редагувати" onclick="cardEdit(\''+c.id+'\')">✎</button><button type="button" aria-label="Видалити" onclick="cardDel(\''+c.id+'\')">🗑</button></div></div>';
});
if(cs.length>150) h+='<p class="meta">Показано перші 150.</p>';
h+='</details>';
}
}else h+='<p class="meta">Колод немає — створи першу.</p>';
var sz=0; try{ sz=JSON.stringify(STATE).length; }catch(e){}
if(sz>700000) h+='<p class="meta warn">⚠️ Дані займають ≈'+Math.round(sz/1024)+' КБ. Хмара (Firestore) приймає документ до ≈1 МБ — не додавай багато зайвих карток.</p>';
return h+'</details>';
}

// ---- Графіки «Динаміка» ----
function tipEv(ev,wrap){
var el=ev.target.closest?ev.target.closest('[data-tip]'):null, t=wrap.querySelector('.ctip');
if(!t) return;
if(!el){ if(ev.type==='click') t.hidden=true; return; }
if(ev.type==='pointerover'&&ev.pointerType&&ev.pointerType!=='mouse') return;
t.textContent=el.getAttribute('data-tip'); t.hidden=false;
var wr=wrap.getBoundingClientRect(), r=el.getBoundingClientRect();
var x=r.left+r.width/2-wr.left-t.offsetWidth/2;
t.style.left=Math.max(2,Math.min(wr.width-t.offsetWidth-2,x))+'px';
t.style.top=Math.max(0,r.top-wr.top-t.offsetHeight-6)+'px';
}
function tipOut(ev,wrap){ if(ev.pointerType==='mouse'){ var t=wrap.querySelector('.ctip'); if(t) t.hidden=true; } }
function dynTog(s){ UI.dh[s]=!UI.dh[s]; updBox('dynBox',dynHTML); }
function dynW(){ return Math.max(280,Math.min(720,(document.documentElement.clientWidth||360)-56)); }
function dynLine(){
var W=dynW(), H=250, L=34, R=10, T=12, B=26, series=[], all=[], goals={};
ORDER.forEach(function(s){
if(UI.dh[s]) return;
var arr=(STATE.mockLog[s]||[]).filter(function(e){ return isFinite(+e.score)&&e.ts; }).map(function(e){ return {s:s,t:e.ts,v:+e.score,errs:e.errs}; });
series.push({s:s,pts:arr}); arr.forEach(function(p){ all.push(p); });
var g=parseFloat(cfgGet('goal:'+s)); if(isFinite(g)) goals[s]=g;
});
var legend='<div class="lgd">'+ORDER.map(function(s){
return '<button type="button" class="lg'+(UI.dh[s]?' off':'')+'" style="--c:'+META[s].color+'" aria-pressed="'+(!UI.dh[s])+'" onclick="dynTog(\''+s+'\')">'+ICON[s]+' '+esc(META[s].name)+'</button>';
}).join('')+'</div>';
if(!all.length) return legend+'<p class="meta">Немає даних для показаних предметів. Додай бали пробників — з\'явиться лінія.</p>';
var vals=all.map(function(p){ return p.v; }).concat(Object.keys(goals).map(function(s){ return goals[s]; }));
var lo=Math.max(0,Math.floor((Math.min.apply(null,vals)-5)/10)*10), hi=Math.min(200,Math.ceil((Math.max.apply(null,vals)+5)/10)*10);
if(hi-lo<20){ hi=Math.min(200,lo+20); lo=Math.max(0,hi-20); }
var step=(hi-lo)<=40?10:(hi-lo)<=100?20:50;
var tmin=Math.min.apply(null,all.map(function(p){ return p.t; })), tmax=Math.max.apply(null,all.map(function(p){ return p.t; }));
if(tmin===tmax){ tmin-=DAY; tmax+=DAY; }
function X(t){ return L+(t-tmin)/(tmax-tmin)*(W-L-R); }
function Y(v){ return T+(1-(v-lo)/(hi-lo))*(H-T-B); }
var sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="dynT dynD" focusable="false"><title id="dynT">Бали пробників за часом</title>';
var desc=series.filter(function(z){ return z.pts.length; }).map(function(z){ var l=z.pts[z.pts.length-1]; return META[z.s].name+': '+z.pts.length+' '+pl(z.pts.length,['запис','записи','записів'])+', останній '+l.v+' ('+fmtDM(l.t)+')'; }).join('; ');
sv+='<desc id="dynD">'+esc(desc)+'. Докладні значення — у таблиці нижче.</desc>';
var v;
for(v=Math.ceil(lo/step)*step;v<=hi;v+=step) sv+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" class="gl2"/><text x="'+(L-5)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end" class="ax">'+v+'</text>';
var nt=W<400?3:5, k;
for(k=0;k<nt;k++){ var tt=tmin+(tmax-tmin)*k/(nt-1); sv+='<text x="'+X(tt).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(k===0?'start':k===nt-1?'end':'middle')+'" class="ax">'+fmtDM(tt)+'</text>'; }
Object.keys(goals).forEach(function(s){
sv+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(goals[s]).toFixed(1)+'" y2="'+Y(goals[s]).toFixed(1)+'" stroke="'+META[s].color+'" stroke-width="1.5" stroke-dasharray="5 4" opacity=".75"><title>Ціль: '+esc(META[s].name)+' '+goals[s]+'</title></line>';
});
var hits='';
series.forEach(function(z){
if(z.pts.length>1) sv+='<polyline fill="none" stroke="'+META[z.s].color+'" stroke-width="2.2" stroke-linejoin="round" points="'+z.pts.map(function(p){ return X(p.t).toFixed(1)+','+Y(p.v).toFixed(1); }).join(' ')+'"/>';
z.pts.forEach(function(p){
var tip=META[z.s].name+' · '+fmtDM(p.t)+': '+p.v+(p.errs!==undefined&&p.errs!==null?' · помилок '+p.errs:'');
sv+='<circle cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="4" fill="'+META[z.s].color+'" stroke="var(--card2)" stroke-width="1.5"/>';
hits+='<circle cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="15" fill="transparent" tabindex="0" role="img" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'"/>';
});
});
sv+=hits+'</svg>';
var rows=all.slice().sort(function(a,b){ return b.t-a.t; }).slice(0,60).map(function(p){ return '<tr><td>'+fmtDM(p.t)+'</td><td>'+esc(META[p.s].name)+'</td><td>'+p.v+'</td></tr>'; }).join('');
return legend+'<div class="cw" onpointerover="tipEv(event,this)" onclick="tipEv(event,this)" onfocusin="tipEv(event,this)" onpointerout="tipOut(event,this)">'+sv+'<div class="ctip" hidden></div></div>'
+'<p class="meta">Пунктир — цільовий бал (задається біля пробників предмета).</p>'
+'<details class="subd"><summary>Таблиця значень</summary><div class="tbw"><table><thead><tr><th>Дата</th><th>Предмет</th><th>Бал</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
function dynAct(){
var W=dynW(), H=110, L=26, R=6, T=8, B=22, a=STATE.act||{}, days=[], i, mx=1, sum=0, on=0;
for(i=29;i>=0;i--){ var t=dayStart(Date.now(),-i), c=+a[isoDay(t)]||0; days.push({t:t,c:c}); if(c>mx) mx=c; sum+=c; if(c) on++; }
var bw=(W-L-R)/30;
var sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="actT actD" focusable="false"><title id="actT">Активність за 30 днів</title><desc id="actD">Усього дій: '+sum+', активних днів: '+on+' із 30, максимум за день: '+mx+'.</desc>';
sv+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" class="gl2"/><text x="'+(L-4)+'" y="'+(T+8)+'" text-anchor="end" class="ax">'+mx+'</text><text x="'+(L-4)+'" y="'+(H-B)+'" text-anchor="end" class="ax">0</text>';
var hits='';
days.forEach(function(d,k){
var h=d.c?Math.max(2,d.c/mx*(H-T-B)):1, x=L+k*bw+1, tip=fmtDM(d.t)+': '+d.c+' '+pl(d.c,['дія','дії','дій']);
sv+='<rect x="'+x.toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" class="'+(d.c?'bar-on':'bar-off')+'"/>';
hits+='<rect x="'+(L+k*bw).toFixed(1)+'" y="'+T+'" width="'+bw.toFixed(1)+'" height="'+(H-T-B)+'" fill="transparent" tabindex="0" role="img" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'"/>';
if(k%7===0||k===29) sv+='<text x="'+(x+bw/2-1).toFixed(1)+'" y="'+(H-6)+'" text-anchor="'+(k===29?'end':'middle')+'" class="ax">'+fmtDM(d.t)+'</text>';
});
return '<div class="cw" onpointerover="tipEv(event,this)" onclick="tipEv(event,this)" onfocusin="tipEv(event,this)" onpointerout="tipOut(event,this)">'+sv+hits+'</svg><div class="ctip" hidden></div></div>'
+'<p class="meta">Активних днів: <b>'+on+'</b> із 30 · усього дій: <b>'+sum+'</b> · серія: <b>'+streak()+'</b></p>';
}
function dynHTML(){
return '<details class="card blk box" id="dynBox"'+(isOpen('dynBox',false)?' open':'')+'><summary>📈 Динаміка</summary><h4>Бали пробників</h4>'+dynLine()+'<h4>Активність за 30 днів</h4>'+dynAct()+'</details>';
}
var _rz;
window.addEventListener('resize',function(){
clearTimeout(_rz);
_rz=setTimeout(function(){ var el=document.getElementById('dynBox'); if(el&&el.open) updBox('dynBox',dynHTML); },250);
});

// ---- Швидка навігація ----
function qnavHTML(){
var ed=dueErrs().length, cd=cardsDueCount('');
function b(id,t){ return '<button type="button" onclick="openBox(\''+id+'\')">'+t+'</button>'; }
return '<nav class="qnav" aria-label="Розділи">'+b('errBox','📝 Помилки'+(ed?' <i>'+ed+'</i>':''))+b('tmBox','⏱ Таймер'+(TM.st==='run'?' <i>●</i>':''))+b('weekBox','📊 Тиждень')+b('cardBox','🃏 Картки'+(cd?' <i>'+cd+'</i>':''))+b('dynBox','📈 Динаміка')+'</nav>';
}
