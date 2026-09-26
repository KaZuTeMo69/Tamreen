/* ══ views ════════════════════════════════════════════ */
const avatar=()=>`<button class="avatar" onclick="go('set')" aria-label="الإعدادات">${esc((D.name.trim()[0]||"A").toUpperCase())}</button>`;
const ar=n=>Number(n).toLocaleString("ar-EG");
/* FEATURE: nudge for a backup when something changed and the last one is over a week old */
const needBackup=()=>D.sessions.length&&D.changedAt>D.lastBackup&&daysSince(D.lastBackup)>=7;
function vPlan(){
  const w=PROGRAM[D.cursor],c=monthCount();
  return `<div class="top">
    <div><h1>اللي جاي</h1><div class="sub">${w.label} — ${esc(w.tag)}</div></div>
    ${avatar()}</div>

  <div class="label">أيام الشهر</div>
  <div class="card">
    <div class="row" style="padding-top:0">
      <div><span class="num" style="font-size:30px;font-weight:700">${c}</span><span class="muted num"> / ${D.goal}</span></div>
      ${c>=D.goal?'<span class="chip on">هدف الشهر تم</span>':'<span class="muted small">الشهر هو المقياس، مش الأسبوع</span>'}
    </div>
    <div class="pills">${Array.from({length:D.goal},(_,i)=>`<div class="pill ${i<c?'on':''}"></div>`).join("")}</div>
  </div>

  ${needBackup()?`<div class="note tap" onclick="backup()">${D.lastBackup?`بقالك ${ar(daysSince(D.lastBackup))} يوم من غير نسخة احتياطية`
    :"لسه ماعملتش نسخة احتياطية"} — اضغط هنا واعملها</div>`:""}

  <div class="label">تمارين النهارده</div>
  <div class="card">${w.ex.map((e,i)=>`<div class="row">
      <div><div style="font-weight:${i<3?700:500};color:${i<3?'var(--ink)':'var(--muted)'}">${esc(nameOf(e))}</div>
      <div class="small muted num">${EQ[e.eq]} · ${e.sets} × ${e.lo}–${e.hi}${e.sec?" sec":""}</div></div>
      ${i===2?'<span class="chip on">الحد الأدنى</span>':''}</div>`).join("")}</div>

  <div style="margin-top:22px"><button class="btn" onclick="start()">ابدأ الحصة</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="skip()">بدّل لتمرين تاني</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="startPast()">سجّل حصة بتاريخ قديم</button></div>`;
}

function setsHTML(e){
  const u=draft.units[e.id],side=draft.sides[e.id],last=draft.edit==null?lastFor(e.id,draft.date):null;
  const hideW=(e.eq==="body"&&!e.addw), n=draft.counts[e.id];
  return `<div class="hints"><span class="i"></span><span class="chip w" style="visibility:hidden">W</span>
      ${hideW?"":`<span class="hint" style="flex:1">${e.assist?"مساعدة −":(e.addw?"إضافي":"وزن")} (${esc(u)})</span>`}
      <span class="hint" style="flex:1">${e.sec?"ثواني":(side?"يمين":"عدّات")}</span>
      ${side?'<span class="hint" style="flex:1">شمال</span>':""}
      <span class="prev"></span></div>
    ${Array.from({length:n},(_,s)=>{
      const p=last?.all[s],cur=draft.entries[e.id][s]||{w:"",r:"",r2:"",warm:false};
      const pw=p?.w?(last.u===u?p.w:conv(p.w,last.u,u)):"";   // FIX: last time in today's unit
      return `<div class="set ${cur.warm?"warm":""}"><span class="i">S${s+1}</span>
        <button class="chip w ${cur.warm?"on":""}" onclick="toggleWarm('${e.id}',${s})" title="تسخين">W</button>
        ${hideW?"":`<input inputmode="decimal" placeholder="—" value="${esc(cur.w)}" oninput="edit('${e.id}',${s},'w',this.value)">`}
        <input inputmode="numeric" placeholder="—" value="${esc(cur.r)}" oninput="edit('${e.id}',${s},'r',this.value)">
        ${side?`<input inputmode="numeric" placeholder="—" value="${esc(cur.r2)}" oninput="edit('${e.id}',${s},'r2',this.value)">`:""}
        <span class="prev"${p?.warm?' style="opacity:.55"':""}>${p?.r?`${pw?esc(pw)+"×":""}${esc(p.r)}`:(draft.edit==null?"—":"")}</span></div>`;
    }).join("")}`;
}

function vSession(){
  const p=PROGRAM[draft.workout],editing=draft.edit!=null;
  const card=(e,i)=>{
    const sg=editing?null:suggest(e,draft.date,draft.units[e.id]), hl=histLine(e.id,draft.date,draft.units[e.id]);
    return `<div class="ex" id="ex-${e.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><h3>${esc(draft.names[e.id])}</h3>
          <div class="meta num">${e.lo}–${e.hi} ${e.sec?"SEC":"REPS"} · ${EQ[e.eq]}</div></div>
        <div class="num" style="font-size:22px;color:var(--line);font-weight:700">${String(i+1).padStart(2,"0")}</div>
      </div>
      ${sg?`<div class="tip">${esc(sg)}</div>`:""}
      ${hl?`<div class="hist">${esc(hl)}</div>`:""}
      <div class="ctrls">
        ${(e.eq==="body"&&!e.addw)?"":`<select onchange="setUnit('${e.id}',this.value)">
          <option value="kg" ${draft.units[e.id]==="kg"?"selected":""}>kg</option>
          <option value="lb" ${draft.units[e.id]==="lb"?"selected":""}>lb</option></select>`}
        <button class="chip ${draft.sides[e.id]?"on":""}" onclick="toggleSide('${e.id}')">يمين / شمال</button>
        ${e.eq==="barbell"?`<button class="chip" onclick="plateCalc('${e.id}')">حاسبة الأوزان</button>`:""}
        <a class="chip ${D.videos[e.id]?"ink":""}" href="${esc(safeUrl(D.videos[e.id])||("https://www.youtube.com/results?search_query="+encodeURIComponent(e.n+" proper form technique")))}" target="_blank" rel="noopener">▶ شرح</a>
        <button class="chip" onclick="pinVideo('${e.id}')">${D.videos[e.id]?"غيّر اللينك":"ثبّت لينك"}</button>
        <button class="chip" onclick="swap('${e.id}')">بدّل</button>
      </div>
      <div class="sets" id="sets-${e.id}">${setsHTML(e)}</div>
      <div class="ctrls">
        <button class="chip" onclick="addSet('${e.id}')">+ ست</button>
        <button class="chip" onclick="delSet('${e.id}')">− ست</button>
        <button class="chip" onclick="startTimer(${D.rest[0]})">راحة ${ar(D.rest[0])}</button>
        <button class="chip" onclick="startTimer(${D.rest[1]})">${ar(D.rest[1])}</button>
      </div>
      <div class="rir" id="rir-${e.id}">
        <span class="small muted">كام عدّة فضلت؟</span>
        ${[0,1,2,3].map(v=>`<button class="chip ${draft.rir[e.id]===v?"on":""}" onclick="setRir('${e.id}',${v})">${v===3?"3+":v}</button>`).join("")}
      </div>
    </div>`;};
  return `<div class="top">
    <div><h1>${p.label}</h1>
      <div class="sub tap" onclick="pickDate()">${fdate(draft.date)} · تغيير التاريخ</div></div>
    <button class="btn light" style="width:auto;padding:12px 20px;font-size:15px" onclick="cancel()">${editing?"رجوع":"إلغاء"}</button></div>
  <div style="margin-top:22px">${p.ex.slice(0,3).map(card).join("")}</div>
  ${editing?"":'<div class="divider"><hr><b>تقدر تنهي هنا — تتحسب حصة كاملة</b><hr></div>'}
  ${p.ex.slice(3).map((e,i)=>card(e,i+3)).join("")}
  <div style="margin-top:20px">
    <button class="btn" id="fin" onclick="finish()">${editing?"حفظ التعديلات":"إنهاء الحصة"}</button>
    <div class="small muted num" id="cnt" style="text-align:center;margin-top:10px"></div>
    <div style="margin-top:12px"><button class="btn light" onclick="askClaude()">🤖 اسأل Claude عن الحصة</button></div>
    ${editing?`<div style="margin-top:12px"><button class="btn danger" onclick="delSession()">حذف الحصة</button></div>`:""}</div>`;
}

/* measurement logs shown on the progress tab; bodyweight is stored in kg and shown in the main unit */
const LOGS={
  bw:{f:"kg",title:"وزن الجسم",unit:()=>D.unit,ph:()=>D.unit==="lb"?"بالباوند":"بالكيلو",
    hint:"وزنك بيدخل في حساب العقلة والمتوازي.",
    show:v=>+fromKg(v,D.unit).toFixed(1),store:v=>toKg(v,D.unit),
    diff:d=>`<div class="small muted" style="margin-top:12px">
      ${d?`${d<0?"نزلت":"زادت"} ${Math.abs(d).toFixed(1)} ${UL[D.unit]} من أول وزن`:"نفس أول وزن"}</div>`},
  waist:{f:"cm",title:"محيط الوسط",unit:()=>"cm",ph:()=>"بالسنتيمتر",
    hint:"قيس كل ٤ أسابيع بس.",
    show:v=>v,store:v=>v,
    diff:d=>`<div class="small" style="margin-top:12px;color:${d<0?'var(--sage-ink)':'var(--muted)'}">
      ${d<0?`نزلت ${Math.abs(d).toFixed(1)} سم من أول قياس`:`فرق ${d.toFixed(1)} سم عن أول قياس`}</div>`}};
function logCard(key){
  const L=LOGS[key],list=D[key],val=x=>L.show(x[L.f]);
  const diff=list.length>1?val(list[list.length-1])-val(list[0]):null;
  return `<div class="label">${L.title}</div>
  <div class="card">
    <div style="display:flex;gap:10px">
      <input id="log-${key}" inputmode="decimal" placeholder="${L.ph()}" style="text-align:right;font-family:inherit;font-size:16px">
      <button class="btn sage" style="width:auto;padding:12px 22px;font-size:15px" onclick="addLog('${key}')">سجّل</button></div>
    ${list.length?`<div style="margin-top:8px">${list.map((x,i)=>`<div class="row tap" onclick="editLog('${key}',${i})">
      <div class="num" style="font-weight:700;font-size:19px">${esc(val(x))}<span class="small muted"> ${L.unit()}</span></div>
      <div class="small muted num">${fdate(x.date)} · تعديل</div></div>`).join("")}</div>
      ${diff!==null?L.diff(diff):""}`
    :`<div class="small muted" style="margin-top:12px">${L.hint}</div>`}
  </div>`;
}

function vProg(){
  const ex=byId(progEx),u=unitOf(progEx),h=historyOf(progEx).map(x=>({date:x.date,t:topSet(x)}));
  const max=Math.max(1,...h.map(x=>x.t.sc)),peak=Math.max(0,...h.map(x=>x.t.sc));
  const noBw=ex.addw&&!D.bw.length;
  /* FIX: shown in the exercise's unit, as a left-to-right block so "kg" doesn't reorder the numbers;
     dips / pull-ups say what the number is */
  const setText=t=>t.kg?`${ex.assist?"مساعدة ":""}<span dir="ltr">${ex.addw&&!ex.assist?"+":""}${wIn(t,u)} ${esc(u)} × ${t.reps}</span>`
    :`${t.reps} ${ex.sec?"ثانية":"عدّة"}`;
  const rm=t=>(t.kg||ex.addw)&&!noBw&&!ex.sec?` · ≈${Math.round(fromKg(t.sc,u))} 1RM`:"";
  return `<div class="top"><div><h1>التقدم</h1><div class="sub">الأرقام مش المرايا</div></div>${avatar()}</div>

  <div class="label">تمرين واحد عبر الوقت</div>
  <select class="big" onchange="setProg(this.value)">
    ${ORDER.map(k=>`<optgroup label="${PROGRAM[k].label}">${PROGRAM[k].ex.map(e=>
      `<option value="${e.id}" ${e.id===progEx?"selected":""}>${esc(nameOf(e))}</option>`).join("")}</optgroup>`).join("")}
  </select>
  <div class="card" style="margin-top:12px">
    ${h.length?`<div class="bars">${h.slice(-10).map(x=>
      `<div class="${x.t.sc===peak?"best":""}" style="height:${Math.max(8,x.t.sc/max*100)}%"></div>`).join("")}</div>
      <div style="margin-top:14px">${h.slice(-4).reverse().map(x=>`<div class="row">
        <div class="num" style="font-weight:700">${setText(x.t)}</div>
        <div class="small muted num">${fdate(x.date)}${rm(x.t)}</div></div>`).join("")}</div>
      <div class="small muted" style="margin-top:12px">أعلى ست شغل في كل حصة (التسخين مستبعد).${
        ex.addw?(noBw?" سجّل وزن جسمك تحت عشان الحساب يبقى دقيق.":" محسوب بوزن جسمك."):""}</div>`
    :'<div class="muted small">التمرين ده لسه ماتسجلش.</div>'}
  </div>

  ${logCard("bw")}
  ${logCard("waist")}`;
}

/* FEATURE: settings — saved as soon as a field changes */
function vSet(){
  const lbUsed=D.unit==="lb"||Object.values(D.units).includes("lb");
  const row=(label,ctl)=>`<div class="row"><span>${label}</span>${ctl}</div>`;
  const field=(val,on,mode="decimal")=>`<input class="field" inputmode="${mode}" value="${esc(val)}" onchange="${on}">`;
  const plates=u=>`<div class="row stack"><span>الأوزان المتاحة (${UL[u]}) — افصل بفاصلة</span>
    <input class="field" dir="ltr" value="${esc(D[u==="lb"?"platesLb":"plates"].join(", "))}" onchange="setPlates('${u}',this.value)"></div>`;
  return `<div class="top"><div><h1>الإعدادات</h1><div class="sub">محفوظة على الموبايل ده</div></div>${avatar()}</div>

  <div class="label">عنك</div>
  <div class="card">
    ${row("الاسم",`<input class="field txt" value="${esc(D.name)}" placeholder="اختياري" onchange="setName(this.value)">`)}
    ${row("الوحدة الأساسية",`<span>${["kg","lb"].map(u=>
      `<button class="chip ${D.unit===u?"on":""}" onclick="setDefUnit('${u}')">${u}</button>`).join(" ")}</span>`)}
    ${row("هدف الحصص في الشهر",field(D.goal,"setGoal(this.value)","numeric"))}
  </div>
  <div class="small muted" style="margin-top:8px">الوحدة الأساسية للتمارين اللي ماختارتلهاش وحدة، ولوزن الجسم.</div>

  <div class="label">أزرار الراحة (ثواني)</div>
  <div class="card">
    ${row("الزرار الأول",field(D.rest[0],"setRest(0,this.value)","numeric"))}
    ${row("الزرار التاني",field(D.rest[1],"setRest(1,this.value)","numeric"))}
  </div>

  <div class="label">حاسبة أوزان البار</div>
  <div class="card">
    ${row(`وزن البار (${UL.kg})`,field(D.bar,"setBar('kg',this.value)"))}
    ${plates("kg")}
    ${lbUsed?row(`وزن البار (${UL.lb})`,field(D.barLb,"setBar('lb',this.value)"))+plates("lb"):""}
  </div>
  <div class="small muted" style="margin-top:12px">وزن الجسم بيتسجّل في صفحة التقدم.</div>`;
}

function vLog(){
  return `<div class="top"><div><h1>السجل</h1><div class="sub">${D.sessions.length} حصة</div></div>${avatar()}</div>
  <div class="label">اضغط على أي حصة للتعديل أو الحذف</div>
  ${D.sessions.length?`<div class="card">${D.sessions.map((s,i)=>({s,i}))
    .sort((a,b)=>a.s.date<b.s.date?1:-1).map(({s,i})=>`
    <div class="row tap" onclick="openSession(${i})">
      <div><div style="font-weight:700">${PROGRAM[s.workout].label}</div>
      <div class="small muted num">${Math.round(volume(s)).toLocaleString("en")} kg إجمالي</div></div>
      <div class="small muted num">${fdate(s.date)} ›</div></div>`).join("")}</div>`
   :'<div class="card muted small">مفيش حصص لسه.</div>'}
  <div class="label">النسخ الاحتياطي</div>
  <div class="card small muted">الداتا محفوظة على الموبايل بس. اعمل نسخة كل شوية — لو مسحت التطبيق أو الجهاز اتصفّر، مفيش استرجاع من غيرها.
    <div style="margin-top:8px;font-weight:700;color:var(--ink)">${!D.lastBackup?"لسه ماعملتش نسخة احتياطية."
      :daysSince(D.lastBackup)?`آخر نسخة: من ${ar(daysSince(D.lastBackup))} يوم.`:"آخر نسخة: النهارده."}</div></div>
  <div style="margin-top:12px"><button class="btn light" onclick="backup()">نسخة احتياطية (JSON)</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="restore()">استرجاع من ملف</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="exportCSV()">تصدير CSV</button></div>
  <div style="margin-top:10px"><button class="btn danger" onclick="wipe()">مسح كل البيانات</button></div>`;
}

/* ══ render ═══════════════════════════════════════════ */
function render(toTop=true){
  const y=window.scrollY;
  document.getElementById("app").innerHTML =
    draft?vSession():tab==="prog"?vProg():tab==="log"?vLog():tab==="set"?vSet():vPlan();
  document.getElementById("nav").classList.toggle("hide",!!draft);
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
  if(draft) refresh();
  saveDraft();
  window.scrollTo(0,toTop?0:y);
}
function refresh(){
  const p=PROGRAM[draft.workout];
  const n=Object.values(draft.entries).filter(r=>r.some(x=>x.r)).length;
  const cnt=document.getElementById("cnt"),fin=document.getElementById("fin");
  if(cnt) cnt.textContent=`${n} / ${p.ex.length} تمارين مسجّلة`;
  if(fin&&draft.edit==null) fin.textContent=n?`إنهاء الحصة (${n})`:"إنهاء الحصة";
}
function redrawSets(id){ const el=document.getElementById("sets-"+id); if(el) el.innerHTML=setsHTML(byId(id)); }
function redrawRir(id){
  const el=document.getElementById("rir-"+id); if(!el) return;
  el.innerHTML=`<span class="small muted">كام عدّة فضلت؟</span>`+
    [0,1,2,3].map(v=>`<button class="chip ${draft.rir[id]===v?"on":""}" onclick="setRir('${id}',${v})">${v===3?"3+":v}</button>`).join("");
}
