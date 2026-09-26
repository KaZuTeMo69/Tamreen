/* ══ actions ══════════════════════════════════════════ */
function edit(id,s,f,v){ draft.entries[id][s][f]=normNum(v); refresh(); saveDraft(); }
function toggleWarm(id,s){ const r=draft.entries[id][s]; r.warm=!r.warm; redrawSets(id); saveDraft(); }
function setRir(id,v){ draft.rir[id]=draft.rir[id]===v?undefined:v; redrawRir(id); saveDraft(); }
function addSet(id){ draft.counts[id]++; draft.entries[id].push({w:"",r:"",r2:"",warm:false}); redrawSets(id); saveDraft(); }
function delSet(id){
  if(draft.counts[id]<=1) return;
  const drop=()=>{ draft.counts[id]--; draft.entries[id].pop(); redrawSets(id); refresh(); saveDraft(); };
  const r=draft.entries[id][draft.counts[id]-1];   // FIX: ask before dropping a set that has reps
  if(r.r||r.r2) return sheet({text:`تمسح ست ${draft.counts[id]}؟`,body:"فيه عدّات متسجّلة فيه.",yes:"امسح",danger:true,onYes:drop});
  drop();
}
/* FIX: unit / right-left / name changes on an old session stay on that session;
   on a new session they also become the default for next time */
function setUnit(id,u){
  draft.units[id]=u; if(draft.edit==null){ D.units[id]=u; save(); }
  redrawSets(id); saveDraft(); toast("الوحدة: "+u);
}
function toggleSide(id){
  draft.sides[id]=!draft.sides[id]; if(draft.edit==null){ D.sides[id]=draft.sides[id]; save(); }
  render(false);
}
function setProg(id){ progEx=id; render(false); }
function swap(id){
  const old=draft.edit!=null;
  sheet({text:"بدّل التمرين",
    body:old?"الاسم الجديد يتسجّل في الحصة دي بس.":"الاسم الجديد يتسجّل في الحصص الجاية بس — الحصص القديمة بتفضل بأسمائها.",
    value:draft.names[id],yes:"حفظ",
    onYes:v=>{ v=v.trim();
      if(!old){ v?D.swaps[id]=v:delete D.swaps[id]; save(); }
      draft.names[id]=v||byId(id).n; render(false); toast("اتغيّر"); }});
}
function pinVideo(id){
  sheet({text:"لينك يوتيوب للتمرين",body:"سيبه فاضي للرجوع للبحث التلقائي.",value:D.videos[id]||"",yes:"ثبّت",
    onYes:v=>{ v=v.trim();
      if(v){ const u=safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(v)?v:"https://"+v);   // FIX: http(s) links only
        if(!u){ toast("اللينك مش صالح"); return; } D.videos[id]=u; }
      else delete D.videos[id];
      save(); render(false); toast("اتثبّت"); }});
}
/* FIX: works in the exercise's unit, with the bar and plates from settings */
function plateCalc(id){
  const u=draft?.units[id]||unitOf(id),lb=u==="lb",bar=lb?D.barLb:D.bar,plates=lb?D.platesLb:D.plates,U=UL[u];
  sheet({text:"حاسبة أوزان البار",body:`وزن البار ${bar} ${U}. اكتب الوزن الكلي المطلوب.`,value:"",type:"number",yes:"احسب",
    onYes:v=>{
      const total=num(v); if(!total) return;
      let side=(total-bar)/2;
      if(side<0) return sheet({text:"الوزن أقل من البار نفسه",body:`البار لوحده ${bar} ${U}.`,yes:"تمام"});
      const out=[];
      plates.forEach(p=>{ const n=Math.floor(side/p+1e-9); if(n){ out.push(`${n} × ${p}`); side=+(side-n*p).toFixed(2); } });
      sheet({text:`${total} ${U} = بار ${bar} + على كل جنب:`,
        body:(out.join("\n")||"لا شيء")+(side>0.01?`\n(باقي ${side} ${U} مش مظبوط بالأوزان المتاحة)`:""),yes:"تمام"});
    }});
}
function pickDate(){
  sheet({text:"تاريخ الحصة",value:draft.date,type:"date",yes:"حفظ",
    onYes:v=>{ if(v){ draft.date=v; render(false); toast("التاريخ اتغيّر"); } }});
}
/* FIX: a new workout copies the last one's layout — weights and warm-up flags by set number —
   so warm-ups don't shift the pre-filled weights */
function blankDraft(workout,date,edit){
  const entries={},counts={},rir={},units={},names={},sides={},ids=PROGRAM[workout].ex.map(e=>e.id);
  PROGRAM[workout].ex.forEach(e=>{
    const l=edit==null?lastFor(e.id,date):null, all=l?.all||[], u=unitOf(e.id);
    const w=v=>!v?"":l.u===u?v:String(conv(v,l.u,u));   // FIX: last weights in today's unit
    let done=all.length; while(done&&!all[done-1].r) done--;
    counts[e.id]=Math.max(e.sets,done);
    entries[e.id]=Array.from({length:counts[e.id]},(_,i)=>({w:w(all[i]?.w),r:"",r2:"",warm:!!all[i]?.warm}));
    units[e.id]=u; names[e.id]=nameOf(e); sides[e.id]=perSide(e.id);
  });
  /* FEATURE: duration — a workout started today is timed from now; a back-dated one isn't */
  return {workout,ids,entries,counts,rir,units,names,sides,date,edit,note:"",startedAt:date===today()?Date.now():0};
}
/* FEATURE: a note per session, and (old sessions) the duration in minutes — typed, so no redraw */
function setNote(v){ draft.note=v.slice(0,1000); saveDraft(); }
function setMins(v){ draft.mins=Math.round(num(v))||0; saveDraft(); }
function start(){ draft=blankDraft(D.cursor,today(),null); render(); }
function startPast(){
  sheet({text:"تاريخ الحصة اللي فاتت",value:today(),type:"date",yes:"ابدأ",
    onYes:v=>{ draft=blankDraft(D.cursor,v||today(),null); render(); }});
}
/* FIX: an old session shows the exercises it actually has (even ones since taken out of the program,
   which used to be dropped on save), then any the program has added since */
function openSession(i){
  const s=D.sessions[i],entries={},counts={},units={},names={},sides={};
  const own=Object.keys(s.entries||{}),ids=[...own,...PROGRAM[s.workout].ex.map(e=>e.id).filter(id=>!own.includes(id))];
  ids.map(exDef).forEach(e=>{
    const rows=s.entries?.[e.id]||[], n=Math.max(e.sets,rows.length);
    counts[e.id]=n;
    entries[e.id]=Array.from({length:n},(_,k)=>({w:rows[k]?.w||"",r:rows[k]?.r||"",r2:rows[k]?.r2||"",warm:!!rows[k]?.warm}));
    units[e.id]=s.units?.[e.id]||unitOf(e.id);
    names[e.id]=nameIn(s,e.id);
    sides[e.id]=(s.sides||rows.length)?sidesIn(s,e.id):perSide(e.id);
  });
  draft={workout:s.workout,ids,entries,counts,rir:clone(s.rir||{}),units,names,sides,date:s.date,edit:i,
    note:s.note||"",mins:s.mins||0};
  draft.snap=snapOf(draft); render();
}
/* what an edit changes — used to ask before leaving an old session with unsaved changes */
const snapOf=d=>JSON.stringify([d.entries,d.rir,d.units,d.names,d.sides,d.date,d.note,d.mins]);
function skip(){ D.cursor=ORDER[(ORDER.indexOf(D.cursor)+1)%3]; save(); render(); toast("اتبدّل"); }
function cancel(){
  if(draft.edit!=null){
    const leave=()=>{ draft=null; tab="log"; render(); };
    if(snapOf(draft)===draft.snap) return leave();
    return sheet({text:"تخرج من غير ما تحفظ التعديلات؟",yes:"خروج",danger:true,onYes:leave});   // FIX
  }
  sheet({text:"تلغي الحصة من غير حفظ؟",yes:"إلغاء الحصة",danger:true,
    onYes:()=>{ draft=null; stopTimer(); render(); }});
}
function finish(){
  const n=Object.values(draft.entries).filter(r=>r.some(x=>x.r)).length;
  if(!n){ toast("سجّل تمرين واحد على الأقل"); return; }
  const units={},names={},counts={},sides={},entries=clone(draft.entries);
  draft.ids.forEach(id=>{
    units[id]=draft.units[id]; names[id]=draft.names[id]; counts[id]=draft.counts[id];
    if(draft.sides[id]) sides[id]=true;
    else entries[id].forEach(r=>{ r.r2=""; });   // left column was hidden — don't keep stray values
  });
  const rir={}; Object.entries(draft.rir).forEach(([k,v])=>{ if(v!==undefined) rir[k]=v; });
  const rec={date:draft.date,workout:draft.workout,entries,units,names,counts,sides,rir};
  const note=(draft.note||"").trim(); if(note) rec.note=note;
  /* duration: timed for a new workout (kept only if 1–300 minutes), typed when editing an old one */
  const mins=draft.edit!=null?draft.mins:draft.startedAt?Math.round((Date.now()-draft.startedAt)/6e4):0;
  if(mins>=1&&mins<=300) rec.mins=mins;
  D.changedAt=Date.now();
  /* ask the browser to keep this site's data (Safari can clear it after weeks without a visit) */
  try{ navigator.storage?.persisted?.().then(p=>p||navigator.storage.persist()).catch(()=>{}); }catch(e){}
  if(draft.edit!=null){ D.sessions[draft.edit]=rec; draft=null; save(); tab="log"; render(); toast("اتحفظ ✓"); buzz(30); return; }
  D.sessions.push(rec);
  D.cursor=ORDER[(ORDER.indexOf(rec.workout)+1)%3];
  draft=null; stopTimer(); save(); tab="plan"; render();
  toast(rec.mins?`حصة اتسجّلت ✓ · ${ar(rec.mins)} دقيقة`:"حصة اتسجّلت ✓");
  /* FEATURE: records set today */
  const prs=recordMap().get(D.sessions.length-1)||[];
  if(prs.length){
    buzz([60,40,60]);
    sheet({text:`🏆 ${prs.length>1?`${ar(prs.length)} أرقام قياسية جديدة`:"رقم قياسي جديد"}`,
      body:prs.map(pr=>`${nameIn(rec,pr.id)}\n${recordText(pr)}`).join("\n\n"),yes:"تمام"});
  }else buzz(30);
}
function delSession(){
  const i=draft.edit;
  sheet({text:"تحذف الحصة دي نهائيًا؟",yes:"حذف",danger:true,
    onYes:()=>{ D.sessions.splice(i,1); D.changedAt=Date.now(); draft=null; save(); tab="log"; render(); toast("اتحذفت"); buzz(30); }});
}
/* waist and bodyweight logs (see LOGS in views.js) */
function addLog(key){
  const L=LOGS[key],v=num(document.getElementById("log-"+key).value);
  if(!v){ toast("اكتب رقم"); return; }
  D[key].push({date:today(),[L.f]:+L.store(v).toFixed(3)}); D.changedAt=Date.now(); save(); render(false); toast("اتسجّل ✓");
}
function editLog(key,i){
  const L=LOGS[key],x=D[key][i];
  sheet({text:`${L.title} — ${fdate(x.date)}`,body:"سيبه فاضي عشان يتمسح.",value:String(L.show(x[L.f])),yes:"حفظ",
    onYes:v=>{ const n=num(v);
      if(!v.trim()||!n) D[key].splice(i,1); else x[L.f]=+L.store(n).toFixed(3);
      D.changedAt=Date.now(); save(); render(false); toast(n?"اتعدّل":"اتحذف"); }});
}
/* ══ settings ═════════════════════════════════════════ */
function go(t){ tab=t; buzz(10); render(); }
async function installApp(){
  const p=installPrompt; if(!p) return;
  p.prompt(); const {outcome}=await p.userChoice;
  installPrompt=null; render(false); if(outcome==="accepted") toast("اتثبّت ✓");
}
function saved(){ save(); render(false); toast("اتحفظ"); }
/* a number from a settings field, or null (and the field is reset) when it's out of range */
function setting(v,lo,hi,msg){
  const t=normNum(v),n=+t;
  if(!t||isNaN(n)||n<lo||n>hi){ toast(msg); render(false); return null; }
  return n;
}
function setName(v){ D.name=v.trim().slice(0,30); saved(); }
function setDefUnit(u){ D.unit=u; saved(); }
function setGoal(v){ const n=setting(v,1,31,"الهدف من ١ لـ ٣١"); if(n!==null){ D.goal=Math.round(n); saved(); } }
function setRest(i,v){ const n=setting(v,5,900,"الراحة من ٥ لـ ٩٠٠ ثانية"); if(n!==null){ D.rest[i]=Math.round(n); saved(); } }
function setBar(u,v){ const n=setting(v,0,200,"اكتب وزن البار"); if(n!==null){ D[u==="lb"?"barLb":"bar"]=n; saved(); } }
function setPlates(u,v){
  const L=[...new Set(v.split(/[\s,،;]+/).map(num).filter(x=>x>0))].sort((a,b)=>b-a);
  if(!L.length){ toast("اكتب الأوزان مفصولة بفاصلة"); render(false); return; }
  D[u==="lb"?"platesLb":"plates"]=L; saved();
}

/* ══ program editor (FEATURE) ═════════════════════════ */
/* The first change copies the built-in program into D.program. An exercise taken out of the program is
   kept in D.retired so its old sessions still know what it was. Renaming keeps one history (D.swaps);
   "replace" starts a new exercise with its own history. */
const FLAGS=["uni","addw","assist","sec"];
const newExId=()=>"x"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function myProgram(){ if(!D.program) D.program=clone(DEFAULT_PROGRAM); return D.program; }
function programChanged(msg){ loadProgram(); save(); render(false); if(msg) toast(msg); }
const retire=e=>{ D.retired={...D.retired,[e.id]:clone(e)}; };
function exFormHTML(e){
  const box=(f,label)=>`<label class="check"><input type="checkbox" id="f-${f}" ${e[f]?"checked":""}> ${label}</label>`;
  return `<label class="flabel">الاسم<input id="f-n" class="ftext" value="${esc(e.n)}" placeholder="مثلًا Cable Fly"></label>
    <label class="flabel">الأداة<select id="f-eq" class="big">${Object.entries(EQ).map(([k,v])=>
      `<option value="${k}" ${e.eq===k?"selected":""}>${v}</option>`).join("")}</select></label>
    <div class="frow">
      <label class="flabel">عدد الستات<input id="f-sets" inputmode="numeric" value="${e.sets}"></label>
      <label class="flabel">عدّات من<input id="f-lo" inputmode="numeric" value="${e.lo}"></label>
      <label class="flabel">إلى<input id="f-hi" inputmode="numeric" value="${e.hi}"></label></div>
    ${box("uni","كل جنب لوحده (زي البلغاري)")}
    ${box("addw","وزن الجسم + وزن إضافي (زي المتوازي)")}
    ${box("assist","بالمساعدة (زي العقلة على الجهاز)")}
    ${box("sec","بالثواني مش بالعدّات")}`;
}
function readExForm(){
  const val=id=>document.getElementById(id).value, int=id=>Math.round(num(val(id)));
  const e={n:val("f-n").trim().slice(0,80),eq:val("f-eq"),sets:int("f-sets"),lo:int("f-lo"),hi:int("f-hi")};
  FLAGS.forEach(f=>{ e[f]=document.getElementById("f-"+f).checked; });
  if(e.assist) e.addw=true;   // assistance is typed in the weight box, like added weight
  const err=!e.n?"اكتب اسم التمرين":!(e.sets>=1&&e.sets<=10)?"الستات من ١ لـ ١٠"
    :!(e.lo>=1&&e.hi<=100&&e.lo<=e.hi)?"العدّات: من ١ لـ ١٠٠، والأولى أصغر":"";
  return {e,err};
}
/* the form sheet; on a mistake it says what's wrong and opens again with what was typed */
function exForm(title,body,e,done){
  sheet({text:title,body,html:exFormHTML(e),yes:"حفظ",onYes:()=>{
    const r=readExForm(); if(r.err){ toast(r.err); return exForm(title,body,r.e,done); } done(r.e); }});
}
const withFlags=(target,e)=>{ FLAGS.forEach(f=>{ if(e[f]) target[f]=true; else delete target[f]; }); return target; };
const makeEx=e=>withFlags({id:newExId(),n:e.n,eq:e.eq,sets:e.sets,lo:e.lo,hi:e.hi},e);
function editEx(k,i){
  const e=PROGRAM[k].ex[i];
  exForm("تعديل التمرين","نفس التمرين ونفس السجل — لو هتغيّره لتمرين تاني استخدم «استبدال».",{...e,n:nameOf(e)},v=>{
    const cur=myProgram()[k].ex[i];
    Object.assign(cur,{eq:v.eq,sets:v.sets,lo:v.lo,hi:v.hi}); withFlags(cur,v);
    if(v.n!==cur.n) D.swaps[cur.id]=v.n; else delete D.swaps[cur.id];
    programChanged("اتحفظ");
  });
}
function replaceEx(k,i){
  const old=PROGRAM[k].ex[i];
  exForm(`بدل ${nameOf(old)}`,"التمرين الجديد ليه سجل لوحده، والقديم بيفضل في السجل.",
    {n:"",eq:old.eq,sets:old.sets,lo:old.lo,hi:old.hi},v=>{
    const P=myProgram(); retire(P[k].ex[i]); P[k].ex[i]=makeEx(v); programChanged("اتبدّل");
  });
}
function addEx(k){
  exForm(`تمرين جديد في ${PROGRAM[k].label}`,"",{n:"",eq:"machine",sets:3,lo:8,hi:12},v=>{
    myProgram()[k].ex.push(makeEx(v)); programChanged("اتضاف");
  });
}
function removeEx(k,i){
  if(PROGRAM[k].ex.length<=1){ toast("لازم يفضل تمرين واحد على الأقل"); return; }
  const e=PROGRAM[k].ex[i];
  sheet({text:`تشيل ${nameOf(e)} من ${PROGRAM[k].label}؟`,body:"السجل القديم بتاعه بيفضل زي ما هو.",yes:"شيل",danger:true,
    onYes:()=>{ const P=myProgram(); retire(P[k].ex[i]); P[k].ex.splice(i,1); programChanged("اتشال"); }});
}
function moveEx(k,i,d){
  const L=myProgram()[k].ex,j=i+d; if(j<0||j>=L.length) return;
  [L[i],L[j]]=[L[j],L[i]]; programChanged();
}
function editTag(k){
  sheet({text:`وصف ${PROGRAM[k].label}`,value:PROGRAM[k].tag,yes:"حفظ",
    onYes:v=>{ v=v.trim().slice(0,80); if(!v) return; myProgram()[k].tag=v; programChanged("اتحفظ"); }});
}
function resetProgram(){
  sheet({text:"ترجّع البرنامج الأصلي؟",body:"التمارين اللي ضفتها هتتشال من البرنامج، بس سجلها بيفضل.",yes:"رجّع",danger:true,
    onYes:()=>{
      const builtIn=new Set(Object.values(DEFAULT_PROGRAM).flatMap(p=>p.ex.map(e=>e.id)));
      Object.values(PROGRAM).flatMap(p=>p.ex).forEach(e=>{ if(!builtIn.has(e.id)) retire(e); });
      D.program=null; programChanged("رجع الأصلي");
    }});
}
