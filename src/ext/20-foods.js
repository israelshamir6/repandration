/* ======================================================================
   Food logging: one search over built-in foods, your recipes, recents and millions of
   USDA / Open Food Facts foods; barcode scanning; AI photo and "say it" logging; recipes.
   ====================================================================== */
const MEALS = ["Breakfast","Lunch","Dinner","Snack"];
const fs = {q:"", meal:null, tab:"all", remote:[], remoteQ:"", loading:false, err:"", pick:null, mode:"log", recipe:null, ai:null, aiBusy:false, scanErr:"", scanBusy:false};
const n0 = () => ({kcal:0,p:0,c:0,f:0,s:0,as:0,fib:0,na:0});
const food = () => { const f = state.food; f.recipes ||= []; f.favs ||= []; return f; };
const keyOf = x => (x.name + "|" + (x.serv || "")).toLowerCase();

// a "pick" is anything you can log: {name, brand, src, servings:[{label,g}], n100} or a fixed-serving item {name, serv, per:{...}}
function pickFromLocal(f){ return {name:f.name, brand:"", src:"Rep & Ration", local:f.id, servings:[{label:f.serv, g:1}], per1:{kcal:f.kcal,p:f.p,c:f.c,f:f.f,s:f.s,as:f.as||0,fib:0,na:0}, tags:f.tags}; }
function pickFromEntry(e){ return {name:e.name, brand:e.brand||"", src:e.src||"Recent", local:e.food||null, servings:[{label:e.serv, g:1}], per1:{kcal:e.kcal,p:e.p,c:e.c,f:e.f,s:e.s,as:e.as||0,fib:e.fib||0,na:e.na||0}}; }
function pickFromRecipe(r){ const t = recipeTotals(r); return {name:r.name, brand:"", src:"My recipe", recipe:r.id, servings:[{label:"1 serving", g:1}], per1:t}; }
function pickNutrition(pk, si, qty){
  const sv = pk.servings[si] || pk.servings[0], o = n0();
  if (pk.per1){ for (const k in o) o[k] = (pk.per1[k] || 0) * qty; }
  else { const m = sv.g / 100 * qty; for (const k in o) o[k] = (pk.n100[k] || 0) * m; }
  return o;
}
function entryFromPick(pk, si, qty, meal){
  const sv = pk.servings[si] || pk.servings[0];
  const per = pickNutrition(pk, si, 1);
  return {id:uid(), food:pk.local||null, name:pk.name + (pk.brand ? ` (${pk.brand})` : ""), serv:sv.label, q:qty, meal, kcal:per.kcal, p:per.p, c:per.c, f:per.f, s:per.s, as:per.as||0, fib:per.fib||0, na:per.na||0, src:pk.src};
}
function recentPicks(n = 14){
  const log = state.food.log, days = Object.keys(log).sort().reverse().slice(0, 45), seen = new Map();
  days.forEach((d, di) => (log[d] || []).forEach(e => { const k = keyOf(e); const cur = seen.get(k); if (cur) cur.n++; else seen.set(k, {e, n:1, di}); }));
  return [...seen.values()].sort((a,b) => b.n - a.n || a.di - b.di).slice(0, n).map(x => pickFromEntry(x.e));
}
function localSearch(q){
  const ql = q.toLowerCase(), words = ql.split(/\s+/).filter(Boolean), hit = s => words.every(w => s.toLowerCase().includes(w));
  const out = [];
  for (const r of food().recipes) if (hit(r.name)) out.push(pickFromRecipe(r));
  for (const f of food().favs) if (hit(f.name)) out.push(Object.assign(pickFromEntry(f), {src:"Favorite"}));
  for (const p of recentPicks(40)) if (hit(p.name) && !out.some(o => o.name === p.name)) out.push(p);
  for (const f of FOODS) if (hit(f.name + " " + f.cat) && !out.some(o => o.local === f.id)) out.push(pickFromLocal(f));
  return out.slice(0, 18);
}
const remoteSearch = debounce(async q => {
  if (q.trim().length < 2){ fs.remote = []; fs.loading = false; sheetRender(); return; }
  fs.loading = true; fs.err = ""; sheetRender();
  try { const j = await api("food/search", {q}); if (fs.q.trim() === q.trim()){ fs.remote = j.items || []; fs.remoteQ = q; } }
  catch (e){ fs.err = e.message; }
  fs.loading = false; if (sheet.view === "food") updateResults();
}, 380);
const isFav = pk => food().favs.some(f => keyOf(f) === keyOf({name:pk.name + (pk.brand ? ` (${pk.brand})` : ""), serv:pk.servings[0].label}));

function resultRow(pk, i, group){
  const per = pickNutrition(pk, 0, 1);
  const blocked = pk.local ? foodBlockers(pk.local, state.profile) : [];
  return `<button class="li fres" data-act="fsPick" data-g="${group}" data-i="${i}">${pk.img ? `<img class="fthumb" src="${esc(pk.img)}" alt="" loading="lazy">` : `<span class="fthumb ph">${esc((pk.name[0]||"?").toUpperCase())}</span>`}
    <span class="main"><b>${esc(pk.name)}</b><small>${pk.brand ? esc(pk.brand) + " · " : ""}${esc(pk.servings[0].label)} · ${fmt(per.kcal)} kcal · ${fmt1(per.p)}P ${fmt1(per.c)}C ${fmt1(per.f)}F${blocked.length ? ` · <span style="color:var(--bad)">contains ${blocked.map(x => (EXCL_LABEL[x]||x).toLowerCase()).join(", ")}</span>` : ""}</small></span>
    <span class="srcpill">${esc(pk.src)}</span></button>`;
}
function resultsHTML(){
  const q = fs.q.trim();
  if (fs.tab === "recipes") return `${food().recipes.length ? food().recipes.map((r,i) => resultRow(pickFromRecipe(r), i, "rec")).join("") : `<p class="empty">No recipes yet. Build one from ingredients and log it by the serving.</p>`}<button class="btn sm" data-act="qRecipe" style="margin-top:10px">${ICON.plus} New recipe</button>`;
  if (fs.tab === "favs") return food().favs.length ? food().favs.map((f,i) => resultRow(Object.assign(pickFromEntry(f), {src:"Favorite"}), i, "fav")).join("") : `<p class="empty">Tap the star on any food to keep it here.</p>`;
  if (!q){ const r = recentPicks(); fs._recent = r;
    return r.length ? `<p class="eyebrow" style="margin:6px 0 2px">Recent</p>${r.map((p,i) => resultRow(p, i, "recent")).join("")}` : `<p class="empty">Search millions of foods, drinks, restaurant meals and brands. Or scan a barcode or snap a photo.</p>`; }
  const loc = localSearch(q); fs._local = loc;
  const remote = fs.remote.filter(r => !loc.some(l => l.name.toLowerCase() === r.name.toLowerCase()));
  fs._remote = remote;
  return `${loc.map((p,i) => resultRow(p, i, "local")).join("")}
    ${remote.length ? `<p class="eyebrow" style="margin:14px 0 2px">USDA & Open Food Facts</p>${remote.map((p,i) => resultRow(p, i, "remote")).join("")}` : ""}
    ${fs.loading ? `<p class="empty">Searching millions of foods…</p>` : fs.err ? `<p class="empty">${esc(fs.err)}</p>` : (!loc.length && !remote.length && fs.remoteQ === q) ? `<p class="empty">No match for "${esc(q)}". Try fewer words, scan the barcode, or add it as a custom food.</p>` : ""}`;
}
function updateResults(){ const box = $("#fsResults"); if (box) box.innerHTML = resultsHTML(); else sheetRender(); }
const mealChips = () => `<div class="seg mealseg" role="group" aria-label="Meal">${MEALS.map(m => `<button data-act="fsMeal" data-m="${m}" aria-pressed="${fs.meal===m}">${slotLabel(m)}</button>`).join("")}</div>`;

SHEETS.food = () => {
  if (fs.pick) return pickView();
  const recipeMode = fs.mode === "recipe";
  return {title: recipeMode ? `Add to ${fs.recipe ? esc(fs.recipe.name || "recipe") : "recipe"}` : "Add food", wide:true, body:`
    <div class="fsearch">${ICON.search}<input id="fsQ" type="search" placeholder="Search foods, drinks, brands, restaurants…" value="${esc(fs.q)}" data-field="fsQ" autocomplete="off" autofocus aria-label="Search foods"></div>
    <div class="row" style="justify-content:space-between">${recipeMode ? "" : mealChips()}
      <div class="row" style="gap:6px"><button class="btn sm" data-act="qScan">${ICON.scan} Scan</button><button class="btn sm" data-act="qPhoto">${ICON.camera} Photo</button><button class="btn sm" data-act="qSay">${ICON.mic} Say it</button></div></div>
    ${recipeMode ? "" : `<div class="chips">${[["all","Search"],["favs","Favorites"],["recipes","My recipes"]].map(([k,l]) => `<button class="chip" data-act="fsTab" data-t="${k}" aria-pressed="${fs.tab===k}">${l}</button>`).join("")}<button class="chip" data-act="fsQuick">Quick calories</button><button class="chip" data-act="fsCustom">Custom food</button></div>`}
    <div class="list" id="fsResults">${resultsHTML()}</div>`};
};
function pickView(){
  const pk = fs.pick, si = fs.si || 0, qty = fs.qty || 1, t = pickNutrition(pk, si, qty), c = calc(state.profile);
  const recipeMode = fs.mode === "recipe";
  const bl = pk.local ? foodBlockers(pk.local, state.profile) : [];
  return {title: pk.name, wide:true, body:`<div class="stack">
    <div class="row" style="gap:8px">${pk.img ? `<img class="fthumb lg" src="${esc(pk.img)}" alt="">` : ""}<div style="flex:1;min-width:0">${pk.brand ? `<b>${esc(pk.brand)}</b><br>` : ""}<span class="srcpill">${esc(pk.src)}</span>${pk.src === "AI estimate" ? ` <span class="small muted">Estimated from your photo or words. Adjust the amount if it looks off.</span>` : ""}</div>
      ${recipeMode ? "" : `<button class="btn icon" data-act="fsFav" aria-label="Favorite" aria-pressed="${isFav(pk)}" style="color:${isFav(pk)?"var(--carbs)":"inherit"}">${isFav(pk)?ICON.starOn:ICON.star}</button>`}</div>
    ${bl.length ? `<p class="small" style="color:var(--bad)">Contains ${bl.map(x => (EXCL_LABEL[x]||x).toLowerCase()).join(", ")}, which you leave out.</p>` : ""}
    <div class="fields" style="grid-template-columns:2fr 1fr"><label class="f">Serving<select data-field="fsServ">${pk.servings.map((s,i) => `<option value="${i}" ${i===si?"selected":""}>${esc(s.label)}</option>`).join("")}</select></label>
      <label class="f">Amount<input type="number" min="0.1" step="0.25" inputmode="decimal" value="${qty}" data-field="fsQty"></label></div>
    <div class="nutgrid" id="fsNut">${nutGrid(t, c)}</div>
    ${recipeMode ? "" : mealChips()}
    <div class="row"><button class="btn primary" data-act="fsAdd" style="flex:1">${recipeMode ? "Add to recipe" : `Add to ${slotLabel(fs.meal)}`}</button><button class="btn" data-act="fsBack">Back</button></div></div>`};
}
const nutGrid = (t, c) => [["Calories", fmt(t.kcal), c ? `${Math.round(t.kcal/c.target*100)}% of day` : ""],["Protein", fmt1(t.p)+" g","var(--protein)"],["Carbs", fmt1(t.c)+" g","var(--carbs)"],["Fat", fmt1(t.f)+" g","var(--fat)"],["Sugar", fmt1(t.s)+" g",""],["Fiber", t.fib ? fmt1(t.fib)+" g" : "—",""]]
  .map(([l,v,x]) => `<div class="nut"><small>${l}</small><b class="num" ${x && x.startsWith("var") ? `style="color:${x}"` : ""}>${v}</b>${x && !x.startsWith("var") ? `<small>${x}</small>` : ""}</div>`).join("");
SHEETS.food.onClose = () => { fs.pick = null; if (fs.mode === "recipe" && fs.recipe){ fs.mode = "log"; } };

function openFood(opts = {}){
  fs.meal = opts.meal || fs.meal || slotNow(); fs.pick = null; fs.mode = opts.mode || "log"; if (opts.tab) fs.tab = opts.tab; if (fs.mode === "log" && fs.tab !== "favs" && fs.tab !== "recipes") fs.tab = "all";
  openSheet("food");
  if (fs.q && fs.remoteQ !== fs.q) remoteSearch(fs.q);
}
A.qSearch = () => openFood();
A.openFood = el => openFood({meal: el.dataset.meal});
A.fsTab = el => { fs.tab = el.dataset.t; sheetRender(); };
A.fsMeal = el => { fs.meal = el.dataset.m; sheetRender(); };
A.fsBack = () => { fs.pick = null; sheetRender(); };
A.fsPick = el => {
  const g = el.dataset.g, i = +el.dataset.i;
  const src = g === "local" ? fs._local : g === "remote" ? fs._remote : g === "recent" ? fs._recent : g === "fav" ? food().favs.map(f => Object.assign(pickFromEntry(f), {src:"Favorite"})) : g === "rec" ? food().recipes.map(pickFromRecipe) : g === "ai" ? fs.ai.items : [];
  fs.pick = src[i]; fs.si = 0; fs.qty = 1; if (sheet.view !== "food") openSheet("food"); else sheetRender();
};
A.fsFav = () => {
  const pk = fs.pick, e = entryFromPick(pk, 0, 1, "Snack"), f = food(), k = keyOf(e), i = f.favs.findIndex(x => keyOf(x) === k);
  if (i >= 0) f.favs.splice(i, 1); else f.favs.unshift({name:e.name, serv:e.serv, kcal:e.kcal, p:e.p, c:e.c, f:e.f, s:e.s, as:e.as, fib:e.fib, na:e.na, food:e.food, src:pk.src});
  f.favs = f.favs.slice(0, 60); persist("food"); sheetRender();
};
A.fsAdd = () => {
  const pk = fs.pick, si = fs.si || 0, qty = Math.max(0.05, +fs.qty || 1);
  if (fs.mode === "recipe"){ const e = entryFromPick(pk, si, qty, "Recipe"); fs.recipe.items.push(e); fs.pick = null; openSheet("recipe", {}); return; }
  if (pk.recipe){ const r = food().recipes.find(x => x.id === pk.recipe); if (r) logRecipe(r, qty, fs.meal); }
  else { (state.food.log[ui.nutDate] ||= []).push(entryFromPick(pk, si, qty, fs.meal)); persist("food"); postStatsSoon(); }
  toast(`Added ${pk.name} to ${slotLabel(fs.meal).toLowerCase()}`);
  fs.pick = null; fs.q = ""; fs.remote = []; closeSheet(); render();
};
A.fsQuick = () => openSheet("quickcal");
A.fsCustom = () => openSheet("custom");
SHEETS.quickcal = () => ({title:"Quick calories", body:`<form class="stack" data-form="quickcal"><p class="small muted">For when you know the numbers but not the food.</p>
  <div class="fields"><label class="f" style="grid-column:1/-1">Label<input id="qc-n" type="text" placeholder="e.g. Dinner at Mom's" autofocus></label><label class="f">Calories<input id="qc-k" type="number" min="0" required></label><label class="f">Protein g<input id="qc-p" type="number" min="0" step="0.1"></label><label class="f">Carbs g<input id="qc-c" type="number" min="0" step="0.1"></label><label class="f">Fat g<input id="qc-f" type="number" min="0" step="0.1"></label></div>
  ${mealChips()}<button class="btn primary">Add</button></form>`});
SHEETS.custom = () => ({title:"Custom food", body:`<form class="stack" data-form="customSheet"><p class="small muted">Copy it from the label. It's saved to your favorites so you can log it again in one tap.</p>
  <div class="fields"><label class="f" style="grid-column:1/-1">Name<input id="cs-n" type="text" required autofocus placeholder="e.g. Grandma's chili"></label><label class="f" style="grid-column:1/-1">Serving size<input id="cs-s" type="text" placeholder="e.g. 1 cup" value="1 serving"></label>
  <label class="f">Calories<input id="cs-k" type="number" min="0" required></label><label class="f">Protein g<input id="cs-p" type="number" min="0" step="0.1" value="0"></label><label class="f">Carbs g<input id="cs-c" type="number" min="0" step="0.1" value="0"></label><label class="f">Fat g<input id="cs-f" type="number" min="0" step="0.1" value="0"></label><label class="f">Sugar g<input id="cs-su" type="number" min="0" step="0.1" value="0"></label><label class="f">Added sugar g<input id="cs-as" type="number" min="0" step="0.1" value="0"></label></div>
  ${mealChips()}<button class="btn primary">Save & add</button></form>`});
document.addEventListener("submit", e => {
  const f = e.target.closest('[data-form="quickcal"],[data-form="customSheet"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const g = id => +($(id) || {}).value || 0;
  if (f.dataset.form === "quickcal"){
    const k = g("#qc-k"); if (!k){ toast("Enter calories."); return; }
    (state.food.log[ui.nutDate] ||= []).push({id:uid(), food:null, name:$("#qc-n").value.trim() || "Quick add", serv:"entry", q:1, meal:fs.meal, kcal:k, p:g("#qc-p"), c:g("#qc-c"), f:g("#qc-f"), s:0, as:0, src:"Quick add"});
  } else {
    const name = $("#cs-n").value.trim(); if (!name){ toast("Give the food a name."); return; }
    const en = {id:uid(), food:null, name, serv:$("#cs-s").value.trim() || "serving", q:1, meal:fs.meal, kcal:g("#cs-k"), p:g("#cs-p"), c:g("#cs-c"), f:g("#cs-f"), s:g("#cs-su"), as:g("#cs-as"), src:"Custom"};
    (state.food.log[ui.nutDate] ||= []).push(en);
    food().favs.unshift({name:en.name, serv:en.serv, kcal:en.kcal, p:en.p, c:en.c, f:en.f, s:en.s, as:en.as, src:"Custom"});
  }
  persist("food"); postStatsSoon(); closeSheet(); render(); toast("Added");
}, true);
document.addEventListener("input", e => {
  const el = e.target, f = el.dataset && el.dataset.field; if (!f) return;
  if (f === "fsQ"){ fs.q = el.value; fs.tab = "all"; updateResults(); remoteSearch(el.value); }
  else if (f === "fsQty"){ fs.qty = +el.value || 0; const box = $("#fsNut"); if (box) box.innerHTML = nutGrid(pickNutrition(fs.pick, fs.si||0, fs.qty||0), calc(state.profile)); }
});
document.addEventListener("change", e => {
  const el = e.target, f = el.dataset && el.dataset.field; if (!f) return;
  if (f === "fsServ"){ fs.si = +el.value; sheetRender(); }
});

/* ---------- recipes ---------- */
function recipeTotals(r){ const t = n0(); for (const e of r.items) for (const k in t) t[k] += (e[k]||0) * e.q; const n = Math.max(1, +r.servings || 1); for (const k in t) t[k] /= n; return t; }
function logRecipe(r, servings, meal){
  const t = recipeTotals(r);
  (state.food.log[ui.nutDate] ||= []).push({id:uid(), food:null, name:r.name, serv:"serving", q:servings, meal, kcal:t.kcal, p:t.p, c:t.c, f:t.f, s:t.s, as:t.as, fib:t.fib, na:t.na, src:"My recipe"});
  persist("food"); postStatsSoon();
}
A.qRecipe = () => { fs.recipe = {id:uid(), name:"", servings:4, items:[]}; openSheet("recipe", {}); };
A.editRecipe = el => { const r = food().recipes.find(x => x.id === el.dataset.id); if (r){ fs.recipe = JSON.parse(JSON.stringify(r)); openSheet("recipe", {}); } };
SHEETS.recipe = () => {
  const r = fs.recipe, t = recipeTotals(r);
  return {title: r.name ? r.name : "New recipe", wide:true, body:`<div class="stack">
    <div class="fields" style="grid-template-columns:2fr 1fr"><label class="f">Recipe name<input type="text" value="${esc(r.name)}" data-field="rcName" placeholder="e.g. Turkey chili, protein smoothie" maxlength="60"></label><label class="f">Makes (servings)<input type="number" min="1" max="40" value="${r.servings}" data-field="rcServ"></label></div>
    <div><span class="eyebrow">Ingredients</span><div class="list">${r.items.length ? r.items.map((e,i) => `<div class="li"><div class="main"><b>${esc(e.name)}</b><small>${fmt1(e.q)} × ${esc(e.serv)} · ${fmt(e.kcal*e.q)} kcal</small></div><button class="btn icon" data-act="rcDel" data-i="${i}" aria-label="Remove">${ICON.trash}</button></div>`).join("") : `<p class="empty">Add ingredients from the food search, a barcode or a photo.</p>`}</div>
      <button class="btn sm" data-act="rcAdd" style="margin-top:8px">${ICON.plus} Add ingredient</button></div>
    <div><span class="eyebrow">Per serving</span><div class="nutgrid">${nutGrid(t)}</div></div>
    <div class="row"><button class="btn primary" data-act="rcSave" ${r.items.length ? "" : "disabled"}>Save recipe</button>${food().recipes.some(x => x.id === r.id) ? `<button class="btn danger" data-act="rcRemove">Delete</button>` : ""}</div>
    <p class="small muted">Smoothies, shakes, casseroles, family meals: build it once, then log any number of servings.</p></div>`};
};
SHEETS.recipe.onClose = () => {};
document.addEventListener("change", e => { const el = e.target, f = el.dataset && el.dataset.field; if (!f || !fs.recipe) return;
  if (f === "rcName"){ fs.recipe.name = el.value.trim().slice(0, 60); }
  else if (f === "rcServ"){ fs.recipe.servings = clamp(Math.round(+el.value) || 1, 1, 40); sheetRender(); } });
A.rcAdd = () => { const n = $('[data-field="rcName"]'); if (n) fs.recipe.name = n.value.trim().slice(0, 60); fs.mode = "recipe"; fs.pick = null; fs.q = ""; fs.remote = []; openSheet("food"); };
A.rcDel = el => { fs.recipe.items.splice(+el.dataset.i, 1); sheetRender(); };
A.rcSave = () => { const r = fs.recipe; const n = $('[data-field="rcName"]'); if (n) r.name = n.value.trim().slice(0, 60); if (!r.name){ toast("Name your recipe."); return; }
  const list = food().recipes, i = list.findIndex(x => x.id === r.id); if (i >= 0) list[i] = r; else list.unshift(r);
  persist("food"); fs.mode = "log"; closeSheet(); toast(`Saved ${r.name}. Find it under My recipes.`); fs.tab = "recipes"; openFood({tab:"recipes"}); };
A.rcRemove = () => { food().recipes = food().recipes.filter(x => x.id !== fs.recipe.id); persist("food"); closeSheet(); render(); toast("Recipe deleted"); };

/* ---------- barcode scanning ---------- */
let scanStop = null;
SHEETS.scan = () => ({title:"Scan a barcode", body:`<div class="stack">
  <div class="scanbox"><video id="scanVid" playsinline muted></video><div class="scanline"></div></div>
  <p class="small muted" id="scanMsg">${esc(fs.scanErr || "Point your camera at the barcode on the package.")}</p>
  <form class="row" data-form="barcode"><input id="bcIn" type="text" inputmode="numeric" placeholder="Or type the numbers under the barcode" style="flex:1;min-width:180px" aria-label="Barcode number"><button class="btn primary">Look up</button></form></div>`});
SHEETS.scan.onClose = () => { if (scanStop){ try { scanStop(); } catch {} scanStop = null; } };
A.qScan = async () => { fs.scanErr = ""; fs.meal ||= slotNow(); openSheet("scan"); startScan(); };
async function lookupBarcode(code){
  if (fs.scanBusy) return; fs.scanBusy = true; const msg = $("#scanMsg"); if (msg) msg.textContent = `Looking up ${code}…`;
  try { const j = await api("food/barcode", {code}); SHEETS.scan.onClose(); fs.pick = j.item; fs.si = 0; fs.qty = 1; openSheet("food"); }
  catch (e){ fs.scanErr = e.message; if (msg) msg.textContent = e.message; }
  fs.scanBusy = false;
}
function loadScript(src){ return new Promise((ok, bad) => { if ([...document.scripts].some(s => s.src === src)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
async function startScan(){
  const vid = $("#scanVid"), msg = $("#scanMsg");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ if (msg) msg.textContent = "This browser can't open the camera. Type the barcode number instead."; return; }
  try {
    if ("BarcodeDetector" in window){
      const det = new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]});
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      vid.srcObject = stream; await vid.play(); let on = true;
      scanStop = () => { on = false; stream.getTracks().forEach(t => t.stop()); };
      const tick = async () => { if (!on) return; try { const r = await det.detect(vid); if (r.length){ scanStop(); scanStop = null; if (navigator.vibrate) navigator.vibrate(60); return lookupBarcode(r[0].rawValue); } } catch {} setTimeout(tick, 180); };
      tick();
    } else {
      await loadScript("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js");
      const reader = new ZXingBrowser.BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, vid, (res) => { if (res){ controls.stop(); scanStop = null; if (navigator.vibrate) navigator.vibrate(60); lookupBarcode(res.getText()); } });
      scanStop = () => controls.stop();
    }
  } catch (e){ if (msg) msg.textContent = /denied|NotAllowed/i.test(String(e && (e.name || e.message))) ? "Camera access is off. Allow the camera for this site, or type the barcode number." : "Couldn't start the camera. Type the barcode number instead."; }
}
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="barcode"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation(); const v = $("#bcIn").value.replace(/\D/g, ""); if (v.length < 6){ toast("Enter the full barcode number."); return; } lookupBarcode(v); }, true);

/* ---------- AI photo & "say it" ---------- */
SHEETS.ai = d => {
  const r = fs.ai;
  if (fs.aiBusy) return {title: d.photo ? "Reading your meal…" : "Working it out…", body:`<div class="loading"><span class="spin"></span> Estimating foods and portions…</div>`};
  if (r) return {title:"Here's what we found", wide:true, body:`<div class="stack">
    ${r.items.length ? `<div class="list">${r.items.map((it,i) => { const t = pickNutrition(it, 0, it.q ?? 1); return `<label class="li"><input type="checkbox" data-field="aiOn" data-i="${i}" ${it.off ? "" : "checked"} style="width:18px;height:18px;accent-color:var(--accent)"><span class="main"><b>${esc(it.name)}</b><small>${esc(it.servings[0].label)} · ${fmt(t.kcal)} kcal · ${fmt1(t.p)}P ${fmt1(t.c)}C ${fmt1(t.f)}F</small></span><input type="number" min="0.25" step="0.25" value="${it.q ?? 1}" data-field="aiQ" data-i="${i}" style="width:70px" aria-label="Portions"></label>`; }).join("")}</div>` : `<p class="empty">${esc(r.note || "No food found.")}</p>`}
    ${r.note && r.items.length ? `<p class="small muted">${esc(r.note)}</p>` : ""}
    ${mealChips()}
    <div class="row"><button class="btn primary" data-act="aiAdd" ${r.items.length ? "" : "disabled"} style="flex:1">Add to ${slotLabel(fs.meal)}</button><button class="btn" data-act="${d.photo ? "qPhoto" : "qSay"}">Try again</button></div>
    <p class="small muted">AI estimates are a starting point. Portions are the hardest part, so adjust the amounts if needed.</p></div>`};
  if (d.photo) return {title:"Snap a meal", body:`<div class="stack"><p class="muted">Take a photo of your plate from above, with everything visible. We'll list the foods and estimate portions.</p>
    <label class="btn primary" style="position:relative">${ICON.camera} Take or choose a photo<input type="file" accept="image/*" capture="environment" data-field="aiPhoto" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
    <label class="f">Anything we can't see? (optional)<input id="aiHint" type="text" placeholder="e.g. cooked in butter, 2 tbsp ranch"></label>${aiNote()}</div>`};
  return {title:"Say what you ate", body:`<form class="stack" data-form="aiSay"><label class="f">What did you eat?<textarea id="aiText" rows="3" placeholder="e.g. Two scrambled eggs, a slice of sourdough toast with butter and a medium coffee with oat milk" autofocus></textarea></label>
    <div class="row">${("webkitSpeechRecognition" in window || "SpeechRecognition" in window) ? `<button type="button" class="btn" data-act="aiMic">${ICON.mic} Speak</button>` : ""}<button class="btn primary" style="flex:1">Estimate it</button></div>${aiNote()}</form>`};
};
const aiNote = () => me() && me().features && !me().features.ai ? `<p class="small" style="color:var(--warn)">Photo and voice logging are switching on soon. Until then, search or scan a barcode.</p>` : "";
SHEETS.ai.onClose = () => { fs.ai = null; };
A.qPhoto = () => { fs.ai = null; fs.meal ||= slotNow(); openSheet("ai", {photo:true}); };
A.qSay = () => { fs.ai = null; fs.meal ||= slotNow(); openSheet("ai", {photo:false}); };
A.aiMic = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
  const rec = new SR(); rec.lang = "en-US"; rec.interimResults = true;
  rec.onresult = ev => { const t = [...ev.results].map(r => r[0].transcript).join(" "); const box = $("#aiText"); if (box) box.value = t; };
  rec.onerror = () => toast("Couldn't hear that. Try again or type it."); rec.start(); toast("Listening…");
};
async function runAI(payload, photo){
  fs.aiBusy = true; fs.ai = null; sheet.data = {photo}; sheetRender();
  try { const j = await api("food/ai", payload); fs.ai = {items:(j.items || []).map(x => Object.assign(x, {q:1})), note:j.note || ""}; }
  catch (e){ fs.ai = {items:[], note:e.message}; }
  fs.aiBusy = false; sheetRender();
}
function shrinkImage(file, max = 1024){
  return new Promise((ok, bad) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); ok(c.toDataURL("image/jpeg", 0.82)); }; img.onerror = bad; img.src = URL.createObjectURL(file); });
}
document.addEventListener("change", async e => {
  const el = e.target, f = el.dataset && el.dataset.field; if (!f) return;
  if (f === "aiPhoto" && el.files && el.files[0]){ try { const img = await shrinkImage(el.files[0]); runAI({image:img, text:($("#aiHint")||{}).value || ""}, true); } catch { toast("Couldn't read that photo."); } }
  else if (f === "aiOn"){ fs.ai.items[+el.dataset.i].off = !el.checked; }
  else if (f === "aiQ"){ fs.ai.items[+el.dataset.i].q = Math.max(0.25, +el.value || 1); sheetRender(); }
});
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="aiSay"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation(); const t = $("#aiText").value.trim(); if (t.length < 3){ toast("Tell us what you ate."); return; } runAI({text:t}, false); }, true);
A.aiAdd = () => {
  const items = fs.ai.items.filter(x => !x.off); if (!items.length) return;
  for (const it of items) (state.food.log[ui.nutDate] ||= []).push(entryFromPick(it, 0, it.q ?? 1, fs.meal));
  persist("food"); postStatsSoon(); const n = items.length; fs.ai = null; closeSheet(); render(); toast(`Added ${n} item${n>1?"s":""} to ${slotLabel(fs.meal).toLowerCase()}`);
};

/* ---------- Food page ---------- */
A.copyMeal = el => {
  const slot = el.dataset.meal, prev = dkey(addDays(pkey(ui.nutDate), -1)), es = dayEntries(prev).filter(x => x.meal === slot);
  if (!es.length){ toast(`Nothing logged for ${slotLabel(slot).toLowerCase()} yesterday.`); return; }
  (state.food.log[ui.nutDate] ||= []).push(...es.map(x => Object.assign({}, x, {id:uid()}))); persist("food"); render(); toast(`Copied yesterday's ${slotLabel(slot).toLowerCase()}`);
};
function V_nutrition(){
  const p = state.profile, c = calc(p), k = ui.nutDate, t = dayTotals(k), ents = dayEntries(k), isToday = k === todayKey();
  const label = isToday ? "Today" : k === dkey(addDays(new Date(),-1)) ? "Yesterday" : `${DAYS_LONG[wIdx(pkey(k))]}, ${shortDate(k)}`;
  const slots = mealSlotsFor(p, k);
  const groups = slots.map(slot => { const es = ents.filter(e => e.meal === slot); const kc = es.reduce((a,e) => a + e.kcal*e.q, 0);
    return `<div class="mealgroup"><h3>${slotLabel(slot, k)}<span class="num">${fmt(kc)} kcal</span></h3>${es.map(e => `<div class="li"><div class="main"><b>${esc(e.name)}</b><small class="num">${fmt(e.kcal*e.q)} kcal · ${fmt1(e.p*e.q)}P ${fmt1(e.c*e.q)}C ${fmt1(e.f*e.q)}F${e.src && e.src !== "Rep & Ration" ? ` · ${esc(e.src)}` : ""}</small></div><input type="number" min="0.25" step="0.25" value="${e.q}" data-field="entryQ" data-id="${e.id}" aria-label="Servings of ${esc(e.name)}" style="width:68px;padding:5px 7px"><span class="small muted servlab">× ${esc(e.serv)}</span><button class="btn icon" data-act="delEntry" data-id="${e.id}" aria-label="Remove ${esc(e.name)}">${ICON.trash}</button></div>`).join("")}
      <div class="row addrow"><button class="btn sm" data-act="openFood" data-meal="${slot}">${ICON.plus} Add food</button>${es.length ? "" : `<button class="btn sm ghost" data-act="copyMeal" data-meal="${slot}">Copy yesterday</button>`}</div></div>`; }).join("");
  const others = ents.filter(e => !slots.includes(e.meal));
  const water = (state.health.water || {})[k] || 0;
  return `<div class="pagehead"><div><h1>Food</h1><p class="sub">${fmt(c.target)} kcal · ${c.protein} g protein target${p.adaptive !== false && p.tdeeEst ? " · adaptive" : ""}</p></div>
    <div class="row"><button class="btn icon" data-act="nutDate" data-d="-1" aria-label="Previous day">${ICON.left}</button><b style="min-width:130px;text-align:center">${label}</b><button class="btn icon" data-act="nutDate" data-d="1" aria-label="Next day" ${isToday?"disabled":""}>${ICON.right}</button>${isToday?"":`<button class="btn sm" data-act="nutToday">Today</button>`}</div></div>
  <div class="logbar"><button class="logbtn primary" data-act="qSearch">${ICON.search}<span>Search</span></button><button class="logbtn" data-act="qScan">${ICON.scan}<span>Barcode</span></button><button class="logbtn" data-act="qPhoto">${ICON.camera}<span>Photo</span></button><button class="logbtn" data-act="qSay">${ICON.mic}<span>Say it</span></button><button class="logbtn" data-act="water">${ICON.water}<span>Water · ${water}</span></button></div>
  <div class="grid g-side">
    <div class="stack">
      <section class="card"><div class="ringwrap">${ring(t.kcal, c.target, fmt(Math.max(0, c.target - t.kcal)), t.kcal <= c.target ? "kcal left" : `${fmt(t.kcal - c.target)} over`)}${macroBlock(t,c)}</div></section>
      <section class="card">${groups}${others.length ? `<div class="mealgroup"><h3>Other</h3>${others.map(e => `<div class="li"><div class="main"><b>${esc(e.name)}</b><small>${fmt(e.kcal*e.q)} kcal</small></div><button class="btn icon" data-act="delEntry" data-id="${e.id}" aria-label="Remove">${ICON.trash}</button></div>`).join("")}</div>` : ""}</section>
    </div>
    <div class="stack">
      ${sugCard()}
      ${food().recipes.length ? `<section class="card stack"><div class="card-head" style="margin:0"><h2>My recipes</h2><button class="btn sm" data-act="qRecipe">${ICON.plus} New</button></div><div class="list">${food().recipes.slice(0,6).map(r => { const rt = recipeTotals(r); return `<div class="li"><div class="main"><b>${esc(r.name)}</b><small>${fmt(rt.kcal)} kcal · ${fmt1(rt.p)} g protein per serving</small></div><button class="btn sm" data-act="editRecipe" data-id="${r.id}">Edit</button><button class="btn sm primary" data-act="logRecipeBtn" data-id="${r.id}">Log</button></div>`; }).join("")}</div></section>`
        : `<section class="card stack"><h2>Recipes & smoothies</h2><p class="small muted">Build a recipe once from its ingredients, then log it by the serving.</p><button class="btn sm" data-act="qRecipe" style="align-self:flex-start">${ICON.plus} New recipe</button></section>`}
      <section class="card"><div class="card-head"><h2>Last 7 days</h2><span class="small muted">Avg ${fmt(avgKcal(7))} kcal</span></div>${calBars(c.target)}</section>
    </div>
  </div>`;
}
A.logRecipeBtn = el => { const r = food().recipes.find(x => x.id === el.dataset.id); if (!r) return; fs.pick = pickFromRecipe(r); fs.si = 0; fs.qty = 1; fs.meal = slotNow(); fs.mode = "log"; openSheet("food"); };
