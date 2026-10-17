/* ===== Таймер пробника =====
    */
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

