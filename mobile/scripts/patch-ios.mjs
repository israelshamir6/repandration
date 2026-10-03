// Adds the HealthKit usage descriptions to the generated iOS project. Turn on the HealthKit capability in Xcode afterwards.
import fs from "node:fs";
const plist = "ios/App/App/Info.plist";
let x = fs.readFileSync(plist, "utf8");
const add = (k, v) => { if (!x.includes(`<key>${k}</key>`)) x = x.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${k}</key>\n\t<string>${v}</string>\n</dict>\n</plist>\n`); };
add("NSHealthShareUsageDescription", "Rep & Ration reads steps, sleep, heart rate, HRV, weight and blood pressure to update your progress, DOT prep and calorie targets.");
add("NSHealthUpdateUsageDescription", "Rep & Ration only writes health data you choose to save.");
add("NSCameraUsageDescription", "Use the camera to scan barcodes, snap meals and menus, and take progress photos.");
add("NSPhotoLibraryUsageDescription", "Choose meal, menu and progress photos from your library.");
add("NSMicrophoneUsageDescription", "Say what you ate to log it by voice.");
fs.writeFileSync(plist, x);
const ent = "ios/App/App/App.entitlements";
if (!fs.existsSync(ent)) fs.writeFileSync(ent, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>com.apple.developer.healthkit</key><true/><key>com.apple.developer.healthkit.access</key><array/></dict></plist>
`);
console.log("iOS project patched. In Xcode: App target → Signing & Capabilities → + Capability → HealthKit, and set CODE_SIGN_ENTITLEMENTS to App/App.entitlements.");
