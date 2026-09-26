/* Batch 4: the "Ask Claude" message and how it is handed over. */
const {open,check}=require("./lib.js");
const R=(w,r,x={})=>({w:String(w??""),r:String(r),r2:"",warm:false,...x});
module.exports=async()=>{
  let p=await open({time:'2026-09-26T10:00:00Z',permissions:['clipboard-read','clipboard-write']});
  const ev=(f,a)=>p.evaluate(f,a);
  // three earlier B sessions with lat pulldown + dips-style cases, then today's workout
  await ev(R=>{
    const S=(date,e,rir,units)=>({date,workout:"B",entries:e,units:units||{},names:{},counts:{},sides:{},rir:rir||{}});
    D.sessions.push(
      S("2026-09-05",{b7:[{w:"45",r:"12",r2:"",warm:false},{w:"45",r:"11",r2:"",warm:false}]}),
      S("2026-09-12",{b7:[{w:"45",r:"12",r2:"",warm:false},{w:"50",r:"10",r2:"",warm:false}]},{b7:2}),
      S("2026-09-19",{b7:[{w:"20",r:"12",r2:"",warm:true},{w:"50",r:"12",r2:"",warm:false},{w:"50",r:"10",r2:"",warm:false}]},{b7:1}));
    D.bw=[{date:"2026-09-20",kg:80}]; D.cursor="B"; save(); render();
  });
  await p.click('text=ابدأ الحصة');
  check('button on a new session', !!(await p.$('button:has-text("اسأل Claude")')));
  await p.click('button:has-text("اسأل Claude")');
  check('no sets yet → asks to log one', (await p.textContent('#toast')).includes('سجّل ست واحد'));
  await ev(()=>{ const E=draft.entries;
    E.b7=[{w:"20",r:"12",r2:"",warm:true},{w:"55",r:"10",r2:"",warm:false},{w:"55",r:"9",r2:"",warm:false}];
    E.b1=[{w:"20",r:"6",r2:"",warm:false},{w:"",r:"3",r2:"",warm:false},{w:"25",r:"",r2:"",warm:false}];
    E.b2=[{w:"10",r:"10",r2:"9",warm:false}]; draft.sides.b2=true;
    E.b3=[{w:"30",r:"10",r2:"",warm:false}]; draft.units.b3="lb";
    E.b6=[{w:"",r:"30",r2:"",warm:false},{w:"",r:"25",r2:"",warm:false}];
    draft.rir.b7=1; draft.rir.b1=3; saveDraft(); });
  const t=await ev(()=>sessionText(draft));
  check('header question', t.includes('add weight, keep it, lower it, or swap the exercise'));
  check('date + weekday', t.includes('Session: Workout B — Sat 2026-09-26.'));
  check('bodyweight line (B has pull-ups)', t.includes('Bodyweight: 80 kg.'));
  check('no bodyweight line when none logged', await ev(()=>{ const keep=D.bw; D.bw=[]; const x=sessionText(draft); D.bw=keep; return !x.includes('Bodyweight'); }));
  check('plan line', t.includes('Lat Pulldown — machine, plan 3 × 10–12 reps'));
  check('today with warm-up + RIR', t.includes('Today: 20kg×12 (warm-up), 55kg×10, 55kg×9 · RIR 1'));
  check('last time 7 days ago, warm-up shown', t.includes('Last time (7 days ago): 20kg×12 (warm-up), 50kg×12, 50kg×10 · RIR 1'));
  check('older history newest first', t.includes('Before: 09-12: 45kg×12, 50kg×10 · RIR 2 | 09-05: 45kg×12, 45kg×11'));
  check('assisted + BW + unused row dropped + RIR 3+', t.includes('Today: assist 20kg×6, BW×3 · RIR 3+'));
  check('right/left, one side at a time', t.includes('Bulgarian Split Squat — dumbbells (weight per hand), plan 3 × 8–10 reps, one side at a time') && t.includes('Today: 10kg×R10/L9'));
  check('lb unit kept', t.includes('Today: 30lb×10'));
  check('seconds for holds', t.includes('plan 3 × 20–45 seconds') && t.includes('Today: 30s, 25s'));
  check('first time exercise', await ev(()=>{ const keep=D.sessions; D.sessions=[]; const x=sessionText(draft); D.sessions=keep; return x.includes('First time doing this exercise.')&&!x.includes('Last time'); }));
  check('skipped list', /Not done today: .*Lying Leg Curl/.test(t));
  // desktop → clipboard
  await p.click('button:has-text("اسأل Claude")');
  await p.waitForFunction(()=>document.getElementById('toast').textContent.includes('اتنسخ'));
  check('desktop: copied to clipboard', await ev(()=>navigator.clipboard.readText())===t);
  // phone → share sheet
  await ev(()=>{ window.__shared=null; window.matchMedia=q=>({matches:/coarse/.test(q)}); navigator.share=async d=>{ window.__shared=d; }; });
  await p.click('button:has-text("اسأل Claude")');
  await p.waitForFunction(()=>window.__shared);
  check('phone: share sheet gets the text', await ev(()=>JSON.stringify(window.__shared))===JSON.stringify({text:t}));
  await ev(()=>{ navigator.share=async()=>{ throw new DOMException("x","AbortError"); }; window.__copied=false;
    navigator.clipboard.writeText=async()=>{ window.__copied=true; }; });
  await p.click('button:has-text("اسأل Claude")'); await p.waitForTimeout(200);
  check('phone: cancelled share does nothing else', await ev(()=>!window.__copied&&!document.getElementById('modal').classList.contains('on')));
  // neither allowed → copyable box
  await ev(()=>{ navigator.share=undefined; navigator.clipboard.writeText=async()=>{ throw new Error("denied"); }; });
  await p.click('button:has-text("اسأل Claude")');
  await p.waitForSelector('#modal.on');
  check('fallback: text shown in a read-only box', await ev(()=>{ const a=document.getElementById('marea'); return getComputedStyle(a).display!=="none"&&a.readOnly&&a.value; })===t);
  await p.click('#myes');
  check('fallback box hidden for other sheets', await ev(()=>{ swap('b7'); const h=getComputedStyle(document.getElementById('marea')).display==="none"; document.getElementById('mno').click(); return h; }));
  // finish, then ask about the same session from the log: history must not include itself
  await p.click('#fin');
  await ev(()=>openSession(D.sessions.findIndex(s=>s.date==="2026-09-19")));
  check('button on an old session', !!(await p.$('button:has-text("اسأل Claude")')));
  const old=await ev(()=>sessionText(draft));
  check('old session: history excludes itself', old.includes('Today: 20kg×12 (warm-up), 50kg×12, 50kg×10 · RIR 1') && old.includes('Last time (7 days ago): 45kg×12, 50kg×10 · RIR 2') && !old.includes('55kg'));
  check('no page errors', p.errs.length===0, p.errs);
  await p.done();
};
