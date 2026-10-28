/* ===== Застосунок: рендер сторінки, збереження, запуск =====
   Підключається останнім; наприкінці викликається init(). */
var STATE = {};
var artifactCap = null;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function todayStr(){ var d=new Date(); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0'); }
function render(){
var overallDone=0, overallTotal=0, subjHtml='';
ORDER.forEach(function(subj){
var m=META[subj], list=TOPICS[subj], st=STATE[subj]||{};
var done=0;
list.forEach(function(_,i){ var e=st[TID[subj][i]]; if(e&&e.done) done++; });
overallDone+=done; overallTotal+=list.length;
var pct=Math.round(done/list.length*100);
subjHtml+='<div class="subject" id="sub-'+subj+'" data-s="'+subj+'" style="--c:'+m.color+'">';
var SUBJ_ICON={math:'📐',ukr:'🔤',hist:'🏛️',eng:'💬'};
subjHtml+='<h2>'+SUBJ_ICON[subj]+' '+m.name+'</h2>';
subjHtml+='<p class="meta">'+done+'/'+list.length+' · ≈'+m.time+'</p>';
subjHtml+='<div class="bar"><i style="width:'+pct+'%"></i></div>';
var mocks=STATE.mockLog[subj]||[];
subjHtml+='<div class="mock" id="mock-'+subj+'"><h3>Пробні тести</h3><form onsubmit="return addMock(event,\''+subj+'\')"><input type="number" min="0" max="200" placeholder="бал" required id="mi-'+subj+'"><button type="submit">Додати</button></form>';
if(mocks.length){
subjHtml+='<div class="hist">';
mocks.forEach(function(mk,mi){ subjHtml+='<span class="chip">'+esc(mk.date)+': '+esc(mk.score)+(mk.errs!==undefined&&mk.errs!==null?' · ❌'+esc(mk.errs):'')+'<button type="button" class="chip-x" title="Видалити" onclick="removeMock(\''+subj+'\','+mi+')">✕</button></span>'; });
subjHtml+='</div>';
} else {
subjHtml+='<p class="meta" style="padding-left:0">Ще немає записів</p>';
}
subjHtml+=trendHTML(mocks,m.color)+statsHTML(subj,mocks);
subjHtml+='</div>';
if(subj==='math'){
subjHtml+='<p class="meta" style="padding-left:0">🔢 Повні варіанти НМТ: <a href="'+MATH_TAG_BASE+'nmt.html" target="_blank" rel="noopener">тренувальні 2027</a> · <a href="'+MATH_TAG_BASE+'846/" target="_blank" rel="noopener">НМТ 2026, 1 сесія</a> · <a href="'+MATH_TAG_BASE+'847/" target="_blank" rel="noopener">2 сесія</a></p>';
}
if(subj==='eng'){
subjHtml+='<p class="meta" style="padding-left:0">Формат НМТ-2026: 32 завдання, 32 бали, 60 хв — 11 на відповідність (читання), 5 з вибором відповіді (читання), 16 на заповнення пропусків (граматика й лексика).</p>';
subjHtml+='<p class="meta" style="padding-left:0"><a href="'+FULL.eT1+'" target="_blank" rel="noopener">🔢 Пробний тест №1 НМТ з англійської (osvita.ua)</a> · <a href="'+FULL.eT2+'" target="_blank" rel="noopener">Тест №2</a></p>';
}
var seq=0;
BLOCKS[subj].forEach(function(block){
subjHtml+='<div class="block-h">'+esc(block.t)+'</div>';
block.idx.forEach(function(i){
seq++;
var title=list[i];
var d=st[TID[subj][i]]||{};
if(subj==='math'&&FINAL_ROWS[i]){
var chips=finalLinks(i).map(function(l){
return '<a class="fin-chip" href="'+l.url+'" target="_blank" rel="noopener">🔢 '+esc(l.label)+'</a>';
}).join('');
subjHtml+='<div class="row row-final'+(isDue(d)?' due':'')+'" id="r-'+subj+'-'+i+'" data-t="'+esc(title.toLowerCase())+'" data-d="'+(d.done?1:0)+'" data-w="'+wOf(TID[subj][i])+'">'
+'<div class="row-main">'
+'<input type="checkbox" aria-label="Тема виконана" '+(d.done?'checked':'')+' onchange="toggle(\''+subj+'\','+i+')">'+confBtn(subj,i,d)
+'<span class="t'+(d.done?' done':'')+'"><span class="num">'+seq+'.</span><span class="tt">🏁 '+esc(title)+'</span>'+wtTag(subj,i)+'</span>'
+'</div>'
+'<div class="fin-chips">'+chips+'</div>'
+'<div class="row-sub">'
+'<span class="date">'+esc(d.date||'')+'</span>'
+'<input class="n" placeholder="бал/нотатка" aria-label="Нотатка до теми" value="'+esc(d.note||'')+'" onchange="noteChange(\''+subj+'\','+i+',this.value)">'
+pctInput(subj,i,d)
+'</div>'
+'</div>';
return;
}
var linksHtml='';
if(subj==='eng'){
var engMock=/^Пробний НМТ/.test(title);
var artUrl=linkURL(ENG_THEORY[i])||webSearch(title,"англійська мова");
var engVid=ytSearch(title,"англійська мова");
var engTest=linkURL(ENG_TEST[i]);
linksHtml+=engMock?'<span class="lnk lnk-empty"></span><span class="lnk lnk-empty"></span>'
:'<a class="lnk" href="'+artUrl+'" target="_blank" rel="noopener" title="Теорія">📖</a><a class="lnk" href="'+engVid+'" target="_blank" rel="noopener" title="Відеоурок (пошук на YouTube)">▶️</a>';
linksHtml+=engTest?'<a class="lnk" href="'+engTest+'" target="_blank" rel="noopener" title="Тестування-пробник НМТ з англійської">🔢</a>':'<span class="lnk lnk-empty"></span>';
} else if(subj==='math'){
var existingUrl=linkURL(LINKS[subj][i]);
var articleUrl=(LINKS[subj][i]==='mPR')?null:existingUrl;
var videoUrl=ytSearch(title,"математика");
var testIcon='🔢';
var testUrl=MATH_TAG_BASE+(mathTestTag(title)||MATH_TAG_FALLBACK);
var testTitle='Тестування-пробник НМТ (osvita.ua)';
var mode=mathMode(title);
var artSecondary=(mode==='video');
var vidSecondary=(mode==='text');
var artHtml=articleUrl?'<a class="lnk'+(artSecondary?' lnk-secondary':'')+'" href="'+articleUrl+'" target="_blank" rel="noopener" title="Теорія (стаття)'+(artSecondary?' — додатково, спочатку відео':'')+'">📖</a>':'<span class="lnk lnk-empty"></span>';
var vidHtml='<a class="lnk'+(vidSecondary?' lnk-secondary':'')+'" href="'+videoUrl+'" target="_blank" rel="noopener" title="Відеоурок'+(vidSecondary?' — додатково, спочатку стаття':'')+'">▶️</a>';
linksHtml+=(mode==='video'?(vidHtml+artHtml):(artHtml+vidHtml))
+(testUrl?'<a class="lnk" href="'+testUrl+'" target="_blank" rel="noopener" title="'+esc(testTitle)+'">'+testIcon+'</a>':'<span class="lnk lnk-empty"></span>');
} else {
var existingUrl=linkURL(LINKS[subj][i]);
var testUrl=existingUrl;
var subjCtx=(subj==='ukr')?"українська мова":"історія України";
var videoUrl=ytSearch(title,subjCtx);
var articleUrl=webSearch(title,subjCtx);
var mode=(subj==='ukr')?ukrMode(title):histMode(title);
var artSecondary=(mode==='video');
var vidSecondary=(mode==='text');
var artHtml='<a class="lnk'+(artSecondary?' lnk-secondary':'')+'" href="'+articleUrl+'" target="_blank" rel="noopener" title="Теорія (пошук статті)'+(artSecondary?' — додатково, спочатку відео':'')+'">📖</a>';
var vidHtml='<a class="lnk'+(vidSecondary?' lnk-secondary':'')+'" href="'+videoUrl+'" target="_blank" rel="noopener" title="Відеоурок'+(vidSecondary?' — додатково, спочатку стаття':'')+'">▶️</a>';
linksHtml+=(mode==='video'?(vidHtml+artHtml):(artHtml+vidHtml))
+(testUrl?'<a class="lnk" href="'+testUrl+'" target="_blank" rel="noopener" title="Тестування-пробник НМТ">🔢</a>':'<span class="lnk lnk-empty"></span>');
}
subjHtml+='<div class="row'+(isDue(d)?' due':'')+'" id="r-'+subj+'-'+i+'" data-t="'+esc(title.toLowerCase())+'" data-d="'+(d.done?1:0)+'" data-w="'+wOf(TID[subj][i])+'">'
+'<div class="row-main">'
+'<input type="checkbox" aria-label="Тема виконана" '+(d.done?'checked':'')+' onchange="toggle(\''+subj+'\','+i+')">'+confBtn(subj,i,d)
+'<span class="t'+(d.done?' done':'')+'"><span class="num">'+seq+'.</span><span class="tt">'+esc(title)+'</span>'+wtTag(subj,i)+'</span>'
+linksHtml
+'</div>'
+'<div class="row-sub">'
+'<span class="date">'+esc(d.date||'')+'</span>'
+'<input class="n" placeholder="бал/нотатка" aria-label="Нотатка до теми" value="'+esc(d.note||'')+'" onchange="noteChange(\''+subj+'\','+i+',this.value)">'
+pctInput(subj,i,d)+aiTopicBtn(subj,i)
+'</div>'
+'</div>';
});
});
subjHtml+='</div>';
});
var wd0=(new Date().getDay()+6)%7;
if(ORDER.indexOf(UI.sub)<0) UI.sub=((SCHED[wd0]||[])[0])||ORDER[0];
subjHtml='<div class="subjects-grid" data-active="'+UI.sub+'">'+subjHtml+'</div>';
var wkH=weekHTML();
var overallPct=Math.round(overallDone/overallTotal*100);
var html='<div class="wrap">'
+'<header class="top"><div class="top-t"><h1>Тренажер підготовки до НМТ</h1><p class="intro">Онови позначки після кожного заняття.</p></div>'+syncBarHTML()+'</header>'
+'<section class="sec sec-now">'+nowHTML()+rhythmHTML()+(UI.wkAuto?wkH:'')+'</section>'
+'<section class="sec"><h2 class="sec-h">План і повторення</h2>'+dashHTML()+'</section>'
+'<section class="sec"><h2 class="sec-h">Інструменти</h2><div class="toolgrid">'+weakHTML()+(UI.wkAuto?'':wkH)+aiBoxHTML()+dynHTML()+'</div></section>'
+'<section class="sec sec-subj"><h2 class="sec-h">Предмети</h2>'
+'<div class="overall"><p class="meta">Загальний прогрес: '+overallDone+'/'+overallTotal+' ('+overallPct+'%)</p><div class="bar"><i style="width:'+overallPct+'%"></i></div>'+navHTML()+'</div>'
+toolbarHTML()
+subjHtml+'</section>'
+'<footer class="foot"><details class="legend-d"><summary>Умовні позначки</summary><ul class="legend">'
+'<li><span class="ic">📖</span> стаття з теорією</li>'
+'<li><span class="ic">▶️</span> відеоурок (пряме посилання або пошук на YouTube за назвою теми)</li>'
+'<li><span class="ic">🔢</span> тестування-пробник НМТ (математика — добірка osvita.ua за темою; укр. мова й історія — osvita.ua; англійська — добірка тестів і повні варіанти)</li>'
+'<li>з математики, укр. мови та історії показані й стаття, й відео: тьмяна іконка — другорядний варіант (для тем з чітким алгоритмом/правилом — спочатку стаття; для наочних або щільних тем — спочатку відео; для найскладніших тем обидва однаково яскраві)</li>'
+'<li><span class="ic">🏁</span> підсумковий тест блоку (математика): набір тематичних добірок по всіх темах блоку — пройди їх по черзі для закріплення</li>'
+'<li>🟢🟡🔴 крапка — впевненість у темі (клік: 🟢 → 🟡 → 🔴 → без оцінки → знову 🟢). Поле «тест %» ставить її саме: ≥80 → 🟢, 50–79 → 🟡, &lt;50 → 🔴; слабкі теми повторюються вдвічі частіше й потрапляють у «Слабкі теми», а теми з результатом ≥80% — вдвічі рідше</li></ul></details></footer>'
+'</div>';
document.getElementById('app').innerHTML=hx(html);
afterRender();
}

function noteChange(subj,i,val){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{};
cur.note=val; cur.upd=Date.now();
STATE[subj][TID[subj][i]]=cur;
persist();
}
function countChange(subj,i,val){
STATE[subj]=STATE[subj]||{};
var cur=STATE[subj][TID[subj][i]]||{};
cur.count=val; cur.upd=Date.now();
STATE[subj][TID[subj][i]]=cur;
persist();
}

function addMock(ev,subj){
ev.preventDefault();
var inp=document.getElementById('mi-'+subj);
var val=parseFloat(inp.value);
if(isNaN(val)) return false;
logMock(subj,val);
render();
persist();
return false;
}

function removeMock(subj,idx){
var a=STATE.mockLog&&STATE.mockLog[subj]; if(!a||!a[idx]) return;
var e=a.splice(idx,1)[0];
STATE.del=STATE.del||{}; if(e&&e.id) STATE.del[e.id]=Date.now();
STATE.lupd=Date.now();
render();
persist();
}

function persist(){
try{
localStorage.setItem('nmt-tracker-state', JSON.stringify(STATE));
}catch(e){}
cloudSave();
}

function loadSaved(){
try{
var raw=localStorage.getItem('nmt-tracker-state');
return raw?JSON.parse(raw):null;
}catch(e){ return null; }
}

function init(state){
backupLegacy();
try{ localStorage.removeItem('nmt-timer'); }catch(e){}
STATE=migrate(loadSaved()||state||{});
norm();
initFirebase();
render();
var code=getSyncCode();
if(db&&code){
cloudLoad(code,function(remote){
if(remote){
STATE=mergeState(STATE,remote); norm();
render();
}
});
}
}
init({"math":{},"ukr":{},"hist":{},"eng":{},"mockLog":{"math":[],"ukr":[],"hist":[],"eng":[]}});
