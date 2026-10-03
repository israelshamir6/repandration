// Private progress photos: stored in Netlify Blobs, listed in the kv table, visible only to their owner.
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

const store = () => getStore({ name: "progress-photos", consistency: "strong" });
const MAX = 120;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function list(db: any, uid: string): Promise<any[]> {
  const [r] = await db.sql`SELECT v FROM kv WHERE k = ${"photos:" + uid}`;
  return (r && Array.isArray(r.v) ? r.v : []) as any[];
}
async function save(db: any, uid: string, items: any[]) {
  await db.sql`INSERT INTO kv (k, v) VALUES (${"photos:" + uid}, ${JSON.stringify(items)}::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
}
export async function deleteAllPhotos(db: any, uid: string) {
  for (const p of await list(db, uid)) await store().delete(`${uid}/${p.id}`).catch(() => {});
  await db.sql`DELETE FROM kv WHERE k = ${"photos:" + uid}`;
}

/** Returns a Response for photo routes, or null when the route isn't one of ours. */
export async function photoRoutes(route: string, db: any, me: any, body: any, premium: boolean): Promise<Response | null> {
  if (route.startsWith("photo/")) {
    const id = route.slice(6).replace(/[^\w-]/g, "");
    const items = await list(db, me.id);
    if (!items.some(p => p.id === id)) return new Response("Not found", { status: 404 });
    const buf = await store().get(`${me.id}/${id}`, { type: "arrayBuffer" });
    if (!buf) return new Response("Not found", { status: 404 });
    return new Response(buf, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } });
  }
  if (!route.startsWith("photos/")) return null;
  if (!premium) return json({ error: "Progress photos aren't available in free mode. Upgrade to Premium to use them." }, 402);
  const items = await list(db, me.id);
  if (route === "photos/upload") {
    const m = /^data:image\/jpeg;base64,(.+)$/.exec(String(body.image || ""));
    if (!m) return json({ error: "Send a JPEG photo." }, 400);
    const bytes = Buffer.from(m[1], "base64");
    if (bytes.length > 2_500_000) return json({ error: "That photo is too large." }, 400);
    if (items.length >= MAX) return json({ error: `You can keep up to ${MAX} photos. Delete a few old ones first.` }, 400);
    const id = randomBytes(9).toString("base64url");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? body.date : new Date().toISOString().slice(0, 10);
    const pose = ["front", "side", "back"].includes(body.pose) ? body.pose : "front";
    await store().set(`${me.id}/${id}`, bytes);
    items.push({ id, date, pose, weight: Number(body.weight) || null, note: String(body.note || "").slice(0, 120) });
    items.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    await save(db, me.id, items);
  } else if (route === "photos/delete") {
    const id = String(body.id || "");
    await store().delete(`${me.id}/${id}`).catch(() => {});
    await save(db, me.id, items.filter(p => p.id !== id));
    return json({ photos: items.filter(p => p.id !== id) });
  }
  return json({ photos: items });
}
