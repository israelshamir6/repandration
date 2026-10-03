/* ======================================================================
   Eating your way: faith & cultural eating, budget meal plans with cost per meal,
   household scaling (family plan), shift-worker & trucker mode, and "shop your plan".
   ====================================================================== */
const F = (id,name,serv,cat,kcal,p,c,f,s,as,tags=[]) => { const o = {id,name,serv,cat,kcal,p,c,f,s,as,oz:0,tags}; FOODS.push(o); FOOD[id] = o; return o; };
// road & convenience foods (generic values rounded from USDA FoodData Central)
F("hbegg2","Hard-boiled eggs, 2-pack","1 pack","road",140,12.6,1,9.6,1,0,["eggs"]);
F("gyogcup","Greek yogurt cup, nonfat plain","5.3 oz cup","road",80,14,6,0,4,0,["dairy"]);
F("rtdshake","Protein shake, ready-to-drink","11 oz bottle","road",160,30,5,3,1,0,["dairy"]);
F("tunapouch","Tuna pouch","2.6 oz pouch","road",70,17,0,0.5,0,0,["fish"]);
F("nutpack","Mixed nuts, salted","1 oz pack","road",170,5,6,15,1,0,["nuts"]);
F("deliwrap","Turkey & cheese wrap, deli case","1 wrap","road",450,28,40,19,4,1,["turkey","dairy","gluten"]);
F("chxsalad","Grilled chicken salad with light dressing","1 container","road",300,30,12,15,5,1,["chicken"]);
F("chili","Chili with beans","1 cup","road",260,17,24,11,5,1,["beef"]);
F("oatcup","Oatmeal cup, plain (add hot water)","1 cup","road",160,5,28,3,1,0,[]);
F("pbcrackers","Peanut butter crackers","6-cracker pack","road",200,5,22,10,4,4,["nuts","gluten"]);
F("babycarrots","Baby carrots, snack bag","3 oz bag","road",30,0.5,7,0,4,0,[]);
F("hummuscup","Hummus snack cup","2 oz cup","road",140,4,9,10,0,0,[]);
F("fruitcup","Fruit cup in juice","4 oz cup","road",60,0,15,0,13,0,[]);
F("eggbites","Egg white bites (coffee-shop style)","2 bites","road",170,12,11,8,2,0,["eggs","dairy"]);
F("bfsandwich","Egg & cheese breakfast sandwich","1 sandwich","road",330,17,29,16,3,2,["eggs","dairy","gluten"]);
F("frozenbowl","Frozen chicken & rice bowl","1 bowl","road",330,20,45,8,5,2,["chicken"]);
F("sparkling","Sparkling water, unsweetened","12 oz can","road",0,0,0,0,0,0,[]);
// world-kitchen staples
F("collards","Collard greens, cooked","1 cup","produce",63,5,11,1,0.8,0,[]);
F("blackeyed","Black-eyed peas, cooked","1/2 cup","grains",100,7,18,0.5,3,0,[]);
F("plantain","Plantain, baked","1/2 medium","produce",110,1,29,0.3,13,0,[]);
F("roti","Whole wheat roti","1 (40 g)","grains",120,4,18,3.7,0.5,0,["gluten"]);
F("cornbread","Cornbread","1 piece (2.5 in)","grains",198,4,28,7,6,4,["eggs","dairy","gluten"]);
F("cabbage","Cabbage, cooked","1 cup","produce",34,1.9,8,0.1,4,0,[]);
F("bokchoy","Bok choy, cooked","1 cup","produce",20,2.7,3,0.3,1.4,0,[]);
F("basmati","Basmati rice, cooked","1 cup","grains",210,4.4,46,0.5,0,0,[]);
F("paneer","Paneer","2 oz","dairy",180,11,2,14,1,0,["dairy"]);
F("teriyaki","Teriyaki sauce, low sodium","1 tbsp","pantry",16,1,3,0,2.5,2.5,["soy","gluten"]);
for (const id of ["beer","wine"]) if (FOOD[id]) FOOD[id].tags.push("alcohol");
for (const id of ["coffee","latte","energydrink","soda"]) if (FOOD[id]) FOOD[id].tags.push("caffeine");
const DANIEL_NO = "whitebread whiterice spaghetti couscous flourtort bagel ricenoodles pancakes waffles instantoat cheerios pretzels honey maple jam soda energydrink sportsdrink coffee latte protbar granola darkchoc fries chips donut cookie icecream granolabar beer wine teriyaki pbcrackers cornbread ketchup bbq ranch mayo basmati friedrice ramen".split(" ");
for (const id of DANIEL_NO) if (FOOD[id]) FOOD[id].tags.push("danielno");
for (const f of FOODS) if (f.as > 1 && !f.tags.includes("danielno")) f.tags.push("danielno");
CATS.road = "Grab & go";

SOURCES.world = {name:"Rep & Ration world kitchen", short:"World", url:"/support.html#menus", why:"Traditional dishes from Black American, Latin, Caribbean, South Asian, East Asian, Middle Eastern and West African kitchens, portioned to your targets.", badge:"World kitchen"};
SOURCES.road = {name:"No-kitchen picks", short:"No kitchen", url:"/support.html#road", why:"Built from what truck stops, gas stations, delis and hotel lobbies carry. No stove needed: a cooler and hot water at most.", badge:"No kitchen needed"};
const RT = (id,slot,name,items,steps) => TEMPLATES.push(Object.assign(T(id,slot,"road",name,items,steps), {road:true}));
RT("r1","Breakfast","Truck-stop protein breakfast",[["hbegg2",1],["gyogcup",1],["banana",1],["coffee",1]],["Grab eggs and yogurt from the cooler case, a banana from the fruit basket.","Black coffee, or add milk instead of flavored creamer."]);
RT("r2","Breakfast","Breakfast sandwich & fruit cup",[["bfsandwich",1],["fruitcup",1],["coffee",1]],["Pick an egg & cheese sandwich over sausage or biscuit versions.","Fruit cup in juice, not syrup."]);
RT("r3","Breakfast","Cab oatmeal & shake",[["oatcup",1],["rtdshake",1],["banana",0.5]],["Add hot water from the coffee station to the oatmeal cup; let it sit 2 minutes.","Drink the protein shake alongside."]);
RT("r4","Breakfast","Egg bites & yogurt",[["eggbites",1],["gyogcup",1],["coffee",1]],["Order egg white bites at the coffee counter.","Add a plain Greek yogurt from the cooler."]);
RT("r5","Lunch","Deli chicken salad & eggs",[["chxsalad",1],["hbegg2",1],["sparkling",1]],["Choose a grilled (not crispy) chicken salad; use half the dressing.","Add a 2-pack of eggs for extra protein."]);
RT("r6","Lunch","Turkey wrap & apple",[["deliwrap",1],["apple",1],["sparkling",1]],["Grab a turkey & cheese wrap from the deli case.","Apple from the fruit basket; water or sparkling water to drink."]);
RT("r7","Lunch","Cooler tuna plate",[["tunapouch",2],["crackers",1],["babycarrots",1],["string",1]],["Tuna pouches need no can opener; mix with a little mustard if you like.","Eat on whole-grain crackers with carrots and string cheese."]);
RT("r8","Lunch","Rotisserie chicken plate",[["rotisserie",1.25],["babycarrots",1],["hummuscup",1],["apple",1]],["Many travel centers and grocery stores sell rotisserie chicken; skip the skin.","Carrots and hummus on the side; save leftovers in your cooler."]);
RT("r9","Dinner","Microwave chicken bowl & yogurt",[["frozenbowl",1],["babycarrots",1],["gyogcup",1]],["Heat a single-serve chicken & rice bowl in the truck-stop or cab microwave.","Carrots and a Greek yogurt round it out."]);
RT("r10","Dinner","Chili, cheese & crackers",[["chili",1.25],["string",1],["crackers",1]],["A cup of chili with beans from the hot case or a microwavable can.","Crumble crackers on top; string cheese on the side."]);
RT("r11","Dinner","Turkey sub & fruit",[["sub",1],["apple",1],["sparkling",1]],["Order a 6-inch turkey sub on wheat with extra veggies and mustard instead of mayo.","Fruit and water instead of chips and soda."]);
RT("r12","Dinner","Rotisserie chicken & hummus wrap",[["rotisserie",1.25],["pita",1],["hummuscup",1],["babycarrots",1]],["Pull chicken into a pita with hummus.","Carrots on the side."]);
RT("r13","Snack","Jerky & cheese",[["jerky",1],["string",1]],["A shelf-stable protein snack for the cab."]);
RT("r14","Snack","Shake & nuts",[["rtdshake",1],["nutpack",0.5]],["Half a pack of nuts; save the rest for later."]);
RT("r15","Snack","Yogurt & fruit cup",[["gyogcup",1],["fruitcup",1]],["Stir the fruit into the yogurt."]);
RT("r16","Snack","Peanut butter crackers & apple",[["pbcrackers",1],["apple",1]],["Easy to keep in the door pocket."]);
RT("r17","Snack","Carrots & hummus cup",[["babycarrots",1],["hummuscup",1]],["Crunchy, filling and no prep."]);
const WT = (id,slot,name,items,steps) => TEMPLATES.push(T(id,slot,"world",name,items,steps));
WT("w1","Dinner","Baked chicken, collards & black-eyed peas",[["chickthigh",1],["collards",1],["blackeyed",1],["cornbread",0.5]],["Season chicken with paprika, garlic and onion powder; bake at 425°F for 25 minutes.","Simmer collards with garlic, onion and a splash of vinegar instead of ham hock.","Warm the black-eyed peas; serve with a half piece of cornbread."]);
WT("w2","Lunch","Turkey & collard greens rice bowl",[["turkey",1],["collards",1],["brownrice",0.75],["oil",0.25]],["Brown the turkey with smoked paprika.","Serve over brown rice with garlicky collards."]);
WT("w3","Dinner","Chicken, black beans & sweet plantain",[["chicken",1],["blackbeans",1],["plantain",1],["salsa",1]],["Season chicken with cumin, oregano, lime and garlic; grill or pan-sear.","Bake plantain slices at 400°F for 20 minutes until caramelized.","Serve with black beans and salsa."]);
WT("w4","Breakfast","Huevos rancheros",[["egg",2],["corntort",1],["blackbeans",0.5],["salsa",1],["avocado",0.5]],["Warm the corn tortillas and beans.","Top with fried or scrambled eggs, salsa and avocado."]);
WT("w5","Dinner","Jerk chicken with rice & peas",[["chickthigh",1],["whiterice",0.75],["kidneybeans",0.5],["cabbage",1]],["Rub chicken with jerk seasoning (allspice, thyme, scotch bonnet, garlic); bake or grill.","Cook rice with kidney beans, thyme and a little coconut milk if you like.","Serve with steamed cabbage and carrots."]);
WT("w6","Lunch","Chana masala with roti",[["chickpeas",1.5],["tomato",1],["onion",0.5],["spinach",1],["roti",1],["oil",0.5]],["Cook onion, garlic, ginger and garam masala in oil.","Add chickpeas and chopped tomato; simmer 15 minutes, stir in spinach.","Serve with warm roti."]);
WT("w7","Dinner","Masoor dal & basmati rice",[["lentils",1.5],["basmati",0.75],["spinach",1],["oil",0.5]],["Simmer lentils with turmeric until soft; temper with cumin seeds, garlic and chili in oil.","Stir in spinach; serve over basmati rice."]);
WT("w8","Breakfast","Masala omelet & roti",[["egg",2],["onion",0.25],["tomato",0.5],["spinach",0.5],["roti",1]],["Whisk eggs with chopped onion, tomato, cilantro and a pinch of turmeric.","Cook as an omelet; serve with roti."]);
WT("w9","Dinner","Teriyaki salmon rice bowl",[["salmon",1],["basmati",0.75],["edamame",0.5],["cucumber",0.5],["teriyaki",1]],["Brush salmon with teriyaki and bake at 400°F for 12 minutes.","Serve over rice with edamame and sliced cucumber."]);
WT("w10","Dinner","Garlic tofu & bok choy stir-fry",[["tofu",1],["bokchoy",1],["brownrice",0.75],["soysauce",1],["oil",0.5]],["Brown cubed tofu in oil; add garlic and ginger.","Toss in bok choy and low-sodium soy sauce until wilted; serve over rice."]);
WT("w11","Dinner","Chicken shawarma plate",[["chickthigh",1],["pita",1],["hummus",1],["cucumber",0.5],["tomato",1]],["Marinate chicken in yogurt or lemon with cumin, paprika, turmeric and garlic; roast at 425°F.","Slice and serve with pita, hummus, cucumber and tomato."]);
WT("w12","Breakfast","Shakshuka",[["egg",2],["tomato",2],["pepper",0.5],["onion",0.25],["pita",0.5],["oil",0.25]],["Soften onion and pepper in oil; add chopped tomato, cumin and paprika and simmer.","Crack in the eggs, cover and cook until set; scoop up with pita."]);
WT("w13","Lunch","Red lentil soup & pita",[["lentils",1.5],["onion",0.5],["carrots",0.5],["pita",1]],["Simmer red lentils with onion, carrot, cumin and broth for 20 minutes; blend smooth.","Finish with lemon; serve with warm pita."]);
WT("w14","Dinner","West African peanut chicken stew",[["chickthigh",1],["pb",0.5],["tomato",1],["sweetpotato",0.5],["spinach",1],["whiterice",0.5]],["Brown chicken with onion, ginger and garlic.","Add tomato, sweet potato, peanut butter and water; simmer 25 minutes.","Stir in spinach; serve over rice."]);
WT("w15","Lunch","Paneer & pea curry with roti",[["paneer",1],["peas",0.75],["tomato",1],["roti",1],["oil",0.25]],["Cook tomato with garam masala, ginger and garlic until thick.","Add peas and cubed paneer; simmer 5 minutes and serve with roti."]);
for (const t of TEMPLATES) if (!t._ok) t._ok = true;
function srcBadge(k){ const s = SOURCES[k]; return s ? `<a class="src" href="${s.url}" target="_blank" rel="noopener" title="${esc(s.why)}">${esc(s.badge || "Follows " + s.name)}</a>` : ""; }

/* ---------- cost estimates (USD per listed serving, US grocery averages) ---------- */
const COST = {egg:.30,eggwhite:.55,yogurt:1.2,milk:.3,cottage:.7,cheddar:.45,chicken:1.4,turkey:1.5,beef:1.7,salmon:3,tuna:1.3,shrimp:2.8,tofu:.7,turkeydeli:1.1,oats:.15,bread:.2,tortilla:.35,brownrice:.25,whiterice:.2,quinoa:.7,pasta:.3,ricecake:.25,granola:.4,blackbeans:.25,lentils:.2,banana:.25,blueberries:2,strawberries:1,apple:.75,orange:.8,sweetpotato:.7,potato:.5,broccoli:.7,spinach:.7,greens:.8,pepper:1,greenbeans:.5,avocado:.75,pb:.2,almonds:.45,whey:1,chia:.15,oil:.15,hummus:.3,salsa:.3,marinara:.45,honey:.15,darkchoc:.9,protbar:2,latte:5,coffee:.4,soda:.6,pizza:3.5,cheeseburger:3,fries:3,string:.4,parmesan:.35,feta:.6,skyr:1.5,kefir:1,skim:.3,wholemilk:.32,almondmilk:.3,soymilk:.35,oatmilk:.45,butter:.15,creamcheese:.25,sourcream:.15,vanyogurt:.8,ricotta:.9,swiss:.6,chickthigh:1.1,rotisserie:1.3,groundchicken:1.4,porktender:1.4,porkchop:1.4,sirloin:3,bacon:.9,turkeybacon:.7,ham:1,cod:2.5,tilapia:1.6,cansalmon:1.4,sardines:2,tempeh:1.3,edamame:1,seitan:1.8,chxsausage:1.2,jerky:2,beef95:2.2,bison:3.5,scallops:5,veggieburger:1.25,plantprotein:1.3,meatballs:1.4,whitebread:.15,sourdough:.45,bagel:.75,engmuffin:.45,flourtort:.25,corntort:.15,pita:.55,spaghetti:.25,couscous:.45,barley:.2,farro:.55,steelcut:.2,instantoat:.45,branflakes:.4,cheerios:.5,popcorn:.25,pretzels:.3,crackers:.45,chickpeas:.3,kidneybeans:.3,pinto:.25,refried:.45,ricenoodles:.5,waffles:.8,pancakes:.45,grapes:1,pineapple:1,mango:1.2,watermelon:.7,cantaloupe:.6,peach:.8,pear:.8,raspberries:2.5,blackberries:2,kiwi:1,cherries:2,grapefruit:.7,raisins:.35,dates:1,craisins:.4,clementine:.7,carrots:.3,cucumber:.4,tomato:.6,cherrytom:1,cauliflower:.7,caulirice:.9,asparagus:1.8,zucchini:.6,mushrooms:.9,onion:.25,kale:.8,romaine:.6,brussels:1,corn:.5,peas:.5,butternut:.8,beets:.7,mixedveg:.5,walnuts:.55,cashews:.55,pistachios:.7,peanuts:.25,almondbutter:.55,sunflower:.35,pepitas:.7,flax:.08,maple:.3,jam:.1,ketchup:.05,mayo:.08,ranch:.2,bbq:.15,soysauce:.05,guac:.5,tahini:.25,coconutoil:.15,vinaigrette:.15,trailmix:.5,oj:.45,sportsdrink:1.5,energydrink:2.5,beer:1.5,wine:2,chocmilk:.45,smoothie:6,burrito:10,sub:6,grilledsand:6,nuggets:4,caesar:9,mac:.8,spagmeat:2.5,friedrice:4,sushi:7,ramen:.4,chxsoup:.9,granolabar:.45,icecream:.6,cookie:1.5,donut:1.5,chips:.4,tortchips:.3,hotdog:2.5,chickpeapasta:.8,
  hbegg2:1.8,gyogcup:1.25,rtdshake:3,tunapouch:1.6,nutpack:1,deliwrap:6,chxsalad:7,chili:2.5,oatcup:1.5,pbcrackers:.75,babycarrots:.8,hummuscup:1.5,fruitcup:1,eggbites:5,bfsandwich:4,frozenbowl:4,sparkling:.75,collards:.6,blackeyed:.3,plantain:.45,roti:.35,cornbread:.4,cabbage:.3,bokchoy:.7,basmati:.3,paneer:1.3,teriyaki:.1};
const CAT_COST = {protein:1.5, produce:.6, grains:.3, dairy:.5, pantry:.25, prepared:3, road:2};
const costOf = items => items.reduce((a, [id, q]) => a + (COST[id] ?? CAT_COST[FOOD[id] ? FOOD[id].cat : "pantry"] ?? .5)*q, 0);
const hhFactor = p => { const h = p.household || {}; return Math.max(1, (h.adults || 1) + 0.6*(h.kids || 0)); };

/* ---------- faith & cultural eating ---------- */
const FAITHS = {
  none:["None", ""],
  halal:["Halal", "No pork or alcohol. Choose halal-certified meat and poultry, and check labels for gelatin and alcohol-based flavorings."],
  kosher:["Kosher", "No pork or shellfish, and meat and dairy are never in the same meal. Look for a hechsher on packaged foods."],
  daniel:["Daniel Fast", "Plant foods only: fruit, vegetables, whole grains, beans, nuts and water. No sweeteners, refined grains, caffeine, alcohol or fried foods."],
  lent:["Lent (Catholic)", "Meatless Fridays during Lent, plus Ash Wednesday and Good Friday. Fish is fine."],
  orthodox:["Orthodox fast days", "Wednesdays and Fridays: no meat, dairy, eggs or fish (shellfish is fine)."],
  ramadan:["Ramadan", "On fasting days, meals move to Suhoor before dawn and Iftar after sunset, with dates and water to break the fast."],
  hindu:["Hindu (no beef)", "No beef. Turn on vegetarian below if you also skip meat, fish and eggs."],
  adventist:["Seventh-day Adventist", "Vegetarian with eggs and dairy, no pork or shellfish, no caffeine or alcohol."]
};
function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(y, mo-1, da); }
const RAMADAN = {2026:["2026-02-18","2026-03-19"], 2027:["2027-02-08","2027-03-09"], 2028:["2028-01-28","2028-02-25"], 2029:["2029-01-16","2029-02-13"]};
function ramadanRange(p, y){ const r = p.ramadanDates && p.ramadanDates[y] || RAMADAN[y]; return r || null; }
function isFastDay(p, d){
  const k = dkey(d), y = d.getFullYear();
  if (p.faith === "ramadan"){ if (p.fastingNow) return true; const r = ramadanRange(p, y); return !!(r && k >= r[0] && k <= r[1]); }
  return false;
}
function dayRules(p, d){
  const block = new Set(blockedSet(p)), k = dkey(d), wd = wIdx(d);
  let slots = SLOTS, kosher = p.faith === "kosher", label = null;
  if (p.faith === "lent"){
    const e = easter(d.getFullYear()), ash = addDays(e, -46), good = addDays(e, -2);
    const inLent = k >= dkey(ash) && k < dkey(e);
    if ((inLent && wd === 4) || k === dkey(ash) || k === dkey(good) || (p.lentAllYear && wd === 4)) { ["beef","pork","chicken","turkey"].forEach(x => block.add(x)); label = k === dkey(good) ? "Good Friday · meatless" : k === dkey(ash) ? "Ash Wednesday · meatless" : "Meatless Friday"; }
  }
  if (p.faith === "orthodox" && (wd === 2 || wd === 4)){ ["beef","pork","chicken","turkey","fish","dairy","eggs"].forEach(x => block.add(x)); label = "Fast day · plant-based"; }
  if (isFastDay(p, d)){ slots = [["Breakfast",.40],["Dinner",.45],["Snack",.15]]; label = "Ramadan · Suhoor & Iftar"; }
  return {block, slots, kosher, label, fast: isFastDay(p, d)};
}
function blockedSet(p){
  const b = blockedSet0(p);
  const add = (...x) => x.forEach(t => b.add(t));
  switch (p.faith){
    case "halal": add("pork","alcohol"); break;
    case "kosher": add("pork","shellfish"); break;
    case "daniel": add(...DIET_BLOCK.vegan, "danielno", "alcohol", "caffeine"); break;
    case "hindu": add("beef"); if (p.faithVeg) add(...DIET_BLOCK.veg, "eggs"); break;
    case "adventist": add(...DIET_BLOCK.veg, "pork", "shellfish", "caffeine", "alcohol"); break;
    case "jain": add(...DIET_BLOCK.veg, "eggs", "honey", "alcohol", "root"); break;
    case "buddhist": add(...DIET_BLOCK.veg, "allium", "alcohol"); break;
    case "ital": add(...DIET_BLOCK.vegan, "alcohol", "coffee", "processed"); break;
    case "lds": add("coffee", "alcohol"); break;
    case "sikh": add("alcohol"); if (p.faithVeg) add(...DIET_BLOCK.veg); break;
  }
  if (p.noAlcohol) add("alcohol");
  return b;
}
const MEATTAG = ["chicken","turkey","beef","pork"];
const kosherOK = t => !(t.items.some(([id]) => FOOD[id].tags.some(x => MEATTAG.includes(x))) && t.items.some(([id]) => FOOD[id].tags.includes("dairy")));
function slotLabel(slot, k){
  const p = state && state.profile; if (!p) return slot;
  const d = k ? pkey(k) : new Date();
  if (isFastDay(p, d)) return {Breakfast:"Suhoor", Dinner:"Iftar", Snack:"Evening snack", Lunch:"Lunch"}[slot] || slot;
  return slot;
}
function mealSlotsFor(p, k){ return isFastDay(p, k ? pkey(k) : new Date()) ? ["Breakfast","Dinner","Snack"] : MEALS; }
function slotTime(p, slot){
  if (p.lifestyle !== "shift" || !p.shiftStart) return "";
  const [h, m] = p.shiftStart.split(":").map(Number), start = h*60 + m, len = (p.shiftLen || 12)*60;
  const at = {Breakfast: start - 90, Lunch: start + len*0.4, Snack: start + len*0.75, Dinner: start + len + 30}[slot];
  if (at == null) return "";
  const t = ((Math.round(at/15)*15) % 1440 + 1440) % 1440, hh = Math.floor(t/60), mm = t % 60;
  return `${(hh % 12) || 12}:${pad(mm)} ${hh < 12 ? "AM" : "PM"}`;
}

/* ---------- meal pools & the 7-day plan ---------- */
function mealPoolFor(slot, p, rules){
  const b = rules ? rules.block : blockedSet(p), kosher = rules ? rules.kosher : p.faith === "kosher";
  let ok = TEMPLATES.filter(t => t.slot === slot && t.items.every(([id]) => FOOD[id] && foodOK(id, p, b)) && (!kosher || kosherOK(t)));
  if (DIET_SHAPE[p.diet]){ const d = ok.filter(t => dietMealOK(t, p)); if (d.length >= 2) ok = d; }
  if (p.lifestyle === "road"){ const r = ok.filter(t => t.road); if (r.length >= 2) ok = r; } else ok = ok.filter(t => !t.road || p.menuStyle === "road");
  const styled = ok.filter(t => styleOK(t, p));
  const pool = styled.length >= 2 ? styled : ok;
  return pool.length ? pool : [autoMeal(slot, Object.assign({}, p, {exclude:[...b]}))];
}
const DIET_SHAPE = {keto:1, lowcarb:1, highprotein:1};
function mealPool(slot, p){ return mealPoolFor(slot, p, dayRules(p, new Date())); }
function budgetFilter(pool, p, c, share){
  if (!(p.budget > 0)) return pool;
  const perMeal = p.budget / hhFactor(p) / 7 * share;
  const scored = pool.map(t => { const base = mealTotals(t.items), k = clamp(c.target*share/base.kcal, 0.6, 2.4); return {t, cost: costOf(t.items)*k}; });
  const fit = scored.filter(x => x.cost <= perMeal*1.15).map(x => x.t);
  return fit.length >= 2 ? fit : scored.sort((a,b) => a.cost - b.cost).slice(0, 3).map(x => x.t);
}
function generatePlan(p){
  const c = calc(p), rnd = mulberry32(p.planSeed*9973 + 17), monday = addDays(new Date(), -wIdx(new Date())), days = [], cache = {};
  for (let d = 0; d < 7; d++){
    const date = addDays(monday, d), rules = dayRules(p, date), rk = [...rules.block].sort().join(",") + rules.kosher;
    const meals = rules.slots.map(([slot, share]) => {
      const key = slot + "|" + rk;
      cache[key] ||= shuffle(budgetFilter(mealPoolFor(slot, p, rules), p, c, share), rnd);
      const pool = cache[key], tpl = pool[(d + (slot === "Dinner" ? 2 : 0)) % pool.length];
      let base = mealTotals(tpl.items), tplItems = tpl.items;
      if (rules.fast && slot === "Dinner" && !tpl.items.some(i => i[0] === "dates")) tplItems = [["dates", 0.5], ...tpl.items];
      base = mealTotals(tplItems);
      const k = clamp((c.target*share)/base.kcal, 0.6, 2.4);
      const items = tplItems.map(([id,q]) => [id, roundQ(q*k)]);
      const steps = rules.fast && slot === "Dinner" ? ["Break the fast with a date or two and a glass of water, then pray or rest a few minutes before the meal.", ...tpl.steps] : tpl.steps;
      return {slot, tpl:tpl.id, src:tpl.src, steps, name:tpl.name, items, t:mealTotals(items), cost:costOf(items)};
    });
    const t = meals.reduce((a,m) => { for (const k in a) a[k] += m.t[k]; return a; }, {kcal:0,p:0,c:0,f:0,s:0,as:0});
    days.push({meals, t, cost: meals.reduce((a,m) => a + m.cost, 0), label: rules.label, date: dkey(date)});
  }
  return days;
}
function groceries(plan, from = 0, to = 7){ const g = groceries0(plan, from, to), k = hhFactor(state.profile); if (k !== 1) for (const id in g) g[id] *= k; return g; }

/* ---------- shop your plan ---------- */
const AMZ = q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=amazonfresh&tag=${NH_TAG}`;
const shopName = id => FOOD[id].name.replace(/,\s*(cooked|raw|baked|drained|chopped).*$/i, "").replace(/\s*\(.*?\)/g, "");
function shopCard(g){
  const ids = Object.keys(g).sort((a,b) => FOOD[a].name.localeCompare(FOOD[b].name)), total = ids.reduce((a,id) => a + (COST[id] ?? CAT_COST[FOOD[id].cat] ?? .5)*g[id], 0);
  const p = state.profile, people = hhFactor(p);
  const amazonJSON = JSON.stringify({ingredients: ids.map(id => ({name: shopName(id), quantityList:[{unit:"COUNT", amount: 1}]}))});
  return `<section class="card stack shopcard"><div class="card-head" style="margin:0"><div><span class="eyebrow">Shop your plan</span><h2>${ICON.cart} ${ids.length} items · about ${money0(total)}</h2><p class="small muted">Estimated at US grocery averages for ${people === 1 ? "1 person" : `${fmt1(people)} people`}${p.budget ? ` · your budget ${money0(p.budget)}/week` : ""}. Prices vary by store.</p></div></div>
    <div class="row"><form method="POST" action="https://www.amazon.com/afx/ingredients/landing?tag=${NH_TAG}" target="_blank" style="display:contents"><input type="hidden" name="ingredients" value="${esc(amazonJSON)}"><button class="btn primary">${ICON.cart} Send list to Amazon Fresh</button></form>
      <button class="btn" data-act="copyList">Copy list</button>${navigator.share ? `<button class="btn" data-act="shareList">Share</button>` : ""}</div>
    <details class="how"><summary>Shop item by item</summary><div class="list">${ids.map(id => `<div class="li"><div class="main"><b>${esc(shopName(id))}</b><small>${esc(groceryLine(id, g[id]))}</small></div><a class="btn sm" href="${AMZ(shopName(id))}" target="_blank" rel="sponsored noopener">Amazon</a></div>`).join("")}</div></details>
    <p class="small muted">As an Amazon Associate, Rep &amp; Ration earns from qualifying purchases.</p></section>`;
}
function listText(){ const g = groceries(generatePlan(state.profile)); return "Rep & Ration grocery list\n" + Object.keys(g).sort().map(id => `• ${shopName(id)} — ${groceryLine(id, g[id])}`).join("\n"); }
A.copyList = async () => { try { await navigator.clipboard.writeText(listText()); toast("Grocery list copied"); } catch { toast("Couldn't copy on this device."); } };
A.shareList = async () => { try { await navigator.share({title:"Grocery list", text:listText()}); } catch {} };

function budgetBar(plan){
  const p = state.profile, wk = plan.reduce((a,d) => a + d.cost, 0)*hhFactor(p);
  return `<div class="budgetbar"><div><span class="eyebrow">This week's food cost</span><div><span class="big num" style="font-size:1.5rem">${money0(wk)}</span> <span class="small muted">est. · ${money(wk/7/hhFactor(p))} per person per day</span></div></div>
    <form class="row" data-form="budget"><label class="f" style="width:150px">Weekly budget<input id="budIn" type="number" min="0" step="5" inputmode="decimal" placeholder="e.g. 60" value="${p.budget || ""}"></label><button class="btn sm">Feed me on this</button>${p.budget ? `<button type="button" class="btn sm ghost" data-act="budgetOff">No budget</button>` : ""}</form></div>`;
}
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="budget"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const v = +$("#budIn").value; state.profile.budget = v > 0 ? v : 0; state.profile.planSeed++; persist("profile"); render();
  const wk = generatePlan(state.profile).reduce((a,d) => a + d.cost, 0)*hhFactor(state.profile);
  toast(v > 0 ? (wk <= v*1.05 ? `New menu fits ${money0(v)}: about ${money0(wk)} this week` : `Cheapest menu we can build is about ${money0(wk)} for your targets`) : "Budget off"); }, true);
A.budgetOff = () => { state.profile.budget = 0; persist("profile"); render(); };

function V_plan(){
  const p = state.profile;
  if (ui.planTab === "grocery"){
    const plan = generatePlan(p), g = groceries(plan), byCat = {}, checked = p.groceryChecked || {}, c = calc(p);
    for (const id in g) (byCat[FOOD[id].cat] ||= []).push(id);
    const tabs = [["meals","Meals"],["grocery","Grocery & prep"],["training","Training week"]];
    const people = hhFactor(p);
    return `<div class="pagehead"><div><h1>Weekly plan</h1><p class="sub">${GOALS[p.goal]} · ${fmt(c.target)} kcal · groceries for ${people === 1 ? "1 person" : fmt1(people) + " people"}</p></div>
      <div class="seg" role="group" aria-label="Plan section">${tabs.map(([id,l])=>`<button data-act="planTab" data-tab="${id}" aria-pressed="${ui.planTab===id}">${l}</button>`).join("")}</div></div>
      ${shopCard(g)}
      <div class="grid g-side"><section class="card"><div class="card-head"><h2>Grocery list · 7 days</h2><button class="btn sm" data-act="clearGrocery">Uncheck all</button></div>
      ${Object.keys(CATS).filter(k => byCat[k]).map(cat => `<h3 style="margin:14px 0 4px" class="eyebrow">${CATS[cat]}</h3>${byCat[cat].sort((a,b) => FOOD[a].name.localeCompare(FOOD[b].name)).map(id => `<label class="check ${checked[id]?"done":""}"><input type="checkbox" data-act="gcheck" data-id="${id}" ${checked[id]?"checked":""}><span>${esc(FOOD[id].name)}</span><small class="num">${esc(groceryLine(id, g[id]))}</small></label>`).join("")}`).join("")}</section>
      <section class="stack"><div class="card"><h2 style="margin-bottom:4px">Prep session 1 · Sunday</h2><p class="small muted" style="margin-bottom:12px">Covers Monday–Wednesday${people > 1 ? ` · cooking for ${fmt1(people)}` : ""}</p><ol class="steps">${prepSteps(plan,0,3).map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>
      <div class="card"><h2 style="margin-bottom:4px">Prep session 2 · Wednesday</h2><p class="small muted" style="margin-bottom:12px">Covers Thursday–Sunday</p><ol class="steps">${prepSteps(plan,3,7).map(s => `<li>${esc(s)}</li>`).join("")}</ol></div></section></div>`;
  }
  let html = V_plan0();
  if (ui.planTab === "meals"){
    const plan = generatePlan(p), d = plan[ui.planDay];
    html = html.replace('<div class="row" style="margin-bottom:14px;align-items:flex-start"><span class="eyebrow" style="padding-top:7px">Leave out</span>',
      `${budgetBar(plan)}${d.label ? `<div class="daynote">${esc(d.label)}</div>` : ""}<div class="row" style="margin-bottom:14px;align-items:flex-start"><span class="eyebrow" style="padding-top:7px">Leave out</span>`);
  }
  return html;
}

/* prep steps: nothing to "cook" for ready-to-eat foods; a cooler plan for the road */
const NOCOOK = ["rotisserie","jerky","turkeydeli","ham","tuna","cansalmon","sardines","tunapouch","hbegg2"];
function prepSteps(plan, from, to){
  const p = state.profile;
  if (p.lifestyle === "road"){
    const g = groceries(plan, from, to), cold = Object.keys(g).filter(id => FOOD[id].tags.includes("dairy") || ["hbegg2","rotisserie","chxsalad","deliwrap","hummuscup","rtdshake","gyogcup","eggbites","babycarrots"].includes(id));
    return [`Stock up at a grocery store or travel center for ${to - from} days: ${Object.keys(g).map(id => FOOD[id].name.split(",")[0].toLowerCase()).slice(0, 10).join(", ")}${Object.keys(g).length > 10 ? " and the rest of the list" : ""}.`,
      cold.length ? `Keep ${cold.map(id => FOOD[id].name.split(",")[0].toLowerCase()).slice(0, 6).join(", ")} in a cooler or cab fridge at 40°F or below. Swap the ice every day.` : "Everything on this list is shelf-stable.",
      "Portion snacks into bags for each day so they're easy to grab while driving.",
      "Keep a water jug in the cab and refill it at every fuel stop.",
      "Eat cold foods within 3–4 days, and toss anything that has sat warm for more than 2 hours."];
  }
  return prepSteps0(plan, from, to).filter(line => !NOCOOK.some(id => line.toLowerCase().includes(FOOD[id].name.replace(/,.*$/, "").toLowerCase()) && /^(Cook|Press)/.test(line)));
}
