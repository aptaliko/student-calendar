# iOS app — progress log

Goal: use Student Calendar comfortably on iPhone, installed as an app (no App Store).
Work happens in small commits on `main`; this file is the hand-off log. Update the checklist
with every commit so work can continue from any machine.

## Approach

1. **Fix iPhone usability in the web app first.** The iOS app shows the same pages, so every
   fix here helps Safari, the Home Screen web app and the native wrapper alike.
2. **Make it installable from Safari** (Share → Add to Home Screen): manifest, icons,
   full-screen mode. Works with no Mac and no Apple account.
3. **Native wrapper with Capacitor** (like glentify's Android app): an Xcode project in `ios/`
   that loads the live Vercel site. Building/installing it needs a Mac with Xcode; a free
   Apple ID works but the app must be reinstalled every 7 days (99 $/year account: 1 year).

## Checklist

- [x] 1. Progress log (this file)
- [x] 2. iPhone fixes: no auto-zoom on inputs, safe areas (notch / home bar), no tap delay
- [x] 3. Home Screen web app: manifest, apple-touch-icon, standalone mode, status bar
- [x] 4. Capacitor setup: packages + `capacitor.config.ts` pointing at the production URL
- [x] 5. `ios/` Xcode project generated and committed (app icon + launch screen set)
- [x] 6. Build & install instructions (Mac + Xcode + iPhone) — below

## How to install today (step 3 done)

On the iPhone, open the site in **Safari** → Share button → **Add to Home Screen** → Add.
It opens full screen with its own icon ("Μαθήματα"), no Safari bars. Updates arrive with
every deploy; nothing to reinstall.

## Build & install the iOS app (needs a Mac)

A Windows/Linux PC can't build iOS apps — use the Home Screen option above there.

One-time setup on the Mac:
1. Install **Xcode** from the Mac App Store, open it once, and let it install its components.
2. Xcode → Settings → **Accounts** → `+` → add your Apple ID (a free one is fine).
3. On the iPhone: Settings → Privacy & Security → **Developer Mode** → on (it restarts).

Build and install:
```bash
git clone https://github.com/aptaliko/student-calendar.git && cd student-calendar
npm install
npm run ios:sync      # writes ios/App/App/capacitor.config.json (git-ignored)
npm run ios:open      # opens the project in Xcode
```
4. In Xcode select the **App** target → **Signing & Capabilities** → Team: your
   "(Personal Team)". If Xcode says the bundle id is taken, change
   `com.aptaliko.studentcalendar` to something unique (e.g. add your initials).
5. Connect the iPhone with a cable, tap **Trust** on the phone, pick it as the run
   destination at the top of Xcode, and press **▶ Run**.
6. First launch only: on the iPhone, Settings → General → **VPN & Device Management** →
   your Apple ID → Trust.

With a free Apple ID the app stops opening after **7 days**; plug in and press Run again
(your data is on the server, nothing is lost). A paid Apple Developer account (99 $/year)
makes it last a year. Web changes need no reinstall — the app loads the live site.

## Next ideas (not started)

- Native touches via Capacitor plugins: haptic feedback on marking attendance, status bar
  colour, pull-to-refresh.
- Test on a real iPhone and list remaining pain points here.

## Notes / decisions

- The app is server-rendered (Next.js on Vercel), so the iOS wrapper loads the live site
  instead of bundling it. It needs internet, like the website.
- The wrapper loads `https://student-calendar-nu.vercel.app` (`capacitor.config.ts`,
  override with `CAP_SERVER_URL`). If it can't be reached at start-up it shows
  `capacitor-www/index.html` ("Δεν υπάρχει σύνδεση" + retry). App id
  `com.aptaliko.studentcalendar`, name "Μαθήματα".
- `ios/` was generated with `npx cap add ios` (Capacitor 8, Swift Package Manager — no
  CocoaPods). Icon/launch images in `ios/App/App/Assets.xcassets` were rendered from
  `public/icon.svg`. After changing `capacitor.config.ts` run `npm run ios:sync`.
- Icons: `public/icons/*.png` were rendered from `public/icon.svg` (full-bleed, iOS rounds
  the corners). `src/proxy.ts` lets `/icons/*` and `/manifest.webmanifest` load without login.
