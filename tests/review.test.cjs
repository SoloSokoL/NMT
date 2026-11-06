const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app={innerHTML:''};
const element={classList:{add(){},remove(){},toggle(){},contains(){return false;}},style:{setProperty(){}},setAttribute(){}};
const doc={addEventListener(){},documentElement:{removeAttribute(){},setAttribute(){}},body:element,querySelector(){return null;},querySelectorAll(){return [];},getElementById(id){return id==='app'?app:null;}};
const ctx=vm.createContext({console,Date,Math,JSON,URL,Blob,document:doc,navigator:{},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout(){},clearTimeout(){},addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}};}});
ctx.window=ctx;
for(const name of ['topics','weights','links','state','events','core','errors','stats','cards','sync','ai','review','app']){
 let code=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app') code=code.slice(0,code.lastIndexOf('\ninit('));
 vm.runInContext(code,ctx,{filename:name+'.js'});
}
ctx.cloudSave=()=>{};
ctx.afterRender=()=>{};
let cases=0;
function test(name,run){run();cases++;console.log('PASS '+name);}
function reset(){
 ctx.STATE={ver:3,math:{},ukr:{},hist:{},eng:{}};
 ctx.norm();
 ctx.UI.review={tab:'topics',subject:'',mode:'due',query:'',limit:20,session:null};
}
function topic(s,i,days,conf=2){
 ctx.STATE[s][ctx.TID[s][i]]={done:true,ts:Date.now()-days*ctx.DAY,last:Date.now()-days*ctx.DAY,rv:0,conf};
}
reset();
test('empty queue renders helpful state and disables sessions',()=>{
 const html=ctx.reviewHTML();
 assert.match(html,/review-empty/);assert.match(html,/disabled/);assert.match(html,/role="tabpanel"/);
});
test('only completed topics enter queue; overdue order and weak tie break',()=>{
 topic('math',0,8);topic('ukr',0,4);topic('hist',0,0);
 ctx.STATE.math[ctx.TID.math[1]]={done:false,last:1};
 let items=ctx.reviewItems();assert.equal(items.length,3);assert.equal(items[0].s,'math');
 assert.equal(ctx.reviewFiltered().length,2);
});
test('subject, search, upcoming, weak and all filters',()=>{
 ctx.UI.review.subject='ukr';assert.equal(ctx.reviewFiltered().length,1);
 ctx.UI.review.query='__no_such_topic__';assert.equal(ctx.reviewFiltered().length,0);
 ctx.UI.review.query='';ctx.UI.review.subject='';ctx.UI.review.mode='soon';assert.equal(ctx.reviewFiltered().length,1);
 ctx.UI.review.mode='all';assert.equal(ctx.reviewFiltered().length,3);
 ctx.STATE.math[ctx.TID.math[0]].conf=1;ctx.UI.review.mode='weak';assert.equal(ctx.reviewFiltered().length,1);
});
test('session requires reveal, saves each answer, and produces accurate summary',()=>{
 ctx.UI.review.mode='due';ctx.reviewStart(5);
 assert.equal(ctx.UI.review.session.items.length,2);
 ctx.reviewAnswer(true);assert.equal(ctx.UI.review.session.pos,0);
 ctx.reviewReveal();ctx.reviewAnswer(true);
 assert.equal(ctx.UI.review.session.pos,1);assert.equal(ctx.STATE.math[ctx.TID.math[0]].rv,1);
 ctx.reviewReveal();ctx.reviewAnswer(false);
 assert.equal(ctx.UI.review.session.remembered,1);assert.equal(ctx.UI.review.session.forgot,1);
 assert.equal(ctx.STATE.ukr[ctx.TID.ukr[0]].rv,0);
 assert.equal(ctx.STATE.dst[ctx.isoDay(Date.now())].rv,2);
 assert.match(ctx.reviewSessionHTML(),/role="status"/);
 assert.equal(ctx.reviewFiltered().length,0);
});
test('old test results survive recall and cannot complete unlearned topics',()=>{
 let d=ctx.STATE.math[ctx.TID.math[0]];d.pct=85;d.pts=1;
 ctx.reviewSave('math',0,false);assert.equal(d.pct,85);assert.equal(d.pts,1);
 assert.equal(ctx.reviewSave('math',1,true),false);
 assert.equal(ctx.fixTopic(d).last,d.last);
});
test('pagination shows all matches beyond first 20',()=>{
 reset();for(let i=0;i<25;i++)topic('math',i,8);
 assert.equal((ctx.reviewListHTML().match(/<article/g)||[]).length,20);
 ctx.reviewMore();assert.equal((ctx.reviewListHTML().match(/<article/g)||[]).length,25);
});
test('user notes are escaped and all delegated handlers compile',()=>{
 ctx.STATE.math[ctx.TID.math[0]].note='<img src=x onerror=alert(1)>';
 ctx.reviewOne('math',0);ctx.reviewReveal();
 assert.match(ctx.reviewSessionHTML(),/&lt;img/);
 const views=[ctx.reviewHTML()];
 ctx.reviewClose();views.push(ctx.reviewHTML());
 ctx.UI.review.tab='cards';views.push(ctx.reviewHTML());
 for(const html of views){
  const converted=ctx.hx(html);
  assert.doesNotMatch(converted,/\\sonclick=/);
  for(const m of converted.matchAll(/data-on-\\w+="([^"]*)"/g))ctx.hxCompile(m[1]);
 }
});
test('full app integrates review and original progress views',()=>{
 ctx.UI.review.tab='topics';ctx.render();
 assert.match(app.innerHTML,/id="reviewBox"/);assert.match(app.innerHTML,/subjects-grid/);
 assert.equal((app.innerHTML.match(/id="reviewBox"/g)||[]).length,1);
});
test('offline cache includes both new assets and cache version changed',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(sw,/nmt-v17/);assert.match(sw,/js\/review.js/);assert.match(sw,/css\/review.css/);
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(index.indexOf('js/review.js')<index.indexOf('js/app.js'));
});
console.log(cases+' checks passed');
