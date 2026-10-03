// Background job (up to 15 minutes): stitch the uploaded chunks, re-encode to a phone-friendly 720p MP4,
// pull frames from across the whole clip, run the safety check, then publish or reject and delete.
import { getDatabase } from "@netlify/database";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vstore, CHUNK, MAX_SECONDS, VIDEO_CATS, processSecret, deleteVideoBlobs } from "../lib/videos.mts";

async function ffmpegPath(): Promise<string | null> {
  try { const m: any = await import("ffmpeg-static"); return (m.default || m) as string; } catch { return null; }
}
function run(bin: string, args: string[]): Promise<{ code: number; err: string }> {
  return new Promise(res => { const p = spawn(bin, args); let err = ""; p.stderr.on("data", d => { err = (err + d).slice(-8000); }); p.on("close", code => res({ code: code ?? 1, err })); p.on("error", e => res({ code: 1, err: String(e) })); });
}
const MOD_PROMPT = `You are the safety reviewer for a family-friendly fitness app. Coaches upload short videos demonstrating exercises.
You will see frames taken evenly across one video, plus its title and description.
Reject the video if ANY frame or text contains: nudity or partial nudity (exposed genitals, buttocks, female nipples), underwear-only or sexually suggestive clothing or posing, sexual acts or gestures, provocative or twerking-style dancing, vulgar or obscene gestures (e.g. middle finger), profanity or slurs in visible text, alcohol (drinking, bottles, cans or glasses of beer, wine or liquor), drugs or drug paraphernalia, smoking or vaping, weapons, blood or violence, hate symbols, or children in an unsafe situation.
Normal athletic wear (sports bras, shorts, tank tops, shirtless men exercising) is acceptable when the framing is not sexualized.
Also reject if the video is clearly not an exercise or fitness demonstration (e.g. spam, ads, unrelated content).
Reply with ONLY JSON: {"safe": true|false, "exercise": true|false, "issues": ["short reason", ...]}`;

export default async (req: Request) => {
  const db = getDatabase();
  const { id } = await req.json().catch(() => ({}));
  if (req.headers.get("x-rr-secret") !== await processSecret(db)) return new Response("forbidden", { status: 403 });
  const [v] = await db.sql`SELECT * FROM videos WHERE id = ${id}`;
  if (!v || v.status !== "processing") return new Response("skip");
  const st = vstore();
  const reject = async (reason: string, status = "rejected") => {
    await deleteVideoBlobs(id);
    await db.sql`UPDATE videos SET status = ${status}, reason = ${reason} WHERE id = ${id}`;
  };
  const ff = await ffmpegPath(), key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!ff || !key) return reject("Video checks are temporarily unavailable. Please try again later.", "failed");
  const dir = await mkdtemp(join(tmpdir(), "rrv-"));
  try {
    const src = join(dir, "in.bin");
    await writeFile(src, new Uint8Array());
    for (let i = 0; i < v.raw_chunks; i++) {
      const b = await st.get(`raw/${id}/${i}`, { type: "arrayBuffer" });
      if (!b) return reject("Part of the upload was missing. Please upload it again.", "failed");
      await appendFile(src, new Uint8Array(b));
    }
    // 1. re-encode: 720p H.264 + AAC, max 90 s, fast start for streaming
    const out = join(dir, "out.mp4");
    const enc = await run(ff, ["-y", "-i", src, "-t", String(MAX_SECONDS), "-vf", "scale=w='if(gt(iw,ih),min(1280,iw),-2)':h='if(gt(iw,ih),-2,min(1280,ih))'", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", out]);
    if (enc.code !== 0) return reject("We couldn't read that video file. Try recording again or exporting as MP4.", "failed");
    const durM = /Duration: (\d+):(\d+):([\d.]+)/.exec(enc.err);
    const dur = durM ? +durM[1] * 3600 + +durM[2] * 60 + +durM[3] : v.duration;
    if (dur > MAX_SECONDS + 1.5) return reject(`Videos can be up to 90 seconds; this one is ${Math.round(dur)} seconds. Trim it and upload again.`);
    // 2. frames from across the whole clip (1 every ~6 s, at least 8, at most 16) + a poster
    const n = Math.max(8, Math.min(16, Math.ceil(Math.min(dur, MAX_SECONDS) / 6)));
    const fr = await run(ff, ["-y", "-i", out, "-vf", `fps=${(n / Math.max(1, Math.min(dur, MAX_SECONDS))).toFixed(4)},scale=512:-2`, "-frames:v", String(n), "-q:v", "5", join(dir, "f%02d.jpg")]);
    const files = (await readdir(dir)).filter(f => /^f\d+\.jpg$/.test(f)).sort();
    if (fr.code !== 0 || !files.length) return reject("We couldn't check that video. Try uploading it again.", "failed");
    await run(ff, ["-y", "-ss", String(Math.min(2, dur / 3)), "-i", out, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4", join(dir, "poster.jpg")]);
    // 3. safety check
    const content: any[] = [];
    for (const f of files) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: (await readFile(join(dir, f))).toString("base64") } });
    content.push({ type: "text", text: `Title: ${v.title}\nCategory: ${VIDEO_CATS[v.category] || v.category}\nDescription: ${v.description || "(none)"}` });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: Netlify.env.get("AI_MODEL") || "claude-haiku-4-5-20251001", max_tokens: 300, system: MOD_PROMPT, messages: [{ role: "user", content }] })
    }).catch(() => null);
    const j: any = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) return reject("The safety check is busy. Please upload again in a few minutes.", "failed");
    let verdict: any = {};
    try { verdict = JSON.parse(((j.content || []).map((c: any) => c.text || "").join("").match(/\{[\s\S]*\}/) || ["{}"])[0]); } catch {}
    if (verdict.safe !== true) return reject(`Not published: ${(verdict.issues || ["the video didn't pass our content check"]).slice(0, 3).join("; ")}.`);
    if (verdict.exercise !== true) return reject("Not published: this doesn't look like an exercise demonstration.");
    // 4. store the safe, re-encoded file in chunks and publish
    const mp4 = await readFile(out);
    let parts = 0;
    const ab = (b: Buffer, s = 0, e = b.length) => b.buffer.slice(b.byteOffset + s, b.byteOffset + e) as ArrayBuffer;
    for (let o = 0; o < mp4.length; o += CHUNK) { await st.set(`mp4/${id}/${parts}`, ab(mp4, o, Math.min(o + CHUNK, mp4.length))); parts++; }
    try { await st.set(`poster/${id}`, ab(await readFile(join(dir, "poster.jpg")))); } catch {}
    const { blobs } = await st.list({ prefix: `raw/${id}/` });
    for (const b of blobs) await st.delete(b.key);
    await db.sql`UPDATE videos SET status = 'published', reason = '', out_size = ${mp4.length}, out_chunks = ${parts}, duration = ${Math.round(dur * 10) / 10}, published_at = NOW() WHERE id = ${id}`;
  } catch (e) {
    console.error("video", id, e);
    await reject("Something went wrong while processing. Please try again.", "failed");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  return new Response("done");
};
