/* ===== Журнал помилок =====
   Дані, фільтри та інтерфейс журналу помилок. */
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
if(e.h) h+='<div class="en">✅ Як правильно: '+esc(e.h)+'</div>'; h+=aiErrBlock(e);
h+='</div><div class="ea">';
if(e.fixed) h+='<button type="button" onclick="errBack(\''+e.id+'\')" title="Повернути в повторення">↺</button>';
else h+='<button type="button" class="ok" onclick="errOk(\''+e.id+'\')" title="Розв\'язав правильно">✓ Розв\'язав</button><button type="button" onclick="errBad(\''+e.id+'\')" title="Знову помилився — інтервали спочатку">✗ Знову</button>';
if(!e.fixed) h+=aiErrBtn(e);
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

