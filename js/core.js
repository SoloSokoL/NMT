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

// ---- Швидка навігація ----
function qnavHTML(){
var ed=dueErrs().length, cd=cardsDueCount('');
function b(id,t){ return '<button type="button" onclick="openBox(\''+id+'\')">'+t+'</button>'; }
return '<nav class="qnav" aria-label="Розділи">'+b('errBox','📝 Помилки'+(ed?' <i>'+ed+'</i>':''))+b('tmBox','⏱ Таймер'+(TM.st==='run'?' <i>●</i>':''))+b('weekBox','📊 Тиждень')+b('cardBox','🃏 Картки'+(cd?' <i>'+cd+'</i>':''))+b('dynBox','📈 Динаміка')+'</nav>';
}

