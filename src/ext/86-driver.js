/* ======================================================================
   Truck drivers: route type (OTR, regional, local, team) and cab gear shape the menu.
   Local drivers eat road meals by day and a home-cooked dinner; drivers with a fridge,
   microwave or 12V cooker also get meals prepped at home and kept or heated in the truck.
   ====================================================================== */
F("chxpouch","Chicken breast pouch","2.6 oz pouch","road",90,17,0,2,0,0,["chicken"]);
F("ricecup","Microwavable brown rice cup","1 cup","road",210,4,42,2,0,0,[]);
F("quinoacup","Microwavable quinoa cup","1 cup","road",200,7,34,4,1,0,[]);
F("salmonpouch","Salmon pouch","2.5 oz pouch","road",70,13,0,2,0,0,["fish"]);
F("beanscup","Black beans, microwavable cup","1/2 cup","road",110,7,20,0.5,0,0,[]);
const GT = (id, slot, need, name, items, steps) => TEMPLATES.push(Object.assign(T(id, slot, "road", name, items, steps), {road:true, need}));
GT("g1","Breakfast",["fridge","heat"],"Cab-cooker egg white scramble",[["eggwhite",1.5],["salsa",1],["corntort",2],["string",1]],["Pour egg whites into your lunchbox cooker or a microwave-safe bowl; heat 2–3 minutes, stirring once.","Fold into warm tortillas with salsa and string cheese."]);
GT("g2","Breakfast",["fridge"],"Overnight oats jar",[["oats",0.75],["milk",1],["chia",1],["frozberries",0.5]],["Before bed, stir oats, milk, chia and berries in a jar; keep it in the fridge.","Grab it in the morning: no cooking."]);
GT("g3","Breakfast",["fridge","blender"],"Cab blender protein shake",[["whey",1],["banana",1],["milk",1],["pb",0.5]],["Blend everything with a few ice cubes on your inverter blender.","Rinse the cup right away so it's ready tomorrow."]);
GT("g4","Lunch",["heat"],"Chicken & rice cooker bowl",[["chxpouch",1.5],["ricecup",1],["beanscup",1],["salsa",1]],["Heat the rice and bean cups (microwave 90 seconds or lunchbox cooker 20 minutes).","Stir in the chicken pouches and salsa. Everything here is shelf-stable."]);
GT("g5","Lunch",["fridge"],"Turkey roll-up box",[["turkeydeli",1.5],["string",1],["babycarrots",1],["apple",1]],["Roll turkey slices around string cheese.","Carrots and an apple on the side."]);
GT("g6","Dinner",["fridge","heat"],"Home-prepped chicken, sweet potato & broccoli",[["chicken",1],["sweetpotato",1],["broccoli",1]],["Cook a batch at home before your run: bake chicken and sweet potatoes, steam broccoli.","Pack in containers; keep cold and eat within 4 days. Reheat in the microwave or cooker."]);
GT("g7","Dinner",["heat"],"Salmon & quinoa cooker bowl",[["salmonpouch",2],["quinoacup",1],["greenbeans",0.75]],["Heat the quinoa cup and canned green beans.","Top with the salmon pouches and a squeeze of lemon."]);
GT("g8","Dinner",["fridge","heat"],"Home-made turkey chili jar",[["turkey",1],["kidneybeans",0.75],["tomato",1],["onion",0.25],["cheddar",0.5]],["Make a pot at home with ground turkey, beans, tomato, onion and chili powder.","Portion into jars; keep cold up to 4 days and reheat in the truck."]);
GT("g9","Snack",["fridge"],"Cottage cheese & berries",[["cottage",0.5],["frozberries",0.5]],["Frozen berries thaw in the fridge overnight and keep the cottage cheese cold."]);
GT("g10","Snack",["fridge"],"Greek yogurt & almonds",[["gyogcup",1],["almonds",0.5]],["Keep yogurt cups in the fridge; almonds in the door pocket."]);
GT("g11","Lunch",["heat"],"Tuna, beans & rice bowl",[["tunapouch",2],["ricecup",1],["beanscup",1]],["Heat the rice and beans; stir in the tuna with hot sauce or mustard."]);

const _mealPoolForD = mealPoolFor;
mealPoolFor = (slot, p, rules) => {
  const dr = p.driver;
  // local drivers are home for dinner
  if (dr && dr.route === "local" && slot === "Dinner" && p.lifestyle === "road") return _mealPoolForD(slot, Object.assign({}, p, {lifestyle:"standard"}), rules);
  let pool = _mealPoolForD(slot, p, rules);
  const gear = new Set((dr && dr.gear) || []), fit = pool.filter(t => !t.need || t.need.every(g => gear.has(g)));
  return fit.length ? fit : pool.filter(t => !t.need).length ? pool.filter(t => !t.need) : pool;
};

/* Today: a driver card with the medical-card countdown */
const _roadCardD = roadCard;
roadCard = () => {
  const p = state.profile, dr = p.driver || {}, d = dotState(), days = d.certExpires ? Math.ceil((pkey(d.certExpires) - new Date())/864e5) : null;
  const dot = days == null ? `<button class="btn sm" data-act="nav" data-view="dot">Set up DOT physical prep</button>`
    : `<div class="drvdot ${days <= 45 ? "soon" : ""}"><div><span class="eyebrow">DOT medical card</span><b>${days < 0 ? `Expired ${-days} days ago` : `${days} days left`}</b></div><button class="btn sm" data-act="nav" data-view="dot">Open DOT prep</button></div>`;
  const gear = dr.gear || [], note = dr.route === "local" ? "Road meals by day and a home-cooked dinner at night." : gear.length ? `Truck-stop picks plus meals you prep at home and ${gear.includes("heat") ? "heat" : "keep cold"} in the truck.` : "";
  let html = _roadCardD();
  if (note) html = html.replace(/<p class="small muted">Today's meals are all things[^<]*<\/p>/, `<p class="small muted">${note}</p>`);
  return html.replace('</section>', `${dot}</section>`);
};

/* Profile: driver setup can be changed any time */
function driverCard(){
  const p = state.profile; if (p.lifestyle !== "road") return "";
  const dr = p.driver ||= {route:"otr", gear:[]};
  return `<section class="card stack"><h2>Truck driver setup</h2>
    <label class="f">Route<select data-field="drvRoute">${Object.entries(ROUTES).map(([k,[t]]) => `<option value="${k}" ${dr.route === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <div><span class="eyebrow">In your cab</span><div class="chips" style="margin-top:8px">${CAB_GEAR.map(([k,l]) => `<button class="chip" data-act="drvGear" data-id="${k}" aria-pressed="${(dr.gear || []).includes(k)}">${l}</button>`).join("")}</div></div>
    <p class="small muted">Menus use truck-stop picks${(dr.gear || []).length ? " plus meals you prep at home and keep or heat in the truck" : ""}${dr.route === "local" ? ", with dinner at home" : ""}.</p></section>`;
}
A.drvGear = el => { const dr = state.profile.driver ||= {route:"otr", gear:[]}, g = dr.gear ||= [], i = g.indexOf(el.dataset.id); if (i >= 0) g.splice(i,1); else g.push(el.dataset.id); state.profile.planSeed++; persist("profile"); render(); toast("Menus updated for your cab"); };
document.addEventListener("change", e => { const el = e.target; if (!(el.dataset && el.dataset.field === "drvRoute")) return; (state.profile.driver ||= {route:"otr", gear:[]}).route = el.value; state.profile.planSeed++; persist("profile"); render(); toast("Menus updated for your route"); });
const _profileExtrasD = profileExtras;
profileExtras = () => _profileExtrasD().replace('<section class="card stack"><h2>Reminders & app</h2>', driverCard() + '<section class="card stack"><h2>Reminders & app</h2>');
