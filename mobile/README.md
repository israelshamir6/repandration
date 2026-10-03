# Rep & Ration for iPhone and Android

A thin native shell (Capacitor) around the live site, plus Apple Health / Health Connect sync.
The app loads https://repandration.netlify.app, so every website update reaches the app instantly
with no app-store release. Health sync code lives in `src/ext/93-native.js` and only runs inside the app.

## Android (Google Play)
1. Every push to `main` that touches `mobile/` builds a test APK in GitHub → Actions → "Android app" → Artifacts.
   Install it on an Android phone to try it (allow "install unknown apps").
2. For Play: create a Google Play developer account ($25 one-time), then on a computer with Android Studio:
   `cd mobile && npm install && npm run add:android && npx cap open android` → Build → Generate Signed Bundle.
3. In Play Console: fill the Health Connect declaration (data types: steps, sleep, heart rate, HRV, weight, blood pressure; purpose: fitness tracking), data safety form, and privacy policy URL https://repandration.netlify.app/privacy.html.

## iPhone (App Store)
Needs an Apple Developer account ($99/year) and a Mac with Xcode (or a cloud Mac such as Codemagic / GitHub macOS runners with signing set up).
1. `cd mobile && npm install && npm run add:ios && npx cap open ios`
2. In Xcode: App target → Signing & Capabilities → choose your team → + Capability → **HealthKit**.
3. Product → Archive → Distribute to App Store Connect. In App Store Connect, answer the Health data questions and set the privacy policy URL.

Payments: Apple and Google require in-app purchase for digital subscriptions bought inside the app. Until that's added,
keep sign-up and plan changes on the website (the app shows the account; people subscribe on the web).
