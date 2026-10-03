/* ══ workout screen (one exercise at a time) ═════════ */
/* Built for one hand between sets. One exercise fills the screen: its name, its sets and "reps left in the
   tank". Everything configured once (unit, right / left, rename, video link, plates, warm-ups, sets) is behind ⋯;
   the how-to video itself is a ▶ next to it.
   A set is logged with +/− steppers or one tap on its circle; the faint numbers are last session's; tapping a
   number opens the keyboard. The rest timer starts itself and RIR is asked once per exercise.
   draft.at = the exercise on screen; draft.ids.length = the wrap-up page (notes, Ask Claude, finish).
   UI only: what a finished workout saves is unchanged. */

const hasReps=r=>!!(r.r||r.r2);
/* a set counts as done (✓, rest timer, RIR) once its reps are in — both sides for right / left sets */
const doneRow=(id,r)=>draft.sides[id]?!!(r.r&&r.r2):hasReps(r);
const bodyOnly=noLoad;   // no weight box (plain bodyweight, holds)
/* stepper sizes. kg: dumbbells, cables and added weight 2.5; machines, barbell and assistance 5.
   lb: 5 / 10. Reps move by 1, seconds (holds) by 5. The next-weight advice keeps its own steps (step()). */
const incOf=(e,u)=>{ const small=e.eq==="dumbbell"||e.eq==="cable"||(e.addw&&!e.assist); return u==="lb"?(small?5:10):(small?2.5:5); };
const repInc=e=>e.sec?5:1;
const fmtW=v=>String(+(+v).toFixed(2));
/* the how-to video: the pinned YouTube link, else a YouTube search for the exercise */
const videoUrl=e=>safeUrl(D.videos[e.id])||("https://www.youtube.com/results?search_query="+encodeURIComponent(e.n+" proper form technique"));
/* drawn icons (emoji glyphs would turn into colour emoji on iPhones) */
const ICON_PAUSE=`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/></svg>`;
const ICON_PLAY=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`;
/* "3+" stays "3+" inside Arabic text */
const rirTxt=v=>`<bdi dir="ltr">${v===3?"3+":v}</bdi>`;
/* rest after a set: the first three exercises (the main lifts) get the longer rest */
const restFor=id=>draft.ids.indexOf(id)<3?D.rest[1]:D.rest[0];
let rirOpen=null,rirNext=null;

/* the faint numbers in an empty box: last session's same set (in today's unit), else the set above in this
   workout, else the bottom of the rep range */
function ghostOf(id,s){
  const e=exDef(id),u=draft.units[id],last=draft.edit==null?lastFor(id,draft.date):null,p=last?.all?.[s];
  const above=draft.entries[id].slice(0,s).filter(hasReps).pop();
  const w=p?.w?(last.u===u?num(p.w):conv(p.w,last.u,u)):above?num(above.w):0;
  const r=num(p?.r)||num(above?.r)||e.lo;
  return {w,r,r2:num(p?.r2)||num(above?.r2)||r};
}

/* ── the screen ── */
function vSession(){
  const n=draft.ids.length,at=Math.min(draft.at||0,n),editing=draft.edit!=null;
  const began=draft.startedAt?` · ${new Date(draft.startedAt).toLocaleTimeString(LOCALE(),{hour:"numeric",minute:"2-digit"})}`:"";
  const prevG=tx("→","←"),nextG=tx("←","→");   // arrows aren't mirrored, so they're picked per direction
  return `<div class="stop">
    <div class="stop-row">
      <button class="iconbtn" id="back" onclick="cancel()" aria-label="${editing?tx("رجوع","Back"):tx("إلغاء","Cancel")}">${editing?prevG:"✕"}</button>
      ${editing?"":`<button class="iconbtn" id="pause" onclick="pauseWorkout()" aria-label="${tx("إيقاف مؤقت","Pause")}">${ICON_PAUSE}</button>`}
      <div class="stitle tap" onclick="pickDate()"><b>${esc(labelText(draft.label,draft.workout))}</b>
        <span class="small muted"><b class="num" id="pos">${at<n?`<bdi dir="ltr">${at+1} / ${n}</bdi>`:tx("الختام","Wrap-up")}</b> · <span class="when">${fdate(draft.date)}${began}</span></span></div>
      <button class="btn lime fin" id="fin" onclick="finish()">${editing?tx("حفظ","Save"):tx("إنهاء","Finish")}</button>
    </div>
    <div id="prog">${progHTML()}</div>
  </div>
  <div class="exview" id="exview">${at<n?exHTML(exDef(draft.ids[at]),at):wrapHTML()}</div>
  <div class="pager">
    <button class="btn light pv" onclick="goEx(draft.at-1)" ${at===0?"disabled":""} aria-label="${tx("اللي فات","Previous")}">${prevG}</button>
    ${at<n?`<div class="ptimer" role="timer"><b id="ptval" dir="auto">${timerText()}</b><button onclick="stopTimer()">${tx("تخطّي","Skip")}</button></div>
      <button class="btn nx" onclick="goEx(draft.at+1)" aria-label="${at===n-1?tx("الختام","Wrap-up"):tx("الجاي","Next")}"><span class="nxl">${at===n-1?tx("الختام","Wrap-up"):tx("الجاي","Next")}</span> ${nextG}</button>`
      :`<button class="btn lime nx" onclick="finish()">${editing?tx("حفظ التعديلات","Save changes"):tx("إنهاء الحصة","Finish workout")}</button>`}
  </div>`;
}
/* one segment per exercise (filled once it has a set; "3 / 7" is in the title), and the minimum-session
   mark after the third */
function progHTML(){
  const n=draft.ids.length,at=Math.min(draft.at||0,n),editing=draft.edit!=null;
  const has=id=>draft.entries[id].some(r=>doneRow(id,r));
  const showMin=!editing&&n>3,minDone=showMin&&draft.ids.slice(0,3).every(has);
  return `<div class="segs">${draft.ids.map((id,i)=>`<button class="seg ${has(id)?"on":""} ${i===at?"cur":""}" onclick="goEx(${i})"
      aria-label="${i+1}. ${esc(draft.names[id])}"></button>${i===2&&showMin?`<span class="minmark" title="${
        tx("تقدر تنهي هنا — تتحسب حصة كاملة","You can stop here — it counts as a full workout")}"></span>`:""}`).join("")}
      ${minDone?`<span class="chip on minchip">${tx("الحد الأدنى تم ✓","Minimum done ✓")}</span>`
        :showMin?`<span class="small muted minchip">${tx("الحد الأدنى: أول 3","Min: first 3")}</span>`:""}</div>`;
}
function exHTML(e,i){
  const id=e.id,editing=draft.edit!=null;
  /* one line of advice: the plateau advice if stalled, else the next-weight tip */
  const pl=editing?null:plateau(id,draft.date),sg=editing||pl?null:suggest(e,draft.date,draft.units[id]);
  return `<div class="ex1" id="ex-${id}">
    <div class="exhead">
      <div class="exnum num">${String(i+1).padStart(2,"0")}</div>
      <div class="exname"><h2>${esc(draft.names[id])}</h2>
        <div class="meta num">${e.lo}–${e.hi} ${e.sec?tx("ث","sec"):tx("عدّة","reps")} · ${EQ[e.eq]}${draft.sides[id]?` · ${tx("يمين / شمال","R / L")}`:""}${D.exNotes[id]?" · 📌":""}</div></div>
      <a class="more vid${D.videos[id]?" pinned":""}" href="${esc(videoUrl(e))}" target="_blank" rel="noopener"
        aria-label="${tx("فيديو الشرح","How-to video")}">${ICON_PLAY}</a>
      <button class="more" onclick="exMenu('${id}')" aria-label="${tx("إعدادات التمرين","Exercise options")}">⋯</button>
    </div>
    ${pl?`<div class="stall">${esc(plateauText(pl,draft.units[id]))}</div>`:sg?`<div class="tip">${esc(sg)}</div>`:""}
    <div class="sets" id="sets-${id}">${setsHTML(e)}</div>
    <div class="rirbox" id="rir-${id}">${rirBoxHTML(id)}</div>
  </div>`;
}
function setsHTML(e){ return draft.entries[e.id].map((_,s)=>rowHTML(e,s)).join(""); }
function rowHTML(e,s){
  const id=e.id,r=draft.entries[id][s],g=ghostOf(id,s),side=draft.sides[id],u=draft.units[id],wt=!bodyOnly(e);
  const unit=e.assist?tx(`مساعدة ${UL[u]}`,`assist ${u}`):e.addw?`+${UL[u]}`:UL[u];
  const reps=e.sec?tx("ثانية","sec"):tx("عدّة","reps");
  const box=(f,ph,mode,cap)=>`<div class="stp stp-${f}">
      <button class="sb" onclick="bump('${id}',${s},'${f}',-1)" aria-label="${esc(cap)} −">−</button>
      <label class="sv"><input id="in-${id}-${s}-${f}" inputmode="${mode}" value="${esc(r[f])}" placeholder="${esc(ph)}"
        oninput="edit('${id}',${s},'${f}',this.value)" aria-label="${esc(cap)}"><span>${esc(cap)}</span></label>
      <button class="sb" onclick="bump('${id}',${s},'${f}',1)" aria-label="${esc(cap)} +">+</button></div>`;
  return `<div class="srow ${wt?"wt":""} ${side?"side":""} ${doneRow(id,r)?"done":""} ${r.warm?"warm":""}" id="row-${id}-${s}">
    <button class="chk" onclick="logSet('${id}',${s})" aria-label="${tx("ست","Set")} ${s+1}${r.warm?` (${tx("تسخين","warm-up")})`:""}">${chkText(id,r,s)}</button>
    ${wt?box("w",g.w?fmtW(g.w):"—","decimal",unit):""}
    ${box("r",String(g.r),"numeric",side?tx(`يمين · ${reps}`,`right · ${reps}`):reps)}
    ${side?box("r2",String(g.r2),"numeric",tx(`شمال · ${reps}`,`left · ${reps}`)):""}
  </div>`;
}
const chkText=(id,r,s)=>doneRow(id,r)?"✓":r.warm?"W":String(s+1);
/* RIR: asked inline once the last set is in (or with a prompt when moving on); then shown small */
function rirBoxHTML(id){
  const v=draft.rir[id],L=draft.entries[id],lastIn=L.length&&doneRow(id,L[L.length-1]);
  const ask=`<div class="rirask"><div class="small">${tx("كام عدّة فضلت في آخر ست؟","Reps left in the tank on the last set?")}</div>
    <div class="rbs">${[0,1,2,3].map(x=>`<button class="rb ${v===x?"on":""}" onclick="setRir('${id}',${x})">${rirTxt(x)}</button>`).join("")}</div></div>`;
  if(rirOpen===id) return ask;
  if(v!==undefined) return `<button class="rirshow" onclick="openRir('${id}')">RIR <b class="num">${rirTxt(v)}</b> · ${tx("تغيير","change")}</button>`;
  if(draft.edit!=null) return `<button class="rirshow" onclick="openRir('${id}')">RIR — · ${tx("إضافة","add")}</button>`;
  return lastIn?ask:"";
}
function wrapHTML(){
  const editing=draft.edit!=null;
  return `<div class="ex1">
    <h2>${tx("الختام","Wrap-up")}</h2>
    <div class="small muted num" id="cnt"></div>
    <div class="card" style="margin-top:12px;padding:4px 16px">${draft.ids.map((id,i)=>{ const L=draft.entries[id].filter(r=>doneRow(id,r));
      return `<div class="row tap" onclick="goEx(${i})"><span>${L.length?"✓":"—"} ${esc(draft.names[id])}</span>
        <span class="small muted num">${L.length?`${L.length} ${tx("ست","sets")}${draft.rir[id]!==undefined?` · RIR ${rirTxt(draft.rir[id])}`:""}`:""}</span></div>`; }).join("")}</div>
    <div class="label">${tx("ملاحظات","Notes")}</div>
    <textarea class="note-in" placeholder="${tx("إحساسك، نوم، ألم، أي حاجة تفتكرها المرة الجاية…","How it felt, sleep, pain, anything to remember next time…")}" oninput="setNote(this.value)">${esc(draft.note||"")}</textarea>
    ${editing?`<div class="card" style="margin-top:12px;padding:6px 18px"><div class="row"><span>${tx("مدة الحصة (دقايق)","Duration (minutes)")}</span>
      <input class="field" inputmode="numeric" placeholder="—" value="${draft.mins||""}" oninput="setMins(this.value)"></div></div>`:""}
    <div style="margin-top:14px"><button class="btn light" onclick="askClaude()">🤖 ${tx("اسأل Claude عن الحصة","Ask Claude about it")}</button></div>
    ${editing?`<div style="margin-top:12px"><button class="btn danger" onclick="delSession()">${tx("حذف الحصة","Delete workout")}</button></div>`:""}
  </div>`;
}

/* ── light repaints (typing keeps the keyboard open, so the inputs themselves are never redrawn) ── */
function paintEx(id){
  draft.entries[id].forEach((r,s)=>{
    const row=document.getElementById(`row-${id}-${s}`); if(!row) return;
    row.classList.toggle("done",doneRow(id,r)); row.classList.toggle("warm",!!r.warm);
    row.querySelector(".chk").textContent=chkText(id,r,s);
    /* the faint numbers follow the sets above (a set with no last time copies the one before it) */
    const g=ghostOf(id,s),ph={w:g.w?fmtW(g.w):"—",r:String(g.r),r2:String(g.r2)};
    for(const f in ph){ const el=document.getElementById(`in-${id}-${s}-${f}`); if(el) el.placeholder=ph[f]; }
  });
  const rb=document.getElementById("rir-"+id); if(rb) rb.innerHTML=rirBoxHTML(id);
  refresh();
}
function refresh(){
  const pg=document.getElementById("prog"); if(pg) pg.innerHTML=progHTML();
  const n=draft.ids.filter(id=>draft.entries[id].some(r=>r.r)).length,cnt=document.getElementById("cnt");
  if(cnt) cnt.textContent=tx(`${n} / ${draft.ids.length} تمارين مسجّلة`,`${n} / ${draft.ids.length} exercises logged`);
}
function redrawSets(id){ const el=document.getElementById("sets-"+id); if(el) el.innerHTML=setsHTML(exDef(id)); paintEx(id); }
const setBox=(id,s,f)=>{ const el=document.getElementById(`in-${id}-${s}-${f}`); if(el) el.value=draft.entries[id][s][f]; };

/* ── logging ── */
/* the rest timer starts by itself when a set becomes done (not warm-ups, not old workouts; Settings can turn it off) */
function autoRest(id,s,before){
  const r=draft.entries[id][s];
  if(!before&&doneRow(id,r)&&!r.warm&&draft.edit==null&&D.autoRest!==false) startTimer(restFor(id));
}
function after(id,s,before){ paintEx(id); saveDraft(); autoRest(id,s,before); }
/* typed */
function edit(id,s,f,v){
  const r=draft.entries[id][s],before=doneRow(id,r);
  r[f]=normNum(v); paintEx(id); saveDraft();
  if(f!=="w") autoRest(id,s,before);
}
/* +/−: from the number in the box, or from the faint one when it's empty; reps down to nothing clears the set */
function bump(id,s,f,dir){
  const e=exDef(id),r=draft.entries[id][s],before=doneRow(id,r),g=ghostOf(id,s);
  if(f==="w"){
    const st=incOf(e,draft.units[id]),v=r.w!==""?num(r.w)+dir*st:g.w?g.w+dir*st:dir>0?st:0;
    r.w=v>0?fmtW(v):"";
  }else{
    const v=(r[f]!==""?num(r[f]):g[f])+dir*repInc(e);
    r[f]=v>0?String(v):"";
  }
  setBox(id,s,f); after(id,s,before); buzz(8);
}
/* one tap on the circle: the set as shown (the faint numbers fill any empty box) */
function logSet(id,s){
  const e=exDef(id),r=draft.entries[id][s],before=doneRow(id,r);
  if(before){ toast(tx("غيّره بـ + و − أو اضغط على الرقم","Change it with + and −, or tap the number")); return; }
  const g=ghostOf(id,s);
  if(!bodyOnly(e)&&r.w===""&&g.w) r.w=fmtW(g.w);
  if(!r.r) r.r=String(g.r);
  if(draft.sides[id]&&!r.r2) r.r2=String(g.r2);
  ["w","r","r2"].forEach(f=>setBox(id,s,f)); after(id,s,before); buzz(12);
}
function setRir(id,v){ draft.rir[id]=v; rirOpen=null; paintEx(id); saveDraft(); buzz(10); }
function openRir(id){ rirOpen=id; paintEx(id); }

/* ── moving between exercises ── */
const needRir=id=>draft.edit==null&&draft.rir[id]===undefined&&!draft.asked?.[id]
  &&draft.entries[id].some(r=>doneRow(id,r)&&!r.warm);
function goEx(i){
  if(!draft) return;
  const n=draft.ids.length; i=Math.max(0,Math.min(n,i));
  if(i===draft.at) return;
  const cur=draft.ids[draft.at];
  if(i>draft.at&&cur&&needRir(cur)) return askRir(cur,()=>goEx(i));
  draft.at=i; rirOpen=null; render(); buzz(8);
}
/* asked once per exercise when leaving it without an answer: a number answers and moves on, Skip moves on,
   Cancel stays */
function askRir(id,then){
  draft.asked={...(draft.asked||{}),[id]:true}; rirNext=then; saveDraft();
  sheet({text:tx("كام عدّة فضلت في آخر ست؟","Reps left in the tank on the last set?"),body:draft.names[id],
    html:`<div class="rbs big">${[0,1,2,3].map(x=>`<button class="rb" onclick="pickRir('${id}',${x})">${rirTxt(x)}</button>`).join("")}</div>`,
    yes:tx("تخطّي","Skip"),onYes:()=>{ const f=rirNext; rirNext=null; f&&f(); }});
}
function pickRir(id,v){ draft.rir[id]=v; saveDraft(); closeSheet(); buzz(10); const f=rirNext; rirNext=null; f&&f(); }
/* FEATURE: the screen stays on while a workout is open (Screen Wake Lock; Settings can turn it off). The
   phone drops the lock whenever the app is in the background, so it's taken again on return. */
let wakeLock=null,waking=false;
async function keepAwake(on){
  on=on&&D.awake!==false&&document.visibilityState==="visible"&&"wakeLock" in navigator;
  try{
    if(on&&!wakeLock&&!waking){
      waking=true; const w=await navigator.wakeLock.request("screen"); waking=false;
      if(!draft||D.awake===false){ w.release(); return; }   // the workout ended while it was being taken
      wakeLock=w; w.addEventListener?.("release",()=>{ if(wakeLock===w) wakeLock=null; });
    }else if(!on&&wakeLock){ const w=wakeLock; wakeLock=null; await w.release(); }
  }catch(e){ waking=false; wakeLock=null; }
}
document.addEventListener("visibilitychange",()=>keepAwake(!!draft));
/* swipe sideways to change exercise (toward the reading direction = next) */
let swipeAt=null;
document.addEventListener("touchstart",e=>{
  swipeAt=draft&&e.touches.length===1&&!e.target.closest("#modal,.pager,.stop")?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
},{passive:true});
document.addEventListener("touchend",e=>{
  if(!swipeAt||!draft) return;
  const t=e.changedTouches[0],dx=t.clientX-swipeAt.x,dy=t.clientY-swipeAt.y; swipeAt=null;
  if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5) return;
  goEx(draft.at+((isAr()?dx>0:dx<0)?1:-1));
},{passive:true});

/* ── ⋯ : everything set up once ── */
function exMenu(id){
  const e=exDef(id),u=draft.units[id],L=draft.entries[id],hl=histLine(id,draft.date,u);
  const chip=(on,label,fn,again=true)=>`<button class="chip ${on?"on":""}" onclick="${fn};${again?`exMenu('${id}')`:""}">${label}</button>`;
  const item=(fn,label)=>`<button class="mi" onclick="closeSheet();${fn}">${label}</button>`;
  sheet({text:draft.names[id],yes:tx("تمام","Done"),html:`
    ${hl?`<div class="small muted num">${esc(hl)}</div>`:""}
    ${D.exNotes[id]?`<div class="setup">📌 ${esc(D.exNotes[id])}</div>`:""}
    ${bodyOnly(e)?"":`<div class="mrow"><span>${tx("الوحدة","Unit")}</span><span class="chips">${["kg","lb"].map(x=>chip(u===x,x,`setUnit('${id}','${x}')`)).join("")}</span></div>`}
    <div class="mrow"><span>${tx("يمين / شمال","Right / left")}</span><span class="chips">${chip(draft.sides[id],draft.sides[id]?tx("أيوه","On"):tx("لأ","Off"),`toggleSide('${id}')`)}</span></div>
    <div class="mrow"><span>${tx("ستات تسخين","Warm-up sets")}</span><span class="chips">${L.map((r,s)=>chip(r.warm,`S${s+1}`,`toggleWarm('${id}',${s})`)).join("")}</span></div>
    <div class="mrow"><span>${tx("عدد الستات","Sets")}</span><span class="chips">
      <button class="chip" onclick="closeSheet();delSet('${id}')" aria-label="${tx("ست أقل","One set fewer")}">−</button><b class="num">${L.length}</b>${chip(false,"+",`addSet('${id}')`)}</span></div>
    <div class="mlist">
      ${item(`swap('${id}')`,`✎ ${tx("بدّل التمرين / غيّر الاسم","Swap / rename")}`)}
      ${item(`pinVideo('${id}')`,`🔗 ${D.videos[id]?tx("غيّر لينك يوتيوب","Change YouTube link"):tx("ثبّت لينك يوتيوب","Pin a YouTube link")}`)}
      ${e.eq==="barbell"?item(`plateCalc('${id}')`,`🧮 ${tx("حاسبة أوزان البار","Plate calculator")}`):""}
      ${item(`editSetup('${id}')`,`📌 ${D.exNotes[id]?tx("عدّل ضبط الجهاز","Edit setup note"):tx("ضبط الجهاز (الكرسي، المسمار…)","Setup note (seat, pin…)")}`)}
      ${item(`startTimer(${restFor(id)})`,`⏱ ${tx(`ابدأ الراحة (${restFor(id)} ث)`,`Start rest (${restFor(id)} s)`)}`)}
    </div>`});
}
/* ── the menu's actions ── */
function toggleWarm(id,s){ const r=draft.entries[id][s]; r.warm=!r.warm; redrawSets(id); saveDraft(); }
function addSet(id){ draft.counts[id]++; draft.entries[id].push({w:"",r:"",r2:"",warm:false}); redrawSets(id); saveDraft(); }
function delSet(id){
  if(draft.counts[id]<=1) return;
  const drop=()=>{ draft.counts[id]--; draft.entries[id].pop(); redrawSets(id); saveDraft(); };
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
