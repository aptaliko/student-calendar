import type { CapacitorConfig } from '@capacitor/cli';

// iOS app = a native shell around the live site (the app is server-rendered on Vercel, so
// there is nothing to bundle). Point CAP_SERVER_URL elsewhere to try a preview deployment.
const serverUrl = process.env.CAP_SERVER_URL ?? 'https://student-calendar-nu.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.aptaliko.studentcalendar',
  appName: 'Μαθήματα',
  // Only shown when the site can't be reached at start-up (see capacitor-www/index.html).
  webDir: 'capacitor-www',
  server: {
    url: serverUrl,
    errorPath: 'index.html',
  },
  ios: {
    // The pages pad themselves for the notch / home bar (viewport-fit=cover + env(safe-area-*)).
    contentInset: 'never',
    backgroundColor: '#f6f5fb',
  },
};

export default config;
