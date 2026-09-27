/* Batch 14: free Arabic font (Readex Pro), volume in the main unit, Arabic "seconds", tests on GitHub. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path");

module.exports=async()=>{
  const p=await open();   // Arabic
  const ev=(f,a)=>p.evaluate(f,a);
  check("Arabic text uses Readex Pro", /^"?Readex Pro/.test(await ev(()=>getComputedStyle(document.body).fontFamily)));
  check("Readex Pro file loads and covers the Arabic", await ev(async()=>{ await document.fonts.load("16px 'Readex Pro'","تمرين الشدّة ٠١٢");
    return document.fonts.check("16px 'Readex Pro'","تمرين") && [...document.fonts].some(f=>f.family.replace(/"/g,"")==="Readex Pro"&&f.status==="loaded"); }));
  const files=await ev(async()=>[await fetch("index.html").then(r=>r.text()),await fetch("css/app.css").then(r=>r.text()),
    (await fetch("fonts/tafkir-arabic.woff2")).status]);
  check("the trial font is gone", !/tafkir/i.test(files[0]+files[1]) && files[2]===404);
  check("font licences are in the repo", ["ReadexPro-OFL.txt","Orbitron-OFL.txt"].every(f=>
    /SIL OPEN FONT LICENSE Version 1\.1/.test(fs.readFileSync(path.join(__dirname,"..","fonts",f),"utf8"))));

  // seconds in Arabic on the plan list (Workout B ends with a timed hold)
  await ev(()=>{ D.cursor="B"; save(); render(); });
  const plan=await p.textContent("#app");
  check("plan list: seconds in Arabic", plan.includes("20–45 ث") && !plan.includes(" sec"));

  // volume in the main unit (log list and last-workout card)
  await ev(()=>{ D.unit="lb"; save(); render(); });
  const want=await ev(()=>{ const i=D.sessions.length-1; return Math.round(fromKg(volume(D.sessions[i]),"lb")).toLocaleString("en"); });
  check("home: last workout volume in lb", (await p.textContent(".lastw .stats")).includes(want) && (await p.textContent(".lastw")).includes("باوند حجم"));
  await p.click("nav button[data-tab=log]");
  check("log: volume in lb", (await p.textContent("#app")).includes(`${want} lb`), want);
  await ev(()=>{ D.unit="kg"; save(); render(); });
  check("log: back in kg", (await p.textContent("#app")).includes(await ev(()=>Math.round(volume(D.sessions[2])).toLocaleString("en")+" kg")));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  // the tests run on GitHub for every pull request and push to main
  const wf=fs.readFileSync(path.join(__dirname,"..",".github","workflows","tests.yml"),"utf8");
  check("GitHub runs npm test on pull requests and main", /pull_request/.test(wf)&&/branches:\s*\[main\]/.test(wf)&&/run: npm test/.test(wf)&&/playwright install/.test(wf));
};
