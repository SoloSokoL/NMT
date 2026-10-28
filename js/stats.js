/* ===== Статистика, підсумок тижня, графіки =====
    */
// ---- Статистика й підсумок тижня ----
function weekData(off){
var mon=dayStart(mondayOf(Date.now()),-7*off), end=dayStart(mon,7);
var d={mon:mon,end:end,closed:{},tot:0,pct:[],rv:0,cr:0,fx:0,add:0,days:0,mock:{},off:off};
function inW(t){ return t>=mon&&t<end; }
ORDER.forEach(function(s){
var c=0;
TID[s].forEach(function(id,i){
var e=ST(s,i); if(!e) return;
if(e.done&&inW(doneTs(e))) c++;
var pt=+e.pts, p=pctOf(e);
if(p!==null&&isFinite(pt)&&inW(pt)) d.pct.push(p);
});
d.closed[s]=c; d.tot+=c;
var arr=(STATE.mockLog[s]||[]).slice().sort(function(a,b){ return (a.ts||0)-(b.ts||0); }), w=arr.filter(function(e){ return inW(e.ts||0); }), prev=null;
arr.forEach(function(e){ if((e.ts||0)<mon) prev=e; });
d.mock[s]=w.length?{n:w.length,last:+w[w.length-1].score,delta:prev?+w[w.length-1].score-(+prev.score):null}:{n:0,last:arr.length?+arr[arr.length-1].score:null};
});
for(var i=0;i<7;i++){
var k=isoDay(dayStart(mon,i)), st=(STATE.dst||{})[k]||{};
d.rv+=st.rv||0; d.cr+=st.cr||0;
if(((STATE.act||{})[k]||0)>0) d.days++;
}
errsAll().forEach(function(e){ if(inW(e.ts||0)) d.add++; if(e.fixed&&inW(e.fixed)) d.fx++; });
return d;
}
function lagging(d){
var dl=examDl(), best=null, frac=d.off===0?(((new Date().getDay()+6)%7)+1)/7:1;
ORDER.forEach(function(s){
var left=0; for(var i=0;i<TID[s].length;i++){ var e=ST(s,i); if(!(e&&e.done)) left++; }
if(!left) return;
var need, how;
if(dl>28){ need=left/((dl-28)/7); how='за темпом до фінішу'; }
else{ var pd=0; WEEK.forEach(function(x){ if(x.indexOf(s)>-1) pd++; }); need=Math.min(pd,left); how='за розкладом тижня'; }
var deficit=need*frac-d.closed[s];
if(deficit>=1&&(!best||deficit>best.deficit)) best={s:s,need:need,deficit:deficit,how:how};
});
return best;
}
function recommend(d,lag){
var eo=[];
if(eo.length) return 'Зроби фокус на журналі помилок: прострочено '+eo.length+' '+pl(eo.length,['помилка','помилки','помилок'])+' — розбери їх у перші два дні тижня, поки вони не накопичились.';
if(lag) return 'Зроби фокус на предметі «'+META[lag.s].name+'»: закрий щонайменше '+Math.max(1,Math.ceil(lag.need))+' '+pl(Math.max(1,Math.ceil(lag.need)),['тему','теми','тем'])+' (потрібно ≈'+lag.need.toFixed(1)+' на тиждень, зараз відставання ≈'+lag.deficit.toFixed(1)+').';
var w=weakList();
if(w.length) return 'Зроби фокус на слабкій темі «'+TOPICS[w[0].s][w[0].i]+'»'+(w[0].p!==null?' ('+w[0].p+'%)':'')+': перерішай 10–15 завдань і онови «тест %».';
var cnt=[0,0,0,0], tot=0; errsAll().forEach(function(e){ cnt[e.w|0]++; tot++; });
if(tot>=5){
var mx=0; cnt.forEach(function(c,i){ if(c>cnt[mx]) mx=i; });
if(cnt[mx]/tot>=0.4){
var tip=['вивчи правила з відповідних тем і зроби по них картки','перечитуй умову двічі й перевіряй відповідь підстановкою','тренуйся на таймері й пропускай завдання, що «зависають»','виписуй «дано / знайти» до кожного завдання'][mx];
return 'Зроби фокус на причині «'+ERR_WHY[mx]+'» ('+Math.round(cnt[mx]/tot*100)+'% помилок): '+tip+'.';
}
}
return 'Зроби фокус на регулярності: закривай хоча б одну тему щодня за розкладом і вписуй «тест %» після кожної.';
}
function weekHTML(){
var d=weekData(UI.wkOff), isSun=new Date().getDay()===0, key=isoDay(mondayOf(Date.now()));
if(isSun&&!UI.wkSeen&&cfgGet('wk')!==key){
UI.wkSeen=true; UI.wkAuto=true; UI.op.weekBox=true;
cfgSet('wk',key); setTimeout(persist,0);
}
var lag=lagging(d), range=fmtDM(d.mon)+'–'+fmtDM(dayStart(d.mon,6));
var avg=d.pct.length?Math.round(d.pct.reduce(function(a,b){ return a+b; },0)/d.pct.length):null;
var h='<details class="card blk box" id="weekBox"'+(isOpen('weekBox',false)?' open':'')+'><summary>📊 Підсумок тижня ('+range+')</summary>';
h+='<div class="plan-row"><button type="button"'+(UI.wkOff===0?' class="ok"':'')+' onclick="UI.wkOff=0;updBox(\'weekBox\',weekHTML)">Цей тиждень</button><button type="button"'+(UI.wkOff===1?' class="ok"':'')+' onclick="UI.wkOff=1;updBox(\'weekBox\',weekHTML)">Минулий</button></div>';
h+='<div class="wk-grid">'
+'<div class="wk"><b>'+d.tot+'</b><i>'+pl(d.tot,['тему закрито','теми закрито','тем закрито'])+'</i></div>'
+'<div class="wk"><b>'+(avg===null?'—':avg+'%')+'</b><i>середній «тест %» ('+d.pct.length+' '+pl(d.pct.length,['тема','теми','тем'])+')</i></div>'
+'<div class="wk"><b>'+d.rv+'</b><i>повторень тем'+(d.cr?' · карток '+d.cr:'')+'</i></div>'
+'<div class="wk"><b>'+d.fx+'</b><i>'+pl(d.fx,['помилку виправлено','помилки виправлено','помилок виправлено'])+(d.add?' (нових: '+d.add+')':'')+'</i></div>'
+'<div class="wk"><b>🔥 '+streak()+'</b><i>серія днів · активних у тижні: '+d.days+'/7</i></div></div>';
h+='<h4>Пробники</h4>';
ORDER.forEach(function(s){
var m=d.mock[s], t;
if(m.n){ t='<b>'+m.last+'</b> '+(m.delta===null?'<i>перший запис</i>':m.delta>0?'<span class="up">▲ +'+m.delta+'</span>':m.delta<0?'<span class="dn">▼ '+m.delta+'</span>':'<span>▬ 0</span>')+' <i>('+m.n+' '+pl(m.n,['спроба','спроби','спроб'])+')</i>'; }
else t='<i>цього тижня не було'+(m.last!==null?' · останній: '+m.last:'')+'</i>';
h+='<div class="tl" style="--c:'+META[s].color+'">'+ICON[s]+' '+esc(META[s].name)+': '+t+'</div>';
});
h+='<h4>Відставання від плану</h4><p class="meta">'+(lag?ICON[lag.s]+' <b>'+esc(META[lag.s].name)+'</b>: потрібно ≈'+lag.need.toFixed(1)+' тем/тиждень ('+lag.how+'), закрито '+d.closed[lag.s]+'.':'Помітного відставання немає ✅')+'</p>';
h+='<div class="rec"><b>💡 Рекомендація на наступний тиждень</b><br>'+esc(recommend(d,lag))+'</div>'; h+=aiWeekHTML(d,lag);
return h+'</details>';
}

// ---- Графіки «Динаміка» ----
function tipEv(ev,wrap){
var el=ev.target.closest?ev.target.closest('[data-tip]'):null, t=wrap.querySelector('.ctip');
if(!t) return;
if(!el){ if(ev.type==='click') t.hidden=true; return; }
if(ev.type==='pointerover'&&ev.pointerType&&ev.pointerType!=='mouse') return;
t.textContent=el.getAttribute('data-tip'); t.hidden=false;
var wr=wrap.getBoundingClientRect(), r=el.getBoundingClientRect();
var x=r.left+r.width/2-wr.left-t.offsetWidth/2;
t.style.left=Math.max(2,Math.min(wr.width-t.offsetWidth-2,x))+'px';
t.style.top=Math.max(0,r.top-wr.top-t.offsetHeight-6)+'px';
}
function tipOut(ev,wrap){ if(ev.pointerType==='mouse'){ var t=wrap.querySelector('.ctip'); if(t) t.hidden=true; } }
function dynTog(s){ UI.dh[s]=!UI.dh[s]; updBox('dynBox',dynHTML); }
function dynW(){ return Math.max(280,Math.min(720,(document.documentElement.clientWidth||360)-56)); }
function dynLine(){
var W=dynW(), H=250, L=34, R=10, T=12, B=26, series=[], all=[], goals={};
ORDER.forEach(function(s){
if(UI.dh[s]) return;
var arr=(STATE.mockLog[s]||[]).filter(function(e){ return isFinite(+e.score)&&e.ts; }).map(function(e){ return {s:s,t:e.ts,v:+e.score,errs:e.errs}; });
series.push({s:s,pts:arr}); arr.forEach(function(p){ all.push(p); });
var g=parseFloat(cfgGet('goal:'+s)); if(isFinite(g)) goals[s]=g;
});
var legend='<div class="lgd">'+ORDER.map(function(s){
return '<button type="button" class="lg'+(UI.dh[s]?' off':'')+'" style="--c:'+META[s].color+'" aria-pressed="'+(!UI.dh[s])+'" onclick="dynTog(\''+s+'\')">'+ICON[s]+' '+esc(META[s].name)+'</button>';
}).join('')+'</div>';
if(!all.length) return legend+'<p class="meta">Немає даних для показаних предметів. Додай бали пробників — з\'явиться лінія.</p>';
var vals=all.map(function(p){ return p.v; }).concat(Object.keys(goals).map(function(s){ return goals[s]; }));
var lo=Math.max(0,Math.floor((Math.min.apply(null,vals)-5)/10)*10), hi=Math.min(200,Math.ceil((Math.max.apply(null,vals)+5)/10)*10);
if(hi-lo<20){ hi=Math.min(200,lo+20); lo=Math.max(0,hi-20); }
var step=(hi-lo)<=40?10:(hi-lo)<=100?20:50;
var tmin=Math.min.apply(null,all.map(function(p){ return p.t; })), tmax=Math.max.apply(null,all.map(function(p){ return p.t; }));
if(tmin===tmax){ tmin-=DAY; tmax+=DAY; }
function X(t){ return L+(t-tmin)/(tmax-tmin)*(W-L-R); }
function Y(v){ return T+(1-(v-lo)/(hi-lo))*(H-T-B); }
var sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="dynT dynD" focusable="false"><title id="dynT">Бали пробників за часом</title>';
var desc=series.filter(function(z){ return z.pts.length; }).map(function(z){ var l=z.pts[z.pts.length-1]; return META[z.s].name+': '+z.pts.length+' '+pl(z.pts.length,['запис','записи','записів'])+', останній '+l.v+' ('+fmtDM(l.t)+')'; }).join('; ');
sv+='<desc id="dynD">'+esc(desc)+'. Докладні значення — у таблиці нижче.</desc>';
var v;
for(v=Math.ceil(lo/step)*step;v<=hi;v+=step) sv+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" class="gl2"/><text x="'+(L-5)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end" class="ax">'+v+'</text>';
var nt=W<400?3:5, k;
for(k=0;k<nt;k++){ var tt=tmin+(tmax-tmin)*k/(nt-1); sv+='<text x="'+X(tt).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(k===0?'start':k===nt-1?'end':'middle')+'" class="ax">'+fmtDM(tt)+'</text>'; }
Object.keys(goals).forEach(function(s){
sv+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(goals[s]).toFixed(1)+'" y2="'+Y(goals[s]).toFixed(1)+'" stroke="'+META[s].color+'" stroke-width="1.5" stroke-dasharray="5 4" opacity=".75"><title>Ціль: '+esc(META[s].name)+' '+goals[s]+'</title></line>';
});
var hits='';
series.forEach(function(z){
if(z.pts.length>1) sv+='<polyline fill="none" stroke="'+META[z.s].color+'" stroke-width="2.2" stroke-linejoin="round" points="'+z.pts.map(function(p){ return X(p.t).toFixed(1)+','+Y(p.v).toFixed(1); }).join(' ')+'"/>';
z.pts.forEach(function(p){
var tip=META[z.s].name+' · '+fmtDM(p.t)+': '+p.v+(p.errs!==undefined&&p.errs!==null?' · помилок '+p.errs:'');
sv+='<circle cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="4" fill="'+META[z.s].color+'" stroke="var(--card2)" stroke-width="1.5"/>';
hits+='<circle cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="15" fill="transparent" tabindex="0" role="img" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'"/>';
});
});
sv+=hits+'</svg>';
var rows=all.slice().sort(function(a,b){ return b.t-a.t; }).slice(0,60).map(function(p){ return '<tr><td>'+fmtDM(p.t)+'</td><td>'+esc(META[p.s].name)+'</td><td>'+p.v+'</td></tr>'; }).join('');
return legend+'<div class="cw" onpointerover="tipEv(event,this)" onclick="tipEv(event,this)" onfocusin="tipEv(event,this)" onpointerout="tipOut(event,this)">'+sv+'<div class="ctip" hidden></div></div>'
+'<p class="meta">Пунктир — цільовий бал (задається біля пробників предмета).</p>'
+'<details class="subd"><summary>Таблиця значень</summary><div class="tbw"><table><thead><tr><th>Дата</th><th>Предмет</th><th>Бал</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
function dynAct(){
var W=dynW(), H=110, L=26, R=6, T=8, B=22, a=STATE.act||{}, days=[], i, mx=1, sum=0, on=0;
for(i=29;i>=0;i--){ var t=dayStart(Date.now(),-i), c=+a[isoDay(t)]||0; days.push({t:t,c:c}); if(c>mx) mx=c; sum+=c; if(c) on++; }
var bw=(W-L-R)/30;
var sv='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="actT actD" focusable="false"><title id="actT">Активність за 30 днів</title><desc id="actD">Усього дій: '+sum+', активних днів: '+on+' із 30, максимум за день: '+mx+'.</desc>';
sv+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" class="gl2"/><text x="'+(L-4)+'" y="'+(T+8)+'" text-anchor="end" class="ax">'+mx+'</text><text x="'+(L-4)+'" y="'+(H-B)+'" text-anchor="end" class="ax">0</text>';
var hits='';
days.forEach(function(d,k){
var h=d.c?Math.max(2,d.c/mx*(H-T-B)):1, x=L+k*bw+1, tip=fmtDM(d.t)+': '+d.c+' '+pl(d.c,['дія','дії','дій']);
sv+='<rect x="'+x.toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" class="'+(d.c?'bar-on':'bar-off')+'"/>';
hits+='<rect x="'+(L+k*bw).toFixed(1)+'" y="'+T+'" width="'+bw.toFixed(1)+'" height="'+(H-T-B)+'" fill="transparent" tabindex="0" role="img" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'"/>';
if(k%7===0||k===29) sv+='<text x="'+(x+bw/2-1).toFixed(1)+'" y="'+(H-6)+'" text-anchor="'+(k===29?'end':'middle')+'" class="ax">'+fmtDM(d.t)+'</text>';
});
return '<div class="cw" onpointerover="tipEv(event,this)" onclick="tipEv(event,this)" onfocusin="tipEv(event,this)" onpointerout="tipOut(event,this)">'+sv+hits+'</svg><div class="ctip" hidden></div></div>'
+'<p class="meta">Активних днів: <b>'+on+'</b> із 30 · усього дій: <b>'+sum+'</b> · серія: <b>'+streak()+'</b></p>';
}
function dynHTML(){
return '<details class="card blk box" id="dynBox"'+(isOpen('dynBox',false)?' open':'')+'><summary>📈 Динаміка</summary><h4>Бали пробників</h4>'+dynLine()+'<h4>Активність за 30 днів</h4>'+dynAct()+'</details>';
}
var _rz;
window.addEventListener('resize',function(){
clearTimeout(_rz);
_rz=setTimeout(function(){ var el=document.getElementById('dynBox'); if(el&&el.open) updBox('dynBox',dynHTML); },250);
});

