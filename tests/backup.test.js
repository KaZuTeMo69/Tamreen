/* Batch 3: CSV round trip, backup file checks, dates west of UTC, small UX fixes,
   backup reminder and share sheet. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path"),os=require("os");
const SP=fs.mkdtempSync(path.join(os.tmpdir(),"tamreen-"));   // files for restore / downloads
module.exports=async()=>{
  let p=await open({time:'2026-09-26T10:00:00Z'});
  const ev=(f,a)=>p.evaluate(f,a);
  const grab=async fn=>{ const [d]=await Promise.all([p.waitForEvent('download'),ev(fn)]); const f=path.join(SP,d.suggestedFilename()); await d.saveAs(f); return fs.readFileSync(f,'utf8'); };
  const restoreFile=async(name,content)=>{ const f=path.join(SP,name); fs.writeFileSync(f,content); await p.setInputFiles('#restoreFile',f); await p.waitForSelector('#modal.on'); };

  // B11 + B12 — names with commas/quotes, and a renamed exercise, survive export → import
  await ev(()=>{ D.sessions[0].names.a3='Row, "chest" supported'; D.sessions[0].names.a4='Old name nobody knows'; save(); });
  const before=await ev(()=>JSON.stringify(D.sessions.map(s=>[s.date,s.workout,Object.keys(s.entries).sort(),s.entries])));
  const csv=await grab(()=>exportCSV());
  check('B11 header has exercise_id', csv.replace(/^﻿/,'').startsWith('date,workout,exercise,exercise_id,set,'));
  check('B11 comma/quote name is quoted', csv.includes('"Row, ""chest"" supported"'));
  await restoreFile('t.csv',csv); await p.click('#myes');
  const after=await ev(()=>JSON.stringify(D.sessions.map(s=>[s.date,s.workout,Object.keys(s.entries).sort(),s.entries])));
  check('B12 CSV round trip keeps every set', after===before);
  check('B11 name read back intact', await ev(()=>D.sessions[0].names.a3)==='Row, "chest" supported');
  check('B12 unknown-name exercise kept via id', await ev(()=>!!D.sessions[0].entries.a4&&D.sessions[0].names.a4==='Old name nobody knows'));
  // an old-format CSV (no exercise_id, no quotes) still imports
  await restoreFile('old.csv','date,workout,exercise,set,warmup,weight,unit,reps,reps_left,rir\n2026-08-23,A,Leg Press / Hack Squat,1,,60,kg,10,,\n2026-08-23,A,Chest Cable Row,1,,25,kg,12,,2\n');
  await p.click('#myes');
  check('B11 old CSV format imports', await ev(()=>D.sessions.length===1&&D.sessions[0].entries.a1[0].w==="60"&&D.sessions[0].rir.a3===2));

  // B13 — tampered / broken JSON backup
  await ev(()=>{ D.goal=12; save(); });
  const evil={sessions:[
      {date:"2026-09-01",workout:"A",entries:{a1:[{w:80,r:"٨",r2:null,warm:0}]},units:{a1:"<b>"},names:{a1:"<img src=x onerror=alert(1)>"},rir:{a1:9}},
      {date:"bad",workout:"A",entries:{}},{date:"2026-09-02",workout:"Z",entries:{}}],
    waist:[{date:"2026-09-01",cm:"<img src=x>"},{date:"2026-09-02",cm:"90"}],
    videos:{a1:"javascript:alert(1)",a2:"https://youtu.be/x"},units:{a2:"lb",zz:"kg"},cursor:"Q"};
  await restoreFile('evil.json',JSON.stringify(evil));
  check('B13 confirm mentions 2 broken sessions', (await p.textContent('#mbody')).includes('2 حصة فيها بيانات بايظة'));
  await p.click('#myes');
  check('B13 only the valid session restored', await ev(()=>D.sessions.length)===1);
  check('B13 row cleaned', await ev(()=>JSON.stringify(D.sessions[0].entries.a1[0]))==='{"w":"80","r":"8","r2":"","warm":false}');
  check('B13 bad unit / rir dropped', await ev(()=>D.sessions[0].units.a1==="kg"&&D.sessions[0].rir.a1===undefined));
  check('B13 javascript: link dropped, https kept', await ev(()=>!D.videos.a1&&D.videos.a2==="https://youtu.be/x"));
  check('B13 bad waist entry dropped', await ev(()=>JSON.stringify(D.waist))==='[{"date":"2026-09-02","cm":90}]');
  check('B13 unknown ids / cursor ignored', await ev(()=>!("zz" in D.units)&&D.units.a2==="lb"&&D.cursor==="A"));
  check('B13 setting missing from file kept (goal 12)', await ev(()=>D.goal)===12);
  await p.click('nav button[data-tab=log]');
  check('B13 HTML in names is not executed', (await p.$$('img[src=x]')).length===0);
  // very old backup (before names were frozen, merged leg card) → migration runs
  await restoreFile('ancient.json',JSON.stringify({sessions:[{date:"2026-08-10",workout:"C",entries:{c4:[{w:"40",r:"12"}]},units:{c4:"kg"}}],migrated:0}));
  await p.click('#myes');
  check('B13 migration runs after restore', await ev(()=>{const s=D.sessions[0];return !!s.entries.c4b&&!s.entries.c4&&s.names.c4b==="Seated Leg Curl"&&D.migrated===2;}));
  // pinning a link
  await ev(()=>pinVideo('a1')); await p.fill('#minput','javascript:alert(1)'); await p.click('#myes');
  check('B13 pinning javascript: rejected', await ev(()=>!D.videos.a1));
  await ev(()=>pinVideo('a1')); await p.fill('#minput','youtube.com/watch?v=abc'); await p.press('#minput','Enter');
  check('B16 Enter confirms + scheme added', await ev(()=>D.videos.a1)==='https://youtube.com/watch?v=abc');

  // F2 — backup marks the time; Log shows it; reminder logic
  await ev(()=>{ D.lastBackup=0; D.changedAt=Date.now(); save(); go('plan'); });
  check('F2 plan reminder when never backed up', (await p.textContent('#app')).includes('لسه ماعملتش نسخة احتياطية'));
  await grab(()=>backup());
  check('F2 backup sets lastBackup', await ev(()=>D.lastBackup>0));
  check('F2 reminder gone after backup', !(await p.textContent('#app')).includes('اضغط هنا واعملها'));
  await ev(()=>go('log')); check('F2 log shows last backup today', (await p.textContent('#app')).includes('آخر نسخة: النهارده.'));
  await ev(()=>{ D.lastBackup=Date.now()-10*864e5; D.changedAt=Date.now(); go('plan'); });
  check('F2 reminder after 10 days with changes', (await p.textContent('#app')).includes('بقالك ١٠ يوم'));
  await ev(()=>{ D.changedAt=D.lastBackup-1; render(); });
  check('F2 no reminder when nothing changed', !(await p.textContent('#app')).includes('بقالك'));

  // B16 — edit-mode back button, − set, toast above timer, viewport
  await ev(()=>{ D.sessions.push({date:"2026-09-20",workout:"A",entries:{a1:[{w:"50",r:"10",r2:"",warm:false}]},units:{a1:"kg"},names:{},counts:{},sides:{},rir:{}}); save(); openSession(D.sessions.length-1); });
  await p.click('text=رجوع');
  check('B16 back without changes leaves directly', await ev(()=>draft===null&&!document.getElementById('modal').classList.contains('on')));
  await ev(()=>openSession(D.sessions.length-1));
  const inp=await p.$$('#sets-a1 input'); await inp[1].fill('11');
  await p.click('text=رجوع');
  check('B16 back with changes asks first', await ev(()=>document.getElementById('modal').classList.contains('on')&&draft!==null));
  await p.click('#mno');
  await ev(()=>delSet('a1'));   // 3 rows: last row empty → removed without asking
  check('B16 empty set removed without asking', await ev(()=>draft.counts.a1===2&&!document.getElementById('modal').classList.contains('on')));
  await ev(()=>{ draft.entries.a1[1].r="9"; delSet('a1'); });
  check('B16 set with reps asks first', await ev(()=>document.getElementById('modal').classList.contains('on')&&draft.counts.a1===2));
  await p.click('#myes'); check('B16 confirmed → removed', await ev(()=>draft.counts.a1)===1);
  await ev(()=>{ startTimer(90); toast("x"); });
  const [tb,tt]=await ev(()=>[document.getElementById('timer').getBoundingClientRect().top,document.getElementById('toast').getBoundingClientRect().bottom]);
  check('B16 toast sits above the rest timer', tt<=tb, {tt,tb});
  check('B16 pinch zoom not blocked', !(await p.getAttribute('meta[name=viewport]','content')).includes('maximum-scale'));
  const small=await ev(()=>[...document.querySelectorAll('input,select')].filter(e=>e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<16).length);
  check('B16 no text field under 16px (no iPhone zoom-on-tap)', small===0, small);
  check('no page errors', p.errs.length===0, p.errs);
  await p.done();

  // B14 — dates west of UTC
  p=await open({tz:'America/New_York',time:'2026-09-26T16:00:00Z'});
  check('B14 fdate shows the stored day in New York', await p.evaluate(()=>fdate("2026-08-23")).then(s=>s.includes('٢٣')), await p.evaluate(()=>fdate("2026-08-23")));
  await p.done();

  // F2 — share sheet on a phone
  p=await open({time:'2026-09-26T10:00:00Z'});
  await p.evaluate(()=>{ window.__shared=[]; window.matchMedia=q=>({matches:/coarse/.test(q)});
    navigator.canShare=()=>true; navigator.share=async d=>{ window.__shared.push(d.files[0].name); }; });
  await p.evaluate(()=>backup()); await p.waitForFunction(()=>D.lastBackup>0);
  check('F2 phone → share sheet used', (await p.evaluate(()=>window.__shared)).join()===`tamreen-backup-2026-09-26.json`);
  await p.evaluate(()=>{ D.lastBackup=0; navigator.share=async()=>{ throw new DOMException("x","AbortError"); }; });
  await p.evaluate(()=>backup());
  check('F2 cancelled share → not marked as backed up', await p.evaluate(()=>D.lastBackup)===0);
  await p.done();
};
