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
- [ ] 3. Home Screen web app: manifest, apple-touch-icon, standalone mode, status bar
- [ ] 4. Capacitor setup: packages + `capacitor.config.ts` pointing at the production URL
- [ ] 5. `ios/` Xcode project generated and committed
- [ ] 6. Build & install instructions (Mac + Xcode + iPhone)

## Notes / decisions

- The app is server-rendered (Next.js on Vercel), so the iOS wrapper loads the live site
  instead of bundling it. It needs internet, like the website.
- Production URL for the wrapper is set in `capacitor.config.ts` (see step 4).
