/* ===== Делегування подій (замість інлайн-обробників onclick="…") =====
   Уся розмітка досі будується рядками з атрибутами on…="…". Функція hx() перед вставкою в DOM перейменовує їх на data-on-…,
   а один слухач на document виконує їх. Завдяки цьому на сторінці немає жодного інлайн-обробника й можна ввімкнути
   Content-Security-Policy без 'unsafe-inline' для скриптів.

   Рядок-обробник розбирається власним мінімальним розбирачем (eval/new Function не потрібні). Підтримується лише те, що є в коді:
     виклик      toggle('math',3)   cardAns(true)   tipEv(event,this)   efSubj(this.value)
     присвоєння  UI.wkOff=0   UI.ef.w=+this.value
     послідовність через «;»   і   return <виклик> / return false
   Виклики дозволені лише для глобальних функцій сторінки. */
var HX_EVENTS=['click','change','input','submit','pointerover','pointerout','focusin'];
var HX_ATTR=new RegExp('(\\s)on('+HX_EVENTS.join('|')+')=("[^"]*")','g');
function hx(html){ return String(html).replace(HX_ATTR,'$1data-on-$2=$3'); }

var HX_CACHE={};
var HX_BAD={'__proto__':1,'constructor':1,'prototype':1};
function hxSplit(src,sep){
var out=[], cur='', q=false, i, ch;
for(i=0;i<src.length;i++){
ch=src.charAt(i);
if(ch==="'") q=!q;
if(!q&&ch===sep){ out.push(cur); cur=''; } else cur+=ch;
}
out.push(cur);
return out;
}
function hxPath(path,ev,el){
var parts=path.split('.'), obj, i;
if(!parts.every(function(p){ return /^[A-Za-z_$][\w$]*$/.test(p)&&!HX_BAD[p]; })) throw new Error('bad path '+path);
obj=parts[0]==='this'?el:parts[0]==='event'?ev:window[parts[0]];
for(i=1;i<parts.length;i++){ if(obj==null) return undefined; obj=obj[parts[i]]; }
return obj;
}
function hxVal(t,ev,el){
t=t.trim();
if(/^'[^']*'$/.test(t)) return t.slice(1,-1);
if(/^-?\d+(\.\d+)?$/.test(t)) return +t;
if(t==='true') return true;
if(t==='false') return false;
if(t==='null') return null;
if(t.charAt(0)==='+') return +hxVal(t.slice(1),ev,el);
return hxPath(t,ev,el);
}
function hxCheckVal(t){
t=t.trim();
if(t.charAt(0)==='+') t=t.slice(1).trim();
if(/^'[^']*'$/.test(t)||/^-?\d+(\.\d+)?$/.test(t)||/^(true|false|null)$/.test(t)) return;
if(!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(t)) throw new Error('bad value '+t);
}
// Розбір одного оператора у функцію (ev,el) → значення
function hxStmt(st){
var m, ret=false;
st=st.trim();
if(/^return\b/.test(st)){ ret=true; st=st.replace(/^return\s*/,''); }
if(st==='') return function(){ return undefined; };
if((m=/^([A-Za-z_$][\w$]*)\(([\s\S]*)\)$/.exec(st))){
var name=m[1], args=m[2].trim()===''?[]:hxSplit(m[2],',');
args.forEach(hxCheckVal);
return function(ev,el){
var fn=window[name]; if(typeof fn!=='function') throw new Error('no function '+name);
// лише власні функції сторінки: вбудовані (alert, eval, setTimeout, fetch…) викликати не можна
if(/\[native code\]/.test(Function.prototype.toString.call(fn))) throw new Error('native function '+name+' is not allowed');
return fn.apply(window,args.map(function(a){ return hxVal(a,ev,el); }));
};
}
if((m=/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)=([\s\S]+)$/.exec(st))&&!ret){
var path=m[1].split('.'), rhs=m[2];
hxCheckVal(rhs);
if(!path.every(function(p){ return !HX_BAD[p]; })) throw new Error('bad path');
return function(ev,el){
var obj=window[path[0]], i;
for(i=1;i<path.length-1;i++) obj=obj[path[i]];
obj[path[path.length-1]]=hxVal(rhs,ev,el);
};
}
if(/^(true|false)$/.test(st)){ var b=st==='true'; return function(){ return b; }; }
throw new Error('unsupported handler: '+st);
}
// src → функція; для повернення «return …» результат останнього оператора з return передається далі
function hxCompile(src){
if(HX_CACHE[src]) return HX_CACHE[src];
var parts=hxSplit(src,';').map(function(p){ return p.trim(); }).filter(Boolean);
var fns=parts.map(function(p){ return {f:hxStmt(p),ret:/^return\b/.test(p)}; });
var run=function(ev,el){
var res;
fns.forEach(function(x){ var v=x.f(ev,el); if(x.ret) res=v; });
return res;
};
return (HX_CACHE[src]=run);
}
function hxRun(src,ev,el){
var res;
try{ res=hxCompile(src)(ev,el); }
catch(e){ if(window.console&&console.error) console.error('[hx]',src,e); }
if(res===false&&ev&&ev.preventDefault) ev.preventDefault();
}
HX_EVENTS.forEach(function(t){
var sel='[data-on-'+t+']';
document.addEventListener(t,function(ev){
var el=ev.target&&ev.target.closest?ev.target.closest(sel):null;
while(el){
hxRun(el.getAttribute('data-on-'+t),ev,el);
if(ev.cancelBubble) break;
el=el.parentElement?el.parentElement.closest(sel):null;
}
});
});
