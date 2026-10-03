// Every 15 minutes: send due reminders as push notifications, and trial-ending emails.
import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { pushTo, sendMail, mailReady, PLANS, money, isPlan } from "../lib/shared.mts";

function localNow(tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" })
    .formatToParts(new Date()).map(p => [p.type, p.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, mins: +hour * 60 + +parts.minute, wd };
}

export default async () => {
  const db = getDatabase();
  let pushed = 0, mailed = 0;
  const rows = await db.sql`SELECT r.user_id, r.tz, r.items, r.sent FROM reminders r JOIN users u ON u.id = r.user_id
    WHERE EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = r.user_id)`;
  for (const r of rows) {
    let now; try { now = localNow(r.tz || "America/Los_Angeles"); } catch { continue; }
    const sent = r.sent || {}; let changed = false;
    for (const it of r.items || []) {
      if (!it.on || !(it.days || []).includes(now.wd)) continue;
      const [h, m] = String(it.time).split(":").map(Number), at = h * 60 + m;
      const late = now.mins - at;
      if (late < 0 || late > 30) continue; // due in the last half hour
      const k = it.id + "@" + now.date;
      if (sent[k]) continue;
      sent[k] = 1; changed = true;
      pushed += await pushTo(db, r.user_id, { title: it.title, body: it.body, url: it.url, tag: it.id }).catch(() => 0);
    }
    if (changed) {
      for (const k of Object.keys(sent)) if (k.split("@")[1] < now.date) delete sent[k];
      await db.sql`UPDATE reminders SET sent = ${JSON.stringify(sent)}::jsonb WHERE user_id = ${r.user_id}`;
    }
  }
  if (mailReady()) {
    const ending = await db.sql`SELECT id, email, name, plan, trial_end FROM users WHERE sub_status = 'trialing' AND NOT trial_mail_sent
      AND trial_end > NOW() AND trial_end < NOW() + INTERVAL '50 hours'`;
    for (const u of ending) {
      const P = isPlan(u.plan) ? PLANS[u.plan] : null;
      const price = P ? `${money(P.amount)} per ${P.interval}` : "your membership price";
      const when = new Date(u.trial_end).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const ok = await sendMail(u.email, "Your Rep & Ration free trial ends soon", [
        `Hi${u.name ? " " + u.name : ""}, your 7-day free trial ends on ${when}.`,
        `If you keep going, your card will be charged ${price} on that day, and you keep your plan, logs, streaks and groups.`,
        "If Rep & Ration isn't for you, cancel before then from Profile → Account & billing → Manage billing and you won't be charged."
      ], { label: "Open Rep & Ration", url: (Netlify.env.get("URL") || "https://repandration.netlify.app") + "/#profile" });
      if (ok) { await db.sql`UPDATE users SET trial_mail_sent = true WHERE id = ${u.id}`; mailed++; }
    }
  }
  console.log(`cron: ${pushed} pushes, ${mailed} emails`);
};

export const config: Config = { schedule: "*/15 * * * *" };
