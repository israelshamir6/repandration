/* ======================================================================
   Eating out: restaurant menu scanner, chain restaurant menus from around the world,
   and "why it's good for you" health notes on every meal and recipe.
   ====================================================================== */
const BENEFIT = [
  ["salmon sardines cansalmon", "Omega-3 fats for heart and brain health"],
  ["tuna tunapouch cod tilapia shrimp scallops", "Lean seafood protein, low in saturated fat"],
  ["spinach kale collards greens romaine bokchoy", "Leafy greens: vitamin K, folate and iron"],
  ["broccoli brussels cauliflower caulirice cabbage", "Cruciferous veggies: fiber and vitamin C"],
  ["blueberries strawberries raspberries blackberries frozberries cherries", "Berries: antioxidants and vitamin C"],
  ["blackbeans lentils chickpeas kidneybeans pinto blackeyed refried chickpeapasta", "Beans and lentils: plant protein and gut-friendly fiber"],
  ["oats steelcut barley oatcup", "Oats and barley: beta-glucan fiber that helps lower cholesterol"],
  ["yogurt kefir skyr gyogcup cottage", "Protein and calcium; yogurt and kefir add probiotics"],
  ["egg eggwhite hbegg2 eggbites", "Eggs: complete protein and choline for brain health"],
  ["sweetpotato carrots babycarrots butternut", "Beta-carotene (vitamin A) for eyes and immunity"],
  ["banana potato avocado plantain", "Potassium, which helps keep blood pressure in check"],
  ["almonds walnuts chia flax pepitas sunflower pistachios cashews nutpack", "Nuts and seeds: healthy fats, magnesium and fiber"],
  ["oil olives", "Olive oil: heart-healthy monounsaturated fats"],
  ["orange grapefruit clementine kiwi pepper mango pineapple", "Vitamin C for immunity and iron absorption"],
  ["tofu tempeh edamame soymilk", "Soy: complete plant protein"],
  ["quinoa brownrice farro", "Whole grains: steady energy and B vitamins"],
  ["chicken chickthigh turkey groundchicken rotisserie turkeydeli", "Lean protein that protects muscle"],
  ["beef beef95 sirloin bison lamb", "Iron, zinc and vitamin B12"],
  ["milk skim wholemilk cheddar swiss mozz parmesan feta string", "Calcium and vitamin D for bones"],
  ["mushrooms", "Mushrooms: B vitamins and selenium"],
  ["tomato cherrytom marinara", "Tomatoes: lycopene, an antioxidant"],
  ["beets", "Beets: natural nitrates that support blood flow"],
  ["dates raisins", "Quick natural energy plus potassium"],
  ["asparagus zucchini cucumber greenbeans peas corn mixedveg celery onion", "Vegetables: fiber and micronutrients for few calories"],
  ["whey plantprotein rtdshake", "Fast protein for muscle recovery"],
  ["apple pear peach grapes watermelon cantaloupe fruitcup", "Fruit: fiber, water and vitamins"]
].map(([ids, text]) => [new Set(ids.split(" ")), text]);
function benefitsOf(items){
  const ids = items.map(i => Array.isArray(i) ? i[0] : i), out = [];
  for (const [set, text] of BENEFIT) if (ids.some(id => set.has(id)) && out.length < 3) out.push(text);
  const t = mealTotals(items.filter(i => Array.isArray(i) && FOOD[i[0]]));
  const badges = [];
  if (t.p >= 30) badges.push("High protein"); else if (t.p >= 20) badges.push("Good protein");
  if (t.kcal && t.as <= 3) badges.push("Low added sugar");
  if (t.kcal && (t.c*4)/t.kcal <= 0.15) badges.push("Low carb");
  if (items.some(i => FOOD[Array.isArray(i) ? i[0] : i] && FOOD[Array.isArray(i) ? i[0] : i].cat === "produce")) badges.push("Has veggies or fruit");
  return {out, badges};
}
function benefitHTML(items){ const b = benefitsOf(items); if (!b.out.length && !b.badges.length) return "";
  return `<div class="benefits">${b.badges.map(x => `<span class="bpill">${x}</span>`).join("")}${b.out.length ? `<ul>${b.out.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>`; }
function mealCard(m, di, mi, logged){ return mealCard0(m, di, mi, logged).replace("</h3>", "</h3>" + benefitHTML(m.items)); }

/* ---------- menu scanner ---------- */
const dine = {res:null, busy:false, err:"", restaurant:"", chains:{}, chainQ:"", country:"United States", chain:null, chainBusy:false};
SHEETS.menu = () => {
  if (dine.busy) return {title:"Reading the menu…", body:`<div class="loading"><span class="spin"></span> Finding your best picks…</div>`};
  const r = dine.res;
  if (r) return {title: r.restaurant ? `Best picks at ${r.restaurant}` : "Your best picks", wide:true, body:`<div class="stack">
    ${(r.best || []).map((it,i) => menuItemRow(it, i, "best")).join("") || `<p class="empty">No items found.</p>`}
    ${(r.skip || []).length ? `<div><span class="eyebrow">Skip these today</span><ul class="small">${r.skip.map(s => `<li><b>${esc(s.name)}</b>: ${esc(s.why || "")}</li>`).join("")}</ul></div>` : ""}
    ${r.tip ? `<p class="small"><b>Tip:</b> ${esc(r.tip)}</p>` : ""}${mealChips()}
    <p class="note">Numbers come from published restaurant nutrition when known, otherwise estimates. Portions vary by location.</p>
    <button class="btn" data-act="menuAgain">Scan another menu</button></div>`};
  return {title:"Restaurant menu scanner", body:`<div class="stack"><p class="muted">Snap the menu (or type the restaurant) and we'll pick what fits your calories, protein, diet and allergies today.</p>
    <label class="btn primary" style="position:relative">${ICON.camera} Photograph the menu<input type="file" accept="image/*" capture="environment" data-field="menuPhoto" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
    <form class="row" data-form="menuName"><input id="menuName" type="text" placeholder="Or type a restaurant, e.g. Chipotle, Nando's, Jollibee" style="flex:1;min-width:200px" value="${esc(dine.restaurant)}"><button class="btn">Find picks</button></form>
    ${dine.err ? `<p class="small" style="color:var(--bad)">${esc(dine.err)}</p>` : ""}</div>`};
};
SHEETS.menu.onClose = () => { dine.res = null; dine.err = ""; };
function menuItemRow(it, i, group){
  return `<div class="meal"><div class="row"><h3 style="flex:1">${esc(it.name)}</h3><span class="num" style="font-weight:700">${fmt(it.kcal || 0)} kcal</span></div>
    <div class="macroline num"><span><b>${fmt(it.protein||0)}</b> P</span><span><b>${fmt(it.carbs||0)}</b> C</span><span><b>${fmt(it.fat||0)}</b> F</span>${it.sodium ? `<span>${fmt(it.sodium)} mg sodium</span>` : ""}${it.est ? `<span class="srcpill">estimate</span>` : ""}</div>
    ${it.why ? `<p class="small">${esc(it.why)}</p>` : ""}${it.swap ? `<p class="small muted">Make it better: ${esc(it.swap)}</p>` : ""}
    <button class="btn sm" data-act="dineLog" data-g="${group}" data-i="${i}" style="align-self:flex-start">${ICON.plus} Log it</button></div>`;
}
function leftToday(){ const c = calc(state.profile), t = dayTotals(todayKey()); return {kcal: Math.max(0, c.target - t.kcal), protein: Math.max(0, c.protein - t.p)}; }
async function runMenu(payload){
  dine.busy = true; dine.err = ""; sheetRender();
  try { dine.res = await api("food/menu", Object.assign({left: leftToday(), diet: (DIETS.find(d => d[0] === state.profile.diet) || ["",""])[1] + (state.profile.faith && state.profile.faith !== "none" ? `, ${FAITHS[state.profile.faith][0]}` : ""), avoid: [...blockedSet(state.profile)].map(x => EXCL_LABEL[x] || x)}, payload)); }
  catch (e){ dine.err = e.message; }
  dine.busy = false; sheetRender();
}
A.menuScan = () => { if (!premiumGate("Restaurant menu scanner")) return; dine.res = null; fs.meal = slotNow(); openSheet("menu"); };
A.menuAgain = () => { dine.res = null; sheetRender(); };
document.addEventListener("change", async e => { const el = e.target; if (el.dataset && el.dataset.field === "menuPhoto" && el.files[0]){ try { runMenu({image: await shrinkImage(el.files[0], 1400)}); } catch { toast("Couldn't read that photo."); } } });
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="menuName"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation(); const n = $("#menuName").value.trim(); if (!n) return; dine.restaurant = n; runMenu({restaurant:n}); }, true);
A.dineLog = el => {
  const src = el.dataset.g === "best" ? dine.res.best : el.dataset.g === "chain" ? dine.chain.items : [];
  const it = src[+el.dataset.i]; if (!it) return;
  const where = el.dataset.g === "chain" ? dine.chain.chain : (dine.res && dine.res.restaurant) || "Restaurant";
  (state.food.log[ui.nutDate] ||= []).push({id:uid(), food:null, name:`${it.name} (${where})`, serv:it.portion || "1 serving", q:1, meal:fs.meal || slotNow(), kcal:+it.kcal||0, p:+it.protein||0, c:+it.carbs||0, f:+it.fat||0, s:+it.sugar||0, as:0, na:+it.sodium||0, src:"Restaurant"});
  persist("food"); postStatsSoon(); toast(`Logged ${it.name}`); render();
};

/* ---------- chain restaurants from around the world ---------- */
const CHAINS = {
  "United States":["McDonald's","Chick-fil-A","Chipotle","Subway","Taco Bell","Wendy's","Burger King","Starbucks","Panera Bread","Panda Express","Domino's","Pizza Hut","Popeyes","KFC","Sonic","Arby's","Dunkin'","Jack in the Box","Five Guys","Raising Cane's","Wingstop","Jersey Mike's","Culver's","Whataburger","Zaxby's","In-N-Out Burger","Qdoba","Sweetgreen","Cava","Noodles & Company","Olive Garden","Applebee's","Chili's","Texas Roadhouse","Buffalo Wild Wings","Cracker Barrel","IHOP","Denny's","Waffle House","Red Lobster","Outback Steakhouse","P.F. Chang's","The Cheesecake Factory","Shake Shack","Firehouse Subs","Jimmy John's","Papa John's","Little Caesars","Moe's Southwest Grill","El Pollo Loco","Del Taco","Bojangles","Church's Texas Chicken","Hardee's","Carl's Jr.","Tropical Smoothie Cafe","Smoothie King","Jamba","Love's Travel Stops","Pilot Flying J","TA Petro","Buc-ee's","Wawa","Sheetz","QuikTrip","7-Eleven","Casey's","Costco Food Court","Walmart Deli"],
  "Canada":["Tim Hortons","A&W Canada","Harvey's","Mary Brown's","Swiss Chalet","St-Hubert","Freshii","Mucho Burrito","Pizza Pizza"],
  "Mexico & Latin America":["El Pollo Loco","Pollo Campero","Oxxo","Vips","Sanborns","Bembos","Giraffas"],
  "United Kingdom & Ireland":["Greggs","Pret A Manger","Nando's","Wagamama","Leon","Itsu","Wasabi","Costa Coffee","Pizza Express","Harvester","Wetherspoon","Supermac's"],
  "Europe":["Vapiano","Telepizza","100 Montaditos","Nordsee","Max Burgers","Hesburger","Quick","Paul","Le Pain Quotidien","Bagel Brothers"],
  "Asia":["Jollibee","Mang Inasal","CoCo Ichibanya","Yoshinoya","Sukiya","MOS Burger","Lotteria","Din Tai Fung","Haidilao","Ajisen Ramen","Old Chang Kee","Chowking","Saravana Bhavan","Haldiram's","Wow! Momo","Goli Vada Pav"],
  "Middle East & Africa":["Al Baik","Shawarma House","Kudu","Chicken Licken","Steers","Nando's South Africa","Galito's","Debonairs Pizza","Wimpy"],
  "Australia & New Zealand":["Guzman y Gomez","Red Rooster","Oporto","Grill'd","Zambrero","Hungry Jack's","Boost Juice","Sushi Hub"]
};
function V_eatout(){
  const regions = Object.keys(CHAINS), q = dine.chainQ.trim().toLowerCase();
  const list = regions.flatMap(r => CHAINS[r].map(n => [n, r])).filter(([n]) => !q || n.toLowerCase().includes(q));
  return `<div class="pagehead"><div><h1>Eat out</h1><p class="sub">Menus, calories and healthier picks from restaurants around the world</p></div><button class="btn primary" data-act="menuScan">${ICON.camera} Scan a menu</button></div>
    ${dine.chain ? chainView() : `<section class="card stack"><div class="fsearch">${ICON.search}<input type="search" placeholder="Search any restaurant chain, anywhere" value="${esc(dine.chainQ)}" data-field="chainQ"></div>
      <div class="row"><label class="f" style="width:240px">Country<select data-field="chainCountry">${["United States","Canada","Mexico","United Kingdom","Ireland","France","Germany","Spain","Italy","Netherlands","Sweden","Philippines","Japan","South Korea","China","Singapore","India","Saudi Arabia","United Arab Emirates","South Africa","Nigeria","Australia","New Zealand","Brazil","Peru"].map(c => `<option ${dine.country===c?"selected":""}>${c}</option>`).join("")}</select></label>
      ${q && !list.some(([n]) => n.toLowerCase() === q) ? `<button class="btn sm" data-act="chainOpen" data-n="${esc(dine.chainQ)}">Look up "${esc(dine.chainQ)}"</button>` : ""}</div></section>
      ${regions.map(r => { const items = CHAINS[r].filter(n => !q || n.toLowerCase().includes(q)); return items.length ? `<section class="card stack"><h2>${r}</h2><div class="chips">${items.map(n => `<button class="chip" data-act="chainOpen" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div></section>` : ""; }).join("")}
      <p class="note">Menus come from each chain's published nutrition where available; items marked "estimate" are approximate. Chain names belong to their owners; Rep &amp; Ration isn't affiliated with them.</p>`}`;
}
function chainView(){
  const c = dine.chain;
  if (dine.chainBusy) return `<section class="card"><div class="loading"><span class="spin"></span> Loading the ${esc(c.chain || "")} menu…</div></section>`;
  if (!c.items || !c.items.length) return `<section class="card stack"><p class="muted">We couldn't find a menu for that restaurant. Try the menu scanner instead.</p><button class="btn" data-act="chainBack">Back</button></section>`;
  const left = leftToday(), sorted = c.items.map((it, i) => ({it, i, fit: Math.abs((+it.kcal||0) - Math.min(left.kcal, 800)) - (+it.protein||0)*6})).sort((a,b) => a.fit - b.fit);
  return `<section class="card stack"><div class="row"><div style="flex:1"><span class="eyebrow">${esc(c.cuisine || "Restaurant")} · ${esc(c.country || dine.country)}</span><h2>${esc(c.chain)}</h2><p class="small muted">Sorted by best fit for your ${fmt(left.kcal)} kcal and ${fmt(left.protein)} g protein left today.</p></div><button class="btn sm" data-act="chainBack">All restaurants</button></div></section>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${sorted.map(({it, i}) => menuItemRow(it, i, "chain")).join("")}</div>`;
}
RENDER.eatout = () => V_eatout();
VIEWS.splice(VIEWS.findIndex(v => v.id === "progress"), 0, {id:"eatout", label:"Eat out"});
ICON.eatout = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11"/></svg>';
A.chainOpen = async el => {
  if (!premiumGate("Restaurant menus")) return;
  dine.chain = {chain: el.dataset.n, items:[]}; dine.chainBusy = true; render(); window.scrollTo(0, 0);
  try { const j = await api("food/chain", {name: el.dataset.n, country: dine.country}); dine.chain = Object.assign({chain: el.dataset.n}, j); } catch (e){ toast(e.message); dine.chain = null; }
  dine.chainBusy = false; render();
};
A.chainBack = () => { dine.chain = null; render(); };
document.addEventListener("input", e => { const el = e.target; if (el.dataset && el.dataset.field === "chainQ"){ dine.chainQ = el.value; clearTimeout(dine.t); dine.t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('[data-field="chainQ"]'); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }, 250); } });
document.addEventListener("change", e => { const el = e.target; if (el.dataset && el.dataset.field === "chainCountry"){ dine.country = el.value; } });
