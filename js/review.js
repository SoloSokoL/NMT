/* Центр повторення: черга тем, фільтри та короткі сесії. */
UI.review={tab:'topics',subject:'',mode:'due',query:'',limit:20,session:null};
function reviewItems(){
var out=[];
ORDER.forEach(function(s){ TOPICS[s].forEach(function(_,i){
var d=ST(s,i), days=dueIn(d);
if(days!==null) out.push({s:s,i:i,days:days,weak:confOf(d)===1});
}); });
return out.sort(function(a,b){return a.days-b.days||(b.weak-a.weak)||wRank(TID[a.s][a.i])-wRank(TID[b.s][b.i])||ORDER.indexOf(a.s)-ORDER.indexOf(b.s)||a.i-b.i;});
}
function reviewFiltered(){
var f=UI.review, q=f.query.trim().toLocaleLowerCase('uk');
return reviewItems().filter(function(o){
return (!f.subject||f.subject===o.s)&&(!q||TOPICS[o.s][o.i].toLocaleLowerCase('uk').indexOf(q)>-1)&&
(f.mode==='all'||(f.mode==='weak'&&o.weak)||(f.mode==='soon'&&o.days>0&&o.days<=7)||(f.mode==='due'&&o.days<=0));
});
}
function reviewRefresh(){ updBox('reviewBox',reviewHTML); }
function reviewSet(key,value){
if(['tab','subject','mode','query'].indexOf(key)<0) return;
UI.review[key]=value; UI.review.limit=20; reviewRefresh();
}
function reviewSearch(value){
UI.review.query=value; UI.review.limit=20;
var list=document.getElementById('reviewList');
if(list) list.innerHTML=hx(reviewListHTML());
}
function reviewMore(){ UI.review.limit+=20; reviewRefresh(); }
function reviewWhen(days){
return days<0?'Прострочено на '+(-days)+' дн.':days===0?'На сьогодні':'Через '+days+' дн.';
}
function reviewLink(s,i){
var url=s==='math'?MATH_TAG_BASE+(mathTestTag(TOPICS[s][i])||MATH_TAG_FALLBACK):
s==='eng'?linkURL(ENG_TEST[i]):linkURL(LINKS[s][i]);
return url?'<a class="review-test" href="'+esc(url)+'" target="_blank" rel="noopener">Пройти тест ↗</a>':'';
}
function reviewListHTML(){
var all=reviewFiltered(), items=all.slice(0,UI.review.limit);
var ready=all.filter(function(o){return o.days<=0;}).length;
var h='<div class="review-actions"><button type="button" class="ok" '+(ready?'':'disabled ')+'onclick="reviewStart(5)">Сесія: '+Math.min(5,ready)+' тем</button><button type="button" '+(ready?'':'disabled ')+'onclick="reviewStart(10)">До 10 тем</button></div><p class="meta" role="status">Знайдено тем: '+all.length+'</p>';
if(!items.length) return h+'<div class="review-empty"><b>Тут поки немає тем</b><p>Зміни фільтр або познач вивчені теми у списку предметів. Вони автоматично з’являться в розкладі повторення.</p></div>';
items.forEach(function(o){
var d=ST(o.s,o.i), p=pctOf(d);
h+='<article class="review-item" style="--c:'+META[o.s].color+'"><div><span class="review-subject">'+ICON[o.s]+' '+esc(META[o.s].name)+'</span><h4><a href="#r-'+o.s+'-'+o.i+'">'+esc(TOPICS[o.s][o.i])+'</a></h4><p class="meta"><span class="'+(o.days<0?'review-late':'')+'">'+reviewWhen(o.days)+'</span>'+(o.weak?' · Слабка тема':'')+(p!==null?' · Тест: '+p+'%':'')+'</p></div><div class="review-actions">'+reviewLink(o.s,o.i)+(o.days<=0?'<button type="button" onclick="reviewOne(\''+o.s+'\','+o.i+')">Повторити</button>':'')+'</div></article>';
});
if(all.length>items.length) h+='<button type="button" onclick="reviewMore()">Показати ще ('+(all.length-items.length)+')</button>';
return h;
}
function reviewStart(limit){
var items=reviewFiltered().filter(function(o){return o.days<=0;}).slice(0,limit);
if(!items.length) return;
UI.review.session={items:items,pos:0,remembered:0,forgot:0,revealed:false};
reviewRefresh(); reviewFocus();
}
function reviewOne(s,i){
if(!ST(s,i)||!ST(s,i).done) return;
UI.review.session={items:[{s:s,i:i}],pos:0,remembered:0,forgot:0,revealed:false};
reviewRefresh(); reviewFocus();
}
function reviewFocus(){
setTimeout(function(){ var e=document.getElementById('reviewNext'); if(e) e.focus(); },30);
}
function reviewReveal(){ if(!UI.review.session) return; UI.review.session.revealed=true; reviewRefresh(); reviewFocus(); }
function reviewSave(s,i,ok){
var cur=ST(s,i); if(!cur||!cur.done) return false;
var n=Date.now(), auto=pctOf(cur)!==null;
if(ok){cur.rv=Math.min(REV.length-1,(cur.rv||0)+1);if(!auto&&cur.conf===1)cur.conf=2;}
else{cur.rv=0;if(!auto)cur.conf=1;}
cur.last=n;cur.upd=n;bump();dstat('rv');persist();return true;
}
// Зберігає сумісність зі старими кнопками «Закріпив» та денним планом.
function reviewTopic(s,i,ok){ if(reviewSave(s,i,ok)) render(); }
function reviewAnswer(ok){
var ss=UI.review.session;
if(!ss||!ss.revealed||ss.pos>=ss.items.length) return;
var o=ss.items[ss.pos];
if(reviewSave(o.s,o.i,!!ok)){if(ok)ss.remembered++;else ss.forgot++;}
ss.pos++;ss.revealed=false;
render(); reviewFocus();
}
function reviewClose(){ UI.review.session=null; render(); }
function reviewSessionHTML(){
var ss=UI.review.session, total=ss.items.length;
if(ss.pos>=total) return '<div class="review-session" role="status"><span class="review-eyebrow">СЕСІЮ ЗАВЕРШЕНО</span><h3>Готово! Повторено: '+(ss.remembered+ss.forgot)+'</h3><p>Пам’ятаю: '+ss.remembered+' · Треба закріпити: '+ss.forgot+'</p><p class="meta">Результати збережено. Забуті теми повернуться до початкового інтервалу повторення.</p><button type="button" class="ok" id="reviewNext" onclick="reviewClose()">До черги повторення</button></div>';
var o=ss.items[ss.pos], d=ST(o.s,o.i)||{};
return '<div class="review-session"><div class="review-session-top"><span class="review-eyebrow">ТЕМА '+(ss.pos+1)+' З '+total+'</span><button type="button" onclick="reviewClose()">Завершити сесію</button></div><progress value="'+ss.pos+'" max="'+total+'" aria-label="Прогрес сесії"></progress><p class="review-subject">'+ICON[o.s]+' '+esc(META[o.s].name)+'</p><h3>'+esc(TOPICS[o.s][o.i])+'</h3><p>Згадай основне правило, формулу чи подію. Поясни своїми словами та наведи приклад.</p>'+
(ss.revealed?'<div class="review-recall"><b>Перевір себе</b><p class="review-note">'+(d.note?esc(d.note):'Власних нотаток ще немає. Відкрий матеріали теми або пройди тест, щоб перевірити відповідь.')+'</p><a href="#r-'+o.s+'-'+o.i+'">Матеріали теми</a> '+reviewLink(o.s,o.i)+'</div><div class="review-actions"><button type="button" class="ok" id="reviewNext" onclick="reviewAnswer(true)">Пам’ятаю</button><button type="button" onclick="reviewAnswer(false)">Треба повторити</button></div>':'<button type="button" class="ok" id="reviewNext" onclick="reviewReveal()">Перевірити себе</button>')+'</div>';
}
function reviewHTML(){
var f=UI.review, all=reviewItems(), due=all.filter(function(o){return o.days<=0;}), late=due.filter(function(o){return o.days<0;});
var h='<section class="card review-center" id="reviewBox" aria-label="Центр повторення"><div class="review-heading"><div><span class="review-eyebrow">ЗАКРІПЛЮЙ ВИВЧЕНЕ</span><h3>🔁 Повторення</h3></div><span class="pill">Сьогодні повторено: '+(((STATE.dst||{})[isoDay(Date.now())]||{}).rv||0)+'</span></div>';
h+='<div class="review-tabs" role="tablist" aria-label="Тип повторення"><button type="button" role="tab" id="reviewTopicsTab" aria-controls="reviewTopics" aria-selected="'+(f.tab==='topics')+'" onclick="reviewSet(\'tab\',\'topics\')">Теми · '+due.length+'</button><button type="button" role="tab" id="reviewCardsTab" aria-controls="reviewCards" aria-selected="'+(f.tab==='cards')+'" onclick="reviewSet(\'tab\',\'cards\')">Картки · '+cardsDueCount('')+'</button></div>';
if(f.tab==='cards') return h+'<div id="reviewCards" role="tabpanel" aria-labelledby="reviewCardsTab">'+cardsHTML()+'</div></section>';
h+='<div id="reviewTopics" role="tabpanel" aria-labelledby="reviewTopicsTab">';
if(f.session) return h+reviewSessionHTML()+'</div></section>';
h+='<div class="review-metrics"><div><b>'+due.length+'</b><span>на повторення</span></div><div><b>'+late.length+'</b><span>прострочено</span></div><div><b>'+all.filter(function(o){return o.days>0&&o.days<=7;}).length+'</b><span>у наступні 7 днів</span></div></div>';
h+='<div class="review-filters"><label>Предмет<select onchange="reviewSet(\'subject\',this.value)"><option value="">Усі предмети</option>'+ORDER.map(function(s){return '<option value="'+s+'"'+(f.subject===s?' selected':'')+'>'+esc(META[s].name)+'</option>';}).join('')+'</select></label><label>Показати<select onchange="reviewSet(\'mode\',this.value)">'+[['due','На сьогодні'],['weak','Слабкі теми'],['soon','Наступні 7 днів'],['all','Усі вивчені']].map(function(o){return '<option value="'+o[0]+'"'+(f.mode===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label><label>Пошук<input type="search" value="'+esc(f.query)+'" placeholder="Назва теми…" oninput="reviewSearch(this.value)"></label></div>';
h+='<p class="meta">Сесія бере теми на повторення з поточного фільтра. Спочатку прострочені; за однакової дати — слабкі й важливі. Прогрес зберігається після кожної відповіді.</p><div id="reviewList">'+reviewListHTML()+'</div></div></section>';
return h;
}
