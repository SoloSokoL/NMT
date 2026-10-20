/* ===== ШІ-помічник (через проксі на Cloudflare Workers) =====
   Ключ Anthropic лежить ЛИШЕ в секретах воркера. У браузері зберігається тільки APP_TOKEN (localStorage, не синхронізується в хмару).
   Результати ШІ завжди виводяться через esc() — як текст, ніколи як HTML. */
var AI_URL='https://ТВІЙ-ВОРКЕР.workers.dev'; // ← встав адресу свого воркера (з Cloudflare → Workers)
var AI_SYS='Ти — репетитор з підготовки до НМТ в Україні. Відповідай українською, стисло й по суті, без markdown-розмітки. Якщо не впевнений у факті, даті чи правилі — прямо скажи про це, нічого не вигадуй.';

function aiToken(){ try{ return localStorage.getItem('nmt-ai-token')||''; }catch(e){ return ''; } }
function aiReady(){ return AI_URL.indexOf(https://icy-mountain-e330.lev-bukay.workers.dev/)<0; }

// cb(текст, помилка). Рівно один із двох заповнений.
function aiAsk(prompt,system,cb,max){
if(!aiReady()){ cb(null,'У js/ai.js не вказано адресу воркера (AI_URL).'); return; }
if(!aiToken()){ cb(null,'Спершу впиши токен у блоці «🤖 ШІ».'); return; }
if(typeof navigator!=='undefined'&&navigator.onLine===false){ cb(null,'Немає інтернету.'); return; }
var ctl=window.AbortController?new AbortController():null, tm=setTimeout(function(){ if(ctl) ctl.abort(); },40000);
fetch(AI_URL,{method:'POST',signal:ctl?ctl.signal:undefined,
headers:{'content-type':'application/json','x-app-token':aiToken()},
body:JSON.stringify({prompt:prompt,system:system||AI_SYS,max:max||600})})
.then(function(r){
if(r.status===403) throw new Error('Токен не підійшов (403). Перевір APP_TOKEN.');
if(r.status===429) throw new Error('Забагато запитів — спробуй за хвилину.');
if(!r.ok) throw new Error('Помилка воркера: '+r.status);
return r.json();
})
.then(function(d){ clearTimeout(tm); var t=String((d&&d.text)||'').trim(); if(!t) cb(null,'ШІ повернув порожню відповідь.'); else cb(t,null); })
.catch(function(e){ clearTimeout(tm); cb(null,e&&e.name==='AbortError'?'Час очікування вичерпано.':(e&&e.message&&e.message.indexOf('Failed to fetch')<0?e.message:'Немає зв\'язку з воркером (перевір адресу й CSP у консолі).')); });
}

// Стан запитів: UI.ai[ключ] = {st:'busy'|'ok'|'err', text}. Ключ починається з e (помилка), w (тиждень) або c (картки).
function aiBox(key){ var c=key.charAt(0); return c==='t'?['aiBox',aiBoxHTML]:c==='e'?['errBox',errsHTML]:c==='w'?['weekBox',weekHTML]:['cardBox',cardsHTML]; }
function aiRefresh(key){ var b=aiBox(key); updBox(b[0],b[1]); }
function aiRun(key,prompt,max){
UI.ai=UI.ai||{};
if(UI.ai[key]&&UI.ai[key].st==='busy') return;
UI.ai[key]={st:'busy',text:''}; aiRefresh(key);
aiAsk(prompt,AI_SYS,function(text,err){
UI.ai[key]=err?{st:'err',text:err}:{st:'ok',text:text};
if(key.charAt(0)==='c'&&!err) UI.aiCards=aiCleanCards(text);
aiRefresh(key);
},max);
}
function aiClose(key){ if(UI.ai) delete UI.ai[key]; aiRefresh(key); }
function aiStatus(key,extra){
var a=UI.ai&&UI.ai[key]; if(!a) return '';
var close=' <button type="button" aria-label="Закрити" onclick="aiClose(\''+key+'\')">✕</button>';
if(a.st==='busy') return '<div class="en" role="status">🤖 Думаю…</div>';
if(a.st==='err') return '<div class="en" role="alert">⚠️ '+esc(a.text)+close+'</div>';
return '<div class="en" style="white-space:pre-wrap">🤖 '+esc(a.text)+'</div><div class="plan-row">'+(extra||'')+'<button type="button" onclick="aiClose(\''+key+'\')">✕ Закрити</button></div>';
}

// ---- Журнал помилок: пояснення ----
function aiErrBtn(e){
var busy=UI.ai&&UI.ai['e'+e.id]&&UI.ai['e'+e.id].st==='busy';
return '<button type="button"'+(busy?' disabled':'')+' onclick="aiExplainErr(\''+e.id+'\')" title="Пояснити помилку за допомогою ШІ">🤖</button>';
}
function aiErrBlock(e){
var k='e'+e.id, a=UI.ai&&UI.ai[k];
return a?aiStatus(k,a.st==='ok'?'<button type="button" class="ok" onclick="aiSaveHint(\''+e.id+'\')">💾 У «Як правильно»</button>':''):'';
}
function aiExplainErr(id){
var k=findErr(id); if(k<0) return; var e=STATE.errs[k], tp=errTopic(e);
var p='Учень готується до НМТ і помилився в завданні.\nПредмет: '+META[e.subj].name+(tp?'\nТема: '+tp:'')+'\nЗавдання (коротко): '+e.t+'\nПричина помилки за словами учня: '+ERR_WHY[e.w|0]+(e.h?'\nВласна нотатка учня: '+e.h:'')
+'\n\nПоясни в 2–4 реченнях (до 350 символів), яке правило чи прийом тут потрібні і як уникнути такої помилки. Якщо умови бракує для точної відповіді — скажи, що саме уточнити, й не вигадуй умову.';
aiRun('e'+id,p,500);
}
function aiSaveHint(id){
var k=findErr(id), a=UI.ai&&UI.ai['e'+id]; if(k<0||!a||a.st!=='ok') return;
var e=STATE.errs[k]; e.h=a.text.replace(/\s+/g,' ').slice(0,400); e.upd=Date.now(); bump();
delete UI.ai['e'+id]; render(); persist();
}

// ---- Картки: генерація ----
function aiCleanCards(t){
return String(t||'').split(/\r?\n/).map(function(l){ return l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim(); }).filter(function(l){ return l.indexOf(';')>0&&l.indexOf(';')<l.length-1; }).join('\n');
}
function aiGenCards(){
var dk=curDeck(); if(!dk) return;
var topic=(UI.aiT||'').trim(); if(!topic){ var el=document.getElementById('ai-ct'); if(el) el.focus(); return; }
var n=Math.max(1,Math.min(15,parseInt(UI.aiN,10)||10)), d=STATE.decks[dk], sj=d&&d.subj&&META[d.subj]?META[d.subj].name:'(не вказано)';
var p='Склади '+n+' навчальних карток для підготовки до НМТ (Україна). Предмет: '+sj+'. Тема: '+topic+'.\nФормат: кожна картка в окремому рядку — питання;відповідь\nПравила: без нумерації, заголовків і пояснень; символ «;» лише як роздільник (не всередині тексту); питання коротке, відповідь до 150 символів; не включай факти, дати й правила, у яких не впевнений.';
UI.aiCards=''; aiRun('c',p,1500);
}
function aiCardsImport(){
var t=document.getElementById('ai-cr'), v=t?t.value:(UI.aiCards||'');
if(!v.trim()) return;
delete UI.ai.c; UI.aiCards=''; cardsImport(v);
}
function aiCardsHTML(){
var a=UI.ai&&UI.ai.c, open=a||UI.aiCards||UI.aiT;
var h='<details class="subd"'+(open?' open':'')+'><summary>🤖 Згенерувати картки (ШІ)</summary>'
+'<p class="meta">ШІ може помилятися в наголосах, датах і формулюваннях правил — переглянь і виправ текст перед імпортом.</p>'
+'<div class="plan-row"><input id="ai-ct" type="text" maxlength="120" placeholder="тема, напр.: Присудок і підмет" aria-label="Тема карток" value="'+esc(UI.aiT||'')+'" oninput="UI.aiT=this.value">'
+'<select id="ai-cn" aria-label="Кількість карток" onchange="UI.aiN=this.value">'+[5,10,15].map(function(x){ return '<option value="'+x+'"'+((parseInt(UI.aiN,10)||10)===x?' selected':'')+'>'+x+'</option>'; }).join('')+'</select>'
+'<button type="button" class="ok"'+(a&&a.st==='busy'?' disabled':'')+' onclick="aiGenCards()">Згенерувати</button></div>';
if(a&&a.st!=='ok') h+=aiStatus('c');
if(a&&a.st==='ok'){
h+='<label class="fl">Результат (можна редагувати; формат питання;відповідь)<textarea id="ai-cr" rows="8" oninput="UI.aiCards=this.value">'+esc(UI.aiCards||'')+'</textarea></label>'
+(UI.aiCards?'':'<p class="meta">ШІ відповів не у форматі «питання;відповідь» — спробуй ще раз.</p>')
+'<div class="plan-row"><button type="button" class="ok" onclick="aiCardsImport()">📥 Імпортувати в колоду</button><button type="button" onclick="aiClose(\'c\')">✕ Скасувати</button></div>';
}
return h+'</details>';
}

// ---- Підсумок тижня: порада ----
function aiWeekHTML(d,lag){
var k='w'+d.off, a=UI.ai&&UI.ai[k];
return '<div class="plan-row"><button type="button"'+(a&&a.st==='busy'?' disabled':'')+' onclick="aiWeek('+d.off+')">🤖 Порада від ШІ</button></div>'+aiStatus(k);
}
function aiWeek(off){
var d=weekData(off), lag=lagging(d), avg=d.pct.length?Math.round(d.pct.reduce(function(a,b){ return a+b; },0)/d.pct.length):null;
var mk=ORDER.map(function(s){ var m=d.mock[s]; return META[s].name+': '+(m.n?m.last+' ('+m.n+' спроб)':'не було'); }).join('; ');
var p='Дані учня за тиждень підготовки до НМТ:\n— закрито тем: '+d.tot+'\n— середній «тест %»: '+(avg===null?'немає даних':avg+'%')+'\n— повторень тем: '+d.rv+', карток: '+d.cr+'\n— помилок виправлено: '+d.fx+', нових: '+d.add+'\n— активних днів: '+d.days+'/7, серія: '+streak()+'\n— пробники: '+mk+'\n— відставання: '+(lag?META[lag.s].name+' (потрібно ≈'+lag.need.toFixed(1)+' тем/тиждень)':'немає')
+'\n\nДай 3–4 речення конкретної поради на наступний тиждень. Спирайся лише на ці дані, нічого не вигадуй.';
aiRun('w'+off,p,500);
}

// ---- Налаштування токена ----
function aiBoxHTML(){
var has=!!aiToken(), a=UI.ai&&UI.ai.t;
var h='<details class="card blk box" id="aiBox"'+(isOpen('aiBox',false)?' open':'')+'><summary>🤖 ШІ ('+(has?'токен є':'не налаштовано')+')</summary>';
h+='<p class="meta">Запити йдуть через твій Cloudflare Worker; ключ Anthropic у браузері не зберігається. Токен лишається лише на цьому пристрої (у хмару не синхронізується).</p>';
if(!aiReady()) h+='<p class="meta warn">⚠️ У js/ai.js ще не вказано адресу воркера (AI_URL).</p>';
h+='<div class="plan-row"><input id="ai-tok" type="password" autocomplete="off" spellcheck="false" placeholder="'+(has?'новий токен (замінить поточний)':'APP_TOKEN з воркера')+'" aria-label="Токен ШІ">'
+'<button type="button" class="ok" onclick="aiSaveToken()">Зберегти</button>'
+(has?'<button type="button" onclick="aiClearToken()">Видалити</button><button type="button" onclick="aiTest()">Перевірити</button>':'')+'</div>';
if(a) h+=aiStatus('t');
return h+'</details>';
}
function aiBoxRefresh(){ updBox('aiBox',aiBoxHTML); }
function aiSaveToken(){
var el=document.getElementById('ai-tok'), v=el?(el.value||'').trim():''; if(!v) return;
try{ localStorage.setItem('nmt-ai-token',v); }catch(e){}
aiBoxRefresh();
}
function aiClearToken(){ try{ localStorage.removeItem('nmt-ai-token'); }catch(e){} if(UI.ai) delete UI.ai.t; aiBoxRefresh(); }
function aiTest(){
UI.ai=UI.ai||{}; UI.ai.t={st:'busy',text:''}; aiBoxRefresh();
aiAsk('Відповідай одним словом: працює.',AI_SYS,function(t,err){ UI.ai.t=err?{st:'err',text:err}:{st:'ok',text:'Зв\'язок є: '+t}; aiBoxRefresh(); },50);
}
