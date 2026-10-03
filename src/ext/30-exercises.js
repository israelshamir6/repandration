/* ======================================================================
   Exercise library: 125 home & calisthenics moves plus ~870 gym exercises with
   step-by-step demo images (public-domain free-exercise-db), smarter weekly
   programming, and progressive-overload suggestions.
   ====================================================================== */
EQUIP.push({id:"barbell",label:"Barbell & plates"},{id:"cable",label:"Cable machine"},{id:"machine",label:"Weight machines"},{id:"ezbar",label:"EZ curl bar"},
  {id:"medball",label:"Medicine ball"},{id:"ball",label:"Exercise ball"},{id:"foam",label:"Foam roller"},{id:"other",label:"Other gym gear"});
const GYM = ["bands","rope","kettlebell","dumbbells","bar","chair","barbell","cable","machine","ezbar","medball","ball","foam","other"];
const HOME = ["bands","dumbbells","chair"];
const LEVEL = {b:"Beginner", i:"Intermediate", e:"Advanced"};
const CATL = {calisthenics:"Calisthenics", road:"On the road", strength:"Strength", stretching:"Stretch & mobility", plyometrics:"Plyometrics", powerlifting:"Powerlifting", "olympic weightlifting":"Olympic lifting", strongman:"Strongman", cardio:"Cardio", home:"Home & calisthenics"};
const exImg = (e, i = 0) => e.img ? `/ex/${encodeURIComponent(e.img)}__${i}.webp` : "";
let EXLOADED = false;
function addExercises(list){
  for (const x of list){
    if (EX[x.id] && EX[x.id].x) continue;
    const e = {id:x.id, name:x.n, impact:x.i, pattern:x.p, equip:x.e, metric:x.m, loaded:!!x.l, muscles:x.mu, dose:x.d, cue:x.c, level:x.lv, cat:x.cat, img:x.img, ins:x.ins, gen:!!x.g, compound:!!x.k, prim:x.pm, x:true};
    EXS.push(e); EX[e.id] = e;
  }
  EXLOADED = true;
}
for (const e of EXS) if (!e.x){ e.cat = "home"; e.level = e.impact === 3 ? "i" : "b"; e.gen = true; e.compound = !/raise|curl|extension|kickback|fly/i.test(e.name); }
const normName = s => String(s).toLowerCase().replace(/\(.*?\)/g, "").replace(/dumbbells?/g, "db").replace(/[^a-z]/g, "").replace(/s$/, "");
const WG_CAT = {abs:"core", back:"pull", calves:"lower", cardio:"cardio", chest:"push", legs:"lower", shoulders:"push"};
function addWger(list){
  const byName = new Map(EXS.map(e => [normName(e.name), e]));
  for (const w of list){
    const vids = (w.vid || []).sort((a, b) => (a.codec === "h264" ? 0 : 1) - (b.codec === "h264" ? 0 : 1) || a.mb - b.mb);
    const hit = byName.get(normName(w.n));
    if (hit){ if (vids.length && !hit.vid) hit.vid = vids; if (!hit.img && w.img.length) hit.wimg = w.img; continue; }
    const cat = String(w.cat || "").toLowerCase(), prim = w.pm || [];
    const pattern = cat === "arms" ? (prim.includes("triceps") ? "push" : "pull") : (WG_CAT[cat] || (prim.some(m => ["quadriceps","hamstrings","glutes","calves"].includes(m)) ? "lower" : "core"));
    const loaded = (w.e || []).some(q => ["barbell","dumbbells","kettlebell","cable","machine","ezbar"].includes(q));
    const sentences = (w.d || "").split(/(?<=[.!?])\s+/).filter(x => x.length > 3);
    const e = {id:w.id, name:w.n, impact: cat === "cardio" ? 2 : 1, pattern, equip:w.e || [], metric: cat === "cardio" ? "time" : "reps", loaded, muscles: [...prim, ...(w.sm || [])].slice(0, 3).map(m => m[0].toUpperCase() + m.slice(1)).join(" · ") || w.cat,
      dose: cat === "cardio" ? 300 : loaded ? 10 : 12, cue: sentences[0] || "", level:"b", cat: cat === "cardio" ? "cardio" : "strength", ins: sentences.slice(0, 8), gen:false, compound:false, prim, wimg: w.img, vid: vids, x:true, wger:true};
    EXS.push(e); EX[e.id] = e; byName.set(normName(e.name), e);
  }
}
const RR_EXLOAD = Promise.all([fetch("/data/exercises.json").then(r => r.ok ? r.json() : []).catch(() => []), fetch("/data/wger.json").then(r => r.ok ? r.json() : []).catch(() => [])])
  .then(([a, b]) => { addExercises(a); try { addWger(b); } catch (e){ console.warn(e); } }).catch(() => {});

/* ---------- programming ---------- */
const SPLITS = {
  2:[["Full body A",["lower","push","pull","lower","core"]],["Full body B",["lower","pull","push","lower","core"]]],
  3:[["Full body A",["lower","push","pull","lower","core"]],["Full body B",["lower","pull","push","core","lower"]],["Full body C",["lower","push","pull","lower","core"]]],
  4:[["Upper A",["push","pull","push","pull","core"]],["Lower A",["lower","lower","lower","core","lower"]],["Upper B",["pull","push","pull","push","core"]],["Lower B",["lower","lower","core","lower","lower"]]],
  5:[["Push",["push","push","push","push","core"]],["Pull",["pull","pull","pull","pull","core"]],["Legs",["lower","lower","lower","lower","core"]],["Upper",["push","pull","push","pull","core"]],["Lower",["lower","lower","lower","core","lower"]]],
  6:[["Push A",["push","push","push","push","core"]],["Pull A",["pull","pull","pull","pull","core"]],["Legs A",["lower","lower","lower","lower","core"]],["Push B",["push","push","push","push","core"]],["Pull B",["pull","pull","pull","pull","core"]],["Legs B",["lower","lower","lower","lower","core"]]]
};
function exPool(p){
  const lv = p.level || "b", lvOk = e => lv === "e" || e.level === "b" || (lv === "i" && e.level === "i") || !e.level;
  let pool = EXS.filter(e => e.gen && e.impact <= p.impact && exAvailable(e, p.equipment) && lvOk(e));
  if (p.lifestyle === "road") pool = pool.filter(e => !e.x && e.equip.every(q => ["bands","chair","rope"].includes(q)) && e.impact <= Math.min(p.impact, 2));
  return pool;
}
function buildWeek(p, seed){
  const rnd = mulberry32(seed*31+7), days = clamp(p.daysPerWeek,2,6), idx = DAY_PATTERNS[days];
  const pool = exPool(p), gymish = p.equipment.some(q => ["barbell","cable","machine","dumbbells","kettlebell"].includes(q));
  const lists = {}, cursor = {};
  for (const pat of ["lower","push","pull","core","cardio"]){
    const arr = shuffle(pool.filter(e => e.pattern === pat), rnd);
    // compound, loaded lifts first for strength goals; the rest keep their shuffled order
    arr.sort((a,b) => ((b.compound?2:0) + (gymish && b.loaded?1:0)) - ((a.compound?2:0) + (gymish && a.loaded?1:0)));
    const head = arr.slice(0, Math.max(6, Math.ceil(arr.length*0.25))), tail = arr.slice(head.length);
    lists[pat] = shuffle(head, rnd).concat(shuffle(tail, rnd)).slice(0, 40); cursor[pat] = 0;
  }
  const take = pat => { const l = lists[pat]; if (!l || !l.length) return null; const e = l[cursor[pat] % l.length]; cursor[pat]++; return e; };
  const sets = p.goal === "gain" ? 4 : 3;
  const dose = e => ({ex:e.id, sets, reps: e.metric === "time" ? (p.goal === "loss" ? Math.max(e.dose, 40) : e.dose) : e.loaded ? (p.goal === "gain" ? (e.compound ? 8 : 10) : p.goal === "loss" ? 12 : 10) : (p.goal === "loss" ? Math.round(e.dose*1.15) : e.dose)});
  const week = Array(7).fill(null);
  const split = p.lifestyle === "road" ? idx.map((_, i) => [["Cab-side circuit","Truck-stop strength","Hotel-room burner"][i % 3], ["lower","push","pull","core","lower","cardio"]]) : SPLITS[days];
  idx.forEach((d, i) => {
    let [name, pats] = split[i % split.length];
    pats = pats.slice(); if (p.goal === "loss" && p.lifestyle !== "road") pats.push("cardio");
    const items = [], used = new Set();
    for (const pat of pats){ let e = take(pat), tries = 0; while (e && used.has(e.id) && tries < 8){ e = take(pat); tries++; } if (e && !used.has(e.id)){ used.add(e.id); items.push(dose(e)); } }
    week[d] = {name, items};
  });
  return week;
}

/* ---------- progressive overload ---------- */
function loadStep(e){ const kg = isUS() ? (e.pattern === "lower" && !e.equip.includes("dumbbells") ? 10 : 5)/LB : (e.pattern === "lower" && !e.equip.includes("dumbbells") ? 5 : 2.5); return kg; }
const roundLoad = kg => { const step = isUS() ? 2.5/LB : 1.25; return Math.round(kg/step)*step; };
function nextFor(exId, target){
  const e = EX[exId], lp = lastPerf(exId);
  if (!lp) return {first:true, load:0, reps:target, text: e.loaded ? "First time: pick a weight you could lift 2–3 more reps with." : ""};
  const s = lp.it.sets, hit = s.every(x => (x.v||0) >= target), near = s.every(x => (x.v||0) >= target - 2), last = s[0].load || 0;
  if (e.loaded && last){
    if (hit){ const n = roundLoad(last + loadStep(e)); return {load:n, reps:target, up:true, text:`Next: ${s.length} × ${target} @ ${loadDisp(n)} ${wUnit()} (up ${fmt1(wDisp(n-last))})`}; }
    if (!near && s.filter(x => (x.v||0) < target - 4).length > s.length/2){ const n = roundLoad(last*0.9); return {load:n, reps:target, text:`Next: ${s.length} × ${target} @ ${loadDisp(n)} ${wUnit()} (lighter to rebuild)`}; }
    return {load:last, reps:target, text:`Next: same ${loadDisp(last)} ${wUnit()}, aim for one more rep per set`};
  }
  if (e.metric === "time") return {load:0, reps: hit ? target + 5 : target, up:hit, text: hit ? `Next: hold ${target + 5} s` : `Next: hold ${target} s`};
  if (hit && target >= 20) return {load:0, reps:target, text:"You've mastered this. Swap in a harder version or add weight."};
  return {load:0, reps: hit ? target + 2 : target, up:hit, text: hit ? `Next: ${target + 2} reps per set` : `Next: ${target} reps per set`};
}
function makeDraft(di){
  makeDraft0(di);
  for (const it of ui.draft.items){ const n = nextFor(it.ex, it.target); it.sug = n.text;
    if (n.up && !EX[it.ex].loaded) it.target = n.reps;
    if (EX[it.ex].loaded && n.load) for (const s of it.sets) s.load = r1(wDisp(n.load)); }
}
function perfText(exId){ const it = ui.draft && ui.draft.items.find(x => x.ex === exId); const base = perfText0(exId); return it && it.sug ? `${base} · ${it.sug}` : base; }

/* ---------- library ---------- */
const lib2 = {q:"", muscle:"all", equip:"all", level:"all", cat:"all", coll:"all", n:48};
const MUSCLES = ["chest","shoulders","triceps","biceps","forearms","lats","middle back","lower back","traps","abdominals","quadriceps","hamstrings","glutes","calves","adductors","abductors","neck"];
function libList(p){
  const q = lib2.q.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean), L = ui.lib;
  const C = (COLLECTIONS.find(c => c[0] === lib2.coll) || COLLECTIONS[0])[2];
  return EXS.filter(e => L.impact.includes(e.impact) && C(e)
    && (lib2.muscle === "all" || (e.prim ? e.prim.includes(lib2.muscle) : e.muscles.toLowerCase().includes(lib2.muscle.replace("quadriceps","quad").replace("abdominals","core"))))
    && (lib2.equip === "all" || (lib2.equip === "mine" ? exAvailable(e, p.equipment) : lib2.equip === "none" ? !e.equip.length : e.equip.includes(lib2.equip)))
    && (lib2.level === "all" || (e.level || "b") === lib2.level)
    && (lib2.cat === "all" || (e.cat || "home") === lib2.cat)
    && (!words.length || words.every(w => (e.name + " " + e.muscles + " " + (e.cat||"")).toLowerCase().includes(w))));
}
function exThumb(e){
  if (e.img) return `<span class="exthumb"><img src="${exImg(e,0)}" alt="" loading="lazy"><img src="${exImg(e,1)}" alt="" loading="lazy">${e.vid ? `<span class="vbadge">${ICON.play} Video</span>` : ""}</span>`;
  if (e.wimg && e.wimg.length) return `<span class="exthumb"><img src="${esc(e.wimg[0].src)}" alt="" loading="lazy">${e.wimg[1] ? `<img src="${esc(e.wimg[1].src)}" alt="" loading="lazy">` : ""}${e.vid ? `<span class="vbadge">${ICON.play} Video</span>` : ""}</span>`;
  return `<span class="exthumb ph sm">${ICON[e.pattern === "cardio" ? "progress" : "workouts"]}<small>${esc(PATTERN[e.pattern])}</small>${e.vid ? `<span class="vbadge">${ICON.play} Video</span>` : ""}</span>`;
}
function demoBlock(e){
  const v = e.vid && e.vid[0];
  const credit = [v ? `Video: ${esc(v.by)} (${esc(v.lic)}) via wger.de` : "", e.img ? "Images: free-exercise-db (public domain)" : e.wimg && e.wimg.length ? `Images: ${esc(e.wimg[0].by)} (${esc(e.wimg[0].lic)}) via wger.de` : ""].filter(Boolean).join(" · ");
  const pics = e.img ? `<img src="${exImg(e,0)}" alt="${esc(e.name)}, start position"><img src="${exImg(e,1)}" alt="${esc(e.name)}, end position">` : e.wimg && e.wimg.length ? e.wimg.map((w, i) => `<img src="${esc(w.src)}" alt="${esc(e.name)}${i ? ", end position" : ""}">`).join("") : "";
  if (!v && !pics) return "";
  return `${v ? `<div class="demo"><video controls playsinline preload="none" ${e.img ? `poster="${exImg(e,0)}"` : ""} src="${esc(v.url)}" onerror="this.closest('.demo').outerHTML='<p class=small>This video format isn\'t supported on this device.</p>'"></video><span class="demotag">Video · ${v.mb} MB</span></div>` : ""}
    ${pics ? `<div class="demo">${pics}<span class="demotag">Demo</span></div>` : ""}${credit ? `<p class="note">${credit}</p>` : ""}`;
}
function V_library(p){
  const L = ui.lib, list = libList(p), shown = list.slice(0, lib2.n);
  const count = c => EXS.filter(c[2]).length;
  return `<div class="colls">${COLLECTIONS.map(c => `<button class="coll" data-act="libColl" data-c="${c[0]}" aria-pressed="${lib2.coll===c[0]}"><b>${c[1]}</b><small>${count(c).toLocaleString()} exercises</small></button>`).join("")}</div>
    <section class="card stack">
    <div class="fsearch">${ICON.search}<input type="search" placeholder="Search ${EXS.length.toLocaleString()} exercises: squat, curl, hamstrings…" value="${esc(lib2.q)}" data-field="libQ" aria-label="Search exercises"></div>
    <div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <label class="f">Muscle<select data-field="libMuscle"><option value="all">All muscles</option>${MUSCLES.map(m => `<option value="${m}" ${lib2.muscle===m?"selected":""}>${m[0].toUpperCase()+m.slice(1)}</option>`).join("")}</select></label>
      <label class="f">Equipment<select data-field="libEquip"><option value="mine" ${lib2.equip==="mine"?"selected":""}>What I have</option><option value="all" ${lib2.equip==="all"?"selected":""}>Any</option><option value="none" ${lib2.equip==="none"?"selected":""}>Bodyweight only</option>${EQUIP.map(q => `<option value="${q.id}" ${lib2.equip===q.id?"selected":""}>${q.label}</option>`).join("")}</select></label>
      <label class="f">Type<select data-field="libCat"><option value="all">All types</option>${Object.entries(CATL).map(([k,v]) => `<option value="${k}" ${lib2.cat===k?"selected":""}>${v}</option>`).join("")}</select></label>
      <label class="f">Level<select data-field="libLevel"><option value="all">All levels</option>${Object.entries(LEVEL).map(([k,v]) => `<option value="${k}" ${lib2.level===k?"selected":""}>${v}</option>`).join("")}</select></label>
      <label class="f">Add to<select id="libAdd" data-field="libAddTo">${DAYS_LONG.map((d,i)=>`<option value="${i}" ${L.addTo==i?"selected":""}>${d}${p.schedule[i]?"":" (rest)"}</option>`).join("")}</select></label></div>
    <div class="row"><span class="eyebrow">Impact</span>${[1,2,3].map(i=>`<button class="chip" data-act="libImpact" data-i="${i}" aria-pressed="${L.impact.includes(i)}">${IMPACT[i][0]}</button>`).join("")}<span class="spacer"></span><span class="small muted">${list.length.toLocaleString()} exercises${EXLOADED ? "" : " · loading gym library…"}</span></div></section>
    <div class="exgrid">${shown.map(e => `<div class="ex"><button class="exopen" data-act="exInfo" data-id="${esc(e.id)}" aria-label="How to do ${esc(e.name)}">${exThumb(e)}</button>
      <div class="row"><h3 style="flex:1">${esc(e.name)}</h3><span class="pill ${IMPACT[e.impact][1]}">${IMPACT[e.impact][0]}</span></div>
      <div class="row" style="gap:6px"><span class="tag">${PATTERN[e.pattern]}</span><span class="tag">${esc(equipLabel(e))}</span>${e.level ? `<span class="tag">${LEVEL[e.level]}</span>` : ""}</div>
      <p class="small"><b>${esc(e.muscles)}</b></p>
      <div class="foot"><button class="btn sm" data-act="exInfo" data-id="${esc(e.id)}">${ICON.play} How to</button><button class="btn sm" data-act="addEx" data-id="${esc(e.id)}">${ICON.plus} ${DAYS[L.addTo]}</button></div></div>`).join("") || `<p class="empty">No exercises match. Try "Any" equipment or fewer filters.</p>`}</div>
    ${list.length > shown.length ? `<button class="btn" data-act="libMore" style="align-self:center">Show more (${(list.length - shown.length).toLocaleString()} left)</button>` : ""}`;
}
A.libMore = () => { lib2.n += 48; render(); };
A.libColl = el => { lib2.coll = el.dataset.c; lib2.n = 48; render(); };
const libRerender = debounce(() => { lib2.n = 48; const a = document.activeElement, pos = a && a.selectionStart; render(); const el = $('[data-field="libQ"]'); if (el && a && a.dataset && a.dataset.field === "libQ"){ el.focus(); try { el.setSelectionRange(pos, pos); } catch {} } }, 250);
document.addEventListener("input", e => { const el = e.target; if (el.dataset && el.dataset.field === "libQ"){ lib2.q = el.value; libRerender(); } });
document.addEventListener("change", e => { const el = e.target, f = el.dataset && el.dataset.field; const m = {libMuscle:"muscle", libEquip:"equip", libCat:"cat", libLevel:"level"}[f]; if (m){ lib2[m] = el.value; lib2.n = 48; render(); } });
SHEETS.ex = d => {
  const e = EX[d.id], lp = lastPerf(e.id);
  return {title: e.name, wide:true, body:`<div class="stack">
    ${demoBlock(e)}
    <div class="row" style="gap:6px"><span class="pill ${IMPACT[e.impact][1]}">${IMPACT[e.impact][0]} impact</span><span class="tag">${PATTERN[e.pattern]}</span><span class="tag">${esc(equipLabel(e))}</span>${e.level ? `<span class="tag">${LEVEL[e.level]}</span>` : ""}${e.cat ? `<span class="tag">${CATL[e.cat] || e.cat}</span>` : ""}</div>
    <p><b>Works:</b> ${esc(e.muscles)}</p>
    ${e.ins && e.ins.length ? `<ol class="steps">${e.ins.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : `<p>${esc(e.cue)}</p>`}
    <p class="small muted">${esc(lp ? perfText0(e.id) : "No history yet.")} · Suggested: 3 × ${e.dose}${e.metric === "time" ? " s" : " reps"}</p>
    <div class="row"><select data-field="libAddTo" style="width:auto">${DAYS_LONG.map((x,i) => `<option value="${i}" ${ui.lib.addTo==i?"selected":""}>${x}${state.profile.schedule[i]?"":" (rest)"}</option>`).join("")}</select><button class="btn primary" data-act="addEx" data-id="${esc(e.id)}">${ICON.plus} Add to workout</button></div>
    <p class="note">Move with control and stop if anything hurts.</p></div>`};
};
A.exInfo = el => openSheet("ex", {id: el.dataset.id});
const _addEx = A.addEx; A.addEx = el => { _addEx(el); if (sheet.open && sheet.view === "ex") closeSheet(); };

const WO_TABS = [["schedule","Schedule"],["library","Exercises"],["videos","Coach videos"],["log","Log session"]];
const woSeg = () => `<div class="seg" role="group" aria-label="Workout section">${WO_TABS.map(([id,l])=>`<button data-act="woTab" data-tab="${id}" aria-pressed="${ui.woTab===id}">${l}</button>`).join("")}</div>`;
function V_workouts(){
  const p = state.profile;
  if (ui.woTab !== "library" && ui.woTab !== "videos") return V_workouts0().replace(/<div class="seg" role="group" aria-label="Workout section">[\s\S]*?<\/div><\/div>/, woSeg() + "</div>");
  return `<div class="pagehead"><div><h1>Train</h1><p class="sub">${ui.woTab === "videos" ? "Exercise demos from Rep &amp; Ration coaches" : `${EXS.length.toLocaleString()} exercises with how-to steps`} · ${p.schedule.filter(Boolean).length} training days this week</p></div>${woSeg()}</div>${ui.woTab === "videos" ? V_videos() : V_library(p)}`;
}
