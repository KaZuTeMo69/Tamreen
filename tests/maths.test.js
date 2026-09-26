/* Batch 2: assisted pull-ups, dips with bodyweight, per-side volume, lb display,
   settings and the bodyweight log. Also: data saved by the original app still loads. */
const {open,check}=require("./lib.js");
module.exports=async()=>{
  // data saved by the ORIGINAL single-file app (seed + one session) must load cleanly
  const oldData=JSON.stringify(require("./fixtures/v1-data.json"));

  let p=await open({time:'2026-09-26T10:00:00Z'});
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(d=>{ localStorage.setItem('tamreen-v2',d); },oldData); await p.reload();
  check('old data loads with new defaults', await ev(()=>D.sessions.length===4&&Array.isArray(D.bw)&&D.goal===10&&D.unit==="kg"&&D.rest.join()==="90,120"));

  // B7 — seed session A: lateral raises logged right/left are no longer doubled
  check('B7 seed A volume = 5460 kg', Math.round(await ev(()=>volume(D.sessions[0])))===5460, await ev(()=>volume(D.sessions[0])));
  check('B7 two-dumbbell lift without sides still ×2', await ev(()=>volume({entries:{a2:[{w:"10",r:"10",r2:"",warm:false}]},units:{a2:"kg"}}))===200);

  // B6 — assisted pull-ups
  const mk=(date,rows,rir)=>({date,workout:"B",entries:{b1:rows.map(([w,r])=>({w:String(w),r:String(r),r2:"",warm:false}))},units:{b1:"kg"},names:{},counts:{},sides:{},rir:rir===undefined?{}:{b1:rir}});
  await ev(s=>{ D.sessions.push(s); save(); },mk("2026-09-01",[[30,8],[30,8]]));
  let sg=await ev(()=>suggest(byId("b1")));
  check('B6 top of range → less assistance', sg.includes('مساعدة 25 كجم'), sg);
  await ev(s=>{ D.sessions.push(s); save(); },mk("2026-09-03",[[30,3]],0));
  sg=await ev(()=>suggest(byId("b1")));
  check('B6 too hard → more assistance', sg.includes('35 كجم')&&sg.includes('زوّد المساعدة'), sg);
  await ev(s=>{ D.sessions.push(s); save(); },mk("2026-09-05",[[5,8]],3));
  sg=await ev(()=>suggest(byId("b1")));
  check('B6 easy at 5 kg → no assistance', sg.includes('من غير مساعدة'), sg);
  check('B6 less assistance scores higher', await ev(()=>topSet({id:"b1",date:"2026-09-01",u:"kg",rows:[{w:"20",r:"6"}]}).sc>topSet({id:"b1",date:"2026-09-01",u:"kg",rows:[{w:"30",r:"6"}]}).sc));
  check('B6 assistance not counted as volume', await ev(()=>volume(D.sessions.at(-1)))===0);

  // B8 — dips: adding weight must not look like a drop
  const dip=(w,r)=>({id:"c1",date:"2026-09-10",u:"kg",rows:[{w:String(w),r:String(r)}]});
  check('B8 +5×8 beats BW×10 (no weigh-in yet)', await ev(([a,b])=>topSet(a).sc>topSet(b).sc,[dip(5,8),dip("",10)]));
  await p.click('nav button[data-tab=prog]');
  await p.fill('#log-bw','٨٠'); await p.click('button[onclick="addLog(\'bw\')"]');
  check('F4 bodyweight saved (Arabic digits)', await ev(()=>D.bw.length===1&&D.bw[0].kg===80&&D.bw[0].date==="2026-09-26"));
  check('B8 +5×8 beats BW×10 (with 80 kg)', await ev(([a,b])=>topSet(a).sc>topSet(b).sc,[dip(5,8),dip("",10)]));
  check('bwAt uses last weigh-in before the date', await ev(()=>{ D.bw.push({date:"2026-09-01",kg:82}); const r=[bwAt("2026-09-05"),bwAt("2026-09-30"),bwAt("2026-01-01")].join(); D.bw.pop(); return r; })==='82,80,82');

  // B10 — lb display
  await ev(()=>{ D.units.a2="lb"; save(); });
  let hl=await ev(()=>histLine("a2",undefined,"lb"));
  check('B10 history line in lb', hl.includes('(باوند)')&&hl.includes('31×10'), hl);   // 14 kg ≈ 30.9 lb → 31, same as pre-fill
  sg=await ev(()=>suggest(byId("a2"),undefined,"lb"));
  check('B10 suggestion in lb with lb step', sg.includes('باوند')&&!sg.includes('كجم'), sg);
  await ev(()=>{ D.cursor="A"; render(); }); await p.click('nav button[data-tab=plan]'); await p.click('text=ابدأ الحصة');
  check('B10 pre-filled weights converted to lb', await ev(()=>draft.entries.a2.map(r=>r.w).join())==='22,26.5,31', await ev(()=>draft.entries.a2.map(r=>r.w).join()));
  const prev=await p.$$eval('#sets-a2 .prev',els=>els.slice(1).map(e=>e.textContent));
  check('B10 previous column converted to lb', prev.join()==='22×12,26.5×10,31×10', prev);
  // plate calculator in lb
  await ev(()=>{ draft.units.c2="lb"; plateCalc("c2"); }); await p.fill('#minput','135'); await p.click('#myes');
  let body=await p.textContent('#mbody'), title=await p.textContent('#mtext');
  check('B10 plate calc in lb (45 bar, 45 each side)', title.includes('باوند')&&title.includes('45')&&body.trim()==='1 × 45', {title,body});
  await p.click('#myes'); await ev(()=>{ draft=null; render(); });

  // F3 settings
  await p.click('nav button[data-tab=set]');
  check('F3 settings tab renders', !!(await p.$('text=حاسبة أوزان البار')));
  check('F3 lb plate rows shown when lb is used', !!(await p.$('text=وزن البار (باوند)')));
  const fields=await p.$$('input.field');
  await fields[0].fill('Ahmed'); await fields[0].press('Tab');
  check('F3 name → avatar initial', (await p.textContent('button.avatar'))==='A' && await ev(()=>D.name)==='Ahmed');
  await ev(()=>setName("محمد")); check('F3 Arabic name initial', (await p.textContent('button.avatar'))==='م');
  await ev(()=>setGoal("٥٠")); check('F3 goal out of range rejected', await ev(()=>D.goal)===10);
  await ev(()=>setGoal("12")); await ev(()=>setRest(0,"60")); await ev(()=>setRest(1,"180"));
  await ev(()=>setPlates("kg","25, 20 ،10")); await ev(()=>setBar("kg","15"));
  check('F3 plates parsed & sorted', await ev(()=>D.plates.join())==='25,20,10');
  await p.click('nav button[data-tab=plan]');
  check('F3 goal shows on plan', (await p.$$('.pill')).length===12 && (await p.textContent('.card .row')).includes('/ 12'));
  await p.click('text=ابدأ الحصة');
  const rest=await p.$$eval('#ex-a1 button[onclick^="startTimer"]',b=>b.map(x=>x.textContent+"|"+x.getAttribute('onclick')));
  check('F3 rest buttons use settings', rest.includes('راحة ٦٠|startTimer(60)')&&rest.includes('١٨٠|startTimer(180)'), rest);
  await ev(()=>{ draft.units.c2="kg"; plateCalc("c2"); }); await p.fill('#minput','100'); await p.click('#myes');
  body=await p.textContent('#mbody');
  check('F3 plate calc uses bar 15 + custom plates', body.includes('1 × 25')&&body.includes('1 × 10')&&body.includes('باقي 7.5'), body);
  await p.click('#myes'); await ev(()=>{ draft=null; render(); });
  // default unit lb → bodyweight shown in lb
  await ev(()=>setDefUnit("lb")); await p.click('nav button[data-tab=prog]');
  const bwTxt=await p.textContent('.card:has(#log-bw) .row .num');
  check('F3/F4 bodyweight shown in lb', bwTxt.includes('176.4')&&bwTxt.includes('lb'), bwTxt);
  // progress rows for dips / pull-ups
  await ev(()=>{ progEx="b1"; render(false); });
  const rows=await p.$$eval('.card .row .num',e=>e.map(x=>x.textContent));
  check('B6 progress row says assistance', rows.some(t=>t.startsWith('مساعدة')), rows);
  // wipe resets settings
  await ev(()=>{ D={...defaults(),migrated:2}; save(); render(); });
  check('wipe defaults', await ev(()=>D.goal===10&&D.unit==="kg"&&D.plates.join()===PLATES.join()&&D.bw.length===0));
  check('no page errors', p.errs.length===0, p.errs);
  await p.done();
};
