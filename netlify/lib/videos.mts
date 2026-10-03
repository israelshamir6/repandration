// Coach exercise videos: upload in chunks, server-side transcode + safety check, then publish.
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

export const CHUNK = 4 * 1024 * 1024;            // upload & storage chunk (keeps every request under Netlify's limits)
export const MAX_RAW = 400 * 1024 * 1024;         // largest original file accepted
export const MAX_SECONDS = 90;
export const VIDEO_CATS: Record<string, string> = {
  home: "Home", calisthenics: "Calisthenics", heavy: "Heavy weights", dumbbell: "Dumbbell", kettlebell: "Kettlebell", bands: "Bands",
  machines: "Machines & cables", stretch: "Stretch & mobility", cardio: "Cardio & plyo", balls: "Med ball & stability ball", road: "On the road", other: "Other"
};
export const vstore = () => getStore({ name: "coach-videos", consistency: "strong" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (status: number, error: string) => json({ error }, status);
const vid = () => randomBytes(9).toString("base64url");
const BAD_WORDS = /\b(fuck|shit|bitch|cunt|dick|pussy|nigg|fag|porn|sex|nude|naked|weed|cocaine|meth|beer|vodka|whiskey|tequila|420|onlyfans)\b/i;

export async function processSecret(db: any) {
  const [r] = await db.sql`SELECT v FROM kv WHERE k = 'video_secret'`;
  if (r) return r.v.s as string;
  const s = randomBytes(24).toString("hex");
  await db.sql`INSERT INTO kv (k, v) VALUES ('video_secret', ${JSON.stringify({ s })}::jsonb) ON CONFLICT (k) DO NOTHING`;
  const [again] = await db.sql`SELECT v FROM kv WHERE k = 'video_secret'`;
  return again.v.s as string;
}
export async function deleteVideoBlobs(id: string) {
  const st = vstore();
  for (const prefix of [`raw/${id}/`, `mp4/${id}/`]) {
    const { blobs } = await st.list({ prefix });
    for (const b of blobs) await st.delete(b.key);
  }
  await st.delete(`poster/${id}`);
}
const pub = (v: any) => ({ id: v.id, title: v.title, category: v.category, catLabel: VIDEO_CATS[v.category] || v.category, description: v.description, handle: v.handle, name: v.display_name,
  creator: v.user_id, duration: v.duration, views: v.views, at: v.published_at || v.created_at, status: v.status, reason: v.reason, following: !!v.following });

/** Video routes. `canUpload` = active Coach plan; `canView` = any active member. */
export async function videoRoutes(route: string, req: Request, url: URL, db: any, me: any, canUpload: boolean, body: any, aiOn: boolean): Promise<Response | null> {
  // streaming the published file (supports Range so phones can seek)
  let m = /^v\/([A-Za-z0-9_-]{6,20})$/.exec(route);
  if (m) {
    const [v] = await db.sql`SELECT out_size, out_chunks, status, user_id FROM videos WHERE id = ${m[1]}`;
    if (!v || (v.status !== "published" && v.user_id !== me.id) || !v.out_size) return new Response("Not found", { status: 404 });
    const size = Number(v.out_size), st = vstore();
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
    const base = { "content-type": "video/mp4", "accept-ranges": "bytes", "cache-control": "private, max-age=86400" };
    if (!range) {
      const stream = new ReadableStream({ async start(c) { for (let i = 0; i < v.out_chunks; i++) { const b = await st.get(`mp4/${m![1]}/${i}`, { type: "arrayBuffer" }); if (b) c.enqueue(new Uint8Array(b)); } c.close(); } });
      return new Response(stream, { status: 200, headers: { ...base, "content-length": String(size) } });
    }
    let start = range[1] ? +range[1] : Math.max(0, size - +range[2]);
    let end = range[1] && range[2] ? +range[2] : size - 1;
    if (start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    const ci = Math.floor(start / CHUNK);
    end = Math.min(end, size - 1, (ci + 1) * CHUNK - 1);       // never more than one stored chunk per response
    const buf = await st.get(`mp4/${m[1]}/${ci}`, { type: "arrayBuffer" });
    if (!buf) return new Response("Not found", { status: 404 });
    const part = new Uint8Array(buf).subarray(start - ci * CHUNK, end - ci * CHUNK + 1);
    return new Response(part, { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(part.byteLength) } });
  }
  m = /^vp\/([A-Za-z0-9_-]{6,20})$/.exec(route);
  if (m) {
    const b = await vstore().get(`poster/${m[1]}`, { type: "arrayBuffer" });
    return b ? new Response(b, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=604800" } }) : new Response("Not found", { status: 404 });
  }
  if (!route.startsWith("videos/") && !route.startsWith("creator/")) return null;

  if (route === "videos/list") {
    const cat = String(body.category || ""), q = String(body.q || "").trim().slice(0, 60), following = !!body.following, handle = String(body.handle || "").replace(/^@/, "").toLowerCase();
    const like = q ? `%${q.toLowerCase()}%` : null;
    const rows = await db.sql`SELECT v.*, c.handle, c.display_name, (f.follower_id IS NOT NULL) AS following FROM videos v JOIN creators c ON c.user_id = v.user_id
      LEFT JOIN follows f ON f.creator_id = v.user_id AND f.follower_id = ${me.id}
      WHERE v.status = 'published' AND v.reports < 3
        AND (${cat} = '' OR v.category = ${cat})
        AND (${like}::text IS NULL OR lower(v.title) LIKE ${like} OR lower(c.handle) LIKE ${like} OR lower(v.description) LIKE ${like})
        AND (${!following} OR f.follower_id IS NOT NULL)
        AND (${handle} = '' OR c.handle = ${handle})
      ORDER BY v.published_at DESC LIMIT 60`;
    const counts = await db.sql`SELECT category, COUNT(*)::int AS n FROM videos WHERE status = 'published' AND reports < 3 GROUP BY category`;
    let creator = null;
    if (handle) { const [c] = await db.sql`SELECT c.*, (SELECT COUNT(*)::int FROM follows WHERE creator_id = c.user_id) AS followers, EXISTS(SELECT 1 FROM follows WHERE creator_id = c.user_id AND follower_id = ${me.id}) AS following FROM creators c WHERE c.handle = ${handle}`;
      if (c) creator = { id: c.user_id, handle: c.handle, name: c.display_name, bio: c.bio, followers: c.followers, following: c.following }; }
    return json({ videos: rows.map(pub), counts: Object.fromEntries(counts.map((r: any) => [r.category, r.n])), cats: VIDEO_CATS, creator });
  }
  if (route === "videos/view") { await db.sql`UPDATE videos SET views = views + 1 WHERE id = ${String(body.id || "")}`; return json({ ok: true }); }
  if (route === "videos/follow") {
    const cid = String(body.creator || "");
    if (cid === me.id) return fail(400, "That's you.");
    if (body.on) await db.sql`INSERT INTO follows (follower_id, creator_id) SELECT ${me.id}, ${cid} WHERE EXISTS (SELECT 1 FROM creators WHERE user_id = ${cid}) ON CONFLICT DO NOTHING`;
    else await db.sql`DELETE FROM follows WHERE follower_id = ${me.id} AND creator_id = ${cid}`;
    return json({ ok: true });
  }
  if (route === "videos/report") {
    const id = String(body.id || "");
    const ins = await db.sql`INSERT INTO video_reports (video_id, user_id, reason) VALUES (${id}, ${me.id}, ${String(body.reason || "").slice(0, 200)}) ON CONFLICT DO NOTHING RETURNING video_id`;
    if (ins.length) await db.sql`UPDATE videos SET reports = reports + 1 WHERE id = ${id}`;
    return json({ ok: true });
  }

  /* ----- creator (coach) side ----- */
  if (route === "creator/me") {
    const [c] = await db.sql`SELECT c.*, (SELECT COUNT(*)::int FROM follows WHERE creator_id = c.user_id) AS followers FROM creators c WHERE user_id = ${me.id}`;
    const mine = await db.sql`SELECT v.*, ${c ? c.handle : ""} AS handle, ${c ? c.display_name : ""} AS display_name FROM videos v WHERE user_id = ${me.id} ORDER BY created_at DESC LIMIT 100`;
    return json({ canUpload, aiOn, creator: c ? { handle: c.handle, name: c.display_name, bio: c.bio, followers: c.followers } : null, videos: mine.map(pub), cats: VIDEO_CATS });
  }
  if (!canUpload) return fail(403, "Uploading demo videos comes with a Coach plan.");
  if (route === "creator/profile") {
    const handle = String(body.handle || "").replace(/^@/, "").trim().toLowerCase(), name = String(body.name || "").trim().slice(0, 40), bio = String(body.bio || "").trim().slice(0, 200);
    if (!/^[a-z0-9_.]{3,24}$/.test(handle)) return fail(400, "Handles are 3–24 letters, numbers, dots or underscores.");
    if (BAD_WORDS.test(handle + " " + name + " " + bio)) return fail(400, "Please keep your handle, name and bio family-friendly.");
    const [taken] = await db.sql`SELECT user_id FROM creators WHERE handle = ${handle} AND user_id <> ${me.id}`;
    if (taken) return fail(409, `@${handle} is taken. Try another.`);
    await db.sql`INSERT INTO creators (user_id, handle, display_name, bio) VALUES (${me.id}, ${handle}, ${name}, ${bio})
      ON CONFLICT (user_id) DO UPDATE SET handle = EXCLUDED.handle, display_name = EXCLUDED.display_name, bio = EXCLUDED.bio`;
    return json({ ok: true });
  }
  if (route === "creator/start") {
    if (!aiOn) return fail(503, "Video uploads open once the automatic safety check is switched on.");
    const [c] = await db.sql`SELECT handle FROM creators WHERE user_id = ${me.id}`;
    if (!c) return fail(400, "Set your @handle first.");
    const title = String(body.title || "").trim().slice(0, 70), cat = String(body.category || ""), desc = String(body.description || "").trim().slice(0, 400);
    const size = Number(body.size) || 0, dur = Number(body.duration) || 0;
    if (title.length < 3) return fail(400, "Name the exercise.");
    if (!VIDEO_CATS[cat]) return fail(400, "Pick a category.");
    if (BAD_WORDS.test(title + " " + desc)) return fail(400, "Please keep titles and descriptions family-friendly.");
    if (!(size > 0) || size > MAX_RAW) return fail(400, "Videos can be up to 400 MB. Record at 720p or 1080p to keep it smaller.");
    if (dur > MAX_SECONDS + 1) return fail(400, "Videos can be up to 90 seconds. Trim it and try again.");
    const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM videos WHERE user_id = ${me.id} AND created_at > NOW() - INTERVAL '1 day'`;
    if (n >= 20) return fail(429, "You can upload up to 20 videos a day.");
    const id = vid();
    await db.sql`INSERT INTO videos (id, user_id, title, category, description, raw_size, duration) VALUES (${id}, ${me.id}, ${title}, ${cat}, ${desc}, ${size}, ${dur})`;
    return json({ id, chunk: CHUNK });
  }
  if (route === "creator/chunk") {
    const id = url.searchParams.get("id") || "", n = Number(url.searchParams.get("n"));
    const [v] = await db.sql`SELECT status, raw_size FROM videos WHERE id = ${id} AND user_id = ${me.id}`;
    if (!v || v.status !== "uploading") return fail(400, "That upload has expired. Start again.");
    if (!Number.isInteger(n) || n < 0 || n * CHUNK >= Number(v.raw_size)) return fail(400, "bad chunk");
    const buf = await req.arrayBuffer();
    if (buf.byteLength > CHUNK || buf.byteLength === 0) return fail(400, "bad chunk size");
    await vstore().set(`raw/${id}/${n}`, buf);
    return json({ ok: true });
  }
  if (route === "creator/finish") {
    const id = String(body.id || "");
    const [v] = await db.sql`SELECT * FROM videos WHERE id = ${id} AND user_id = ${me.id}`;
    if (!v || v.status !== "uploading") return fail(400, "That upload has expired. Start again.");
    const need = Math.ceil(Number(v.raw_size) / CHUNK);
    const { blobs } = await vstore().list({ prefix: `raw/${id}/` });
    if (blobs.length !== need) return fail(400, "Part of the video didn't upload. Try again.");
    await db.sql`UPDATE videos SET status = 'processing', raw_chunks = ${need} WHERE id = ${id}`;
    const secret = await processSecret(db);
    const r = await fetch(`${url.origin}/.netlify/functions/video-process-background`, { method: "POST", headers: { "content-type": "application/json", "x-rr-secret": secret }, body: JSON.stringify({ id }) }).catch(() => null);
    if (!r || (r.status !== 202 && !r.ok)) { await db.sql`UPDATE videos SET status = 'failed', reason = 'Processing could not start. Try again later.' WHERE id = ${id}`; return fail(503, "Video processing is unavailable right now. Try again later."); }
    return json({ ok: true, status: "processing" });
  }
  if (route === "creator/delete") {
    const id = String(body.id || "");
    const [v] = await db.sql`DELETE FROM videos WHERE id = ${id} AND user_id = ${me.id} RETURNING id`;
    if (v) await deleteVideoBlobs(id);
    return json({ ok: true });
  }
  return fail(404, "not found");
}
