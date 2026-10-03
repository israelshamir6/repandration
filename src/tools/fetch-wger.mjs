// Build step: pull open-licensed exercises, images and videos from wger.de (CC BY-SA) into public/data/wger.json.
// Runs on Netlify during each deploy. If wger is unreachable the previous file (or an empty list) is kept.
import { writeFile, mkdir, readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(root, "public/data/wger.json"), IMG = join(root, "public/wx");
const UA = { "user-agent": "RepAndRation/1.0 (Repandration27@gmail.com)", accept: "application/json" };
const LIC = { 1: "CC BY-SA 3.0", 2: "CC BY-SA 4.0", 3: "CC0", 4: "CC BY 4.0", 5: "ODbL" };
const EQ = { "barbell": "barbell", "sz-bar": "ezbar", "dumbbell": "dumbbells", "gym mat": null, "swiss ball": "ball", "pull-up bar": "bar", "none (bodyweight exercise)": null,
  "bench": "chair", "incline bench": "chair", "kettlebell": "kettlebell", "resistance band": "bands", "cable machine": "cable", "machine": "machine" };
const MUS = { lats: "lats", biceps: "biceps", quads: "quadriceps", hamstrings: "hamstrings", glutes: "glutes", chest: "chest", shoulders: "shoulders", triceps: "triceps", abs: "abdominals",
  calves: "calves", obliquus: "abdominals", trapezius: "traps", "serratus anterior": "chest", soleus: "calves", brachialis: "biceps", "lower back": "lower back" };
const strip = h => String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const exists = p => access(p).then(() => true, () => false);

async function getAll(url) {
  const out = [];
  while (url) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    const j = await r.json(); out.push(...(j.results || [])); url = j.next;
  }
  return out;
}
async function main() {
  const all = await getAll("https://wger.de/api/v2/exerciseinfo/?limit=200");
  await mkdir(IMG, { recursive: true });
  const list = [];
  for (const x of all) {
    const tr = (x.translations || []).find(t => t.language === 2);
    if (!tr || !tr.name) continue;
    const desc = strip(tr.description);
    const imgs = (x.images || []).sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0)).slice(0, 2);
    const vids = (x.videos || []).filter(v => v.size && v.size < 90e6).map(v => ({ url: v.video, mb: Math.round(v.size / 1e5) / 10, codec: v.codec, by: v.license_author || "wger contributor", lic: LIC[v.license] || "CC BY-SA 4.0" }));
    if (!imgs.length && !vids.length && desc.length < 60) continue;
    const local = [];
    for (const [i, im] of imgs.entries()) {
      const src = (im.thumbnails && im.thumbnails.medium) || im.image, ext = /\.png$/i.test(src) ? "png" : /\.webp$/i.test(src) ? "webp" : "jpg";
      const file = `${x.id}-${i}.${ext}`;
      if (!(await exists(join(IMG, file)))) {
        try { const r = await fetch(src, { headers: UA, signal: AbortSignal.timeout(20000) }); if (r.ok) await writeFile(join(IMG, file), new Uint8Array(await r.arrayBuffer())); else continue; } catch { continue; }
      }
      local.push({ src: `/wx/${file}`, by: im.license_author || "wger contributor", lic: LIC[im.license] || "CC BY-SA 4.0" });
    }
    const equip = [...new Set((x.equipment || []).map(e => EQ[String(e.name).toLowerCase()] ?? "other").filter(Boolean))];
    const prim = [...new Set((x.muscles || []).map(m => MUS[String(m.name_en || m.name).toLowerCase()]).filter(Boolean))];
    const sec = [...new Set((x.muscles_secondary || []).map(m => MUS[String(m.name_en || m.name).toLowerCase()]).filter(Boolean))];
    list.push({ id: "wg-" + x.id, n: tr.name.trim(), cat: x.category ? x.category.name : "", e: equip, pm: prim, sm: sec, d: desc.slice(0, 900), img: local, vid: vids, lic: x.license ? x.license.short_name : "CC BY-SA", by: x.license_author || "" });
  }
  await writeFile(OUT, JSON.stringify(list));
  console.log(`wger: ${list.length} exercises, ${list.filter(x => x.img.length).length} with images, ${list.filter(x => x.vid.length).length} with videos`);
}
main().catch(async e => {
  console.log("wger fetch skipped:", e.message);
  if (!(await exists(OUT))) await writeFile(OUT, "[]");
});
