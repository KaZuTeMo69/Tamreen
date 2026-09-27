/* ══ views ════════════════════════════════════════════ */
/* the name in bold at the top left of the main screens; tapping it opens Settings */
const me=()=>`<div class="me-bar"><button class="me${D.name.trim()?"":" empty"}" dir="auto" onclick="go('set')" aria-label="${tx("الإعدادات","Settings")}">${
  esc(D.name.trim())||tx("اكتب اسمك","Add your name")}</button></div>`;
/* FEATURE: nudge for a backup when something changed and the last one is over a week old */
const needBackup=()=>D.sessions.length&&D.changedAt>D.lastBackup&&daysSince(D.lastBackup)>=7;
/* FEATURE: home screen — next workout (lime), this week and the month goal, bodyweight (violet),
   the last workout and recent records. Every card opens the screen with the details. */
const agoDays=n=>n<=0?tx("النهارده","today"):n===1?tx("امبارح","yesterday"):tx(`من ${nl(n)} يوم`,`${n} days ago`);
/* a small ring: done / goal */
function ringSVG(done,goal){
  const r=34,c=2*Math.PI*r,f=Math.min(1,done/Math.max(1,goal));
  return `<svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle class="track" cx="42" cy="42" r="${r}"/>
    ${f?`<circle class="fill" cx="42" cy="42" r="${r}" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>`:""}</svg>`;
}
/* a line through the last weigh-ins, oldest → newest in reading order */
function sparkSVG(vals){
  if(vals.length<2) return "";
  const W=120,H=34,lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||1,n=vals.length;
  const pt=(v,i)=>{ const x=2+i*(W-4)/(n-1); return `${(isAr()?W-x:x).toFixed(1)},${(3+(1-(v-lo)/span)*(H-6)).toFixed(1)}`; };
  const last=pt(vals[n-1],n-1).split(",");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${vals.map(pt).join(" ")}"/><circle cx="${last[0]}" cy="${last[1]}" r="3"/></svg>`;
}
function vPlan(){
  const w=PROGRAM[D.cursor],c=monthCount(),now=today();
  /* this week, Saturday first */
  const ws=weekStart(now),trained=new Set(D.sessions.map(s=>s.date));
  const week=Array.from({length:7},(_,i)=>addDays(ws,i)),weekN=week.filter(d=>trained.has(d)).length;
  const letters=isAr()?["س","ح","ن","ث","ر","خ","ج"]:["S","S","M","T","W","T","F"];
  /* bodyweight: latest and change since the first weigh-in, in the main unit */
  const bw=[...D.bw].sort((a,b)=>a.date<b.date?-1:1),bwShow=x=>LOGS.bw.show(x.kg);
  const bwDiff=bw.length>1?+(bwShow(bw[bw.length-1])-bwShow(bw[0])).toFixed(1):0;
  /* the latest workout, and the latest records */
  const order=D.sessions.map((s,i)=>({s,i})).sort((a,b)=>a.s.date<b.s.date?1:a.s.date>b.s.date?-1:b.i-a.i);
  const prs=recordMap(),last=order[0];
  const recent=order.flatMap(({s,i})=>(prs.get(i)||[]).map(pr=>({s,i,pr}))).slice(0,3);
  const lastSets=last?Object.values(last.s.entries||{}).reduce((n,rows)=>n+working(rows).length,0):0;
  /* stalled exercises in the program, longest first */
  const stalled=[...new Set(ORDER.flatMap(k=>PROGRAM[k].ex.map(e=>e.id)))].map(id=>plateau(id)).filter(Boolean)
    .sort((a,b)=>b.since-a.since).slice(0,3);
  return `${me()}<div class="top"><div><h1>${tx("اللي جاي","Next up")}</h1>
    <div class="sub">${new Date(now+"T00:00:00").toLocaleDateString(LOCALE(),{weekday:"long",day:"numeric",month:"long"})}</div></div></div>

  <div class="hero">
    <div class="hero-head"><span class="eyebrow">${tx("الحصة الجاية","Next workout")}</span>
      <span class="small">${tx(`${nl(w.ex.length)} تمارين`,`${w.ex.length} exercises`)}</span></div>
    <div class="hero-title">${esc(dayLabel(D.cursor))}</div>
    <div class="hero-tag">${esc(dayTag(D.cursor))}</div>
    <div class="hero-ex small">${w.ex.slice(0,3).map(e=>`<bdi>${esc(nameOf(e))}</bdi>`).join(" · ")}${w.ex.length>3?` <span class="nowrap">${tx(`+ ${nl(w.ex.length-3)} تانيين`,`+ ${w.ex.length-3} more`)}</span>`:""}</div>
    <button class="btn" onclick="start()">${tx("ابدأ الحصة","Start workout")}</button>
    <button class="hero-link" onclick="skip()">${tx("بدّل لتمرين تاني","Switch to the next day")}</button>
  </div>

  ${needBackup()?`<div class="note tap" onclick="backup()">${D.lastBackup?tx(`بقالك ${nl(daysSince(D.lastBackup))} يوم من غير نسخة احتياطية`,`No backup for ${nl(daysSince(D.lastBackup))} days`)
    :tx("لسه ماعملتش نسخة احتياطية","No backup yet")}${tx(" — اضغط هنا واعملها"," — tap here to make one")}</div>`:""}

  <div class="duo">
    <div class="card goal tap" onclick="go('log')">
      <div class="small muted">${tx("أيام الشهر","Days this month")}</div>
      <div class="ring-box">${ringSVG(c,D.goal)}<div class="ring-n"><b class="num stat">${c}</b><span class="muted num"> / ${D.goal}</span></div></div>
      <div class="small ${c>=D.goal?"hi":"muted"}">${c>=D.goal?tx("هدف الشهر تم ✓","Month goal done ✓"):tx(`فاضل ${nl(D.goal-c)}`,`${D.goal-c} to go`)}</div>
    </div>
    <div class="card bwc tap" onclick="go('prog')">
      <div class="small">${tx("وزن الجسم","Bodyweight")}</div>
      ${bw.length?`<div class="bw-n"><b class="num stat">${bwShow(bw[bw.length-1])}</b> <span class="small">${UL[D.unit]}</span></div>
        ${sparkSVG(bw.slice(-12).map(bwShow))}
        <div class="small">${bw.length>1?(bwDiff?tx(`${bwDiff<0?"نزلت":"زادت"} ${Math.abs(bwDiff)} من ${fdate(bw[0].date)}`,`${bwDiff<0?"−":"+"}${Math.abs(bwDiff)} since ${fdate(bw[0].date)}`)
          :tx(`ثابت من ${fdate(bw[0].date)}`,`Same since ${fdate(bw[0].date)}`)):fdate(bw[0].date)}</div>`
      :`<div class="bw-empty">${tx("سجّل وزنك","Log your weight")} ›</div>`}
    </div>
  </div>

  <div class="card week">
    <div class="row" style="padding:0 0 10px"><b>${tx("الأسبوع ده","This week")}</b>
      <span class="small muted">${tx(`${nl(weekN)} حصص`,`${weekN} workout${weekN===1?"":"s"}`)}</span></div>
    <div class="wdays">${week.map((d,i)=>`<div class="wd ${trained.has(d)?"on":""} ${d===now?"today":""} ${d>now?"future":""}"
      aria-label="${esc(fdate(d))}${trained.has(d)?" ✓":""}"><span>${letters[i]}</span></div>`).join("")}</div>
  </div>

  ${stalled.length?`<div class="label">${tx("محتاج انتباه","Needs attention")}</div>
  <div class="card stalls">${stalled.map(x=>`<div class="row tap" onclick="showProgress('${x.id}')">
    <div><div style="font-weight:700"><bdi>${esc(nameOf(exDef(x.id)))}</bdi></div><div class="small muted">${esc(plateauText(x,unitOf(x.id)))}</div></div>
    <span class="chip ${x.stage==="swap"?"vio":"on"} nowrap">${tx(...PLATEAU_CHIP[x.stage])}</span></div>`).join("")}</div>`:""}

  ${last?`<div class="label">${tx("آخر حصة","Last workout")}</div>
  <div class="card tap lastw" onclick="openSession(${last.i})">
    <div class="row" style="padding-top:0"><div><b>${esc(sessionLabel(last.s))}</b>
      <div class="small muted">${fdate(last.s.date)} · ${agoDays(daysSince(new Date(last.s.date+"T00:00:00").getTime()))}</div></div>
      ${prs.has(last.i)?`<span class="chip on">🏆 ${nl(prs.get(last.i).length)}</span>`:"<span class=\"muted\">›</span>"}</div>
    <div class="stats">
      <div><b class="num stat">${Math.round(fromKg(volume(last.s),D.unit)).toLocaleString("en")}</b><span class="small muted">${tx(`${UL[D.unit]} حجم`,`${D.unit} volume`)}</span></div>
      <div><b class="num stat">${nl(lastSets)}</b><span class="small muted">${tx("ستات","sets")}</span></div>
      <div><b class="num stat">${last.s.mins?nl(last.s.mins):"—"}</b><span class="small muted">${tx("دقيقة","min")}</span></div>
    </div>
  </div>`:""}

  ${recent.length?`<div class="label">${tx("أرقام قياسية","Records")}</div>
  <div class="card">${recent.map(({s,i,pr})=>`<div class="row tap" onclick="openSession(${i})">
    <div><div style="font-weight:700">🏆 <bdi>${esc(nameIn(s,pr.id))}</bdi></div><div class="small muted">${esc(recordText(pr))}</div></div>
    <div class="small muted num nowrap">${fdate(s.date)}</div></div>`).join("")}</div>`:""}

  <div class="label">${tx("تمارين النهارده","Today's exercises")}</div>
  <div class="card">${w.ex.map((e,i)=>`<div class="row">
      <div><div style="font-weight:${i<3?700:500};color:${i<3?'var(--ink)':'var(--muted)'}">${esc(nameOf(e))}</div>
      <div class="small muted num">${EQ[e.eq]} · ${e.sets} × ${e.lo}–${e.hi}${e.sec?tx(" ث"," sec"):""}</div></div>
      ${i===2?`<span class="chip on">${tx("الحد الأدنى","Minimum")}</span>`:''}</div>`).join("")}</div>

  <div style="margin-top:22px"><button class="btn light" onclick="startPast()">${tx("سجّل حصة بتاريخ قديم","Log a past workout")}</button></div>`;
}

/* measurement logs shown on the progress tab; bodyweight is stored in kg and shown in the main unit */
const LOGS={
  bw:{f:"kg",get title(){ return tx("وزن الجسم","Bodyweight"); },unit:()=>D.unit,
    ph:()=>D.unit==="lb"?tx("بالباوند","in lb"):tx("بالكيلو","in kg"),
    get hint(){ return tx("وزنك بيدخل في حساب العقلة والمتوازي.","Your weight counts in pull-ups and dips."); },
    show:v=>+fromKg(v,D.unit).toFixed(1),store:v=>toKg(v,D.unit),
    diff:d=>`<div class="small muted" style="margin-top:12px">
      ${d?tx(`${d<0?"نزلت":"زادت"} ${Math.abs(d).toFixed(1)} ${UL[D.unit]} من أول وزن`,`${d<0?"Down":"Up"} ${Math.abs(d).toFixed(1)} ${UL[D.unit]} since the first weigh-in`)
        :tx("نفس أول وزن","Same as the first weigh-in")}</div>`},
  waist:{f:"cm",get title(){ return tx("محيط الوسط","Waist"); },unit:()=>"cm",ph:()=>tx("بالسنتيمتر","in cm"),
    get hint(){ return tx("قيس كل 4 أسابيع بس.","Measure every 4 weeks, no more."); },
    show:v=>v,store:v=>v,
    diff:d=>`<div class="small" style="margin-top:12px;color:${d<0?'var(--hi)':'var(--muted)'}">
      ${d<0?tx(`نزلت ${Math.abs(d).toFixed(1)} سم من أول قياس`,`Down ${Math.abs(d).toFixed(1)} cm since the first measurement`)
        :tx(`فرق ${d.toFixed(1)} سم عن أول قياس`,`${d.toFixed(1)} cm from the first measurement`)}</div>`}};
function logCard(key){
  const G=LOGS[key],list=D[key],val=x=>G.show(x[G.f]);
  const diff=list.length>1?val(list[list.length-1])-val(list[0]):null;
  return `<div class="label">${G.title}</div>
  <div class="card">
    <div style="display:flex;gap:10px">
      <input id="log-${key}" inputmode="decimal" placeholder="${G.ph()}" style="text-align:start;font-family:inherit;font-size:16px">
      <button class="btn lime" style="width:auto;padding:12px 22px;font-size:15px" onclick="addLog('${key}')">${tx("سجّل","Log")}</button></div>
    ${list.length?`<div style="margin-top:8px">${list.map((x,i)=>`<div class="row tap" onclick="editLog('${key}',${i})">
      <div class="num stat" style="font-weight:700;font-size:19px">${esc(val(x))}<span class="small muted"> ${G.unit()}</span></div>
      <div class="small muted num">${fdate(x.date)} · ${tx("تعديل","edit")}</div></div>`).join("")}</div>
      ${diff!==null?G.diff(diff):""}`
    :`<div class="small muted" style="margin-top:12px">${G.hint}</div>`}
  </div>`;
}

function vProg(){
  /* exercises taken out of the program stay pickable while they have history */
  const old=ALL.filter(e=>!inProgram(e.id)&&historyOf(e.id).length);
  /* history under ids nothing defines any more (another program, an imported file): by their saved names */
  const known=new Set(ALL.map(e=>e.id));
  [...new Set(D.sessions.flatMap(s=>Object.keys(s.entries||{})))].filter(id=>!known.has(id)&&historyOf(id).length).forEach(id=>old.push(exDef(id)));
  const groups=[...ORDER.map(k=>[dayLabel(k),PROGRAM[k].ex]),...(old.length?[[tx("تمارين مش في البرنامج","Not in the program"),old]]:[])];
  if(!groups.some(([,list])=>list.some(e=>e.id===progEx))) progEx=PROGRAM[ORDER[0]].ex[0].id;
  const ex=exDef(progEx),u=unitOf(progEx),h=historyOf(progEx).map(x=>({date:x.date,t:topSet(x)}));
  const noBw=ex.addw&&!D.bw.length,weighted=!noLoad(ex);
  const weeks=weekSeries(),U=D.unit;
  /* FIX: shown in the exercise's unit, as a left-to-right block so "kg" doesn't reorder the numbers;
     dips / pull-ups say what the number is */
  const setText=t=>t.kg?`${ex.assist?tx("مساعدة ","assist "):""}<span dir="ltr">${ex.addw&&!ex.assist?"+":""}${wIn(t,u)} ${esc(u)} × ${t.reps}</span>`
    :`${t.reps} ${ex.sec?tx("ثانية","sec"):tx("عدّة","reps")}`;
  const rm=t=>(t.kg||ex.addw)&&!noBw&&!ex.sec?` · ≈${Math.round(fromKg(t.sc,u))} 1RM`:"";
  const pl=plateau(progEx);
  return `${me()}<div class="top"><div><h1>${tx("التقدم","Progress")}</h1><div class="sub">${tx("الأرقام مش المرايا","Numbers, not the mirror")}</div></div></div>

  <div class="label">${tx("تمرين واحد عبر الوقت","One exercise over time")}</div>
  <select class="big" onchange="setProg(this.value)">
    ${groups.map(([label,list])=>`<optgroup label="${esc(label)}">${list.map(e=>
      `<option value="${e.id}" ${e.id===progEx?"selected":""}>${esc(nameOf(e))}</option>`).join("")}</optgroup>`).join("")}
  </select>
  <div class="card" style="margin-top:12px">
    ${h.length?`<div class="small muted">${tx("أحسن ست في كل حصة — ","Best set of each workout — ")}${noBw?tx("سجّل وزنك عشان تظهر الأرقام","log your bodyweight to see the numbers")
        :weighted?tx(`1RM تقديري بالـ${UL[u]}`,`estimated 1RM in ${u}`):ex.sec?tx("بالثواني","in seconds"):tx("بالعدّات","in reps")}</div>
      <div class="chart-host" id="ch-ex"></div>
      ${pl?`<div class="stall">${esc(plateauText(pl,u))}</div>`:""}
      <div style="margin-top:6px">${h.slice(-4).reverse().map(x=>`<div class="row">
        <div class="num" style="font-weight:700">${setText(x.t)}</div>
        <div class="small muted num">${fdate(x.date)}${rm(x.t)}</div></div>`).join("")}</div>
      <details class="tbl"><summary>${tx("كل الحصص","All workouts")} (${nl(h.length)})</summary><table>
        <tr><th>${tx("التاريخ","Date")}</th><th>${tx("أحسن ست","Best set")}</th>${noBw?"":`<th>${weighted?"1RM":ex.sec?tx("ثواني","Sec"):tx("عدّات","Reps")}</th>`}</tr>
        ${h.slice().reverse().map(x=>`<tr><td>${fdate(x.date)}</td><td class="num">${esc(setPlain(ex,x.t,u))}</td>${noBw?"":
          `<td class="num">${Math.round(weighted?fromKg(x.t.sc,u):x.t.sc)}</td>`}</tr>`).join("")}</table></details>
      <div class="small muted" style="margin-top:12px">${tx("أعلى ست شغل في كل حصة (التسخين مستبعد).","The top working set of each workout (warm-ups left out).")}${
        ex.addw?(noBw?tx(" سجّل وزن جسمك تحت عشان الحساب يبقى دقيق."," Log your bodyweight below so it's accurate."):tx(" محسوب بوزن جسمك."," Counts your bodyweight.")):""}</div>`
    :`<div class="muted small">${tx("التمرين ده لسه ماتسجلش.","Not logged yet.")}</div>`}
  </div>

  <div class="label">${tx("الحجم الأسبوعي","Weekly volume")}</div>
  <div class="card">
    ${weeks.some(w=>w.n)?`<div class="small muted">${tx(`مجموع الوزن × العدّات لكل أسبوع (من السبت) بالـ${UL[U]} — آخر 12 أسبوع`,
        `Weight × reps added up per week (from Saturday), in ${U} — last 12 weeks`)}</div>
      <div class="chart-host" id="ch-week"></div>
      <details class="tbl"><summary>${tx("الأرقام","Numbers")}</summary><table>
        <tr><th>${tx("الأسبوع","Week")}</th><th>${tx("حصص","Workouts")}</th><th>${tx("الحجم","Volume")}</th></tr>
        ${weeks.slice().reverse().map((w,i)=>`<tr><td>${i?fdate(w.start):tx("الأسبوع ده","This week")}</td><td class="num">${nl(w.n)}</td>
          <td class="num">${Math.round(fromKg(w.kg,U)).toLocaleString("en")}</td></tr>`).join("")}</table></details>`
    :`<div class="muted small">${tx("مفيش حصص في آخر 12 أسبوع.","No workouts in the last 12 weeks.")}</div>`}
  </div>

  ${logCard("bw")}
  ${logCard("waist")}`;
}

/* FEATURE: settings — saved as soon as a field changes */
function vSet(){
  const lbUsed=D.unit==="lb"||Object.values(D.units).includes("lb");
  const row=(label,ctl)=>`<div class="row"><span>${label}</span>${ctl}</div>`;
  const field=(val,on,mode="decimal")=>`<input class="field" inputmode="${mode}" value="${esc(val)}" onchange="${on}">`;
  const chips=(list,cur,fn)=>`<span class="chips">${list.map(([v,label])=>
    `<button class="chip ${cur===v?"on":""}" onclick="${fn}('${v}')">${label}</button>`).join(" ")}</span>`;
  const plates=u=>`<div class="row stack"><span>${tx(`الأوزان المتاحة (${UL[u]}) — افصل بفاصلة`,`Plates you have (${u}) — separate with commas`)}</span>
    <input class="field" dir="ltr" value="${esc(D[u==="lb"?"platesLb":"plates"].join(", "))}" onchange="setPlates('${u}',this.value)"></div>`;
  return `${me()}<div class="top"><div><h1>${tx("الإعدادات","Settings")}</h1><div class="sub">${tx("محفوظة على الموبايل ده","Saved on this phone")}</div></div></div>

  <div class="label">${tx("عنك","You")}</div>
  <div class="card">
    ${row(tx("الاسم","Name"),`<input class="field txt" value="${esc(D.name)}" placeholder="${tx("اختياري","Optional")}" onchange="setName(this.value)">`)}
    ${row(tx("اللغة","Language"),chips([["en","English"],["ar","عربي"]],LANG,"setLang"))}
    ${row(tx("الوحدة الأساسية","Main unit"),chips([["kg","kg"],["lb","lb"]],D.unit,"setDefUnit"))}
    ${row(tx("هدف الحصص في الشهر","Workouts a month (goal)"),field(D.goal,"setGoal(this.value)","numeric"))}
    ${row(tx("المظهر","Theme"),chips([["auto",tx("زي الموبايل","Auto")],["light",tx("فاتح","Light")],["dark",tx("غامق","Dark")]],D.theme||"auto","setTheme"))}
  </div>
  <div class="small muted" style="margin-top:8px">${tx("الوحدة الأساسية للتمارين اللي ماختارتلهاش وحدة، ولوزن الجسم.",
    "The main unit is for exercises you haven't picked a unit for, and for bodyweight.")}</div>

  <div class="label">${tx("البرنامج","Program")}</div>
  <div class="card">
    <div class="row tap" style="padding-top:0" onclick="go('program')">
      <div><div style="font-weight:700">${esc(programTitle())}</div>
        <div class="small muted">${tx(`${ORDER.length} تمارين (أيام) · ${ORDER.reduce((n,k)=>n+PROGRAM[k].ex.length,0)} تمرين — اضغط للتعديل`,
          `${ORDER.length} workout${ORDER.length===1?"":"s"} · ${ORDER.reduce((n,k)=>n+PROGRAM[k].ex.length,0)} exercises — tap to edit`)}</div></div>
      <span class="muted">›</span></div>
    <button class="btn lime" id="getProgram" onclick="copyProgramPrompt()">✨ ${tx("اعمل برنامجك مع Claude","Get your program")}</button>
    <div class="small muted" style="margin-top:8px">${tx("بينسخ رسالة تلصقها في Claude: هيسألك عن جسمك وهدفك ومعداتك، ويرد ببرنامج تستورده هنا.",
      "Copies a message to paste into Claude: it asks about your body, goal and equipment, then replies with a program you import here.")}</div>
    <div class="mlist" style="margin-top:8px">
      <button class="mi" onclick="importProgram()">⬇ ${tx("استيراد برنامج (JSON)","Import a program (JSON)")}</button>
      <button class="mi" onclick="exportProgram()">⬆ ${tx("تصدير البرنامج ده (JSON)","Export this program (JSON)")}</button>
      ${programStored?`<button class="mi" onclick="resetProgram()">↺ ${tx("رجّع البرنامج الأصلي","Back to the built-in program")}</button>`:""}
    </div>
  </div>

  <div class="label">${tx("أثناء التمرين","During a workout")}</div>
  <div class="card">
    ${row(tx("الراحة: أول 3 تمارين (ثواني)","Rest: first 3 exercises (sec)"),field(D.rest[1],"setRest(1,this.value)","numeric"))}
    ${row(tx("الراحة: باقي التمارين (ثواني)","Rest: other exercises (sec)"),field(D.rest[0],"setRest(0,this.value)","numeric"))}
    ${row(tx("يبدأ لوحده بعد كل ست","Start after each set"),chips([["on",tx("أيوه","On")],["off",tx("لأ","Off")]],D.autoRest===false?"off":"on","setAutoRest"))}
    ${row(tx("صوت لما الراحة تخلص","Sound when rest ends"),chips([["on",tx("أيوه","On")],["off",tx("لأ","Off")]],D.restSound===false?"off":"on","setRestSound"))}
    ${row(tx("الشاشة تفضل منورة أثناء التمرين","Keep the screen on during a workout"),chips([["on",tx("أيوه","On")],["off",tx("لأ","Off")]],D.awake===false?"off":"on","setAwake"))}
  </div>

  <div class="label">${tx("حاسبة أوزان البار","Plate calculator")}</div>
  <div class="card">
    ${row(`${tx("وزن البار","Bar weight")} (${UL.kg})`,field(D.bar,"setBar('kg',this.value)"))}
    ${plates("kg")}
    ${lbUsed?row(`${tx("وزن البار","Bar weight")} (${UL.lb})`,field(D.barLb,"setBar('lb',this.value)"))+plates("lb"):""}
  </div>
  <div class="small muted" style="margin-top:12px">${tx("وزن الجسم بيتسجّل في صفحة التقدم.","Bodyweight is logged on the Progress tab.")}</div>

  <div class="label">${tx("التطبيق","App")}</div>
  <div class="card small">
    ${isInstalled()?`<div style="font-weight:700">${tx("متثبّت على الموبايل ✓","Installed on this phone ✓")}</div>`
      :installPrompt?`<button class="btn lime" onclick="installApp()">${tx("ثبّت التطبيق على الموبايل","Install the app")}</button>`
      :isAr()?`<div class="muted">عشان تثبّته على الموبايل:</div>
        <div class="muted">على الـ iPhone: من Safari ← مشاركة ← <span dir="ltr" style="white-space:nowrap">Add to Home Screen</span></div>
        <div class="muted">على الـ Android: قايمة Chrome ← <span dir="ltr" style="white-space:nowrap">Install app</span></div>`
      :`<div class="muted">To install it on your phone:</div>
        <div class="muted">iPhone: Safari → Share → <span style="white-space:nowrap">Add to Home Screen</span></div>
        <div class="muted">Android: Chrome menu → <span style="white-space:nowrap">Install app</span></div>`}
    <div class="muted" style="margin-top:10px">${navigator.serviceWorker?.controller
      ?tx("بيشتغل من غير نت ✓","Works offline ✓"):tx("هيشتغل من غير نت بعد ما تفتحه مرة وإنت متصل.","Works offline after you open it once with a connection.")}</div>
    <div class="muted num" id="version" style="margin-top:10px">${tx("الإصدار","Version")} ${APP_VERSION}</div>
  </div>`;
}
const isInstalled=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
/* the release number = the ?v= on the script tags (bumped with every release), shown in Settings */
const APP_VERSION=(document.currentScript?.getAttribute("src")?.match(/[?&]v=(\w+)/)||[])[1]||"—";

/* FEATURE: program editor (opened from Settings); the actions are in actions.js */
const flagText=e=>[e.uni&&tx("كل جنب لوحده","one side at a time"),e.assist?tx("بالمساعدة","assisted"):e.addw&&tx("+ وزن إضافي","+ added weight")]
  .filter(Boolean).map(t=>" · "+t).join("");
function vProgram(){
  const day=k=>{ const P=PROGRAM[k];
    return `<div class="label">${esc(dayLabel(k))}</div>
    <div class="card">
      <div class="row tap" style="padding-top:0" onclick="editTag('${k}')">
        <div class="small muted">${esc(dayTag(k))}</div><span class="chip">${tx("تعديل الوصف","Edit description")}</span></div>
      ${P.ex.map((e,i)=>`<div class="prow">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div><div style="font-weight:700">${esc(nameOf(e))}</div>
            <div class="small muted num">${EQ[e.eq]} · ${e.sets} × ${e.lo}–${e.hi}${e.sec?tx(" ث"," s"):""}${flagText(e)}</div></div>
          ${i<3?`<span class="chip on">${tx("أساسي","Core")}</span>`:""}</div>
        <div class="ctrls">
          <button class="chip" onclick="editEx('${k}',${i})">${tx("تعديل","Edit")}</button>
          <button class="chip" onclick="replaceEx('${k}',${i})">${tx("استبدال","Replace")}</button>
          <button class="chip" onclick="moveEx('${k}',${i},-1)" aria-label="${tx("لفوق","Move up")}" ${i?"":"disabled"}>↑</button>
          <button class="chip" onclick="moveEx('${k}',${i},1)" aria-label="${tx("لتحت","Move down")}" ${i<P.ex.length-1?"":"disabled"}>↓</button>
          <button class="chip" onclick="removeEx('${k}',${i})">${tx("شيل","Remove")}</button></div></div>`).join("")}
      <div style="margin-top:14px"><button class="btn lime" onclick="addEx('${k}')">+ ${tx("تمرين","Exercise")}</button></div>
    </div>`; };
  return `<div class="top"><div><h1>${tx("البرنامج","Program")}</h1><div class="sub">${esc(programTitle())} · ${tx("أول 3 تمارين في كل يوم هما الحد الأدنى","the first 3 exercises of each day are the minimum")}</div></div>
    <button class="btn light" style="width:auto;padding:12px 20px;font-size:15px" onclick="go('set')">${tx("رجوع","Back")}</button></div>
  ${ORDER.map(day).join("")}
  ${programStored?`<div style="margin-top:22px"><button class="btn danger" onclick="resetProgram()">${tx("رجّع البرنامج الأصلي","Back to the built-in program")}</button></div>`:""}`;
}

/* FEATURE: month calendar of training days (Saturday first, like the week in Egypt); tap a day to open it.
   The grid follows the page direction: Saturday on the right in Arabic, on the left in English. */
function calendarCard(){
  const m=calMonth||ym(today()),[Y,M]=m.split("-").map(Number),now=today();
  const days=new Date(Y,M,0).getDate(),lead=(new Date(Y,M-1,1).getDay()+1)%7;
  const byDate={}; D.sessions.forEach((s,i)=>{ if(ym(s.date)===m) (byDate[s.date]=byDate[s.date]||[]).push(i); });
  const count=Object.keys(byDate).length,isNow=m===ym(now);
  const cell=d=>{
    const iso=`${m}-${pad2(d)}`,on=byDate[iso],letters=on?[...new Set(on.map(i=>String(D.sessions[i].workout).slice(0,2)))].join(" "):"";
    const cls=["day",on?"on":"",iso===now?"today":"",iso>now?"future":""].join(" ");
    const name=`${fdate(iso)}${on?` — ${on.map(i=>sessionLabel(D.sessions[i])).join(tx("، ",", "))}`:""}`;
    return on?`<button class="${cls}" onclick="openSession(${on[on.length-1]})" aria-label="${esc(name)}">${nl(d)}<small>${letters}</small></button>`
      :`<div class="${cls}" aria-label="${esc(name)}">${nl(d)}</div>`;
  };
  return `<div class="card cal">
    <div class="cal-head">
      <button class="chip" onclick="calShift(-1)" aria-label="${tx("الشهر اللي فات","Previous month")}">${tx("›","‹")}</button>
      <div><b>${new Date(Y,M-1,1).toLocaleDateString(LOCALE(),{month:"long",year:"numeric"})}</b>
        <div class="small muted">${tx(`${nl(count)} ${isNow?`من ${nl(D.goal)} `:""}أيام تمرين`,`${count} ${isNow?`of ${D.goal} `:""}training days`)}</div></div>
      <button class="chip" onclick="calShift(1)" aria-label="${tx("الشهر الجاي","Next month")}" ${isNow?"disabled":""}>${tx("‹","›")}</button></div>
    <div class="cal-grid">${(isAr()?["س","ح","ن","ث","ر","خ","ج"]:["Sa","Su","Mo","Tu","We","Th","Fr"]).map(d=>`<span class="dow">${d}</span>`).join("")}
      ${"<span></span>".repeat(lead)}${Array.from({length:days},(_,i)=>cell(i+1)).join("")}</div>
  </div>`;
}

function vLog(){
  const prs=recordMap(),n=D.sessions.length;
  return `${me()}<div class="top"><div><h1>${tx("السجل","Log")}</h1><div class="sub">${tx(`${n} حصة`,`${n} workout${n===1?"":"s"}`)}</div></div></div>
  <div class="label">${tx("أيام التمرين","Training days")}</div>
  ${calendarCard()}
  <div class="label">${tx("اضغط على أي حصة للتعديل أو الحذف","Tap a workout to edit it")}</div>
  ${n?`<div class="card">${D.sessions.map((s,i)=>({s,i}))
    .sort((a,b)=>a.s.date<b.s.date?1:-1).map(({s,i})=>`
    <div class="row tap" onclick="openSession(${i})">
      <div><div style="font-weight:700">${esc(sessionLabel(s))}${prs.has(i)?` <span class="chip on" title="${tx("أرقام قياسية","Records")}">🏆 ${nl(prs.get(i).length)}</span>`:""}</div>
      <div class="small muted num">${Math.round(fromKg(volume(s),D.unit)).toLocaleString("en")} ${D.unit} ${tx("إجمالي","total")}${s.mins?` · ${nl(s.mins)} ${tx("دقيقة","min")}`:""}</div></div>
      <div class="small muted num">${s.note?`<span title="${tx("فيها ملاحظة","Has a note")}">📝</span> `:""}${fdate(s.date)} ›</div></div>`).join("")}</div>`
   :`<div class="card muted small">${tx("مفيش حصص لسه.","No workouts yet.")}</div>`}
  <div class="label">${tx("النسخ الاحتياطي","Backup")}</div>
  <div class="card small muted">${tx("الداتا محفوظة على الموبايل بس. اعمل نسخة كل شوية — لو مسحت التطبيق أو الجهاز اتصفّر، مفيش استرجاع من غيرها.",
    "Your data is only on this phone. Back it up now and then — if the app is deleted or the phone is reset, there's no other copy.")}
    <div style="margin-top:8px;font-weight:700;color:var(--ink)">${!D.lastBackup?tx("لسه ماعملتش نسخة احتياطية.","No backup yet.")
      :daysSince(D.lastBackup)?tx(`آخر نسخة: من ${nl(daysSince(D.lastBackup))} يوم.`,`Last backup: ${nl(daysSince(D.lastBackup))} days ago.`)
      :tx("آخر نسخة: النهارده.","Last backup: today.")}</div></div>
  <div style="margin-top:12px"><button class="btn light" onclick="backup()">${tx("نسخة احتياطية (JSON)","Back up (JSON)")}</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="restore()">${tx("استرجاع من ملف","Restore from a file")}</button></div>
  <div style="margin-top:10px"><button class="btn light" onclick="exportCSV()">${tx("تصدير CSV","Export CSV")}</button></div>
  <div style="margin-top:10px"><button class="btn danger" onclick="wipe()">${tx("مسح كل البيانات","Delete all data")}</button></div>`;
}

/* ══ render ═══════════════════════════════════════════ */
function render(toTop=true){
  const y=window.scrollY;
  document.getElementById("app").innerHTML =
    draft?vSession():tab==="prog"?vProg():tab==="log"?vLog():tab==="set"?vSet():tab==="program"?vProgram():vPlan();
  document.getElementById("nav").classList.toggle("hide",!!draft);
  document.body.classList.toggle("in-session",!!draft);
  const navTab=tab==="program"?"set":tab;   // the editor lives under Settings
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===navTab));
  if(draft) refresh();
  keepAwake(!!draft);
  saveDraft();
  drawCharts();
  window.scrollTo(0,toTop?0:y);
}
