/* ══ views ════════════════════════════════════════════ */
function vPlan(){
  const w=PROGRAM[D.cursor],c=monthCount();
  return `<div class="top">
    <div><h1>اللي جاي</h1><div class="sub">${w.label} — ${esc(w.tag)}</div></div>
    <div class="avatar">A</div></div>

  <div class="label">أيام الشهر</div>
  <div class="card">
    <div class="row" style="padding-top:0">
      <div><span class="num" style="font-size:30px;font-weight:700">${c}</span><span class="muted num"> / ${GOAL}</span></div>
      ${c>=GOAL?'<span class="chip on">هدف الشهر تم</span>':'<span class="muted small">الشهر هو المقياس، مش الأسبوع</span>'}
    </div>
    <div class="pills">${Array.from({length:GOAL},(_,i)=>`<div class="pill ${i<c?'on':''}"></div>`).join("")}</div>
  </div>

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
      ${hideW?"":`<span class="hint" style="flex:1">${e.assist?"مساعدة −":(e.addw?"إضافي":"وزن")} (${u})</span>`}
      <span class="hint" style="flex:1">${e.sec?"ثواني":(side?"يمين":"عدّات")}</span>
      ${side?'<span class="hint" style="flex:1">شمال</span>':""}
      <span class="prev"></span></div>
    ${Array.from({length:n},(_,s)=>{
      const p=last?.all[s],cur=draft.entries[e.id][s]||{w:"",r:"",r2:"",warm:false};
      return `<div class="set ${cur.warm?"warm":""}"><span class="i">S${s+1}</span>
        <button class="chip w ${cur.warm?"on":""}" onclick="toggleWarm('${e.id}',${s})" title="تسخين">W</button>
        ${hideW?"":`<input inputmode="decimal" placeholder="—" value="${esc(cur.w)}" oninput="edit('${e.id}',${s},'w',this.value)">`}
        <input inputmode="numeric" placeholder="—" value="${esc(cur.r)}" oninput="edit('${e.id}',${s},'r',this.value)">
        ${side?`<input inputmode="numeric" placeholder="—" value="${esc(cur.r2)}" oninput="edit('${e.id}',${s},'r2',this.value)">`:""}
        <span class="prev"${p?.warm?' style="opacity:.55"':""}>${p?.r?`${p.w?esc(p.w)+"×":""}${esc(p.r)}`:(draft.edit==null?"—":"")}</span></div>`;
    }).join("")}`;
}

function vSession(){
  const p=PROGRAM[draft.workout],editing=draft.edit!=null;
  const card=(e,i)=>{
    const sg=editing?null:suggest(e,draft.date), hl=histLine(e.id,draft.date);
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
        <a class="chip ${D.videos[e.id]?"ink":""}" href="${esc(D.videos[e.id]||("https://www.youtube.com/results?search_query="+encodeURIComponent(e.n+" proper form technique")))}" target="_blank" rel="noopener">▶ شرح</a>
        <button class="chip" onclick="pinVideo('${e.id}')">${D.videos[e.id]?"غيّر اللينك":"ثبّت لينك"}</button>
        <button class="chip" onclick="swap('${e.id}')">بدّل</button>
      </div>
      <div class="sets" id="sets-${e.id}">${setsHTML(e)}</div>
      <div class="ctrls">
        <button class="chip" onclick="addSet('${e.id}')">+ ست</button>
        <button class="chip" onclick="delSet('${e.id}')">− ست</button>
        <button class="chip" onclick="startTimer(90)">راحة ٩٠</button>
        <button class="chip" onclick="startTimer(120)">١٢٠</button>
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
    ${editing?`<div style="margin-top:12px"><button class="btn danger" onclick="delSession()">حذف الحصة</button></div>`:""}</div>`;
}

function vProg(){
  const ex=byId(progEx),h=historyOf(progEx).map(x=>({date:x.date,t:topSet(x)}));
  const max=Math.max(1,...h.map(x=>x.t.sc)),peak=Math.max(0,...h.map(x=>x.t.sc));
  const w=D.waist,diff=w.length>1?(w[w.length-1].cm-w[0].cm):null;
  return `<div class="top"><div><h1>التقدم</h1><div class="sub">الأرقام مش المرايا</div></div><div class="avatar">A</div></div>

  <div class="label">تمرين واحد عبر الوقت</div>
  <select class="big" onchange="setProg(this.value)">
    ${ORDER.map(k=>`<optgroup label="${PROGRAM[k].label}">${PROGRAM[k].ex.map(e=>
      `<option value="${e.id}" ${e.id===progEx?"selected":""}>${esc(nameOf(e))}</option>`).join("")}</optgroup>`).join("")}
  </select>
  <div class="card" style="margin-top:12px">
    ${h.length?`<div class="bars">${h.slice(-10).map(x=>
      `<div class="${x.t.sc===peak?"best":""}" style="height:${Math.max(8,x.t.sc/max*100)}%"></div>`).join("")}</div>
      <div style="margin-top:14px">${h.slice(-4).reverse().map(x=>`<div class="row">
        <div class="num" style="font-weight:700">${x.t.kg?`${+x.t.kg.toFixed(1)} kg × ${x.t.reps}`:`${x.t.reps} عدّة`}</div>
        <div class="small muted num">${fdate(x.date)}${x.t.kg?` · ≈${Math.round(x.t.sc)} 1RM`:""}</div></div>`).join("")}</div>
      <div class="small muted" style="margin-top:12px">أعلى ست شغل في كل حصة (التسخين مستبعد).</div>`
    :'<div class="muted small">التمرين ده لسه ماتسجلش.</div>'}
  </div>

  <div class="label">محيط الوسط</div>
  <div class="card">
    <div style="display:flex;gap:10px">
      <input id="waist" inputmode="decimal" placeholder="بالسنتيمتر" style="text-align:right;font-family:inherit;font-size:15px">
      <button class="btn sage" style="width:auto;padding:12px 22px;font-size:15px" onclick="addWaist()">سجّل</button></div>
    ${w.length?`<div style="margin-top:8px">${w.map((x,i)=>`<div class="row tap" onclick="editWaist(${i})">
      <div class="num" style="font-weight:700;font-size:19px">${x.cm}<span class="small muted"> cm</span></div>
      <div class="small muted num">${fdate(x.date)} · تعديل</div></div>`).join("")}</div>
      ${diff!==null?`<div class="small" style="margin-top:12px;color:${diff<0?'var(--sage-ink)':'var(--muted)'}">
      ${diff<0?`نزلت ${Math.abs(diff).toFixed(1)} سم من أول قياس`:`فرق ${diff.toFixed(1)} سم عن أول قياس`}</div>`:""}`
    :'<div class="small muted" style="margin-top:12px">قيس كل ٤ أسابيع بس.</div>'}
  </div>`;
}

function vLog(){
  return `<div class="top"><div><h1>السجل</h1><div class="sub">${D.sessions.length} حصة</div></div><div class="avatar">A</div></div>
  <div class="label">اضغط على أي حصة للتعديل أو الحذف</div>
  ${D.sessions.length?`<div class="card">${D.sessions.map((s,i)=>({s,i}))
    .sort((a,b)=>a.s.date<b.s.date?1:-1).map(({s,i})=>`
    <div class="row tap" onclick="openSession(${i})">
      <div><div style="font-weight:700">${PROGRAM[s.workout].label}</div>
      <div class="small muted num">${Math.round(volume(s)).toLocaleString("en")} kg إجمالي</div></div>
      <div class="small muted num">${fdate(s.date)} ›</div></div>`).join("")}</div>`
   :'<div class="card muted small">مفيش حصص لسه.</div>'}
  <div class="label">النسخ الاحتياطي</div>
  <div class="card small muted">الداتا محفوظة على الموبايل بس. اعمل نسخة كل شوية — لو مسحت التطبيق أو الجهاز اتصفّر، مفيش استرجاع من غيرها.</div>
  <div style="margin-top:12px"><button class="btn light" onclick="backup()">نسخة احتياطية (JSON)</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="restore()">استرجاع من ملف</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="exportCSV()">تصدير CSV</button></div>
  <div style="margin-top:10px"><button class="btn danger" onclick="wipe()">مسح كل البيانات</button></div>`;
}

/* ══ render ═══════════════════════════════════════════ */
function render(toTop=true){
  const y=window.scrollY;
  document.getElementById("app").innerHTML =
    draft?vSession():tab==="plan"?vPlan():tab==="prog"?vProg():vLog();
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
