/* ======================================================================
   Adaptive calorie targets. Each week Rep & Ration compares what you ate with how your
   weight trend moved and re-estimates your real energy expenditure (TDEE), then sets
   your target from that estimate and the weekly pace you chose.
   ====================================================================== */
const KCAL_PER_KG = 7700;
const RATES = {loss:[[0.25,"Gentle · 0.25%/week"],[0.5,"Steady · 0.5%/week"],[0.75,"Faster · 0.75%/week"],[1,"Aggressive · 1%/week"]], gain:[[0.1,"Lean · 0.1%/week"],[0.25,"Steady · 0.25%/week"],[0.5,"Faster · 0.5%/week"]], maintain:[[0,"Hold steady"]]};
const defaultRate = g => g === "loss" ? 0.5 : g === "gain" ? 0.25 : 0;
function calc(p){ return dietMacros(calc1(p), p); }
function dietMacros(c, p){
  if (p.diet === "keto"){ c.carbs = 30; c.fat = Math.max(0, Math.round((c.target - c.protein*4 - c.carbs*4)/9)); }
  else if (p.diet === "lowcarb"){ c.carbs = Math.round(c.target*0.20/4); c.fat = Math.max(0, Math.round((c.target - c.protein*4 - c.carbs*4)/9)); }
  else if (p.diet === "highprotein"){ c.protein = Math.max(c.protein, Math.round(c.target*0.35/4)); c.carbs = Math.max(50, Math.round((c.target - c.protein*4 - c.fat*9)/4)); }
  return c;
}
function calc1(p){
  const c = calc0(p);
  const est = p.adaptive !== false && p.tdeeEst && p.tdeeEst.kcal ? p.tdeeEst.kcal : null;
  const usingRate = p.rate != null || est;
  if (!usingRate) return Object.assign(c, {formulaTdee:c.tdee, adaptive:false});
  const tdee = est || c.tdee, rate = p.rate != null ? p.rate : defaultRate(p.goal);
  let adj = p.goal === "loss" ? -(rate/100)*p.weightKg*KCAL_PER_KG/7 : p.goal === "gain" ? (rate/100)*p.weightKg*KCAL_PER_KG/7 : 0;
  if (p.goal === "loss") adj = Math.max(adj, -Math.min(tdee*0.30, 1100));
  const floor = p.sex === "male" ? 1500 : 1200;
  let target = tdee + adj; const floored = target < floor; target = Math.round(Math.max(target, floor)/10)*10;
  const basis = c.bmi >= 30 ? 25*(p.heightCm/100)**2 : p.weightKg, pk = {loss:2.0, gain:1.8, maintain:1.6}[p.goal];
  const protein = Math.round(basis*pk), fat = Math.round(Math.max(target*(p.goal === "maintain" ? .30 : .25)/9, p.weightKg*0.6));
  const carbs = Math.max(50, Math.round((target - protein*4 - fat*9)/4));
  return Object.assign(c, {formulaTdee:c.tdee, tdee, adj, target, floored, protein, fat, carbs, addedSugar:Math.round(target*0.10/4), fiber:Math.round(target/1000*14), adaptive:!!est, rate});
}

/* exponentially smoothed weight trend, one point per calendar day */
function weightTrend(days = 120){
  const w = sortedWeights(); if (!w.length) return [];
  const map = Object.fromEntries(w.map(x => [x.date, x.kg]));
  const start = pkey(w[0].date), end = new Date(), out = [];
  let t = w[0].kg;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)){ const k = dkey(d); if (map[k] != null) t = t + 0.1*(map[k] - t); out.push([k, t, map[k] ?? null]); }
  return out.slice(-days);
}
function slope(pts){ const n = pts.length; if (n < 2) return 0; let sx=0, sy=0, sxx=0, sxy=0; pts.forEach(([x,y]) => { sx+=x; sy+=y; sxx+=x*x; sxy+=x*y; }); const d = n*sxx - sx*sx; return d ? (n*sxy - sx*sy)/d : 0; }
/** Observed expenditure over the last `win` days, or null when there isn't enough data. */
function observedTdee(win = 21){
  const tr = weightTrend(win + 1); if (tr.length < 10) return null;
  const keys = tr.map(x => x[0]);
  const intake = keys.map(k => dayTotals(k).kcal).filter(v => v >= 800);   // skip days that clearly weren't fully logged
  const weighIns = tr.filter(x => x[2] != null).length;
  if (intake.length < 5 || weighIns < 3) return {enough:false, intakeDays:intake.length, weighIns};
  const kgPerDay = slope(tr.map((x, i) => [i, x[1]]));
  const avg = intake.reduce((a,b) => a+b, 0)/intake.length;
  return {enough:true, kcal: avg - kgPerDay*KCAL_PER_KG, avgIntake:avg, kgPerWeek:kgPerDay*7, intakeDays:intake.length, weighIns, quality: Math.min(1, intake.length/14)*Math.min(1, weighIns/6)};
}
function proposeEstimate(){
  const p = state.profile, o = observedTdee(); if (!o || !o.enough) return null;
  const c0 = calc0(p), prior = p.tdeeEst && p.tdeeEst.kcal ? p.tdeeEst.kcal : c0.tdee;
  let next = prior + (o.kcal - prior)*0.75*o.quality;
  next = clamp(next, prior - 250, prior + 250);              // move at most 250 kcal a week
  next = clamp(next, c0.bmr*1.05, c0.bmr*2.6);
  return {kcal: Math.round(next/10)*10, prior: Math.round(prior), obs: o};
}
const checkinDue = () => { const p = state.profile, last = p.tdeeEst && p.tdeeEst.at; return p.adaptive !== false && (!last || Date.now() - last > 6.5*864e5) && !!proposeEstimate(); };
function checkinCard(){
  if (!checkinDue()) return "";
  const p = state.profile, pr = proposeEstimate(), before = calc(p).target;
  const after = calc(Object.assign({}, p, {tdeeEst:{kcal:pr.kcal}})).target, diff = after - before;
  const dir = pr.obs.kgPerWeek;
  return `<section class="card checkin stack"><div class="row"><span class="eyebrow">Weekly check-in</span><span class="spacer"></span><span class="pill neutral">Adaptive</span></div>
    <h2>${diff === 0 ? "Your target stays the same" : diff > 0 ? `Your target goes up ${fmt(diff)} kcal` : `Your target goes down ${fmt(-diff)} kcal`}</h2>
    <p class="small muted">Over the last 3 weeks you averaged <b>${fmt(pr.obs.avgIntake)} kcal</b> and your trend weight moved <b>${dir >= 0 ? "+" : "−"}${fmt1(Math.abs(wDisp(dir)))} ${wUnit()}/week</b>. That puts your real daily burn near <b>${fmt(pr.kcal)} kcal</b> (was ${fmt(pr.prior)}).</p>
    <div class="row"><button class="btn primary" data-act="checkinYes">Update to ${fmt(after)} kcal</button><button class="btn" data-act="checkinNo">Keep ${fmt(before)}</button></div></section>`;
}
A.checkinYes = () => { const p = state.profile, pr = proposeEstimate(); if (!pr) return; const hist = (p.tdeeEst && p.tdeeEst.hist) || [];
  p.tdeeEst = {kcal:pr.kcal, at:Date.now(), hist:[...hist, {d:todayKey(), kcal:pr.kcal, target:calc(Object.assign({}, p, {tdeeEst:{kcal:pr.kcal}})).target}].slice(-52)};
  persist("profile"); render(); toast("Targets updated for this week"); };
A.checkinNo = () => { const p = state.profile; p.tdeeEst = Object.assign({}, p.tdeeEst || {kcal:0}, {at:Date.now()}); if (!p.tdeeEst.kcal) delete p.tdeeEst.kcal; persist("profile"); render(); };

function expenditureCard(){
  const p = state.profile, c = calc(p), o = observedTdee(), hist = (p.tdeeEst && p.tdeeEst.hist) || [];
  const tr = weightTrend(60);
  return `<section class="card stack"><div class="card-head" style="margin:0"><div><h2>Energy expenditure</h2><p class="small muted">${c.adaptive ? "Adaptive: learned from your logs and weigh-ins" : "Estimated from your stats until there's enough data"}</p></div><span class="big num" style="font-size:1.8rem">${fmt(c.tdee)}<span class="small muted"> kcal/day</span></span></div>
    ${hist.length > 1 ? lineChart([{pts:hist.map(h => [pkey(h.d).getTime(), h.kcal]), color:"var(--accent)", end:true, dots:true},{pts:hist.map(h => [pkey(h.d).getTime(), h.target]), color:"var(--protein)", dash:"5 4"}], {h:170, label:"Expenditure and target by week"}) + `<div class="legend"><span><i style="background:var(--accent)"></i>Expenditure</span><span><i style="background:var(--protein)"></i>Target</span></div>` : ""}
    ${tr.length > 6 ? lineChart([{pts:tr.filter(x => x[2] != null).map(x => [pkey(x[0]).getTime(), wDisp(x[2])]), color:"var(--muted)", dots:true, faint:true, width:1},{pts:tr.map(x => [pkey(x[0]).getTime(), wDisp(x[1])]), color:"var(--accent)", width:2.6, end:true}], {h:170, label:"Trend weight"}) + `<div class="legend"><span><i style="background:var(--accent)"></i>Trend weight</span><span><i style="background:var(--muted)"></i>Weigh-ins</span></div>` : ""}
    <p class="small muted">${o && o.enough ? `Last 3 weeks: ${o.intakeDays} logged days, ${o.weighIns} weigh-ins, trend ${o.kgPerWeek >= 0 ? "+" : "−"}${fmt1(Math.abs(wDisp(o.kgPerWeek)))} ${wUnit()}/week.` : `Log food most days and weigh in 3+ times a week. After about 10 days we start learning your real burn${o ? ` (so far: ${o.intakeDays || 0} logged days, ${o.weighIns || 0} weigh-ins)` : ""}.`}</p>
    <label class="check" style="border:0;padding:0"><input type="checkbox" data-act="adaptiveToggle" ${p.adaptive !== false ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">Adjust my targets every week from my results</span></label></section>`;
}
A.adaptiveToggle = el => { state.profile.adaptive = el.checked; persist("profile"); render(); };
function paceSelect(id){ const p = state.profile, r = p.rate != null ? p.rate : defaultRate(p.goal); return `<select id="${id}" data-field="rate">${RATES[p.goal].map(([v,l]) => `<option value="${v}" ${Math.abs(v-r)<1e-6?"selected":""}>${l}${p.goal !== "maintain" ? ` (${fmt1(wDisp(p.weightKg*v/100))} ${wUnit()})` : ""}</option>`).join("")}</select>`; }
document.addEventListener("change", e => { const el = e.target; if (el.dataset && el.dataset.field === "rate"){ state.profile.rate = +el.value; persist("profile"); render(); } });
