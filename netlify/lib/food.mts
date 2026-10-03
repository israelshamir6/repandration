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
  if (!n100.kcal && !n100.p && !n100.c && !n100.f) return null;
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
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: Netlify.env.get("AI_MODEL") || "claude-haiku-4-5-20251001", max_tokens: 900, system: AI_PROMPT, messages: [{ role: "user", content }] }),
    signal: timed(25000)
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) { console.error("anthropic", res.status, JSON.stringify(j).slice(0, 300)); throw Object.assign(new Error("The food scanner is busy. Try again in a minute."), { status: 502 }); }
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
