/* Batch 17: the workout screen — one exercise at a time, +/− steppers, rest timer by itself, RIR once,
   settings behind ⋯. Starts with the acceptance test: a whole 7-exercise workout with stepper taps, one RIR
   tap per exercise and Next taps only — no keyboard, no scrolling inside an exercise, no menu. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path");
const PLUS=f=>`.stp-${f} button:last-of-type`,MINUS=f=>`.stp-${f} button:first-of-type`;

module.exports=async()=>{
  /* ── acceptance: Workout B (7 exercises) on a 390 × 844 phone ── */
  let p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  let ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ D.cursor="B"; save(); render(); });
  await p.click(".hero .btn");
  const ids=await ev(()=>draft.ids);
  check("Workout B has 7 exercises", ids.length===7, ids);
  let taps=0,setTaps=0,sets=0,keyboard=false,menu=false,worstScroll=-1e9,scrolled=false;
  const expected={},positions=[];
  const tap=async sel=>{
    await p.click(sel); taps++;
    if(await ev(()=>document.activeElement?.tagName==="INPUT")) keyboard=true;
    if(await ev(()=>document.getElementById("modal").classList.contains("on"))) menu=true;
    if(await ev(()=>scrollY>0)) scrolled=true;
  };
  for(const [i,id] of ids.entries()){
    positions.push(await p.textContent("#pos"));
    const n=await ev(id=>draft.counts[id],id),side=await ev(id=>!!draft.sides[id],id),inc=await ev(id=>exDef(id).sec?5:1,id);
    expected[id]=[];
    for(let s=0;s<n;s++){
      const ph=await p.getAttribute(`#in-${id}-${s}-r`,"placeholder");
      await tap(`#row-${id}-${s} ${PLUS("r")}`); setTaps++;
      let row={r:String(+ph+inc)};
      if(side){ const ph2=await p.getAttribute(`#in-${id}-${s}-r2`,"placeholder");
        await tap(`#row-${id}-${s} ${PLUS("r2")}`); setTaps++; row.r2=String(+ph2+inc); }
      expected[id].push(row); sets++;
    }
    check(`${i+1}. ${id}: every set ticked ✓`, await ev(id=>[...document.querySelectorAll(`#sets-${id} .srow`)].every(r=>r.classList.contains("done")&&r.querySelector(".chk").textContent==="✓"),id));
    check(`${i+1}. ${id}: RIR asked inline after the last set`, !!(await p.$(`#rir-${id} .rirask`)));
    await tap(`#rir-${id} .rb >> nth=2`);   // RIR 2
    // the timer is showing now: the whole exercise must still fit without scrolling
    worstScroll=Math.max(worstScroll,await ev(()=>document.documentElement.scrollHeight-innerHeight));
    check(`${i+1}. ${id}: rest timer running`, await ev(()=>document.getElementById("timer").classList.contains("on")));
    if(i<ids.length-1) await tap(".pager .nx");
  }
  check("position shows 1 / 7 … 7 / 7", positions.join()===ids.map((_,i)=>`${i+1} / 7`).join(), positions);
  check("no keyboard opened", !keyboard);
  check("no menu or prompt opened", !menu);
  check("no scrolling inside an exercise (390 × 844, timer showing)", worstScroll<=0 && !scrolled, worstScroll);
  check("at most two taps per set", setTaps<=2*sets, {setTaps,sets});
  check("taps: sets + one RIR each + Next", taps===setTaps+7+6, taps);
  await p.click("#fin");
  const rec=await ev(()=>D.sessions.at(-1));
  const got=Object.fromEntries(ids.map(id=>[id,rec.entries[id].map(r=>r.r2?{r:r.r,r2:r.r2}:{r:r.r})]));
  check("saved: every set with the stepped reps", JSON.stringify(got)===JSON.stringify(expected), {got,expected});
  check("saved: RIR 2 on all seven", ids.every(id=>rec.rir[id]===2), rec.rir);
  check("saved record has the same fields as before", JSON.stringify(Object.keys(rec).sort())===JSON.stringify(["counts","date","entries","mins","names","rir","sides","units","workout"].filter(k=>k!=="mins"||rec.mins).sort()), Object.keys(rec));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── steppers, the circle, the faint numbers ── */
  p=await open({lang:"en",time:"2026-09-26T10:00:00Z"}); ev=(f,a)=>p.evaluate(f,a);
  const show=id=>ev(id=>{ draft.at=draft.ids.indexOf(id); render(); },id);
  await p.click(".hero .btn");   // Workout A; seed: Leg Press 60×10, 80×10, 100×10
  check("one exercise on screen", (await p.$$(".ex1")).length===1 && !!(await p.$("#ex-a1")));
  check("main view: name, sets, nothing else to set up", !(await p.$("#app select")) && !(await p.$("#app .prev"))
    && !/Right \/ Left|Pin link|Rename|Plates|Rest 90|Same again/.test(await p.textContent("#exview")));
  const boxes=await p.$$eval("#sets-a1 input",els=>els.map(e=>[e.value,e.placeholder]));   // [value, faint] for weight, reps per set
  check("last time as faint numbers inside the boxes", JSON.stringify(boxes)===JSON.stringify([["60","60"],["","10"],["80","80"],["","10"],["100","100"],["","10"]]), boxes);
  await p.click(`#row-a1-0 ${PLUS("r")}`);
  check("+ on an empty reps box: last time + 1", await ev(()=>draft.entries.a1[0].r)==="11");
  await ev(()=>stopTimer());
  await p.click(`#row-a1-1 ${MINUS("r")}`);
  check("− on an empty reps box: last time − 1", await ev(()=>draft.entries.a1[1].r)==="9");
  await p.click(`#row-a1-1 ${MINUS("r")}`); await p.click(`#row-a1-1 ${PLUS("r")}`);
  check("steppers move by 1 rep", await ev(()=>draft.entries.a1[1].r)==="9");
  await ev(()=>stopTimer());
  await p.click(`#row-a1-2 .chk`);
  check("circle: logs the set as last time", JSON.stringify(await ev(()=>draft.entries.a1[2]))===JSON.stringify({w:"100",r:"10",r2:"",warm:false}));
  check("…and the rest timer starts: 120 s for the first three exercises", (await p.textContent("#tval"))==="02:00");
  await p.click(`#row-a1-2 .chk`);
  check("circle on a done set changes nothing", await ev(()=>draft.entries.a1[2].r)==="10" && (await p.textContent("#toast")).includes("+ and −"));
  await p.click(`#row-a1-0 ${PLUS("w")}`);
  check("machine: +5 kg", await ev(()=>draft.entries.a1[0].w)==="65");
  await ev(()=>{ draft.entries.a1[0].r="1"; });
  await p.click(`#row-a1-0 ${MINUS("r")}`);
  check("reps down to nothing clears the set (no ✓)", await ev(()=>draft.entries.a1[0].r)==="" && !(await ev(()=>document.getElementById("row-a1-0").classList.contains("done"))));
  // tapping the number opens the keyboard for a direct edit
  await p.click("#in-a1-0-r");
  check("tapping the number focuses its box (keyboard)", await ev(()=>document.activeElement?.id)==="in-a1-0-r" && await ev(()=>document.activeElement.inputMode)==="numeric");
  await p.keyboard.type("12");
  check("typed reps saved", await ev(()=>draft.entries.a1[0].r)==="12" && await ev(()=>document.getElementById("row-a1-0").classList.contains("done")));
  await ev(()=>{ stopTimer(); document.activeElement.blur(); });
  // weight steps per equipment
  const stepOf=async(id,u)=>ev(([id,u])=>{ draft.units[id]=u; draft.entries[id][0].w="20"; bump(id,0,"w",1); stopTimer(); return draft.entries[id][0].w; },[id,u]);
  await show("a2"); check("dumbbell: +2.5 kg", await stepOf("a2","kg")==="22.5");
  check("dumbbell in lb: +5 lb", await stepOf("a2","lb")==="25");
  check("machine in lb: +10 lb", await stepOf("a3","lb")==="30");
  check("cable: +2.5 kg", await ev(()=>{ const e=exDef("c5"); return incOf(e,"kg"); })===2.5);
  check("barbell: +5 kg", await ev(()=>incOf(exDef("c2"),"kg"))===5);
  check("dips (added weight): +2.5 kg; assisted pull-up: 5 kg", await ev(()=>incOf(exDef("c1"),"kg")===2.5&&incOf(exDef("b1"),"kg")===5));
  check("holds step by 5 seconds", await ev(()=>repInc(exDef("b6")))===5);
  await ev(()=>{ draft.units.a2="kg"; draft.units.a3="kg"; draft.entries.a2[0].w=""; draft.entries.a3[0].w=""; render(); });

  /* ── rest timer: by itself; 120 s main lifts, 90 s the rest; not warm-ups ── */
  await show("a4");
  await p.click(`#row-a4-0 .chk`);
  check("other exercises: 90 s", (await p.textContent("#tval"))==="01:30");
  await ev(()=>{ stopTimer(); toggleWarm("a4",1); });
  await p.click(`#row-a4-1 .chk`);
  check("a warm-up set doesn't start it", !(await ev(()=>document.getElementById("timer").classList.contains("on"))));
  check("a warm-up set shows as warm-up", await ev(()=>document.getElementById("row-a4-1").classList.contains("warm")));
  await ev(()=>{ D.autoRest=false; });
  await p.click(`#row-a4-2 .chk`);
  check("Settings off → no timer", !(await ev(()=>document.getElementById("timer").classList.contains("on"))));
  await ev(()=>{ D.autoRest=true; });
  check("Skip stays", !!(await p.$("#timer button")));

  /* ── RIR once ── */
  check("RIR asked inline once the last set is in", !!(await p.$("#rir-a4 .rirask")));
  await p.click("#rir-a4 .rb >> nth=3");
  check("then shown small", (await p.textContent("#rir-a4")).includes("3+") && !(await p.$("#rir-a4 .rirask")) && await ev(()=>draft.rir.a4)===3);
  await show("a5"); await p.click(`#row-a5-0 .chk`); await ev(()=>stopTimer());
  check("no RIR before the last set", !(await p.$("#rir-a5 .rirask")));
  await p.click(".pager .nx");
  check("moving on without RIR → asked once", await ev(()=>document.getElementById("modal").classList.contains("on")) && (await p.$$("#mform .rb")).length===4);
  await p.click("#mno");
  check("Cancel stays on the exercise", await ev(()=>draft.ids[draft.at])==="a5");
  await p.click(".pager .nx");
  check("asked only once: Next now moves on", await ev(()=>draft.ids[draft.at])==="a6" && !(await ev(()=>document.getElementById("modal").classList.contains("on"))));
  await ev(()=>{ draft.at=4; draft.asked={}; render(); });
  await p.click(".pager .nx"); await p.click("#mform .rb >> nth=1");
  check("answering the prompt saves it and moves on", await ev(()=>draft.rir.a5)===1 && await ev(()=>draft.ids[draft.at])==="a6");
  await p.click(".pager .nx");
  check("nothing logged → no prompt", await ev(()=>draft.at)===6);   // wrap-up

  /* ── navigation ── */
  check("wrap-up: notes, Ask Claude, count", !!(await p.$(".note-in")) && !!(await p.$("button:has-text('Ask Claude')")) && (await p.textContent("#cnt")).includes("exercises logged"));
  await p.click(".pager .pv");
  check("back one", await ev(()=>draft.at)===5 && (await p.textContent("#pos"))==="6 / 6");
  await p.click(".seg >> nth=0");
  check("tap a segment to jump", await ev(()=>draft.at)===0);
  check("minimum mark after the third exercise", await ev(()=>{ const s=[...document.querySelector(".segs").children]; return s[3]?.classList.contains("minmark"); }));
  check("minimum not reached yet → says what it is", (await p.textContent("#prog")).includes("Min: first 3"));
  await ev(()=>{ draft.entries.a2[0].r="10"; draft.entries.a3[0].r="10"; render(); });
  check("minimum reached → says so", (await p.textContent("#prog")).includes("Minimum done"));
  for(const i of [0,2,4]){ await ev(i=>{ draft.at=i; render(); },i); check(`Finish on exercise ${i+1}`, !!(await p.$("#fin"))); }
  await ev(()=>{ draft.at=1; render(); });
  await p.reload();
  check("reload keeps the exercise on screen", await ev(()=>draft.at)===1 && !!(await p.$("#ex-a2")));
  // swipe (touch) toward the reading direction = next
  const swipe=(dx)=>ev(dx=>{ const el=document.getElementById("exview"),r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+40;
    const T=(x)=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
    el.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[T(x)],changedTouches:[T(x)]}));
    el.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],changedTouches:[T(x+dx)]})); },dx);
  await ev(()=>{ draft.rir.a2=1; });
  await swipe(-120); check("swipe left → next (English)", await ev(()=>draft.at)===2);
  await swipe(120); check("swipe right → back", await ev(()=>draft.at)===1);
  await swipe(-20); check("a short drag doesn't move", await ev(()=>draft.at)===1);

  /* ── ⋯ menu ── */
  await p.click(".more");
  const m=await p.textContent("#modal");
  check("⋯ has unit, right/left, swap, video, pin link, warm-ups, sets, setup note, rest",
    ["Unit","Right / left","Swap / rename","How-to video","Pin a YouTube link","Warm-up sets","Sets","Setup note","Start rest"].every(t=>m.includes(t)), m);
  await p.click("#mform .chip:has-text('lb')");
  check("unit from the menu", await ev(()=>draft.units.a2)==="lb" && await ev(()=>document.getElementById("modal").classList.contains("on")));
  await p.click("#mform .chip:has-text('kg')");
  await p.click("#mform .chip:has-text('S1')");
  check("warm-up from the menu", await ev(()=>draft.entries.a2[0].warm)===true && await ev(()=>document.getElementById("row-a2-0").classList.contains("warm")));
  await p.click("#mform .chip:has-text('+')");
  check("add a set from the menu", await ev(()=>draft.counts.a2)===4 && (await p.$$("#sets-a2 .srow")).length===4);
  await p.click("#mform .mi:has-text('Setup note')"); await p.fill("#minput","Bench at 30°"); await p.click("#myes");
  check("setup note from the menu, marked on the exercise", await ev(()=>D.exNotes.a2)==="Bench at 30°" && (await p.textContent("#ex-a2 .meta")).includes("📌"));
  await ev(()=>{ draft.at=draft.ids.indexOf("a3"); render(); exMenu("a3"); });
  check("plate calculator only for barbell lifts", !(await p.textContent("#modal")).includes("Plate calculator"));
  await ev(()=>closeSheet());
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── an old workout: same screen, no timer, no prompt, RIR editable ── */
  p=await open({lang:"en"}); ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>openSession(0));
  check("old workout opens on the first exercise with Save", await ev(()=>draft.at)===0 && (await p.textContent("#fin"))==="Save");
  await p.click(`#row-a1-0 ${PLUS("r")}`);
  check("editing: no rest timer", !(await ev(()=>document.getElementById("timer").classList.contains("on"))));
  check("editing: RIR can be added", (await p.textContent("#rir-a1")).includes("add"));
  await p.click(".pager .nx");
  check("editing: no RIR prompt", await ev(()=>draft.at)===1 && !(await ev(()=>document.getElementById("modal").classList.contains("on"))));
  await p.done();

  /* ── Arabic: right-to-left, but −/+ keep their places; swipe right = next ── */
  p=await open({time:"2026-09-26T10:00:00Z"}); ev=(f,a)=>p.evaluate(f,a);
  await p.click(".hero .btn");
  const [minus,plus]=await ev(()=>[...document.querySelectorAll("#row-a1-0 .stp-r button")].map(b=>b.getBoundingClientRect().x));
  check("Arabic: − on the left, + on the right", minus<plus, {minus,plus});
  await ev(()=>{ draft.entries.a1.forEach(r=>{ r.r="10"; }); paintEx("a1"); });
  check("Arabic: 3+ reads 3+", (await p.textContent("#rir-a1 .rb >> nth=3"))==="3+");
  await ev(()=>{ draft.rir.a1=0; });
  const el=await ev(()=>{ const el=document.getElementById("exview"),r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+40;
    const T=x=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
    el.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[T(x)],changedTouches:[T(x)]}));
    el.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],changedTouches:[T(x+120)]})); return draft.at; });
  check("Arabic: swipe right → next", el===1);
  check("Arabic: no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── c6 is "Calf Raise (Leg Press)"; old data renamed, sets untouched; export format unchanged ── */
  p=await open({lang:"en"}); ev=(f,a)=>p.evaluate(f,a);
  check("fresh install: Calf Raise (Leg Press)", await ev(()=>nameOf(byId("c6")))==="Calf Raise (Leg Press)"
    && await ev(()=>D.sessions.find(s=>s.entries.c6)?.names.c6)==="Calf Raise (Leg Press)");
  await ev(()=>{ const old={...defaults(),migrated:2,swaps:{a3:"Chest Cable Row",c6:"Seated Calf Raise"},
    sessions:[{date:"2026-08-27",workout:"C",entries:{c6:[{w:"60",r:"15",r2:"",warm:false}]},units:{c6:"kg"},names:{c6:"Seated Calf Raise"},counts:{c6:1},rir:{}}]};
    localStorage.setItem(KEY,JSON.stringify(old)); });
  await p.reload();
  const c6=await ev(()=>({name:nameOf(byId("c6")),past:D.sessions[0].names.c6,sets:D.sessions[0].entries.c6,swap:D.swaps.c6,a3:D.swaps.a3,v:D.migrated}));
  check("old data: renamed everywhere, sets untouched", c6.name==="Calf Raise (Leg Press)"&&c6.past==="Calf Raise (Leg Press)"&&c6.swap===undefined&&c6.a3==="Chest Cable Row"
    &&JSON.stringify(c6.sets)==='[{"w":"60","r":"15","r2":"","warm":false}]'&&c6.v===3, c6);
  check("CSV of old files still finds c6", await ev(()=>nameToId("Seated Calf Raise")==="c6"&&nameToId("Calf Raise (Leg Press)")==="c6"));
  const csvHead=await ev(async()=>{ let out=""; window.giveFile=async(n,t)=>{ out=t; return true; }; await exportCSV(); return out.replace(/^﻿/,"").split("\n")[0]; });
  check("CSV columns unchanged", csvHead==="date,workout,exercise,exercise_id,set,warmup,weight,unit,reps,reps_left,rir,session_minutes,session_note", csvHead);

  /* ── version shown in Settings ── */
  await ev(()=>go("set"));
  const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8"),v=html.match(/js\/main\.js\?v=(\w+)/)[1];
  check("version number visible in Settings", (await p.textContent("#version")).includes(v), [await p.textContent("#version"),v]);
  check("no page errors (rename)", p.errs.length===0, p.errs);
  await p.done();
};
