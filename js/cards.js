/* ===== Картки (Leitner) =====
    */
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

