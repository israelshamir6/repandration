/* ======================================================================
   "Cook with what I have" and SNAP/EBT-friendly meal plans.
   ====================================================================== */
const STAPLES = new Set(["oil","soysauce","salsa","marinara","butter","honey","maple","ketchup","mayo","coconutoil","vinaigrette","teriyaki","turmericlatte","cocoa"]);
const pantry = {have: new Set(), text:"", busy:false, err:""};
const PANTRY_PICK = ["egg","chicken","turkey","beef","salmon","tuna","shrimp","tofu","blackbeans","lentils","chickpeas","oats","brownrice","whiterice","pasta","bread","tortilla","potato","sweetpotato","quinoa","spinach","broccoli","pepper","onion","tomato","carrots","zucchini","greens","avocado","banana","apple","blueberries","yogurt","milk","cheddar","cottage","pb","almonds","whey"];
function matchFoodId(name){
  const n = name.toLowerCase().replace(/s\b/g, "").trim(); if (!n) return null;
  let best = null, bs = 0;
  for (const f of FOODS){ const fn = f.name.toLowerCase(); const s = fn.startsWith(n) ? 3 : fn.split(/[ ,]+/).some(w => w.replace(/s$/, "") === n) ? 2.5 : fn.includes(n) ? 1 : 0; if (s > bs){ bs = s; best = f.id; } }
  return best;
}
function pantryMatches(){
  const have = pantry.have, p = state.profile, b = blockedSet(p);
  return TEMPLATES.filter(t => t.items.every(([id]) => FOOD[id] && foodOK(id, p, b))).map(t => {
    const need = t.items.map(i => i[0]).filter(id => !STAPLES.has(id)), missing = need.filter(id => !have.has(id));
    return {t, missing, score: need.length ? (need.length - missing.length)/need.length : 0};
  }).filter(x => x.score >= 0.5).sort((a,b) => b.score - a.score || a.missing.length - b.missing.length).slice(0, 14);
}
SHEETS.pantry = () => {
  const m = pantry.have.size ? pantryMatches() : [];
  return {title:"Cook with what I have", wide:true, body:`<div class="stack">
    <p class="muted">Tap what you have, type it, or snap your fridge. We'll find meals that fit your plan.</p>
    <div class="row"><label class="btn sm" style="position:relative">${ICON.camera} Snap my fridge or pantry<input type="file" accept="image/*" capture="environment" data-field="pantryPhoto" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      <form class="row" data-form="pantryText" style="flex:1"><input id="pantryText" type="text" placeholder="e.g. eggs, rice, frozen broccoli, chicken" style="flex:1;min-width:180px"><button class="btn sm">Add</button></form></div>
    ${pantry.busy ? `<div class="loading"><span class="spin"></span> Looking at your photo…</div>` : pantry.err ? `<p class="small" style="color:var(--bad)">${esc(pantry.err)}</p>` : ""}
    <div class="chips">${[...new Set([...PANTRY_PICK, ...pantry.have])].map(id => FOOD[id] ? `<button class="chip" data-act="pantryToggle" data-id="${id}" aria-pressed="${pantry.have.has(id)}">${esc(FOOD[id].name.split(",")[0])}</button>` : "").join("")}</div>
    ${pantry.have.size ? `<div><span class="eyebrow">${m.length ? `${m.length} meals you can make` : "No full matches yet. Add a few more ingredients."}</span>
      <div class="list">${m.map((x, i) => `<div class="li"><div class="main"><b>${esc(x.t.name)}</b><small>${x.missing.length ? `Missing: ${x.missing.map(id => FOOD[id].name.split(",")[0].toLowerCase()).join(", ")}` : "You have everything"} · ${fmt(mealTotals(x.t.items).kcal)} kcal base</small></div><span class="pill ${x.missing.length ? "neutral" : "low"}">${Math.round(x.score*100)}%</span><button class="btn sm" data-act="pantryCook" data-id="${x.t.id}">View</button></div>`).join("")}</div></div>` : ""}
    <button class="btn sm ghost" data-act="pantryClear" style="align-self:flex-start">Clear</button></div>`};
};
A.pantryOpen = () => { if (!premiumGate("Cook with what I have")) return; openSheet("pantry"); };
A.pantryToggle = el => { const id = el.dataset.id; pantry.have.has(id) ? pantry.have.delete(id) : pantry.have.add(id); sheetRender(); };
A.pantryClear = () => { pantry.have.clear(); sheetRender(); };
A.pantryCook = el => {
  const t = TEMPLATES.find(x => x.id === el.dataset.id), c = calc(state.profile), share = (SLOTS.find(s => s[0] === t.slot) || [0, .3])[1];
  const k = clamp(c.target*share/mealTotals(t.items).kcal, 0.6, 2.4), items = t.items.map(([id,q]) => [id, roundQ(q*k)]);
  openSheet("pantryMeal", {t, items});
};
SHEETS.pantryMeal = d => { const tt = mealTotals(d.items); return {title: d.t.name, body:`<div class="stack">${srcBadge(d.t.src)}${benefitHTML(d.items)}
  <ul>${d.items.map(([id,q]) => `<li>${esc(FOOD[id].name)} · ${esc(qtyText(q, FOOD[id].serv))}${pantry.have.has(id) || STAPLES.has(id) ? "" : ` <span class="srcpill">need</span>`}</li>`).join("")}</ul>${macroLine(tt)}
  <ol class="steps">${d.t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
  <div class="row"><button class="btn primary" data-act="pantryLog">Log it as ${slotLabel(d.t.slot).toLowerCase()}</button><button class="btn" data-act="pantryOpen">Back</button></div></div>`}; };
A.pantryLog = () => { const d = sheet.data; (state.food.log[todayKey()] ||= []).push(...d.items.map(([id,q]) => entryFrom(FOOD[id], q, d.t.slot))); persist("food"); closeSheet(); render(); toast(`${d.t.name} logged`); };
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="pantryText"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  for (const part of $("#pantryText").value.split(/[,;\n]+/)){ const id = matchFoodId(part); if (id) pantry.have.add(id); } sheetRender(); }, true);
document.addEventListener("change", async e => { const el = e.target; if (!(el.dataset && el.dataset.field === "pantryPhoto" && el.files[0])) return;
  pantry.busy = true; pantry.err = ""; sheetRender();
  try { const j = await api("food/pantry", {image: await shrinkImage(el.files[0], 1400)}); let n = 0; for (const name of j.items || []){ const id = matchFoodId(name); if (id && !pantry.have.has(id)){ pantry.have.add(id); n++; } } toast(n ? `Found ${n} ingredients` : "Couldn't spot ingredients we know. Tap them instead."); }
  catch (x){ pantry.err = x.message; }
  pantry.busy = false; sheetRender(); });

/* ---------- SNAP / EBT ---------- */
// Not SNAP-eligible: hot or restaurant food, alcohol, and supplements sold with a Supplement Facts label.
TAGADD("snapno", "pizza cheeseburger fries burrito sub grilledsand nuggets caesar friedrice sushi latte smoothie hotdog eggbites bfsandwich chili frozenbowl beer wine whey plantprotein energydrink rotisserie");
EXCL_LABEL.snapno = "Not SNAP-eligible";
const _blockedSnap = blockedSet;
blockedSet = p => { const b = _blockedSnap(p); if (p.snap) b.add("snapno"); return b; };
function snapCard(){
  const p = state.profile;
  return `<section class="card stack"><h2>SNAP / EBT</h2><label class="check" style="border:0;padding:0"><input type="checkbox" data-act="snapToggle" ${p.snap ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">Build my menus from SNAP-eligible groceries</span></label>
    <p class="small muted">Leaves out hot and restaurant foods, alcohol and supplements, and picks the lowest-cost meals. Many states double SNAP dollars on fruit and vegetables through Double Up Food Bucks; ask at your farmers market or grocery store.</p></section>`;
}
A.snapToggle = el => { if (!premiumGate("SNAP/EBT meal plans")) { el.checked = !el.checked; return; } const p = state.profile; p.snap = el.checked; if (p.snap && !p.budget) p.budget = 45*hhFactor(p); p.planSeed++; persist("profile"); render(); toast(p.snap ? "Menus now use SNAP-eligible groceries" : "SNAP mode off"); };
const _profileExtrasSnap = profileExtras; profileExtras = () => _profileExtrasSnap().replace('<section class="card stack"><h2>Your day & training</h2>', snapCard() + '<section class="card stack"><h2>Your day & training</h2>');
