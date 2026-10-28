/* ===== ШІ-репетитор (Google Gemini через проксі на Cloudflare Workers) =====
   Ключ моделі лежить ЛИШЕ в налаштуваннях воркера. APP_TOKEN тепер зберігається в конфігу прогресу (STATE.cfg.ai)
   і синхронізується через хмару разом з рештою даних — вводити його на кожному пристрої не треба.
   Історія чату лишається лише на цьому пристрої (localStorage). Результати ШІ завжди виводяться через esc() — як текст, ніколи як HTML. */
var AI_URL='https://icy-mountain-e330.lev-bukay.workers.dev'; // адреса воркера (Cloudflare → Workers), без слеша в кінці
var AI_SYS='Ти — репетитор з підготовки до НМТ в Україні. Відповідай українською, по суті, без markdown-розмітки. Якщо не впевнений у факті, даті чи правилі — прямо скажи про це, нічого не вигадуй.';
var AI_MAX_MSG=30;
var AI_TOKEN_RE=/^[\x21-\x7e]{6,300}$/;

function lsGet(k){ try{ return localStorage.getItem(k)||''; }catch(e){ return ''; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

// ---- Токен: зберігається в STATE.cfg.ai (синхронізується в хмару) ----
function aiMigrate(){
if(UI.aiMig) return; UI.aiMig=true;
var ls=lsGet('nmt-ai-token'); if(!ls) return;
if(AI_TOKEN_RE.test(ls)){
if(!cfgGet('ai')){ cfgSet('ai',ls); setTimeout(persist,0); }
try{ localStorage.removeItem('nmt-ai-token'); }catch(e){}
}
}
function aiToken(){ var t=cfgGet('ai'); return (typeof t==='string'&&t)?t:lsGet('nmt-ai-token'); }
function aiReady(){ return /^https:\/\/[^\s]+\.workers\.dev$/.test(AI_URL); }

// cb(текст, помилка). Рівно один із двох заповнений. msgs — історія діалогу (новий воркер); prompt лишається для старого воркера.
// box — об'єкт, куди кладеться AbortController (щоб запит можна було скасувати).
function aiAsk(prompt,system,cb,max,msgs,box,opt){
if(!aiReady()){ cb(null,'У js/ai.js не вказано адресу воркера (AI_URL).'); return; }
if(!aiToken()){ cb(null,'Спершу впиши токен у «⚙️ Налаштування ШІ».'); return; }
if(typeof navigator!=='undefined'&&navigator.onLine===false){ cb(null,'Немає інтернету.'); return; }
var ctl=window.AbortController?new AbortController():null, tm=setTimeout(function(){ if(ctl) ctl.abort(); },opt&&opt.json?90000:60000);
if(box) box.ctl=ctl;
var payload={prompt:prompt,system:system||AI_SYS,max:max||600}; if(msgs&&msgs.length) payload.messages=msgs; if(opt&&opt.json) payload.json=true;
fetch(AI_URL,{method:'POST',signal:ctl?ctl.signal:undefined,
headers:{'content-type':'application/json','x-app-token':aiToken()},
body:JSON.stringify(payload)})
.then(function(r){
if(r.status===403) throw new Error('Токен не підійшов (403). Перевір APP_TOKEN.');
if(r.status===429) throw new Error('Забагато запитів — спробуй за хвилину.');
if(!r.ok) throw new Error('Помилка воркера: '+r.status);
return r.json();
})
.then(function(d){ clearTimeout(tm); var t=String((d&&d.text)||'').trim(); if(!t) cb(null,'ШІ повернув порожню відповідь.'); else cb(t,null); })
.catch(function(e){
clearTimeout(tm);
if(e&&e.name==='AbortError') cb(null,ctl&&ctl.userStop?'Скасовано.':'Час очікування вичерпано.');
else cb(null,(e&&e.message&&e.message.indexOf('Failed to fetch')<0)?e.message:'Немає зв\'язку з воркером (перевір адресу й CSP у консолі).');
});
}

// ---- Одноразові запити (помилки, тиждень, картки) ----
// Стан запитів: UI.ai[ключ] = {st:'busy'|'ok'|'err', text}. Ключ починається з e (помилка), w (тиждень), c (картки) або t (токен).
function aiBox(key){ var c=key.charAt(0); return c==='t'?['aiBox',aiBoxHTML]:c==='e'?['errBox',errsHTML]:c==='w'?['weekBox',weekHTML]:['cardBox',cardsHTML]; }
function aiRefresh(key){ var b=aiBox(key); updBox(b[0],b[1]); }
function aiRun(key,prompt,max){
UI.ai=UI.ai||{};
if(UI.ai[key]&&UI.ai[key].st==='busy') return;
UI.ai[key]={st:'busy',text:''}; aiRefresh(key);
aiAsk(prompt,(key.charAt(0)==='c'?AI_SYS:aiSys()),function(text,err){
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
return a?aiStatus(k,a.st==='ok'?'<button type="button" class="ok" onclick="aiSaveHint(\''+e.id+'\')">💾 У «Як правильно»</button><button type="button" onclick="aiChatAboutErr(\''+e.id+'\')">💬 Обговорити в чаті</button>':''):'';
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
// Переносить помилку разом із поясненням у чат, щоб можна було уточнювати
function aiChatAboutErr(id){
var k=findErr(id), a=UI.ai&&UI.ai['e'+id]; if(k<0||!a||a.st!=='ok') return;
var e=STATE.errs[k], tp=errTopic(e);
aiChatInit();
UI.aiS=e.subj; UI.aiTp=e.tid||'';
UI.chat.push({r:'u',t:'Я помилився в завданні: '+e.t+' ('+META[e.subj].name+(tp?', '+tp:'')+'). Причина: '+ERR_WHY[e.w|0]+'.'});
UI.chat.push({r:'a',t:a.text});
aiSaveChat(); delete UI.ai['e'+id]; render(); aiOpenChat();
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

// ======================= ЧАТ-РЕПЕТИТОР =======================
function aiLoadChat(){
try{
var a=JSON.parse(lsGet('nmt-ai-chat')||'[]');
if(!Array.isArray(a)) return [];
return a.filter(function(m){ return m&&(m.r==='u'||m.r==='a')&&typeof m.t==='string'&&m.t; }).map(function(m){ return {r:m.r,t:m.t.slice(0,4000)}; }).slice(-AI_MAX_MSG);
}catch(e){ return []; }
}
function aiSaveChat(){ lsSet('nmt-ai-chat',JSON.stringify((UI.chat||[]).slice(-AI_MAX_MSG))); }
function aiChatInit(){
if(UI.chat) return;
UI.chat=aiLoadChat(); UI.chatSt=''; UI.chatErr=''; UI.chatTok=0; UI.aiIn='';
UI.aiCtx=lsGet('nmt-ai-ctx')!=='0'; // за замовчуванням ШІ бачить увесь прогрес UI.aiLen=lsGet('nmt-ai-len')==='long'?'long':'short';
UI.aiS=UI.aiS||''; UI.aiTp=UI.aiTp||'';
}
function aiTopicInfo(){
var s=UI.aiS; if(!s||!META[s]) return '';
var i=UI.aiTp?TID[s].indexOf(UI.aiTp):-1;
return META[s].name+(i>-1?': '+TOPICS[s][i]:'');
}
// Повний зріз знань учня для моделі: прогрес, тести %, пробники, помилки, картки, активність. Найважливіше — на початку (воркер може обрізати хвіст).
function aiPct(a){ var n=0,k=0; a.forEach(function(x){ if(x!==null&&isFinite(x)){ n+=x; k++; } }); return k?Math.round(n/k):null; }
function aiContext(){
var L=[], dl=examDl(), wd=(new Date().getDay()+6)%7, CF=['без оцінки','слабко','так собі','добре'];
L.push('Сьогодні: '+isoDay(Date.now())+(dl>0?'; до НМТ '+dl+' дн.':'')+'; серія днів: '+streak()+'; розклад на сьогодні: '+((SCHED[wd]||[]).map(function(s){ return META[s].name; }).join(', ')||'повторення'));
var wk=weekData(0); L.push('Цей тиждень: тем закрито '+wk.tot+', повторень '+wk.rv+', карток '+wk.cr+', помилок виправлено '+wk.fx+', додано '+wk.add+', активних днів '+wk.days+'/7');
ORDER.forEach(function(s){
var done=0, ps=[], rows=[], star=[], i, e, p;
for(i=0;i<TID[s].length;i++){
e=ST(s,i); p=pctOf(e);
if(e&&e.done) done++;
if(p!==null){ ps.push(p); rows.push({t:TOPICS[s][i],p:p,c:confOf(e),d:e.date||''}); }
else if(e&&e.done&&e.conf) rows.push({t:TOPICS[s][i],p:null,c:e.conf,d:e.date||''});
if(wOf(TID[s][i])&&!(e&&e.done)) star.push(TOPICS[s][i]);
}
var mk=(STATE.mockLog&&STATE.mockLog[s])||[], g=cfgGet('goal:'+s);
var h='\n['+META[s].name+'] тем пройдено '+done+'/'+TID[s].length+' ('+Math.round(done/TID[s].length*100)+'%)';
var av=aiPct(ps); h+='; середній «тест %» по темах: '+(av===null?'немає даних':av+'% ('+ps.length+' тем)');
h+='; пробники: '+(mk.length?mk.slice(-5).map(function(m){ return m.date+' — '+m.score+(m.errs!=null?' (помилок '+m.errs+')':''); }).join(', '):'немає')+'; ціль: '+((g!==undefined&&g!=='')?g:'не задано');
L.push(h);
rows.sort(function(x,y){ return (x.p===null?101:x.p)-(y.p===null?101:y.p); });
if(rows.length) L.push('Результати за темами (від найслабших; «тест %», впевненість): '+rows.slice(0,25).map(function(r){ return r.t+' — '+(r.p!==null?r.p+'%':'без %')+', '+CF[r.c||0]; }).join('; ')+(rows.length>25?'; …ще '+(rows.length-25):''));
var nx=openTopics(s,2).map(function(k){ return TOPICS[s][k]; }); if(nx.length) L.push('Найближчі нові теми: '+nx.join('; '));
if(star.length) L.push('Важливі (★, більше балів на НМТ), ще не пройдені: '+star.slice(0,8).join('; ')+(star.length>8?'; …ще '+(star.length-8):''));
});
var due=dueTopics().slice(0,8).map(function(o){ return TOPICS[o.s][o.i]; });
L.push('На повторення сьогодні: тем '+dueTopics().length+(due.length?' ('+due.join('; ')+')':'')+', помилок '+dueErrs().length+', карток '+cardsDueCount(''));
var er=errsAll().filter(function(e){ return !e.fixed; }), cnt=[0,0,0,0]; er.forEach(function(e){ cnt[e.w|0]++; });
if(er.length){
L.push('Активні помилки: '+er.length+'; причини: '+ERR_WHY.map(function(w,i){ return w+' '+cnt[i]; }).join(', '));
L.push('Останні помилки: '+er.slice(-8).map(function(e){ var tp=errTopic(e); return META[e.subj].name+(tp?' / '+tp:'')+': '+e.t; }).join(' | '));
}
var dk=decksLive().map(function(d){ return d.name+' ('+cardsOf(d.id).length+' карток, '+cardsDueCount(d.id)+' до повторення)'; });
if(dk.length) L.push('Колоди карток: '+dk.join('; '));
var notes=[]; ORDER.forEach(function(s){ for(var i=0;i<TID[s].length;i++){ var e=ST(s,i); if(e&&e.note) notes.push(TOPICS[s][i]+': '+e.note); } });
if(notes.length) L.push('Нотатки учня до тем: '+notes.slice(0,8).join(' | '));
return L.join('\n').slice(0,9000);
}
// Системна підказка з повним контекстом (для всіх запитів до ШІ, окрім чистої генерації тестів і карток)
function aiSys(){ return AI_SYS+'\nДані учня з тренажера (спирайся лише на них, нічого не вигадуй; якщо даних бракує — скажи про це):\n'+aiContext(); }
function aiChatSys(force){
var s=AI_SYS+' Ти ведеш діалог з учнем: враховуй попередні повідомлення. '+(UI.aiLen==='long'?'Відповідай докладно (до ~1200 символів), з прикладами.':'Відповідай коротко (до ~500 символів).');
var t=aiTopicInfo(); if(t) s+='\nПоточна тема розмови: '+t+'.';
if(UI.aiCtx||force) s+='\nДані учня з тренажера (спирайся лише на них, нічого не вигадуй):\n'+aiContext();
return s;
}
function aiChatRefresh(focus){
updBox('aiBox',aiBoxHTML);
setTimeout(function(){
var l=document.getElementById('ai-log'); if(l) l.scrollTop=l.scrollHeight;
if(focus&&UI.chatSt!=='busy'&&!('ontouchstart' in window)){ var t=document.getElementById('ai-in'); if(t) t.focus(); }
},0);
}
function aiOpenChat(){
aiChatInit(); updBox('aiBox',aiBoxHTML); openBox('aiBox');
setTimeout(function(){ var l=document.getElementById('ai-log'); if(l) l.scrollTop=l.scrollHeight; },60);
}
function aiCall(force){
var tok=++UI.chatTok;
var msgs=UI.chat.slice(-10).map(function(m){ return {role:m.r==='u'?'user':'assistant',content:m.t.slice(0,1500)}; });
while(msgs.length&&msgs[0].role!=='user') msgs.shift();
// для старого воркера (приймає лише prompt) історія склеюється в один текст
var flat=msgs.map(function(m){ return (m.role==='user'?'Учень: ':'Репетитор: ')+m.content; }).join('\n\n').slice(-3800);
UI.chatSt='busy'; UI.chatErr=''; UI.chatBox={};
aiChatRefresh(false);
aiAsk(flat,aiChatSys(force),function(text,err){
if(tok!==UI.chatTok) return; // чат очищено, поки йшов запит
UI.chatSt='';
if(err) UI.chatErr=err; else{ UI.chat.push({r:'a',t:text}); aiSaveChat(); dstatAi(); }
aiChatRefresh(true);
},UI.aiLen==='long'?1200:600,msgs,UI.chatBox);
}
function dstatAi(){ try{ dstat('ai'); }catch(e){} }
function aiSend(text,force){
aiChatInit();
if(UI.chatSt==='busy') return;
text=String(text||'').trim().slice(0,1500); if(!text) return;
if(!aiReady()||!aiToken()){ UI.chatErr=!aiReady()?'У js/ai.js не вказано адресу воркера (AI_URL).':'Спершу впиши токен у «⚙️ Налаштування ШІ» нижче.'; aiChatRefresh(false); return; }
UI.chat.push({r:'u',t:text}); UI.aiIn=''; aiSaveChat();
aiCall(force);
}
function aiSendInput(){ var t=document.getElementById('ai-in'); aiSend(t?t.value:UI.aiIn); }
function aiKey(ev){
if(ev.key==='Enter'&&!ev.shiftKey&&!ev.isComposing&&!('ontouchstart' in window)){ ev.preventDefault(); aiSendInput(); }
}
function aiStop(){ var c=UI.chatBox&&UI.chatBox.ctl; if(c){ c.userStop=true; c.abort(); } }
function aiRetry(){ aiChatInit(); if(UI.chatSt==='busy') return; if(UI.chat.length&&UI.chat[UI.chat.length-1].r==='u') aiCall(false); else{ UI.chatErr=''; aiChatRefresh(false); } }
function aiClearChat(){
aiChatInit();
if(UI.chat.length&&!confirm('Очистити всю розмову?')) return;
UI.chat=[]; UI.chatTok++; UI.chatSt=''; UI.chatErr=''; aiSaveChat(); aiChatRefresh(false);
}
function aiSetSubj(v){
aiChatInit(); UI.aiS=META[v]?v:''; UI.aiTp='';
var el=document.getElementById('ai-tp'); if(el) el.innerHTML=topicOpts(UI.aiS,'');
}
function aiSetCtx(on){ aiChatInit(); UI.aiCtx=!!on; lsSet('nmt-ai-ctx',on?'1':'0'); }
function aiSetLen(v){ aiChatInit(); UI.aiLen=v==='long'?'long':'short'; lsSet('nmt-ai-len',UI.aiLen); }
function aiQuick(kind){
aiChatInit();
if(UI.chatSt==='busy') return;
var t=aiTopicInfo(), p, force=false;
if(kind==='plan'){ p='Склади конкретний план занять на сьогодні (2–3 години) за моїми даними: що повторити, що вчити нове, скільки хвилин на кожне.'; force=true; }
else if(kind==='weak'){ p='Розбери мої слабкі теми та помилки: з чого почати, у якому порядку і як підтягнути їх за 1–2 тижні.'; force=true; }
else{
if(!t){ UI.chatErr='Спершу обери предмет і тему вище.'; aiChatRefresh(false); return; }
p=kind==='explain'
?'Поясни тему: '+t+'. Дай суть правила, 1–2 типові приклади завдань НМТ з розв\'язанням і найчастіші помилки.'
:'Склади 5 тестових завдань рівня НМТ за темою: '+t+', кожне з 4 варіантами відповіді. Правильні відповіді НЕ показуй — я напишу свої, а ти перевіриш і поясниш помилки.';
}
aiSend(p,force);
}
// Кнопка 🤖 біля теми в списку: відкриває чат із цією темою й одразу просить пояснення
function aiTopicBtn(subj,i){
return '<button type="button" class="ai-tb" title="Запитати ШІ про цю тему" aria-label="Запитати ШІ про цю тему" onclick="aiAskTopic(\''+subj+'\','+i+')">🤖</button>';
}
function aiAskTopic(subj,i){
aiChatInit();
UI.aiS=subj; UI.aiTp=TID[subj][i];
aiOpenChat();
if(aiToken()) aiQuick('explain');
}
function aiCopy(i,el){
var m=UI.chat&&UI.chat[i]; if(!m) return;
try{ navigator.clipboard.writeText(m.t).then(function(){ if(el) el.textContent='✓ Скопійовано'; }); }catch(e){}
}
function aiToCards(i){
var m=UI.chat&&UI.chat[i]; if(!m||m.r!=='a') return;
if(!curDeck()){ alert('Спершу створи колоду в блоці «Картки».'); return; }
var p='Зроби з цього тексту до 10 навчальних карток для НМТ.\nФормат: кожна картка в окремому рядку — питання;відповідь\nПравила: без нумерації і пояснень; символ «;» лише як роздільник; питання коротке, відповідь до 150 символів; бери лише те, що є в тексті.\n\nТекст:\n'+m.t.slice(0,2500);
UI.aiCards=''; aiRun('c',p,1500); openBox('cardBox');
}
function aiMsgHTML(m,i){
var a=m.r==='a';
return '<div class="am '+(a?'a':'u')+'"><div class="am-t">'+esc(m.t)+'</div>'
+(a?'<div class="am-b"><button type="button" onclick="aiCopy('+i+',this)" title="Копіювати відповідь">📋 Копіювати</button><button type="button" onclick="aiToCards('+i+')" title="Зробити картки з цієї відповіді">🃏 У картки</button></div>':'')+'</div>';
}
function aiChatHTML(){
aiChatInit();
var busy=UI.chatSt==='busy', h='';
h+='<div class="aictx"><select id="ai-sj" aria-label="Предмет" onchange="aiSetSubj(this.value)"><option value="">— предмет —</option>'
+ORDER.map(function(s){ return '<option value="'+s+'"'+(UI.aiS===s?' selected':'')+'>'+ICON[s]+' '+esc(META[s].name)+'</option>'; }).join('')+'</select>'
+'<select id="ai-tp" aria-label="Тема" onchange="UI.aiTp=this.value">'+topicOpts(UI.aiS,UI.aiTp)+'</select></div>';
h+='<div class="aiqa"><button type="button"'+(busy?' disabled':'')+' onclick="aiQuick(\'explain\')">📖 Пояснити тему</button>'
+'<button type="button"'+(busy?' disabled':'')+' onclick="aiQuick(\'quiz\')">📝 Міні-тест (5)</button>'
+'<button type="button"'+(busy?' disabled':'')+' onclick="aiQuick(\'plan\')">📅 План на сьогодні</button>'
+'<button type="button"'+(busy?' disabled':'')+' onclick="aiQuick(\'weak\')">🔴 Мої слабкі місця</button></div>';
h+='<div class="aichat" id="ai-log" role="log" aria-live="polite">';
if(!UI.chat.length&&!busy&&!UI.chatErr) h+='<p class="meta">Обери тему й натисни швидку дію або просто запитай. Можна вставити текст завдання — репетитор розбере його покроково. Розмова триває: уточнюй, проси інший приклад чи перевірити відповідь.</p>';
UI.chat.forEach(function(m,i){ h+=aiMsgHTML(m,i); });
if(busy) h+='<div class="am a" role="status"><div class="am-t">🤖 Думаю…</div></div>';
if(UI.chatErr) h+='<div class="am a" role="alert"><div class="am-t">⚠️ '+esc(UI.chatErr)+'</div>'+(UI.chat.length&&UI.chat[UI.chat.length-1].r==='u'?'<div class="am-b"><button type="button" onclick="aiRetry()">↻ Повторити</button></div>':'')+'</div>';
h+='</div>';
h+='<div class="aiin"><textarea id="ai-in" rows="2" maxlength="1500" aria-label="Повідомлення репетитору" placeholder="Запитай або встав завдання…  (Enter — надіслати, Shift+Enter — новий рядок)" oninput="UI.aiIn=this.value" onkeydown="aiKey(event)">'+esc(UI.aiIn||'')+'</textarea>'
+(busy?'<button type="button" onclick="aiStop()">⏹ Стоп</button>':'<button type="button" class="ok" onclick="aiSendInput()">Надіслати</button>')+'</div>';
h+='<div class="aictx"><label class="chk"><input type="checkbox"'+(UI.aiCtx?' checked':'')+' onchange="aiSetCtx(this.checked)"> ШІ бачить мій прогрес, тести й помилки</label>'
+'<select aria-label="Довжина відповіді" onchange="aiSetLen(this.value)"><option value="short"'+(UI.aiLen==='short'?' selected':'')+'>Коротко</option><option value="long"'+(UI.aiLen==='long'?' selected':'')+'>Докладно</option></select>'
+'<button type="button" onclick="aiClearChat()"'+(UI.chat.length?'':' disabled')+'>🗑 Очистити розмову</button></div>';
return h;
}

// ---- Налаштування токена (зберігається в хмарі разом із прогресом) ----
function aiBoxHTML(){
aiMigrate(); aiChatInit();
var has=!!aiToken(), a=UI.ai&&UI.ai.t;
var h='<details class="card blk box" id="aiBox"'+(isOpen('aiBox',false)?' open':'')+'><summary>🤖 ШІ-репетитор ('+(has?'готовий':'потрібен токен')+')</summary>';
if(!aiReady()) h+='<p class="meta warn">⚠️ У js/ai.js ще не вказано адресу воркера (AI_URL).</p>';
h+=aiChatHTML();
h+='<details class="subd"'+(UI.qz&&UI.qz.st?' open':'')+'><summary>🧪 Тест від ШІ (з перевіркою й підрахунком %)</summary><div id="qz-box">'+qzInner()+'</div></details>';
var cloud=!!(db&&getSyncCode());
h+='<details class="subd"'+(!has||UI.aiSetOpen||a?' open':'')+'><summary>⚙️ Налаштування ШІ</summary>';
h+='<p class="meta">Запити йдуть через твій Cloudflare Worker до Google Gemini; ключ Gemini лежить лише у воркері й у браузері не зберігається. '
+(cloud?'Токен зберігається разом із прогресом у хмарі (код синхронізації ☁️) і з\'явиться на інших пристроях сам. Хто знає код синхронізації — може прочитати токен; якщо код потрапив до чужих, зміни APP_TOKEN у воркері й впиши новий.'
:'Токен зберігається разом із прогресом у цьому браузері. Підключи хмарну синхронізацію (☁️ угорі), щоб він з\'являвся на інших пристроях сам.')+' Історія чату лишається лише на цьому пристрої.</p>';
h+='<div class="plan-row"><input id="ai-tok" type="password" autocomplete="off" spellcheck="false" placeholder="'+(has?'новий токен (замінить поточний)':'APP_TOKEN з воркера')+'" aria-label="Токен ШІ">'
+'<button type="button" class="ok" onclick="aiSaveToken()">Зберегти</button>'
+(has?'<button type="button" onclick="aiClearToken()">Видалити скрізь</button><button type="button" onclick="aiTest()">Перевірити</button>':'')+'</div>';
if(a) h+=aiStatus('t');
return h+'</details></details>';
}
function aiBoxRefresh(){ updBox('aiBox',aiBoxHTML); }
function aiSaveToken(){
var el=document.getElementById('ai-tok'), v=el?(el.value||'').trim():''; if(!v) return;
UI.ai=UI.ai||{}; UI.aiSetOpen=true;
if(!AI_TOKEN_RE.test(v)){ UI.ai.t={st:'err',text:'Токен має бути від 6 до 300 символів: латиниця, цифри, знаки — без пробілів і кирилиці.'}; aiBoxRefresh(); return; }
cfgSet('ai',v); try{ localStorage.removeItem('nmt-ai-token'); }catch(e){}
delete UI.ai.t; persist(); aiBoxRefresh();
}
function aiClearToken(){
cfgSet('ai',undefined); try{ localStorage.removeItem('nmt-ai-token'); }catch(e){}
if(UI.ai) delete UI.ai.t; UI.aiSetOpen=true; persist(); aiBoxRefresh();
}
function aiTest(){
UI.ai=UI.ai||{}; UI.aiSetOpen=true; UI.ai.t={st:'busy',text:''}; aiBoxRefresh();
aiAsk('Відповідай одним словом: працює.',AI_SYS,function(t,err){ UI.ai.t=err?{st:'err',text:err}:{st:'ok',text:'Зв\'язок є: '+t}; aiBoxRefresh(); },50);
}

// ---- 🧪 Тест від ШІ: Gemini складає питання (JSON), перевірка й підрахунок % — у браузері ----
// Результат можна записати в «тест %» теми — від нього залежить інтервал повторення (≥80% → рідше, <50% → частіше).
var QZ_DIFF={base:'базового рівня',nmt:'як на реальному НМТ',hard:'підвищеної складності'};
function qzInit(){
if(!UI.qz) UI.qz={st:'',err:'',items:[],ans:[],s:'',tp:''};
if(UI.qzS===undefined) UI.qzS=''; if(UI.qzTp===undefined) UI.qzTp='';
if(!UI.qzN) UI.qzN=5; if(!UI.qzD) UI.qzD='nmt';
}
function qzShuffle(it){
var idx=[0,1,2,3], i, j, t;
for(i=3;i>0;i--){ j=Math.floor(Math.random()*(i+1)); t=idx[i]; idx[i]=idx[j]; idx[j]=t; }
return {q:it.q,o:idx.map(function(k){ return it.o[k]; }),a:idx.indexOf(it.a),e:it.e};
}
// Приймає відповідь моделі, повертає лише коректні питання (рівно 4 варіанти, індекс правильного 0–3); варіанти перемішуються
function qzParse(text){
var t=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
var a, out=[], m;
try{ a=JSON.parse(t); }catch(e){ m=/\[[\s\S]*\]/.exec(t); if(!m) return out; try{ a=JSON.parse(m[0]); }catch(e2){ return out; } }
if(a&&!Array.isArray(a)&&Array.isArray(a.questions)) a=a.questions;
if(!Array.isArray(a)) return out;
a.slice(0,15).forEach(function(x){
if(!x||typeof x.q!=='string'||!x.q.trim()||x.q.length>700||!Array.isArray(x.o)||x.o.length!==4) return;
var ok=x.o.every(function(s){ return typeof s==='string'&&s.trim()&&s.length<=300; });
var k=Math.round(+x.a);
if(!ok||!(k>=0&&k<=3)) return;
out.push(qzShuffle({q:x.q.trim(),o:x.o.map(function(s){ return s.trim(); }),a:k,e:typeof x.e==='string'?x.e.trim().slice(0,600):''}));
});
return out;
}
function qzRefresh(){ var el=document.getElementById('qz-box'); if(el) el.innerHTML=hx(qzInner()); }
function qzSetSubj(v){
qzInit(); UI.qzS=META[v]?v:''; UI.qzTp='';
var el=document.getElementById('qz-tp'); if(el) el.innerHTML=topicOpts(UI.qzS,'');
}
function qzGen(){
qzInit(); if(UI.qz.st==='busy') return;
var s=UI.qzS;
if(!s||!META[s]){ UI.qz.st='err'; UI.qz.err='Спершу обери предмет.'; qzRefresh(); return; }
var i=UI.qzTp?TID[s].indexOf(UI.qzTp):-1;
var topic=i>=0?TOPICS[s][i]:'різні теми програми НМТ з цього предмета';
var n=UI.qzN===10?10:5, d=QZ_DIFF[UI.qzD]||QZ_DIFF.nmt;
var p='Склади '+n+' тестових завдань '+d+' (НМТ, Україна) з предмета «'+META[s].name+'» за темою: '+topic+'. '
+'Мова завдань відповідає предмету (англійська — англійською, решта — українською). Кожне завдання має рівно 4 варіанти відповіді, правильний лише один. '
+'Формули записуй простим текстом (x^2, sqrt(x), 1/2). Завдання не повинні повторюватися. '
+'Поверни ЛИШЕ JSON-масив об\'єктів виду {"q":"текст завдання","o":["варіант","варіант","варіант","варіант"],"a":0,"e":"пояснення правильної відповіді в 1–2 реченнях"}, '
+'де a — індекс правильного варіанта (0–3). Без markdown і без тексту поза JSON.';
var cur={st:'busy',err:'',items:[],ans:[],s:s,tp:i>=0?UI.qzTp:'',saved:false};
UI.qz=cur; qzRefresh();
aiAsk(p,AI_SYS,function(text,err){
if(UI.qz!==cur) return;
if(err){ cur.st='err'; cur.err=err; }
else{
var items=qzParse(text);
if(!items.length){ cur.st='err'; cur.err='ШІ повернув тест у незрозумілому форматі. Спробуй ще раз.'; }
else{ cur.st='ok'; cur.items=items; dstatAi(); }
}
qzRefresh();
},n===10?3500:2200,null,null,{json:true});
}
function qzPick(i,j){
var q=UI.qz; if(!q||q.st!=='ok'||!q.items[i]||q.ans[i]!==undefined) return;
q.ans[i]=j; qzRefresh();
}
function qzScore(q){ var k=0; q.items.forEach(function(it,j){ if(q.ans[j]===it.a) k++; }); return k; }
function qzSavePct(){
var q=UI.qz; if(!q||q.st!=='ok'||q.saved) return;
var i=q.tp?TID[q.s].indexOf(q.tp):-1; if(i<0) return;
var done=0; q.items.forEach(function(it,j){ if(q.ans[j]!==undefined) done++; });
if(done!==q.items.length) return;
q.saved=true;
pctChange(q.s,i,Math.round(qzScore(q)*100/q.items.length));
}
function qzInner(){
qzInit();
var q=UI.qz, busy=q.st==='busy', h='';
h+='<div class="aictx"><select id="qz-sj" aria-label="Предмет для тесту" onchange="qzSetSubj(this.value)"><option value="">— предмет —</option>'
+ORDER.map(function(s){ return '<option value="'+s+'"'+(UI.qzS===s?' selected':'')+'>'+ICON[s]+' '+esc(META[s].name)+'</option>'; }).join('')+'</select>'
+'<select id="qz-tp" aria-label="Тема для тесту" onchange="UI.qzTp=this.value">'+topicOpts(UI.qzS,UI.qzTp)+'</select></div>';
h+='<div class="aictx"><select aria-label="Кількість питань" onchange="UI.qzN=+this.value"><option value="5"'+(UI.qzN===5?' selected':'')+'>5 питань</option><option value="10"'+(UI.qzN===10?' selected':'')+'>10 питань</option></select>'
+'<select aria-label="Складність" onchange="UI.qzD=this.value"><option value="base"'+(UI.qzD==='base'?' selected':'')+'>Базовий</option><option value="nmt"'+(UI.qzD==='nmt'?' selected':'')+'>Як на НМТ</option><option value="hard"'+(UI.qzD==='hard'?' selected':'')+'>Складніший</option></select>'
+'<button type="button" class="ok"'+(busy?' disabled':'')+' onclick="qzGen()">🧪 Створити тест</button></div>';
if(busy) return h+'<div class="en" role="status">🤖 Складаю тест…</div>';
if(q.st==='err') return h+'<div class="en" role="alert">⚠️ '+esc(q.err)+'</div>';
if(q.st!=='ok') return h+'<p class="meta">Обери предмет і тему — ШІ складе тест; відповідай, і одразу побачиш правильну відповідь з поясненням та підсумок у %.</p>';
var answered=0;
q.items.forEach(function(it,i){
var an=q.ans[i];
if(an!==undefined) answered++;
h+='<div class="qz-q"><div class="qz-t">'+(i+1)+'. '+esc(it.q)+'</div>';
it.o.forEach(function(o,j){
var cls='qzo', mark='';
if(an!==undefined){ if(j===it.a){ cls+=' good'; mark=' ✅'; } else if(j===an){ cls+=' bad'; mark=' ❌'; } }
h+='<button type="button" class="'+cls+'"'+(an!==undefined?' disabled':'')+' onclick="qzPick('+i+','+j+')">'+String.fromCharCode(65+j)+') '+esc(o)+mark+'</button>';
});
if(an!==undefined&&it.e) h+='<div class="meta qz-e">'+esc(it.e)+'</div>';
h+='</div>';
});
if(answered===q.items.length){
var k=qzScore(q), n=q.items.length, pc=Math.round(k*100/n), ti=q.tp?TID[q.s].indexOf(q.tp):-1;
h+='<div class="en" role="status"><b>Результат: '+k+' з '+n+' ('+pc+'%)</b></div><div class="plan-row">';
if(ti>=0&&!q.saved) h+='<button type="button" class="ok" onclick="qzSavePct()">📌 Записати '+pc+'% як «тест %» теми</button>';
if(q.saved) h+='<span class="meta">✓ Записано в «тест %» теми</span>';
h+='<button type="button" onclick="qzGen()">🔁 Новий тест</button></div>';
if(ti<0) h+='<p class="meta">Щоб записати результат у «тест %», обери конкретну тему. Від «тест %» залежить інтервал повторення: ≥80% — рідше, &lt;50% — частіше.</p>';
}
return h;
}
