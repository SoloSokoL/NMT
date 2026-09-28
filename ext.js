/* ===== Розширення: план, повторення, помилки, копії, безпечна синхронізація ===== */
var DAY=86400000, REV=[1,3,7,14,30,60];
var SCHED=[['math'],['ukr'],['math'],['ukr'],['math','hist'],['ukr','eng'],[]];
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
STATE.errs=STATE.errs||[]; STATE.cfg=STATE.cfg||{}; STATE.act=STATE.act||{};
}
// Злиття локального й хмарного прогресу: для кожної теми виграє новіша зміна, нічого не губиться.
function mergeState(a,b){
var A=a||{}, B=b||{}, o={};
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
return o;
}

function toggle(subj,i){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][i]||{}, n=Date.now();
cur.done=!cur.done; cur.upd=n;
if(cur.done){ cur.date=todayStr(); cur.ts=n; cur.last=n; cur.rv=0; bump(); }
else { cur.date=''; delete cur.ts; delete cur.last; cur.rv=0; }
STATE[subj][i]=cur;
render(); persist();
}
function cycleConf(subj,i){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][i]||{};
cur.conf=((cur.conf||0)%3)+1; cur.upd=Date.now();
STATE[subj][i]=cur;
render(); persist();
}
function confBtn(subj,i,d){
return '<button type="button" class="conf c'+(d.conf||0)+'" title="Впевненість у темі: 🔴 слабо · 🟡 так собі · 🟢 добре" onclick="cycleConf(\''+subj+'\','+i+')"></button>';
}
function reviewTopic(subj,i,ok){
var cur=(STATE[subj]||{})[i]; if(!cur) return;
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
tot++; var d=STATE[s][i];
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
for(var i=0;i<TOPICS[s].length&&nx.length<2;i++){ if(!(STATE[s][i]&&STATE[s][i].done)) nx.push(i); }
h+='<div class="tl" style="--c:'+META[s].color+'"><b>'+ICON[s]+' '+META[s].name+'</b>'+(nx.length?'':'<span>усе пройдено 🎉</span>');
nx.forEach(function(i){ h+='<a href="#r-'+s+'-'+i+'">'+esc(TOPICS[s][i])+'</a>'; });
h+='</div>';
});
var due=[];
ORDER.forEach(function(s){
for(var k in STATE[s]){ var x=dueIn(STATE[s][k]); if(x!==null&&x<=0) due.push({s:s,i:+k,x:x}); }
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
