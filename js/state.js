/* ===== Стан: схема, міграція, очищення, злиття, ваги =====
   SCHEMA, міграції v1→v3, утиліти, конфіг із мітками часу, mergeState (синхронізація), ваги тем. */
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
var tmp=document.createElement('div'); tmp.innerHTML=hx(fn());
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
// ---- Санітизація даних (локальних, хмарних і з файлу копії): жодне поле не потрапляє в стан у «сирому» вигляді ----
function fnum(x){ x=+x; return isFinite(x)?x:undefined; }
function fixDate(x){ x=String(x==null?'':x); return /^[0-9.\-\/ ]{0,12}$/.test(x)?x:''; }
// Запис теми: лише відомі поля й лише очікуваних типів (раніше хмарний запис копіювався як є, а date виводилось у HTML без екранування).
function fixTopic(e){
if(!e||typeof e!=='object'||Array.isArray(e)) return null;
var o={}, v;
if(e.done!==undefined) o.done=!!e.done;
if(e.date!==undefined) o.date=fixDate(e.date);
if(e.note!==undefined) o.note=str(e.note,5000);
['ts','last','pts','upd'].forEach(function(k){ if(e[k]!==undefined){ v=fnum(e[k]); if(v!==undefined) o[k]=v; } });
if(e.rv!==undefined){ v=fnum(e.rv); if(v!==undefined) o.rv=Math.max(0,Math.round(v)); }
if(e.conf!==undefined){ v=fnum(e.conf); if(v!==undefined) o.conf=Math.max(0,Math.min(3,Math.round(v))); }
if(e.pct!==undefined&&e.pct!==null&&e.pct!==''){ v=fnum(e.pct); if(v!==undefined) o.pct=Math.max(0,Math.min(100,v)); }
if(e.count!==undefined){ v=fnum(e.count); o.count=(v!==undefined&&e.count!=='')?v:str(e.count,20); }
return o;
}
// Конфіг: exam — дата РРРР-ММ-ДД, wk — рядок-мітка, goal/wt — таблиці за предметом/темою, u/upd — мітки часу.
function fixCfg(c){
var o={}, k, v;
if(!c||typeof c!=='object'||Array.isArray(c)) return o;
if(typeof c.exam==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.exam)) o.exam=c.exam;
if(typeof c.wk==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.wk)) o.wk=c.wk;
if(c.goal&&typeof c.goal==='object'){ o.goal={}; ORDER.forEach(function(s){ v=fnum(c.goal[s]); if(c.goal[s]!==undefined&&c.goal[s]!==''&&v!==undefined) o.goal[s]=v; }); }
if(c.wt&&typeof c.wt==='object'){ o.wt={}; for(k in c.wt){ if(c.wt[k]==='h'||c.wt[k]==='l') o.wt[safeId(k)]=c.wt[k]; } }
if(c.u&&typeof c.u==='object'){ o.u={}; for(k in c.u){ v=fnum(c.u[k]); if(/^[\w:\-.]{1,80}$/.test(k)&&v!==undefined) o.u[k]=v; } }
v=fnum(c.upd); if(v!==undefined) o.upd=v;
return o;
}
function mergeCfg(a,b){
a=fixCfg(a); b=fixCfg(b);
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
if(!c.ts) c.ts=parseDM(fixDate(c.date))||0;
if(!c.id){ var key=String(c.date||'')+'-'+c.score; cnt[key]=(cnt[key]||0)+1; c.id='L'+s+'-'+key+'-'+cnt[key]; }
// у запису лишаються лише id, date, ts, score, errs — і лише чисел/безпечних рядків
var sc=fnum(c.score); if(sc===undefined||c.score===''||c.score===null) return;
var n={id:safeId(c.id),date:fixDate(c.date),ts:fnum(c.ts)||0,score:sc};
if(c.errs!==undefined&&c.errs!==null&&c.errs!==''&&fnum(c.errs)!==undefined) n.errs=+c.errs;
n._k=k; out.push(n);
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
ORDER.forEach(function(s){ var m=STATE[s]; if(!m||typeof m!=='object'){ STATE[s]=m={}; } Object.keys(m).forEach(function(k){ var t=fixTopic(m[k]); if(t) m[k]=t; else delete m[k]; }); });
STATE.cfg=fixCfg(STATE.cfg);
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
var p=fixTopic(x[k]), q=fixTopic(y[k]);
if(!p||!q){ if(p||q) o[s][k]=p||q; return; }
var pu=p.upd||0, qu=q.upd||0;
var w=pu>qu?p:qu>pu?q:((p.done&&!q.done)?p:q), l=(w===p)?q:p;
// результат тесту беремо з того запису, де він новіший, незалежно від того, чий запис новіший загалом
if(l.pct!==undefined&&(w.pct===undefined||(+l.pts||0)>(+w.pts||0))){
w=clone(w); w.pct=l.pct; w.pts=l.pts; w.conf=l.conf;
}
o[s][k]=w;
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

// ---- Важливі теми ----
// 'h' — тема входить до груп тем, які разом дають понад половину очікуваних завдань тесту НМТ-2026.
// Методика, джерела й таблиця з розрахунками — у docs/topic-weights.md. Список автоматично не змінюється:
// щоб додати або прибрати позначку, змініть WEIGHT (і підказку в WT_NOTE) за id теми.
var WEIGHT={
'math-0000':'h',
'math-0003':'h',
'math-0006':'h',
'math-0009':'h',
'math-0014':'h',
'math-0017':'h',
'math-0020':'h',
'math-0023':'h',
'math-0027':'h',
'math-0029':'h',
'math-0032':'h',
'math-0036':'h',
'math-0038':'h',
'math-0041':'h',
'math-0008':'h',
'math-0048':'h',
'math-0053':'h',
'math-0056':'h',
'math-0059':'h',
'math-0062':'h',
'math-0066':'h',
'math-0068':'h',
'math-0072':'h',
'math-0128':'h',
'math-0040':'h',
'math-0049':'h',
'math-0086':'h',
'ukr-0000':'h',
'ukr-0001':'h',
'ukr-0020':'h',
'ukr-0007':'h',
'ukr-0017':'h',
'ukr-0018':'h',
'ukr-0025':'h',
'ukr-0028':'h',
'ukr-0030':'h',
'ukr-0031':'h',
'ukr-0032':'h',
'ukr-0053':'h',
'ukr-0059':'h',
'ukr-0064':'h',
'ukr-0066':'h',
'ukr-0074':'h',
'ukr-0076':'h',
'hist-0000':'h',
'hist-0005':'h',
'hist-0008':'h',
'hist-0016':'h',
'hist-0022':'h',
'hist-0024':'h',
'hist-0202':'h',
'hist-0203':'h',
'hist-0029':'h',
'hist-0030':'h',
'hist-0031':'h',
'hist-0032':'h',
'hist-0033':'h',
'eng-0028':'h',
'eng-0035':'h',
'eng-0029':'h'
};
var WT_NOTE={
'math-0000':"≈0,9 завд. на тест — Дійсні числа (з 5 у розділі «Числа і вирази»)",
'math-0003':"≈0,9 завд. на тест — Дійсні числа (з 5 у розділі «Числа і вирази»)",
'math-0006':"≈1,2 завд. на тест — Відношення, пропорції, відсотки, текстові задачі (з 5 у розділі «Числа і вирази»)",
'math-0009':"≈0,9 завд. на тест — Дійсні числа (з 5 у розділі «Числа і вирази»)",
'math-0014':"≈1,6 завд. на тест — Раціональні, ірраціональні, степеневі вирази (з 5 у розділі «Числа і вирази»)",
'math-0017':"≈1,6 завд. на тест — Раціональні, ірраціональні, степеневі вирази (з 5 у розділі «Числа і вирази»)",
'math-0020':"≈1,6 завд. на тест — Раціональні, ірраціональні, степеневі вирази (з 5 у розділі «Числа і вирази»)",
'math-0023':"≈1,6 завд. на тест — Раціональні, ірраціональні, степеневі вирази (з 5 у розділі «Числа і вирази»)",
'math-0027':"≈1,2 завд. на тест — Показникові, логарифмічні, тригонометричні вирази (з 5 у розділі «Числа і вирази»)",
'math-0029':"≈1,2 завд. на тест — Показникові, логарифмічні, тригонометричні вирази (з 5 у розділі «Числа і вирази»)",
'math-0032':"≈1,2 завд. на тест — Показникові, логарифмічні, тригонометричні вирази (з 5 у розділі «Числа і вирази»)",
'math-0036':"≈1,3 завд. на тест — Лінійні, квадратні, раціональні рівняння та системи (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0038':"≈1,3 завд. на тест — Лінійні, квадратні, раціональні рівняння та системи (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0041':"≈1,3 завд. на тест — Лінійні, квадратні, раціональні рівняння та системи (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0008':"≈1,2 завд. на тест — Відношення, пропорції, відсотки, текстові задачі (з 5 у розділі «Числа і вирази»)",
'math-0048':"≈1,3 завд. на тест — Лінійні, квадратні, раціональні рівняння та системи (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0053':"≈1,2 завд. на тест — Нерівності та системи нерівностей (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0056':"≈1,2 завд. на тест — Нерівності та системи нерівностей (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0059':"≈1,2 завд. на тест — Нерівності та системи нерівностей (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0062':"≈1,2 завд. на тест — Нерівності та системи нерівностей (з 4 у розділі «Рівняння, нерівності та системи»)",
'math-0066':"≈1,3 завд. на тест — Функціональна залежність, властивості функцій (з 4 у розділі «Функції»)",
'math-0068':"≈1,3 завд. на тест — Функціональна залежність, властивості функцій (з 4 у розділі «Функції»)",
'math-0072':"≈1,3 завд. на тест — Функціональна залежність, властивості функцій (з 4 у розділі «Функції»)",
'math-0128':"≈1,4 завд. на тест — Ймовірність випадкової події, вибіркові характеристики (з 2 у розділі «Комбінаторика, ймовірність, статистика»)",
'math-0040':"≈1,0 завд. на тест — Паралелограм, ромб, трапеція (з 4 у розділі «Планіметрія»)",
'math-0049':"≈1,0 завд. на тест — Паралелограм, ромб, трапеція (з 4 у розділі «Планіметрія»)",
'math-0086':"≈1,4 завд. на тест — Ймовірність випадкової події, вибіркові характеристики (з 2 у розділі «Комбінаторика, ймовірність, статистика»)",
'ukr-0000':"≈1,0 завд. на тест — Співвідношення звуків і букв (з 1 у розділі «Фонетика. Графіка»)",
'ukr-0001':"≈1,0 завд. на тест — Склад. Наголос (з 1 у розділі «Орфоепія»)",
'ukr-0020':"≈1,0 завд. на тест — Будова слова. Словотвір (з 1 у розділі «Будова слова. Словотвір»)",
'ukr-0007':"≈0,9 завд. на тест — М'який знак, апостроф, йо/ьо (з 5 у розділі «Орфографія»)",
'ukr-0017':"≈2,7 завд. на тест — Лексичне значення, синоніми, антоніми, лексична помилка (з 4 у розділі «Лексикологія. Фразеологія»)",
'ukr-0018':"≈1,3 завд. на тест — Фразеологія (з 4 у розділі «Лексикологія. Фразеологія»)",
'ukr-0025':"≈1,1 завд. на тест — Іменник: відмінювання (з 7 у розділі «Морфологія»)",
'ukr-0028':"≈0,8 завд. на тест — Прикметник (з 7 у розділі «Морфологія»)",
'ukr-0030':"≈0,8 завд. на тест — Прикметник (з 7 у розділі «Морфологія»)",
'ukr-0031':"≈0,9 завд. на тест — Числівник (з 7 у розділі «Морфологія»)",
'ukr-0032':"≈0,9 завд. на тест — Числівник (з 7 у розділі «Морфологія»)",
'ukr-0053':"≈1,3 завд. на тест — Однорідні члени речення (з 10 у розділі «Синтаксис. Пунктуація»)",
'ukr-0059':"≈1,2 завд. на тест — Відокремлені обставини і додатки (з 10 у розділі «Синтаксис. Пунктуація»)",
'ukr-0064':"≈1,2 завд. на тест — Складнопідрядне речення (з 10 у розділі «Синтаксис. Пунктуація»)",
'ukr-0066':"≈1,2 завд. на тест — Складнопідрядне речення (з 10 у розділі «Синтаксис. Пунктуація»)",
'ukr-0074':"≈1,0 завд. на тест — Стилістика, текст (з 1 у розділі «Стилістика»)",
'ukr-0076':"≈1,0 завд. на тест — Стилістика, текст (з 1 у розділі «Стилістика»)",
'hist-0000':"≈0,9 завд. на тест — Стародавня історія (з 5 у розділі «Найдавніші часи – 1 пол. XVI ст.»)",
'hist-0005':"≈1,0 завд. на тест — Руські князівства, Кримське ханство (з 5 у розділі «Найдавніші часи – 1 пол. XVI ст.»)",
'hist-0008':"≈1,0 завд. на тест — Національно-визвольна війна сер. XVII ст. (з 5 у розділі «2 пол. XVI – XVIII ст.»)",
'hist-0016':"≈1,0 завд. на тест — Рос. імперія, 2 пол. XIX ст. (з 5 у розділі «Кінець XVIII – початок XX ст.»)",
'hist-0022':"≈1,5 завд. на тест — Гетьманат і Директорія УНР (з 8 у розділі «1914 – 1945 рр.»)",
'hist-0024':"≈0,9 завд. на тест — Встановлення комуністичного режиму (1920-ті) (з 8 у розділі «1914 – 1945 рр.»)",
'hist-0202':"≈1,3 завд. на тест — Утвердження більшовицького режиму (1929–1939) (з 8 у розділі «1914 – 1945 рр.»)",
'hist-0203':"≈1,3 завд. на тест — Друга світова: Рух Опору, воєнні дії (1941–1945) (з 8 у розділі «1914 – 1945 рр.»)",
'hist-0029':"≈1,3 завд. на тест — Перші повоєнні роки (з 7 у розділі «1945 р. – початок XXI ст.»)",
'hist-0030':"≈1,2 завд. на тест — Десталінізація (з 7 у розділі «1945 р. – початок XXI ст.»)",
'hist-0031':"≈1,6 завд. на тест — Криза радянської системи (з 7 у розділі «1945 р. – початок XXI ст.»)",
'hist-0032':"≈1,2 завд. на тест — Відновлення незалежності (з 7 у розділі «1945 р. – початок XXI ст.»)",
'hist-0033':"≈0,9 завд. на тест — Становлення незалежної держави (з 7 у розділі «1945 р. – початок XXI ст.»)",
'eng-0028':"11 із 32 завдань тесту — відповідності (читання)",
'eng-0035':"5 із 32 завдань тесту — текст із запитаннями",
'eng-0029':"16 із 32 завдань тесту — заповнення пропусків"
};
var WLAB={h:'важлива'};
var WIN=4; // скільки найближчих невиконаних тем розглядається при виборі «наступної» (порядок курсу зберігається)
function wOf(id){ return WEIGHT[id]||''; }
function wRank(id){ return wOf(id)==='h'?0:1; }
function wtTag(s,i){ var id=TID[s][i]; return wOf(id)?' <span class="wtg w-h" role="img" aria-label="'+esc(WLAB.h)+'" title="'+esc(WLAB.h+(WT_NOTE[id]?': '+WT_NOTE[id]:''))+'">★</span>':''; }
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

