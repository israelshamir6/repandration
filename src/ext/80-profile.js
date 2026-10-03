/* ======================================================================
   Setup wizard, profile settings for the new features, and Today page additions.
   ====================================================================== */
DIETS.push(["keto","Keto (under 30 g carbs)"],["lowcarb","Low-carb"],["paleo","Paleo / Whole30-style"],["highprotein","High-protein"]);
DIET_BLOCK.keto = []; DIET_BLOCK.lowcarb = []; DIET_BLOCK.highprotein = [];
DIET_BLOCK.paleo = ["grain","legume","dairy","soy","processed","peanut"];
EXCL.push(["sesame","Sesame"]);
EXCL_LABEL.sesame = "Sesame"; EXCL_LABEL.alcohol = "Alcohol"; EXCL_LABEL.caffeine = "Caffeine"; EXCL_LABEL.grain = "Grains"; EXCL_LABEL.legume = "Beans & lentils"; EXCL_LABEL.processed = "Processed foods"; EXCL_LABEL.root = "Root vegetables"; EXCL_LABEL.allium = "Onion & garlic"; EXCL_LABEL.danielno = "Daniel Fast foods"; EXCL_LABEL.peanut = "Peanuts"; EXCL_LABEL.coffee = "Coffee & tea";
const TAGADD = (tag, ids) => ids.split(" ").forEach(id => { if (FOOD[id] && !FOOD[id].tags.includes(tag)) FOOD[id].tags.push(tag); });
TAGADD("sesame", "tahini hummus hummuscup");
TAGADD("legume", "blackbeans lentils chickpeas kidneybeans pinto refried blackeyed edamame tofu tempeh hummus hummuscup chickpeapasta pb peanuts pbcrackers");
TAGADD("peanut", "pb peanuts pbcrackers trailmix");
TAGADD("root", "potato sweetpotato onion carrots beets babycarrots fries chips");
TAGADD("allium", "onion");
TAGADD("coffee", "coffee latte");
for (const f of FOODS){ if (f.cat === "grains" && !f.tags.includes("legume") && !f.tags.includes("grain")) f.tags.push("grain"); if ((f.cat === "prepared" || f.cat === "road") && !["sparkling","hbegg2","babycarrots","fruitcup","gyogcup","tunapouch","rotisserie"].includes(f.id)) f.tags.push("processed"); }
Object.assign(FAITHS, {
  jain:["Jain", "Vegetarian with no eggs, honey or alcohol, and no root vegetables like potatoes, onions and carrots."],
  buddhist:["Buddhist vegetarian", "Vegetarian (eggs optional) with no onion, garlic or alcohol."],
  ital:["Rastafarian Ital", "Plant-based, whole and unprocessed foods. No alcohol or coffee."],
  lds:["Latter-day Saints", "No coffee, tea or alcohol (Word of Wisdom)."],
  sikh:["Sikh", "No alcohol, and no ritually slaughtered (halal or kosher) meat. Turn on vegetarian below if you skip meat."]
});
// keto / low-carb / high-protein shape the macros and which meals qualify
const carbShare = t => t.kcal ? (t.c*4)/t.kcal : 0;
const dietMealOK = (t, p) => { const m = mealTotals(t.items); if (p.diet === "keto") return carbShare(m) <= 0.12; if (p.diet === "lowcarb") return carbShare(m) <= 0.30; if (p.diet === "highprotein") return m.kcal ? (m.p*4)/m.kcal >= 0.30 : false; return true; };

/* ---------- setup wizard ---------- */
const wz = {step:0, d:null};
const WZ_STEPS = ["You","Your work","Goal","Eating","Training"];
function wzDefaults(){ const u = me(); return {name:(u && u.name) || "", sex:"", age:"", units:"us", ft:"", inch:"", cm:"", w:"", goal:"loss", rate:0.5, activity:"moderate", diet:"any", faith:"none", faithVeg:false, exclude:[], budget:"", adults:1, kids:0, trainAt:"home", equipment:["chair"], daysPerWeek:3, level:"b", impact:2, lifestyle:"", shiftStart:"19:00", shiftLen:12, route:"", gear:[], dotExp:"", ...(u && u.sub && u.sub.via === "fleet" ? {lifestyle:"road", route:"otr", trainAt:"none", equipment:["bands","chair"], activity:"light"} : {})}; }
function V_welcome(){
  const d = wz.d ||= wzDefaults(), s = wz.step;
  const opt = (o, sel) => Object.entries(o).map(([k,v]) => `<option value="${k}" ${k===sel?"selected":""}>${Array.isArray(v) ? v[0] : v}</option>`).join("");
  const big = (field, val, title, sub, icon = "") => `<button type="button" class="choice" data-act="wzSet" data-f="${field}" data-v="${val}" aria-pressed="${String(d[field]) === String(val)}">${icon}<b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
  let body = "";
  if (s === 0) body = `<h2>Tell us about you</h2><p class="muted">Your calorie and macro targets are calculated from these.</p>
    <div class="fields"><label class="f">First name<input data-wz="name" type="text" maxlength="40" value="${esc(d.name)}"></label>
      <label class="f">Sex (for metabolism)<select data-wz="sex"><option value="" ${!d.sex?"selected":""} disabled>Choose</option><option value="male" ${d.sex==="male"?"selected":""}>Male</option><option value="female" ${d.sex==="female"?"selected":""}>Female</option></select></label>
      <label class="f">Age<input data-wz="age" type="number" min="14" max="100" inputmode="numeric" value="${d.age}"></label>
      <label class="f">Units<select data-wz="units"><option value="us" ${d.units==="us"?"selected":""}>US (lb, ft)</option><option value="metric" ${d.units==="metric"?"selected":""}>Metric (kg, cm)</option></select></label>
      ${d.units === "us" ? `<label class="f">Height (ft)<input data-wz="ft" type="number" min="3" max="8" inputmode="numeric" value="${d.ft}"></label><label class="f">Height (in)<input data-wz="inch" type="number" min="0" max="11.9" step="0.1" inputmode="decimal" value="${d.inch}"></label>` : `<label class="f">Height (cm)<input data-wz="cm" type="number" min="100" max="250" inputmode="decimal" value="${d.cm}"></label>`}
      <label class="f">Weight (${d.units === "us" ? "lb" : "kg"})<input data-wz="w" type="number" min="30" max="700" step="0.1" inputmode="decimal" value="${d.w}"></label></div>`;
  else if (s === 1) body = wzWork(d, big);
  else if (s === 2) body = `<h2>What's your goal?</h2><div class="choices">${big("goal","loss","Lose fat","Keep muscle while the scale comes down")}${big("goal","gain","Build muscle","Gain lean weight with a small surplus")}${big("goal","maintain","Maintain","Hold your weight, get stronger and healthier")}</div>
    ${d.goal !== "maintain" ? `<label class="f">How fast?<select data-wz="rate">${RATES[d.goal].map(([v,l]) => `<option value="${v}" ${Math.abs(v-d.rate)<1e-6?"selected":""}>${l}</option>`).join("")}</select></label>` : ""}
    <label class="f">How active is your day, outside workouts?<select data-wz="activity">${Object.entries(ACT).map(([k,v]) => `<option value="${k}" ${d.activity===k?"selected":""}>${v[1]} · ${v[2]}</option>`).join("")}</select></label>
    <p class="small muted">Your target adapts every week from your real results, so a rough guess is fine.</p>`;
  else if (s === 3) body = `<h2>How do you eat?</h2>
    <div class="fields"><label class="f">Diet<select data-wz="diet">${DIETS.map(([k,l]) => `<option value="${k}" ${d.diet===k?"selected":""}>${l}</option>`).join("")}</select></label>
      <label class="f">Faith or cultural practice<select data-wz="faith">${opt(FAITHS, d.faith)}</select></label></div>
    ${FAITHS[d.faith] && FAITHS[d.faith][1] ? `<p class="small muted">${esc(FAITHS[d.faith][1])}</p>` : ""}
    ${["hindu","sikh"].includes(d.faith) ? `<label class="check" style="border:0"><input type="checkbox" data-wz="faithVeg" ${d.faithVeg ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">I'm vegetarian</span></label>` : ""}
    <div><span class="eyebrow">Allergies & foods you leave out</span><div class="chips" style="margin-top:8px">${EXCL.map(([k,l]) => `<button type="button" class="chip" data-act="wzExcl" data-id="${k}" aria-pressed="${d.exclude.includes(k)}">${d.exclude.includes(k) ? "No " : ""}${l.toLowerCase()}</button>`).join("")}</div></div>
    <div class="fields"><label class="f">Weekly food budget (optional)<input data-wz="budget" type="number" min="0" step="5" inputmode="decimal" placeholder="e.g. 75" value="${d.budget}"></label>
      <label class="f">Adults eating these meals<input data-wz="adults" type="number" min="1" max="8" value="${d.adults}"></label><label class="f">Kids<input data-wz="kids" type="number" min="0" max="8" value="${d.kids}"></label></div>`;
  else body = `<h2>How do you train?</h2>${d.lifestyle === "road" ? `<p class="small muted">Set for life on the road: cab-side, truck-stop and hotel-room workouts with bands and bodyweight. Add anything you carry.</p>` : ""}<div class="choices">${big("trainAt","home","At home","Bodyweight, bands, dumbbells")}${big("trainAt","gym","At a gym","Barbells, machines, cables")}${big("trainAt","none","No equipment","Calisthenics anywhere")}</div>
    <div><span class="eyebrow">Equipment you have</span><div class="chips" style="margin-top:8px">${EQUIP.filter(q => q.id !== "other").map(q => `<button type="button" class="chip" data-act="wzEq" data-id="${q.id}" aria-pressed="${d.equipment.includes(q.id)}">${q.label}</button>`).join("")}</div></div>
    <div class="fields"><label class="f">Days per week<select data-wz="daysPerWeek">${[2,3,4,5,6].map(n => `<option ${d.daysPerWeek==n?"selected":""}>${n}</option>`).join("")}</select></label>
      <label class="f">Experience<select data-wz="level"><option value="b" ${d.level==="b"?"selected":""}>New or returning</option><option value="i" ${d.level==="i"?"selected":""}>Some experience</option><option value="e" ${d.level==="e"?"selected":""}>Experienced</option></select></label>
      <label class="f">Impact<select data-wz="impact"><option value="1" ${d.impact==1?"selected":""}>Low · joint-friendly</option><option value="2" ${d.impact==2?"selected":""}>Low to medium</option><option value="3" ${d.impact==3?"selected":""}>Any, including jumps</option></select></label></div>`;
  return `<div class="wizard"><div class="wzprog">${WZ_STEPS.map((x,i) => `<span class="${i < s ? "done" : i === s ? "on" : ""}">${x}</span>`).join("")}</div>
    <form class="card stack" data-form="wz">${body}<div class="gerr" id="wzErr"></div>
    <div class="row">${s ? `<button type="button" class="btn" data-act="wzBack">Back</button>` : ""}<span class="spacer"></span><button class="btn primary">${s === WZ_STEPS.length-1 ? "Build my plan" : "Next"}</button></div></form>
    <p class="small muted" style="text-align:center">Step ${s+1} of ${WZ_STEPS.length} · you can change any of this later in Profile</p></div>`;
}
document.addEventListener("input", e => { const el = e.target; if (!el.dataset || !el.dataset.wz || !wz.d) return; const k = el.dataset.wz; wz.d[k] = el.type === "checkbox" ? el.checked : el.value; });
document.addEventListener("change", e => { const el = e.target; if (!el.dataset || !el.dataset.wz || !wz.d) return; const k = el.dataset.wz; wz.d[k] = el.type === "checkbox" ? el.checked : el.value;
  if (["units","faith","diet"].includes(k)) render(); });
A.wzSet = el => { const d = wz.d, f = el.dataset.f, v = el.dataset.v; d[f] = v;
  if (f === "goal") d.rate = defaultRate(v);
  if (f === "trainAt") d.equipment = v === "gym" ? GYM.slice() : v === "home" ? ["chair","bands","dumbbells"] : [];
  if (f === "lifestyle"){ if (v === "road"){ d.trainAt = "none"; d.equipment = ["bands","chair"]; d.impact = Math.min(+d.impact, 2); d.activity = "light"; d.route ||= "otr"; } else if (d.activity === "light") d.activity = "moderate"; }
  render(); };
A.wzGear = el => { const a = wz.d.gear, i = a.indexOf(el.dataset.id); if (i >= 0) a.splice(i,1); else a.push(el.dataset.id); render(); };
A.wzExcl = el => { const a = wz.d.exclude, i = a.indexOf(el.dataset.id); if (i >= 0) a.splice(i,1); else a.push(el.dataset.id); render(); };
A.wzEq = el => { const a = wz.d.equipment, i = a.indexOf(el.dataset.id); if (i >= 0) a.splice(i,1); else a.push(el.dataset.id); render(); };
A.wzBack = () => { wz.step = Math.max(0, wz.step - 1); render(); };
document.addEventListener("submit", e => {
  const f = e.target.closest('[data-form="wz"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const d = wz.d, err = m => { const x = $("#wzErr"); if (x) x.textContent = m; };
  if (wz.step === 0){
    const hcm = d.units === "us" ? ((+d.ft||0)*12 + (+d.inch||0))*2.54 : +d.cm;
    if (!d.sex) return err("Choose sex so we can estimate your metabolism.");
    if (!(+d.age >= 14 && +d.age <= 100)) return err("Enter your age.");
    if (!(hcm >= 100 && hcm <= 250)) return err("Enter your height.");
    if (!(+d.w > 0)) return err("Enter your weight.");
  }
  if (wz.step === 1 && !d.lifestyle) return err("Pick the one that fits your work.");
  if (wz.step < WZ_STEPS.length - 1){ wz.step++; render(); window.scrollTo(0,0); return; }
  const hcm = d.units === "us" ? ((+d.ft||0)*12 + (+d.inch||0))*2.54 : +d.cm, kg = d.units === "us" ? +d.w/LB : +d.w;
  const p = Object.assign(defaultProfile(), {name:d.name.trim().slice(0,40), sex:d.sex, age:+d.age, units:d.units, heightCm:hcm, weightKg:kg, activity:d.activity, goal:d.goal, rate:d.goal === "maintain" ? 0 : +d.rate,
    diet:d.diet, faith:d.faith, faithVeg:!!d.faithVeg, exclude:d.exclude.slice(), budget:+d.budget || 0, household:{adults:clamp(+d.adults||1,1,8), kids:clamp(+d.kids||0,0,8)},
    trainAt:d.trainAt, equipment:d.equipment.slice(), daysPerWeek:+d.daysPerWeek, level:d.level, impact:+d.impact, lifestyle:d.lifestyle, shiftStart:d.shiftStart, shiftLen:+d.shiftLen || 12,
    planSeed:1 + Math.floor(Math.random()*999), startDate:todayKey(), adaptive:true,
    driver: d.lifestyle === "road" ? {route: d.route || "otr", gear: d.gear.slice()} : null});
  state = freshState(p); state.meta.welcome = false;
  if (p.driver && d.dotExp) dotState().certExpires = d.dotExp;
  persist("profile","food","training","health"); wz.step = 0; wz.d = null; go("today"); toast("Your plan is ready.");
  setTimeout(() => openSheet("welcomeNext"), 900);
}, true);
SHEETS.welcomeNext = () => ({title:"You're set", body:`<div class="stack"><p>Your calorie target, 7-day menu, grocery list and workout week are ready.</p>
  <div class="list"><button class="li morelink" data-act="openReminders"><span class="qi">${ICON.bell}</span><span class="main"><b>Turn on reminders</b><small>Meals, workouts and weigh-ins</small></span>${ICON.right}</button>
  ${installEvt || isIOS() ? `<button class="li morelink" data-act="${installEvt ? "install" : "closeSheet"}"><span class="qi">${ICON.download}</span><span class="main"><b>Add to your home screen</b><small>${installEvt ? "Opens like an app" : "Safari: Share → Add to Home Screen"}</small></span>${ICON.right}</button>` : ""}
  <button class="li morelink" data-act="qSearch"><span class="qi">${ICON.search}</span><span class="main"><b>Log your first food</b><small>Search, scan or snap a photo</small></span>${ICON.right}</button></div></div>`});

/* ---------- profile settings ---------- */
function profileExtras(){
  const p = state.profile, h = p.household || {adults:1, kids:0};
  return `<section class="card stack"><h2>Faith, culture & diet</h2>
      <div class="fields"><label class="f">Faith or cultural practice<select data-field="faith">${Object.entries(FAITHS).map(([k,v]) => `<option value="${k}" ${p.faith===k || (!p.faith && k==="none")?"selected":""}>${v[0]}</option>`).join("")}</select></label>
      <label class="f">Diet${dietSelect("pf-diet2")}</label></div>
      ${p.faith && FAITHS[p.faith] && FAITHS[p.faith][1] ? `<p class="small muted">${esc(FAITHS[p.faith][1])}</p>` : ""}
      ${["hindu","sikh"].includes(p.faith) ? `<label class="check" style="border:0;padding:0"><input type="checkbox" data-act="pfToggle" data-k="faithVeg" ${p.faithVeg ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">I'm vegetarian</span></label>` : ""}
      ${p.faith === "lent" ? `<label class="check" style="border:0;padding:0"><input type="checkbox" data-act="pfToggle" data-k="lentAllYear" ${p.lentAllYear ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">Meatless every Friday, all year</span></label>` : ""}
      ${p.faith === "ramadan" ? `<label class="check" style="border:0;padding:0"><input type="checkbox" data-act="pfToggle" data-k="fastingNow" ${p.fastingNow ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">I'm fasting now (overrides the calendar dates)</span></label><p class="small muted">Ramadan ${new Date().getFullYear()} is set to ${(ramadanRange(p, new Date().getFullYear()) || ["?","?"]).map(shortDate).join(" – ")} (approximate; it follows the moon).</p>` : ""}
    </section>
    <section class="card stack"><h2>Budget & household</h2>
      <div class="fields"><label class="f">Weekly food budget ($)<input type="number" min="0" step="5" value="${p.budget || ""}" placeholder="No budget" data-field="pfBudget"></label>
      <label class="f">Adults<input type="number" min="1" max="8" value="${h.adults || 1}" data-field="hhAdults"></label><label class="f">Kids<input type="number" min="0" max="8" value="${h.kids || 0}" data-field="hhKids"></label></div>
      <p class="small muted">Menus pick meals that fit your budget, and the grocery list and prep steps scale to everyone you feed.</p></section>
    <section class="card stack"><h2>Your day & training</h2>
      <div class="fields"><label class="f">Schedule<select data-field="lifestyle"><option value="standard" ${(p.lifestyle||"standard")==="standard"?"selected":""}>Regular schedule</option><option value="shift" ${p.lifestyle==="shift"?"selected":""}>Shift worker</option><option value="road" ${p.lifestyle==="road"?"selected":""}>On the road / trucker</option></select></label>
      ${p.lifestyle === "shift" ? `<label class="f">Shift starts<input type="time" value="${p.shiftStart || "19:00"}" data-field="shiftStart"></label><label class="f">Shift hours<input type="number" min="4" max="16" value="${p.shiftLen || 12}" data-field="shiftLen"></label>` : ""}
      <label class="f">Experience<select data-field="level"><option value="b" ${(p.level||"b")==="b"?"selected":""}>New or returning</option><option value="i" ${p.level==="i"?"selected":""}>Some experience</option><option value="e" ${p.level==="e"?"selected":""}>Experienced</option></select></label></div>
      <div class="row"><button class="btn sm" data-act="eqPreset" data-v="gym">I train at a gym</button><button class="btn sm" data-act="eqPreset" data-v="home">Home equipment</button><button class="btn sm" data-act="eqPreset" data-v="none">No equipment</button></div></section>
    <section class="card stack"><h2>Reminders & app</h2><p class="small muted">${state.profile.reminders ? "Reminders are on for this account." : "Get a nudge for meals, workouts and weigh-ins."}</p>
      <div class="row"><button class="btn sm primary" data-act="openReminders">${ICON.bell} ${state.profile.reminders ? "Edit reminders" : "Turn on reminders"}</button>${installEvt ? `<button class="btn sm" data-act="install">${ICON.download} Install app</button>` : ""}</div></section>
    <section class="card stack"><h2>Your data</h2><p class="small muted">Download everything you've logged. It's yours.</p>
      <div class="row"><button class="btn sm" data-act="exportCSV">${ICON.download} Spreadsheets (CSV)</button><button class="btn sm" data-act="exportJSON">${ICON.download} Full backup (JSON)</button></div></section>`;
}
A.pfToggle = el => { state.profile[el.dataset.k] = el.checked; persist("profile"); render(); };
A.eqPreset = el => { const v = el.dataset.v, p = state.profile; p.trainAt = v; p.equipment = v === "gym" ? GYM.slice() : v === "home" ? ["chair","bands","dumbbells"] : []; rebuildSchedule(); persist("profile"); render(); toast("Equipment updated and workout week rebuilt"); };
document.addEventListener("change", e => {
  const el = e.target, f = el.dataset && el.dataset.field; if (!f || !state) return; const p = state.profile, v = el.value;
  const done = (msg) => { persist("profile"); render(); if (msg) toast(msg); };
  switch (f){
    case "faith": p.faith = v; p.planSeed++; done(v === "none" ? "Menus updated" : `Menus now follow ${FAITHS[v][0]}`); break;
    case "pfBudget": p.budget = +v > 0 ? +v : 0; done(); break;
    case "hhAdults": p.household = Object.assign({adults:1,kids:0}, p.household, {adults:clamp(+v||1,1,8)}); done(); break;
    case "hhKids": p.household = Object.assign({adults:1,kids:0}, p.household, {kids:clamp(+v||0,0,8)}); done(); break;
    case "lifestyle": p.lifestyle = v; if (v === "road"){ p.equipment = ["bands","chair"]; } rebuildSchedule(); p.planSeed++; done(v === "road" ? "Road mode on: no-kitchen meals and cab-side workouts" : "Schedule updated"); break;
    case "shiftStart": p.shiftStart = v; done(); break;
    case "shiftLen": p.shiftLen = clamp(+v||12, 4, 16); done(); break;
    case "level": p.level = v; done(); break;
  }
});
const _goalA = A.goal; A.goal = el => { state.profile.rate = defaultRate(el.dataset.g); _goalA(el); };
function V_profile(){
  let html = V_profile0();
  html = html.replace('<div class="fields"><label class="f">Diet', `<label class="f">Pace${paceSelect("pf-rate")}</label><div class="fields"><label class="f">Diet`);
  return html.replace("<!--RR_EXTRAS-->", profileExtras());
}

/* ---------- Today additions ---------- */
function V_today(){
  const p = state.profile, k = todayKey(), rules = dayRules(p, new Date());
  let html = V_today0();
  const extras = `${checkinCard()}${installCard()}${rules.label ? `<div class="daynote">${esc(rules.label)}${rules.fast ? " · Suhoor before dawn, Iftar at sunset" : ""}</div>` : ""}${p.lifestyle === "road" ? roadCard() : ""}`;
  html = html.replace(/(<\/div><\/div>\s*)(\$\{coachCard\(\)\}|<div class="grid g-dash">)/, (m, a, b) => a + extras + b);
  // meal times for shift workers
  if (p.lifestyle === "shift") html = html.replace(/<span class="slot">(Breakfast|Lunch|Dinner|Snack)<\/span>/g, (m, s) => `<span class="slot">${slotLabel(s)} · ${slotTime(p, s)}</span>`);
  else html = html.replace(/<span class="slot">(Breakfast|Lunch|Dinner|Snack)<\/span>/g, (m, s) => `<span class="slot">${slotLabel(s, k)}</span>`);
  return html;
}
function roadCard(){
  return `<section class="card stack roadcard"><div class="row">${ICON.truck}<h2 style="flex:1">On the road today</h2></div>
    <p class="small muted">Today's meals are all things you can grab at a truck stop, gas station or deli. No kitchen needed.</p>
    <div class="row"><a class="btn sm" href="https://www.google.com/maps/search/grocery+store+near+me" target="_blank" rel="noopener">Grocery stores near me</a><a class="btn sm" href="https://www.google.com/maps/search/truck+stop+near+me" target="_blank" rel="noopener">Truck stops near me</a><button class="btn sm" data-act="qWorkout">Start cab-side workout</button></div>
    <p class="small muted">Walking tip: 10 minutes of laps around the lot is about 1,000 steps. Do one at every stop.</p></section>`;
}

/* the "Your work" step: truck drivers get their own setup right after the basics */
const ROUTES = {otr:["Over the road","Out a week or more, sleeping in the truck"], regional:["Regional","Out a few nights a week"], local:["Local / home daily","Home most nights, eating on the road during the day"], team:["Team driving","Sharing the truck, odd sleep hours"]};
const CAB_GEAR = [["fridge","Cab fridge or cooler"],["heat","Microwave or 12V lunchbox cooker"],["blender","Blender (inverter)"]];
function wzWork(d, big){
  return `<h2>What kind of work do you do?</h2><p class="muted">We build your meals, meal times and workouts around it.</p>
    <div class="choices">${big("lifestyle","road","Truck driver","OTR, regional, local or team")}${big("lifestyle","shift","Shift work","Nights, rotating or long shifts")}${big("lifestyle","standard","Regular schedule","Days, home most nights")}</div>
    ${d.lifestyle === "road" ? `<div class="stack drvsetup"><span class="eyebrow">Your route</span><div class="choices">${Object.entries(ROUTES).map(([k,[t,sub]]) => big("route", k, t, sub)).join("")}</div>
      <span class="eyebrow">What's in your cab?</span><div class="chips">${CAB_GEAR.map(([k,l]) => `<button type="button" class="chip" data-act="wzGear" data-id="${k}" aria-pressed="${d.gear.includes(k)}">${l}</button>`).join("")}</div>
      <p class="small muted">${d.gear.length ? "We'll add meals you can prep at home and keep or heat in the truck, alongside truck-stop picks." : "No gear? No problem: every meal is something you can buy at a truck stop, travel center or deli."}</p>
      <label class="f" style="max-width:260px">DOT medical card expires <span class="muted">(optional)</span><input data-wz="dotExp" type="date" value="${esc(d.dotExp)}"></label>
      <p class="small muted">We'll count down to your physical and help you get your blood pressure, sleep and blood sugar ready for it.</p></div>` : ""}
    ${d.lifestyle === "shift" ? `<div class="fields"><label class="f">Shift starts<input data-wz="shiftStart" type="time" value="${d.shiftStart}"></label><label class="f">Shift length (hours)<input data-wz="shiftLen" type="number" min="4" max="16" value="${d.shiftLen}"></label></div><p class="small muted">Meal times and reminders line up with your shift instead of the clock.</p>` : ""}`;
}
