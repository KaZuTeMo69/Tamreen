/* Batch 15: plateau check — no new best set in 3+ workouts → lighter week; 5+ → swap it. */
const {open,check}=require("./lib.js");

/* a1 (Leg Press): seed 23 Aug 100×10, then a best on 2 Sept and three workouts that don't beat it */
const A1=[["2026-09-02",120,8],["2026-09-09",115,8],["2026-09-16",120,7],["2026-09-23",115,9]];
const add=(p,rows,id="a1",w="A")=>p.evaluate(({rows,id,w})=>{
  rows.forEach(([date,kg,r])=>D.sessions.push({date,workout:w,entries:{[id]:[{w:kg===null?"":String(kg),r:String(r),r2:"",warm:false}]},
    units:{[id]:"kg"},names:{},counts:{},sides:{},rir:{}}));
  save(); render(); },{rows,id,w});

module.exports=async()=>{
  const p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  const ev=(f,a)=>p.evaluate(f,a);
  const app=()=>p.textContent("#app");

  check("no plateau with the seed data", !(await p.$(".stalls")) && await ev(()=>plateau("a1"))===null);
  await add(p,A1);
  const pl=await ev(()=>{ const x=plateau("a1"); return x&&{since:x.since,stage:x.stage,best:x.bestDate}; });
  check("3 workouts without a new best → stalled: lighter week", pl&&pl.since===3&&pl.stage==="light"&&pl.best==="2026-09-02", pl);
  check("fewer than 4 workouts → never flagged", await ev(()=>plateau("a2"))===null);
  const card=await p.textContent(".stalls");
  check("home: Needs attention card", (await app()).includes("Needs attention") && card.includes("Leg Press / Hack Squat")
    && card.includes("take a lighter week: 100 kg, same reps") && card.includes("Lighter week"), card);   // 90% of 115, down to the 5 kg step
  await p.click(".stalls .row");
  check("tapping it opens that exercise's progress", await ev(()=>tab==="prog"&&progEx==="a1") && (await p.textContent(".stall")).includes("lighter week"));

  // in the workout
  await ev(()=>go("plan")); await p.click("text=Start workout");
  check("workout: advice on the stalled exercise only", (await p.$$(".stall")).length===1 && !!(await p.$("#ex-a1 .stall")));
  check("workout: it replaces the usual next-weight tip there", !(await p.$("#ex-a1 .tip")) && !!(await p.$("#ex-a2 .tip")));
  const lb=await ev(()=>{ setUnit("a1","lb"); render(false); return document.querySelector("#ex-a1 .stall").textContent; });
  check("workout: in lb when the exercise is logged in lb", lb.includes("220 lb"), lb);   // 90% of 253.5 lb = 228, down to the 10 lb step
  await ev(()=>{ setUnit("a1","kg"); render(false); edit("a1",0,"w","110"); edit("a1",0,"r","8"); });
  const msg=await ev(()=>sessionText(draft));
  check("Ask Claude message mentions the plateau", msg.includes("Plateau: no new best set in the last 3 workouts (best was 2026-09-02)."), msg);
  await ev(()=>{ draft=null; render(); });
  await ev(()=>openSession(D.sessions.length-1));
  check("editing an old workout: no advice", !(await p.$(".stall")));
  await ev(()=>{ draft=null; tab="plan"; render(); });

  // the lighter week (no new best) → go for the best again
  await add(p,[["2026-09-24",100,10]]);
  const bt=await ev(()=>{ const x=plateau("a1"); return x&&[x.since,x.stage]; });
  check("4 workouts (after the lighter week) → beat your best", bt&&bt[0]===4&&bt[1]==="beat", bt);
  check("home: says what the best was", (await p.textContent(".stalls")).includes("go for your best again: 120 kg × 8") && (await p.textContent(".stalls")).includes("Beat your best"));
  // that didn't beat it either → swap it
  await add(p,[["2026-09-25",120,7]]);
  const sw=await ev(()=>{ const x=plateau("a1"); return x&&[x.since,x.stage]; });
  check("5 workouts → swap", sw&&sw[0]===5&&sw[1]==="swap", sw);
  check("home: swap advice", (await p.textContent(".stalls")).includes("time to swap it for a variation") && !!(await p.$(".stalls .chip.vio")));

  // a new best clears it
  await add(p,[["2026-09-26",125,8]]);
  check("a new best clears the flag", await ev(()=>plateau("a1"))===null && !(await p.$(".stalls")));

  // bodyweight hold (seconds): no weight to lower, so one set fewer
  await add(p,[["2026-09-01",null,40],["2026-09-08",null,35],["2026-09-15",null,38],["2026-09-22",null,40]],"b6","B");
  check("timed hold: lighter week = one set fewer", (await p.textContent(".stalls")).includes("one set fewer, stop 2–3 reps short"));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  // Arabic
  const q=await open({time:"2026-09-26T10:00:00Z"});
  await add(q,A1);
  const t=await q.textContent("#app");
  check("Arabic: card and advice", t.includes("محتاج انتباه") && t.includes("٣ حصص من غير تحسّن — خُد أسبوع أخف: 100 كجم بنفس العدّات") && t.includes("أسبوع أخف"));
  check("Arabic: no page errors", q.errs.length===0, q.errs);
  await q.done();
};
