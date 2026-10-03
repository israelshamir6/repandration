// Adds Health Connect permissions and the privacy-policy hookup to the generated Android project.
import fs from "node:fs";
const mf = "android/app/src/main/AndroidManifest.xml";
let x = fs.readFileSync(mf, "utf8");
const perms = ["READ_STEPS", "READ_SLEEP", "READ_RESTING_HEART_RATE", "READ_HEART_RATE_VARIABILITY", "READ_WEIGHT", "READ_BLOOD_PRESSURE", "READ_HEART_RATE"]
  .map(p => `    <uses-permission android:name="android.permission.health.${p}" />`).join("\n");
if (!x.includes("android.permission.health.READ_STEPS")) x = x.replace("<application", perms + "\n    <application");
if (!x.includes("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE")) x = x.replace(/(<activity[^>]*MainActivity[^>]*>)/, `$1
            <intent-filter><action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" /></intent-filter>`);
if (!x.includes("<queries>")) x = x.replace("<application", `<queries><package android:name="com.google.android.apps.healthdata" /></queries>\n    <application`);
fs.writeFileSync(mf, x);
const assets = "android/app/src/main/assets/public";
fs.mkdirSync(assets, { recursive: true });
fs.writeFileSync(`${assets}/privacypolicy.html`, `<!doctype html><meta http-equiv="refresh" content="0;url=https://repandration.netlify.app/privacy.html"><a href="https://repandration.netlify.app/privacy.html">Privacy policy</a>`);
// Health Connect needs Android 8.0+ (API 26)
const vars = "android/variables.gradle";
if (fs.existsSync(vars)) fs.writeFileSync(vars, fs.readFileSync(vars, "utf8").replace(/minSdkVersion = \d+/, "minSdkVersion = 26"));
console.log("Android project patched for Health Connect.");
