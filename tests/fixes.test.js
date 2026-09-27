/* Batch 1: unfinished workout kept, old sessions keep their own units/names/sides,
   history by date, phone time zone, Arabic digits, warm-up alignment. */
const {open,check}=require("./lib.js");
module.exports=async()=>{
  // B4 — 1:30 am in Cairo on Sep 27 is still Sep 26 in UTC
  let p=await open({time:'2026-09-26T22:30:00Z'});
  check('B4 today() uses phone time zone', await p.evaluate(()=>today())==='2026-09-27', await p.evaluate(()=>today()));
  await p.done();

  p=await open({time:'2026-09-26T10:00:00Z'});
  const ev=(f,a)=>p.evaluate(f,a);
  const show=id=>ev(id=>{ draft.at=draft.ids.indexOf(id); render(); },id);   // one exercise on screen at a time
  // B5 — Arabic-Indic digits and comma decimals
  await p.click('text=ابدأ الحصة');
  let inp=await p.$$('#sets-a1 input');
  await inp[0].fill('١٠٠'); await inp[1].fill('٨');
  await show('a2'); inp=await p.$$('#sets-a2 input'); await inp[0].fill('12,5'); await inp[1].fill('10');
  check('B5 digits stored as 100/8', JSON.stringify(await ev(()=>draft.entries.a1[0]))===JSON.stringify({w:"100",r:"8",r2:"",warm:false}), await ev(()=>draft.entries.a1[0]));
  check('B5 comma decimal stored as 12.5', await ev(()=>draft.entries.a2[0].w)==='12.5');
  check('B5 num() helper', await ev(()=>[num("٧٫٥"),num("۱۲"),num("7,5"),num(""),num("x")].join())==='7.5,12,7.5,0,0');

  // B1 — reload mid-workout keeps everything, including a running rest
  await ev(()=>startTimer(90));
  await p.clock.runFor(10000);
  await p.reload();
  check('B1 session screen restored after reload', !!(await p.$('#fin')));
  check('B1 values restored', await ev(()=>draft.entries.a1[0].w+"x"+draft.entries.a1[0].r+" "+draft.entries.a2[0].w)==='100x8 12.5');
  check('B1 rest timer resumed', await ev(()=>document.getElementById('timer').classList.contains('on')));
  const tval=await p.textContent('#tval'); check('B1 timer continues (≈01:20)', /^01:(19|20|21)$/.test(tval), tval);
  // finishing clears the stored draft
  await p.click('#fin');
  check('B1 draft cleared after finish', await ev(()=>localStorage.getItem(DRAFT_KEY))===null);
  check('B5 volume uses cleaned numbers', await ev(()=>Math.round(volume(D.sessions.at(-1))))===100*8+12.5*10*2, await ev(()=>volume(D.sessions.at(-1))));
  await p.reload();
  check('B1 no stale session after finish+reload', !(await p.$('#fin')));

  // B2 — log B with a2… use A again: record a session with lb on a2 and a renamed a3
  await ev(()=>{ D.cursor="A"; save(); render(); });
  await p.click('text=ابدأ الحصة');
  await ev(()=>setUnit('a2','lb')); await show('a2');
  inp=await p.$$('#sets-a2 input'); await inp[0].fill('25'); await inp[1].fill('10');
  await p.click('#fin');
  const lbIdx=await ev(()=>D.sessions.length-1);
  // next workout: switch a2 back to kg and rename a3
  await ev(()=>{ D.cursor="A"; save(); render(); });
  await p.click('text=ابدأ الحصة');
  await ev(()=>setUnit('a2','kg'));
  await ev(()=>{ D.swaps.a3="Seal Row"; save(); });
  await ev(()=>{ draft=null; render(); });
  // edit the old lb session and save it without touching anything
  await ev(i=>openSession(i),lbIdx);
  await show('a2');
  check('B2 old session shows its own unit (lb)', await ev(()=>draft.units.a2)==='lb' && (await p.textContent('#sets-a2 .stp-w span'))==='باوند');
  await show('a3');
  check('B2 old session shows its own name', (await p.textContent('#ex-a3 h2'))==='Chest Cable Row', await p.textContent('#ex-a3 h2'));
  await p.click('#fin');
  check('B2 saved unit stays lb', await ev(i=>D.sessions[i].units.a2,lbIdx)==='lb');
  check('B2 saved name unchanged', await ev(i=>D.sessions[i].names.a3,lbIdx)==='Chest Cable Row');
  check('B2 global default is kg now', await ev(()=>D.units.a2)==='kg');
  // renaming inside an old session changes only that session
  await ev(i=>openSession(i),lbIdx);
  await ev(()=>swap('a4')); await p.fill('#minput','Stiff Leg DL'); await p.click('#myes');
  await p.click('#fin');
  check('B2 rename in old session stays local', await ev(i=>D.sessions[i].names.a4==='Stiff Leg DL'&&!D.swaps.a4,lbIdx));
  // seed session 2 (B) had right/left logged; turning the global toggle off must not hide it when editing
  await ev(()=>{ D.sides.b3=false; save(); });
  await ev(()=>openSession(D.sessions.findIndex(s=>s.date==="2026-08-24")));
  check('B2 old per-side session still shows left column', await ev(()=>draft.sides.b3===true));
  await ev(()=>{ draft=null; render(); });

  // B3 — a past-dated session added last must not become "last time"
  const lastBefore=await ev(()=>lastFor('a1').date);
  await ev(()=>{ draft=blankDraft("A","2026-08-01",null); draft.entries.a1[0]={w:"999",r:"1",r2:"",warm:false}; finish(); });
  check('B3 last = latest by date', await ev(()=>lastFor('a1').date)===lastBefore, await ev(()=>lastFor('a1').date));
  check('B3 history sorted by date', await ev(()=>{const h=historyOf('a1').map(x=>x.date);return h.join()===[...h].sort().join();}));
  check('B3 past session sees only earlier history', await ev(()=>lastFor('a1','2026-08-20').date)==='2026-08-01');

  // B9 — warm-up in set 1 keeps set numbers aligned next time
  await ev(()=>{ D.cursor="A"; render(); });
  await p.click('text=ابدأ الحصة');
  await ev(()=>{ addSet('a1'); const E=draft.entries.a1;
    E[0]={w:"40",r:"10",r2:"",warm:true}; E[1]={w:"60",r:"10",r2:"",warm:false};
    E[2]={w:"80",r:"10",r2:"",warm:false}; E[3]={w:"100",r:"8",r2:"",warm:false}; finish(); });
  await ev(()=>{ D.cursor="A"; render(); });
  await p.click('text=ابدأ الحصة');
  check('B9 same number of sets as last time', await ev(()=>draft.counts.a1)===4);
  check('B9 weights copied by set number', await ev(()=>draft.entries.a1.map(r=>r.w).join())==='40,60,80,100');
  check('B9 warm-up flag copied', await ev(()=>draft.entries.a1.map(r=>r.warm).join())==='true,false,false,false');
  const prev=await p.$$eval('#sets-a1 input',els=>els.map(e=>e.placeholder));   // weight, reps per set
  check('B9 last time (faint numbers) aligned by set', prev.join()==='40,10,60,10,80,10,100,8', prev);
  check('no page errors', p.errs.length===0, p.errs);
  await p.done();
};
