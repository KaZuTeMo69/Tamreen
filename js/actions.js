/* ══ actions ══════════════════════════════════════════ */
/* FEATURE: the rest timer starts by itself when a set's reps go from empty to typed (not for warm-ups,
   not when editing an old session; Settings can turn it off) */
const hasReps=r=>!!(r.r||r.r2);
function autoRest(id,s,before){
  const r=draft.entries[id][s];
  if(!before&&hasReps(r)&&!r.warm&&draft.edit==null&&D.autoRest!==false) startTimer(D.rest[0]);
}
function edit(id,s,f,v){
  const r=draft.entries[id][s],before=hasReps(r);
  r[f]=normNum(v); refresh(); saveDraft();
  if(f!=="w") autoRest(id,s,before);
}
/* FEATURE: faster logging — copy last time's set, repeat the set above, one more rep */
function copyPrev(id,s){
  const last=lastFor(id,draft.date),p=last?.all[s]; if(!p) return;
  const e=exDef(id),u=draft.units[id],r=draft.entries[id][s],before=hasReps(r);
  if(!(e.eq==="body"&&!e.addw)) r.w=p.w?(last.u===u?String(p.w):String(conv(p.w,last.u,u))):"";
  r.r=p.r||""; r.r2=draft.sides[id]?(p.r2||""):"";
  redrawSets(id); refresh(); saveDraft(); autoRest(id,s,before); buzz(10);
}
function sameAsAbove(id){
  const L=draft.entries[id];
  let k=L.findIndex((r,i)=>i>0&&!hasReps(r)&&L.slice(0,i).some(hasReps));
  if(k<0){ if(!L.some(hasReps)){ toast(tx("سجّل ست الأول","Log a set first")); return; }
    addSet(id); k=L.length-1; }
  const src=L.slice(0,k).filter(hasReps).pop(),r=L[k];
  Object.assign(r,{w:src.w,r:src.r,r2:src.r2,warm:false});
  redrawSets(id); refresh(); saveDraft(); autoRest(id,k,false); buzz(10);
}
function plusRep(id){
  const L=draft.entries[id],r=L.filter(hasReps).pop();
  if(!r){ toast(tx("سجّل ست الأول","Log a set first")); return; }
  if(r.r) r.r=String(num(r.r)+1);
  if(r.r2) r.r2=String(num(r.r2)+1);
  redrawSets(id); saveDraft(); buzz(10);
}
/* FEATURE: a setup note per exercise (seat height, pin, grip), shown on it every workout */
function editSetup(id){
  sheet({text:tx("ضبط الجهاز","Setup note"),body:tx("ارتفاع الكرسي، رقم المسمار، المسكة… بيظهر كل مرة تعمل التمرين ده. سيبه فاضي عشان يتمسح.",
    "Seat height, pin, grip… shown every time you do this exercise. Leave it empty to delete it."),
    value:D.exNotes[id]||"",yes:tx("حفظ","Save"),
    onYes:v=>{ v=v.trim().slice(0,120); if(v) D.exNotes[id]=v; else delete D.exNotes[id];
      D.changedAt=Date.now(); save(); render(false); }});
}
function toggleWarm(id,s){ const r=draft.entries[id][s]; r.warm=!r.warm; redrawSets(id); saveDraft(); }
function setRir(id,v){ draft.rir[id]=draft.rir[id]===v?undefined:v; redrawRir(id); saveDraft(); }
function addSet(id){ draft.counts[id]++; draft.entries[id].push({w:"",r:"",r2:"",warm:false}); redrawSets(id); saveDraft(); }
function delSet(id){
  if(draft.counts[id]<=1) return;
  const drop=()=>{ draft.counts[id]--; draft.entries[id].pop(); redrawSets(id); refresh(); saveDraft(); };
  const r=draft.entries[id][draft.counts[id]-1];   // FIX: ask before dropping a set that has reps
  if(r.r||r.r2) return sheet({text:tx(`تمسح ست ${draft.counts[id]}؟`,`Delete set ${draft.counts[id]}?`),body:tx("فيه عدّات متسجّلة فيه.","It has reps logged."),
    yes:tx("امسح","Delete"),danger:true,onYes:drop});
  drop();
}
/* FIX: unit / right-left / name changes on an old session stay on that session;
   on a new session they also become the default for next time */
function setUnit(id,u){
  draft.units[id]=u; if(draft.edit==null){ D.units[id]=u; save(); }
  redrawSets(id); saveDraft(); toast(tx("الوحدة: ","Unit: ")+u);
}
function toggleSide(id){
  draft.sides[id]=!draft.sides[id]; if(draft.edit==null){ D.sides[id]=draft.sides[id]; save(); }
  render(false);
}
function setProg(id){ progEx=id; render(false); }
/* open the progress tab on one exercise (from the home screen) */
function showProgress(id){ progEx=id; go("prog"); }
/* log calendar: move a month back / forward (not past this month) */
function calShift(d){
  const [Y,M]=(calMonth||ym(today())).split("-").map(Number),t=new Date(Y,M-1+d,1);
  const m=`${t.getFullYear()}-${pad2(t.getMonth()+1)}`;
  if(m>ym(today())) return;
  calMonth=m===ym(today())?null:m; render(false);
}
function swap(id){
  const old=draft.edit!=null;
  sheet({text:tx("بدّل التمرين","Rename the exercise"),
    body:old?tx("الاسم الجديد يتسجّل في الحصة دي بس.","The new name is saved on this workout only.")
      :tx("الاسم الجديد يتسجّل في الحصص الجاية بس — الحصص القديمة بتفضل بأسمائها.","The new name is used from now on — past workouts keep their names."),
    value:draft.names[id],yes:tx("حفظ","Save"),
    onYes:v=>{ v=v.trim();
      if(!old){ v?D.swaps[id]=v:delete D.swaps[id]; save(); }
      draft.names[id]=v||byId(id).n; render(false); toast(tx("اتغيّر","Changed")); }});
}
function pinVideo(id){
  sheet({text:tx("لينك يوتيوب للتمرين","YouTube link for this exercise"),body:tx("سيبه فاضي للرجوع للبحث التلقائي.","Leave it empty to go back to a search."),
    value:D.videos[id]||"",yes:tx("ثبّت","Pin"),
    onYes:v=>{ v=v.trim();
      if(v){ const u=safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(v)?v:"https://"+v);   // FIX: http(s) links only
        if(!u){ toast(tx("اللينك مش صالح","Not a valid link")); return; } D.videos[id]=u; }
      else delete D.videos[id];
      save(); render(false); toast(tx("اتثبّت","Pinned")); }});
}
/* FIX: works in the exercise's unit, with the bar and plates from settings */
function plateCalc(id){
  const u=draft?.units[id]||unitOf(id),lb=u==="lb",bar=lb?D.barLb:D.bar,plates=lb?D.platesLb:D.plates,U=UL[u];
  sheet({text:tx("حاسبة أوزان البار","Plate calculator"),body:tx(`وزن البار ${bar} ${U}. اكتب الوزن الكلي المطلوب.`,`The bar is ${bar} ${U}. Type the total weight you want.`),
    value:"",type:"number",yes:tx("احسب","Work it out"),
    onYes:v=>{
      const total=num(v); if(!total) return;
      let side=(total-bar)/2;
      if(side<0) return sheet({text:tx("الوزن أقل من البار نفسه","Less than the bar itself"),body:tx(`البار لوحده ${bar} ${U}.`,`The bar alone is ${bar} ${U}.`),yes:tx("تمام","OK")});
      const out=[];
      plates.forEach(p=>{ const n=Math.floor(side/p+1e-9); if(n){ out.push(`${n} × ${p}`); side=+(side-n*p).toFixed(2); } });
      sheet({text:tx(`${total} ${U} = بار ${bar} + على كل جنب:`,`${total} ${U} = ${bar} bar + on each side:`),
        body:(out.join("\n")||tx("لا شيء","Nothing"))+(side>0.01?tx(`\n(باقي ${side} ${U} مش مظبوط بالأوزان المتاحة)`,`\n(${side} ${U} left over — no plates for it)`):""),yes:tx("تمام","OK")});
    }});
}
function pickDate(){
  sheet({text:tx("تاريخ الحصة","Workout date"),value:draft.date,type:"date",yes:tx("حفظ","Save"),
    onYes:v=>{ if(v){ draft.date=v; render(false); toast(tx("التاريخ اتغيّر","Date changed")); } }});
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
  sheet({text:tx("تاريخ الحصة اللي فاتت","Date of the past workout"),value:today(),type:"date",yes:tx("ابدأ","Start"),
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
function skip(){ D.cursor=ORDER[(ORDER.indexOf(D.cursor)+1)%3]; save(); render(); toast(tx("اتبدّل","Switched")); }
function cancel(){
  if(draft.edit!=null){
    const leave=()=>{ draft=null; tab="log"; render(); };
    if(snapOf(draft)===draft.snap) return leave();
    return sheet({text:tx("تخرج من غير ما تحفظ التعديلات؟","Leave without saving your changes?"),yes:tx("خروج","Leave"),danger:true,onYes:leave});   // FIX
  }
  sheet({text:tx("تلغي الحصة من غير حفظ؟","Cancel the workout without saving?"),yes:tx("إلغاء الحصة","Cancel workout"),danger:true,
    onYes:()=>{ draft=null; stopTimer(); render(); }});
}
function finish(){
  const n=Object.values(draft.entries).filter(r=>r.some(x=>x.r)).length;
  if(!n){ toast(tx("سجّل تمرين واحد على الأقل","Log at least one exercise")); return; }
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
  if(draft.edit!=null){ D.sessions[draft.edit]=rec; draft=null; save(); tab="log"; render(); toast(tx("اتحفظ ✓","Saved ✓")); buzz(30); return; }
  D.sessions.push(rec);
  D.cursor=ORDER[(ORDER.indexOf(rec.workout)+1)%3];
  draft=null; stopTimer(); save(); tab="plan"; render();
  toast(rec.mins?tx(`حصة اتسجّلت ✓ · ${nl(rec.mins)} دقيقة`,`Workout logged ✓ · ${rec.mins} min`):tx("حصة اتسجّلت ✓","Workout logged ✓"));
  /* FEATURE: records set today */
  const prs=recordMap().get(D.sessions.length-1)||[];
  if(prs.length){
    buzz([60,40,60]);
    sheet({text:`🏆 ${prs.length>1?tx(`${nl(prs.length)} أرقام قياسية جديدة`,`${prs.length} new records`):tx("رقم قياسي جديد","New record")}`,
      body:prs.map(pr=>`${nameIn(rec,pr.id)}\n${recordText(pr)}`).join("\n\n"),yes:tx("تمام","Nice")});
  }else buzz(30);
}
function delSession(){
  const i=draft.edit;
  sheet({text:tx("تحذف الحصة دي نهائيًا؟","Delete this workout for good?"),yes:tx("حذف","Delete"),danger:true,
    onYes:()=>{ D.sessions.splice(i,1); D.changedAt=Date.now(); draft=null; save(); tab="log"; render(); toast(tx("اتحذفت","Deleted")); buzz(30); }});
}
/* waist and bodyweight logs (see LOGS in views.js) */
function addLog(key){
  const G=LOGS[key],v=num(document.getElementById("log-"+key).value);
  if(!v){ toast(tx("اكتب رقم","Type a number")); return; }
  D[key].push({date:today(),[G.f]:+G.store(v).toFixed(3)}); D.changedAt=Date.now(); save(); render(false); toast(tx("اتسجّل ✓","Logged ✓"));
}
function editLog(key,i){
  const G=LOGS[key],x=D[key][i];
  sheet({text:`${G.title} — ${fdate(x.date)}`,body:tx("سيبه فاضي عشان يتمسح.","Leave it empty to delete it."),value:String(G.show(x[G.f])),yes:tx("حفظ","Save"),
    onYes:v=>{ const n=num(v);
      if(!v.trim()||!n) D[key].splice(i,1); else x[G.f]=+G.store(n).toFixed(3);
      D.changedAt=Date.now(); save(); render(false); toast(n?tx("اتعدّل","Updated"):tx("اتحذف","Deleted")); }});
}
/* ══ settings ═════════════════════════════════════════ */
function go(t){ tab=t; buzz(10); render(); }
async function installApp(){
  const p=installPrompt; if(!p) return;
  p.prompt(); const {outcome}=await p.userChoice;
  installPrompt=null; render(false); if(outcome==="accepted") toast(tx("اتثبّت ✓","Installed ✓"));
}
function saved(){ save(); render(false); toast(tx("اتحفظ","Saved")); }
/* a number from a settings field, or null (and the field is reset) when it's out of range */
function setting(v,lo,hi,msg){
  const t=normNum(v),n=+t;
  if(!t||isNaN(n)||n<lo||n>hi){ toast(msg); render(false); return null; }
  return n;
}
function setName(v){ D.name=v.trim().slice(0,30); saved(); }
function setDefUnit(u){ D.unit=u; saved(); }
function setTheme(t){ D.theme=t; applyTheme(); saved(); }
function setAutoRest(v){ D.autoRest=v==="on"; saved(); }
function setGoal(v){ const n=setting(v,1,31,tx("الهدف من 1 لـ 31","The goal is 1 to 31")); if(n!==null){ D.goal=Math.round(n); saved(); } }
function setRest(i,v){ const n=setting(v,5,900,tx("الراحة من 5 لـ 900 ثانية","Rest is 5 to 900 seconds")); if(n!==null){ D.rest[i]=Math.round(n); saved(); } }
function setBar(u,v){ const n=setting(v,0,200,tx("اكتب وزن البار","Type the bar weight")); if(n!==null){ D[u==="lb"?"barLb":"bar"]=n; saved(); } }
function setPlates(u,v){
  const list=[...new Set(v.split(/[\s,،;]+/).map(num).filter(x=>x>0))].sort((a,b)=>b-a);
  if(!list.length){ toast(tx("اكتب الأوزان مفصولة بفاصلة","Type the plates, separated with commas")); render(false); return; }
  D[u==="lb"?"platesLb":"plates"]=list; saved();
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
  return `<label class="flabel">${tx("الاسم","Name")}<input id="f-n" class="ftext" value="${esc(e.n)}" placeholder="${tx("مثلًا Cable Fly","e.g. Cable Fly")}"></label>
    <label class="flabel">${tx("الأداة","Equipment")}<select id="f-eq" class="big">${Object.entries(EQ).map(([k,v])=>
      `<option value="${k}" ${e.eq===k?"selected":""}>${v}</option>`).join("")}</select></label>
    <div class="frow">
      <label class="flabel">${tx("عدد الستات","Sets")}<input id="f-sets" inputmode="numeric" value="${e.sets}"></label>
      <label class="flabel">${tx("عدّات من","Reps from")}<input id="f-lo" inputmode="numeric" value="${e.lo}"></label>
      <label class="flabel">${tx("إلى","to")}<input id="f-hi" inputmode="numeric" value="${e.hi}"></label></div>
    ${box("uni",tx("كل جنب لوحده (زي البلغاري)","One side at a time (like a Bulgarian split squat)"))}
    ${box("addw",tx("وزن الجسم + وزن إضافي (زي المتوازي)","Bodyweight + added weight (like dips)"))}
    ${box("assist",tx("بالمساعدة (زي العقلة على الجهاز)","Assisted (like a machine pull-up)"))}
    ${box("sec",tx("بالثواني مش بالعدّات","Timed in seconds, not reps"))}`;
}
function readExForm(){
  const val=id=>document.getElementById(id).value, int=id=>Math.round(num(val(id)));
  const e={n:val("f-n").trim().slice(0,80),eq:val("f-eq"),sets:int("f-sets"),lo:int("f-lo"),hi:int("f-hi")};
  FLAGS.forEach(f=>{ e[f]=document.getElementById("f-"+f).checked; });
  if(e.assist) e.addw=true;   // assistance is typed in the weight box, like added weight
  const err=!e.n?tx("اكتب اسم التمرين","Type the exercise name"):!(e.sets>=1&&e.sets<=10)?tx("الستات من 1 لـ 10","Sets are 1 to 10")
    :!(e.lo>=1&&e.hi<=100&&e.lo<=e.hi)?tx("العدّات: من 1 لـ 100، والأولى أصغر","Reps are 1 to 100, the first one smaller"):"";
  return {e,err};
}
/* the form sheet; on a mistake it says what's wrong and opens again with what was typed */
function exForm(title,body,e,done){
  sheet({text:title,body,html:exFormHTML(e),yes:tx("حفظ","Save"),onYes:()=>{
    const r=readExForm(); if(r.err){ toast(r.err); return exForm(title,body,r.e,done); } done(r.e); }});
}
const withFlags=(target,e)=>{ FLAGS.forEach(f=>{ if(e[f]) target[f]=true; else delete target[f]; }); return target; };
const makeEx=e=>withFlags({id:newExId(),n:e.n,eq:e.eq,sets:e.sets,lo:e.lo,hi:e.hi},e);
function editEx(k,i){
  const e=PROGRAM[k].ex[i];
  exForm(tx("تعديل التمرين","Edit exercise"),tx("نفس التمرين ونفس السجل — لو هتغيّره لتمرين تاني استخدم «استبدال».",
    "Same exercise, same history — to change it for a different one, use Replace."),{...e,n:nameOf(e)},v=>{
    const cur=myProgram()[k].ex[i];
    Object.assign(cur,{eq:v.eq,sets:v.sets,lo:v.lo,hi:v.hi}); withFlags(cur,v);
    if(v.n!==cur.n) D.swaps[cur.id]=v.n; else delete D.swaps[cur.id];
    programChanged(tx("اتحفظ","Saved"));
  });
}
function replaceEx(k,i){
  const old=PROGRAM[k].ex[i];
  exForm(tx(`بدل ${nameOf(old)}`,`Replace ${nameOf(old)}`),tx("التمرين الجديد ليه سجل لوحده، والقديم بيفضل في السجل.",
    "The new exercise gets its own history; the old one stays in the log."),
    {n:"",eq:old.eq,sets:old.sets,lo:old.lo,hi:old.hi},v=>{
    const P=myProgram(); retire(P[k].ex[i]); P[k].ex[i]=makeEx(v); programChanged(tx("اتبدّل","Replaced"));
  });
}
function addEx(k){
  exForm(tx(`تمرين جديد في ${dayLabel(k)}`,`New exercise in ${dayLabel(k)}`),"",{n:"",eq:"machine",sets:3,lo:8,hi:12},v=>{
    myProgram()[k].ex.push(makeEx(v)); programChanged(tx("اتضاف","Added"));
  });
}
function removeEx(k,i){
  if(PROGRAM[k].ex.length<=1){ toast(tx("لازم يفضل تمرين واحد على الأقل","A day needs at least one exercise")); return; }
  const e=PROGRAM[k].ex[i];
  sheet({text:tx(`تشيل ${nameOf(e)} من ${dayLabel(k)}؟`,`Remove ${nameOf(e)} from ${dayLabel(k)}?`),body:tx("السجل القديم بتاعه بيفضل زي ما هو.","Its history stays as it is."),
    yes:tx("شيل","Remove"),danger:true,
    onYes:()=>{ const P=myProgram(); retire(P[k].ex[i]); P[k].ex.splice(i,1); programChanged(tx("اتشال","Removed")); }});
}
function moveEx(k,i,d){
  const L=myProgram()[k].ex,j=i+d; if(j<0||j>=L.length) return;
  [L[i],L[j]]=[L[j],L[i]]; programChanged();
}
function editTag(k){
  sheet({text:tx(`وصف ${dayLabel(k)}`,`${dayLabel(k)} description`),value:dayTag(k),yes:tx("حفظ","Save"),
    onYes:v=>{ v=v.trim().slice(0,80); if(!v||v===dayTag(k)) return; myProgram()[k].tag=v; programChanged(tx("اتحفظ","Saved")); }});
}
function resetProgram(){
  sheet({text:tx("ترجّع البرنامج الأصلي؟","Go back to the built-in program?"),body:tx("التمارين اللي ضفتها هتتشال من البرنامج، بس سجلها بيفضل.",
    "Exercises you added leave the program, but their history stays."),yes:tx("رجّع","Reset"),danger:true,
    onYes:()=>{
      const builtIn=new Set(Object.values(DEFAULT_PROGRAM).flatMap(p=>p.ex.map(e=>e.id)));
      Object.values(PROGRAM).flatMap(p=>p.ex).forEach(e=>{ if(!builtIn.has(e.id)) retire(e); });
      D.program=null; programChanged(tx("رجع الأصلي","Back to the built-in program"));
    }});
}
