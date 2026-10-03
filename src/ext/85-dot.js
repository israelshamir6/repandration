/* ======================================================================
   DOT physical prep (for CDL drivers) + sleep, water, steps and fasting habits.
   Thresholds follow FMCSA medical-examiner guidance; the examiner always makes the call.
   ====================================================================== */
const dotState = () => { const h = state.health; h.dot ||= {examDate:"", certExpires:"", diabetes:"no", insulin:false, glucose:[], neck:"", stopbang:{}, vision:"", hearing:"", meds:""}; return h.dot; };
const meanOf = a => a.length ? a.reduce((x,y) => x + y, 0)/a.length : null;
function lastBP(n = 7){ const bp = (state.health.bp || []).slice(-n); if (!bp.length) return null; return {sys: Math.round(meanOf(bp.map(x => x[1]))), dia: Math.round(meanOf(bp.map(x => x[2]))), n: bp.length, last: bp[bp.length-1]}; }
function bpDot(b){
  if (!b) return {level:"none", label:"No readings yet", note:"Log 3–7 readings in the weeks before your exam, seated and rested for 5 minutes."};
  const {sys, dia} = b;
  if (sys >= 180 || dia >= 110) return {level:"bad", label:"Disqualifying range", note:"Examiners won't certify at 180/110 or higher until it's brought down to 140/90 or lower. See your doctor before the exam."};
  if (sys >= 160 || dia >= 100) return {level:"warn", label:"3-month certificate range", note:"Stage 2 (160–179 / 100–109) usually means a one-time 3-month certificate while you get it under 140/90."};
  if (sys >= 140 || dia >= 90) return {level:"warn", label:"1-year certificate range", note:"Stage 1 (140–159 / 90–99) usually means a 1-year certificate instead of 2."};
  return {level:"good", label:"2-year certificate range", note:"Under 140/90 is the range for a full 2-year certificate."};
}
function sleepAvg(n = 7){ const s = state.health.sleep || {}, keys = Object.keys(s).sort().slice(-n); const v = keys.map(k => s[k]).filter(x => x > 0); return v.length ? {avg: meanOf(v), n: v.length} : null; }
const STOPBANG = [["snore","Do you snore loudly (heard through a closed door)?"],["tired","Do you often feel tired or sleepy during the day?"],["observed","Has anyone seen you stop breathing or choke in your sleep?"],["pressure","Do you have or are you treated for high blood pressure?"],["bmi","Is your BMI over 35?"],["age","Are you over 50?"],["neck","Is your neck over 17 in (men) or 16 in (women)?"],["male","Are you male?"]];
function stopBang(){ const d = dotState(), p = state.profile, c = calc(p), a = Object.assign({}, d.stopbang);
  if (a.bmi == null) a.bmi = c.bmi > 35; if (a.age == null) a.age = p.age > 50; if (a.male == null) a.male = p.sex === "male";
  const b = lastBP(); if (a.pressure == null && b) a.pressure = b.sys >= 140 || b.dia >= 90;
  const score = STOPBANG.filter(([k]) => a[k]).length; return {a, score, risk: score >= 5 ? "high" : score >= 3 ? "intermediate" : "low"}; }
function daysUntil(k){ if (!k) return null; return Math.round((pkey(k) - pkey(todayKey()))/864e5); }
function dotReadiness(){
  const b = bpDot(lastBP()), s = sleepAvg(), sb = stopBang(), c = calc(state.profile), d = dotState();
  const items = [
    {k:"Blood pressure", ok: b.level === "good", warn: b.level === "warn", bad: b.level === "bad", none: b.level === "none", text: lastBP() ? `${lastBP().sys}/${lastBP().dia} average · ${b.label}` : b.label},
    {k:"Sleep", ok: s && s.avg >= 7, warn: s && s.avg < 7, none: !s, text: s ? `${fmt1(s.avg)} h a night (last ${s.n} nights)` : "Log your sleep for a week"},
    {k:"Sleep apnea screen", ok: sb.risk === "low", warn: sb.risk !== "low", text: `STOP-BANG ${sb.score}/8 · ${sb.risk} risk`},
    {k:"Body mass index", ok: c.bmi < 35, warn: c.bmi >= 35 && c.bmi < 40, bad: c.bmi >= 40, text: `BMI ${fmt1(c.bmi)}${c.bmi >= 40 ? " · examiners often require sleep testing at 40+" : ""}`},
    {k:"Blood sugar", ok: d.diabetes === "no", warn: d.diabetes !== "no", text: d.diabetes === "no" ? "No diabetes reported" : d.insulin ? "Insulin-treated: bring form MCSA-5870 from your doctor" : "Diabetes: bring your recent A1C and med list"},
    {k:"Vision & hearing", ok: d.vision === "pass" && d.hearing === "pass", warn: d.vision === "fail" || d.hearing === "fail", none: !d.vision || !d.hearing, text: d.vision === "pass" && d.hearing === "pass" ? "Self-check passed" : "20/40 each eye and a forced whisper at 5 ft"}
  ];
  const score = Math.round(items.reduce((a,i) => a + (i.ok ? 1 : i.warn || i.none ? 0.5 : 0), 0)/items.length*100);
  return {items, score};
}
function V_dot(){
  const d = dotState(), r = dotReadiness(), exam = daysUntil(d.examDate), cert = daysUntil(d.certExpires), sb = stopBang(), b = lastBP(), bd = bpDot(b);
  const icon = i => i.bad ? `<span class="pill high">Act now</span>` : i.warn ? `<span class="pill med">Watch</span>` : i.none ? `<span class="pill neutral">Log it</span>` : `<span class="pill low">On track</span>`;
  const bpRows = (state.health.bp || []).slice(-8).reverse();
  return `<div class="pagehead"><div><h1>DOT physical prep</h1><p class="sub">Get ready for your CDL medical exam</p></div></div>
  <div class="grid g-3">
    <section class="card stack"><span class="eyebrow">Readiness</span><div class="big" style="font-size:2.6rem;color:${r.score >= 80 ? "var(--good)" : r.score >= 55 ? "var(--warn)" : "var(--bad)"}">${r.score}%</div><p class="small muted">Based on your logs and answers below.</p></section>
    <section class="card stack"><span class="eyebrow">Next exam</span><div class="big" style="font-size:2.2rem">${exam == null ? "—" : exam < 0 ? "Past" : exam + " days"}</div><label class="f">Exam date<input type="date" value="${d.examDate}" data-field="dotExam"></label></section>
    <section class="card stack"><span class="eyebrow">Medical card expires</span><div class="big" style="font-size:2.2rem;${cert != null && cert < 45 ? "color:var(--warn)" : ""}">${cert == null ? "—" : cert < 0 ? "Expired" : cert + " days"}</div><label class="f">Expiration date<input type="date" value="${d.certExpires}" data-field="dotCert"></label></section>
  </div>
  <section class="card stack"><h2>Checklist</h2><div class="list">${r.items.map(i => `<div class="li"><div class="main"><b>${i.k}</b><small>${esc(i.text)}</small></div>${icon(i)}</div>`).join("")}</div></section>
  <div class="grid g-2">
    <section class="card stack"><h2>Blood pressure</h2><p class="small muted">${esc(bd.note)}</p>
      <form class="row" data-form="dotBP"><label class="f" style="width:110px">Top (systolic)<input id="dotSys" type="number" min="70" max="260" inputmode="numeric" required></label><label class="f" style="width:110px">Bottom (diastolic)<input id="dotDia" type="number" min="40" max="160" inputmode="numeric" required></label><button class="btn primary">Save</button></form>
      ${bpRows.length ? `<div class="list">${bpRows.map(x => `<div class="li"><div class="main"><b class="num">${x[1]}/${x[2]}</b><small>${new Date(x[0]).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small></div>${icon({ok:bpDot({sys:x[1],dia:x[2]}).level === "good", warn:bpDot({sys:x[1],dia:x[2]}).level === "warn", bad:bpDot({sys:x[1],dia:x[2]}).level === "bad"})}</div>`).join("")}</div>` : ""}
      <p class="note">Tips that help before an exam: cut sodium and caffeine for a few days, sleep well the night before, sit quietly for 5 minutes, and take your usual meds. Never stop a prescribed medication on your own.</p></section>
    <section class="card stack"><h2>Sleep</h2>${sleepCard(true)}</section>
  </div>
  <section class="card stack"><h2>Sleep apnea screen (STOP-BANG)</h2><p class="small muted">A score of 3 or more means you should ask your doctor about a sleep study. Treated sleep apnea (using CPAP) doesn't stop you from driving.</p>
    <div class="list">${STOPBANG.map(([k,q]) => `<label class="check"><input type="checkbox" data-act="dotSB" data-k="${k}" ${sb.a[k] ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">${q}</span></label>`).join("")}</div>
    <p><b>Score ${sb.score}/8</b> · ${sb.risk} risk</p></section>
  <div class="grid g-2">
    <section class="card stack"><h2>Blood sugar</h2>
      <label class="f">Diabetes<select data-field="dotDiab"><option value="no" ${d.diabetes==="no"?"selected":""}>No</option><option value="pre" ${d.diabetes==="pre"?"selected":""}>Prediabetes</option><option value="t2" ${d.diabetes==="t2"?"selected":""}>Yes, diet or pills</option><option value="ins" ${d.diabetes==="ins"?"selected":""}>Yes, insulin</option></select></label>
      <form class="row" data-form="dotGlu"><label class="f" style="width:150px">Fasting glucose (mg/dL)<input id="dotGlu" type="number" min="40" max="600" inputmode="numeric" required></label><button class="btn">Save</button></form>
      ${(d.glucose || []).length ? `<p class="small muted">Last: ${d.glucose.slice(-5).map(g => g[1]).join(", ")} mg/dL</p>` : ""}
      <p class="note">On insulin? Your treating doctor must complete form MCSA-5870 within 45 days before the exam, and certificates last up to 1 year.</p></section>
    <section class="card stack"><h2>Vision, hearing & meds</h2>
      <label class="f">Vision self-check<select data-field="dotVision"><option value="" ${!d.vision?"selected":""}>Not checked</option><option value="pass" ${d.vision==="pass"?"selected":""}>I can read 20/40 with each eye (glasses OK)</option><option value="fail" ${d.vision==="fail"?"selected":""}>Not sure / struggling</option></select></label>
      <label class="f">Hearing self-check<select data-field="dotHearing"><option value="" ${!d.hearing?"selected":""}>Not checked</option><option value="pass" ${d.hearing==="pass"?"selected":""}>I hear a whisper at 5 feet (aids OK)</option><option value="fail" ${d.hearing==="fail"?"selected":""}>Not sure</option></select></label>
      <label class="f">Medications to bring a list of<textarea rows="2" data-field="dotMeds" placeholder="Name, dose, what it's for">${esc(d.meds)}</textarea></label></section>
  </div>
  <section class="card stack"><h2>What to bring to the exam</h2><ul class="small" style="margin:0;padding-left:18px;line-height:1.8"><li>Driver's license and glasses, contacts or hearing aids</li><li>A list of every medication, dose and prescribing doctor</li><li>Recent records for any condition you're treated for (heart, diabetes, sleep apnea with CPAP usage report)</li><li>Form MCSA-5870 if you use insulin</li><li>Find a certified examiner on the FMCSA National Registry</li></ul>
    <p class="note">General guidance only, not medical advice. Your certified medical examiner decides certification.</p></section>`;
}
RENDER.dot = () => V_dot();
VIEWS.splice(VIEWS.findIndex(v => v.id === "devices"), 0, {id:"dot", label:"DOT prep"});
ICON.dot = ICON.truck;
document.addEventListener("submit", e => {
  const f = e.target.closest('[data-form="dotBP"],[data-form="dotGlu"],[data-form="sleepLog"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const h = state.health;
  if (f.dataset.form === "dotBP"){ const s = +$("#dotSys").value, d = +$("#dotDia").value; if (!(s > 60 && s < 260 && d > 30 && d < 160)) { toast("Enter both numbers, e.g. 128 and 82."); return; } h.bp.push([Date.now(), Math.round(s), Math.round(d)]); toast("Reading saved"); }
  else if (f.dataset.form === "dotGlu"){ const g = +$("#dotGlu").value; if (!(g > 30 && g < 700)) return; dotState().glucose.push([Date.now(), Math.round(g)]); dotState().glucose = dotState().glucose.slice(-60); toast("Saved"); }
  else { const v = +$("#sleepH").value, k = $("#sleepD").value || todayKey(); if (!(v > 0 && v <= 16)) { toast("Enter hours slept, e.g. 7.5."); return; } h.sleep[k] = v; toast(`${fmt1(v)} h saved for ${shortDate(k)}`); if (sheet.open) closeSheet(); }
  persist("health"); render();
}, true);
A.dotSB = el => { dotState().stopbang[el.dataset.k] = el.checked; persist("health"); render(); };
document.addEventListener("change", e => { const el = e.target, f = el.dataset && el.dataset.field; if (!f || !state) return; const d = dotState();
  const map = {dotExam:"examDate", dotCert:"certExpires", dotVision:"vision", dotHearing:"hearing", dotMeds:"meds"};
  if (map[f]){ d[map[f]] = el.value; persist("health"); if (f !== "dotMeds") render(); }
  else if (f === "dotDiab"){ d.diabetes = el.value; d.insulin = el.value === "ins"; persist("health"); render(); } });

/* ---------- sleep ---------- */
function sleepCard(inDot){
  const s = state.health.sleep || {}, days = []; for (let i = 13; i >= 0; i--){ const k = dkey(addDays(new Date(), -i)); days.push([k, s[k] || 0]); }
  const avg = sleepAvg(7), max = 10;
  return `${avg ? `<p><span class="big" style="font-size:1.8rem">${fmt1(avg.avg)} h</span> <span class="muted small">average, last ${avg.n} nights · adults need 7+</span></p>` : `<p class="small muted">No sleep logged yet.</p>`}
    <div class="sleepbars">${days.map(([k,v]) => `<div title="${shortDate(k)}: ${v ? fmt1(v) + " h" : "not logged"}"><i style="height:${clamp(v/max*100,0,100)}%;background:${!v ? "var(--surface-2)" : v >= 7 ? "var(--accent)" : v >= 6 ? "var(--warn)" : "var(--bad)"}"></i><small>${DAYS[wIdx(pkey(k))][0]}</small></div>`).join("")}</div>
    <form class="row" data-form="sleepLog"><label class="f" style="width:110px">Hours slept<input id="sleepH" type="number" min="0" max="16" step="0.25" inputmode="decimal" required placeholder="7.5"></label><label class="f" style="width:160px">Night of<input id="sleepD" type="date" value="${todayKey()}" max="${todayKey()}"></label><button class="btn ${inDot ? "primary" : ""}">Log sleep</button></form>`;
}
SHEETS.sleep = () => ({title:"Log sleep", body:`<div class="stack">${sleepCard(true)}</div>`});

/* ---------- daily habits: water, steps, fasting ---------- */
const FASTS = [["16:8",16],["18:6",18],["20:4",20],["OMAD 23:1",23],["14:10",14],["12:12",12]];
function habitsCard(){
  const h = state.health, k = todayKey(), w = (h.water || {})[k] || 0, goal = state.profile.waterGoal || 8, st = (h.steps || {})[k] || 0, stepGoal = state.profile.stepGoal || 8000;
  const f = h.fast || {}, on = f.start && !f.end, elapsed = on ? (Date.now() - f.start)/36e5 : 0, pct = on ? clamp(elapsed/(f.goal||16)*100, 0, 100) : 0;
  return `<section class="card stack habits"><div class="card-head" style="margin:0"><h2>Daily habits</h2><span class="small muted">${shortDate(k)}</span></div>
    <div class="grid g-3">
      <div class="habit"><span class="eyebrow">Water</span><div><span class="big num" style="font-size:1.7rem">${w}</span><span class="muted"> / ${goal} glasses</span></div><div class="track"><i style="width:${clamp(w/goal*100,0,100)}%;background:var(--protein)"></i></div><div class="row"><button class="btn sm" data-act="waterMinus" aria-label="Remove a glass">−</button><button class="btn sm primary" data-act="water">${ICON.water} Add glass</button></div></div>
      <div class="habit"><span class="eyebrow">Steps</span><div><span class="big num" style="font-size:1.7rem">${fmt(st)}</span><span class="muted"> / ${fmt(stepGoal)}</span></div><div class="track"><i style="width:${clamp(st/stepGoal*100,0,100)}%;background:var(--accent)"></i></div><form class="row" data-form="steps"><input id="stepsIn" type="number" min="0" max="100000" inputmode="numeric" placeholder="Steps today" style="flex:1;min-width:90px"><button class="btn sm">Save</button></form></div>
      <div class="habit"><span class="eyebrow">Fasting</span>${on ? `<div><span class="big num" style="font-size:1.7rem">${Math.floor(elapsed)}h ${pad(Math.floor(elapsed%1*60))}m</span><span class="muted"> / ${f.goal}h</span></div><div class="track"><i style="width:${pct}%;background:var(--sugar)"></i></div><p class="small muted">${elapsed >= f.goal ? "Goal reached. Break your fast when you're ready." : `Ends ${new Date(f.start + f.goal*36e5).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}`}</p><button class="btn sm" data-act="fastEnd">End fast</button>`
        : `<p class="small muted">${(h.fastLog || []).length ? `Last fast: ${fmt1(h.fastLog[0].h)} h` : "Pick a window to start."}</p><div class="row">${FASTS.slice(0,4).map(([l,g]) => `<button class="chip" data-act="fastStart" data-g="${g}">${l}</button>`).join("")}</div>`}</div>
    </div>
    <div class="row"><button class="btn sm ghost" data-act="openSleep">Log last night's sleep</button></div></section>`;
}
A.waterMinus = () => { const h = state.health, k = todayKey(); h.water[k] = Math.max(0, (h.water[k] || 0) - 1); persist("health"); render(); };
A.fastStart = el => { if (!premiumGate("Fasting timer")) return; state.health.fast = {start: Date.now(), goal: +el.dataset.g}; persist("health"); render(); toast(`Fast started · ${el.dataset.g} hours`); };
A.fastEnd = () => { const h = state.health, f = h.fast; if (!f) return; const hrs = (Date.now() - f.start)/36e5; h.fastLog = [{start:f.start, h: r1(hrs), goal:f.goal}, ...(h.fastLog || [])].slice(0, 60); h.fast = null; persist("health"); render(); toast(`Fast ended at ${fmt1(hrs)} hours`); };
A.openSleep = () => { if (!premiumGate("Sleep tracking")) return; openSheet("sleep"); };
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="steps"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation(); if (!premiumGate("Step tracking")) return;
  const v = Math.round(+$("#stepsIn").value); if (!(v >= 0 && v < 100000)) return; state.health.steps[todayKey()] = v; persist("health"); render(); toast("Steps saved"); }, true);
setInterval(() => { if (state && state.health && state.health.fast && ui.view === "today" && !isTyping() && !sheet.open) render(); }, 60000);
ICON.moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
ICON.clock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
SHEETS.fast = () => { const f = state.health.fast; return {title:"Fasting timer", body:`<div class="stack">${f && !f.end ? `<p>You're ${fmt1((Date.now()-f.start)/36e5)} hours into a ${f.goal}-hour fast.</p><button class="btn primary" data-act="fastEnd">End fast</button>` : `<p class="muted">Choose an eating window. The timer runs even when the app is closed.</p><div class="qgrid">${FASTS.map(([l,g]) => `<button class="qbtn" data-act="fastStart" data-g="${g}"><b>${l}</b><small>${g}-hour fast</small></button>`).join("")}</div>`}
  ${(state.health.fastLog || []).length ? `<div><span class="eyebrow">Recent fasts</span><div class="list">${state.health.fastLog.slice(0,6).map(x => `<div class="li"><div class="main"><b>${fmt1(x.h)} h</b><small>${new Date(x.start).toLocaleDateString()} · goal ${x.goal} h</small></div>${x.h >= x.goal ? `<span class="pill low">Done</span>` : ""}</div>`).join("")}</div></div>` : ""}
  <p class="note">Fasting isn't right for everyone. Skip it if you're pregnant, have diabetes on medication, or have a history of disordered eating, unless your doctor says it's OK.</p></div>`}; };
A.fastQuick = () => { if (!premiumGate("Fasting timer")) return; openSheet("fast"); };
const _fastStart = A.fastStart; A.fastStart = el => { _fastStart(el); if (sheet.open && sheet.view === "fast") closeSheet(); };
