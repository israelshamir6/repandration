// Food search across USDA FoodData Central and Open Food Facts, barcode lookup and AI meal logging.
export type N = { kcal: number; p: number; c: number; f: number; s: number; as: number; fib: number; na: number };
export type Item = { id: string; name: string; brand: string; src: string; servings: { label: string; g: number }[]; n100: N; img?: string; unit?: string };

const UA = "RepAndRation/1.0 (Repandration27@gmail.com)";
const num = (v: any) => { const x = typeof v === "string" ? parseFloat(v) : v; return Number.isFinite(x) ? x : 0; };
const r = (v: number) => Math.round(v * 10) / 10;
const title = (s: string) => {
  const t = String(s || "").trim().replace(/\s+/g, " ");
  return t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s(\-/])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : t;
};
const timed = (ms: number) => (AbortSignal as any).timeout ? (AbortSignal as any).timeout(ms) : undefined;

/* ---------- USDA FoodData Central ---------- */
const FDC = (Netlify.env.get("FDC_API_KEY") || "DEMO_KEY");
function fdcN(food: any): N {
  const n: N = { kcal: 0, p: 0, c: 0, f: 0, s: 0, as: 0, fib: 0, na: 0 };
  let kcalAlt = 0, kj = 0;
  for (const x of food.foodNutrients || []) {
    const no = String(x.nutrientNumber ?? x.number ?? x.nutrient?.number ?? "");
    const v = num(x.value ?? x.amount);
    const unit = String(x.unitName ?? x.nutrient?.unitName ?? "").toUpperCase();
    if (no === "208" && unit !== "KJ") n.kcal = v;
    else if (no === "268" || unit === "KJ") kj = kj || v;
    else if (no === "957" || no === "958") kcalAlt = kcalAlt || v;
    else if (no === "203") n.p = v;
    else if (no === "205") n.c = v;
    else if (no === "204") n.f = v;
    else if (no === "269" || no === "269.3") n.s = n.s || v;
    else if (no === "539") n.as = v;
    else if (no === "291") n.fib = v;
    else if (no === "307") n.na = v; // mg
  }
  if (!n.kcal) n.kcal = kcalAlt || (kj ? kj / 4.184 : 0) || (n.p * 4 + n.c * 4 + n.f * 9);
  return n;
}
function fdcItem(food: any): Item | null {
  const n100 = fdcN(food);
  if (!food.description || !(n100.kcal >= 0)) return null;
  const servings: { label: string; g: number }[] = [];
  const branded = food.dataType === "Branded";
  const unit = String(food.servingSizeUnit || "g").toLowerCase();
  if (branded && num(food.servingSize) > 0 && /^(g|grm|ml|mlt)$/.test(unit)) {
    const u = /^m/.test(unit) ? "ml" : "g";
    const hh = food.householdServingFullText ? title(food.householdServingFullText) + " " : "";
    servings.push({ label: `${hh}(${r(num(food.servingSize))} ${u})`.trim(), g: num(food.servingSize) });
  }
  for (const m of food.foodMeasures || []) {
    const g = num(m.gramWeight), t = String(m.disseminationText || "").trim();
    if (g > 0 && t && !/quantity not specified/i.test(t) && servings.length < 8) servings.push({ label: `${t} (${r(g)} g)`, g });
  }
  servings.push({ label: "100 g", g: 100 }, { label: "1 oz (28 g)", g: 28.35 });
  return {
    id: "fdc:" + food.fdcId, name: title(food.description), brand: title(food.brandName || food.brandOwner || ""),
    src: branded ? "USDA · branded" : "USDA", servings, n100, unit: unit.startsWith("m") ? "ml" : "g"
  };
}
async function fdcSearch(q: string, branded: boolean): Promise<Item[]> {
  const types = branded ? "Branded" : "Foundation,SR Legacy,Survey (FNDDS)";
  const u = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(FDC)}&query=${encodeURIComponent(q)}&pageSize=${branded ? 20 : 25}&dataType=${encodeURIComponent(types)}`;
  const res = await fetch(u, { signal: timed(7000) }).catch(() => null);
  if (!res || !res.ok) return [];
  const j: any = await res.json().catch(() => ({}));
  return (j.foods || []).map(fdcItem).filter(Boolean) as Item[];
}

/* ---------- Open Food Facts ---------- */
function offItem(p: any): Item | null {
  const nm = p.product_name_en || p.product_name || p.generic_name;
  const t = p.nutriments || {};
  if (!nm) return null;
  let kcal = num(t["energy-kcal_100g"]);
  if (!kcal && t["energy_100g"]) kcal = num(t["energy_100g"]) / 4.184;
  const n100: N = { kcal, p: num(t.proteins_100g), c: num(t.carbohydrates_100g), f: num(t.fat_100g), s: num(t.sugars_100g), as: num(t["added-sugars_100g"]), fib: num(t.fiber_100g), na: num(t.sodium_100g) * 1000 };
  if (!n100.kcal && !n100.p && !n100.c && !n100.f && !("energy-kcal_100g" in t) && !("energy_100g" in t)) return null;
  const servings: { label: string; g: number }[] = [];
  const sq = num(p.serving_quantity);
  if (sq > 0) servings.push({ label: p.serving_size ? `${String(p.serving_size).slice(0, 40)}` : `1 serving (${r(sq)} g)`, g: sq });
  servings.push({ label: "100 g", g: 100 }, { label: "1 oz (28 g)", g: 28.35 });
  const brand = String(p.brands || "").split(",")[0];
  return { id: "off:" + p.code, name: title(nm), brand: title(brand), src: "Open Food Facts", servings, n100, img: p.image_front_small_url || undefined };
}
const OFF_FIELDS = "code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url,countries_tags";
async function offSearch(q: string): Promise<Item[]> {
  let list: any[] = [];
  const a = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=24&langs=en&fields=${OFF_FIELDS}`, { headers: { "user-agent": UA }, signal: timed(6000) }).catch(() => null);
  if (a && a.ok) { const j: any = await a.json().catch(() => ({})); list = j.hits || j.products || []; }
  if (!list.length) {
    const b = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${OFF_FIELDS}`, { headers: { "user-agent": UA }, signal: timed(7000) }).catch(() => null);
    if (b && b.ok) { const j: any = await b.json().catch(() => ({})); list = j.products || []; }
  }
  const us = (p: any) => (p.countries_tags || []).includes("en:united-states") ? 0 : 1;
  return list.sort((x, y) => us(x) - us(y)).map(offItem).filter(Boolean) as Item[];
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
function score(it: Item, q: string) {
  const qw = words(q), nw = words(it.name + " " + it.brand);
  let s = 0;
  for (const w of qw) if (nw.some(x => x === w)) s += 3; else if (nw.some(x => x.startsWith(w))) s += 2; else s -= 2;
  if (it.name.toLowerCase().startsWith(q.toLowerCase())) s += 3;
  s -= Math.min(it.name.length, 80) / 40;
  if (it.src === "USDA") s += 1.5;
  return s;
}

async function cached<T>(db: any, k: string, days: number, fn: () => Promise<T>): Promise<T> {
  try {
    const [row] = await db.sql`SELECT data FROM food_cache WHERE k = ${k} AND at > NOW() - make_interval(days => ${days})`;
    if (row) return row.data as T;
  } catch {}
  const v = await fn();
  if (v && (!Array.isArray(v) || v.length)) {
    try { await db.sql`INSERT INTO food_cache (k, data, at) VALUES (${k}, ${JSON.stringify(v)}::jsonb, NOW()) ON CONFLICT (k) DO UPDATE SET data = EXCLUDED.data, at = NOW()`; } catch {}
  }
  return v;
}

export async function searchFoods(db: any, raw: string): Promise<Item[]> {
  const q = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 2) return [];
  return cached(db, "s:" + q.toLowerCase(), 14, async () => {
    const [gen, br, off] = await Promise.all([fdcSearch(q, false), fdcSearch(q, true), offSearch(q)]);
    const seen = new Set<string>(), out: Item[] = [];
    const add = (arr: Item[], n: number) => {
      for (const it of arr.map(i => ({ i, s: score(i, q) })).sort((a, b) => b.s - a.s).map(x => x.i)) {
        const k = (it.name + "|" + it.brand).toLowerCase();
        if (seen.has(k)) continue; seen.add(k); out.push(it); if (--n <= 0) break;
      }
    };
    add(gen, 14); add(br, 14); add(off, 14);
    return out.map(i => ({ i, s: score(i, q) })).sort((a, b) => b.s - a.s).map(x => x.i);
  });
}

export async function barcode(db: any, raw: string): Promise<Item | null> {
  const code = String(raw).replace(/\D/g, "");
  if (code.length < 6 || code.length > 14) return null;
  const res = await cached<Item[]>(db, "b:" + code, 30, async () => {
    const a = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, { headers: { "user-agent": UA }, signal: timed(7000) }).catch(() => null);
    if (a && a.ok) { const j: any = await a.json().catch(() => ({})); if (j.status === 1 && j.product) { const it = offItem({ ...j.product, code }); if (it) return [it]; } }
    const variants = [code, code.padStart(12, "0"), code.padStart(13, "0"), code.replace(/^0+/, "")];
    const b = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(FDC)}&query=${encodeURIComponent(code)}&dataType=Branded&pageSize=5`, { signal: timed(7000) }).catch(() => null);
    if (b && b.ok) {
      const j: any = await b.json().catch(() => ({}));
      const hit = (j.foods || []).find((f: any) => variants.includes(String(f.gtinUpc || "").replace(/^0+/, "")) || variants.includes(String(f.gtinUpc || "")));
      if (hit) { const it = fdcItem(hit); if (it) return [it]; }
    }
    return [];
  });
  return res[0] || null;
}

/* ---------- AI logging (Claude) ---------- */
export const aiReady = () => !!Netlify.env.get("ANTHROPIC_API_KEY");
const AI_PROMPT = `You are a registered-dietitian-level nutrition estimator for a calorie tracking app used in the United States.
Identify every distinct food and drink, estimate a realistic portion, and estimate nutrition for that portion using USDA FoodData Central values.
Reply with ONLY a JSON object, no prose, in exactly this shape:
{"items":[{"name":"Grilled chicken breast","portion":"5 oz","grams":140,"kcal":231,"protein":43,"carbs":0,"fat":5,"sugar":0,"fiber":0}],"note":"one short sentence about anything uncertain"}
Use numbers only (no units) for grams and nutrients. If there is no food, return {"items":[],"note":"No food found."}`;
export async function aiMeal(input: { image?: string; text?: string }): Promise<{ items: Item[]; note: string }> {
  const key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!key) throw Object.assign(new Error("AI logging isn't switched on yet."), { status: 503 });
  const content: any[] = [];
  if (input.image) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(input.image);
    if (!m) throw Object.assign(new Error("That photo couldn't be read. Try another one."), { status: 400 });
    content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
    content.push({ type: "text", text: input.text ? `Photo of a meal. The person adds: ${input.text.slice(0, 300)}` : "Photo of a meal." });
  } else {
    content.push({ type: "text", text: `The person describes what they ate: ${String(input.text || "").slice(0, 600)}` });
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", ...(Netlify.env.get("ANTHROPIC_WORKSPACE_ID") ? { "anthropic-workspace-id": Netlify.env.get("ANTHROPIC_WORKSPACE_ID") as string } : {}) },
    body: JSON.stringify({ model: Netlify.env.get("AI_MODEL") || "claude-haiku-4-5-20251001", max_tokens: 900, system: AI_PROMPT, messages: [{ role: "user", content }] }),
    signal: timed(25000)
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("anthropic", res.status, JSON.stringify(j).slice(0, 300));
    const msg = String((j.error && j.error.message) || "");
    const why = /workspace/i.test(msg) ? "the AI key isn't tied to a workspace. Create the key inside a workspace, or add ANTHROPIC_WORKSPACE_ID in Netlify" : res.status === 401 ? "the AI key isn't valid. Check ANTHROPIC_API_KEY in Netlify" : /credit/i.test(msg) ? "the AI account is out of credits" : res.status === 404 || /model/i.test(msg) ? "the AI model isn't available on this account" : res.status === 429 || res.status === 529 ? "it's busy right now" : `error ${res.status} (${msg.slice(0, 140)})`;
    throw Object.assign(new Error(`Photo logging isn't working: ${why}. Try search or barcode for now.`), { status: 502 });
  }
  const txt = (j.content || []).map((c: any) => c.text || "").join("");
  const mm = txt.match(/\{[\s\S]*\}/);
  let parsed: any = {};
  try { parsed = JSON.parse(mm ? mm[0] : "{}"); } catch {}
  const items: Item[] = (parsed.items || []).slice(0, 12).map((x: any, i: number) => {
    const g = num(x.grams) > 0 ? num(x.grams) : 100;
    const k = 100 / g;
    return {
      id: "ai:" + Date.now().toString(36) + i, name: title(String(x.name || "Food")).slice(0, 80), brand: "", src: "AI estimate",
      servings: [{ label: String(x.portion || `${r(g)} g`).slice(0, 40) + (num(x.grams) > 0 ? ` (${r(g)} g)` : ""), g }, { label: "100 g", g: 100 }],
      n100: { kcal: num(x.kcal) * k, p: num(x.protein) * k, c: num(x.carbs) * k, f: num(x.fat) * k, s: num(x.sugar) * k, as: 0, fib: num(x.fiber) * k, na: 0 }
    };
  });
  return { items, note: String(parsed.note || "").slice(0, 200) };
}

/* ---------- restaurant menus: scan a menu, or look up a chain anywhere in the world ---------- */
async function claudeJSON(system: string, content: any[], maxTokens = 1800): Promise<any> {
  const key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!key) throw Object.assign(new Error("AI features aren't switched on yet."), { status: 503 });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", ...(Netlify.env.get("ANTHROPIC_WORKSPACE_ID") ? { "anthropic-workspace-id": Netlify.env.get("ANTHROPIC_WORKSPACE_ID") as string } : {}) },
    body: JSON.stringify({ model: Netlify.env.get("AI_MODEL") || "claude-haiku-4-5-20251001", max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
    signal: timed(45000)
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) { console.error("anthropic", res.status, JSON.stringify(j).slice(0, 300)); throw Object.assign(new Error("The AI is busy right now. Try again in a minute."), { status: 502 }); }
  const txt = (j.content || []).map((c: any) => c.text || "").join("");
  const m = txt.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : "{}"); } catch { return {}; }
}
const ITEM_SHAPE = `{"name":"Grilled Chicken Sandwich","portion":"1 sandwich","kcal":390,"protein":28,"carbs":44,"fat":11,"sugar":9,"sodium":1120,"why":"one short sentence on why it fits or the health benefit","swap":"optional: one easy change that makes it healthier"}`;
export async function menuScan(input: { image?: string; restaurant?: string; left?: any; diet?: string; avoid?: string[] }) {
  const left = input.left || {};
  const ctx = `The person has about ${Math.round(left.kcal || 700)} kcal and ${Math.round(left.protein || 35)} g protein left today. Diet: ${input.diet || "no restrictions"}. Avoid: ${(input.avoid || []).join(", ") || "nothing"}.`;
  const system = `You are a sports dietitian helping someone order at a restaurant. ${ctx}
Pick the 5 best choices for them from the menu (respecting the diet and foods to avoid), then up to 3 items to skip. Use the restaurant's published nutrition when you know it, otherwise estimate from typical recipes.
Reply with ONLY JSON: {"restaurant":"name if known","best":[${ITEM_SHAPE}],"skip":[{"name":"...","why":"..."}],"tip":"one sentence ordering tip"}`;
  const content: any[] = [];
  if (input.image) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(input.image);
    if (!m) throw Object.assign(new Error("That photo couldn't be read."), { status: 400 });
    content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }, { type: "text", text: `Menu photo${input.restaurant ? ` from ${input.restaurant}` : ""}.` });
  } else content.push({ type: "text", text: `Restaurant: ${String(input.restaurant || "").slice(0, 80)}` });
  return claudeJSON(system, content);
}
export async function chainMenu(db: any, name: string, country: string) {
  const n = name.trim().slice(0, 60), c = (country || "United States").trim().slice(0, 40);
  if (n.length < 2) return { items: [] };
  return cached(db, `chain:${c.toLowerCase()}:${n.toLowerCase()}`, 60, async () => {
    const system = `You are a nutrition database. List up to 30 popular menu items from the restaurant chain the user names, as sold in ${c}, using the chain's published nutrition information where you know it (round sensibly). If you are not confident about an item's numbers, set "est": true.
For each item add "why": a short, honest health note (benefit or caution) and "swap": an easy healthier tweak if one exists.
Reply with ONLY JSON: {"chain":"official name","country":"${c}","cuisine":"...","items":[{"name":"...","portion":"...","kcal":0,"protein":0,"carbs":0,"fat":0,"sugar":0,"sodium":0,"est":false,"why":"...","swap":"..."}],"known":true}
If you don't recognize the chain, reply {"known":false,"items":[]}.`;
    const r = await claudeJSON(system, [{ type: "text", text: n }], 3500);
    return r && r.items ? r : { known: false, items: [] };
  });
}
export async function pantryScan(image: string) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
  if (!m) throw Object.assign(new Error("That photo couldn't be read."), { status: 400 });
  return claudeJSON(`List the foods and ingredients you can see in this fridge, pantry or counter photo. Use simple grocery names (e.g. "eggs", "chicken breast", "spinach", "rice"). Reply with ONLY JSON: {"items":["..."]}`,
    [{ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }, { type: "text", text: "What's here?" }], 600);
}
export async function weeklyReview(stats: any) {
  return claudeJSON(`You are a warm, practical fitness and nutrition coach. Write a short weekly review for the member from their numbers. Be specific, encouraging and honest; no medical advice.
Reply with ONLY JSON: {"headline":"one upbeat line","wins":["...","..."],"focus":"the one most useful thing to change next week","tip":"one concrete tip (a meal, habit or workout tweak)"}`,
    [{ type: "text", text: JSON.stringify(stats).slice(0, 3000) }], 700);
}
