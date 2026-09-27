/* Batch 13: the home screen — next workout, month ring, bodyweight, this week, last workout, records. */
const {open,check}=require("./lib.js");

module.exports=async()=>{
  for(const lang of ["en","ar"]){
    const p=await open({lang,time:"2026-09-26T10:00:00Z"});   // a Saturday: the first day of the week
    const ev=(f,a)=>p.evaluate(f,a);
    const t=(ar,en)=>lang==="ar"?ar:en;
    const txt=sel=>p.textContent(sel);

    // fresh install: the three seed sessions (August)
    check(`${lang}: hero shows the next day`, (await txt(".hero .hero-title"))===t("تمرين A","Workout A")
      && (await txt(".hero")).includes("Leg Press / Hack Squat") && (await txt(".hero")).includes(t("+ ٣ تانيين","+ 3 more")));
    check(`${lang}: month ring 0 of 10`, (await txt(".ring-n")).replace(/\s/g,"")==="0/10" && !(await p.$(".ring .fill")));
    check(`${lang}: no weigh-in yet → prompt`, (await txt(".bwc")).includes(t("سجّل وزنك","Log your weight")) && !(await p.$(".bwc .spark")));
    check(`${lang}: last workout = the newest seed session`, (await txt(".lastw")).includes(t("تمرين C","Workout C")));
    check(`${lang}: week strip, Saturday first, today marked`, (await p.$$(".wd")).length===7
      && await ev(()=>document.querySelectorAll(".wd")[0].classList.contains("today")) && (await p.$$(".wd.on")).length===0);

    // the switch link moves to the next day
    await p.click(".hero-link");
    check(`${lang}: switch day from the hero`, (await txt(".hero-title"))===t("تمرين B","Workout B") && await ev(()=>D.cursor)==="B");
    await ev(()=>{ D.cursor="A"; save(); render(); });

    // weigh-ins → value, change and a sparkline (right-to-left in Arabic)
    await ev(()=>{ D.bw=[{date:"2026-09-01",kg:82},{date:"2026-09-10",kg:81},{date:"2026-09-20",kg:80.5}]; save(); render(); });
    check(`${lang}: bodyweight card`, (await txt(".bwc .bw-n")).includes("80.5") && (await txt(".bwc")).includes(t("نزلت 1.5","−1.5")), await txt(".bwc"));
    const pts=await ev(()=>document.querySelector(".bwc polyline").getAttribute("points").split(" ").map(s=>+s.split(",")[0]));
    check(`${lang}: sparkline runs with the reading direction`, pts.length===3 && (lang==="ar"?pts[0]>pts[2]:pts[0]<pts[2]), pts);
    await p.click(".bwc"); check(`${lang}: bodyweight card opens Progress`, await ev(()=>tab)==="prog");
    await ev(()=>go("plan"));

    // a workout from the hero today → week strip, ring, last workout, record
    await p.click(".hero .btn");
    const inp=await p.$$("#sets-a1 input"); await inp[0].fill("120"); await inp[1].fill("10");
    await ev(()=>{ draft.startedAt=Date.now()-45*6e4; });
    await p.click("#fin"); await p.click("#myes");
    check(`${lang}: after a workout the hero moves on`, (await txt(".hero-title"))===t("تمرين B","Workout B"));
    check(`${lang}: today filled in the week`, await ev(()=>document.querySelectorAll(".wd")[0].classList.contains("on")) && (await txt(".week")).includes(t("١ حصص","1 workout")));
    check(`${lang}: ring 1 of 10`, (await txt(".ring-n")).replace(/\s/g,"")==="1/10" && !!(await p.$(".ring .fill")));
    const last=await txt(".lastw");
    check(`${lang}: last workout: day, today, sets, minutes, record`, last.includes(t("تمرين A","Workout A")) && last.includes(t("النهارده","today"))
      && last.includes(t("٤٥","45")) && (await p.$(".lastw .chip.on")) !== null, last);
    check(`${lang}: records card lists it`, (await txt("#app")).includes(t("أتقل وزن: 120 كجم × 10","Heaviest: 120 kg × 10")));
    await p.click(".lastw");
    check(`${lang}: last workout opens it`, await ev(()=>draft&&draft.edit===D.sessions.length-1));
    await ev(()=>{ draft=null; render(); });

    // goal reached
    await ev(()=>{ D.goal=1; save(); render(); });
    check(`${lang}: month goal done`, (await txt(".goal")).includes(t("هدف الشهر تم","Month goal done")));
    check(`${lang}: no page errors`, p.errs.length===0, p.errs);
    await p.done();
  }

  // narrow phone: nothing sticks out sideways
  for(const lang of ["en","ar"]){
    const p=await open({lang});
    await p.setViewportSize({width:320,height:700});
    await p.evaluate(()=>{ D.bw=[{date:"2026-09-01",kg:82},{date:"2026-09-20",kg:80.5}]; save(); render(); });
    const over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    check(`${lang} 320px: no sideways scroll`, over<=0, over);
    await p.done();
  }
};
