/* Batch 9: progress chart, weekly volume chart, their tables, and the log calendar. */
const {open,check}=require("./lib.js");

module.exports=async()=>{
  const p=await open({time:"2026-09-26T10:00:00Z"});   // a Saturday
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ const R=(w,r)=>({w:String(w),r:String(r),r2:"",warm:false});
    [["2026-08-30",[R(100,10),R(105,8)]],["2026-09-02",[R(105,9),R(110,7)]],["2026-09-06",[R(110,8)]],["2026-09-09",[R(110,9),R(115,6)]],
     ["2026-09-13",[R(115,8)]],["2026-09-16",[R(115,9)]],["2026-09-20",[R(120,7)]],["2026-09-23",[R(120,8)]]]
      .forEach(([date,rows])=>D.sessions.push({date,workout:"A",entries:{a1:rows},units:{a1:"kg"},names:{},counts:{},sides:{},rir:{}}));
    save(); go("prog"); });

  // exercise line chart (leg press: seed + 8 sessions → last 10 shown)
  const g=await ev(()=>{ const host=document.getElementById("ch-ex"),svg=host.querySelector("svg"),dots=[...svg.querySelectorAll(".dot")];
    return {w:+svg.getAttribute("width"),hw:Math.round(host.clientWidth),n:dots.length,
      xs:dots.map(d=>+d.getAttribute("cx")),best:dots.findIndex(d=>d.classList.contains("best")),
      lbls:[...svg.querySelectorAll(".lbl")].map(t=>t.textContent),ticks:svg.querySelectorAll(".tick").length}; });
  check("line chart drawn at the card's width", g.w===g.hw, g);
  check("one dot per session, last 9 sessions", g.n===9, g.n);
  check("time runs right to left (oldest on the right)", g.xs[0]>g.xs[g.n-1], g.xs);
  check("best session highlighted (latest here)", g.best===g.n-1, g.best);
  check("only the latest/best value is labelled", g.lbls.length===1 && g.lbls[0]==="152", g.lbls);
  check("value ticks and date labels present", g.ticks>=5);
  const box=await (await p.$("#ch-ex svg")).boundingBox();
  await p.mouse.move(box.x+box.width*0.45,box.y+80);
  const tip=await ev(()=>{ const t=document.querySelector("#ch-ex .ctip"); return t.hidden?null:t.innerText; });
  check("tooltip: value first, then the set and the date", !!tip && /^\d+ كجم\n.*kg × \d+.*\n/.test(tip), tip);
  await p.mouse.move(1,1);
  await p.focus("#ch-ex .hit");
  for(let i=0;i<10;i++) await p.keyboard.press("ArrowLeft");   // ← = newer, stops at the newest
  const t1=await ev(()=>document.querySelector("#ch-ex .ctip").innerText);
  await p.keyboard.press("ArrowRight");
  const t2=await ev(()=>document.querySelector("#ch-ex .ctip").innerText);
  check("keyboard: ← reaches the newest session, → moves to the one before", t1.includes("٢٣ سبتمبر") && t2.includes("٢٠ سبتمبر"), [t1,t2]);
  check("table of all sessions", await ev(()=>document.querySelectorAll("#app details.tbl")[0].querySelectorAll("tr").length)===10);

  // weekly volume columns
  const wk=await ev(()=>{ const svg=document.querySelector("#ch-week svg");
    return {hits:svg.querySelectorAll(".hit").length,bars:svg.querySelectorAll("path.bar").length,
      best:svg.querySelectorAll("path.bar.best").length,labels:[...svg.querySelectorAll(".tick")].map(t=>t.textContent)}; });
  check("12 weeks, bars only where there was training", wk.hits===12 && wk.bars===5, wk);
  check("heaviest week highlighted", wk.best===1);
  check("x labels: first week and this week", wk.labels.includes("الأسبوع ده"), wk.labels);
  const sum=await ev(()=>{ const w=weekSeries(); return [w.at(-2).n,Math.round(w.at(-2).kg),
    Math.round(D.sessions.filter(s=>s.date>="2026-09-19"&&s.date<="2026-09-25").reduce((a,s)=>a+volume(s),0))]; });
  check("week totals: Saturday–Friday, sessions and volume add up", sum[0]===2&&sum[1]===sum[2], sum);
  await ev(()=>document.querySelectorAll("#ch-week .hit")[10].dispatchEvent(new Event("focus")));
  const wtip=await ev(()=>document.querySelector("#ch-week .ctip").innerText);
  check("bar tooltip: volume, sessions, week", wtip.includes("كجم")&&wtip.includes("حصص")&&wtip.includes("أسبوع"), wtip);
  check("weekly table has 12 rows", await ev(()=>document.querySelectorAll("#app details.tbl")[1].querySelectorAll("tr").length)===13);
  await ev(()=>setDefUnit("lb"));
  check("weekly chart follows the main unit", (await p.textContent("#app")).includes("بالـباوند"));
  await ev(()=>setDefUnit("kg"));

  // redraw on resize
  await p.setViewportSize({width:320,height:844}); await p.waitForTimeout(300);
  check("redrawn at the new width after a resize", await ev(()=>+document.querySelector("#ch-ex svg").getAttribute("width")===Math.round(document.getElementById("ch-ex").clientWidth)));

  // dips with no weigh-in: shape only, no numbers; knee raises: reps; no history: message
  await ev(()=>{ D.sessions.push({date:"2026-09-10",workout:"C",entries:{c1:[{w:"5",r:"8",r2:"",warm:false}]},units:{c1:"kg"},names:{},counts:{},sides:{},rir:{}}); progEx="c1"; render(false); });
  check("dips, no weigh-in: no value labels or value ticks", await ev(()=>{ const s=document.querySelector("#ch-ex svg");
    return s.querySelectorAll(".lbl").length===0 && [...s.querySelectorAll(".tick")].every(t=>!/^\d+$/.test(t.textContent)); }));
  await ev(()=>{ progEx="a6"; render(false); });
  check("bodyweight move plotted in reps", (await p.textContent("#app")).includes("بالعدّات"));
  await ev(()=>{ progEx="b7"; render(false); });
  check("no history → no chart, a message", !(await p.$("#ch-ex")) && (await p.textContent("#app")).includes("لسه ماتسجلش"));

  // calendar on the log tab
  await ev(()=>go("log"));
  const cal=await ev(()=>({head:document.querySelector(".cal-head b").textContent,on:document.querySelectorAll(".day.on").length,
    today:document.querySelector(".day.today")?.textContent,next:document.querySelectorAll(".cal-head button")[1].disabled}));
  check("calendar: this month, trained days, today, no next month", cal.head.includes("سبتمبر")&&cal.on===8&&cal.today==="٢٦"&&cal.next, cal);   // 7 leg-press days + the dips day
  check("Saturday is the first (rightmost) column", await ev(()=>{ const d=[...document.querySelectorAll(".cal-grid .dow")];
    return d[0].textContent==="س"&&d[0].getBoundingClientRect().left>d[1].getBoundingClientRect().left; }));
  await p.click(".cal-head button >> nth=0");
  check("previous month: August's trained days", await ev(()=>document.querySelector(".cal-head b").textContent.includes("أغسطس")&&document.querySelectorAll(".day.on").length===4));
  await p.click(".day.on >> nth=0");
  check("tapping a day opens that session", await ev(()=>draft&&draft.edit!=null&&draft.date==="2026-08-23"));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();
};
